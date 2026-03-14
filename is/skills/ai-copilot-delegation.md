---
id: sk-7e4d2b
title: "AI Copilot Delegation Rules"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-14
reasoning_checksum: 541d46a0
last_change: ""
related_skills:
  - sk-3225b2
  - sk-cecbcc
  - sk-3b1519
related_ais:
  - ais-e9a5c2

---

# AI Copilot Delegation Rules

> **Context**: SSOT for when the Cursor agent may autonomously delegate tasks to GitHub Copilot via `propose_copilot_task` or `run_orchestrated_task(agent_hint: "copilot")`.
> **Scope**: id:ais-e9a5c2 (docs/ais/ais-agent-orchestration-contour.md) §8.1

## Reasoning

- **#for-token-saving** L3/Discovery tasks consume many tokens when run locally; Copilot (free tier) produces plans; execution stays local.
- **#for-right-tool** Point edits (L1/L2) are faster locally; broad analysis benefits from Copilot's repo-wide context.
- **#for-no-surprise-delegation** User must not be surprised by async handoff; agent must apply strict criteria before delegating.
- **#for-benefit-overhead-kpi** L1/L2 local vs L3 Copilot: B = repo-wide context (L3), O = switching overhead; delegate when B/O ≥ 1.5.

## Core Rules

### Task Taxonomy

| Level | Scope | Example | Delegate? |
|-------|-------|---------|-----------|
| **L1** | 1–3 files, single concern | Add header, fix typo, rename var | No |
| **L2** | 4–10 files, bounded refactor | Extract module, update imports | Ask user or execute locally |
| **L3** | >5 files, discovery, planning | Migration plan, layer audit, causality backlog, rollout strategy | Yes (if all conditions met) |

### Delegation Checklist (All Must Pass)

Before calling `propose_copilot_task` or `run_orchestrated_task(agent_hint: "copilot")`:

1. **L3/Discovery** — Task requires broad repo analysis, prioritization, or step-by-step plan before code.
2. **Scope > 5 files** — Affects many artifacts; local agent would burn tokens on context.
3. **No explicit "do it yourself"** — User did not say "execute locally", "don't delegate", "do it here".
4. **Uncertainty present** — Order of actions is non-obvious; plan-before-code needed (migration, rollout, audit).
5. **GitHub API available** — `propose_copilot_task` can succeed.

### Do NOT Delegate When

- Task is point refactor (1–3 files), header addition, typo fix.
- User explicitly asked to execute locally.
- Task is urgent hotfix (Copilot is async).
- GitHub API unavailable or `propose_copilot_task` would fail.

## Contracts

- **Read this skill before delegating:** Agent must have read id:sk-7e4d2b before autonomous delegation.
- **Causality in body:** Use hashes from id:sk-3b1519 when formulating Issue body.
- **No commits from Copilot:** id:sk-d7a2cc — Copilot proposes; human merges locally.

### Issue Format (for propose_copilot_task)

**Title:** Clear, actionable; include domain (e.g. "Migration: header rollout for core/", "Audit: causality backlog in app/").

**Body template:**
```markdown
**Goal**
[One sentence]

**Context**
- Related: id:sk-xxxxxx / #for-xxx (from id:sk-3b1519)
- Scope: [layers/files affected]

**Expected Output**
- Step-by-step plan (no code yet)
- Prioritized list of files/areas
```

**Labels:** `L3-Discovery` (required).
