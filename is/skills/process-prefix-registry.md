---
id: sk-4b05be
title: "Process: Prefix Registry Health"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-05
reasoning_checksum: d850dc6c
last_change: ""

---

# Process: Prefix Registry Health

> **Context**: Maintains the health and consistency of the global prefix registry (`is/contracts/prefixes.js`). Defines when and how to add, deprecate, or audit prefixes so AI agents do not create naming chaos.
> **Scope**: `is/contracts/prefixes.js`, `validate-skills.js`, `create-skill.js`, `process-skill-governance.md`

## Reasoning

- **#for-prefix-ssot** A single registry prevents ad-hoc prefixes and naming drift. All consumers (validate-skills, create-skill, agents) read from one source.
- **#for-prefix-gate** The validate-skills gate fails preflight on unregistered prefixes, forcing registration before use.
- **#for-prefix-categories** Grouping prefixes by category (Layer, Vendor, Tech, etc.) improves discoverability and prevents semantic overlap.
- **#for-prefix-semantics** SKILL_SEMANTICS documents intent for each prefix so agents choose correctly.
- **#not-ad-hoc** Inventing prefixes without registration creates gate failures and inconsistent naming.

## Core Rules

1. **Before creating a skill with a new prefix** — Check `is/contracts/prefixes.js` for an existing prefix that fits. If none exists, register the new prefix first.
2. **When registering a new prefix** — Add to the appropriate category array, `SKILL_SEMANTICS`, `SKILL_TYPE_TO_PREFIX`, and ensure it is in `SKILL_ALLOWED`.
3. **Prefix format** — 2–4 lowercase letters + hyphen (e.g. `yc-`, `mcp-`, `runbook-`). No numbers. Kebab-case for multi-part (e.g. `runbook-` not `runBook-`).
4. **Avoid collisions** — Check that the new prefix does not conflict with existing ones (e.g. `is-` vs `infra-`). Prefer vendor codes for external services (`yc-`, `cf-`, `gh-`).
5. **Glossary alignment** — New prefixes MUST correspond to academically correct terminology from `docs/glossary.md`. If the glossary does not yet contain the relevant term, add it to the glossary first, then register the prefix.

## Contracts

### Registration Checklist

| Step | Action |
|------|--------|
| 1 | Add to the correct category array (SKILL_PRIMARY, SKILL_VENDOR, SKILL_TECH, etc.) |
| 2 | Add to SKILL_SEMANTICS with a one-line description |
| 3 | Add to SKILL_TYPE_TO_PREFIX (key = type for create-skill) |
| 4 | Ensure SKILL_ALLOWED includes the new prefix (it auto-includes all category arrays) |
| 5 | Add to create-skill.js usage message |
| 6 | Run `npm run skills:check` — gate must pass |
| 7 | Update `process-skill-governance.md` table if adding a new category |

### Deprecation

- Do not remove prefixes that have existing skills. Mark as legacy and add to SKILL_LEGACY.
- When migrating skills to a new prefix, update the skill file first, then remove the old prefix from the registry after all usages are migrated.

### Review Cadence

- When adding 3+ new prefixes in a session — review the full registry for consistency.
- When a new vendor/tech is adopted — add its prefix proactively (e.g. `n8n-` before first n8n skill).

## Implementation Status in Target App

- `Implemented`: `is/contracts/prefixes.js` — SSOT with categories, semantics, type map.
- `Implemented`: `validate-skills.js` — gate for is/skills/ prefix validation.
- `Implemented`: `create-skill.js` — uses SKILL_TYPE_TO_PREFIX.
- `Implemented`: Agent obligation in `.cursorrules` and `process-skill-governance.md`.
