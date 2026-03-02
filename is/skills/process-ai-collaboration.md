---
title: "AI Collaboration Protocol"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# AI Collaboration Protocol

> **Context**: In a project with a high cost of errors, blindly following the user can lead to technical debt accumulation and migration failure.

## Reasoning

- **#for-skepticism-over-pleasing** Migration has high cost of errors. Agreeing with flawed proposals accumulates technical debt. Direct criticism with alternatives prevents silent contract violations.
- **#for-micro-steps** Large changes without verification hide regressions. Fail-fast after each atomic step catches errors before they cascade.
- **#for-skills-before-code** AI agents in new chats have no memory. Knowledge must live in files; `search_skills`/`read_skill` are mandatory before acting in a new domain.
- **#for-active-causality** Future agents will retry rejected paths. Recording "why not X" in skills or `@causality` comments prevents repeated mistakes.
- **#for-no-implicit-commit** User must explicitly request commits. Nagging about uncommitted changes is noise; progress summary and next candidates are actionable.

---

## Skepticism and Objectivity (Primary Directive)
- **DO NOT try to please:** Never agree with a user's (developer's) proposal just out of politeness.
- **Criticize:** If a proposed path violates current contracts (SSOT, Naming, Isolation, Language Policy), state this directly and offer an alternative with reasoning.
- **Weigh old plans:** What was written in `AI/PRO/mmb/docs/plan_*.md` is not dogma. Migration circumstances have changed (e.g., dropping MMB/MBB terms, dropping strict Causality, English language policy). Apply plans by adapting them to the new reality, not blindly copying them.
- **No Git amateurism:** IT IS STRICTLY FORBIDDEN to perform a `git commit` without an explicit and direct command from the user. It is forbidden to nag the user with phrases about how you didn't commit, or to suggest they do it. Instead, at the end of your response, provide a brief summary of overall migration progress (in percentage) and suggest the next candidates for execution.

## Micro-steps (Fail-Fast Approach)
- Execute large tasks through small, verifiable steps.
- After every significant change, run `npm run test` or profile gate scripts (e.g., `npm run secret:check`).
- If something breaks, stop immediately and report the error; do not try to "sweep it under the rug".

## Read Documentation Before Acting
- Before writing code in a new domain, use the `search_skills` or `read_skill` tool to gain context from `is/skills/` or `core/skills/`.
- If the required rule doesn't exist — stop and suggest to the developer that they create it (document it in Markdown).
- **Proactive skill transfer:** When migrating code modules from the donor (`AI/PRO/mmb`), the agent MUST scan the donor in parallel for skills and causalities related to this code. If a skill/causality from the donor is relevant for the new architecture, it must be transferred to the target project and adapted before writing or transferring the code itself.
- **Language Policy:** Ensure all transferred or newly created skills, comments, and variables are translated to **English** in accordance with `process-language-policy.md`.

## Obsolete Code Management
- **Zero-Tolerance for garbage:** During migration, old files and scripts (e.g., old index generators or environment checks) that are duplicated by the new infrastructure layer `is/` must be deleted immediately.
- **Clean working directory:** If a function is replaced by a new one, the old function cannot simply be commented out "just in case". It must be deleted (Git remembers everything).
- **Backlog for non-critical debt:** If renaming a file breaks external integrations (e.g., third-party Python scripts), do not delete it, but create a task in `docs/backlog/` explaining why the file is left for now.

## Long-term Memory (Chat-Agreement Memory)
- **Fixing agreements:** Any architectural, infrastructural, or process agreements reached in dialogue (chat) with the developer must be immediately transferred to the knowledge base (in the appropriate `*.md` file in `is/skills/` or `core/skills/`).
- You cannot rely on another agent in a new chat to "read the history". Knowledge must live in files.
- **Legacy Causality Workflow:** It is forbidden to write comments in code with "guesses" about old business logic. If the reason is unclear, document the question in `docs/drafts/causality-questions.md`. After receiving an answer from the developer — format it as a Skill and add a precise Anchor to the code.
- **Active Causality Recording:** If, during the process of writing new code, an agent explores multiple paths and chooses one for specific reasons (a found bug, API limitation, performance nuance), the agent **MUST** record this "causality" (why it is done this way and not another). Use hashes from `causality-registry.md`: `// @causality #for-X` or `// @skill-anchor skill-id #for-X`. If no hash fits — check the registry carefully to avoid semantic duplicates (reuse and expand existing ones if possible). If truly new, add it to the registry first, then use it. **Reporting Requirement:** If you added or modified any causality hashes during your task, you MUST explicitly mention them in your final response to the user. Goal: so future agents don't "step on the same rake" trying to rewrite the code back.
- **Causality Invalidation:** If you remove or change a hash in one file, the Causality Invariant Gate will check if that hash is still used elsewhere. If the gate fails, read its stderr. It will give you an exact JSON template. You MUST either update the remaining files, or copy-paste that JSON template into `docs/audits/causality-exceptions.jsonl` with an explanation. DO NOT try to write YAML exceptions or guess the format.

