---
id: sk-a17d41
title: "State, Events & Module Loading"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-05
reasoning_checksum: aea9aebd
last_change: ""

---

# State, Events & Module Loading

> **Context**: Defines the application's reactive state architecture, event communication pattern, and no-build module loading mechanism.
> **Scope**: `core/state/`, `core/events/`, #JS-xj43kftu (core/module-loader.js), #JS-os34Gxk3 (core/modules-config.js)

## Reasoning

- **#for-mutation-discipline** Uncontrolled mutation causes Reactive Reliability Gate (RRG) violations, producing unpredictable render orders. We enforce strict state ownership.
- **#for-module-registry** In our no-build `file://` architecture, the module registry explicitly guarantees load order to prevent silent `undefined` dependency failures.
- **#for-explicit-runtime-deps** In no-build mode, implicit globals are unsafe: modules and root components must explicitly declare every runtime dependency in #JS-os34Gxk3 (core/modules-config.js) (`deps` list). Missing deps can create intermittent startup behavior (component works, but integration client is not ready at first render).

---

## Core Rules

**Rule**: UI flags and metadata live in `core/state/`. Business data (portfolios, market prices) does NOT go into shared state — it lives in the cache layer or is passed directly between components.

| File | Owns |
|---|---|
| #JS-RX2UHzMh (core/state/ui-state.js) | Loading flags, auth status, tooltip language, cloud connection flags, cache metadata (e.g., `coinsCacheMeta.expiresAt`) |
| #JS-id3oaqeo (core/state/auth-state.js) | OAuth session: user info, token, login/logout status |
| #JS-gH2qNvcT (core/state/loading-state.js) | Per-operation loading indicators (prevents concurrent duplicate requests) |

**Mechanism**: All state objects are created with `Vue.reactive()`. Components subscribe reactively — no manual subscription management, no `EventEmitter` for state changes.

**Prohibited**:
```javascript
// BAD — local component variable that duplicates shared state
let isAuthLoading = false;

// BAD — two independent variables that must stay in sync manually
let authUser = null;
let isLoggedIn = false;
```

**Required**: One reactive state object; computed properties derive secondary values.

### 2. State Mutation Rules

- State is mutated only through explicit setter functions exposed by each state module (`uiState.set(path, value)`).
- Components never mutate state objects directly via property assignment outside of the state module.
- **#for-mutation-discipline** Uncontrolled mutation spread causes the RRG (Reactive Reliability Gate) violation — two components independently mutating the same field produce unpredictable render order.

### Event Bus (#JS-v8M9uv5A (core/events/event-bus.js))

The event bus handles **cross-component communication** that is not suitable for reactive state (one-time events, notifications, imperative triggers).

| Pattern | Use when |
|---|---|
| `Vue.reactive` state | Persistent state that components subscribe to |
| Event bus | One-shot events: "data loaded", "modal close request", "toast notification" |

**Anti-pattern**: Do not use the event bus as a state substitute — emitting an event and expecting consumers to hold the value is a disguised global variable.

### Module Loading (No-Build Architecture)

#JS-xj43kftu (core/module-loader.js) reads the ordered module registry from #JS-os34Gxk3 (core/modules-config.js) and dynamically injects `<script>` tags into `<head>` in dependency order.

**Load order contract**:
1. Libraries (Vue, etc.) — loaded first via `<script>` tags in `index.html`
2. Infrastructure (storage layers, cache config, paths) — loaded by module-loader, early in sequence
3. Config modules (`core/config/`) — after infrastructure, before domain
4. Domain / state / services — after config
5. UI components (`app/components/`) — last, after all dependencies are ready

**#for-module-registry** Without a bundler, the browser has no static dependency graph. The module registry is the only mechanism guaranteeing load order. A component loaded before its dependency will silently fail (`window.X is undefined`).

**Adding a new module**: Register it in #JS-os34Gxk3 (core/modules-config.js) at the correct position in the load sequence. Never rely on script tag order in `index.html` for non-library modules.

**Dependency discipline for root app**:
- `app-ui-root` must list integration clients it reads during `mounted()` or auth callbacks (for example cloud workspace/auth state clients).
- If a feature depends on `window.X` being present at startup, `X` must be in `deps`, not only in broad category ordering.

### Error Handling Integration

#JS-tWuXPtTi (core/errors/error-handler.js) and #JS-Sq2CfSP1 (core/errors/error-types.js) define the shared error taxonomy. All service-level errors must use these types — never throw raw `new Error('string')` from domain or service code.

#JS-fW36ebbg (core/observability/fallback-monitor.js) tracks provider fallback events (e.g., when primary data provider fails and secondary activates) for debugging and health monitoring.
