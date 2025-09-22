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
        emit SponsorWhitelisted(_sponsor);
    }


    /**
     * @notice Allows the sponsor to add a new challenge to the escrow
     * @param _totalPrize The total prize for the challenge
     * @param _token The token for the challenge
     * @param _isERC20 Whether the token is an ERC20 token
     * @param _ipfsCid The IPFS CID for the challenge
     */
    function addChallenge(uint256 _totalPrize, address _token, bool _isERC20, string memory _ipfsCid) external beforeLock {

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
}
