# Architecture: Layout & README Governance

> **Context**: Defines the rules for folder structures and mandatory directory documentation (README.md files) in the Target App.

## Implementation Status in Target App

- `Implemented`: Required README.md files for core boundaries (`app/`, `core/`, `is/`, `docs/`, `data/`).
- `Implemented`: Required README.md files for critical subsystems (`is/scripts/`, `is/skills/`, `is/contracts/`).
- `Implemented`: Automated enforcement via `npm run readmes:check` and integrated into `health-check`.

## Architectural Reasoning (Why this way)

- **Local Contracts**: A `README.md` inside a directory acts as a local architectural contract. It explains the boundary, what is allowed, and what is forbidden in that directory, without forcing the developer to search through global architecture docs.
- **Cognitive Load Reduction**: By documenting subfolders within a parent `README.md` (e.g., in `is/scripts/`), we reduce visual noise and make the ownership and purpose of each subfolder immediately clear.
- **Migration & Temporary Layers**: Any folder created as a temporary layer during migration MUST have a `README.md` with a strict `Exit Policy` or `Mandatory Removal` condition. This prevents temporary "crutches" from becoming permanent technical debt.
- **Automated Enforcement**: Documentation that isn't checked becomes stale. The `validate-readmes.js` script enforces the existence of these critical boundary documents.

## Directory Policies

1. **Root Bounds**: The root layer is divided into strictly separated domains:
   - `app/`: Frontend UI (No-build architecture).
   - `core/`: Backend services, API, and framework-agnostic business logic.
   - `is/`: Infrastructure space (scripts, skills, docker, MCP, contracts).
   - `docs/`: Architectural history, plans, and runbooks.
   - `data/`: Local storage, caches, and memory (git-ignored).
2. **Script Layout**: `is/scripts/` root should only contain its `README.md` and top-level entrypoints (`preflight.js`). All other scripts must be categorized into subfolders (`infrastructure/`, `architecture/`, etc.), and documented in `is/scripts/README.md`.
3. **Skill Layout**: `is/skills/` contains the active knowledge base.

## Alternatives Considered

- A single monolithic architecture document — rejected (too large to read, context gets lost).
- No folder-level documentation — rejected (leads to structure degradation as new files are added randomly).
