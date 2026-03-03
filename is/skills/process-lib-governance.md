---
title: "Lib Governance"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "2d3d963b"
id: sk-130fa2

---

# Lib Governance

> **Context**: Rules for adding, updating, and loading external third-party libraries in the No-Build architecture.
> **Scope**: `core/lib-loader.js`, external dependencies.

## Reasoning

- **#for-umd-libraries** Because the project uses a No-Build architecture (no Webpack, Vite, or npm install for the UI), all libraries must be loaded dynamically via `<script>` tags. Libraries that only offer ES modules without a UMD or Global build cannot be used directly without a compilation step.
- **#for-cdn-fallback** Relying on a single public CDN (like jsdelivr or cdnjs) creates a single point of failure. If the CDN goes down, the app breaks. Implementing a fallback chain (GitHub Pages CDN → jsdelivr → cdnjs) ensures high availability.

## Core Rules

1.  **Library Priority:**
    Before writing a custom module for complex UI or logic (e.g., charts, drag-and-drop), always check if a suitable library exists.
2.  **UMD Requirement:**
    Any library added to the project MUST have a UMD or Global build available. You cannot use `import { ... } from 'library'` if the library requires a bundler.
3.  **Loading Mechanism:**
    All libraries must be registered and loaded through `core/lib-loader.js`. Do not add `<script>` tags directly to `index.html` for third-party libraries unless absolutely necessary (like Vue itself).
4.  **Fallback Chain:**
    Every library registered in `lib-loader.js` must define multiple sources in its `LIB_SOURCES` array, typically starting with the custom GitHub Pages CDN, followed by `jsdelivr` or `cdnjs`.

### Zod Schema Governance (MCP)

**#for-zod-ui-validation** Use explicit Zod schemas for every MCP tool input. Do not mix incompatible validation patterns across servers. Naming: `<toolName>Schema`. Error shape must be normalized: stable error code, human-readable message, optional details map. Validation failure must be fail-fast before tool execution. Any schema change requires drift checks and self-tests.

### Zod v3/v4 Compatibility Layer

When migrating Zod versions: wrap error formatting into a stable internal shape; centralize helpers that may differ between versions; prevent version-specific quirks from spreading into tool handlers. **Activation criteria**: preflight drift checks green, all MCP servers pass self-tests, no contract regressions. Full migration in one shot is high-risk — use compatibility adapters to reduce blast radius.

## Contracts

- **No `node_modules` in UI**: The `app/` and `core/` UI code must never rely on `node_modules`.
- **Version Pinning**: Library URLs in `lib-loader.js` must include strict version numbers (e.g., `vue@3.4.0`). Do not use `@latest` tags, as they can introduce breaking changes unexpectedly.
