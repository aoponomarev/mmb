---
id: sk-95710f

---

# Frontend Application Skills (`app/skills/`)

## Scope
Skills governing the UI layer, browser-specific constraints, and user experience contracts. These skills are served to AI agents alongside `is/skills/` and `core/skills/` via the MCP server.

## Contents
- `file-protocol-cors-guard` — Non-negotiable rule: all external API calls from `file://` must go through the Cloudflare Worker proxy.
- `ui-architecture` — Frontend architecture contracts: Hardcode Text Ban, Zod UI Config Validation, Reactive Reliability Gate (RRG), Vue No-Build Architecture, Hosting Compatibility.
- `rrg-refactor-on-edit` — When editing a block that contains outdated reactivity (window mutation, innerHTML, duplicated state), attempt to rewrite it per RRG unless the refactor would cause serious scope or dependency issues.
- `ux-principles` — UX design principles: UI consistency, color semantics, action feedback, non-blocking async, reversible destructive actions, SSOT for UI strings.

## Constraints
- **English Only**: All files in this directory MUST be written strictly in English (per id:sk-883639 (is/skills/process-language-policy.md)).
- **Validation**: Every file must pass the structural checks enforced by `npm run skills:check`.
