---
title: "Architectural Foundation (Naming, Paths, SSOT, MCP)"
tags: ["#architecture", "#ssot", "#naming", "#mcp"]
dependencies: []
updated_at: "2026-03-01T00:00:00.000Z"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "55766084"
id: sk-483943

---

# Architectural Foundation (Naming, Paths, SSOT)

> **Context**: Basic rules for building the application. This is the first and most important skill.
> **Scope**: Global (app, core, is, shared, styles, scripts, mm)

## Reasoning

- **#for-anti-calque** We reject old Russian abbreviations (mbb, mmb, EIP) to lower cognitive load and improve AI search accuracy. Standard IT terms are used instead.
- **#for-ssot-paths** `paths.js` centralizes absolute paths, preventing CWD-dependent breakage in scripts.
- **#for-imports-relative** Module code strictly uses relative imports so we don't break bundlers or IDE static analysis.
- **#for-file-protocol** The UI must run locally via `file://`. We proxy API requests through Cloudflare Workers to bypass CORS without a local Node backend.
- **#for-node-test** We use native `node:test` to avoid heavy external frameworks.
- **#for-skill-anchors** We use skill anchors directly referencing textual reasoning rather than a separate causality ID database.
- **#not-central-docs** Monolithic docs have low discoverability; distributed skills work better for MCP.
- **#not-hardcoded-paths** Hardcoded relative paths in scripts fail randomly depending on execution context.
- **#not-bundler-ui** Requiring a bundler for the UI breaks our `file://` constraint.

---

## Core Rules

It is forbidden to use the abbreviations `mbb` and `mmb` in code, paths, and file names.
They are only allowed in the context of integration with cloud services (`cloudflare`, `yandex`), if dictated by infrastructure that has not yet been renamed in the cloud.
Application layers:
- `app/` — client interface, user business logic (Vue). Root component, domain-specific components.
- `core/` — application core, framework and platform independent. API, config, domain logic.
- `is/` (Infrastructure / Information System) — scripts, gates, secrets, MCP servers.
- `shared/` — reusable components, styles, utils shared across app (hash-generator, pluralize, class-manager, etc.).
- `styles/` — CSS files (wrappers, layout, custom). Load order matters; see `index.html`.
- `scripts/` — project-level utilities (e.g. `scripts/backups/`). Distinct from `is/scripts/` (infrastructure automation).
- `mm/` — math models (domain-specific calculators). Legacy structure.

### Naming Contracts (Name Gate)
All file and folder names MUST be in `kebab-case` format.
Verification is done via Zod schemas in `is/contracts/naming/naming-rules.js`.
(System files and folders starting with a dot, e.g., `.github`, are allowed).
**Module Prefixes:** To explicitly distinguish layers, modules should use prefixes where applicable: `app-*`, `sys-*`, `is-*`, `core-*`, `cmp-*`, `index-*` (for doc index files, e.g. `index-skills.md`, `index-ais.md`).

### 2. Paths SSOT
The single source of truth for paths is located in `is/contracts/paths/paths.js`.
It is forbidden to hardcode absolute or relative paths in infrastructure scripts. All paths must be taken from the `PATHS` object. 
This object automatically validates paths via Naming Contracts upon startup.

**Path Policy:**
- **For `import` / `require` (Module code):** STRICTLY relative paths (`../`, `./`). This preserves IDE static analysis and doesn't break bundlers.
- **For file operations (fs.readFile, automation scripts, backups):** STRICTLY absolute paths via `PATHS`. The file system is unforgiving with relative paths.

### 3. Environment and Secrets SSOT (Secret Resilience)
The contract for environment variables is described in `is/contracts/env/env-rules.js`.
The `.env` file cannot be committed (only `.env.example` goes in Git).
Keys and passwords are encrypted with AES-256 using `SYS_SECRET_ARCHIVE_KEY` (length >= 32 chars) and stored in `is/secrets/archives/` using scripts:
- `npm run secret:backup`
- `npm run secret:restore`
- `npm run secret:check`

