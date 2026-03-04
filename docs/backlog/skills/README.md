---
id: bskill-809e7c
status: active
last_updated: "2026-03-04"
---

# Deferred Skills (Отложенные скиллы)

Skills that are useful but do not fit the current infrastructure state. Not tied to `is/`, `core/`, or `app/`.

## When to use

- Donor skill describes Docker, n8n, Yandex Cloud, Cloudflare Workers, etc.
- Target App (mmb) does not yet have this infrastructure
- Content is valuable — do not discard, but not ready for active skills

## Current backlog skills

- `docker-infrastructure.md` — Docker governance, WSL2, image hardening, networking, port shadow, v29 overlay, recovery, Compose validation, Windows paths
- `n8n-infrastructure.md` — n8n workflow hygiene, MCP-to-n8n, local setup, Docker internals, Code Nodes, API & security, OAuth & webhook, Continue CLI integration

## Compliance

Backlog skills must align with arch-foundation when promoted: no mbb/mmb in paths or names (anti-calque); paths via `PATHS` from paths.js; naming contracts (kebab-case). See `AUDIT.md` for findings and promotion checklist.

## What goes here

- Adapted markdown files (MBB references removed, frontmatter added)
- No wiring: no `@skill` anchors, no causality-registry, no id-registry
- Not scanned by `validate-skills` or `generate-skills-index`

## When to promote

When the infrastructure appears — move to `is/skills/`, `core/skills/`, or `docs/ais/` and perform full wiring per `id:plan-4e7a1c` sections 5–7.

## Reference

See `id:plan-4e7a1c` § 9.
