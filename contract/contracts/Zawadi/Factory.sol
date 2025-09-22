// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Escrow.sol";
import "../Libraries/FactoryLib.sol";
import "../Errors/FactoryError.sol";
import "../Events/FactoryEvents.sol";

contract Factory {
    address public factoryOwner;

    // Array to track all hackathons
    FactoryLib.Hackathon[] public allHackathons;

    // Mapping to track hackathons by ID
    mapping(bytes32 => FactoryLib.Hackathon) public hackathons;

    constructor() {
        factoryOwner = msg.sender;
    }

    // Modifiers
    modifier onlyFactoryOwner() {
        if (msg.sender != factoryOwner)
            revert Factory__OnlyFactoryOwnerCanAccess();
        _;
    }

    modifier onlyOrganizer(bytes32 _id) {
        FactoryLib.Hackathon memory hackathon = hackathons[_id];
        if (hackathon.organizer == address(0))
            revert Factory__HackathonDoesNotExist();

        if (msg.sender != hackathon.organizer)
            revert Factory__OnlyOrganizerCanAccess();
        _;
    }

    // Events are imported from FactoryEvents.sol

    // Function to create a new hackathon
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

    // Function to get hackathon by ID
    function getHackathonById(
        bytes32 _hackathonId
    ) external view returns (FactoryLib.Hackathon memory) {
        FactoryLib.Hackathon memory hackathon = hackathons[_hackathonId];
        if (hackathon.organizer == address(0)) {
            revert Factory__HackathonDoesNotExist();
        }
        return hackathon;
    }

    // Function to get all hackathons
    function getAllHackathons()
        external
        view
        returns (FactoryLib.Hackathon[] memory)
    {
        return allHackathons;
    }

    // Function to get hackathon count
    function getHackathonCount() external view returns (uint256) {
        return allHackathons.length;
    }

    // Function to transfer factory ownership
    function transferOwnership(address _newOwner) external onlyFactoryOwner {
        if (_newOwner == address(0)) revert Factory__InvalidAddress();
        address previousOwner = factoryOwner;
        factoryOwner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }
}
