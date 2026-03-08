---
id: sk-f7e2a1
title: "Process: File Header Standard (Structured Code File Headers)"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-08
reasoning_checksum: c8fcfafd
last_change: ""

---

# Process: File Header Standard

> **Context**: Unified structured header for every code file so AI agents and developers get understanding, traceability, and mixed-mode references. Extends code anchors (skill/causality linking) with a mandatory file id and fixed slot order.
> **SSOT**: Template `#JS-EsMQyEpA (file-header-template.js)`. AIS: `id:ais-f7e2a1 (docs/ais/ais-file-header-standard.md)`. Contract: `#JS-Am2QGp6w (file-header-contract.js)`. Plan distilled into AIS.

## Reasoning

- **#for-file-header-standard** Each code file gains a stable id (`#JS-xxx`, `#TS-xxx`) so documentation and skills can reference it even when the file moves. Header slots (file id, @description, @skill, @skill-anchor, @causality, @ssot, @gate, @contract, @see) are ordered and machine-parseable — agents spend less time guessing and more time coding. In prose, the id stays primary; local path context follows mixed reference mode.
- **#for-ssot-paths** File id is derived from canonical relative path; registry maps id → path. Path changes only require registry update, not doc edits.
- **#for-machine-readable** Gate `validate-file-headers.js` and contract `file-header-contract.js` enforce structure; assign-file-ids.js fills or checks file ids. Bare hashes remain safe because agents can resolve them through `code-file-registry.json`.

---

## Core Rules

1. **File id** — First line of the header must be `#<EXT>-<hash>` (e.g. `#JS-a1b2c3d4`). EXT = JS | TS | CSS | HTML | JSON. Hash = deterministic from file path (see assign-file-ids.js).
2. **@description** — Required when file id is present. One sentence summary for tooling and agents.
3. **Slot order** — After file id and optional title line: @description → @skill → @skill-anchor → @causality → @ssot → @gate → @contract → @see. Then free-form PURPOSE, PRINCIPLES, USAGE, REFERENCES.
4. **Language** — All header text in English (enforced by validate-code-comments-english).
5. **New files** — Copy header from `#JS-EsMQyEpA`; run `npm run file-headers:fix` to update registry and get correct file id. File must be in SCAN_DIRS: core, app, is, shared, mm, styles. assign-file-ids does not write to files; insert file id manually from registry.
6. **Mixed reference mode** — In docs, skills, rules, and comments: use the file hash as the canonical key. First important mention may be `#JS-... (basename.js)` when basename is unique, or `#JS-... (repo/path.js)` when basename is ambiguous. Repeated mentions in the same file should collapse to bare hash.
7. **After code changes** — Header must be fully re-checked. Run `npm run file-headers:fix` (or at least `file-headers:check`) before commit. If information in the header is false or outdated, correct it or remove it; the gate only auto-fixes file id mismatch (`--fix`).

---

## Implementation Status

### Contract and Gate

- **Contract**: `#JS-Am2QGp6w` — FILE_ID_PATTERN, REQUIRED_HEADER_FIELDS, ALLOWED_HEADER_TAGS, SCAN_DIRS, getExpectedFileId, getFileIdFromHeader, validateHeaderFull, extractHeaderComment. assign-file-ids has no `--write` mode; insert file id manually.
- **Gate**: `#JS-zh26RZvs (validate-file-headers.js)` — Full check: file id must match path, @description required when id present. `--fix`: writes correct file id into file when mismatch. npm: `file-headers:check`, `file-headers:fix`, `file-headers:audit`.
- **Preflight**: Gate runs after validate-code-comments-english. Run `npm run file-headers:fix` after tree changes; run full check before commit / in CI.
