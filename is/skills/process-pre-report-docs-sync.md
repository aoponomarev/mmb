---
id: sk-9e4f2a
title: "Process: Pre-Report Documentation Sync (Mandatory)"
tags:
  - "#process"
  - "#documentation"
  - "#causality"
  - "#skills"
  - "#agent-behavior"
reasoning_confidence: 0.98
reasoning_audited_at: "2026-03-09"
reasoning_checksum: edb1ce2f
last_change: ""

---

# Process: Pre-Report Documentation Sync

> **Context**: Before forming the task report, the AI agent MUST complete all documentation and causality updates, and create skills if explicit automation fragments or specific approaches were discovered. Report without live documentation violates the contract.

## Reasoning

- **#for-pre-report-docs-sync** Before forming the task report, the AI agent MUST update docs, causalities, and create skills if needed. Report without live documentation violates the contract. Ensures docs and causalities stay live-actual.
- **#for-memory-to-skills** Chat agreements and discovered patterns must be formalized into skills or AIS when they describe rules or constraints. Knowledge lives in files, not only in ephemeral chat history.
- **#for-plan-execution-protocol** Add artifacts as discovered — skills, causalities, contracts. Do not defer to "later".

## Core Rules

1. **Mandatory checkpoint** — Before writing the task completion report (summary, "готово", "выполнено", итоги), the agent MUST run the Pre-Report Sync checklist.
2. **Docs & AIS** — Update `docs/ais/`, `docs/plans/`, `docs/backlog/` with all changes made during the task. If architecture or infrastructure was touched, update or create the relevant AIS.
3. **Causalities** — Add new causality hashes to `is/skills/causality-registry.md` for any rationale discovered. Update `@causality` in code if new hashes were introduced.
4. **Skills** — If during execution the agent identified explicit fragments for skill-automation or found specific approaches worth codifying, create the skill NOW (before the report). Use `npm run skills:create` or follow id:sk-d763e7 (process-skill-governance).
5. **Contracts** — If new gates, exclusions, or config were introduced, update the relevant contract (`path-contracts.js`, `encoding-contract.js`, etc.).
6. **No report before sync** — Forming the report without completing the checklist is a contract violation. The report is the last step.

## Contracts

- id:sk-8f9e0d (process-plan-execution) — verification and artifact creation during plan execution.
- id:sk-0e193a (process-docs-lifecycle) — docs pipeline, distillation, AIS structure.
- id:sk-d763e7 (process-skill-governance) — skill placement and format.
