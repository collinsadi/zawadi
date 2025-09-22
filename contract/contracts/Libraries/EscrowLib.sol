// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

//library for escrow related structs
library EscrowLib {
    struct Challenge {
        uint256 totalPrize;
        address sponsor;
        bool isPaidOut;
        address token;
        bool isERC20;
        string ipfsCid;
        bool isFunded;
    }

    struct Allocation {
        uint256 position;
        uint256 amount;
        address winner;
        bool claimed;
    }

    struct Approval {
        bool sponsorApproved;
        bool organiserApproved;
    }
}
