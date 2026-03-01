# Fallback Architecture Policy

## Purpose

This document defines the global fallback policy for the codebase.

Primary objective: keep the system reliable **without** creating opaque behavior where data source and quality become unclear for the user/operator.

## Core Rule (Mandatory)

Any production fallback that can influence user-visible behavior or data origin MUST:

1. emit a structured event through `window.fallbackMonitor.notify(...)`,
2. be visible in the global system message stream (`messagesStore` / footer indicator),
3. include `source`, `phase`, and `details` fields.

If these conditions are not met, the fallback is considered non-compliant.

## Architecture in This Codebase

- Fallback event channel: `core/observability/fallback-monitor.js`
- Global event bus propagation: `eventBus` (`fallback:used`)
- UI visibility:
  - global warnings via `messagesStore`,
  - aggregated counter in footer (`Fallbacks:<count>` + last-event tooltip)

## Policy of Restraint (“Fallback Abstinence”)

Fallbacks are expensive in complexity and trust. Use them only when justified.

### Default stance
- Prefer explicit failure over deep fallback chains.
- Introduce fallback only when there is a clear availability requirement.

### Required justification for new fallback
- Why primary path failure is expected in real operation.
- Why user value of degraded mode is higher than risk of stale/wrong data.
- How observability makes fallback activation transparent.
- Exit strategy: conditions to remove fallback later.

## Fallback Design Principles

1. **Single responsibility**  
   Fallback should solve one degradation scenario, not become a hidden alternate architecture.

2. **Deterministic order**  
   Explicit, documented fallback chain (e.g. API -> infra cache -> local cache), no silent branching.

3. **Bounded behavior**  
   Retry/timeouts/backoff must be bounded and policy-driven (prefer SSOT gates).

4. **Data provenance clarity**  
   User/operator should understand when data is fallback-derived.

5. **No silent downgrade**  
   If fallback is used, emit monitor event and user-visible warning.

6. **Removal-friendly**  
   Fallback code should be isolated to allow future deletion.

## Implementation Contract

When adding fallback code, include:

- `window.fallbackMonitor.notify({ source, phase, details })`
- message or UI indicator path (already provided by monitor integration)
- update of this policy document if a new fallback class is introduced

Recommended naming:

- `source`: `<module>.<method>`
- `phase`: short machine-readable token (e.g. `localStorage-read-fallback`)
- `details`: compact runtime context (`key=...`, `loaded=...`, `error=...`)

## Compliance Automation

Repository guardrails:

- `scripts/check_fallback_observability.py` — verifies fallback-marked files contain monitor emission.
- `scripts/check_ssot_guardrails.py` — controls magic timing constants in gate files.
- `.github/workflows/guardrails.yml` runs both checks (plus UTF-8 enforcement) on push/PR.

## Current Fallback Classes (Observed)

- Top-coins data fallback (infra cache / localStorage)
- Workspace persistence fallback (cacheManager -> localStorage)
- AI key restoration fallback (Cloudflare KV)
- Provider endpoint fallback (Yandex assistant -> foundation)
- Coin set load fallback to cached datasets

All of the above are expected to emit monitor events under this policy.
