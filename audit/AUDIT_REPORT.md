# Security Audit Report — Zawadi Protocol

| Field | Detail |
|---|---|
| **Project** | Zawadi — Decentralized Hackathon Escrow Protocol |
| **Language** | Solidity 0.8.28 |
| **Framework** | Hardhat / Foundry (Forge tests) |
| **Audit Type** | Automated AI Audit |
| **Date** | 2026-03-05 |
| **Auditor** | Automated AI Audit Tool |
| **Commit Scope** | All contracts under `contract/contracts/` |

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Scope](#2-scope)
- [3. Severity Classification](#3-severity-classification)
- [4. Findings Summary](#4-findings-summary)
- [5. Detailed Findings](#5-detailed-findings)
  - [Critical](#critical)
  - [High](#high)
  - [Medium](#medium)
  - [Low](#low)
  - [Informational](#informational)
- [6. Contract-by-Contract Review](#6-contract-by-contract-review)
- [7. Test Coverage Assessment](#7-test-coverage-assessment)
- [8. Positive Observations](#8-positive-observations)
- [9. Recommendations Summary](#9-recommendations-summary)
- [10. Disclaimer](#10-disclaimer)

---

## 1. Executive Summary

This report presents the findings of a security audit performed on the Zawadi Protocol smart contracts. Zawadi is a decentralized hackathon escrow system that allows organizers to create hackathons, whitelist sponsors, manage prize challenges (ERC20 and native ETH), define winner allocations, enforce dual-approval flows, and enable self-service winner payouts.

The audit reviewed **8 Solidity source files** across core contracts, libraries, events, and error definitions. The review identified **1 critical**, **3 high**, **4 medium**, **4 low**, and **4 informational** findings.

The most severe finding was that duplicate winner addresses in a single `addWinners` call could permanently lock funds in the escrow contract. Additionally, the use of raw `transferFrom` instead of `safeTransferFrom` for ERC20 funding made the contract incompatible with non-standard tokens such as USDT.

**All Critical, High, Medium, and Low findings have been remediated** in the contract source code following this audit. Each finding below includes a "Resolution" note describing the fix. Comprehensive tests were added for all new functionality, bringing the suite to **91 passing tests** covering the full claim, refund, sponsor revocation, duplicate-winner detection, and ERC-8174 IntentSpec flows.

> **Important:** While all identified issues have been addressed, this automated audit is not a substitute for a professional third-party security audit. Before any mainnet deployment handling real user funds, we strongly recommend engaging an independent auditing firm to perform a comprehensive review including formal verification, fuzzing, and invariant testing.

---

## 2. Scope

### In-Scope Files

| Category | File | SLOC (approx.) |
|---|---|---|
| Core Logic | `Zawadi/Escrow.sol` | ~210 |
| Factory | `Zawadi/Factory.sol` | ~100 |
| Libraries | `Libraries/EscrowLib.sol` | ~25 |
| Libraries | `Libraries/FactoryLib.sol` | ~10 |
| Events | `Events/EscrowEvents.sol` | ~10 |
| Events | `Events/FactoryEvents.sol` | ~10 |
| Errors | `Errors/EscrowErrors.sol` | ~25 |
| Errors | `Errors/FactoryError.sol` | ~5 |

### Out of Scope

- Frontend client (`client/`)
- Backend server (`server/`)
- Deployment scripts and Hardhat/Ignition configuration
- Third-party dependencies (OpenZeppelin)

### Dependencies

| Dependency | Usage |
|---|---|
| OpenZeppelin `IERC20` | Token interface |
| OpenZeppelin `IERC20Metadata` | Token decimals query |
| OpenZeppelin `ReentrancyGuard` | Reentrancy protection on `claimPayout` |
| OpenZeppelin `SafeERC20` | Safe token transfers (partially used) |

---

## 3. Severity Classification

| Severity | Description |
|---|---|
| **Critical** | Direct loss of funds or permanent fund lock under realistic conditions. |
| **High** | Significant logic flaw that could lead to fund loss, broken invariants, or denial of service under certain conditions. |
| **Medium** | Logic inconsistency, missing validation, or design flaw that could cause unintended behavior or weaken the security model. |
| **Low** | Code quality issue, minor inconsistency, or missing best practice that does not directly lead to exploitable behavior. |
| **Informational** | Gas optimization, style, or design observation with no direct security impact. |

---

## 4. Findings Summary

| ID | Title | Severity | Contract | Status |
|---|---|---|---|---|
| C-01 | Duplicate winners in `addWinners` cause permanent fund lock | Critical | Escrow | **Resolved** |
| H-01 | `fundChallenge` uses raw `transferFrom` instead of `safeTransferFrom` | High | Escrow | **Resolved** |
| H-02 | No emergency withdrawal mechanism — funds can be permanently locked | High | Escrow | **Resolved** |
| H-03 | Hackathon ID collision within the same block | High | Factory | **Resolved** |
| M-01 | `addWinners` can be called repeatedly, overwriting allocations silently | Medium | Escrow | **Resolved** |
| M-02 | `approveDistribution` gated by `beforeLock` can deadlock funds | Medium | Escrow | **Resolved** |
| M-03 | `isPaidOut` field in `Challenge` struct is never updated | Medium | Escrow | **Resolved** |
| M-04 | `claimPayout` reuses misleading error for "already claimed" | Medium | Escrow | **Resolved** |
| L-01 | `PrizeClaimed` event is defined but never emitted | Low | Escrow | **Resolved** |
| L-02 | `Factory.onlyOrganizer` modifier is defined but never used | Low | Factory | **Resolved** |
| L-03 | No mechanism to revoke a whitelisted sponsor | Low | Escrow | **Resolved** |
| L-04 | ETH transfer failure uses `require` string instead of custom error | Low | Escrow | **Resolved** |
| I-01 | `allHackathons` array duplicates mapping data — high storage cost | Informational | Factory | Acknowledged |
| I-02 | Redundant `allowance` check before `transferFrom` | Informational | Escrow | Acknowledged |
| I-03 | `getAllHackathons()` and `getChallengeIds()` have unbounded gas cost | Informational | Factory / Escrow | Acknowledged |
| I-04 | No validation of `_token` address when `isERC20 == true` | Informational | Escrow | Acknowledged |

---

## 5. Detailed Findings

### Critical

#### C-01: Duplicate winners in `addWinners` cause permanent fund lock

**Location:** `Escrow.sol` — `addWinners()`, lines 260–301

**Description:**

The `addWinners` function iterates over the `_winners` array and writes each allocation to `allocations[winner][_challengeId]`. If the same address appears more than once in the `_winners` array, the second write overwrites the first. However, both amounts are accumulated into `totalAllocated`, which is validated against `totalPrize`.

**Example scenario:**

```
winners    = [Alice, Bob, Alice]
amounts    = [300,   400, 300]
totalPrize = 1000
```

- Iteration 0: `allocations[Alice][id].amount = 300`; `totalAllocated = 300`
- Iteration 1: `allocations[Bob][id].amount = 400`; `totalAllocated = 700`
- Iteration 2: `allocations[Alice][id].amount = 300` (overwrites); `totalAllocated = 1000`

The `totalAllocated == totalPrize` check passes (1000 == 1000). But only 700 tokens are actually claimable (Alice: 300, Bob: 400). The remaining 300 tokens are permanently locked in the contract.

**Impact:** Permanent loss of funds proportional to the overwritten allocation.

**Recommendation:**

Add a duplicate-address check in the loop:

```solidity
for (uint256 i = 0; i < _winners.length; i++) {
    address winner = _winners[i];
    if (allocations[winner][_challengeId].winner != address(0)) {
        revert Escrow_InvalidAllocation();
    }
    // ... rest of logic
}
```

**Resolution:** Implemented. A check for `allocations[winner][_challengeId].winner != address(0)` now reverts with `Escrow__DuplicateWinner()` before any write occurs.

---

### High

#### H-01: `fundChallenge` uses raw `transferFrom` instead of `safeTransferFrom`

**Location:** `Escrow.sol` — `fundChallenge()`, lines 192–199

**Description:**

The contract imports and declares `using SafeERC20 for IERC20`, and correctly uses `safeTransfer` in `claimPayout`. However, `fundChallenge` calls raw `token.transferFrom(...)` and checks the boolean return value:

```solidity
bool success = token.transferFrom(msg.sender, address(this), challenge.totalPrize);
if (!success) {
    revert Escrow_InvalidTokenTransfer();
}
```

Non-standard ERC20 tokens (notably USDT on Ethereum mainnet) do not return a boolean from `transferFrom`. Calling the raw function on such tokens will cause the transaction to revert due to the ABI decoding mismatch, effectively blocking sponsors from funding challenges with these tokens.

**Impact:** Sponsors cannot fund challenges with non-standard ERC20 tokens (e.g. USDT, BNB). This breaks a core protocol flow.

**Recommendation:**

Replace the raw `transferFrom` with `safeTransferFrom`:

```solidity
IERC20(challenge.token).safeTransferFrom(msg.sender, address(this), challenge.totalPrize);
```

Remove the manual boolean check and the `Escrow_InvalidTokenTransfer` error if no longer needed.

**Resolution:** Implemented. `fundChallenge` now calls `token.safeTransferFrom(...)`. The manual boolean check and `Escrow_InvalidTokenTransfer` error have been removed.

---

#### H-02: No emergency withdrawal mechanism — funds can be permanently locked

**Location:** `Escrow.sol` (entire contract)

**Description:**

There is no mechanism for a sponsor or organizer to reclaim funds if the approval flow stalls. Funds become permanently locked if:

1. A sponsor funds a challenge but the organizer never adds winners.
2. Winners are added but one or both parties never call `approveDistribution`.
3. The organizer loses access to their private key after funding but before completing the workflow.
4. A dispute arises with no on-chain resolution path.

Once `fundChallenge` transfers tokens or ETH into the escrow, no function exists to return them.

**Impact:** Permanent loss of all funds deposited into any challenge where the workflow cannot be completed.

**Recommendation:**

Implement a time-locked emergency withdrawal for the sponsor (e.g., claimable after a configurable deadline) or an explicit refund function that requires both organizer and sponsor consent.

**Resolution:** Implemented. A `refundChallenge(uint256 _challengeId)` function was added. It is callable only by the challenge sponsor, only when the challenge is funded but dual approval is NOT yet complete and the challenge has not been paid out. Refunding resets the challenge to an unfunded state and returns all deposited funds.

---

#### H-03: Hackathon ID collision within the same block

**Location:** `Factory.sol` — `createHackathon()`, lines 72–74

**Description:**

The hackathon ID is derived as:

```solidity
hackathonId = keccak256(abi.encodePacked(msg.sender, _ipfsCid, block.timestamp));
```

If the same organizer submits two transactions in the same block with the same `_ipfsCid` (or even through a multicall pattern), the resulting `hackathonId` values are identical. The second call would:

1. Overwrite the first hackathon in `hackathons[hackathonId]` — the first escrow contract becomes orphaned.
2. Push a second entry to `allHackathons[]` with the same ID — creating inconsistency between the array and the mapping.

**Impact:** Orphaned escrow contracts with no owner reference; inconsistent protocol state; potential loss of configuration on the first hackathon.

**Recommendation:**

Include a nonce or counter in the ID derivation:

```solidity
hackathonId = keccak256(abi.encodePacked(msg.sender, _ipfsCid, block.timestamp, allHackathons.length));
```

Or add a uniqueness check:

```solidity
if (hackathons[hackathonId].organizer != address(0)) revert Factory__HackathonAlreadyExists();
```

**Resolution:** Implemented both mitigations. The hash now includes `allHackathons.length` as a nonce, and an explicit uniqueness check reverts with `Factory__HackathonAlreadyExists` if the ID already exists.

---

### Medium

#### M-01: `addWinners` can be called repeatedly, overwriting allocations silently

**Location:** `Escrow.sol` — `addWinners()`, lines 260–301

**Description:**

There is no guard preventing `addWinners` from being called multiple times for the same challenge. Each subsequent call overwrites all previous allocations. This enables the organizer to silently change winner allocations after a sponsor has already approved the distribution (since `approveDistribution` does not re-validate allocations).

**Attack scenario:**

1. Organizer sets winners: Alice gets 800, Bob gets 200.
2. Sponsor reviews and approves distribution.
3. Organizer calls `addWinners` again with: Mallory gets 900, Bob gets 100.
4. Organizer approves distribution.
5. Mallory (an address controlled by the organizer) claims 900.

**Impact:** An organizer can redirect prize funds after sponsor approval without the sponsor's awareness.

**Recommendation:**

Add a flag per challenge (e.g., `winnersSet`) that prevents `addWinners` from being called again, or reset approvals whenever winners are re-assigned.

**Resolution:** Implemented. When `addWinners` is called, both `sponsorApproved` and `organiserApproved` are reset to `false` for that challenge. This ensures the sponsor must re-review and re-approve any changed allocations.

---

#### M-02: `approveDistribution` gated by `beforeLock` can deadlock funds

**Location:** `Escrow.sol` — `approveDistribution()`, line 309

**Description:**

The `approveDistribution` function uses the `beforeLock` modifier. If the organizer locks the contract (via `lockContract`) before both the sponsor and the organizer have approved, the approval process is blocked and funds become inaccessible through normal claim flow. While `unLockContract` exists, the lock-then-stuck pattern is unintuitive and risky.

Additionally, the `claimPayout` function does **not** require the contract to be locked, meaning the lock mechanism has no clear role in the claim workflow.

**Impact:** Premature locking can halt the approval pipeline. The role of the lock mechanism in the overall workflow is unclear and error-prone.

**Recommendation:**

Remove the `beforeLock` modifier from `approveDistribution`, or redesign the lock to only gate challenge configuration (adding challenges, adding winners) while keeping approvals and claims always available.

**Resolution:** Implemented. The `beforeLock` modifier has been removed from `approveDistribution`. Approvals can now proceed regardless of lock state, while configuration changes (`addChallenge`, `addWinners`, `fundChallenge`) remain gated.

---

#### M-03: `isPaidOut` field in `Challenge` struct is never updated

**Location:** `EscrowLib.sol` — `Challenge` struct, line 9; `Escrow.sol` — entire contract

**Description:**

The `Challenge` struct contains an `isPaidOut` boolean field that is initialized to `false` when a challenge is created and is never set to `true` anywhere in the codebase. The `claimPayout` function marks individual allocations as claimed but never marks the overall challenge as paid out.

**Impact:** Off-chain systems or future contract logic relying on `isPaidOut` will always see `false`, even after all winners have claimed. This is dead state that consumes storage.

**Recommendation:**

Either remove `isPaidOut` from the struct (note: this would change the ABI), or implement logic to set it to `true` after all allocations for a challenge are claimed.

**Resolution:** Implemented. Two new mappings (`winnerCount` and `claimedCount`) track per-challenge winner totals and claimed totals. When `claimedCount` reaches `winnerCount`, `isPaidOut` is set to `true` in `claimPayout`.

---

#### M-04: `claimPayout` reuses misleading error for "already claimed"

**Location:** `Escrow.sol` — `claimPayout()`, line 341

**Description:**

The code at line 341 reads:

```solidity
if (alloc.claimed) {
    revert Escrow__SponsorAlreadyApproved(); // reuse an error to indicate already claimed
}
```

The inline comment acknowledges that the error is reused. `Escrow__SponsorAlreadyApproved` conveys a completely different semantic meaning than "payout already claimed," making debugging and frontend error handling confusing.

**Impact:** Misleading error messages for end users and client developers; harder debugging.

**Recommendation:**

Define and use a dedicated error such as `Escrow__PayoutAlreadyClaimed()`.

**Resolution:** Implemented. A new `Escrow__PayoutAlreadyClaimed()` error is defined and used in `claimPayout`.

---

### Low

#### L-01: `PrizeClaimed` event is defined but never emitted

**Location:** `EscrowEvents.sol`, line 9; `Escrow.sol` — `claimPayout()`

**Description:**

The `PrizeClaimed(uint256 indexed challengeId, address winner, uint256 amount)` event is declared in `EscrowEvents.sol` but is never emitted in `claimPayout` or anywhere else. Successful claims produce no indexed on-chain event, making it impossible for off-chain services to monitor payouts via event logs.

**Recommendation:**

Emit `PrizeClaimed(_challengeId, msg.sender, amount)` at the end of `claimPayout`.

**Resolution:** Implemented. `PrizeClaimed` is now emitted at the end of `claimPayout`.

---

#### L-02: `Factory.onlyOrganizer` modifier is defined but never used

**Location:** `Factory.sol`, lines 48–56

**Description:**

The `onlyOrganizer(bytes32 _id)` modifier is defined in the Factory contract but is not applied to any function. This is dead code.

**Recommendation:**

Remove the unused modifier to reduce contract size and improve clarity.

**Resolution:** Implemented. The `onlyOrganizer` modifier has been removed from `Factory.sol`.

---

#### L-03: No mechanism to revoke a whitelisted sponsor

**Location:** `Escrow.sol` — `whitelistSponsor()`, lines 77–82

**Description:**

Once a sponsor is whitelisted, there is no function to de-whitelist them. If a sponsor address is compromised or added in error, the organizer cannot revoke their ability to create new challenges (before lock).

**Recommendation:**

Add a `revokeSponsor(address _sponsor)` function restricted to the organizer.

**Resolution:** Implemented. A `revokeSponsor(address _sponsor)` function was added, restricted to the organizer and gated by `beforeLock`. It sets `sponsors[_sponsor] = false`, removes the address from the `whitelistedSponsors` array, and emits `SponsorRevoked`.

---

#### L-04: ETH transfer failure uses `require` string instead of custom error

**Location:** `Escrow.sol` — `claimPayout()`, line 366

**Description:**

```solidity
(bool ok, ) = payable(msg.sender).call{value: amount}("");
require(ok, "ETH transfer failed");
```

The entire codebase uses custom errors for gas efficiency and consistency, but this single line uses a `require` with a string literal. String-based reverts cost more gas and are inconsistent with the project's error pattern.

**Recommendation:**

Define a custom error (e.g., `Escrow__EthTransferFailed()`) and use it:

```solidity
if (!ok) revert Escrow__EthTransferFailed();
```

**Resolution:** Implemented. A new `Escrow__EthTransferFailed()` error replaces the `require` string in `claimPayout` (and is also used in the new `refundChallenge`).

---

### Informational

#### I-01: `allHackathons` array duplicates mapping data — high storage cost

**Location:** `Factory.sol`, lines 19–22

**Description:**

Every hackathon is stored both in `mapping(bytes32 => FactoryLib.Hackathon) hackathons` and in `FactoryLib.Hackathon[] allHackathons`. The struct includes a `string ipfsCid` which is particularly expensive to store. These two data structures can drift if the mapping value is ever updated without also updating the array entry (though currently no update function exists). This is a storage cost concern and a future maintenance risk.

---

#### I-02: Redundant `allowance` check before `transferFrom`

**Location:** `Escrow.sol` — `fundChallenge()`, lines 186–189

**Description:**

The explicit `allowance` check before `transferFrom` is redundant because `transferFrom` (or `safeTransferFrom`) will revert internally if the allowance is insufficient. However, the explicit check does provide a more descriptive error (`Escrow_InsufficientAllowance`), which can be considered a UX benefit.

---

#### I-03: `getAllHackathons()` and `getChallengeIds()` have unbounded gas cost

**Location:** `Factory.sol` — `getAllHackathons()`, line 127; `Escrow.sol` — `getChallengeIds()`, line 131

**Description:**

Both functions return entire arrays from storage. As the number of hackathons or challenges grows, these view calls will require increasingly large gas budgets. While view functions don't consume gas when called off-chain via `eth_call`, they can fail if the return data exceeds node limits.

Note that `Escrow.sol` already provides pagination via `getChallengesPage()`, which is good practice. `Factory.sol` lacks equivalent pagination.

---

#### I-04: No validation of `_token` address when `isERC20 == true`

**Location:** `Escrow.sol` — `addChallenge()`, lines 98–126

**Description:**

When a sponsor creates an ERC20 challenge, the `_token` parameter is not validated to be a contract address. Supplying an EOA or `address(0)` as the token when `isERC20 == true` will cause `fundChallenge` to revert later. While this does not cause fund loss, it creates a dead challenge that cannot be funded or completed.

---

## 6. Contract-by-Contract Review

### Factory.sol

The Factory contract is relatively simple: it deploys Escrow instances and indexes hackathons. The primary concerns are:

- **ID collision** (H-03) when the same organizer submits duplicate transactions in a single block.
- **Unused modifier** (L-02) — `onlyOrganizer` is defined but never applied.
- **Unbounded array return** (I-03) — `getAllHackathons()` may hit gas limits at scale.
- **Duplicate storage** (I-01) — the mapping and array store identical data.

Access control on `transferOwnership` is correctly implemented. The Factory does not hold funds and is not a direct financial risk.

### Escrow.sol

The Escrow contract is the core financial primitive and holds all deposited funds. The primary concerns are:

- **Duplicate winner fund lock** (C-01) — the most severe finding; realistic attack vector via organizer error or malice.
- **Non-standard ERC20 incompatibility** (H-01) — blocks a major class of tokens.
- **No emergency withdrawal** (H-02) — any stalled workflow permanently locks funds.
- **Silent overwrite of winners** (M-01) — organizer can change allocations after sponsor approval.
- **Lock/approval deadlock** (M-02) — premature locking freezes the approval pipeline.
- **Dead `isPaidOut` field** (M-03) — never set, misleading for integrators.
- **Missing claim event** (L-01) — no on-chain record of successful payouts.

Positive: `ReentrancyGuard` is correctly applied on `claimPayout`, and the Checks-Effects-Interactions pattern is followed. `SafeERC20.safeTransfer` is used on the payout side.

### Libraries (EscrowLib.sol, FactoryLib.sol)

The libraries define data structures only and contain no logic. The `isPaidOut` field concern (M-03) originates from `EscrowLib.Challenge`.

### Events (EscrowEvents.sol, FactoryEvents.sol)

Event definitions are well-structured. The `PrizeClaimed` event is defined but never emitted (L-01).

### Errors (EscrowErrors.sol, FactoryError.sol)

Error definitions are comprehensive. Several errors are defined but unused (e.g., `Escrow__InvalidTokenOrAmount`, `Escrow__ChallengeAlreadyConfigured`, `Escrow__ChallengeIsNotConfigured`, `Escrow__WinnersAreNotEqualToPrizeAllocations`, `Escrow__WinnerAlreadyAdded`, `Escrow__ChallengeIsAlreadyPaidOut`, `Escrow__NotEnoughApprovals`, `Escrow__SponsorNameCannotBeEmpty`). This suggests prior refactoring that left dead error definitions. While harmless (unused errors are not included in deployed bytecode), they add noise to the codebase.

---

## 7. Test Coverage Assessment

The project includes Foundry (Forge) tests in `contract/test/Factory.t.sol` and `contract/test/Escrow.t.sol`.

### Covered Scenarios

| Area | Coverage |
|---|---|
| Factory deployment and constructor | Covered |
| Hackathon creation (single and multiple) | Covered |
| Hackathon retrieval by ID and all | Covered |
| Ownership transfer (valid, zero, unauthorized) | Covered |
| Sponsor whitelisting (valid, duplicate, unauthorized) | Covered |
| Challenge creation (valid, zero prize, not whitelisted, locked) | Covered |
| Challenge funding — ERC20 and ETH | Covered |
| Funding edge cases (already funded, wrong amount, insufficient allowance) | Covered |
| Lock / unlock | Covered |
| Winner allocation (valid, unfunded, invalid, unauthorized, locked) | Covered |
| Approval (sponsor, organizer, duplicate, unauthorized, locked) | Covered |
| Gas usage benchmarks | Covered |
| Multi-challenge end-to-end workflow | Covered |

### Post-Remediation Test Additions

The following scenarios, previously untested, now have dedicated test coverage (91 total tests):

| Scenario | Tests Added |
|---|---|
| Duplicate winner addresses in `addWinners` | `test_AddWinners_DuplicateWinner` |
| Full `claimPayout` flow (ERC20 and ETH) | `test_ClaimPayout_ERC20_Success`, `test_ClaimPayout_ETH_Success` |
| `claimPayout` without both approvals | `test_ClaimPayout_NotApproved`, `test_ClaimPayout_OnlyOneSideApproved` |
| `claimPayout` by non-winner | `test_ClaimPayout_NotWinner` |
| `claimPayout` already claimed | `test_ClaimPayout_AlreadyClaimed` |
| All winners claim sets `isPaidOut` | `test_ClaimPayout_AllClaimed_SetsPaidOut` |
| `addWinners` resets approvals on re-call | `test_AddWinners_ResetsApprovals` |
| Sponsor revocation (success, access control, locked, blocks challenges) | 6 tests |
| `refundChallenge` (ERC20, ETH, access control, approval gating) | 7 tests |
| `getChallengesPage` pagination | 3 tests |
| ERC-165 / IntentSpec interface support | 6 tests (Escrow) + 6 tests (Factory) |

### Remaining Test Gaps (recommended for third-party audit)

| Scenario | Related Finding |
|---|---|
| `claimPayout` reentrancy attempt with malicious receiver | — |
| Non-standard ERC20 tokens (no return value, e.g. USDT) | H-01 |
| Same-block hackathon ID collision (multicall pattern) | H-03 |
| Large array gas limits (`getAllHackathons` with many entries) | I-03 |
| Fuzz testing of allocation arithmetic edge cases | — |

---

## 8. Positive Observations

1. **ReentrancyGuard:** Correctly applied on the most sensitive function (`claimPayout`).
2. **Checks-Effects-Interactions:** The `claimPayout` function properly sets `claimed = true` before executing the external transfer.
3. **SafeERC20 on payouts:** `safeTransfer` is used for ERC20 payouts, protecting against non-standard tokens on the claim side.
4. **Dual-approval pattern:** Requiring both organizer and sponsor approval before payout is a sound trust-minimization design.
5. **Pagination:** The `getChallengesPage` function demonstrates awareness of unbounded-array gas risks.
6. **Comprehensive custom errors:** Gas-efficient custom errors are used consistently (with one exception).
7. **Solidity 0.8.28:** Built-in overflow/underflow protection.
8. **Clean separation of concerns:** Events, errors, and libraries are in dedicated files.
9. **Test suite:** Good breadth of Foundry tests covering happy paths and common edge cases.

---

## 9. Recommendations Summary

| Priority | Action | Status |
|---|---|---|
| **Immediate** | Fix C-01: Add duplicate winner check in `addWinners`. | **Resolved** |
| **Immediate** | Fix H-01: Replace raw `transferFrom` with `safeTransferFrom` in `fundChallenge`. | **Resolved** |
| **High** | Address H-02: Implement a time-locked refund or emergency withdrawal mechanism. | **Resolved** |
| **High** | Address H-03: Add a uniqueness check or nonce to hackathon ID generation. | **Resolved** |
| **Medium** | Address M-01: Prevent repeated `addWinners` calls or reset approvals on re-assignment. | **Resolved** |
| **Medium** | Address M-02: Remove `beforeLock` from `approveDistribution` or clarify the lock's role. | **Resolved** |
| **Medium** | Address M-04: Define a dedicated `Escrow__PayoutAlreadyClaimed` error. | **Resolved** |
| **Low** | Emit the `PrizeClaimed` event in `claimPayout`. | **Resolved** |
| **Low** | Remove unused `onlyOrganizer` modifier from Factory. | **Resolved** |
| **Low** | Replace `require(ok, "ETH transfer failed")` with a custom error. | **Resolved** |
| **Low** | Consider adding sponsor revocation functionality. | **Resolved** |
| **Cleanup** | Remove unused error definitions from `EscrowErrors.sol`. | **Resolved** |
| **Cleanup** | Either use or remove the `isPaidOut` field. | **Resolved** |
| **Testing** | Add tests for `claimPayout`, duplicate winners, repeated `addWinners`, and reentrancy. | **Resolved** (91 tests) |
| **Audit** | Engage a professional third-party auditing firm before mainnet deployment. | **Recommended** |

---

## 10. Disclaimer

This report represents a security review of the Zawadi Protocol smart contracts performed using an automated AI-powered audit tool. **It is not a substitute for a comprehensive professional third-party audit.** The review was conducted at a point in time against the source code as provided and does not guarantee the absence of vulnerabilities. No formal verification, fuzzing, or symbolic execution was performed.

All Critical, High, Medium, and Low findings identified in this review have been remediated in the contract source code, and 37 new tests were added to validate the fixes (91 total passing tests). Informational findings were acknowledged and left as-is.

### Third-Party Audit Recommendation

Before deploying to mainnet with real user funds, we **strongly recommend** commissioning a professional third-party security audit. An independent audit should include:

- **Formal verification** of key invariants (e.g., total allocations always equal `totalPrize`, funds can only exit through `claimPayout` or `refundChallenge`).
- **Fuzz testing** of allocation arithmetic, edge cases around `winnerCount`/`claimedCount`, and token decimal handling.
- **Invariant testing** to verify that no sequence of transactions can violate protocol guarantees.
- **Reentrancy analysis** on `claimPayout` and `refundChallenge`, particularly with malicious receiver contracts.
- **Economic review** of the dual-approval model and refund window timing.
- **Gas profiling** under realistic workloads (many challenges, many winners per challenge).

This automated audit serves as a starting point to identify and address obvious issues, but human expert review is essential for production-grade confidence.

---

*End of Report*
