---
id: sk-f4a2c8
title: "MCP: Causality Graph Tools"
reasoning_confidence: 0.95
reasoning_audited_at: 2026-03-14
reasoning_checksum: 4572e96e
last_change: "Initial: structured MCP graph tools for causality impact analysis"
related_skills:
  - sk-3225b2
  - sk-d599bd
  - sk-8991cd
  - sk-3b1519
related_ais:
  - ais-8d3c2a
  - ais-b6c7d8

---

# MCP: Causality Graph Tools

> **Context**: Three MCP tools expose the `dependency_graph` as structured queries, replacing manual grep and the limited `causality_graph://` resource.
> **Scope**: `is/mcp/tools/causality-graph-tools.js`, `is/contracts/docs/parse-causality-registry.js`, `is/contracts/causality-scan-contracts.js`

## Reasoning

- **#for-causality-graph-tools** Structured JSON output with anchor_type, line_number, and registry formulation replaces unstructured file lists. Agents get machine-readable context for impact analysis.
- **#for-causality-scan-contract** Shared scan contract prevents coverage drift between validators and graph. Single change point when new dirs/extensions are added.
- **#for-ai-tooling-abstraction** JSON-schema MCP tools are safer and more predictable than agents composing grep/find commands.
- **#for-benefit-overhead-kpi** B = instant structured graph context for impact analysis; O = three tool handlers + one parser module. B/O > 2.

## Core Rules

### Available Tools

1. **`get_causality_files(hash)`** — returns all files anchored to a hash, with `anchor_type` (anchor/skill/ais/rule) and `line_number`.
2. **`get_causality_reverse(file)`** — returns all hashes referencing a given file path.
3. **`resolve_causality_context(hash)`** — full context: files, registry formulation + enforcement level, co-occurring hashes across shared files.

### When to Use

- **Before modifying/removing a hash**: call `resolve_causality_context` to assess blast radius.
- **Before refactoring a file**: call `get_causality_reverse` to understand which rationale governs it.
- **For simple lookup**: call `get_causality_files` for a lightweight file list.

### Data Source

Tools query `dependency_graph` in `data/mcp.sqlite`, populated by the invariant gate (#JS-eG4BUXaS). The graph covers code anchors (JS), skill reasoning (MD), AIS references (MD), and cursor rules (MDC) via the shared scan contract.

### Backward Compatibility

`causality_graph://` resource remains functional; it delegates to the same `queryFilesByHash` function used by `get_causality_files`. New tools provide richer structure (anchor_type, line_number, registry formulation).

## Contracts

- `is/contracts/causality-scan-contracts.js` — SSOT for scan dirs, extensions, anchor types, and exclusions.
- `is/contracts/docs/parse-causality-registry.js` — parses id:sk-3b1519 into `{ enforcement, formulation }`.
- id:ais-8d3c2a (docs/ais/ais-mcp-data-flow.md) — data flow specification.
- id:ais-b6c7d8 (docs/ais/ais-causality-traceability.md) — causality system specification.
