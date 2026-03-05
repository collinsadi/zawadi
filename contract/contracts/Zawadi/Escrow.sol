// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IIntentSpec} from "../Interfaces/IIntentSpec.sol";
import "../Errors/EscrowErrors.sol";
import "../Libraries/EscrowLib.sol";
import "../Events/EscrowEvents.sol";

/**
 * @title Escrow
 * @notice Per-hackathon escrow managing challenges, funding, winner allocations, dual-approval, and payouts.
 * @custom:agent-version 2.0
 * @custom:agent-description Hackathon escrow contract that holds prize funds (ERC20 or native ETH), enforces dual-approval from organizer and sponsor, and allows winners to self-claim payouts.
 * @custom:agent-invariant Total claimable allocations for a challenge always equal the challenge totalPrize.
 * @custom:agent-invariant Funds can only leave the contract through claimPayout (to winners) or refundChallenge (to sponsor).
 * @custom:agent-invariant A payout requires both sponsor and organizer approval.
 * @custom:agent-event SponsorWhitelisted Organizer added a sponsor to the whitelist.
 * @custom:agent-event SponsorRevoked Organizer removed a sponsor from the whitelist.
 * @custom:agent-event ChallengeAdded A new prize challenge was created by a whitelisted sponsor.
 * @custom:agent-event ChallengeFunded Sponsor deposited ERC20 tokens or native ETH to fund a challenge.
 * @custom:agent-event WinnersAdded Organizer assigned winner addresses and prize allocations to a challenge.
 * @custom:agent-event DistributionApproved Sponsor or organizer approved the distribution for a challenge.
 * @custom:agent-event PrizeClaimed A winner withdrew their allocated prize.
 * @custom:agent-event ChallengeRefunded Sponsor reclaimed funds from an unapproved challenge.
 * @custom:agent-event ConfigurationLocked Organizer locked the escrow preventing further configuration changes.
 * @custom:agent-event ConfigurationUnLocked Organizer unlocked the escrow allowing configuration changes.
 */
