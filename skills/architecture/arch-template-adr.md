---
id: arch-template-adr
title: "Architecture: ADR Template"
scope: architecture
tags: [#architecture, #adr, #template, #migration]
version: 1.0.0
priority: high
updated_at: 2026-02-22
status: active
confidence: high
review_after: 2026-05-22
decision_scope: architecture
decision_id: ADR-ARCH-000
supersedes: none
---

# Architecture ADR Template

## Overview
- Briefly describe the architectural decision and where it applies.

## Implementation Status in MMB
- **Implemented:** what is already implemented in MMB code.
- **Pending:** what is still not implemented.
- **Doubtful:** what remains uncertain or requires re-evaluation.

## Architectural Reasoning (Why this way)
- Why this option was chosen.
- What constraints were considered (runtime, infrastructure, security, DX).

## Alternatives Considered
- Option A: pros/cons and why it was rejected.
- Option B: pros/cons and why it was rejected.

## Migration Notes
- What was removed from MBB-specific behavior.
- What was retained and why.

## Supersedes
- If this decision replaces an old one, specify the previous ADR ID in `supersedes`.
- If this is the first decision, set `supersedes: none`.

## Relations
- process-skill-id (governing process)
- security-or-integration-skill-id (cross-domain dependency)