### 4. Skills, MCP and Causality (Knowledge Base)
This file itself is part of the knowledge base located in `is/skills/` and `core/skills/`.
All skills MUST be authored in **English** as per `process-language-policy.md`.
Access to the knowledge base is via a local `skills` server (via MCP). Cursor/Continue agents must use MCP tools (`search_skills`, `read_skill`) to comply with these rules.
Architectural memory is maintained through the Memory MCP server (`is/memory/memory.jsonl`).

**Hybrid Skill Anchoring:**
- **File-level (File Header):** To declare the contract of the entire module. Format: `/** @skill is/skills/arch-foundation */`
- **Inline-level (Fragment):** Only for non-trivial, non-obvious decisions inside logic. Format: `// @skill-anchor arch-foundation: intentionally avoiding paths.js for imports`

### 5. Hosting Constraints (File protocol & GitHub Pages)
The application is initially designed as **Local-First**, but MUST support multiple execution environments without code changes (Zero-Config Portability):
1. **Local File Protocol (`file:///`)**: The application opens by double-clicking `index.html`. In this mode, all API requests subject to CORS (e.g., CoinGecko) MUST be proxied through our Cloudflare Worker (`cloudflareConfig.getApiProxyEndpoint`).
2. **GitHub Pages (`https://aoponomarev.github.io/...`)**: The application can be published as a static site. 
   - **Constraint**: There can be NO local Node.js server (Express/Fastify) in the frontend runtime, because GitHub Pages serves only static files (HTML/JS/CSS).
   - Any backend modules (`core/api/providers/`, Node.js services) can be used only:
     a) Inside CI/CD pipelines (e.g., cron jobs, generators).
     b) As cloud workers (Cloudflare/Yandex).
     c) As local developer utilities (preflight, backups).
   - It is forbidden to tie the functionality of the UI (`index.html`) to a locally running Node.js server. The UI goes either directly to external APIs, or through our cloud Serverless functions.

### 6. Testing Strategy
We use the built-in `node:test` (introduced in Node.js v18+) for all tests, to avoid heavy dependencies like Jest or Vitest.
- All test files must have the `.test.js` suffix (e.g.: `core/api/market-snapshot-http.test.js`).
- Running tests is done via `npm run test` (which calls `node --test` under the hood).
- For assertions, the built-in `node:assert/strict` module is used.

### 7. Security Boundaries

**Core principle:** Secrets stay in the local runtime boundary and never enter tracked files.

- `.env` is always gitignored. Only `.env.example` (with placeholders) is committed.
- Real secrets are backed up as AES-256 encrypted archives in `is/secrets/archives/` (gitignored).
- Preflight validates `.env` contract before every test or deployment run.
- AI agents must NOT read, log, or output actual secret values — only verify key presence and format.
- See `process-secrets-hygiene.md` for the full incident-response protocol.

**Rejected alternatives:**
- Single mega security doc in `docs/` — low machine discoverability.
- Ad-hoc comments in code only — cannot enforce global policy.

### 8. Control Plane (Protection and State Checks)
The Control Plane is a set of infrastructure scripts that guarantee the safe and reliable operation of the application before deployment, testing, or launch.
- **health-check:** Integral check of all contours (Knowledge, Contracts, Runtime) via `npm run health-check`.
- **single-writer guard:** Protection against race conditions when working with external cloud resources. Started via `npm run validate:single-writer`. The `DATA_PLANE_ACTIVE_APP` variable ensures that only one environment (TARGET, LEGACY, etc.) can write data to the cloud, while others work in Read-Only mode.

### 9. Git Submodule (When Submodules Exist)

**Drift control**: Submodule pointer MUST stay in sync with upstream. Check via `git submodule status`; `+` = local changes, `-` = uninitialized. Sync: `git submodule update --remote --merge`. **Recovery**: If detached/dirty — `git submodule foreach --recursive git reset --hard` then `git submodule update --init --recursive`. **Commit order**: Push submodule changes BEFORE parent repo pointer update. Use `git clone --recursive` for new environments.

### 10. Git Commit Protocol

