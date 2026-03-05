---
id: sk-318305
title: "Frontend UI Architecture (RRG & UI Contracts)"
tags:
  - "#frontend"
  - "#rrg"
  - "#vue"
  - "#ui"
  - "#no-build"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-05
reasoning_checksum: f5e9e931
last_change: ""

---

# Frontend UI & Reactivity (RRG)

> **Context**: Rules governing the UI layer, state management, and reactivity contracts.
> **Scope**: `app/`, `shared/components/`

## Reasoning

- **#for-hardcode-ban** Hardcoded strings in Vue templates cause maintenance drift. A single SSOT config prevents having to hunt down labels across multiple components.
- **#for-zod-ui-validation** Validating UI config ensures typos don't become silent runtime errors.
- **#for-file-protocol** The frontend must run purely as static files; no local Node backend.
- **#not-bundler-ui** We avoid UI bundlers to maintain absolute zero-config portability with `file://`.
- **#for-tooltip-reactivity** Tooltips must be re-initialized or titles reactively bound so that language switches affect hover text immediately.

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
4. **Reactivity Regression Checks**: RRG gate #JS-Yn27TZUx (is/scripts/tests/check-frontend-rrg.test.js) enforces RRG-1 and RRG-2 on app/components and shared/components. AIS: id:ais-c4e9b2 (docs/ais/ais-rrg-contour.md).

**Enforcement commands**:
- `npm run frontend:reactivity:check` — runs RRG gate (id:ais-c4e9b2); scope: app/components, shared/components.
- `npm run frontend:smoke` — (optional) if a frontend smoke suite exists.

### Vue No-Build Architecture

The project uses Vue 3 loaded via a global `<script>` tag without bundlers (Vite/Webpack) to remain portable and functional over the `file://` protocol.

**Rules**:
- Templates are defined in separate JS files as strings (`app/templates/`).
- Module loading order is controlled by `core/module-loader.js`.
- No bundler output, no dist/ directory — index.html is the deployment artifact directly.

**#for-file-protocol** No local Node.js server may be a UI dependency — GitHub Pages serves static files only. Cloudflare Worker proxy enables CORS bypass for both `file://` and `https://` without code changes.

### Hosting Compatibility Contract

The UI must be functional in two modes without code changes:
- `file://` (local, opened by double-clicking `index.html`)
- `https://aoponomarev.github.io/...` (GitHub Pages)

In both modes, external API calls subject to CORS must go through the Cloudflare Worker proxy (`cloudflareConfig.getApiProxyEndpoint`). No local Node.js server may be a dependency of the UI runtime.

### Tooltip System

**#for-tooltip-reactivity** Tooltips must be re-initialized or titles reactively bound so that language switches affect hover text immediately.

- **SSOT**: `core/config/tooltips-config.js`
- **Principle**: Use native browser tooltips (`title` attribute). HTML-based tooltips are forbidden.
- **Structure**: Static part from config + newline + dynamic part from `tooltip-interpreter.js`
- **Usage**: `tooltipsConfig.getTooltip(key)` or `tooltipInterpreter.getTooltip(key, { value, lang })`
- **Constraints**: UTF-8 only, under 2000 chars, no HTML

### Modal Action Manager

`cmp-modal` provides `modalApi` via provide/inject. Buttons register to appear in Header or Footer.

- **API**: `registerButton(id, config)`, `updateButton(id, updates)`, `removeButton(id)`
- **Layout**: Cancel footer left; Save/Action footer right; Close header right
- **Constraints**: Buttons MUST be removed in `beforeUnmount()`; check `modalApi` exists before calling

### Composition Boundaries

Use **raw Bootstrap** (HTML + classes) for static layout. Create **Vue wrappers** only when dynamic logic is required (search/filter, async lists, complex state, 3+ reuse). Wrap items/logic, not necessarily the outer container — container should remain accessible to Bootstrap's native JS.

### Column Visibility (CSS-Driven)

Toggling table columns without re-rendering. State in `columnVisibilityConfig`; mixin computes classes; CSS `display: none` on parent class. **Benefit**: Instant switching, preserves scroll position. Edge case: Bootstrap radio `@change` on hidden input fails in Vue — bind `@click` to `<label>` instead.

### Layout & Alignment

Use vertical padding on the **inner container** based on size class (e.g. `.component-responsive.size-sm > .inner-container`). Avoid fixed `height` or `line-height` for alignment. Horizontal spacing: Bootstrap utilities (`me-2`, `gap-3`); `gap-2` for button groups, `mb-3` for form fields. Sizing: `sm` (compact: tables, sidebars), `md` (default: forms, modals), `lg` (prominent: hero sections). File Map: `styles/wrappers/`, `shared/components/button.js`.

### Responsive Visibility (Mobile-First)

Breakpoint: `576px` (Bootstrap `sm`). Visibility controlled via **CSS**, not JS — components render all elements, CSS hides based on viewport. Classes: `.label` (desktop), `.label-short` (mobile), `.icon` (always visible). Mobile default: `.label { display: none; }` `.label-short { display: block; }`. Desktop `@media (min-width: 576px)`: swap. Component props: `label`, `labelShort`, `icon`. File Map: `styles/wrappers/button.css`, `shared/components/button.js`.

### Unified Component Library

**Generic (`cmp-*`)**: `cmp-button`, `cmp-dropdown`, `cmp-combobox`, `cmp-modal`, `cmp-modal-buttons`, `cmp-timezone-selector`. **App (`app-*`)**: `app-header`, `app-sidebar`, `app-footer`. All components MUST document in file header: `props`, `emits`, `slots`, `expose`. File Map: `shared/components/`, `shared/templates/`.

### DOM Markup & Hashing

**Auto-markup**: Mark significant containers with `avto-{Base58_8char}` for DevTools and agent visibility. Deterministic hash from DOM path; stable across reloads. Scope: major sections, headers, wrappers. Exclusions: inside Vue components, minor wrappers, elements with IDs. **Instance hashing**: `computed: { instanceHash }` from `shared/utils/hash-generator.js`; usage `<div :class="['my-component', instanceHash]">`. **Layout sync**: `shared/utils/layout-sync.js` — `ResizeObserver` + `MutationObserver`; API `window.layoutSync.start()`, `.stop()`, `.update()`. Constraints: `avto-*` classes for identification ONLY, no functional CSS; hashing must be deterministic. File Map: `shared/utils/auto-markup.js`, `shared/utils/hash-generator.js`, `shared/utils/layout-sync.js`.