## Skills Curation (Before Creating Any Skill)
Before creating a new skill file:
1. **Search first**: Use `search_skills` with synonyms to check existing coverage.
2. **Decision logic**:
   - >60% overlap with existing skill → **Update** the existing file.
   - Overlaps multiple skills → **Merge** into one.
   - Skill file >150 lines → **Decompose** into smaller units.
   - Genuinely unique content → **Create** new file.
3. State **why** you chose Update vs Create in your response.

---

## Agent Command Dictionary

Short commands that predictably switch agent behavior mode.

### `ВЗП` — Planned Execution
Execute the task step-by-step with verification after each atomic change.

**Required behavior:**
1. Write a concrete step-by-step plan **before** any edits.
2. After each atomic change, run verification (`npm run test` / lint / check).
3. If a new pattern emerges, add/update a governing skill before proceeding.
4. Finish only when all plan steps are verified and docs are in sync.

**Hard constraints:** No blind edits. No undocumented migration results. No finishing with stale checklist state.

---

### `КАИ` — Full Code / Architecture / Infrastructure Analysis
Perform a structured analysis across all three layers in fixed order.

**Required analysis order:**
1. **Code:** defects, regressions, test gaps, skill anchor coverage.
2. **Architecture:** ADR consistency, dependency relations integrity, deprecated decisions impact.
3. **Infrastructure:** env/paths SSOT, MCP health, runtime assumptions, health-check status.

**Output contract:** Findings by severity → Open questions / assumptions → Minimal corrective plan with verification steps.

---

### `АИС` — Architecture & Infrastructure Scan
Focused scan of architecture and infrastructure only (subset of КАИ, no deep code review).

**Scope:**
- ADR consistency and skill relations integrity.
- SSOT/path consistency (`paths.js`, `.env.example`).
- MCP / `.cursor/mcp.json` / rules config coherency.

**Output:** Risk list → Drift points → Migration-safe fix recommendations.

---

### `ЕИП` — SSOT Consistency Check
Verify that the Single Source of Truth is intact.

**What to verify:**
1. `.env` contains all required keys per `is/contracts/env/env-rules.js`; no stale extras.
2. `.env.example` is in sync with `.env` (EIP — Every Item Present).
3. `is/contracts/paths/paths.js` is the only path registry used by scripts and MCP.
4. No new hardcoded absolute paths appear in code, docs, or config files.

**Output format:**
- **Status:** OK / drift detected.
- **Drift list:** concrete files and what deviates.
- **Fix plan:** minimal set of changes to restore SSOT.

---

### `ФИН` — Task Finalization
Finalize the task cycle and synchronize all documentation state.

**Mandatory steps:**
1. Mark changed migration plans and skills with updated status.
2. Ensure any modified skills have correct content and pass `npm run skills:check`.
3. Provide a concise closure summary: what was done, what was verified, what remains.
4. Optionally append a **Finalization Discovery Block** (see `ФИНС`) if candidate improvements were identified.

**Hard rule:** `ФИН` is explicit — invoked only when requested. It is NOT automatically triggered at end of every response.

---

### `ФИНС` — Finalization Discovery Blocks
An explicit discovery-accent command within the `ФИН` family. Use when the user wants focused enumeration of candidates by 4 categories:

| Letter | Category | Description |
|---|---|---|
| **Ф** | Features | New functionality candidates worth implementing |
| **И** | Integrations | New external integration candidates |
| **Н** | Settings | Configuration / environment / tooling improvements |
| **С** | Skills | Missing or outdated skill files to create/update |

**Output contract:** Present candidates in practical-value-first order. Keep recommendations migration-safe and consistent with active architecture constraints. Each candidate must include a brief rationale.

`ФИНС` does not replace `ФИН` — it narrows output emphasis to the four-category enumeration.

---

### `ОМК` — Brevity Mode
Respond as briefly as possible without losing technical accuracy.

**Behavior:**
1. Essence only: command, value, path, result.
2. No explanatory phrasing, no decorative text.
3. Preserve precision and all actionable details.

**Combination:** `ОМК` + `ЕИП` → short SSOT/path consistency report only.
