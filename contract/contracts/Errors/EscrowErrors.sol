// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

//custom errors for the escrow contract
error Escrow__OnlyOrganizerCanAccess();
error Escrow__OnlySponsorCanAccess();
error Escrow__ConfigurationLocked();
error Escrow__ChallengeDoesNotExist();
error Escrow__OrganizerAddressCannotBeZero();
error Escrow__InvalidTokenOrAmount();
error Escrow__ChallengeAlreadyConfigured();
error Escrow__InvalidTokenOrPrize();
error Escrow__ChallengeIsNotConfigured();
error Escrow__WinnersAreNotEqualToPrizeAllocations();
error Escrow__WinnerAlreadyAdded();
error Escrow__ChallengeIsAlreadyPaidOut();
error Escrow__OrganizerAlreadyApproved();
error Escrow__SponsorAlreadyApproved();
error Escrow__UnauthorizedAccess();
error Escrow__NotEnoughApprovals();
error Escrow__SponsorNameCannotBeEmpty();
error Escrow__SponsorAlreadyWhitelisted();
error Escrow__SponsorNotWhitelisted();
error Escrow_AlreadyFunded();
error Escrow_InsufficientAllowance();
error Escrow_InvalidTokenTransfer();
error Escrow_InvalidEthAmount();
error Escrow_ChallengeNotFunded();
error Escrow_InvalidAllocation();
