---
title: "Frontend UI Architecture (RRG & UI Contracts)"
tags: ["#frontend", "#rrg", "#vue", "#ui", "#no-build"]
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "be281023"
---

# Frontend UI & Reactivity (RRG)

> **Context**: Rules governing the UI layer, state management, and reactivity contracts.
> **Scope**: `app/`, `shared/components/`

## Reasoning

- **#for-hardcode-ban** Hardcoded strings in Vue templates cause maintenance drift. A single SSOT config prevents having to hunt down labels across multiple components.
- **#for-zod-ui-validation** Validating UI config ensures typos don't become silent runtime errors.
- **#for-file-protocol** The frontend must run purely as static files; no local Node backend.
- **#not-bundler-ui** We avoid UI bundlers to maintain absolute zero-config portability with `file://`.

---

## Core Rules

All user-facing strings (buttons, headings, tooltips) MUST come from centralized SSOT configurations.
- Directly assigning hardcoded string literals to `innerText`, `textContent`, `title`, `ariaLabel`, or `innerHTML` in component code is **forbidden**.
- Enforcement: AST linter at `is/scripts/tests/lint-frontend-hardcode-ast.test.js`.

**#for-hardcode-ban** Scattered hardcoded strings cause maintenance drift — the same label updated in one place but not another. A single SSOT config is the only mutation point.

### Zod UI Config Validation (Type-Safe Design System)

Interface configurations (`tooltips-config.js`, `modals-config.js`) are validated against Zod schemas.
- Schemas live in `core/contracts/ui-contracts.js`.
- Validation is enforced in `is/scripts/tests/validate-frontend-ui-configs.test.js`.

**#for-zod-ui-validation** A typo in a config (missing required key) must not produce silent runtime errors on the client. Fail-fast at test time catches it before deployment.

### Reactive Reliability Gate (RRG)

RRG defines the fundamental reliability contract for the reactive layer.

1. **Single State Source**: Vue reactivity (`appStore`) must be clearly structured. State must not exist in multiple places simultaneously.
2. **Mutation Discipline**: Avoid uncontrolled state spread — e.g., manually synchronizing two independent variables instead of using `computed`. All mutations go through defined store setters.
3. **Async Contracts**: Async operations (data fetch, debounce) must have clearly defined loading/error state transitions.
4. **Reactivity Regression Checks**: Critical components (tables, lists) have their RRG contracts enforced via automated tests (`is/scripts/tests/check-frontend-rrg.test.js`).

**Enforcement commands**:
- `npm run frontend:reactivity:check`
- `npm run frontend:smoke`

### Vue No-Build Architecture

The project uses Vue 3 loaded via a global `<script>` tag without bundlers (Vite/Webpack) to remain portable and functional over the `file://` protocol.

**Rules**:
- Templates are defined in separate JS files as strings (`app/templates/`).
- Module loading order is controlled by `core/module-loader.js`.
- No bundler output, no `dist/` directory — `index.html` is the deployment artifact directly.

**#for-file-protocol** No local Node.js server may be a UI dependency — GitHub Pages serves static files only. Cloudflare Worker proxy enables CORS bypass for both `file://` and `https://` without code changes.

### Hosting Compatibility Contract

The UI must be functional in two modes without code changes:
- `file://` (local, opened by double-clicking `index.html`)
- `https://aoponomarev.github.io/...` (GitHub Pages)

In both modes, external API calls subject to CORS must go through the Cloudflare Worker proxy (`cloudflareConfig.getApiProxyEndpoint`). No local Node.js server may be a dependency of the UI runtime.
