# Infrastructure Space (`is/`)

## Scope
The `is/` (Infrastructure Space) directory contains all configuration, tooling, orchestration, and knowledge assets that surround and manage the application, but are not the application itself.

## Architecture & Constraints
- **Separation of Concerns**: Infrastructure must never leak into `core/` or `app/`. The application should be able to run even if the infrastructure deployment method changes.
- **SSOT (Single Source of Truth)**: Centralized definitions for paths, naming, and environments live here.
- **Preflight Enforcement**: All contracts defined here are actively enforced by `preflight.js` before the application can start.

## Subdirectories
- `cloudflare/`: Edge computing scripts and CORS proxies.
- `contracts/`: SSOT schemas for paths, naming rules, and environment variables.
- `mcp/`: Model Context Protocol servers for AI agents.
- `scripts/`: Automation, diagnostics, and deployment tools.
- `secrets/`: Encrypted local secret archives and resilience scripts.
- `skills/`: The MCP knowledge base and architectural ADRs.
- `yandex/`: Cloud function definitions (currently in backlog).
