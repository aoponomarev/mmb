---
title: "Process: File Header Standard (Structured Code File Headers)"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-05"
reasoning_checksum: "c8fcfafd"
id: sk-f7e2a1

---

# Process: File Header Standard

> **Context**: Unified structured header for every code file so AI agents and developers get understanding, traceability, and path-independent references. Extends code anchors (skill/causality linking) with a mandatory file id and fixed slot order.
> **SSOT**: Template `shared/templates/file-header-template.js`. AIS: `id:ais-f7e2a1`. Contract: `is/contracts/file-header-contract.js`. Plan: `docs/plans/file-header-rollout.md`.

## Reasoning

- **#for-file-header-standard** Each code file gains a stable id (`#JS-xxx`, `#TS-xxx`) so documentation and skills can reference it even when the file moves. Header slots (file id, @description, @skill, @skill-anchor, @causality, @ssot, @gate, @contract, @see) are ordered and machine-parseable — agents spend less time guessing and more time coding.
- **#for-ssot-paths** File id is derived from canonical relative path; registry maps id → path. Path changes only require registry update, not doc edits.
- **#for-machine-readable** Gate `validate-file-headers.js` and contract `file-header-contract.js` enforce structure; assign-file-ids.js fills or checks file ids.

---

## Core Rules

1. **File id** — First line of the header must be `#<EXT>-<hash>` (e.g. `#JS-a1b2c3d4`). EXT = JS | TS | CSS | HTML | JSON. Hash = deterministic from file path (see assign-file-ids.js).
2. **@description** — Required when file id is present. One sentence summary for tooling and agents.
3. **Slot order** — After file id and optional title line: @description → @skill → @skill-anchor → @causality → @ssot → @gate → @contract → @see. Then free-form PURPOSE, PRINCIPLES, USAGE, REFERENCES.
4. **Language** — All header text in English (enforced by validate-code-comments-english).
5. **New files** — Copy header from `shared/templates/file-header-template.js`; run `npm run file-headers:fix` to update registry and get correct file id.
6. **After code changes** — Header must be fully re-checked. Run `npm run file-headers:fix` (or at least `file-headers:check`) before commit. If information in the header is false or outdated, correct it or remove it; the gate only auto-fixes file id mismatch (`--fix`).

---

## Implementation Status

### Contract and Gate

- **Contract**: `is/contracts/file-header-contract.js` — FILE_ID_PATTERN, REQUIRED_HEADER_FIELDS, ALLOWED_HEADER_TAGS, getExpectedFileId, getFileIdFromHeader, validateHeaderFull, extractHeaderComment.
- **Gate**: `is/scripts/architecture/validate-file-headers.js` — Full check: file id must match path, @description required when id present. `--fix`: writes correct file id into file when mismatch. npm: `file-headers:check`, `file-headers:fix`, `file-headers:audit`.
- **Preflight**: Gate runs after validate-code-comments-english. Run `npm run file-headers:fix` after tree changes; run full check before commit / in CI.
