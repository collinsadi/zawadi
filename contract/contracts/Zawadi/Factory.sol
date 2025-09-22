// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Escrow.sol";
import "../Libraries/FactoryLib.sol";
import "../Errors/FactoryError.sol";
import "../Events/FactoryEvents.sol";

contract Factory {
    FactoryLib.Hackathon[] public hackathons;
    address public factoryOwner;


}
