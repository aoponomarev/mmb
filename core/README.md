# Core Domain & Backend Layer (`core/`)

## Scope
This directory contains the framework-agnostic business logic, data models, and backend services of the Target App.

## Architecture & Constraints
- **Environment Agnostic**: Code in this directory must not depend on specific UI frameworks (like Vue) or specific infrastructure runners, unless explicitly placed in an adapter folder (e.g., `api/market-snapshot-node-server.js`).
- **Fail-Fast**: Domain validations must fail immediately upon contract violation (using Zod schemas).
- **No Hardcoded Paths**: All file system operations must use paths resolved from `is/contracts/paths/paths.js`.

## Subdirectories
- `api/`: Backend services, HTTP handlers, and external data providers (CoinGecko, Binance).
- `cache/`: Data caching logic.
- `contracts/`: Zod schemas for internal and external data structures.
- `domain/`: Pure business logic models.
- `skills/`: Backend-specific architectural knowledge.
- `utils/`: Reusable utility functions.
