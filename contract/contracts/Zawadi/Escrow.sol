// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Errors/EscrowErrors.sol";


contract Escrow {

// using safe ERC20 for IERC20 so we can use the safe transfer functions
using SafeERC20 for IERC20;

}

