// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

//events for the escrow contract
event ChallengeAdded(uint256 indexed challengeId, address sponsor, uint256 totalPrize, string ipfsCid);
event ChallengeFunded(uint256 indexed challengeId, address sponsor, uint256 amount);
event WinnersAdded(uint256 indexed challengeId, address[] winners, uint256[] allocations);
event DistributionApproved(uint256 indexed challengeId, address approver);
event PrizeClaimed(uint256 indexed challengeId, address winner, uint256 amount);
event ConfigurationLocked();
event ConfigurationUnLocked();
event SponsorWhitelisted(address sponsor);