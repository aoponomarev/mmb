---
title: "Process: Skill Placement & Profiling"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "d0185ad5"
id: sk-d763e7

---

# Process: Skill Placement & Profiling

> **Context**: Defines where each type of skill file must be placed, and what criteria determine its location. This is the decision contract for any agent or developer creating or migrating a skill.

## Reasoning

- **#for-distributed-skill-placement** Placing skills next to their domain (`is/skills/`, `core/skills/`) instead of a single central vault ensures they co-evolve naturally with the code they govern.
- **#for-arch-vs-process** Naming prefixes (`arch-`, `process-`) explicitly signal a skill's intent (why vs how) and improve discoverability.
- **#for-layer-ownership** Distributing skills by folder boundary prevents a massive "everything-in-one-folder" sprawl.
- **#for-60-overlap-update** Updating an existing skill instead of creating a duplicate prevents conflicting guidance for AI agents.

## Core Rules

**A skill lives where the code it governs lives.**

Skills are not documentation stored centrally — they are contracts co-located with their domain. A skill about cache invalidation belongs next to the cache code. A skill about git boundaries belongs in infrastructure.

---

### Formatting Rules (Skill Structure)

To reduce hallucinations and ensure AI agents can reliably parse skills, all `.md` files in `skills/` directories must strictly follow the AST-like structure enforced by `validate-skills.js`.

1. **Frontmatter**: Must include `title`, `reasoning_confidence`, `reasoning_audited_at`, and `reasoning_checksum`.
2. **H1 and Context**: The file must start with `# [Title]` immediately followed by a blockquote starting with `> **Context**:`.
3. **Allowed H2 Sections**: Only the following exact H2 headers are permitted. Do not invent new H2 names, use H3 (`###`) instead:
   - `## Reasoning` (Must be the first H2 if present)
   - `## Core Rules`
   - `## Contracts`
   - `## Implementation Status` (or `## Implementation Status in Target App`)
   - `## Migration Strategy`
   - `## Examples`
4. **Scaffolding Tool**: Always use `npm run skill:create "Skill Title" --type=[arch|process|core|app]` to generate the correct boilerplate.

## Contracts

Use this table when deciding where to place a new or migrated skill:

| Question | Answer | Target location |
|---|---|---|
| Does it govern **how the infrastructure works** (scripts, CI, health, secrets, paths, MCP)? | Yes | `is/skills/arch-*.md` |
| Does it govern **how agents/developers should behave** (process, commands, language, committing)? | Yes | `is/skills/process-*.md` |
| Does it govern **a specific `core/` subdomain** (cache, state, domain logic, config, async)? | Yes | `core/skills/<subdomain>.md` |
| Does it govern **the UI layer** (Vue components, reactivity, CORS, UX rules)? | Yes | `app/skills/<topic>.md` |
| Does it span **multiple layers** with no clear owner? | Yes | `is/skills/arch-*.md` (architecture level) |

---

### Location Contract by Folder

### `is/skills/` — Infrastructure & Process Knowledge

**Mandatory prefix rules:**
- `arch-*.md` — Architectural Decision Records: *why* a system is structured the way it is. Cross-cutting constraints, rejected alternatives, causality.
- `process-*.md` — Agent and developer process rules: *how* to work with the project.

**Belongs here:**
- Decisions about folder layout, naming conventions, SSOT
- Control plane design, health-check contracts, rollback triggers
- Security and secrets governance
- CI/CD and testing strategy
- Agent behavior rules (commit policy, language policy, command dictionary)
- Migration process and prioritization
- Skills and MCP system architecture
- Windows/environment-specific tooling rules

**Does NOT belong here:**
- Business logic patterns (→ `core/skills/`)
- UI component rules (→ `app/skills/`)
- Domain-specific invariants (→ the domain's own `skills/` folder)

---

### `core/skills/` — Backend & Shared Domain Knowledge

**Naming convention:** `<subdomain>.md` (no mandatory prefix)

**Belongs here:**
- How a specific `core/` subdomain works and what invariants it enforces
- API layer contracts (providers, services, transport, composition root)
- Async patterns, timeout contracts, error classification
- Cache layer architecture (storage tiers, TTL, key versioning, migrations)
- Domain logic invariants (portfolio engine, math models)
- Config layer SSOT (what each config file owns, Zod validation rules)
- State and event patterns (Vue reactive state, event-bus, module load order)

**Does NOT belong here:**
- UI rendering rules (→ `app/skills/`)
- Infrastructure governance (→ `is/skills/`)

**Subdomain map (current):**

| Subdomain | Skill file |
|---|---|
| API layer & data providers | `api-layer.md` |
| Node.js async & timeout | `async-contracts.md` |
| Browser cache (hot/warm/cold) | `cache-layer.md` |
| Config SSOT | `config-contracts.md` |
| Portfolio domain engine | `domain-portfolio.md` |
| Reactive state & events | `state-events.md` |

When a new significant subdomain is added to `core/`, a skill must be created here before or alongside the code.

---

### `app/skills/` — Frontend & UI Knowledge

**Naming convention:** `<topic>.md` (no mandatory prefix)

**Belongs here:**
- Vue No-Build architecture rules (module loading, template structure)
- Reactive Reliability Gate (RRG) contracts
- UX design principles (color semantics, modal titles, toast feedback)
- file:// protocol and CORS guard
- Hardcode ban enforcement
- UI config Zod validation

**Does NOT belong here:**
- Backend data fetching logic (→ `core/skills/`)
- Infrastructure rules (→ `is/skills/`)

---

### Decision Checklist

Before creating or placing a skill file, answer these in order:

1. **Does a skill covering >60% of this content already exist?**
   - Yes → update the existing skill, do not create a new file.

2. **Which layer owns the code this skill governs?**
   - `is/` → `is/skills/`
   - `core/` → `core/skills/`
   - `app/` → `app/skills/`
   - Cross-cutting → `is/skills/arch-*.md`

3. **Is it a decision (why) or a process (how)?**
   - Decision → `arch-*.md`
   - Process / behavior → `process-*.md`
   - Domain contract → no prefix, descriptive name

4. **After placement, run `npm run skills:check`** — the file must pass validation before the session ends.

---

### Anti-Patterns

| Anti-pattern | Correct action |
|---|---|
| Placing a `core/` domain skill in `is/skills/` because "skills go in is/" | Move to `core/skills/` — co-location with domain code |
| Creating `arch-cache.md` in `is/skills/` to document the browser cache | Belongs in `core/skills/cache-layer.md` |
| Placing a Windows PowerShell rule in `core/skills/` | Belongs in `is/skills/process-windows-shell.md` |
| One monolithic `core/skills/everything.md` | Split by subdomain — one file per coherent domain area |
| Skills folder in `is/` growing beyond 30 files without a review | Trigger a profiling review using this skill |
