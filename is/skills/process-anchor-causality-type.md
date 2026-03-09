---
id: sk-7f3e2b
title: "Process: Anchor-Level Causality Type (constraint vs goal)"
tags:
  - "#process"
  - "#causality"
  - "#anchors"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-09"
reasoning_checksum: 758bf79e
last_change: "#for- vs #not- — constraint/goal applies to both"

---

# Process: Anchor-Level Causality Type

> **Context**: At the anchor level, agents can optionally specify whether a causality expresses a **constraint** (из-за чего — because of what) or a **goal** (для чего — for what). Applies to both `#for-` and `#not-`. Same hash, different semantic nuance per use site.

## Reasoning

- **#for-anchor-causality-type** At anchor level, agent can specify `constraint` (из-за) or `goal` (для) to disambiguate reason type. Enables richer traceability. SSOT: process-code-anchors.
- **#for-explicit-links** Richer anchors improve context for agents and developers during refactoring and code review.

## Core Rules

1. **Optional suffix** — After the hash, add `constraint` or `goal` when the distinction matters. Applies to **both #for- and #not-**. Omission is valid; existing anchors need not be updated.
2. **constraint** — Reason is due to an external limitation (из-за): API rate limits, browser restrictions, tooling constraints.
3. **goal** — Reason is a desired outcome (для): traceability, fail-fast, maintainability.
4. **Format** — `@causality #for-<hash> constraint` or `@causality #not-<hash> goal`. Same for `@skill-anchor`.

### Examples

```javascript
// #for- constraint — из-за лимитов API
// @causality #for-rate-limiting constraint

// #for- goal — для трассируемости
// @causality #for-request-id-traceability goal

// #not- constraint — отвергли bundler из-за ограничения file://
// @causality #not-bundler-ui constraint

// #not- goal — отвергли bundler для zero-build
// @causality #not-bundler-ui goal

// both valid without suffix
// @causality #for-fail-fast
```

## Contracts

- id:sk-8991cd (process-code-anchors) — base anchor format and placement.
- id:sk-3b1519 (causality-registry) — hash SSOT; Enforcement (gate/advisory) is per-hash.
