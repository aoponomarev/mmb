---
title: "Frontend UI Architecture (RRG & UI Contracts)"
tags: ["#frontend", "#rrg", "#vue", "#ui", "#no-build"]
---

# Frontend UI & Reactivity (RRG)

> **Context**: Rules governing the UI layer, state management, and reactivity contracts.
> **Scope**: `app/`, `shared/components/`

## 1. Hardcode Text Ban

All user-facing strings (buttons, headings, tooltips) MUST come from centralized SSOT configurations.
- Directly assigning hardcoded string literals to `innerText`, `textContent`, `title`, `ariaLabel`, or `innerHTML` in component code is **forbidden**.
- Enforcement: AST linter at `is/scripts/tests/lint-frontend-hardcode-ast.test.js`.

**Reasoning**: Scattered hardcoded strings cause maintenance drift — the same label updated in one place but not another. A single SSOT config is the only mutation point.

## 2. Zod UI Config Validation (Type-Safe Design System)

Interface configurations (`tooltips-config.js`, `modals-config.js`) are validated against Zod schemas.
- Schemas live in `core/contracts/ui-contracts.js`.
- Validation is enforced in `is/scripts/tests/validate-frontend-ui-configs.test.js`.

**Reasoning**: A typo in a config (missing required key) must not produce silent runtime errors on the client. Fail-fast at test time catches it before deployment.

## 3. Reactive Reliability Gate (RRG)

RRG defines the fundamental reliability contract for the reactive layer.

1. **Single State Source**: Vue reactivity (`appStore`) must be clearly structured. State must not exist in multiple places simultaneously.
2. **Mutation Discipline**: Avoid uncontrolled state spread — e.g., manually synchronizing two independent variables instead of using `computed`. All mutations go through defined store setters.
3. **Async Contracts**: Async operations (data fetch, debounce) must have clearly defined loading/error state transitions.
4. **Reactivity Regression Checks**: Critical components (tables, lists) have their RRG contracts enforced via automated tests (`is/scripts/tests/check-frontend-rrg.test.js`).

**Enforcement commands**:
- `npm run frontend:reactivity:check`
- `npm run frontend:smoke`

## 4. Vue No-Build Architecture

The project uses Vue 3 loaded via a global `<script>` tag without bundlers (Vite/Webpack) to remain portable and functional over the `file://` protocol.

**Rules**:
- Templates are defined in separate JS files as strings (`app/templates/`).
- Module loading order is controlled by `core/module-loader.js`.
- No bundler output, no `dist/` directory — `index.html` is the deployment artifact directly.

**Reasoning**: The `file://` portability constraint and GitHub Pages static hosting require zero build steps in the deployment path. A bundler would add a required build layer that cannot run in the GitHub Pages static serving model.

## 5. Hosting Compatibility Contract

The UI must be functional in two modes without code changes:
- `file://` (local, opened by double-clicking `index.html`)
- `https://aoponomarev.github.io/...` (GitHub Pages)

In both modes, external API calls subject to CORS must go through the Cloudflare Worker proxy (`cloudflareConfig.getApiProxyEndpoint`). No local Node.js server may be a dependency of the UI runtime.
