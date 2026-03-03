---
title: "State, Events & Module Loading"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "7273b1e9"
id: sk-a17d41

---

# State, Events & Module Loading

> **Context**: Defines the application's reactive state architecture, event communication pattern, and no-build module loading mechanism.
> **Scope**: `core/state/`, `core/events/`, `core/module-loader.js`, `core/modules-config.js`

## Reasoning

- **#for-mutation-discipline** Uncontrolled mutation causes Reactive Reliability Gate (RRG) violations, producing unpredictable render orders. We enforce strict state ownership.
- **#for-module-registry** In our no-build `file://` architecture, the module registry explicitly guarantees load order to prevent silent `undefined` dependency failures.

---

## Core Rules

**Rule**: UI flags and metadata live in `core/state/`. Business data (portfolios, market prices) does NOT go into shared state — it lives in the cache layer or is passed directly between components.

| File | Owns |
|---|---|
| `core/state/ui-state.js` | Loading flags, auth status, tooltip language, cloud connection flags, cache metadata (e.g., `coinsCacheMeta.expiresAt`) |
| `core/state/auth-state.js` | OAuth session: user info, token, login/logout status |
| `core/state/loading-state.js` | Per-operation loading indicators (prevents concurrent duplicate requests) |

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

### Event Bus (`core/events/event-bus.js`)

The event bus handles **cross-component communication** that is not suitable for reactive state (one-time events, notifications, imperative triggers).

| Pattern | Use when |
|---|---|
| `Vue.reactive` state | Persistent state that components subscribe to |
| Event bus | One-shot events: "data loaded", "modal close request", "toast notification" |

**Anti-pattern**: Do not use the event bus as a state substitute — emitting an event and expecting consumers to hold the value is a disguised global variable.

### Module Loading (No-Build Architecture)

`core/module-loader.js` reads the ordered module registry from `core/modules-config.js` and dynamically injects `<script>` tags into `<head>` in dependency order.

**Load order contract**:
1. Libraries (Vue, etc.) — loaded first via `<script>` tags in `index.html`
2. Infrastructure (storage layers, cache config, paths) — loaded by module-loader, early in sequence
3. Config modules (`core/config/`) — after infrastructure, before domain
4. Domain / state / services — after config
5. UI components (`app/components/`) — last, after all dependencies are ready

**#for-module-registry** Without a bundler, the browser has no static dependency graph. The module registry is the only mechanism guaranteeing load order. A component loaded before its dependency will silently fail (`window.X is undefined`).

**Adding a new module**: Register it in `core/modules-config.js` at the correct position in the load sequence. Never rely on script tag order in `index.html` for non-library modules.

### Error Handling Integration

`core/errors/error-handler.js` and `core/errors/error-types.js` define the shared error taxonomy. All service-level errors must use these types — never throw raw `new Error('string')` from domain or service code.

`core/observability/fallback-monitor.js` tracks provider fallback events (e.g., when primary data provider fails and secondary activates) for debugging and health monitoring.
