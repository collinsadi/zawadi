// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Escrow.sol";
import "../Libraries/FactoryLib.sol";
import "../Errors/FactoryError.sol";
import "../Events/FactoryEvents.sol";

/**
 * @title Factory
 * @dev Factory contract for creating and managing hackathon escrow contracts
 * @notice This contract allows organizers to create hackathons and deploy associated escrow contracts
 */
contract Factory {
    /// @notice Address of the factory owner who can transfer ownership
    address public factoryOwner;
    
    /// @notice Array containing all created hackathons for iteration and counting
    FactoryLib.Hackathon[] public allHackathons;
    
    /// @notice Mapping from hackathon ID to hackathon details for efficient lookups
    mapping(bytes32 => FactoryLib.Hackathon) public hackathons;

    /**
     * @dev Constructor sets the deployer as the initial factory owner
     */
    constructor() {
        factoryOwner = msg.sender;
    }

    // Modifiers
    
    /**
     * @dev Modifier that restricts access to the factory owner only
     * @notice Reverts if the caller is not the factory owner
     */
    modifier onlyFactoryOwner() {
        if (msg.sender != factoryOwner)
            revert Factory__OnlyFactoryOwnerCanAccess();
        _;
    }

    /**
     * @dev Modifier that restricts access to the organizer of a specific hackathon
     * @param _id The unique identifier of the hackathon
     * @notice Reverts if the hackathon doesn't exist or caller is not the organizer
     */
    modifier onlyOrganizer(bytes32 _id) {
        FactoryLib.Hackathon memory hackathon = hackathons[_id];
        if (hackathon.organizer == address(0))
            revert Factory__HackathonDoesNotExist();

        if (msg.sender != hackathon.organizer)
            revert Factory__OnlyOrganizerCanAccess();
        _;
    }

    // Events are imported from FactoryEvents.sol

    /**
     * @notice Creates a new hackathon and deploys an associated escrow contract
     * @dev Generates a unique hackathon ID using organizer address, IPFS CID, and timestamp
     * @param _ipfsCid The IPFS content identifier containing hackathon details
     * @return hackathonId The unique identifier for the created hackathon
     * @return escrowContract The address of the deployed escrow contract
     * @notice The caller becomes the organizer of the hackathon
     */
    function createHackathon(
        string memory _ipfsCid
    ) external returns (bytes32 hackathonId, address escrowContract) {
        // Generate unique hackathon ID
        hackathonId = keccak256(
            abi.encodePacked(msg.sender, _ipfsCid, block.timestamp)
        );

        // Deploy new Escrow contract
        escrowContract = address(new Escrow(msg.sender));

        // Create hackathon struct
        FactoryLib.Hackathon memory newHackathon = FactoryLib.Hackathon({
            ipfsCid: _ipfsCid,
            escrowContract: escrowContract,
            organizer: msg.sender,
            id: hackathonId
        });

        // Store hackathon
        hackathons[hackathonId] = newHackathon;

        // Add to allHackathons array
        allHackathons.push(newHackathon);

        // Emit event
        emit HackathonCreated(
            hackathonId,
            msg.sender,
            escrowContract,
            _ipfsCid
        );

        return (hackathonId, escrowContract);
    }

    /**
     * @notice Retrieves hackathon details by its unique identifier
     * @dev Reverts if the hackathon doesn't exist
     * @param _hackathonId The unique identifier of the hackathon to retrieve
     * @return The hackathon struct containing all details
     * @notice Reverts with Factory__HackathonDoesNotExist if hackathon is not found
     */
    function getHackathonById(
        bytes32 _hackathonId
    ) external view returns (FactoryLib.Hackathon memory) {
        FactoryLib.Hackathon memory hackathon = hackathons[_hackathonId];
        if (hackathon.organizer == address(0)) {
            revert Factory__HackathonDoesNotExist();
        }
        return hackathon;
    }

    /**
     * @notice Retrieves all created hackathons
     * @dev Returns the complete array of all hackathons
     * @return Array of all hackathon structs
     * @notice This function can be gas-intensive for large numbers of hackathons
     */
    function getAllHackathons()
        external
        view
        returns (FactoryLib.Hackathon[] memory)
    {
        return allHackathons;
    }

    /**
     * @notice Returns the total number of created hackathons
     * @dev Returns the length of the allHackathons array
     * @return The total count of hackathons
     */
    function getHackathonCount() external view returns (uint256) {
        return allHackathons.length;
    }

    /**
     * @notice Transfers ownership of the factory to a new address
     * @dev Can only be called by the current factory owner
     * @param _newOwner The address to transfer ownership to
     * @notice Reverts if the new owner address is zero address
     * @notice Emits OwnershipTransferred event upon successful transfer
     */
    function transferOwnership(address _newOwner) external onlyFactoryOwner {
        if (_newOwner == address(0)) revert Factory__InvalidAddress();
        address previousOwner = factoryOwner;
        factoryOwner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }
}
