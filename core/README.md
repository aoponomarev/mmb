---
id: readme-c8e267
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Core Domain & Backend Layer (`core/`)

## Scope
This directory contains the framework-agnostic business logic, data models, and backend services of the Target App.

## Architecture & Constraints
- **Environment Agnostic**: Code in this directory must not depend on specific UI frameworks (like Vue) or specific infrastructure runners, unless explicitly placed in an adapter folder (e.g., `api/market-snapshot-node-server.js`).
- **Fail-Fast**: Domain validations must fail immediately upon contract violation (using Zod schemas).
- **No Hardcoded Paths**: All file system operations must use paths resolved from `is/contracts/paths/paths.js`.

## Subdirectories
- `api/`: Backend services, HTTP handlers, and external data providers (CoinGecko, Binance).
- `cache/`: Data caching logic (TTL-based, deterministic key hashing).
- `config/`: Application-level configuration SSOT (auth, cloudflare, portfolio, modals, UI texts).
- `contracts/`: Zod schemas for internal and external data structures.
- `domain/`: Pure business logic models (portfolio engine, allocation, rebalancing).
- `errors/`: Structured error types and error code registry.
- `events/`: Event bus for cross-component communication.
- `logging/`: Structured logging utilities.
- `observability/`: Frontend observability hooks.
- `skills/`: Backend-specific architectural knowledge (see `core/skills/README.md`).
- `ssot/`: Legacy SSOT definitions being migrated into `is/contracts/`.
- `state/`: Vue reactive state management (UI flags, auth, loading).
- `utils/`: Reusable utility functions.
- `validation/`: Domain-level validation utilities.

## Root Files
- `module-loader.js`: Dynamic module loading mechanism for no-build architecture.
- `modules-config.js`: Module registry defining load order and dependencies.