**Workflow**: (1) `git status` — check staging; (2) Separate infra/config from logic/features; (3) Message: concise imperative ("Add user auth", not "Added..."); (4) `git add` → `git commit -m "..."`; (5) Verify with `git status`. **Constraints**: Commit ONLY when explicitly asked ("commit", "save"); during session reporting or project-evolution updates, list changes and ask permission before committing; atomic — no mixing massive refactors with tiny fixes; no destructive commands (`reset --hard`, `push -f`) without confirmation. Source: `.cursorrules`.

### 11. Git Commit Template

If `commit.template` points to `.gitmessage`, the file must exist and stay in sync with active protocol. Verify: `git config --get commit.template`; ensure `.gitmessage` exists; content: concise imperative subject, optional Why block. Never force metadata that increases solo workflow friction without clear ROI.

### 12. SSOT Cross-Links

**One Home**: A rule exists in ONE place. Do not copy — link or reference. Every new skill MUST be listed in the relevant index (`docs/index-skills.md`). Use `related_skills` in frontmatter for cross-references.

### 13. Git Foundation Reliability (Solo Baseline)

**Goal**: Keep Git workflow stable for solo development without unnecessary team overhead. SSOT: `git status`, `.gitmodules`, local hooks scripts.

- Prefer one active branch for runtime work unless a risky experiment is isolated.
- Always inspect `git status --short` before and after each iteration.
- Use staged-only checks to reduce noise and speed up cycles.
- Commit messages follow `.gitmessage` in lightweight mode (`Why` required, `FINS` optional).

**Reliability gates**: (1) Submodule drift — validate `skills-core` pointer before commit/push; (2) Secrets — scan staged diff for tokens/keys before commit; (3) Targeted runtime — if Docker files changed run `docker compose config`; if control-plane files changed run `node control-plane/scripts/self-test.js`.

**Stash hygiene**: Use stash only for short-lived context switching; add meaningful message; keep compact catalog; drop stale entries after successful integration.

**Minimum command set**: `git status --short`, `git submodule status`, `git stash list`, `powershell -ExecutionPolicy Bypass -File .\scripts\git\preflight-solo.ps1`.

### 14. Infrastructure Maintenance

**Context**: Routine checks, updates, and recovery for Docker-based infrastructure. SSOT: `INFRASTRUCTURE_CONFIG.yaml`.

**Migration protocol (Home ↔ Office)**: Sync paths in `INFRASTRUCTURE_CONFIG.yaml` profiles; copy `.env` from secure storage; `docker volume create n8n_data`; run `node scripts/health-check.js`.

**Routine maintenance**: Daily — check `health-check.js`, all Critical services MUST be `HEALTHY`; review `logs/skills-events.log`; `docker compose pull` for latest images.

**Recovery**: `node scripts/infra-manager.js recover`; manual `docker restart continue-cli`; rebuild `docker compose build --no-cache continue-cli && docker compose up -d`.

**Hard constraints**: No secrets in Git; `.env` gitignored, use `env-subst.js` for runtime injection; sanitize inputs (basename only); always run `health-check.js` before and after changes.

### 15. Node Foundation Reliability

**Goal**: Stable Node foundation for services and scripts. SSOT: `control-plane/package.json`, root `package.json`, `docker/continue-cli/Dockerfile`.

- Node LTS baseline consistent across host and container.
- Service packages with strict requirements declare `engines.node`.
- Native dependency changes must pass ABI compatibility checks.
- Async external calls require timeout and abort support.
- Critical Node services must have self-test entrypoints.
- Runtime errors use stable, machine-readable categories.

**Integration gates**: MCP service changed → `node control-plane/scripts/self-test.js`; compose/docker changed → `docker compose --profile core config`; env/governance changed → `npm run env:check`.

### 16. Components SSOT (Extraction Rule)

If a UI element (label, icon, logic) repeats in **2 or more** places, it MUST be extracted to SSOT.

**Extraction targets**: Titles/Icons → `core/config/modals-config.js`; API Endpoints → `core/config/app-config.js`; Cache Rules → `core/cache/cache-config.js`; UI Text → `core/config/tooltips-config.js`.

**Decision matrix**: Repeated HTML → `shared/component`; Repeated Options → `core/config`; Repeated Logic → `shared/utility`.
