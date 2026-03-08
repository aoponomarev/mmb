---
id: readme-e31ad4
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Infrastructure Contracts (`is/contracts/`)

## Scope
This directory contains the Single Source of Truth (SSOT) definitions and validation schemas for fundamental project boundaries.

## Subdirectories
- `docs/`: ID registry, code-file registry, resolve-id.
- `env/`: Zod schemas defining the required environment variables. Ensures fail-fast behavior if secrets are missing.
- `naming/`: Kebab-case enforcement and legacy terminology bans (Name Gate) for module/file names.
- `paths/`: The `paths.js` file, which is the absolute SSOT for all file system locations used across the project.

## Root Contracts (files)
- `prefixes.js`: **SSOT for all naming prefixes** (skills: a-, ai-, ais-, is- + legacy arch-/process-; modules: app-, sys-, core-, etc.). Gate in `validate-skills.js`. Used by `create-skill.js`, `naming-rules.js`, `process-skill-governance.md`.
- `path-contracts.js`: **SSOT for path validation config** — EXCLUDE_SOURCE_REL, SKIP_LINK_PATTERNS, SEARCH_DIRS, resolvePath. Used by `validate-skills.js` and `validate-dead-links.js`. Single place to change exclusions and resolve logic.

## Constraints
- Code anywhere in the project must import from these contracts rather than hardcoding values.
- Failures in contract validation block the `preflight` script, preventing the application or tests from running.
