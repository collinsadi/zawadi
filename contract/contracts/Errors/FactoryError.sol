// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error Factory__OnlyFactoryOwnerCanAccess();
error Factory__HackathonDoesNotExist();
error Factory__HackathonAlreadyExists(string name);
error Factory__OnlyOrganizerCanAccess();
error Factory__InvalidAddress();