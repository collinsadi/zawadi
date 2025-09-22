// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library FactoryLib {
    struct Hackathon {
        string ipfsCid;
        address escrowContract;
        address organizer;
        bytes32 id;
    }
}
