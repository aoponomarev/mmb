---
id: readme-b4bf98
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Infrastructure Space (`is/`)

## Scope
The `is/` (Infrastructure Space) directory contains all configuration, tooling, orchestration, and knowledge assets that surround and manage the application, but are not the application itself.

## Architecture & Constraints
- **Separation of Concerns**: Infrastructure must never leak into `core/` or `app/`. The application should be able to run even if the infrastructure deployment method changes.
- **SSOT (Single Source of Truth)**: Centralized definitions for paths, naming, and environments live here.
- **Preflight Enforcement**: All contracts defined here are actively enforced by #JS-NrBeANnz (is/scripts/preflight.js) before the application can start.

## Subdirectories
- `cloudflare/`: Edge computing scripts and CORS proxies (Cloudflare Workers).
- `contracts/`: SSOT schemas for paths, naming rules, and environment variables.
- `deployments/`: Versioned deployment snapshots per target (`<target>/YYYY-MM-DD/`). See arch-infrastructure-snapshots.
- `docker/`: Docker configuration (reserved for future integration).
- `google/`: Google Cloud service configurations (reserved for future integration).
- `logs/`: Runtime logs directory (gitignored contents).
- `mcp/`: Model Context Protocol servers for AI agents.
- `memory/`: MCP memory JSONL files for long-term agent context.
- `n8n/`: n8n orchestration workflows (reserved for future integration).
- `scripts/`: Automation, diagnostics, and deployment tools (see `is/scripts/README.md`).
- `secrets/`: Encrypted local secret archives and resilience scripts.
- `skills/`: The MCP knowledge base and architectural ADRs (see `is/skills/README.md`).
- `yandex/`: Yandex Cloud function definitions and deployment scripts.

## Legacy Root Files
- `IS.html`, `V2_logic.js`, `V2_standard.css`: Pre-migration artifacts retained for reference. Not part of the active architecture.
