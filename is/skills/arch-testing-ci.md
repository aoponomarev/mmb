---
title: "Architecture: Testing Strategy & CI"
tags: ["#architecture", "#testing", "#ci", "#github"]
dependencies: ["arch-foundation"]
updated_at: "2026-03-01T00:00:00.000Z"
---

# Architecture: Testing Strategy & CI

> **Context**: Defines the approach to testing and continuous integration during and after the migration to the Target App.

## Implementation Status in Target App
- `Implemented`: `node:test` adopted globally. Minimal CI pipeline created via GitHub Actions (`ci.yml`).

## Architectural Reasoning (Why this way)
- **Built-in `node:test`:** Used exclusively for all unit and integration tests to avoid heavy external dependencies (like Jest or Vitest). It covers 99% of our needs out-of-the-box natively.
- **Contract-first Preflight:** Relying on strict Zod-based contracts (`preflight.js`) paired with `node:test` provides the best cost/reliability ratio, immediately failing on invalid environment states.
- **Minimal Deterministic CI:** Migration-at-scale requires formal gates at the PR/commit level to reduce human error. However, the CI pipeline is intentionally kept minimal (Lint, Health, Test) to ensure fast feedback loops and avoid flaky checks.

## Alternatives Considered
- **Manual verification only:** Rejected, as it carries too high a risk of hidden regressions.
- **Jest / Vitest:** Rejected, adds unnecessary weight and configuration overhead.
- **Complex multi-stage CI / Heavy E2E Frameworks (Playwright/Cypress):** Deferred. We start with simple, fast gates to maintain velocity and will introduce heavy E2E only when the baseline runtime is fully stabilized.
