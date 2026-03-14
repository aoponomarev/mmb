---
id: sk-a8c3e1
title: "Architecture Change During Plan Execution"
tags: "[#process, #plan, #architecture, #risk, #verification]"
status: active
reasoning_confidence: 0.95
reasoning_audited_at: "2026-03-14"
reasoning_checksum: ""
last_change: "#for-causality-impact-before-change — §1a Causality Hash Pre-Check: conditional reverse lookup before hash change, minimal output, E≥3→rebind"

---

# Architecture Change During Plan Execution

> **Context**: When plan execution reveals the need to change AIS, contracts, path-contracts, DB schema, or gates, a strict protocol applies. Without it, architecture changes cascade into code, causalities, and gates — leaving hidden tech debt and broken invariants.
> **Scope**: Executed in conjunction with id:sk-8f9e0d (process-plan-execution). Applies when amendments to a plan cross into **T3** (architectural) tier.

## Reasoning

- **#for-arch-change-during-plan** Architecture changes mid-plan cascade to code, causalities, skills, and gates. Without a strict protocol (impact analysis → docs → code → full verify), agents leave orphan references, stale contracts, and broken invariants. Full verification before proceeding prevents tech debt accumulation.
- **#for-multifactor-heuristics** Before committing to an inline architecture change, agents must weigh benefit, harm, reversibility, contract alignment, user impact, and existing causalities. When uncertain, prefer Defer over Inline.

## Risk Tiers for Plan Amendments

| Tier | Amendment type | Blast radius | Verification | Authorization |
|------|----------------|--------------|--------------|---------------|
| **T1** | Add step, clarification, anti-pattern | Minimal | Preflight only | Inline freely |
| **T2** | Reorder steps, add guard | Medium | Preflight + dependency check | Inline if backward compatible |
| **T3** | Change AIS, path-contracts, causality-scan-contracts, DB schema, gates | High | Architecture-Change Protocol (this skill) | Inline only after full protocol; else Defer |

**T3 triggers:** Modifying `docs/ais/*.md`, `path-contracts.js`, `causality-scan-contracts.js`, `db.js` schema, `validate-*.js` gates, `id-registry`, `code-file-registry`, `causality-registry` (structural changes).

## Architecture-Change Protocol (T3)

When execution reveals the need for a T3 change, **stop linear plan progress** and run this protocol before continuing.

### 1. Impact Analysis (mandatory)

Document in the plan or `docs/backlog/fix-<plan-slug>.md`:

- **AIS/contracts changed:** Which files (paths).
- **Skills affected:** Skills referencing changed AIS (`related_ais`, `id:ais-xxx`).
- **Code affected:** Files depending on changed contracts (paths, imports, `dependency_graph` when available).
- **Causalities affected:** Hashes in changed contracts; anchors in affected code. For causality-registry hash changes: §1a.
- **Gates affected:** Preflight scripts, `validate-*.js` that consume changed contracts.

### 1a. Causality Hash Pre-Check (#for-causality-impact-before-change)

**Trigger:** Only when modifying or removing an *existing* hash that has anchors or exceptions. New hashes: skip.

**Steps:**
1. Obtain anchor count and exception count for the hash (via `get_causality_files` + `docs/audits/causality-exceptions.jsonl`, or grep if MCP tools unavailable).
2. In Impact Analysis, add one line: `Hash #for-X: A anchors, E exceptions → [rebind|supersede|defer|keep]`.
3. If exceptions ≥ 3, consider rebinding or supersession before proceeding.

### 2. Update Plan

Add a block to the plan: `## Architecture Change: [short description]` listing affected artifacts. Ensures traceability.

### 3. Order of Changes (strict)

1. **Docs first:** AIS, contracts, causality-registry (new/updated hashes).
2. **Skills:** Update `related_ais`, formulations referencing changed architecture.
3. **Code:** Files that depend on changed contracts; update `@causality` / `@skill-anchor` as needed.
4. **Gates:** If preflight or validate scripts changed, ensure they pass.

### 4. Full Verification (gate)

Do **not** proceed to the next plan step until:

- `npm run preflight` passes.
- `npm run skills:check` passes.
- All affected code aligns with updated AIS/contracts.
- No orphan anchors or broken `related_*` references.

### 5. If Verification Fails

- **Option A:** Rollback the architecture change. Record the need in backlog. Continue the plan with original architecture.
- **Option B:** Complete all changes and fix all failures before proceeding. No partial state.

**Rollback plan:** Before making T3 changes, note how to revert (which files, which commands). Use it if verification fails and Option A is chosen.

## Inline vs Defer Criteria

**Inline** (execute protocol in current session):

- Blast radius ≤ 5 files (or otherwise contained).
- Changes are reversible (simple rollback).
- All affected areas can be updated and verified in one pass.
- Preflight and skills:check can be brought to green.

**Defer** (record in backlog, do in a separate plan):

- Blast radius > 5 files or spans multiple domains.
- Changes are hard to roll back.
- Affected surface is uncertain or very large.
- Plan is already complex; adding T3 would overload context.

**On Defer:** Write to `docs/backlog/fix-<plan-slug>.md` (or a dedicated plan):

- What must change in architecture.
- Why it was deferred (which criterion).
- Links to affected AIS, skills, code paths.

## Constraints

| Rule | Formulation |
|------|-------------|
| **One T3 per session** | At most one Architecture-Change Protocol cycle per plan execution. Further T3 needs → Defer to backlog or new plan. |
| **No hidden debt** | Code that depends on changed architecture must be updated or explicitly excluded. No silent drift. |
| **Rollback plan** | For T3 changes, document rollback steps before editing. |
| **Document the choice** | When choosing Inline vs Defer, record the rationale in the plan or backlog. |

## Relation to Other Skills

- id:sk-8f9e0d (process-plan-execution) — invokes this protocol when T3 amendments occur.
- id:sk-0e193a (process-docs-lifecycle) — docs pipeline; AIS and skills structure.
- id:sk-cecbcc (process-ai-collaboration) — #for-multifactor-heuristics for decision-making.
