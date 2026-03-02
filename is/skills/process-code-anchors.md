---
title: "Process: Code Anchors (Skill-to-Code Linking)"
reasoning_confidence: 0.85
reasoning_audited_at: "2026-03-01"
---

# Process: Code Anchors (Skill-to-Code Linking)

> **Context**: Defines how code files are linked to governing skill documents and architectural reasoning.
> **Scope**: All JS/TS files in `core/`, `app/`, `is/scripts/`

## Reasoning

- **#for-explicit-links** Without anchors, AI agents and developers lack context for why a file is structured the way it is. Refactors violate contracts silently.
- **#for-machine-readable** `@skill` JSDoc is parseable by MCP tools (`audit_skill_coverage`). Scattered prose docs are not discoverable.
- **#for-inline-anchors-sparing** Obvious code needs no anchor; noise reduces signal. Use `@skill-anchor` when the rationale is not self-evident.
- **#for-skill-anchors** Textual reasoning in skills (with #for-/#not- hashes) provides causality value. Skill anchors connect code to reasoning without a separate causality ID namespace.

---

## Why Code Anchors

Without explicit links from code to architecture, knowledge decays:
- AI agents have no context for why a file is structured the way it is.
- Developers changing a file don't know which architectural rules govern it.
- Refactors violate contracts silently.

Code anchors solve this by making the connection explicit and machine-readable.

## File Header Anchor (Required for Architecturally Significant Files)

Add a JSDoc block at the top of every JS file that has architectural significance:

```javascript
/**
 * @skill is/skills/arch-foundation
 *
 * Brief description of what this file does.
 */
```

For files governed by multiple skills:

```javascript
/**
 * @skill is/skills/arch-backend-core
 * @skill core/skills/api-layer
 *
 * Market Snapshot HTTP handler — framework-agnostic route binding.
 */
```

## Inline Anchor (For Non-Obvious Decisions)

Use inline anchors only for non-trivial decisions inside logic that a reader would not understand without architectural context:

```javascript
// @skill-anchor arch-foundation: using PATHS.REPO_ROOT here, not __dirname, because preflight runs from different CWDs
const configPath = join(PATHS.REPO_ROOT, '.env.example');
```

**Do NOT** add inline anchors to obvious code — they become noise.

## Where Anchors Are Required

| Code Pattern | Required anchor |
|---|---|
| Path resolution using `PATHS` | `arch-foundation` |
| Env variable access (SSOT files only) | `arch-foundation` (exception note) |
| Secret loading / encryption | `process-secrets-hygiene` |
| Provider data fetching | `core/skills/api-layer` |
| UI state mutations | `app/skills/ui-architecture` |
| Health / preflight checks | `arch-control-plane` |

## Where Anchors Are Optional

- Simple utility functions with no architectural risk.
- Data transformation (pure functions).
- Logging and diagnostic output.

## Current Implementation Status

The Target App currently uses anchors in infrastructure scripts and key backend files.
The `audit_skill_coverage` MCP tool (in `is/mcp/skills/server.js`) can detect which JS files lack any skill references — this identifies "blind spots" where agents operate without architectural guidance.
