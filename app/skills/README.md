# Frontend Application Skills (`app/skills/`)

## Scope
Skills governing the UI layer, browser-specific constraints, and user experience contracts. These skills are served to AI agents alongside `is/skills/` and `core/skills/` via the MCP server.

## Contents
- `file-protocol-cors-guard` — Non-negotiable rule: all external API calls from `file://` must go through the Cloudflare Worker proxy.
- `ui-architecture` — Frontend architecture contracts: Hardcode Text Ban, Zod UI Config Validation, Reactive Reliability Gate (RRG), Vue No-Build Architecture, Hosting Compatibility.
- `ux-principles` — UX design principles: UI consistency, color semantics, action feedback, non-blocking async, reversible destructive actions, SSOT for UI strings.

## Constraints
- **English Only**: All files in this directory MUST be written strictly in English (per `process-language-policy.md`).
- **Validation**: Every file must pass the structural checks enforced by `npm run skills:check`.
