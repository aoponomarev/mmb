---
title: "Domain: Portfolio Engine"
reasoning_confidence: 0.85
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "a2b1b94b"
id: sk-c3d639

---

# Domain: Portfolio Engine

> **Context**: Pure domain logic for portfolio allocation, rebalancing, and weight management. Framework and storage independent.
> **Scope**: `core/domain/`

## Reasoning

- **#for-domain-invariants** Portfolio math breaks silently if weights don't sum to 100. Enforcing this as a strict domain invariant prevents invalid state from persisting.
- **#for-compatibility-facade** Direct cutover to pure functions is risky. A facade translates imperative calls to pure domain operations, enabling incremental migration.

---

## Contracts

These invariants must hold after every portfolio operation:

| Invariant | Contract |
|---|---|
| `sum = 100` | Total weight of all assets equals exactly 100% |
| `minWeight = 1` | No asset weight below 1% |
| `no delete in rebalance` | Rebalancing redistributes weight; it never removes assets |

**#for-domain-invariants** Portfolio math breaks silently if weights don't sum to 100. Enforcing this as a domain invariant (not a UI concern) prevents invalid state from ever reaching persistence.

## Core Rules

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

### Compatibility Facade

`core/config/portfolio-config.js` acts as a **bridge** between legacy callers (UI components, event handlers) that use the old Legacy App portfolio API shape and the new pure-function engine in `core/domain/`.

**#for-compatibility-facade** A direct cutover of all callers at once would be too risky. The facade translates calls from the old imperative API to the new pure-function domain model, allowing incremental migration.

### Validation (`core/domain/portfolio-validation.js`)

Validates the draft object shape and invariants before persistence. Returns a structured error list — never throws. Callers decide whether to block save or warn the user.

### Storage Separation

The domain engine has **no knowledge of storage** (localStorage, Cloudflare, PostgreSQL). Persistence is handled by the caller (UI component or service layer) after receiving the validated draft from the engine.

### Portfolio Schema & Storage

**Schema**: `{ id: "YYMMDD-hhmm", name: string, coins: [{ coinId, ticker, portfolioPercent, delegatedBy: { modelId } }], settings: { horizon } }`. **Invariant**: Every coin MUST have `delegatedBy` pointing to a valid Model ID. **Storage**: Local `localStorage` key (e.g. `mbb-portfolios`); Cloud Cloudflare D1 table `portfolios`. File Map: `core/api/cloudflare/portfolios-client.js`.

### Coin Set Management

Auto-generation of coin sets: parse requirements, identify token types (fungible, stablecoins), determine relationship rules. For each token: generate parameters (name, symbol, decimals), create data mappings, set distribution rules. Establish cross-token relationships; document in machine-readable format (`coins.json`). Validation: verify against master registry, economic model, data integrity. File Map: `core/config/coins-config.js`, `coins.json`.

**Structured Process**: (1) Requirement Analysis — parse architectural requirements, identify token types, determine relationship rules (e.g. index weighting); (2) Token Generation — for each token generate unique parameters, create data mappings, set distribution rules; (3) Relationship Establishment — implement cross-token relationships (staking, conversion, pairing), document in `coins.json`; (4) Validation — verify against master registry, economic model, data integrity; test inter-token data flows; check security/liquidity vulnerabilities.

### Coins Metadata Generation

**Context**: Creating `coins.json` registry from CoinGecko. SSOT: `libs/assets/data/coins.json` or equivalent.

**Process**: Fetch (generator pulls coin list) → Filter (top N + watchlist) → Map (symbols to icon URLs) → Save to coins.json.

**Loader**: Runtime reads coins.json to hydrate IconManager. **Constraints**: Generated JSON must match IconManager schema; regeneration periodic (n8n or script).

### Coin Set Merge Consistency

**Context**: "Loaded N coins" toast can diverge from table counter after merge if active IDs updated incorrectly.

**Trigger**: Debugging add/merge flow; counter mismatch (toast ≠ table count); Vue reactivity issues after merge.

**Canonical rule**: After merge — (1) treat `coins[]` as source of truth; (2) rebuild `activeCoinSetIds` from `coins.map(c => c.id)` (set-union); (3) never overwrite active IDs by "last loaded set IDs" only.

**Data loading**: Prefer full coin payload attached to incoming set; fetch by IDs only for truly missing; preserve deterministic order.

**Regression checklist**: After first load — coins == activeCoinSetIds == totalCoinsCount; after second merge — all counters reflect union; no unresolved IDs on happy path.

### File Map

| File | Responsibility |
|---|---|
| `core/domain/portfolio-engine.js` | Pure allocation and rebalance functions |
| `core/domain/portfolio-validation.js` | Draft invariant validation |
| `core/domain/portfolio-adapters.js` | Shape adapters between domain model and external formats (Cloudflare API, localStorage schema) |
| `core/config/portfolio-config.js` | Compatibility facade for legacy callers |
| `core/api/cloudflare/portfolios-client.js` | Portfolio schema DAO (local + Cloud) |
| `core/config/coins-config.js` | Coin set definitions and defaults |
