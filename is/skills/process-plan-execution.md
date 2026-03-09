---
id: sk-8f9e0d
title: "Plan Execution Protocol"
tags: "[#process, #plan, #execution, #verification]"
status: active
reasoning_confidence: 0.95
reasoning_audited_at: 2026-03-09
reasoning_checksum: cdc7091c
last_change: "#for-plan-execution-protocol — новый скилл"

---

# Plan Execution Protocol

> **Context**: Mandatory protocol for AI agents when executing any plan from `docs/plans/`. Ensures verification, documentation sync, and zero tech-debt accumulation.

## Reasoning

- **#for-plan-execution-protocol** Without a strict step-by-step protocol, agents skip verification, leave stale docs, and accumulate tech debt. Each plan execution must follow the same checklist: verify → update AIS → fix bugs → add artifacts as discovered.

## Core Rules

1. **Verify each step** — After every atomic change, run relevant checks (console: `npm run <check>`, preflight, lints). Do not proceed to the next step until verification passes.
2. **Update AIS after each step** — If nuances arise during implementation, update the related AIS immediately. Do not defer documentation updates to the end.
3. **Detail AIS maximally** — Merge implementation specifics into the spec: component paths, gate order, exclusion rules, edge cases.
4. **Add artifacts as discovered** — If execution reveals need for skills, causalities, contracts, or gates: create them immediately.
5. **Fix bugs along the way** — Any bug discovered during execution must be fixed before moving on. The path behind must be clean of tech debt.
6. **Plan backlog** — Per id:sk-0e193a (#for-plan-backlog): record deferred fixes in `docs/backlog/fix-<plan-slug>.md`.

## Contracts

### Verification Commands (Reference)

| Check | Command |
|-------|---------|
| Skills | `npm run skills:check` |
| SSOT | `npm run ssot:check` |
| Preflight | `npm run preflight` |
| File headers | `npm run file-headers:check` |
| id-registry | `node is/scripts/architecture/generate-id-registry.js` |

### Relation to ВЗП

id:sk-87700e (commands) defines ВЗП — Planned Execution. This skill operationalizes ВЗП for plan execution: the same principles (plan before edits, verify after each step, finish when docs in sync) applied to `docs/plans/*.md` workflows.
