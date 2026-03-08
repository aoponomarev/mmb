---
id: sk-cecbcc
title: "AI Collaboration Protocol"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-08
reasoning_checksum: 2966c9bc
last_change: ""
related_skills:
  - sk-0e193a
  - sk-3b1519
  - sk-883639
related_ais:
  - ais-8982e7

---

# AI Collaboration Protocol

> **Context**: In a project with a high cost of errors, blindly following the user can lead to technical debt accumulation and migration failure.

## Reasoning

- **#for-skepticism-over-pleasing** Blindly agreeing with flawed user proposals accumulates technical debt; direct criticism with alternatives prevents contract violations.
- **#for-micro-steps** Unverified large changes hide regressions. Execute tasks atomically with fail-fast validation.
- **#for-skills-before-code** AI agents lack persistent memory across chats. You must use `read_skill` to understand the domain before acting.
- **#for-active-causality** To prevent future agents from repeating mistakes, you must record rejected paths and nuances using `@causality` or `docs/audits/causality-exceptions.jsonl`.
- **#for-no-implicit-commit** You must never commit without explicit user instruction. Nagging the user to commit adds noise.
- **#for-memory-to-skills** Memory MCP stores chat agreements; they must be formalized into skills or AIS when they describe rules or constraints. The Memory → Skills protocol ensures knowledge lives in files, not only in ephemeral chat history.

---

## Core Rules
- **DO NOT try to please:** Never agree with a user's (developer's) proposal just out of politeness.
- **Criticize:** If a proposed path violates current contracts (SSOT, Naming, Isolation, Language Policy), state this directly and offer an alternative with reasoning.
- **Weigh old plans:** What was captured in legacy AI migration plans is not dogma. Legacy paths skip in #JS-cMCNbcJ1 (path-contracts.js); adapt guidance to current architecture.
- **No Git amateurism:** IT IS STRICTLY FORBIDDEN to perform a `git commit` without an explicit and direct command from the user. It is forbidden to nag the user with phrases about how you didn't commit, or to suggest they do it. Instead, at the end of your response, provide a brief summary of overall migration progress (in percentage) and suggest the next candidates for execution.

## Contracts

### Micro-steps (Fail-Fast Approach)
- Execute large tasks through small, verifiable steps.
- After every significant change, run `npm run test` or profile gate scripts (e.g., `npm run secret:check`).
- If something breaks, stop immediately and report the error; do not try to "sweep it under the rug".

### Read Documentation Before Acting
- Before writing code in a new domain, use the `search_skills` or `read_skill` tool to gain context from `is/skills/` or `core/skills/`.
- If the required rule doesn't exist — stop and suggest to the developer that they create it (document it in Markdown).
- **Proactive skill transfer:** When migrating code modules from a donor repository, the agent MUST scan the donor in parallel for skills and causalities related to this code. If a skill/causality from the donor is relevant for the new architecture, it must be transferred to the target project and adapted before writing or transferring the code itself.
- **Language Policy:** Ensure all transferred or newly created skills, comments, and variables are translated to **English** in accordance with id:sk-883639 (is/skills/process-language-policy.md).

### Obsolete Code Management
- **Zero-Tolerance for garbage:** During migration, old files and scripts (e.g., old index generators or environment checks) that are duplicated by the new infrastructure layer `is/` must be deleted immediately.
- **Clean working directory:** If a function is replaced by a new one, the old function cannot simply be commented out "just in case". It must be deleted (Git remembers everything).
- **Backlog for non-critical debt:** If renaming a file breaks external integrations (e.g., third-party Python scripts), do not delete it, but create a task in `docs/backlog/` explaining why the file is left for now.

### Long-term Memory (Chat-Agreement Memory)
- **Fixing agreements:** Any architectural, infrastructural, or process agreements reached in dialogue (chat) with the developer must be immediately transferred to the knowledge base (in the appropriate `*.md` file in `is/skills/` or `core/skills/`).
- You cannot rely on another agent in a new chat to "read the history". Knowledge must live in files.

