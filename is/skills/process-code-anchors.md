# Process: Code Anchors (Skill-to-Code Linking)

> **Context**: Defines how code files are linked to governing skill documents and architectural reasoning.
> **Scope**: All JS/TS files in `core/`, `app/`, `is/scripts/`

## 1. Why Code Anchors

Without explicit links from code to architecture, knowledge decays:
- AI agents have no context for why a file is structured the way it is.
- Developers changing a file don't know which architectural rules govern it.
- Refactors violate contracts silently.

Code anchors solve this by making the connection explicit and machine-readable.

## 2. File Header Anchor (Required for Architecturally Significant Files)

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

## 3. Inline Anchor (For Non-Obvious Decisions)

Use inline anchors only for non-trivial decisions inside logic that a reader would not understand without architectural context:

```javascript
// @skill-anchor arch-foundation: using PATHS.REPO_ROOT here, not __dirname, because preflight runs from different CWDs
const configPath = join(PATHS.REPO_ROOT, '.env.example');
```

**Do NOT** add inline anchors to obvious code — they become noise.

## 4. Where Anchors Are Required

| Code Pattern | Required anchor |
|---|---|
| Path resolution using `PATHS` | `arch-foundation` |
| Env variable access (SSOT files only) | `arch-foundation` (exception note) |
| Secret loading / encryption | `process-secrets-hygiene` |
| Provider data fetching | `core/skills/api-layer` |
| UI state mutations | `app/skills/ui-architecture` |
| Health / preflight checks | `arch-control-plane` |

## 5. Where Anchors Are Optional

- Simple utility functions with no architectural risk.
- Data transformation (pure functions).
- Logging and diagnostic output.

## 6. Current Implementation Status

The Target App currently uses anchors in infrastructure scripts and key backend files.
The `audit_skill_coverage` MCP tool (in `is/mcp/skills/server.js`) can detect which JS files lack any skill references — this identifies "blind spots" where agents operate without architectural guidance.

## 7. Relationship to Causality

At the current scale (<50 skills), full causality IDs (`GC.x1y2.*`) are not required.
Textual reasoning in "Architectural Reasoning" sections of `arch-*.md` files serves the same purpose.

When the project exceeds 50 skills, anchors can be upgraded to the full form:
```javascript
/**
 * @skill is/skills/arch-backend-core
 * @causality GC.x1y2.ssot-paths-contract
 */
```
