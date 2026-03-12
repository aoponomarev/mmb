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
reasoning_audited_at: 2026-03-11
reasoning_checksum: 89079f58
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
- **#for-conflict-state-marker** Detached conflict copies must look different from ordinary unsynced items, otherwise users reopen or publish the wrong branch by mistake.

---

## Core Rules

All user-facing strings (buttons, headings, tooltips) MUST come from centralized SSOT configurations.
- Directly assigning hardcoded string literals to `innerText`, `textContent`, `title`, `ariaLabel`, or `innerHTML` in component code is **forbidden**.
- Enforcement: AST linter at #JS-uZ2Hc9qj (lint-frontend-hardcode-ast.test.js).

**#for-hardcode-ban** Scattered hardcoded strings cause maintenance drift — the same label updated in one place but not another. A single SSOT config is the only mutation point.

### Zod UI Config Validation (Type-Safe Design System)

Interface configurations (`tooltips-config.js`, `modals-config.js`) are validated against Zod schemas.
- Schemas live in #JS-4KeCe4GT (ui-contracts.js).
- Validation is enforced in #JS-vK2EcYrV (validate-frontend-ui-configs.test.js).

**#for-zod-ui-validation** A typo in a config (missing required key) must not produce silent runtime errors on the client. Fail-fast at test time catches it before deployment.

### Reactive Reliability Gate (RRG)

RRG defines the fundamental reliability contract for the reactive layer.

1. **Single State Source**: Vue reactivity (`appStore`) must be clearly structured. State must not exist in multiple places simultaneously.
2. **Mutation Discipline**: Avoid uncontrolled state spread — e.g., manually synchronizing two independent variables instead of using `computed`. All mutations go through defined store setters.
3. **Async Contracts**: Async operations (data fetch, debounce) must have clearly defined loading/error state transitions.
4. **Reactivity Regression Checks**: RRG gate #JS-Yn27TZUx (check-frontend-rrg.test.js) enforces RRG-1 and RRG-2 on app/components and shared/components. AIS: id:ais-c4e9b2 (docs/ais/ais-rrg-contour.md).

**Enforcement commands**:
- `npm run frontend:reactivity:check` — runs RRG gate (id:ais-c4e9b2); scope: app/components, shared/components.
- `npm run frontend:smoke` — (optional) if a frontend smoke suite exists.

### Vue No-Build Architecture

The project uses Vue 3 loaded via a global `<script>` tag without bundlers (Vite/Webpack) to remain portable and functional over the `file://` protocol.

**Rules**:
- Templates are defined in separate JS files as strings (`app/templates/`).
- Module loading order is controlled by #JS-xj43kftu (module-loader.js).
- No bundler output, no dist/ directory — index.html is the deployment artifact directly.

**#for-file-protocol** No local Node.js server may be a UI dependency — GitHub Pages serves static files only. Cloudflare Worker proxy enables CORS bypass for both `file://` and `https://` without code changes.

### Hosting Compatibility Contract

The UI must be functional in two modes without code changes:
- `file://` (local, opened by double-clicking `index.html`)
- `https://aoponomarev.github.io/...` (GitHub Pages)

In both modes, external API calls subject to CORS should use Cloudflare Worker proxy by default. Exception: public read-only endpoints may use direct-first transport with proxy fallback when the proxy denies the domain by policy (allowlist/forbidden). No local Node.js server may be a dependency of the UI runtime.

### Tooltip System

**#for-tooltip-reactivity** Tooltips must be re-initialized or titles reactively bound so that language switches affect hover text immediately.

- **SSOT**: #JS-DR3gZC9b (tooltips-config.js)
- **Principle**: Use native browser tooltips (`title` attribute). HTML-based tooltips are forbidden.
- **Structure**: Static part from config + newline + dynamic part from #JS-Kg2tEBFr (tooltip-interpreter.js)
- **Usage**: `tooltipsConfig.getTooltip(key, lang)` or `tooltipInterpreter.getTooltip(key, { value, lang })`. Language is passed per call (stateless).
- **Constraints**: UTF-8 only, under 2000 chars, no HTML

