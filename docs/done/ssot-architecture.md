# SSOT Architecture (Global)

## Purpose

This document defines the global Single Source of Truth (SSOT) model used by the application for timing policies, fallback behavior, and cross-module operational contracts.

Goal: avoid hidden drift between cache TTL, UI staleness rules, request throttling, and fallback timing.

## Core Layers

1. `core/ssot/policies.js` — **authoritative policy catalog**.
2. `core/cache/cache-config.js` — **cache adapter** that consumes SSOT contracts for TTL and cache-facing keys.
3. Runtime consumers (`app-ui-root`, `data-provider-manager`, `request-registry`, `market-metrics`, `app-footer`) — **gates** enforcing contracts at execution points.
4. `core/observability/fallback-monitor.js` — **operational visibility layer** for fallback activations.

## Contracts and Gates

### 1) Top Coins Contract
- Contract path: `CONTRACTS.topCoins`
- Fields:
  - `ttlMs`
  - `uiStaleThresholdMs`
  - `requestRegistryMinIntervalMs`

Gates:
- **Storage gate**: `cache-config` -> TTL keys `top-coins-by-market-cap` and `top-coins-by-volume`.
- **UI gate**: `app-ui-root.getTopCoinsTimingWindowMs()`.
- **Registry gate**: `data-provider-manager.getTopCoins()` and preload checks in `app-ui-root`.

### 2) Market Metrics Contract
- Contract path: `CONTRACTS.marketMetrics.minIntervalMs`

Gate:
- `market-metrics.getMinIntervalMs()` for BTC dominance, OI, FR, LSR request cadence.

### 3) Request Registry Contract
- Contract path: `CONTRACTS.requestRegistry.rateLimitBackoffMultiplierOnError`

Gate:
- `request-registry.isAllowed()` and `getTimeUntilNext()`.
- Effective interval now depends on last attempt (`max(lastSuccess, lastError)`), error streak, and 429 multiplier.

### 4) Footer Timing Contract
- Contract path: `CONTRACTS.appFooter`
- Fields:
  - `marketUpdateDelayMaxMs`
  - `marketUpdateFallbackMs`
  - `cryptoNewsCacheMaxAgeMs`

Gate:
- `app-footer` scheduling and cache-age checks for metrics/news.

## Fallback Observability Model

Fallbacks must be visible to operators/users:

- Emit structured fallback events through `window.fallbackMonitor.notify({ source, phase, details })`.
- Persist in monitor ring buffer (`getRecent`, `getCount`).
- Broadcast via `eventBus` (`fallback:used`).
- Surface to UI through:
  - global `messagesStore` warning messages,
  - footer fallback indicator (`Fallbacks:<count>` with last-event tooltip).

This prevents “silent fallback” behavior.

## Encoding and Text Integrity Policy

To prevent Cyrillic corruption:

- `.editorconfig` enforces UTF-8 and LF.
- `.gitattributes` pins UTF-8 working tree encoding for code/doc assets.
- workspace settings pin `files.encoding = utf8` and disable auto-guessing.

## Evolution Roadmap

### Phase A (done)
- Introduce `core/ssot/policies.js`.
- Wire top-coins TTL/UI/registry timing through SSOT.
- Wire request-registry backoff and market-metrics intervals.

### Phase B (completed)
- Runtime top-coins and footer timing gates now read SSOT first (`window.ssot.*`) with minimal numeric fallback.
- `cache-config` remains a transitional cache adapter for key/TTL mapping only.

### Phase C (recommended)
- Add CI guardrail checks against hardcoded magic timing values in critical modules.
- Add contract integrity startup checks (required contracts present, numeric ranges valid).
- Add contract ownership map (owner module, gate points, test coverage).

Status update:
- Startup contract integrity check is implemented (`ssot.validateContracts()` at init).
- Local guardrail script is implemented: `scripts/check_ssot_guardrails.py`.

## Practical Rule

Any new timing decision or retry/backoff behavior must:

1. Be declared in SSOT contract first.
2. Be consumed via gate function (`window.ssot.*`) in runtime code.
3. Be observable if it changes behavior (especially fallback paths).
