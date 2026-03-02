---
title: "Domain: Portfolio Engine"
reasoning_confidence: 0.85
reasoning_audited_at: "2026-03-01"
---

# Domain: Portfolio Engine

> **Scope**: `core/domain/`
> **Context**: Pure domain logic for portfolio allocation, rebalancing, and weight management. Framework and storage independent.

## Reasoning

- **#for-domain-invariants** Portfolio math breaks silently if weights don't sum to 100. Enforcing this as a domain invariant (not a UI concern) prevents invalid state from ever reaching persistence.
- **#for-compatibility-facade** A direct cutover of all callers at once would be too risky. The facade translates calls from the old imperative API to the new pure-function domain model, allowing incremental migration.

---

## Core Invariants (Always Enforced)

These invariants must hold after every portfolio operation:

| Invariant | Contract |
|---|---|
| `sum = 100` | Total weight of all assets equals exactly 100% |
| `minWeight = 1` | No asset weight below 1% |
| `no delete in rebalance` | Rebalancing redistributes weight; it never removes assets |

**#for-domain-invariants** Portfolio math breaks silently if weights don't sum to 100. Enforcing this as a domain invariant (not a UI concern) prevents invalid state from ever reaching persistence.

## Key Functions (`core/domain/portfolio-engine.js`)

All functions are **pure** — they receive a draft object and return a new draft object. No side effects, no global state.

| Function | Purpose |
|---|---|
| `allocateWeights(draft)` | Distribute weights evenly across unlocked assets |
| `normalizeWeights(draft)` | Correct rounding errors to ensure sum = 100 |
| `lockAssetWeight(draft, coinId)` | Pin an asset's weight — excluded from redistribution |
| `unlockAsset(draft, coinId)` | Release lock — asset participates in next rebalance |
| `setRebalanceEnabled(draft, bool)` | Toggle auto-rebalance mode |
| `buildDraftAssets(coins, config)` | Construct initial draft from coin list + config |
| `autoSelectCandidates(pool, constraints)` | Select rebalance candidates based on rank/filters |

**Priority order in rebalance**: locked assets are skipped; unlocked assets receive weight proportional to their priority mode setting.

## Compatibility Facade

`core/config/portfolio-config.js` acts as a **bridge** between legacy callers (UI components, event handlers) that use the old Legacy App portfolio API shape and the new pure-function engine in `core/domain/`.

**#for-compatibility-facade** A direct cutover of all callers at once would be too risky. The facade translates calls from the old imperative API to the new pure-function domain model, allowing incremental migration.

## Validation (`core/domain/portfolio-validation.js`)

Validates the draft object shape and invariants before persistence. Returns a structured error list — never throws. Callers decide whether to block save or warn the user.

## Storage Separation

The domain engine has **no knowledge of storage** (localStorage, Cloudflare, PostgreSQL). Persistence is handled by the caller (UI component or service layer) after receiving the validated draft from the engine.

## File Map

| File | Responsibility |
|---|---|
| `core/domain/portfolio-engine.js` | Pure allocation and rebalance functions |
| `core/domain/portfolio-validation.js` | Draft invariant validation |
| `core/domain/portfolio-adapters.js` | Shape adapters between domain model and external formats (Cloudflare API, localStorage schema) |
| `core/config/portfolio-config.js` | Compatibility facade for legacy callers |
