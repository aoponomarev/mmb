---
id: sk-0e193a
title: "Docs Lifecycle Pipeline"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-11
reasoning_checksum: 3a76958c
last_change: "#for-ais-rollout-gap-marking — AIS задает target state; rollout-gap обязан быть отмечен в AIS и рядом с временной веткой кода"

---

# Documentation Lifecycle

> **Context**: How plans evolve into specifications and skills, and the full structure of `docs/`.
> **Scope**: `docs/plans/`, `docs/done/`, `docs/ais/`, `docs/audits/`, `docs/backlog/`, `docs/cheatsheets/`, `docs/runbooks/`, `is/skills/`

## Reasoning

- **#for-docs-pipeline** A codebase clutters quickly if plans, policies, and specifications are dumped in one folder. A strict pipeline (`docs/plans` -> `docs/done` -> `docs/ais`) ensures agents and developers know exactly where to find active tasks versus established architecture.
- **#for-audits-path-contract** The folder `docs/audits/` and file `causality-exceptions.jsonl` are consumed by `validate-causality-invariant.js`. Renaming or moving them breaks the invariant gate.
- **#for-ais-russian** While code and skills must be in English, macro-level planning (Plans) and architectural narratives (AIS) are written in Russian. This maximizes cognitive bandwidth for the human user when discussing complex strategy.
- **#for-ais-rollout-gap-marking** AIS is a strategic target-state specification, not a line-by-line mirror of the current implementation. Temporary rollout gaps are allowed only when they are stated explicitly in the AIS and mirrored by an inline comment at the exact code branch that still carries the deviation.
- **#for-id-contract-navigation** Cross-references to docs artifacts should prefer `id:` contracts (`id:docidx-3022eb`, `id:docidx-0b048e`, `id:ais-e41384`) over path-centric links.
- **#for-doc-link-format** In documents and comments, references use a mixed mode: the `id:` contract is primary, while `(path)` is optional context for the first important mention. Use `id:<hash> (path)` for the first governance-grade mention in a file, then reduce repeated mentions to bare `id:<hash>`. Do not insert a space after `id:`. Deleted plans: do not reference by deleted id; point to the distillation target and `docs/deletion-log.md`.
- **#for-distillation** A completed plan (`docs/done`) is a historical artifact full of implementation noise (checkboxes, dead ends). It must be *distilled* into clean architectural truths: the "Big Picture" goes to a new/updated `docs/ais/` specification, and the "Strict Rules" go to `is/skills/`.
- **#for-ais-mermaid-diagrams** AIS documents without visual diagrams are harder for humans and agents to grasp. Mermaid diagrams in fenced code blocks render on GitHub, VS Code, and GitLab; they are version-controlled as text and avoid stale image files. See id:ais-e41384 (docs/ais/ais-yandex-cloud.md) for the reference format.
- **#for-distillation-cleanup** Once a plan in `docs/done/` has been successfully distilled into AIS and Skills, the original markdown file MUST be deleted. The `docs/done/` folder itself remains as a staging ground, but keeping distilled files creates redundant, dead knowledge.
- **#not-redundant-folders** Creating new folders when a functionally suitable one exists clutters the structure. Use the existing folders (см. структуру docs/ в репозитории).
- **#for-frontmatter-format** Any markdown file with YAML frontmatter MUST have a blank line before the closing `---`. Without it, CommonMark parses the second `---` as setext underline and `id: ...` (or similar) renders as huge h2 in Cursor preview. Applies everywhere: `docs/`, `is/skills/`, `core/skills/`, `app/skills/`, plans, runbooks, cheatsheets, etc.
- **#for-stable-ids** AIS and Skills use short hash ids (`ais-xxxxxx`, `sk-xxxxxx`) instead of semantic names. Ids survive file renames and decomposition; links use ids as the canonical key, with paths only as optional local context. `related_skills` and `related_ais` reference ids. Index files use `index-` prefix: id:docidx-0b048e (docs/index-skills.md), id:docidx-3022eb (docs/index-ais.md).
- **#for-docs-ids-gate** Preflight runs `validate-docs-ids.js` to ensure all ids in `related_skills` and `related_ais` resolve. Broken links fail the gate. `generate-id-registry.js` produces `is/contracts/docs/id-registry.json` for MCP and tooling.
- **#for-auto-index-ais** id:docidx-3022eb is auto-generated and must never be edited manually. Any AIS add/remove/update must be reflected by running the generator (`npm run ais:index`) or by preflight pipeline that regenerates indexes.
- **#for-live-ais-index-watch** For live editing sessions, run `npm run ais:index:watch` to auto-regenerate id:docidx-3022eb immediately on `docs/ais/*.md` changes.
- **#for-plan-iterative-improvement** Plans are living documents. When an AI agent notices a deficiency in a plan's protocols or algorithms (affecting work quality), it MUST augment the plan directly. Future work benefits. Condition: backward compatibility — improvements must not invalidate results already obtained before the improvement.
- **#for-plan-backlog** Each plan gets a dedicated backlog file in `docs/backlog/` (e.g. `fix-<plan-slug>.md`) for cleanup tails. Issues found during execution (dead links, false positives, deferred fixes) are recorded there. Auto-create when creating a plan.
- **#for-plan-with-draft-ais** For plans with **architectural or infrastructure** content, create a draft AIS in `docs/ais/` together with the plan. The draft is a distillation target; creating it upfront keeps scope clear. Use id:ais-1c4d92 (docs/ais/TEMPLATE.md); link the plan via `related_ais`. Purely tactical/process plans (e.g. dead-link cleanup) do not require a draft AIS.
- **#for-plan-to-many-ais** One plan can and should feed multiple AIS when the plan touches several domains or changes existing specs. Information from the plan goes into every AIS it directly relates to or modifies. Draft AIS file names need not match the plan name (e.g. when a plan decomposes into several specs or under other circumstances).

