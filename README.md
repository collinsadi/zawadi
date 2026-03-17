# Zawadi: Decentralized Hackathon Escrow Protocol

 Version: 1.0  
 Last updated: 2026-03-17

 Demo Video : https://youtu.be/QRYhTMeOOPk
 
 New Audited Contract on Sepolia: https://sepolia.etherscan.io/address/0xBdE4dE795F53b0c5c3CFde78cF3aC104D016C2e1#code
 
 New Audited Contract on Optimism Mainnet: https://optimistic.etherscan.io/address/0x5368CB8C5ec254De208ceeB455Caba6E12064a0F#code

Security Audit Report: [audit/AUDIT_REPORT.md](audit/AUDIT_REPORT.md)

 ## Table of Contents
 - [Abstract](#abstract)
 - [Problem Statement](#problem-statement)
 - [System Architecture](#system-architecture)
 - [Smart Contracts](#smart-contracts)
   - [Factory.sol](#factorysol)
   - [Escrow.sol](#escrowsol)
 - [Off-Chain Components (Example Implementation of the protocol)](#off-chain-components-example-implementation-of-the-protocol)
 - [Backend API (IPFS Pinning)](#backend-api-ipfs-pinning)
 - [Protocol Workflows](#protocol-workflows)
- [Data Model and Events](#data-model-and-events)
- [Security Considerations](#security-considerations)
- [Security](#security)
- [Economics and Fees](#economics-and-fees)
 - [Governance](#governance)
 - [Frontend UX Notes](#frontend-ux-notes)
 - [Metadata and IPFS](#metadata-and-ipfs)
 - [ERC-8174: Intent Spec Support](#erc-8174-intent-spec-support)
 - [Specifications and Interoperability](#specifications-and-interoperability)
 - [References (Code Citations)](#references-code-citations)
 - [Appendix: Example User Journeys](#appendix-example-user-journeys)

 ## Abstract
 Zawadi is a decentralized protocol for managing hackathon prize escrows. It enables organizers to create hackathons, whitelist sponsors, set up prize challenges, accept funding in ERC20 or native ETH, define winners and allocations, require dual approvals from organizer and sponsor, and allow self-service winner payouts. The system is composed of:

 - Smart contracts: `Factory.sol` deploys per-hackathon `Escrow.sol` instances and indexes hackathons.
 - Frontend dApp (React + Vite + RainbowKit + wagmi): User workflows for organizers, sponsors, and participants.
 - Backend service (Node/Express): IPFS/Pinata JSON pinning to store hackathon and challenge metadata.

 The protocol emphasizes transparent prize allocation, self-custody of funds until conditions are met, and auditable on-chain event history.

  Note: The frontend client included in this repository is provided as a reference/example implementation to demonstrate how to interact with the protocol. It is not a core component of the protocol. The protocol itself is defined by the on-chain smart contracts (their public interfaces and events) and remains independent of any particular client implementation.

 ---

## Problem Statement
Hackathons require transparent custody of prize funds, verifiable allocations, and frictionless payout. Traditional approaches rely on trusted intermediaries, manual processes, and private ledgers, creating risks of delayed or disputed payouts. Zawadi addresses:

- Custody risk: Use on-chain escrow with explicit funding and payout logic.
- Transparency: Public state and events; immutable metadata references via IPFS CIDs.
- Coordination: Dual approval flow (organizer + sponsor) before payouts.
- Automation: Winners can self-claim payouts after approvals.

---

## System Architecture

### High-Level Components
- Smart Contracts  
  - `contract/contracts/Zawadi/Factory.sol`  
  - `contract/contracts/Zawadi/Escrow.sol`  
  - Supporting libraries, errors, and events under `contract/contracts/Libraries/`, `Errors/`, and `Events/`.

- Frontend dApp  
  - `client/src/services/factoryService.ts` and `client/src/services/escrowService.ts` encapsulate on-chain interactions via wagmi/viem.
  - `client/src/config/wagmi.ts` configures chains and wallet connectivity (RainbowKit).

- Backend API  
  - `server/src/modules/IPFS/routes.ts` exposes `/ipfs/json` to pin JSON metadata (Pinata).
  - `server/src/common/config/environment.ts` loads env values for Pinata keys/gateway.


## Smart Contracts

### Factory.sol
Path: `contract/contracts/Zawadi/Factory.sol`

- Responsibilities
  - Deploy new `Escrow` contracts per hackathon.
  - Index hackathons by `bytes32 id` and in an iterable array.
  - Manage `factoryOwner` with `transferOwnership()`.

- Key storage
  - `address public factoryOwner`
  - `FactoryLib.Hackathon[] public allHackathons`
  - `mapping(bytes32 => FactoryLib.Hackathon) public hackathons`

- Core functions
  - `createHackathon(string _ipfsCid) returns (bytes32, address)`  
    - Generates `hackathonId = keccak256(organizer, _ipfsCid, block.timestamp)`.  
    - Deploys `Escrow(msg.sender)` for the organizer.  
    - Stores and emits `HackathonCreated`.  
    - Ref: lines 61–102.
  - `getHackathonById(bytes32)` and `getAllHackathons()`  
    - Retrieval and indexing; reverts if not found.  
    - Ref: lines 104–133.
  - `getHackathonCount()`  
    - Returns total hackathons.  
    - Ref: lines 135–142.
  - `transferOwnership(address _newOwner)`  
    - Only factory owner; emits `OwnershipTransferred`.  
    - Ref: lines 145–156.

- Events and Errors
  - Events: `FactoryEvents.sol` (`HackathonCreated`, `OwnershipTransferred`).
  - Errors: `FactoryError.sol`.

- Tests
  - `contract/test/Factory.t.sol` thoroughly exercises happy paths and edge cases.

### Escrow.sol
Path: `contract/contracts/Zawadi/Escrow.sol`

- Responsibilities
  - Manage per-hackathon challenges and funds.
  - Whitelist sponsors who can create and fund challenges.
  - Support native ETH or ERC20 prize pools.
  - Define winners and allocations, require dual approvals (organizer + sponsor).
  - Allow winners to claim their allocations once approved.

- Security
  - `ReentrancyGuard` utilized; payouts use `safeTransfer` or ETH `.call`.  
    - Ref: imports at lines 4–7; `claimPayout()` lines 335–368.
  - Access controls via modifiers: `onlyOrganizer`, `onlySponsor`, `beforeLock`, `challengeExists`, `sponsorWhitelisted`.  
    - Ref: lines 31–59.

- Key storage
  - `address public organizer`
  - `bool public isLocked`
  - `uint256 public challengeCount`
  - `mapping(uint256 => EscrowLib.Challenge) public challenges`
  - `mapping(address => mapping(uint256 => EscrowLib.Allocation)) public allocations`
  - `mapping(uint256 => EscrowLib.Approval) public approvals`
  - `mapping(address => bool) public sponsors`
  - `address[] public whitelistedSponsors`
  - `uint256[] private _challengeIds` to support pagination

- Core functions
  - Sponsor lifecycle
    - `whitelistSponsor(address)` by organizer.  
      - Ref: lines 71–83.
    - `addChallenge(uint256 totalPrize, address token, bool isERC20, string ipfsCid)`  
      - Requires sponsor whitelisting, before lock, non-zero prize; increments `challengeCount`; tracks ID; emits `ChallengeAdded`.  
      - Ref: lines 91–126.
    - `fundChallenge(uint256 challengeId)` payable for ETH; ERC20 uses `transferFrom` after `allowance`.  
      - Marks funded; emits `ChallengeFunded`.  
      - Ref: lines 162–211.

  - Winners and approval
    - `addWinners(challengeId, winners[], allocations[])` by organizer, before lock, after funded.  
      - Validates lengths, zero values, sum equals `totalPrize`; stores allocations per winner; emits `WinnersAdded`.  
      - Ref: lines 255–301.
    - `approveDistribution(challengeId)` by sponsor or organizer, before lock.  
      - Independently flips `sponsorApproved` or `organiserApproved`; emits `DistributionApproved`.  
      - Ref: lines 303–329.
    - `claimPayout(challengeId)` by the winner, non-reentrant.  
      - Requires both approvals; transfers ERC20 or ETH; marks `claimed`.  
      - Ref: lines 331–368.

  - Config
    - `lockContract()` / `unLockContract()`  
      - Lock prevents further config changes; emits `ConfigurationLocked`/`ConfigurationUnLocked`.  
      - Ref: lines 246–252 and 370–378.

  - Read helpers
    - `getChallenge(challengeId)`  
    - `challengeTokenDecimals(challengeId)` with native returning 18.  
    - Pagination: `getChallengeIds()`, `getChallengesPage(offset, limit)`.

- Events and Errors
  - Events: `EscrowEvents.sol` (`ChallengeAdded`, `ChallengeFunded`, `WinnersAdded`, `DistributionApproved`, `ConfigurationLocked`, `ConfigurationUnLocked`, `SponsorWhitelisted`).
  - Errors: `EscrowErrors.sol` (comprehensive for auth and state checks).

- Tests
  - `contract/test/Escrow.t.sol` provides extensive coverage:
    - Sponsor whitelisting, adding/funding challenges (ERC20/ETH), locking, adding winners, approvals, and gas usage.
    - Multiple challenges end-to-end scenario.

---

## Off-Chain Components (Example Implementation of the protocol)

### Frontend dApp
- Chain/wallet config: `client/src/config/wagmi.ts` with RainbowKit’s `getDefaultConfig` and a local `hardhat` chain defined in `client/src/chains/hardhat.ts`.
- Factory interactions: `client/src/services/factoryService.ts`  
  - `createHackathon(ipfsCid)`, reads for `getHackathonById`, `getAllHackathons`, `getHackathonCount`, `factoryOwner`.
- Escrow interactions: `client/src/services/escrowService.ts`  
  - Reads: `organizer`, `isLocked`, `challengeCount`, `getChallenge`, `approvals`, `allocations(winner, challengeId)`, `getWhitelistedSponsors`, paginated challenges, `hasWinners`, `challengeTokenDecimals`, `getWinnersForChallenge` via logs.
  - Writes: `whitelistSponsor`, `addChallenge`, `fundChallenge` (ETH via value or ERC20 via allowance+0 value), `addWinners`, `approveDistribution`, `claimPayout`, `lockContract`, `unLockContract`.
  - Uses `parseAbiItem` and `getPublicClient` for log queries and pagination.

### Backend API (IPFS Pinning)
- Route: `server/src/modules/IPFS/routes.ts`  
  - `POST /ipfs/json` accepts JSON and returns `cid` using `PinataUtils`.  
- Config: `server/src/common/config/environment.ts`  
  - Env-driven Pinata API keys and gateway URLs.

- Purpose: Off-chain, human-readable hackathon and challenge metadata (titles, descriptions, images, timelines) is pinned to IPFS, with CIDs stored on-chain (`Factory.createHackathon(ipfsCid)`, `Escrow.addChallenge(..., ipfsCid)`).  
- Reference metadata specs: `specs/Hackathon.json` and `specs/Challenge.json`.

---

## Protocol Workflows

### 1) Organizer creates a hackathon
- Off-chain: Organizer prepares hackathon metadata and posts to `/ipfs/json` -> receives `hackathonCID`.
- On-chain: Organizer calls `Factory.createHackathon(hackathonCID)`  
  - New `Escrow` is deployed and indexed.  
  - Event: `HackathonCreated`.


### 2) Sponsor whitelisting and challenge creation
- Organizer calls `Escrow.whitelistSponsor(sponsor)`.
- Sponsor prepares challenge metadata -> pins to IPFS -> gets `challengeCID`.
- Sponsor calls `Escrow.addChallenge(totalPrize, token, isERC20, challengeCID)`.

### 3) Funding
- ERC20: Sponsor approves escrow and then calls `fundChallenge(challengeId)`; contract pulls tokens via `transferFrom`.
- ETH: Sponsor calls `fundChallenge(challengeId)` with `msg.value == totalPrize`.

### 4) Winners and approvals
- Organizer calls `addWinners(challengeId, winners[], amounts[])` with amounts summing to `totalPrize`.
- Sponsor and Organizer independently call `approveDistribution(challengeId)`.

### 5) Winner payout
- Each winner calls `claimPayout(challengeId)` to receive their allocation.
- Non-reentrant. ERC20 via `safeTransfer`, ETH via `.call`.

---

## Data Model and Events

- Hackathon indexing: `FactoryLib.Hackathon`  
  - Stored in `hackathons[id]` and `allHackathons[]`.  
  - Read via `getHackathonById` and `getAllHackathons`.

- Challenge storage: `EscrowLib.Challenge`  
  - Includes `totalPrize`, `sponsor`, `token`, `isERC20`, `ipfsCid`, `isFunded`.

- Winner allocations: `EscrowLib.Allocation` keyed by `allocations[winner][challengeId]`.

- Approvals: `approvals[challengeId]` is a pair of booleans: `sponsorApproved`, `organiserApproved`.

- Events provide an auditable timeline:
  - Factory: `HackathonCreated`, `OwnershipTransferred`.
  - Escrow: `SponsorWhitelisted`, `ChallengeAdded`, `ChallengeFunded`, `WinnersAdded`, `DistributionApproved`, `ConfigurationLocked`, `ConfigurationUnLocked`.

---

## Security Considerations

- Access control
  - `Factory.onlyFactoryOwner` restricts ownership transfer.  
  - `Escrow.onlyOrganizer` and `onlySponsor` for sensitive actions.  
  - Whitelisting required for sponsors to add/fund challenges.

- State guards
  - `beforeLock` prevents configuration changes post-lock.  
  - `challengeExists` ensures IDs are valid.  
  - Allocation sum must equal `totalPrize`; zero checks prevent invalid entries.

- Reentrancy
  - `claimPayout` is `nonReentrant`; uses Checks-Effects-Interactions pattern:
    - Validate approvals -> set `claimed = true` -> transfer funds.

- ERC20 interactions
  - Uses `IERC20` and `SafeERC20.safeTransfer` on payouts.
  - Funding uses `allowance` check and `transferFrom` return value check.

- ETH transfers
  - Validates exact `msg.value` for funding.  
  - Payout via `.call` checked for success.

- Upgradability and Admin
  - No proxy pattern; contracts are simple and immutable.  
  - `Factory` owner is transferable.  
  - `Escrow` organizer set at creation; cannot be changed in current design.

---

## Security

This project has undergone an automated security audit.

- Automated Security Audit: [audit/AUDIT_REPORT.md](audit/AUDIT_REPORT.md)

---

## Economics and Fees

- Current implementation: No protocol fee.  
  - Funding equals total prize.  
  - Entire prize is allocated to winners; no skim or fee mechanism exists in `Escrow.sol` or `Factory.sol`.
---

## Governance

- Factory-level governance:
  - `factoryOwner` can be transferred via `transferOwnership`.  
  - No other privileged Factory functions exist.

- Per-hackathon governance:
  - Organizer holds control to whitelist sponsors, add winners, lock/unlock, and co-approve distribution.
  - Sponsors retain veto power via required co-approval.

---

## Frontend UX Notes

- Wallet onboarding and chain config via RainbowKit/wagmi (`client/src/config/wagmi.ts`).
- Contract ABIs at `client/src/abi/*.json`.  
- Service modules abstract contract calls:
  - `factoryService.ts` for hackathons.  
  - `escrowService.ts` for challenges, approvals, payouts, logs-based listings, and pagination.

---

## Metadata and IPFS

- JSON schemas under `specs/`:
  - `Hackathon.json`: Title, description, details, organizer profile, etc.  
  - `Challenge.json`: Title, prize, token, sponsor info, image, and details.

 - Backend pins JSON via Pinata using `POST /ipfs/json` and returns a CID; CIDs stored on-chain for immutability and verifiability.
 
 ---
 
 ## ERC-8174: Intent Spec Support
 
 Zawadi implements [ERC-8174 (Intent Spec for Contracts)](https://eips.ethereum.org/EIPS/eip-8174), a standard that attaches machine-readable semantic metadata to smart contracts. Both `Factory.sol` and `Escrow.sol` expose an `IIntentSpec` interface and support ERC-165 introspection.

 ### Why Intent Spec?

 A contract ABI tells external callers *what* functions exist, but not *what they mean*. ERC-8174 fills that gap by publishing a JSON manifest that describes, for every function, its **intent** (what it does in plain language), **preconditions** (what must be true before calling), **effects** (what state changes on success), **risks** (what could go wrong), and optional **agent guidance** (recommended usage patterns). This enables:

 - **AI agents and automation** to interact with the protocol safely — they can verify preconditions and understand side-effects before submitting transactions.
 - **Wallet UIs and block explorers** to display human-friendly function descriptions alongside raw calldata.
 - **Auditors and integrators** to quickly understand contract semantics without reading Solidity source.

 ### How it works

 Each contract stores an IPFS URI pointing to its Intent Spec JSON manifest. The URI is set at deploy time via the constructor and can be updated by the contract owner/organizer. Every `Escrow` deployed by the `Factory` automatically inherits the Escrow Intent Spec URI.

 - `getIntentSpecURI()` — returns the current manifest URI (ERC-8174).
 - `supportsInterface(0x...)` — confirms ERC-165 + IIntentSpec support.
 - `setIntentSpecURI(uri)` — allows the factory owner (Factory) or organizer (Escrow) to update the URI.

 Intent Spec manifests are stored under `contract/intentspec/`:
 - [`contract/intentspec/Factory.json`](contract/intentspec/Factory.json)
 - [`contract/intentspec/Escrow.json`](contract/intentspec/Escrow.json)

 ---

 ## Specifications and Interoperability
 
 To ensure cross-client compatibility and predictable integrations, metadata MUST strictly conform to the JSON specifications in the `specs/` folder. All producers and consumers of metadata are required to adhere to these field names, types, and casing. Deviations MAY lead to rejected uploads, failed parsing, or undefined behavior across clients and services.
 
 - Source of truth for schemas:
   - `specs/Hackathon.json`
   - `specs/Challenge.json`
 
 The following summarizes the required structure for each JSON document. Refer to the files under `specs/` for the canonical formats.
 
 ### Hackathon Metadata (`specs/Hackathon.json`)
 - Required top-level fields
   - `id`: string
   - `title`: string
   - `cover`: string (URL or CID)
   - `description`: string
   - `details`: object
     - `prizePool`: string
     - `currency`: string (symbol or address reference)
     - `startDate`: string (ISO-8601)
     - `endDate`: string (ISO-8601)
     - `location`: string
     - `tags`: string[]
   - `organiser`: object
     - `name`: string
     - `logo`: string (URL or CID)
     - `url`: string
   - `type`: string
 
 ### Challenge Metadata (`specs/Challenge.json`)
 - Required top-level fields
   - `id`: string
   - `title`: string
   - `totalPrize`: string (human-readable or numeric-as-string; on-chain total is authoritative)
   - `brief`: string
   - `token`: string (symbol or token address reference)
   - `isErc20`: boolean
   - `data`: object
     - `image`: string (URL or CID)
     - `details`: string
   - `sponsor`: object
     - `link`: string (URL)
     - `name`: string
     - `logo`: string (URL or CID)
 
 Implementation notes
 - All string dates SHOULD be ISO-8601 (e.g., `2025-09-26T00:00:00Z`).
 - Image fields MAY be HTTP(S) URLs or IPFS content identifiers.
 - When addresses are included, they SHOULD be lowercase checksum or normalized consistently across clients.
 - Clients SHOULD validate documents against the schemas in `specs/` before pinning.
 - Any additional, non-specified fields SHOULD be namespaced (e.g., `x-...`) to avoid collisions and MUST NOT break readers expecting the canonical fields.
 
 By adhering to these specifications, independent clients, indexers, and services can interoperate reliably on the same metadata, ensuring consistent behavior across the ecosystem.
 
 ---
 
 ## References (Code Citations)

- Factory
  - `contract/contracts/Zawadi/Factory.sol`
  - `contract/contracts/Events/FactoryEvents.sol`
  - `contract/contracts/Errors/FactoryError.sol`

- Escrow
  - `contract/contracts/Zawadi/Escrow.sol`
  - `contract/contracts/Libraries/EscrowLib.sol`
  - `contract/contracts/Events/EscrowEvents.sol`
  - `contract/contracts/Errors/EscrowErrors.sol`
  - Tests: `contract/test/Escrow.t.sol`

- Frontend
  - `client/src/services/factoryService.ts`
  - `client/src/services/escrowService.ts`
  - `client/src/config/wagmi.ts`
  - ABIs: `client/src/abi/`

- Backend
  - `server/src/modules/IPFS/routes.ts`
  - `server/src/common/config/environment.ts`

---

## Appendix: Example User Journeys

- Organizer
  - Pin hackathon JSON -> `createHackathon(CID)` -> whitelist sponsors -> lock after configuration if desired.
- Sponsor
  - Ensure whitelisting -> pin challenge JSON -> `addChallenge(...)` -> fund (ERC20/ETH) -> approve distribution post-winners.
- Winner
  - Wait for both approvals -> `claimPayout(challengeId)` -> receive funds.

---