### Counter Consistency Contract

When UI shows an action-oriented counter (for example "coins to apply into table"), it must be derived from the same effective dataset as the action itself (`#for-effective-count-parity`). Raw backend counters (`count_only`) are diagnostic and must not be presented as apply-result counters.

### Modal Action Manager

`cmp-modal` provides `modalApi` via provide/inject. Buttons register to appear in Header or Footer.

- **API**: `registerButton(id, config)`, `updateButton(id, updates)`, `removeButton(id)`
- **Layout**: Cancel footer left; Save/Action footer right; Close header right
- **Constraints**: Buttons MUST be removed in `beforeUnmount()`; check `modalApi` exists before calling

### Modal Shell Contract

Use one modal shell shape across the app (`#for-modal-shell-uniformity`):
- `<cmp-modal ...>` with explicit header slot: `modal-title` + `*-header-extra` container + `btn-close`.
- Body contains one focused body component with explicit props contract.
- If one body component serves several user scenarios, semantic differences must live in shell-level config (`title`, `description`, `helpText`) rather than in duplicated body components.
- Footer actions are managed by `modalApi` (register/update/remove), not by ad-hoc inline footer buttons.
- If modal is generated from registry (`registeredModals`), its shell must stay structurally identical to hand-written modals.

### Modal Open Reliability Checklist

Before adding a new modal trigger from `shared/components/*`, verify all four links:
- **Event bridge exists**: emitter (`eventBus.emit`) and subscriber (`eventBus.on`) are both implemented.
- **Modal ref exists**: `index.html` has `<cmp-modal ref="...">` matching the id used by opener logic.
- **State bridge exists**: payload from trigger is persisted in `app-ui-root` state and passed to modal body props.
- **No phantom button updates**: call `modalApi.updateButton()` only for ids that were previously `registerButton()`-ed.

### Composition Boundaries

Use **raw Bootstrap** (HTML + classes) for static layout. Create **Vue wrappers** only when dynamic logic is required (search/filter, async lists, complex state, 3+ reuse). Wrap items/logic, not necessarily the outer container — container should remain accessible to Bootstrap's native JS.

### Slot Contract Discipline

For wrapper components with defined slot contracts, follow those contracts strictly (`#for-component-slot-contracts`):
- For `cmp-dropdown`, menu items in `#items` should use `dropdown-menu-item` to keep consistent hover, auto-close behavior, touch tooltip support, and class policy.
- Avoid replacing slot items with ad-hoc raw Bootstrap nodes (`button.dropdown-item`) unless there is an explicit documented exception in AIS/skill.
- `cmp-dropdown` closes on outside click by default (`closeOnOutsideClick=true`); set `closeOnOutsideClick=false` only when the menu must stay open (e.g. multi-step flows).

### Header Selection Controls Contract

Header selectors are standardized through `cmp-button-group` radio mode (`#for-header-radio-group-contract`):
- MDN timeframe (`4h/8h/12h`), AGR method (`DCS/TSI/MPS`), and table display tabs must use one button-group contract.
- Responsive collapse to dropdown is part of this contract (`collapse-breakpoint`, dynamic label/labelShort).
- Color/active state logic should live in the button descriptors, not in scattered DOM conditionals.

### Portfolio Sync State Marker Contract

Conflict forks in shared portfolio selectors must use an explicit warning marker, not only the generic non-synced dimming (`#for-conflict-state-marker`).
- Minimum contract: visible badge/icon in the selector row plus a native tooltip explaining that the local copy was detached after multi-device divergence.
- If the user opens such a portfolio, the view modal should repeat the same state marker near the title so support/debug flows do not confuse it with the primary cloud-bound version.

### System Messages Contract

All system notifications are rendered via `cmp-system-messages` and scope filtering (`#for-message-scope-consistency`):
- Global splash lane uses `scope="global"` and horizontal scroll mode.
- Feature/test lanes use dedicated scopes (for example `test-messages`) instead of custom ad-hoc blocks.
- Message actions and lifecycle (dismiss, TTL, action handlers) must flow through `AppMessages`/`messagesConfig` contract.

### Legacy Reference Usage

