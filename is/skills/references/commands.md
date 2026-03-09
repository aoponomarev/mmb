---
id: sk-87700e
status: active
reasoning_audited_at: 2026-03-09
reasoning_checksum: d41d8cd9
last_change: ""
last_updated: 2026-03-04

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Agent Command Dictionary

Short commands that predictably switch agent behavior mode.

## `ВЗП` — Planned Execution
Execute the task step-by-step with verification after each atomic change.

**Required behavior:**
1. Write a concrete step-by-step plan **before** any edits.
2. After each atomic change, run verification (`npm run test` / lint / check).
3. If a new pattern emerges, add/update a governing skill before proceeding.
4. Finish only when all plan steps are verified and docs are in sync.

**Hard constraints:** No blind edits. No undocumented migration results. No finishing with stale checklist state.

---

## `КАИ` — Full Code / Architecture / Infrastructure Analysis
Perform a structured analysis across all three layers in fixed order.

**Required analysis order:**
1. **Code:** defects, regressions, test gaps, skill anchor coverage.
2. **Architecture:** ADR consistency, dependency relations integrity, deprecated decisions impact.
3. **Infrastructure:** env/paths SSOT, MCP health, runtime assumptions, health-check status.

**Output contract:** Findings by severity → Open questions / assumptions → Minimal corrective plan with verification steps.

---

## `АИС` — Architecture & Infrastructure Scan
Focused scan of architecture and infrastructure only (subset of КАИ, no deep code review).

**Scope:**
- ADR consistency and skill relations integrity.
- SSOT/path consistency (`paths.js`, `.env.example`).
- MCP / `.cursor/mcp.json` / rules config coherency.

**Output:** Risk list → Drift points → Migration-safe fix recommendations.

---

## `ЕИП` — SSOT Consistency Check
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

## `ФИН` — Task Finalization
Finalize the task cycle and synchronize all documentation state.

**Mandatory steps:**
1. Mark changed migration plans and skills with updated status.
2. Ensure any modified skills have correct content and pass `npm run skills:check`.
3. Provide a concise closure summary: what was done, what was verified, what remains.
4. Optionally append a **Finalization Discovery Block** (see `ФИНС`) if candidate improvements were identified.

**Hard rule:** `ФИН` is explicit — invoked only when requested. It is NOT automatically triggered at end of every response.

---

## `ФИНС` — Finalization Discovery Blocks
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

## `ОМК` — Brevity Mode
Respond as briefly as possible without losing technical accuracy.

**Behavior:**
1. Essence only: command, value, path, result.
2. No explanatory phrasing, no decorative text.
3. Preserve precision and all actionable details.

**Combination:** `ОМК` + `ЕИП` → short SSOT/path consistency report only.

---

## Slash Commands (Continue / Cursor)

Shortcut protocols into executable IDE commands.

| Command | Protocol | Purpose |
|---------|----------|---------|
| `/vzp` | ВЗП | Planned Execution (step-by-step with verification) |
| `/fin` | ФИН | Task Finalization (closure & discovery) |
| edit (slash command) | — | Standard file modifications |

**Usage**: Combine with context providers (e.g. `/vzp @file`). Every command that modifies the system must end with a verification summary. **Future**: Custom slash commands mapped to n8n workflows via control-plane for multi-step processes (e.g. "Create New Skill", "Sync All Sources").