contract Escrow is ReentrancyGuard, ERC165, IIntentSpec {
    using SafeERC20 for IERC20;

    address public organizer;
    bool public isLocked;
    uint256 public challengeCount;
    string private _intentSpecURI;

    mapping(uint256 => EscrowLib.Challenge) public challenges;
    mapping(address => mapping(uint256 => EscrowLib.Allocation)) public allocations;
    mapping(uint256 => EscrowLib.Approval) public approvals;
    mapping(address => bool) public sponsors;
    address[] public whitelistedSponsors;
    uint256[] private _challengeIds;

    mapping(uint256 => uint256) public winnerCount;
    mapping(uint256 => uint256) public claimedCount;

    modifier onlyOrganizer() {
        if (msg.sender != organizer) revert Escrow__OnlyOrganizerCanAccess();
        _;
    }
    modifier onlySponsor(uint256 _challengeId) {
        if (challenges[_challengeId].sponsor != msg.sender) {
            revert Escrow__OnlySponsorCanAccess();
        }
        _;
    }

    modifier beforeLock() {
        if (isLocked) revert Escrow__ConfigurationLocked();
        _;
    }

    modifier challengeExists(uint256 _challengeId) {
        if (challenges[_challengeId].sponsor == address(0)) {
            revert Escrow__ChallengeDoesNotExist();
        }
        _;
    }

    modifier sponsorWhitelisted(address _sponsor) {
        if (!sponsors[_sponsor]) revert Escrow__SponsorNotWhitelisted();
        _;
    }

    constructor(address _organizer, string memory _escrowIntentSpecURI) {
        if (_organizer == address(0))
            revert Escrow__OrganizerAddressCannotBeZero();
        organizer = _organizer;
        challengeCount = 0;
        _intentSpecURI = _escrowIntentSpecURI;
    }

    // --- ERC-165 + ERC-8174 ---

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IIntentSpec).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc IIntentSpec
    function getIntentSpecURI() external view override returns (string memory) {
        return _intentSpecURI;
    }

    /**
     * @notice Sets the ERC-8174 Intent Spec metadata URI
     * @param uri The IPFS or HTTPS URI pointing to the Intent Spec JSON
     * @custom:agent-intent Sets the machine-readable semantic metadata URI for this contract.
     * @custom:agent-precondition Caller must be the organizer.
     * @custom:agent-effect Updates the intentSpecURI storage variable.
     * @custom:agent-risk URI should reference immutable content; a mutable URI may mislead agents.
     */
    function setIntentSpecURI(string calldata uri) external onlyOrganizer {
        _intentSpecURI = uri;
    }

    // --- Sponsor management ---

    /**
     * @notice Allows the organizer to whitelist a sponsor to add challenges
     * @param _sponsor The address of the sponsor to whitelist
     * @custom:agent-intent Grants a sponsor address permission to create and fund challenges in this escrow.
     * @custom:agent-precondition Caller must be the organizer.
     * @custom:agent-precondition Sponsor must not already be whitelisted.
     * @custom:agent-effect Sponsor address is added to the whitelist; emits SponsorWhitelisted.
     * @custom:agent-risk No on-chain identity verification of the sponsor address.
     */
    function whitelistSponsor(address _sponsor) external onlyOrganizer {
        if (sponsors[_sponsor]) revert Escrow__SponsorAlreadyWhitelisted();
        sponsors[_sponsor] = true;
        whitelistedSponsors.push(_sponsor);
        emit SponsorWhitelisted(_sponsor);
    }

    /**
     * @notice Allows the organizer to revoke a whitelisted sponsor
     * @param _sponsor The address of the sponsor to revoke
     * @custom:agent-intent Removes a sponsor from the whitelist, preventing them from creating new challenges.
     * @custom:agent-precondition Caller must be the organizer.
     * @custom:agent-precondition Contract must not be locked.
     * @custom:agent-precondition Sponsor must currently be whitelisted.
     * @custom:agent-effect Sponsor is removed from the whitelist; emits SponsorRevoked.
     * @custom:agent-guidance Existing challenges by this sponsor remain valid; only new challenge creation is blocked.
     */
    function revokeSponsor(address _sponsor) external beforeLock onlyOrganizer {
        if (!sponsors[_sponsor]) revert Escrow__SponsorNotWhitelisted();
        sponsors[_sponsor] = false;

        uint256 len = whitelistedSponsors.length;
        for (uint256 i = 0; i < len; i++) {
            if (whitelistedSponsors[i] == _sponsor) {
                whitelistedSponsors[i] = whitelistedSponsors[len - 1];
                whitelistedSponsors.pop();
                break;
            }
        }

        emit SponsorRevoked(_sponsor);
    }

    /**
     * @notice Returns the full list of whitelisted sponsor addresses
     * @custom:agent-intent Retrieves all currently whitelisted sponsor addresses.
     * @custom:agent-effect None (read-only).
     */
    function getWhitelistedSponsors() external view returns (address[] memory) {
        return whitelistedSponsors;
    }

    // --- Challenge lifecycle ---

    /**
     * @notice Allows the sponsor to add a new challenge to the escrow
     * @param _totalPrize The total prize for the challenge
     * @param _token The token for the challenge
     * @param _isERC20 Whether the token is an ERC20 token
     * @param _ipfsCid The IPFS CID for the challenge
     * @custom:agent-intent Creates a new prize challenge with the specified prize pool, token, and metadata.
     * @custom:agent-precondition Caller must be a whitelisted sponsor.
     * @custom:agent-precondition Contract must not be locked.
     * @custom:agent-precondition Total prize must be greater than zero.
     * @custom:agent-effect A new challenge is stored; challengeCount is incremented; emits ChallengeAdded.
     * @custom:agent-risk The challenge is created unfunded; sponsor must call fundChallenge separately.
     * @custom:agent-guidance Verify the token address is a legitimate ERC20 contract when isERC20 is true.
     */
    function addChallenge(
        uint256 _totalPrize,
        address _token,
        bool _isERC20,
        string memory _ipfsCid
    ) external beforeLock sponsorWhitelisted(msg.sender) {
        if (_totalPrize == 0) revert Escrow__InvalidTokenOrPrize();

        uint256 challengeId = challengeCount++;

        challenges[challengeId] = EscrowLib.Challenge({
            totalPrize: _totalPrize,
            sponsor: msg.sender,
            isPaidOut: false,
            token: _token,
            isERC20: _isERC20,
            ipfsCid: _ipfsCid,
            isFunded: false
        });

        _challengeIds.push(challengeId);

        emit ChallengeAdded(challengeId, msg.sender, _totalPrize, _ipfsCid);
    }

    /**
     * @notice Returns all challenge IDs. For large sets prefer pagination.
     * @custom:agent-intent Returns the full array of challenge IDs for enumeration.
     * @custom:agent-effect None (read-only).
     * @custom:agent-risk May be gas-heavy for very large challenge counts; prefer getChallengesPage.
     */
    function getChallengeIds() external view returns (uint256[] memory) {
        return _challengeIds;
    }

    /**
     * @notice Returns a page of challenges and their IDs
     * @param offset starting index within the internal list
     * @param limit maximum number of items to return
     * @custom:agent-intent Returns a paginated slice of challenges for efficient enumeration.
     * @custom:agent-effect None (read-only).
     */
    function getChallengesPage(uint256 offset, uint256 limit)
        external
        view
        returns (EscrowLib.Challenge[] memory items, uint256[] memory ids)
    {
        uint256 len = _challengeIds.length;
        if (offset >= len) {
            return (new EscrowLib.Challenge[](0), new uint256[](0));
        }
        uint256 end = offset + limit;
        if (end > len) end = len;
        uint256 n = end - offset;
        items = new EscrowLib.Challenge[](n);
        ids = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            uint256 id_ = _challengeIds[offset + i];
            ids[i] = id_;
            items[i] = challenges[id_];
        }
        return (items, ids);
    }

    /**
     * @notice Allows the sponsor to fund the challenge
     * @param _challengeId The id of the challenge to fund
     * @custom:agent-intent Transfers the full prize amount (ERC20 or native ETH) from the sponsor into escrow.
     * @custom:agent-precondition Caller must be the challenge sponsor.
     * @custom:agent-precondition Contract must not be locked.
     * @custom:agent-precondition Challenge must exist and not already be funded.
     * @custom:agent-precondition For ERC20: sponsor must have approved the escrow for at least totalPrize tokens.
     * @custom:agent-precondition For native ETH: msg.value must exactly equal totalPrize.
     * @custom:agent-effect Tokens/ETH are transferred to the escrow; challenge.isFunded is set to true; emits ChallengeFunded.
     * @custom:agent-risk Irreversible deposit unless refundChallenge is used before dual approval completes.
     * @custom:agent-guidance For ERC20, call approve on the token contract before calling fundChallenge.
     */
    function fundChallenge(
        uint256 _challengeId
    )
        external
        payable
        onlySponsor(_challengeId)
        beforeLock
        challengeExists(_challengeId)
    {
        EscrowLib.Challenge storage challenge = challenges[_challengeId];

        if (challenge.isFunded) {
            revert Escrow_AlreadyFunded();
        }

        if (challenge.isERC20) {
            IERC20 token = IERC20(challenge.token);

            uint256 allowance = token.allowance(msg.sender, address(this));
            if (allowance < challenge.totalPrize) {
                revert Escrow_InsufficientAllowance();
            }

            token.safeTransferFrom(msg.sender, address(this), challenge.totalPrize);
        } else {
            if (msg.value != challenge.totalPrize) {
                revert Escrow_InvalidEthAmount();
            }
        }

        challenge.isFunded = true;

        emit ChallengeFunded(_challengeId, msg.sender, challenge.totalPrize);
    }

    /**
     * @notice Returns the challenge data for a given id
     * @param _challengeId The id of the challenge
     * @return challenge The challenge struct
     * @custom:agent-intent Retrieves all stored data for a specific challenge.
     * @custom:agent-effect None (read-only).
     */
    function getChallenge(
        uint256 _challengeId
    )
        external
        view
        challengeExists(_challengeId)
        returns (EscrowLib.Challenge memory challenge)
    {
        challenge = challenges[_challengeId];
        return challenge;
    }

    /**
     * @notice Returns token decimals for a given challenge.
     * @dev For native token challenges (isERC20 == false), returns 18.
     * @custom:agent-intent Returns the decimal precision of the prize token for display purposes.
     * @custom:agent-effect None (read-only).
     */
    function challengeTokenDecimals(uint256 _challengeId)
        external
        view
        challengeExists(_challengeId)
        returns (uint8)
    {
        EscrowLib.Challenge storage c = challenges[_challengeId];
        if (!c.isERC20) return 18; 
        return IERC20Metadata(c.token).decimals();
    }

    // --- Lock / unlock ---

    /**
     * @notice Allows the organizer to lock the contract
     * @custom:agent-intent Locks the escrow to prevent further configuration changes (challenges, winners, funding).
     * @custom:agent-precondition Caller must be the organizer.
     * @custom:agent-precondition Contract must not already be locked.
     * @custom:agent-effect isLocked is set to true; emits ConfigurationLocked.
     * @custom:agent-risk Approvals and claims remain available after lock; only configuration is frozen.
     */
    function lockContract() external beforeLock onlyOrganizer {
        isLocked = true;
        emit ConfigurationLocked();
    }

    // --- Winners and distribution ---

    /**
     * @notice Allows the organiser to add winners and their allocations
     * @param _challengeId The id of the challenge
     * @param _winners The list of winners' addresses (ordered by position)
     * @param _allocations The corresponding prize allocations for each winner
     * @custom:agent-intent Assigns prize allocations to winner addresses for a funded challenge. Resets prior approvals.
     * @custom:agent-precondition Caller must be the organizer.
     * @custom:agent-precondition Contract must not be locked.
     * @custom:agent-precondition Challenge must exist and be funded.
     * @custom:agent-precondition Winners and allocations arrays must be non-empty, equal length, no zero addresses or amounts, no duplicates.
     * @custom:agent-precondition Sum of allocations must exactly equal totalPrize.
     * @custom:agent-effect Allocations are written; approvals are reset to false; winnerCount is set; emits WinnersAdded.
     * @custom:agent-risk Calling addWinners again overwrites previous allocations and resets approvals. Sponsor must re-approve.
     * @custom:agent-guidance Verify allocations sum to totalPrize off-chain before submitting.
     */
    function addWinners(
        uint256 _challengeId,
        address[] calldata _winners,
        uint256[] calldata _allocations
    ) external beforeLock challengeExists(_challengeId) onlyOrganizer {
        EscrowLib.Challenge storage challenge = challenges[_challengeId];

        if (!challenge.isFunded) {
            revert Escrow_ChallengeNotFunded();
        }

        if (_winners.length == 0 || _winners.length != _allocations.length) {
            revert Escrow_InvalidAllocation();
        }

        EscrowLib.Approval storage approval = approvals[_challengeId];
        approval.sponsorApproved = false;
        approval.organiserApproved = false;

        uint256 totalAllocated = 0;

        for (uint256 i = 0; i < _winners.length; i++) {
            address winner = _winners[i];
            uint256 amount = _allocations[i];

            if (winner == address(0) || amount == 0) {
                revert Escrow_InvalidAllocation();
            }

            if (allocations[winner][_challengeId].winner != address(0)) {
                revert Escrow__DuplicateWinner();
            }

            allocations[winner][_challengeId] = EscrowLib.Allocation({
                position: i + 1,
                amount: amount,
                winner: winner,
                claimed: false,
                challenge: _challengeId
            });

            totalAllocated += amount;
        }

        if (totalAllocated != challenge.totalPrize) {
            revert Escrow_InvalidAllocation();
        }

        winnerCount[_challengeId] = _winners.length;
        claimedCount[_challengeId] = 0;

        emit WinnersAdded(_challengeId, _winners, _allocations);
    }

    /**
     * @notice Approves the distribution of funds for a challenge
     * @param _challengeId The id of the challenge
     * @custom:agent-intent Records an approval from either the sponsor or the organizer for prize distribution.
     * @custom:agent-precondition Caller must be the challenge sponsor or the organizer.
     * @custom:agent-precondition Caller must not have already approved.
     * @custom:agent-effect Sets sponsorApproved or organiserApproved to true; emits DistributionApproved.
     * @custom:agent-guidance Both approvals are required before any winner can claimPayout.
     */
    function approveDistribution(
        uint256 _challengeId
    ) external challengeExists(_challengeId) {
        EscrowLib.Challenge storage challenge = challenges[_challengeId];
        EscrowLib.Approval storage approval = approvals[_challengeId];

        if (msg.sender != challenge.sponsor && msg.sender != organizer) {
            revert Escrow__UnauthorizedAccess();
        }

        if (msg.sender == challenge.sponsor) {
            if (approval.sponsorApproved)
                revert Escrow__SponsorAlreadyApproved();
            approval.sponsorApproved = true;
            emit DistributionApproved(_challengeId, msg.sender);
        } else if (msg.sender == organizer) {
            if (approval.organiserApproved)
                revert Escrow__OrganizerAlreadyApproved();
            approval.organiserApproved = true;
            emit DistributionApproved(_challengeId, msg.sender);
        }
    }

    /**
     * @notice Allows a winner to claim their allocation after approvals are complete
     * @custom:agent-intent Transfers the caller's allocated prize (ERC20 or ETH) after both approvals are confirmed.
     * @custom:agent-precondition Caller must be an assigned winner for this challenge.
     * @custom:agent-precondition Caller must not have already claimed.
     * @custom:agent-precondition Both sponsor and organizer must have approved distribution.
     * @custom:agent-effect Allocation is marked claimed; funds are transferred; claimedCount incremented; isPaidOut set if all claimed; emits PrizeClaimed.
     * @custom:agent-risk Irreversible transfer of funds to the caller.
     * @custom:agent-guidance Check approvals(challengeId) before calling to avoid a revert.
     */
    function claimPayout(uint256 _challengeId) external nonReentrant challengeExists(_challengeId) {
        EscrowLib.Allocation storage alloc = allocations[msg.sender][_challengeId];
        if (alloc.winner != msg.sender) {
            revert Escrow__UnauthorizedAccess();
        }
        if (alloc.claimed) {
            revert Escrow__PayoutAlreadyClaimed();
        }

        uint256 challengeId = _challengeId;
        EscrowLib.Challenge storage c = challenges[challengeId];
        EscrowLib.Approval storage ap = approvals[challengeId];

        if (!ap.sponsorApproved || !ap.organiserApproved) {
            revert Escrow__UnauthorizedAccess();
        }

        uint256 amount = alloc.amount;
        if (amount == 0) {
            revert Escrow__InvalidTokenOrPrize();
        }

        alloc.claimed = true;
        claimedCount[challengeId]++;

        if (claimedCount[challengeId] == winnerCount[challengeId]) {
            c.isPaidOut = true;
        }

        if (c.isERC20) {
            IERC20(c.token).safeTransfer(msg.sender, amount);
        } else {
            (bool ok, ) = payable(msg.sender).call{value: amount}("");
            if (!ok) revert Escrow__EthTransferFailed();
        }

        emit PrizeClaimed(challengeId, msg.sender, amount);
    }

    /**
     * @notice Allows the sponsor to reclaim funds if the approval flow has not completed
     * @param _challengeId The id of the challenge to refund
     * @custom:agent-intent Returns deposited funds to the sponsor when dual approval is not yet complete.
     * @custom:agent-precondition Caller must be the challenge sponsor.
     * @custom:agent-precondition Challenge must be funded and not fully paid out.
     * @custom:agent-precondition Dual approval must NOT be complete (at least one party has not approved).
     * @custom:agent-effect Challenge is marked unfunded; approvals are reset; funds returned to sponsor; emits ChallengeRefunded.
     * @custom:agent-risk Irreversible; challenge must be re-funded to proceed with payouts.
     */
    function refundChallenge(
        uint256 _challengeId
    ) external nonReentrant challengeExists(_challengeId) onlySponsor(_challengeId) {
        EscrowLib.Challenge storage challenge = challenges[_challengeId];
        EscrowLib.Approval storage approval = approvals[_challengeId];

        if (!challenge.isFunded || challenge.isPaidOut) {
            revert Escrow__RefundWindowNotOpen();
        }

        if (approval.sponsorApproved && approval.organiserApproved) {
            revert Escrow__RefundWindowNotOpen();
        }

        uint256 amount = challenge.totalPrize;

        challenge.isFunded = false;

        approval.sponsorApproved = false;
        approval.organiserApproved = false;

        if (challenge.isERC20) {
            IERC20(challenge.token).safeTransfer(msg.sender, amount);
        } else {
            (bool ok, ) = payable(msg.sender).call{value: amount}("");
            if (!ok) revert Escrow__EthTransferFailed();
        }

        emit ChallengeRefunded(_challengeId, msg.sender, amount);
    }

    /**
     * @notice Allows the organizer to unlock the contract
     * @custom:agent-intent Unlocks the escrow to allow configuration changes again.
     * @custom:agent-precondition Caller must be the organizer.
     * @custom:agent-effect isLocked is set to false; emits ConfigurationUnLocked.
     */
    function unLockContract() external onlyOrganizer {
        isLocked = false;
        emit ConfigurationUnLocked();
    }
}
