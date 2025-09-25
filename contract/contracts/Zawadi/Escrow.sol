// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Errors/EscrowErrors.sol";
import "../Libraries/EscrowLib.sol";
import "../Events/EscrowEvents.sol";

contract Escrow {
    // using safe ERC20 for IERC20 so we can use the safe transfer functions
    using SafeERC20 for IERC20;

    // state variables
    address public organizer;
    bool public isLocked;
    uint256 public challengeCount;

    // mappings
    mapping(uint256 => EscrowLib.Challenge) public challenges;
    mapping(address => EscrowLib.Allocation) public allocations;
    mapping(uint256 => EscrowLib.Approval) public approvals;
    mapping(address => bool) public sponsors;
    address[] public whitelistedSponsors;

    // modifiers
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

    //constructor

    constructor(address _organizer) {
        if (_organizer == address(0))
            revert Escrow__OrganizerAddressCannotBeZero();
        organizer = _organizer;
        challengeCount = 0;
    }

    //functions

    /**
     * @notice Allows the organizer to whitelist a sponsor to add challenges
     * @param _sponsor The address of the sponsor to whitelist
     * @dev The sponsor must be a valid address
     * @dev The sponsor must not already be whitelisted
     */
    function whitelistSponsor(address _sponsor) external onlyOrganizer {
        if (sponsors[_sponsor]) revert Escrow__SponsorAlreadyWhitelisted();
        sponsors[_sponsor] = true;
        whitelistedSponsors.push(_sponsor);
        emit SponsorWhitelisted(_sponsor);
    }

    /**
     * @notice Returns the full list of whitelisted sponsor addresses
     */
    function getWhitelistedSponsors() external view returns (address[] memory) {
        return whitelistedSponsors;
    }

    /**
     * @notice Allows the sponsor to add a new challenge to the escrow
     * @param _totalPrize The total prize for the challenge
     * @param _token The token for the challenge
     * @param _isERC20 Whether the token is an ERC20 token
     * @param _ipfsCid The IPFS CID for the challenge
     */
    function addChallenge(
        uint256 _totalPrize,
        address _token,
        bool _isERC20,
        string memory _ipfsCid
    ) external beforeLock sponsorWhitelisted(msg.sender) {
        //check if total prize is greater than 0
        if (_totalPrize == 0) revert Escrow__InvalidTokenOrPrize();

        //increment the challenge count to use as the challenge id
        uint256 challengeId = challengeCount++;

        //create the challenge
        challenges[challengeId] = EscrowLib.Challenge({
            totalPrize: _totalPrize,
            sponsor: msg.sender,
            isPaidOut: false,
            token: _token,
            isERC20: _isERC20,
            ipfsCid: _ipfsCid,
            isFunded: false
        });

        //emit the challenge added event
        emit ChallengeAdded(challengeId, msg.sender, _totalPrize, _ipfsCid);
    }

    /**
     * @notice Allows the sponsor to fund the challenge
     * @param _challengeId The id of the challenge to fund
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
            // ERC20 funding
            IERC20 token = IERC20(challenge.token);

            // Ensure sponsor approved enough tokens
            uint256 allowance = token.allowance(msg.sender, address(this));
            if (allowance < challenge.totalPrize) {
                revert Escrow_InsufficientAllowance();
            }

            // Transfer tokens to escrow
            bool success = token.transferFrom(
                msg.sender,
                address(this),
                challenge.totalPrize
            );
            if (!success) {
                revert Escrow_InvalidTokenTransfer();
            }
        } else {
            // Native ETH funding
            if (msg.value != challenge.totalPrize) {
                revert Escrow_InvalidEthAmount();
            }
        }

        // Mark funded
        challenge.isFunded = true;

        emit ChallengeFunded(_challengeId, msg.sender, challenge.totalPrize);
    }

    /**
     * @notice Returns the challenge data for a given id
     * @param _challengeId The id of the challenge
     * @return challenge The challenge struct
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
     * @notice Allows the organizer to lock the contract
     *
     */
    function lockContract() external beforeLock onlyOrganizer {
        isLocked = true;
        emit ConfigurationLocked();
    }

    /**
     * @notice Allows the organiser to add winners and their allocations
     * @param _challengeId The id of the challenge
     * @param _winners The list of winners' addresses (ordered by position)
     * @param _allocations The corresponding prize allocations for each winner
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

        uint256 totalAllocated = 0;

        for (uint256 i = 0; i < _winners.length; i++) {
            address winner = _winners[i];
            uint256 amount = _allocations[i];

            if (winner == address(0) || amount == 0) {
                revert Escrow_InvalidAllocation();
            }

            allocations[winner] = EscrowLib.Allocation({
                position: i + 1, // 1-based index
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

        emit WinnersAdded(_challengeId, _winners, _allocations);
    }

    /**
     * @notice Approves the distribution of funds for a challenge
     * @param _challengeId The id of the challenge
     */
    function approveDistribution(
        uint256 _challengeId
    ) external beforeLock challengeExists(_challengeId) {
        EscrowLib.Challenge storage challenge = challenges[_challengeId];
        EscrowLib.Approval storage approval = approvals[_challengeId];

        // Only organiser or sponsor can approve
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
     * @notice Allows the organizer to unlock the contract
     *
     */
    function unLockContract() external onlyOrganizer {
        isLocked = false;
        emit ConfigurationUnLocked();
    }
}
