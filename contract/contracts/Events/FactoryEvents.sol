// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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