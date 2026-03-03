# Deferred Skills (Отложенные скиллы)

Skills that are useful but do not fit the current infrastructure state. Not tied to `is/`, `core/`, or `app/`.

## When to use

- Donor skill describes Docker, n8n, Yandex Cloud, Cloudflare Workers, etc.
- Target App (mmb) does not yet have this infrastructure
- Content is valuable — do not discard, but not ready for active skills

## What goes here

- Adapted markdown files (MBB references removed, frontmatter added)
- No wiring: no `@skill` anchors, no causality-registry, no id-registry
- Not scanned by `validate-skills` or `generate-skills-index`

## When to promote

When the infrastructure appears — move to `is/skills/`, `core/skills/`, or `docs/ais/` and perform full wiring per `docs/plans/plan-skills-migration-registry.md` sections 5–7.

## Reference

See `docs/plans/plan-skills-migration-registry.md` § 9.