`test.html` is a historical pattern source, not a strict runtime SSOT. Use it as a reference for intent and interaction archetypes, then map implementations to current wrapper contracts (`cmp-*`) before reusing fragments.

### Legacy Exceptions (Bare Bootstrap Radio/Checkbox)

The following files use bare Bootstrap radio/checkbox (`btn-check`, `form-check-input type="radio"`) instead of `cmp-button-group` radio mode. Migration deferred — risk mitigation; documented here as explicit exceptions.

| File | Control | Reason |
|------|---------|--------|
| #JS-kb2TGxgm (ai-api-settings-template.js) | Header tabs (github/yandex/postgres) via `btn-check` | Modal header icon tabs; Teleport + v-model; low traffic. |
| #JS-VNDFUVK2 (session-log-modal-body.js) | Filter (all/log/warn/error/info) via `btn-check` | Debug modal; level-specific colors; low risk. |
| #JS-Ri3c3bMt (portfolios-import-modal-body.js) | Mode (merge/replace) via `form-check-input type="radio"` | Form-style vertical layout; 2 options only. |
| #JS-ry3942o9 (V2_logic.js) | `model-pick` radio in showModelFailedModal | Vanilla JS modal; dynamically built HTML; legacy is/ layer. |

**Contract**: Each exception has an inline `// EXCEPTION:` comment referencing this section. Do not add new bare radio/checkbox without documenting here and adding the same comment.

### Column Visibility (CSS-Driven)

Toggling table columns without re-rendering. State in `columnVisibilityConfig`; mixin computes classes; CSS `display: none` on parent class. **Benefit**: Instant switching, preserves scroll position. Edge case: Bootstrap radio `@change` on hidden input fails in Vue — bind `@click` to `<label>` instead.

### Layout & Alignment

Use vertical padding on the **inner container** based on size class (e.g. `.component-responsive.size-sm > .inner-container`). Avoid fixed `height` or `line-height` for alignment. Horizontal spacing: Bootstrap utilities (`me-2`, `gap-3`); `gap-2` for button groups, `mb-3` for form fields. Sizing: `sm` (compact: tables, sidebars), `md` (default: forms, modals), `lg` (prominent: hero sections). File Map: `styles/wrappers/`, #JS-5n33791x (button.js).

### Responsive Visibility (Mobile-First)

Breakpoint: `576px` (Bootstrap `sm`). Visibility controlled via **CSS**, not JS — components render all elements, CSS hides based on viewport. Classes: `.label` (desktop), `.label-short` (mobile), `.icon` (always visible). Mobile default: `.label { display: none; }` `.label-short { display: block; }`. Desktop `@media (min-width: 576px)`: swap. Component props: `label`, `labelShort`, `icon`. File Map: `styles/wrappers/button.css`, #JS-5n33791x.

### Unified Component Library

**Generic (`cmp-*`)**: `cmp-button`, `cmp-dropdown`, `cmp-combobox`, `cmp-modal`, `cmp-modal-buttons`, `cmp-timezone-selector`. **App (`app-*`)**: `app-header`, `app-sidebar`, `app-footer`. All components MUST document in file header: `props`, `emits`, `slots`, `expose`. File Map: `shared/components/`, `shared/templates/`.

### DOM Markup & Hashing

**Auto-markup**: Mark significant containers with `avto-{Base58_8char}` for DevTools and agent visibility. Deterministic hash from DOM path; stable across reloads. Scope: major sections, headers, wrappers. Exclusions: inside Vue components, minor wrappers, elements with IDs. **Instance hashing**: `computed: { instanceHash }` from #JS-9m2N115w (hash-generator.js); usage `<div :class="['my-component', instanceHash]">`. **Layout sync**: #JS-pw26xFm7 (layout-sync.js) — `ResizeObserver` + `MutationObserver`; API `window.layoutSync.start()`, `.stop()`, `.update()`. Constraints: `avto-*` classes for identification ONLY, no functional CSS; hashing must be deterministic. File Map: #JS-1oAiR1jy (auto-markup.js), #JS-9m2N115w, #JS-pw26xFm7.
