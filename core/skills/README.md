---
id: sk-635743

---

# Domain Skills (`core/skills/`)

## Scope
Skills in this directory document the architectural contracts and patterns of the **backend and shared business logic layer** (`core/`).

These skills are domain-specific: they govern how `core/` modules are structured, what invariants they enforce, and how they interact with each other.

## Contents

- `api-layer` — Data providers, market services, layer separation (Service→Transport→HTTP→Server), composition root
- `async-contracts` — Node.js async safety: AbortController, timeout contracts, error classification, rate limiting
- `cache-layer` — Three-tier browser cache (hot/warm/cold), key versioning, TTL, schema migrations
- `config-contracts` — `core/config/` SSOT governance, Zod validation of UI configs, module registry
- `domain-portfolio` — Pure portfolio engine: allocation, rebalance invariants, compatibility facade
- `state-events` — Vue reactive state, event-bus patterns, no-build module load order

## Constraints
- **English Only**: All files in this directory must be authored strictly in English.
- **Validation**: Every file must pass `npm run skills:check`.
- **Co-evolution**: When a significant new subdomain is added to `core/`, a corresponding skill should be created here.
