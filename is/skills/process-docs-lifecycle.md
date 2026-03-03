---
title: "Docs Lifecycle Pipeline"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "8b7bd353"
id: sk-0e193a

---

# Documentation Lifecycle

> **Context**: How plans evolve into specifications and skills, and the full structure of `docs/`.
> **Scope**: `docs/plans/`, `docs/done/`, `docs/ais/`, `docs/audits/`, `docs/backlog/`, `docs/cheatsheets/`, `docs/runbooks/`, `is/skills/`

## Reasoning

- **#for-docs-pipeline** A codebase clutters quickly if plans, policies, and specifications are dumped in one folder. A strict pipeline (`plans` -> `done` -> `ais`) ensures agents and developers know exactly where to find active tasks versus established architecture.
- **#for-audits-path-contract** The folder `docs/audits/` and file `causality-exceptions.jsonl` are consumed by `validate-causality-invariant.js`. Renaming or moving them breaks the invariant gate.
- **#for-ais-russian** While code and skills must be in English, macro-level planning (Plans) and architectural narratives (AIS) are written in Russian. This maximizes cognitive bandwidth for the human user when discussing complex strategy.
- **#for-distillation** A completed plan (`docs/done`) is a historical artifact full of implementation noise (checkboxes, dead ends). It must be *distilled* into clean architectural truths: the "Big Picture" goes to a new/updated `docs/ais/` specification, and the "Strict Rules" go to `is/skills/`.
- **#for-ais-mermaid-diagrams** AIS documents without visual diagrams are harder for humans and agents to grasp. Mermaid diagrams in fenced code blocks render on GitHub, VS Code, and GitLab; they are version-controlled as text and avoid stale image files. See `docs/ais/ais-yandex-cloud.md` for the reference format.
- **#for-distillation-cleanup** Once a plan in `docs/done/` has been successfully distilled into AIS and Skills, the original markdown file MUST be deleted. The `docs/done/` folder itself remains as a staging ground, but keeping distilled files creates redundant, dead knowledge.
- **#not-redundant-folders** Creating new folders when a functionally suitable one exists (e.g., `docs/misc/`, `docs/temp/`, `docs/archive/`) clutters the structure. Use the existing folders.
- **#for-frontmatter-format** Any markdown file with YAML frontmatter MUST have a blank line before the closing `---`. Without it, CommonMark parses the second `---` as setext underline and `id: ...` (or similar) renders as huge h2 in Cursor preview. Applies everywhere: `docs/`, `is/skills/`, `core/skills/`, `app/skills/`, plans, runbooks, cheatsheets, etc.
- **#for-stable-ids** AIS and Skills use short hash ids (`ais-xxxxxx`, `sk-xxxxxx`) instead of semantic names. Ids survive file renames and decomposition; links use ids, not paths. `related_skills` and `related_ais` reference ids. Index files use `index-` prefix: `docs/index-skills.md`, `docs/index-ais.md`.
- **#for-docs-ids-gate** Preflight runs `validate-docs-ids.js` to ensure all ids in `related_skills` and `related_ais` resolve. Broken links fail the gate. `generate-id-registry.js` produces `is/contracts/docs/id-registry.json` for MCP and tooling.

## Core Rules

1.  **Phase 1: Planning (`docs/plans/`)**
    - All new work starts here as markdown files with `[ ]` checkboxes.
    - Language: Russian.

2.  **Phase 2: Archiving (`docs/done/`)**
    - Once all checkboxes are complete, the plan is moved here exactly as it was.
    - It becomes a staging ground for distillation.

3.  **Phase 3: Distillation (`docs/ais/` and `is/skills/`)**
    - Upon user request, an AI agent performs "distillation" of the completed plan.
    - **Macro-Architecture**: The agent updates or creates an Architecture & Infrastructure Specification (AIS) in `docs/ais/` using the `TEMPLATE.md`. Language: Russian. The AIS intro sentence ("Спецификации (AIS)...") must be an HTML comment `<!-- ... -->` so it is hidden in preview. **Frontmatter**: See `#for-frontmatter-format`.
    - **AIS Diagrams**: Every AIS MUST include at least one Mermaid diagram in section "Инфраструктура и Потоки данных". Use fenced code block with `mermaid` language. Reference: `docs/ais/ais-yandex-cloud.md`.
    - **Micro-Rules**: The agent extracts strict invariants and adds them to `is/skills/` (Language: English) and registers new causality hashes.
    - Note: Information from one plan can fan out into multiple AIS files or Skills.

4.  **Phase 4: Cleanup (`#for-distillation-cleanup`)**
    - After the distillation process is fully complete and verified, the agent MUST delete the original plan markdown file from `docs/done/`.
    - Do NOT delete the `docs/done/` folder itself.

## Contracts

- **No Standalone Policies**: The `docs/policies/` folder is deprecated. All policies must live either inside the relevant `docs/ais/` file (as "Локальные Политики") or as an English contract in `is/skills/`.
- **Audits Path Invariant**: The path `docs/audits/causality-exceptions.jsonl` is a system contract. Do not rename `docs/audits/` or the file.
- **No Redundant Folders**: Do not create new subfolders under `docs/` when a functionally suitable one already exists. Place documents in `plans/`, `backlog/`, `runbooks/`, `cheatsheets/`, or `ais/` as appropriate. Do not invent `misc/`, `temp/`, `archive/`, or similar.
- **Full `docs/` folder structure:**

| Folder | Purpose | System? | Relation to Skills |
|--------|---------|---------|-------------------|
| `plans/` | Active plans with `[ ]` checkboxes. New work starts here. | No | Plans are distilled into skills. |
| `done/` | Staging for completed plans before distillation. Empty after cleanup. | No | Source for distillation. |
| `ais/` | Architecture & Infrastructure Specifications (Russian). Macro-docs. | No | Policies from AIS may become skills. |
| `audits/` | `causality-exceptions.jsonl` — exceptions for the invariant gate. | **YES** | Path hardcoded in `validate-causality-invariant.js`. **Never rename or move.** |
| `backlog/` | Deferred plans and future drafts. Not for distillation. | No | May later become plans. |
| `cheatsheets/` | Quick reference (e.g., architecture layers). Human-oriented. | No | Overlaps conceptually with skills. |
| `runbooks/` | Step-by-step operational procedures (monitoring, rollback). | No | Implements "how" for `arch-monitoring`, `arch-rollback`. |
| `index-skills.md` | Auto-generated index of skills. | No | Generated by `npm run skills:index`. |
| `index-ais.md` | Auto-generated index of AIS. | No | Generated by `npm run ais:index`. |
