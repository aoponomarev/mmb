---
title: "Process: File Header Standard (Structured Code File Headers)"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-04"
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
5. **New files** — Copy header from `shared/templates/file-header-template.js`; run assign-file-ids to set file id and update code-file-registry.

---

## Implementation Status

### Contract and Gate

- **Contract**: `is/contracts/file-header-contract.js` — FILE_ID_PATTERN, REQUIRED_HEADER_FIELDS, ALLOWED_HEADER_TAGS, extractHeaderComment, validateHeader.
- **Gate**: `is/scripts/architecture/validate-file-headers.js` — Scans SCAN_DIRS; for each file with a file id in the first comment block, requires @description; exit 1 on violation.
- **Preflight**: Gate runs after validate-code-comments-english. npm: `npm run file-headers:check`.
- Template, AIS, plan, contract, skill, and gate are in place. Rollout: assign file ids gradually (see plan); keep code-file-registry updated.