## Core Rules

0.  **Reference format (#for-doc-link-format)**  
    Use mixed reference mode. The canonical key is always the `id:` or file hash itself. For the first important mention in a file, use `id:<hash> (path)` for markdown artifacts; for later mentions in the same file, reduce to bare `id:<hash>`. For code files, use `#JS-... (basename.js)` when basename is unique; use a full repo-relative path only for ambiguous basenames. No space after `id:`.

1.  **Phase 1: Planning (`docs/plans/`)**
    - All new work starts here as markdown files with `[ ]` checkboxes.
    - Language: Russian.
    - **Draft AIS with arch/infra plans (`#for-plan-with-draft-ais`)**: When creating a plan with architectural or infrastructure scope, create a draft AIS in `docs/ais/` (e.g. from id:ais-1c4d92) and link the plan via `related_ais`. The draft can be minimal; it is refined during execution. Not required for purely tactical plans. **One plan, multiple AIS (`#for-plan-to-many-ais`)**: Plan content can and should update or create several AIS when it relates to or changes multiple specs; draft AIS names need not match the plan name.
    - **Execution protocol (`#for-plan-execution-protocol`)**: When executing any plan, follow id:sk-8f9e0d (process-plan-execution): verify each step (console checks), update AIS if nuances arise, add skills/causalities/contracts as discovered, fix bugs along the way. No step without verification; no deferred documentation.
    - **Iterative improvement (`#for-plan-iterative-improvement`)**: When creating or executing any plan, the AI agent has freedom to modernize the plan (add steps, anti-patterns, clarifications) if it notices a deficiency. Condition: **backward compatibility** — changes must not invalidate results already obtained before the improvement. No human approval required before editing.
    - **Plan backlog (`#for-plan-backlog`)**: Every plan MUST have an associated backlog in `docs/backlog/` (e.g. `fix-<plan-slug>.md`) for cleanup tails. Issues found during execution (dead links, false positives, deferred fixes) are recorded there. Auto-create when creating a new plan.

2.  **Phase 2: Archiving (`docs/done/`)**
    - Once all checkboxes are complete, the plan is moved here exactly as it was.
    - It becomes a staging ground for distillation.

3.  **Phase 3: Distillation (`docs/ais/` and `is/skills/`)**
    - Upon user request, an AI agent performs "distillation" of the completed plan.
    - **Macro-Architecture**: The agent updates or creates an Architecture & Infrastructure Specification (AIS) in `docs/ais/` using the `TEMPLATE.md`. Language: Russian. The AIS intro sentence ("Спецификации (AIS)...") must be an HTML comment `<!-- ... -->` so it is hidden in preview. **Frontmatter**: See `#for-frontmatter-format`.
    - **Target state with explicit rollout gaps (`#for-ais-rollout-gap-marking`)**: AIS may stay ahead of the current Arch-Scan when a migration is still rolling out. This is allowed only if every known gap is stated directly in the AIS and mirrored by an inline comment at the exact temporary deviation branch in code.
    - **AIS Diagrams**: Every AIS MUST include at least one Mermaid diagram in section "Инфраструктура и Потоки данных". Use fenced code block with `mermaid` language. Reference: id:ais-e41384.
    - **No execution log in AIS**: Do NOT keep a "Ход выполнения плана" or similar section. Everything that was done (from the plan checklist) MUST be merged into the relevant sections of the specification with maximum specificity and nuance (e.g. scope → Инфраструктура/Правила гейта; скрипты, preflight, cursor rule → Компоненты и контракты; исключения и нюансы → таблицы правил, Локальные политики).
    - **No standalone "recommended" block**: Do NOT keep a "Рекомендуемые усиления" or "вынесены в план" section that repeats plan items. Completed items are already reflected in the spec; possible future extensions belong in Локальные политики or a single short "Расширение области" note where relevant, not as a duplicate list.
    - **Micro-Rules**: The agent extracts strict invariants and adds them to `is/skills/` (Language: English) and registers new causality hashes.
    - Note: Information from one plan can fan out into multiple AIS files or Skills.

4.  **Phase 4: Cleanup (`#for-distillation-cleanup`)**
    - After the distillation process is fully complete and verified, the agent MUST delete the original plan markdown file from `docs/done/`.
    - Do NOT delete the `docs/done/` folder itself.

5.  **Doc Deletion Protocol** (any doc in `docs/`, not only from `done/`)
    - Applies when: (a) Phase 4 cleanup after distillation, or (b) **user explicitly asks to delete** a plan or doc (e.g. "удали план", "переведи в выполненные и удали"). Same steps in both cases.
    - Before deleting: search for `id:<doc-id>` and path refs to the doc; update all to new targets (AIS, deletion-log; remove or replace `id:` so the deleted doc's id is no longer referenced — otherwise validate-id-contract-links will fail after generate-id-registry drops the id).
    - Delete the file.
    - Append row to `docs/deletion-log.md`: `| \`<path>\` | — | <rationale> |`. Rationale: e.g. "дистиллирован в id:ais-c4e9b2" or "удаление по запросу пользователя". Fill Commit after commit.
    - Run `node is/scripts/architecture/generate-id-registry.js`.
    - Run `npm run ais:index` (or full preflight) to regenerate `docs/index-ais.md`.
    - Run preflight to verify.

## Contracts

- **No Standalone Policies**: Папка policies deprecated. All policies must live either inside the relevant docs/ais/ file (as "Локальные Политики") or as an English contract in is/skills/.
- **Audits Path Invariant**: The path `docs/audits/causality-exceptions.jsonl` is a system contract. Do not rename `docs/audits/` or the file.
- **No Redundant Folders**: Do not create new subfolders under `docs/` when a functionally suitable one already exists. Place documents in the existing docs structure (plans, backlog, runbooks, cheatsheets, ais). Do not invent new top-level folders.
### Documentation Levels (Hierarchy)

**Level 1 (`.cursorrules`)**: Agent protocols, Git workflow, critical routing. **Level 2 (skills & docs)**: Skills = granular "How-To" (см. is/skills/, core/skills/, app/skills/); Docs = high-level specs. **Level 3 (File Headers)**: Purpose of file, links to L2 skills. **Level 4 (Inline Comments)**: Implementation nuances, algorithm explanations, edge cases. **Rule**: No overlap — L4 must not repeat L2 rules; L3 links to L2.

### Documentation Sync (Code ↔ Docs)

**Trigger**: Update docs IMMEDIATELY when changing project structure, architecture, UI/UX principles, agent protocols. **Workflow**: (1) Code change; (2) Doc check — does this violate existing Skills?; (3) Update relevant Skill or create via Backlog; (4) Verify cross-links. **Atomic sync**: Code and docs updates ideally in same PR/commit sequence.

### Full `docs/` folder structure:

| Folder | Purpose | System? | Relation to Skills |
|--------|---------|---------|-------------------|
| docs/plans/ | Active plans with checkboxes. New work starts here. | No | Plans are distilled into skills. |
| docs/done/ | Staging for completed plans before distillation. Empty after cleanup. | No | Source for distillation. |
| docs/ais/ | Architecture & Infrastructure Specifications (Russian). Macro-docs. | No | Policies from AIS may become skills. |
| docs/audits/ | causality-exceptions.jsonl — exceptions for the invariant gate. | **YES** | Path hardcoded in validate-causality-invariant.js. **Never rename or move.** |
| docs/backlog/ | Deferred plans and future drafts; also fix-\<plan-slug\>.md for cleanup tails per plan (#for-plan-backlog). | No | May later become plans. |
| docs/backlog/skills/ | Deferred skills (Docker, n8n, YC, etc.) — not wired until infra exists. | No | May later move to is/core/app skills. |
| docs/cheatsheets/ | Quick reference (e.g., architecture layers). Human-oriented. | No | Overlaps conceptually with skills. |
| docs/runbooks/ | Step-by-step operational procedures (monitoring, rollback). | No | Implements "how" for arch-monitoring, arch-rollback. |
| `index-skills.md` | Auto-generated index of skills. | No | Generated by `npm run skills:index`. |
| `index-ais.md` | Auto-generated index of AIS. | No | Generated by `npm run ais:index`. |
| `deletion-log.md` | Log of removed docs (Doc \| Commit \| Rationale). Validated by `validate-deletion-log.js`. | No | Append row per Doc Deletion Protocol. |

### Auto-generated indexes policy

- Never hand-edit `docs/index-ais.md` or `docs/index-skills.md`.
- Source of truth is `docs/ais/*.md` and skill files; indexes are derived artifacts.
- If index content is stale after doc edits, regenerate indexes instead of patching index files directly.
- Generated indexes may stay clickable through Markdown links; prose around them still follows mixed reference mode.
