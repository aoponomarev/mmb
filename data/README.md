---
id: readme-5c42c7
status: active
last_updated: "2026-03-04"
---

# Local Data & Cache (`data/`)

## Scope
This directory acts as the local storage volume for the application. It contains SQLite databases, JSON caches, and MCP memory logs.

## Constraints
- **Git Ignore**: The contents of this directory (except this README) are strictly ignored by Git. No production data or local caches should ever be committed.
- **Ephemeral Nature**: The application must be able to recover and rebuild caches if this directory is completely wiped (relying on `is/secrets/archives/` for critical recovery if needed).

## Typical Contents (Ignored)
- `cache/`: SQLite database files for market data.

> **Note**: MCP memory is stored at `is/memory/memory.jsonl`, not in `data/`.
