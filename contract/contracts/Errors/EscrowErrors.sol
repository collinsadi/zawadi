// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

error Escrow__OnlyOrganizerCanAccess();
error Escrow__OnlySponsorCanAccess();
error Escrow__ConfigurationLocked();
error Escrow__ChallengeDoesNotExist();
error Escrow__OrganizerAddressCannotBeZero();
error Escrow__InvalidTokenOrPrize();
error Escrow__OrganizerAlreadyApproved();
error Escrow__SponsorAlreadyApproved();
error Escrow__UnauthorizedAccess();
error Escrow__SponsorAlreadyWhitelisted();
error Escrow__SponsorNotWhitelisted();
error Escrow__PayoutAlreadyClaimed();
error Escrow__EthTransferFailed();
error Escrow__DuplicateWinner();
error Escrow__SponsorNotRevocable();
error Escrow__RefundWindowNotOpen();
error Escrow_AlreadyFunded();
error Escrow_InsufficientAllowance();
error Escrow_InvalidEthAmount();
error Escrow_ChallengeNotFunded();
error Escrow_InvalidAllocation();
