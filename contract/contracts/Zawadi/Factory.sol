// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Escrow.sol";
import "../Libraries/FactoryLib.sol";
import "../Errors/FactoryError.sol";
import "../Events/FactoryEvents.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IIntentSpec} from "../Interfaces/IIntentSpec.sol";

/**
 * @title Factory
 * @notice Factory contract for creating and managing hackathon escrow contracts.
 * @custom:agent-version 2.0
 * @custom:agent-description Factory that deploys per-hackathon Escrow contracts, indexes them by bytes32 ID, and manages factory-level ownership.
 * @custom:agent-invariant Each hackathon ID is unique; duplicate IDs are rejected.
 * @custom:agent-invariant The factory never holds user funds; all funds go to deployed Escrow instances.
 * @custom:agent-event HackathonCreated A new hackathon was created and its Escrow contract deployed.
 * @custom:agent-event OwnershipTransferred Factory ownership was transferred to a new address.
 */
contract Factory is ERC165, IIntentSpec {
    /// @notice Address of the factory owner who can transfer ownership
    address public factoryOwner;
    
    /// @notice Array containing all created hackathons for iteration and counting
    FactoryLib.Hackathon[] public allHackathons;
    
    /// @notice Mapping from hackathon ID to hackathon details for efficient lookups
    mapping(bytes32 => FactoryLib.Hackathon) public hackathons;

    string private _intentSpecURI;
    string private _escrowIntentSpecURI;

    constructor(string memory factoryURI, string memory escrowURI) {
        factoryOwner = msg.sender;
        _intentSpecURI = factoryURI;
        _escrowIntentSpecURI = escrowURI;
    }

    modifier onlyFactoryOwner() {
        if (msg.sender != factoryOwner)
            revert Factory__OnlyFactoryOwnerCanAccess();
        _;
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
     * @custom:agent-precondition Caller must be the factory owner.
     * @custom:agent-effect Updates the intentSpecURI storage variable.
     * @custom:agent-risk URI should reference immutable content; a mutable URI may mislead agents.
     */
    function setIntentSpecURI(string calldata uri) external onlyFactoryOwner {
        _intentSpecURI = uri;
    }

    // --- Core functions ---

    /**
     * @notice Creates a new hackathon and deploys an associated escrow contract
     * @param _ipfsCid The IPFS content identifier containing hackathon details
     * @return hackathonId The unique identifier for the created hackathon
     * @return escrowContract The address of the deployed escrow contract
     * @custom:agent-intent Creates a new hackathon entry, deploys a dedicated Escrow contract, and returns both the hackathon ID and the escrow address.
     * @custom:agent-precondition _ipfsCid should be a valid IPFS CID pointing to hackathon metadata.
     * @custom:agent-effect A new Escrow contract is deployed; hackathon is stored in mapping and array; emits HackathonCreated.
     * @custom:agent-risk The caller becomes the organizer of the deployed Escrow; this is irreversible.
     * @custom:agent-guidance Pin hackathon metadata to IPFS before calling. The returned escrowContract address is needed for all subsequent challenge operations.
     */
    function createHackathon(
        string memory _ipfsCid
    ) external returns (bytes32 hackathonId, address escrowContract) {
        hackathonId = keccak256(
            abi.encodePacked(msg.sender, _ipfsCid, block.timestamp, allHackathons.length)
        );

        if (hackathons[hackathonId].organizer != address(0)) {
            revert Factory__HackathonAlreadyExists(_ipfsCid);
        }

        escrowContract = address(new Escrow(msg.sender, _escrowIntentSpecURI));

        FactoryLib.Hackathon memory newHackathon = FactoryLib.Hackathon({
            ipfsCid: _ipfsCid,
            escrowContract: escrowContract,
            organizer: msg.sender,
            id: hackathonId
        });

        hackathons[hackathonId] = newHackathon;
        allHackathons.push(newHackathon);

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
     * @param _hackathonId The unique identifier of the hackathon to retrieve
     * @return The hackathon struct containing all details
     * @custom:agent-intent Looks up a hackathon by its bytes32 ID and returns its metadata, escrow address, and organizer.
     * @custom:agent-effect None (read-only).
     * @custom:agent-guidance Reverts if the hackathon does not exist. Check getHackathonCount first if unsure.
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
     * @return Array of all hackathon structs
     * @custom:agent-intent Returns the complete list of all hackathons for enumeration.
     * @custom:agent-effect None (read-only).
     * @custom:agent-risk May be gas-heavy for very large hackathon counts when called on-chain.
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
     * @return The total count of hackathons
     * @custom:agent-intent Returns the number of hackathons created through this factory.
     * @custom:agent-effect None (read-only).
     */
    function getHackathonCount() external view returns (uint256) {
        return allHackathons.length;
    }

    /**
     * @notice Transfers ownership of the factory to a new address
     * @param _newOwner The address to transfer ownership to
     * @custom:agent-intent Transfers the factory owner role to a new address.
     * @custom:agent-precondition Caller must be the current factory owner.
     * @custom:agent-precondition New owner must not be the zero address.
     * @custom:agent-effect factoryOwner is updated; emits OwnershipTransferred.
     * @custom:agent-risk Irreversible. The previous owner loses all factory-level privileges.
     * @custom:agent-guidance Double-check the new owner address; there is no confirmation step.
     */
    function transferOwnership(address _newOwner) external onlyFactoryOwner {
        if (_newOwner == address(0)) revert Factory__InvalidAddress();
        address previousOwner = factoryOwner;
        factoryOwner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }
}