### Memory → Skills/AIS Protocol
When the Memory MCP (`is/memory/memory.jsonl`) contains entries that describe architectural decisions, policies, or process rules:
1. **Trigger:** At task finalization (`ФИН`) or when the user asks to sync memory, scan recent memory entries.
2. **Classification:** If an entry describes a rule, constraint, or "why" that applies beyond the current chat → it is a candidate for formalization.
3. **Action:** Create or update a Skill (or AIS policy) using `create_skill` or manual edit. Add causality hashes from id:sk-3b1519 (is/skills/causality-registry.md). Register new hashes if needed.
4. **Cleanup:** After formalization, the memory entry may remain as historical context; the canonical source is now the skill/AIS file.
5. **Id references:** When adding `related_skills` or `related_ais` to AIS, use short hash ids (`sk-xxxxxx`, `ais-xxxxxx`). Resolve via `is/contracts/docs/id-registry.json` or `docs/index-skills.md` / `docs/index-ais.md`.
- **Legacy Causality Workflow:** It is forbidden to write comments in code with "guesses" about old business logic. If the reason is unclear, document the question in `docs/backlog/` (см. id:sk-0e193a (is/skills/process-docs-lifecycle.md)), and map this question path in id:ais-8982e7 (docs/ais/ais-docs-governance.md)#LIR-009.A1.
- **Active Causality Recording:** If, during the process of writing new code, an agent explores multiple paths and chooses one for specific reasons (a found bug, API limitation, performance nuance), the agent **MUST** record this "causality" (why it is done this way and not another). Use hashes from id:sk-3b1519: `// @causality #for-X` or `// @skill-anchor skill-id #for-X`. If no hash fits — check the registry carefully to avoid semantic duplicates (reuse and expand existing ones if possible). If truly new, add it to the registry first, then use it. **Reporting Requirement:** If you added or modified any causality hashes during your task, you MUST explicitly mention them in your final response to the user. Goal: so future agents don't "step on the same rake" trying to rewrite the code back.
- **Causality Invalidation:** If you remove or change a hash in one file, the Causality Invariant Gate will check if that hash is still used elsewhere. If the gate fails, read its stderr. It will give you an exact JSON template. You MUST either update the remaining files, or copy-paste that JSON template into `docs/audits/causality-exceptions.jsonl` with an explanation. DO NOT try to write YAML exceptions or guess the format.

### Skills Curation (Before Creating Any Skill)
Before creating a new skill file:
1. **Search first**: Use `search_skills` with synonyms to check existing coverage.
2. **Decision logic**:
   - >60% overlap with existing skill → **Update** the existing file.
   - Overlaps multiple skills → **Merge** into one.
   - Skill file >150 lines → **Decompose** into smaller units.
   - Genuinely unique content → **Create** new file.
3. State **why** you chose Update vs Create in your response.

### Agent Command Dictionary

**Full reference:** id:sk-87700e (is/skills/references/commands.md) (read on demand for ВЗП, КАИ, АИС, ЕИП, ФИН, ФИНС, ОМК).

**Summary:** `ВЗП`=Planned Execution | `КАИ`=Full Analysis | `АИС`=Arch Scan | `ЕИП`=SSOT Check | `ФИН`=Finalization | `ФИНС`=Discovery Blocks | `ОМК`=Brevity.

### Agentic Self-Correction Protocol

**Context**: Protocol for agents to identify and fix their own errors or outdated rules.

**The loop**: (1) Detect — agent encounters a rule that contradicts reality or causes failure; (2) Propose — agent uses `propose_skill` with `action=update` to flag discrepancy; (3) Halt — if error is critical, agent stops and asks for clarification.

**Triggers**: Broken links (relative paths leading to 404s); stale configs (rules referencing renamed/deleted files); logic gaps (missing edge cases in documented workflow).

**Hard constraints**: No silent fixes — do NOT edit a Skill file directly to fix logic error without notifying the user; all corrections logged via V2 Dashboard or proposed as new tasks в `docs/backlog/` (см. id:ais-8982e7#LIR-009.A4).

### Bug Resolution Protocol

**Context**: Standardized approach to fixing errors and documenting them.

**Resolution steps**: (1) Reproduce — confirm bug with log or screenshot; (2) Trace — find root cause in code; (3) Fix — apply code change; (4) Log — add entry in `docs/backlog/fixes-tracking.md` (см. id:ais-8982e7#LIR-009.A3); (5) Skill check — should this fix be a new Skill? If yes → `propose_skill`.

**Logging format** (in `docs/backlog/fixes-tracking.md`): Date (YYYY-MM-DD), Issue (short description), Root Cause, Solution (`LIR-009.A3`).

**Hard constraints**: No ghost fixes — every code change that fixes a bug MUST be logged; verify first — run `npm run health-check` before and after the fix.

### Project Secretary Agent (Automation Boundaries)

**Context**: When integrating automation agents (e.g., n8n with Office365/OneDrive), define clear scope and identity.

**Guidelines**: Scope — agent handles only administrative tasks (calendar, mail, file sorting); Identity — agent acts under dedicated "Service Identity" or delegated access; Integration — use appropriate triggers (e.g., "Microsoft Agent 365 Trigger") for reactions to incoming events.

### Session Handoff & Auto-Backup

**Context**: Protocol for ensuring all local changes (settings, secrets, logs) are synced before closing the session.

**Triggers**: Session termination phrases; completion of major task; mention of project-evolution or session reporting.

**Handoff ritual**: (1) Sync ALL settings to cloud (Cursor, Continue, project, secrets); (2) Update project-evolution with single-date aggregation; (3) Generate `docs/backlog/session-report.md` + `docs/backlog/handoff-note.md` (see id:ais-8982e7#LIR-009.A4); (4) Final git sync — list uncommitted changes, draft message, ASK user before commit.

**Hard constraints**: No data loss — never terminate if .env has new keys not synced; verifiable sync — agent must state "Cloud SSOT updated"; no unsolicited commits — always wait for user confirmation.
