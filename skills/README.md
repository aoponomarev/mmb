# MMB Skills

MMB skills repository is a unified knowledge base for AI agents (Cursor, Continue).

## Structure

```
skills/
├── process/          ← processes, protocols, lifecycle
├── architecture/     ← MMB architectural decisions
├── integrations/     ← MCP, Continue, Docker, external APIs
├── troubleshooting/  ← diagnostics and fixes
├── security/         ← secrets, env, access boundaries
├── libs/             ← dependency governance
├── drafts/           ← drafts (not indexed)
├── index.md          ← master index
└── MIGRATION.md      ← migration register from MBB (temporary)
```

## Skill Format

```yaml
---
id: skill-id
title: "Category: Skill Title"
scope: process
tags: [#tag1, #tag2]
version: 1.0.0
priority: high
updated_at: YYYY-MM-DD
---
```

### Extension for architectural ADR skills (`skills/architecture/arch-*.md`)

```yaml
status: active                 # active | draft | deprecated
confidence: high               # high | medium | low
review_after: YYYY-MM-DD       # stale-review date
decision_scope: architecture   # architecture | process | integration
decision_id: ADR-ARCH-001      # unique decision ID
supersedes: ADR-ARCH-000       # replaced decision (or none)
```

Required sections in ADR skills:
- `## Implementation Status in MMB` (Implemented / Pending / Doubtful)
- `## Architectural Reasoning (Why this way)`
- `## Alternatives Considered`

## Link to Code

Each project JS file should include skill references:

```javascript
/**
 * Skill: process/process-settings-sync
 * Skill: security/skill-secrets-hygiene
 */
```

MCP tool `find_skills_for_file` discovers these references automatically.
`audit_skill_coverage` reports files without skill references.

## Migration from MBB

Skills are migrated from MBB on demand. Status is tracked in `MIGRATION.md`.
Details: `../docs/План_Skills_MCP.md`.

## Linkage and Anti-Stale Protocol

- Use explicit `relations` by ID, without file paths.
- For each architectural skill, add at least 2 relations:
  - to a governing process skill;
  - to a security/integration skill (if dependent).
- Every `arch-*` skill must include `decision_id`.
- If a decision replaces an old one, set `supersedes` to the previous `decision_id`.
- In every ADR skill, set `review_after` and update `updated_at` on each review.
- If a decision is no longer valid, set `status: deprecated` and link a replacement skill in `relations`.
- Linkage contract and evolution rules: `meta/skills-linking-governance.md`.
- Automatic graph validation: `npm run skills:graph:check`.
