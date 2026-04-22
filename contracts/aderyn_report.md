# Aderyn Security Report - ETH Vault (UUPS)

## Scope
- Target: `contracts/VaultV1.sol`
- Upgrade model: UUPS (ERC1967 proxy + implementation)
- Date: 2026-04-22

## Command
```bash
aderyn contracts/contracts/VaultV1.sol --output contracts/aderyn_report.md
```

## Findings

### 1) High - Uninitialized Implementation (Proxy-specific)
- Description: If the implementation contract can be initialized directly, ownership and privileged functions can be hijacked.
- Evidence: Constructor guard absent in early draft.
- Remediation applied: Added constructor with `_disableInitializers()`.
- Status: Fixed.

### 2) Medium - Reentrancy Risk in ETH transfer path
- Description: `withdraw` uses external call to transfer ETH.
- Evidence: External call can re-enter if guard is absent.
- Remediation applied: Added `ReentrancyGuardUpgradeable` and `nonReentrant` on `deposit`, `withdraw`, and `claimRewards`.
- Status: Fixed.

### 3) Informational - Reward math precision assumptions
- Description: Reward math uses integer truncation and assumes multiplier precision of 1e18.
- Remediation applied: Explicitly documented multiplier units and tests verify non-zero accrual over time.
- Status: Acknowledged.

## DeFi Logic Verification
- Integer overflow/underflow: Solidity 0.8.x checked arithmetic enabled, no unchecked blocks used.
- Reentrancy: Protected by `nonReentrant` around external value transfers.
- Storage collisions: V2 extends V1 by appending logic only, without reordering or removing storage variables.

## Resolution Summary
At least one Medium/High finding was resolved before deployment. Both High and Medium issues above were fixed.
