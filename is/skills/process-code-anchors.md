---
title: "Process: Code Anchors (Skill-to-Code Linking)"
reasoning_confidence: 0.85
reasoning_audited_at: "2026-03-04"
reasoning_checksum: "eb4c3d21"
id: sk-8991cd

---

# Process: Code Anchors (Skill-to-Code Linking)

> **Context**: Defines how code files are linked to governing skill documents and architectural reasoning.
> **Scope**: All JS/TS files in `core/`, `app/`, `is/scripts/`

## Reasoning

- **#for-explicit-links** Agents and developers need context. Code anchors prevent silent contract violations during refactoring.
- **#for-machine-readable** Unlike prose, JSDoc `@skill` tags can be parsed by `audit_skill_coverage` to detect unguided blind spots.
- **#for-inline-anchors-sparing** Noise reduces signal. Only use `@skill-anchor` for non-obvious logic.
- **#for-skill-anchors** We use these anchors instead of a separate causality ID namespace to keep reasoning directly connected to code.

---

## Core Rules

Without explicit links from code to architecture, knowledge decays:
- AI agents have no context for why a file is structured the way it is.
- Developers changing a file don't know which architectural rules govern it.
- Refactors violate contracts silently.

Code anchors solve this by making the connection explicit and machine-readable.

### File Header Anchor (Required for Architecturally Significant Files)

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

### Inline Anchor (For Non-Obvious Decisions)

Use inline anchors only for non-trivial decisions inside logic that a reader would not understand without architectural context.
Use hashes from `causality-registry.md` — one or more `#for-...` or `#not-...`. Optional short context after colon.

```javascript
// @skill-anchor arch-foundation #for-ssot-paths
const configPath = join(PATHS.REPO_ROOT, '.env.example');
```

```javascript
// @skill-anchor core/skills/api-layer #for-fail-fast: Binance API stalls
const response = await this.fetchFn(url, { signal: AbortSignal.timeout(this.timeoutMs) });
```

**Do NOT** add inline anchors to obvious code — they become noise.

### `@causality` (Fragment-Level Reasons)

For local causality without skill reference, use `@causality` with hashes from the registry:

```javascript
// @causality #for-partial-failure-tolerance
const settled = await Promise.allSettled(entries.map(([, fn]) => fn()));
```

```javascript
// @causality #for-distinct-ttls: VIX daily, funding 4h/8h
this.ttl = { vix: 24 * 60 * 60 * 1000, fundingRate: 4 * 60 * 60 * 1000, ... };
```

**Registry:** All hashes must exist in `is/skills/causality-registry.md`. Add new hashes there before using.

### Where Anchors Are Required

| Code Pattern | Required anchor |
|---|---|
| Path resolution using `PATHS` | `arch-foundation` |
| Env variable access (SSOT files only) | `arch-foundation` (exception note) |
| Secret loading / encryption | `process-secrets-hygiene` |
| Provider data fetching | `core/skills/api-layer.md` |
| UI state mutations | `app/skills/ui-architecture.md` |
| Health / preflight checks | `arch-control-plane` |

### Anchor Placement (Risk Branches)

Place inline anchors in branches where developers would otherwise "search from scratch": retry/backoff and 429 handling; fallback branches (local cache, stale cache); merge + dedup logic; error/status classification. File header alone is insufficient — risk branches need explicit anchors.

### Where Anchors Are Optional

- Simple utility functions with no architectural risk.
- Data transformation (pure functions).
- Logging and diagnostic output.

### Current Implementation Status

The Target App currently uses anchors in infrastructure scripts and key backend files.
The `audit_skill_coverage` MCP tool (in `is/mcp/skills/server.js`) can detect which JS files lack any skill references — this identifies "blind spots" where agents operate without architectural guidance.
The `search_anchors` MCP tool returns file:line for all `@skill-anchor` and `@causality` occurrences, filterable by skill or hash.
