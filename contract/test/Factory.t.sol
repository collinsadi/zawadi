// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Factory} from "../contracts/Zawadi/Factory.sol";
import {FactoryLib} from "../contracts/Libraries/FactoryLib.sol";
import {IIntentSpec} from "../contracts/Interfaces/IIntentSpec.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

contract FactoryTest is Test {
    Factory public factory;
    address public owner;
    address public user1;
    address public user2;
    address public user3;

    event HackathonCreated(
        bytes32 indexed hackathonId,
        address indexed organizer,
        address escrowContract,
        string ipfsCid
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");

        factory = new Factory("ipfs://factory-test", "ipfs://escrow-test");
    }

    // Test Constructor
    function test_Constructor() public view {
        assertEq(factory.factoryOwner(), owner);
    }

    // Test createHackathon function
    function test_CreateHackathon() public {
        string memory ipfsCid = "QmTest123";

        vm.prank(user1);
        (bytes32 hackathonId, address escrowContract) = factory.createHackathon(
            ipfsCid
        );

        // Verify hackathon was created
        assertTrue(hackathonId != bytes32(0));
        assertTrue(escrowContract != address(0));

        // Verify hackathon details
        FactoryLib.Hackathon memory hackathon = factory.getHackathonById(
            hackathonId
        );
        assertEq(hackathon.organizer, user1);
        assertEq(hackathon.escrowContract, escrowContract);
        assertEq(hackathon.ipfsCid, ipfsCid);
        assertEq(hackathon.id, hackathonId);

        // Verify hackathon count increased
        assertEq(factory.getHackathonCount(), 1);
    }

    function test_CreateMultipleHackathons() public {
        string memory ipfsCid1 = "QmTest1";
        string memory ipfsCid2 = "QmTest2";
        string memory ipfsCid3 = "QmTest3";

        // Create hackathons with different users
        vm.prank(user1);
        (bytes32 hackathonId1, address escrowContract1) = factory
            .createHackathon(ipfsCid1);

        vm.prank(user2);
        (bytes32 hackathonId2, address escrowContract2) = factory
            .createHackathon(ipfsCid2);

        vm.prank(user1);
        (bytes32 hackathonId3, address escrowContract3) = factory
            .createHackathon(ipfsCid3);

        // Verify all hackathons are different
        assertTrue(hackathonId1 != hackathonId2);
        assertTrue(hackathonId2 != hackathonId3);
        assertTrue(hackathonId1 != hackathonId3);

        // Verify escrow contracts are different
        assertTrue(escrowContract1 != escrowContract2);
        assertTrue(escrowContract2 != escrowContract3);
        assertTrue(escrowContract1 != escrowContract3);

        // Verify count
        assertEq(factory.getHackathonCount(), 3);

        // Verify all hackathons are retrievable
        FactoryLib.Hackathon memory hackathon1 = factory.getHackathonById(
            hackathonId1
        );
        FactoryLib.Hackathon memory hackathon2 = factory.getHackathonById(
            hackathonId2
        );
        FactoryLib.Hackathon memory hackathon3 = factory.getHackathonById(
            hackathonId3
        );

        assertEq(hackathon1.organizer, user1);
        assertEq(hackathon2.organizer, user2);
        assertEq(hackathon3.organizer, user1);
    }

    // Test getHackathonById function
    function test_GetHackathonById_ValidId() public {
        string memory ipfsCid = "QmTest123";

        vm.prank(user1);
        (bytes32 hackathonId, address escrowContract) = factory.createHackathon(
            ipfsCid
        );

        FactoryLib.Hackathon memory hackathon = factory.getHackathonById(
            hackathonId
        );

        assertEq(hackathon.organizer, user1);
        assertEq(hackathon.escrowContract, escrowContract);
        assertEq(hackathon.ipfsCid, ipfsCid);
        assertEq(hackathon.id, hackathonId);
    }

    function test_GetHackathonById_InvalidId() public {
        bytes32 invalidId = keccak256("invalid");

        vm.expectRevert();
        factory.getHackathonById(invalidId);
    }

    // Test getAllHackathons function
    function test_GetAllHackathons() public {
        // Initially empty
        FactoryLib.Hackathon[] memory allHackathons = factory
            .getAllHackathons();
        assertEq(allHackathons.length, 0);

        // Create hackathons
        vm.prank(user1);
        (bytes32 hackathonId1, address escrowContract1) = factory
            .createHackathon("QmTest1");

        vm.prank(user2);
        (bytes32 hackathonId2, address escrowContract2) = factory
            .createHackathon("QmTest2");

        // Get all hackathons
        allHackathons = factory.getAllHackathons();
        assertEq(allHackathons.length, 2);

        // Verify first hackathon
        assertEq(allHackathons[0].organizer, user1);
        assertEq(allHackathons[0].escrowContract, escrowContract1);
        assertEq(allHackathons[0].ipfsCid, "QmTest1");
        assertEq(allHackathons[0].id, hackathonId1);

        // Verify second hackathon
        assertEq(allHackathons[1].organizer, user2);
        assertEq(allHackathons[1].escrowContract, escrowContract2);
        assertEq(allHackathons[1].ipfsCid, "QmTest2");
        assertEq(allHackathons[1].id, hackathonId2);
    }

    // Test getHackathonCount function
    function test_GetHackathonCount() public {
        assertEq(factory.getHackathonCount(), 0);

        vm.prank(user1);
        factory.createHackathon("QmTest1");
        assertEq(factory.getHackathonCount(), 1);

        vm.prank(user2);
        factory.createHackathon("QmTest2");
        assertEq(factory.getHackathonCount(), 2);

        vm.prank(user1);
        factory.createHackathon("QmTest3");
        assertEq(factory.getHackathonCount(), 3);
    }

    // Test transferOwnership function
    function test_TransferOwnership_ValidAddress() public {
        address newOwner = user1;

        vm.expectEmit(true, true, false, false);
        emit OwnershipTransferred(owner, newOwner);

        factory.transferOwnership(newOwner);

        assertEq(factory.factoryOwner(), newOwner);
    }

    function test_TransferOwnership_ZeroAddress() public {
        vm.expectRevert();
        factory.transferOwnership(address(0));
    }

    function test_TransferOwnership_OnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        factory.transferOwnership(user2);
    }

    function test_TransferOwnership_MultipleTransfers() public {
        // First transfer
        factory.transferOwnership(user1);
        assertEq(factory.factoryOwner(), user1);

        // Second transfer by new owner
        vm.prank(user1);
        factory.transferOwnership(user2);
        assertEq(factory.factoryOwner(), user2);

        // Third transfer by new owner
        vm.prank(user2);
        factory.transferOwnership(user3);
        assertEq(factory.factoryOwner(), user3);
    }

    // Test access control modifiers
    function test_OnlyFactoryOwner_TransferOwnership() public {
        vm.prank(user1);
        vm.expectRevert();
        factory.transferOwnership(user2);
    }

    // Test edge cases and error conditions
    function test_CreateHackathon_EmptyIpfsCid() public {
        vm.prank(user1);
        (bytes32 hackathonId, address escrowContract) = factory.createHackathon(
            ""
        );

        // Should still work with empty string
        assertTrue(hackathonId != bytes32(0));
        assertTrue(escrowContract != address(0));

        FactoryLib.Hackathon memory hackathon = factory.getHackathonById(
            hackathonId
        );
        assertEq(hackathon.ipfsCid, "");
    }

    function test_CreateHackathon_LongIpfsCid() public {
        string
            memory longIpfsCid = "QmVeryLongIpfsCidThatContainsLotsOfCharactersAndShouldStillWorkCorrectlyInTheSystem";

        vm.prank(user1);
        (bytes32 hackathonId, address escrowContract) = factory.createHackathon(
            longIpfsCid
        );

        assertTrue(hackathonId != bytes32(0));
        assertTrue(escrowContract != address(0));

        FactoryLib.Hackathon memory hackathon = factory.getHackathonById(
            hackathonId
        );
        assertEq(hackathon.ipfsCid, longIpfsCid);
    }

    function test_CreateHackathon_SameUserDifferentTimestamps() public {
        string memory ipfsCid = "QmTest123";

        // Create first hackathon
        vm.prank(user1);
        (bytes32 hackathonId1, address escrowContract1) = factory
            .createHackathon(ipfsCid);

        // Advance block timestamp
        vm.warp(block.timestamp + 1);

        // Create second hackathon with same user and IPFS CID
        vm.prank(user1);
        (bytes32 hackathonId2, address escrowContract2) = factory
            .createHackathon(ipfsCid);

        // Should be different due to different timestamps
        assertTrue(hackathonId1 != hackathonId2);
        assertTrue(escrowContract1 != escrowContract2);
    }

    // Test gas usage
    function test_CreateHackathon_GasUsage() public {
        string memory ipfsCid = "QmTest123";

        uint256 gasStart = gasleft();
        vm.prank(user1);
        factory.createHackathon(ipfsCid);
        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas used for createHackathon:", gasUsed);

        // Gas usage should be reasonable (less than 5M gas)
        assertTrue(gasUsed < 5_000_000);
    }

    // Test view functions with no hackathons
    function test_ViewFunctions_NoHackathons() public view {
        assertEq(factory.getHackathonCount(), 0);

        FactoryLib.Hackathon[] memory allHackathons = factory
            .getAllHackathons();
        assertEq(allHackathons.length, 0);
    }

    // =========================================================================
    // ERC-165 + IntentSpec
    // =========================================================================

    function test_SupportsInterface_ERC165() public view {
        assertTrue(factory.supportsInterface(0x01ffc9a7));
    }

    function test_SupportsInterface_IIntentSpec() public view {
        assertTrue(factory.supportsInterface(type(IIntentSpec).interfaceId));
    }

    function test_SupportsInterface_InvalidId() public view {
        assertFalse(factory.supportsInterface(0xffffffff));
    }

    function test_GetIntentSpecURI() public view {
        assertEq(factory.getIntentSpecURI(), "ipfs://factory-test");
    }

    function test_SetIntentSpecURI_Success() public {
        factory.setIntentSpecURI("ipfs://updated-factory");
        assertEq(factory.getIntentSpecURI(), "ipfs://updated-factory");
    }

    function test_SetIntentSpecURI_OnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        factory.setIntentSpecURI("ipfs://bad");
    }
}
