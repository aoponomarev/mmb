---
title: "Config Layer & SSOT Governance"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "9760a656"
id: sk-02d3ea

---

# Config Layer & SSOT Governance

> **Context**: Defines how application configuration is structured, where each type of config lives, and how SSOT is enforced across the config layer.
> **Scope**: `core/config/`

## Reasoning

- **#for-hardcode-ban** `core/config/` is the strict SSOT for UI strings, numbers, and settings. Hardcoded configuration in components leads to untrackable maintenance drift.
- **#for-zod-ui-validation** Validating these config files against Zod schemas catches typos at test time instead of generating silent runtime `undefined` errors.
- **#for-module-registry** In our bundler-less `file://` architecture, the module registry config guarantees exact load order so dependencies are always available.

---

## Contracts

`core/config/` is the **only** place where application-level configuration is defined. All other modules read from config objects — they never define configuration inline.

**Prohibited pattern**:
```javascript
// BAD — hardcoded config scattered in component code
const MODAL_TITLE = 'Edit Portfolio';
const TOOLTIP_TEXT = 'Click to refresh data';
```

**Required pattern**:
```javascript
// GOOD — always read from centralized SSOT
const title = window.modalsConfig.getModalTitle('portfolio-edit');
const text = window.tooltipsConfig.get('refresh-data');
```

### Config File Responsibilities

| File | What it defines |
|---|---|
| `app-config.js` | App version, version hash (used for cache key versioning), global flags |
| `api-config.js` | External API endpoints, timeouts, retry policies |
| `cloudflare-config.js` | Cloudflare Worker URLs, proxy endpoints (`getApiProxyEndpoint()`) |
| `coins-config.js` | Default coin sets, filtering rules, stablecoin exclusion lists |
| `data-providers-config.js` | Which data providers are active, their priority order and fallback chain |
| `modals-config.js` | Modal metadata: ID → { title, size, component }. SSOT for all modal titles |
| `tooltips-config.js` | Tooltip text by key. SSOT for all user-visible tooltip strings |
| `messages-config.js` | Toast and system message templates by key |
| `models-config.js` | Math model registry: active model ID, model parameters, weight formulas |
| `portfolio-config.js` | Portfolio domain compatibility facade (bridges legacy callers to `core/domain/`) |
| `auth-config.js` | OAuth provider settings (Google), token handling rules |
| `postgres-config.js` | Yandex Cloud PostgreSQL connection parameters |
| `workspace-config.js` | Persistent user workspace state: activeModelId, activeCoinSetIds, mainTable, metrics. SSOT for all workspace reads/writes. |
| `menus-config.js` | Navigation menu structure |
| `i18n-config.js` | Internationalization locale mappings |

### Zod Validation Contract

UI-facing configs (`modals-config.js`, `tooltips-config.js`) are validated against Zod schemas in `core/contracts/ui-contracts.js`.

The validation runs in `is/scripts/tests/validate-frontend-ui-configs.test.js`. A missing required key or wrong type causes a **test failure** — not a silent runtime defect.

**#for-zod-ui-validation** Config typos surface in production as blank tooltips, broken modals, or silent UI failures. Validating the config shape before deployment catches this at zero cost.

### `cloudflare-config.js` — The Proxy Gateway

`cloudflareConfig.getApiProxyEndpoint(path)` is the **single point of truth** for constructing Cloudflare Worker proxy URLs. All frontend API calls that need CORS bypass or auth headers must go through this method.

This is the key enabler of Zero-Config Portability: the same method returns the correct URL in both `file://` and `https://` runtime modes. See `app/skills/file-protocol-cors-guard.md`.

### Schema Migrations (`messages-migrations.js`)

`core/config/messages-migrations.js` handles forward-migration of persisted message formats in the cache when the schema version advances. Works in conjunction with `core/cache/cache-migrations.js`.

### `modules-config.js` — Module Load Registry

`core/modules-config.js` (at root of `core/`) defines the **ordered list of all JS modules** that must be loaded before the app initializes. `core/module-loader.js` reads this registry and injects `<script>` tags in dependency order.

**#for-module-registry** Without a bundler, the browser has no static dependency graph. The module registry is the only mechanism guaranteeing load order. A component loaded before its dependency will silently fail (`window.X is undefined`).

### Workspace Config (Persistent User State)

`core/config/workspace-config.js` manages **persistent user workspace state** that survives page reloads:

- `activeModelId` — current math model (e.g. `'Median/AIR/260101'`).
- `activeCoinSetIds` — array of active coin IDs displayed in the main table.
- `mainTable` — table presentation: `selectedCoinIds`, `sortBy`, `sortOrder`, `coinSortType`, `showPriceColumn`.
- `metrics` — calculation parameters: `horizonDays`, `mdnHours`, `activeTabId`, `agrMethod`.

**Storage contract**: Primary `cacheManager.get/set('workspaceConfig')` (IndexedDB); fallback `localStorage` key `'workspaceConfig'` when cacheManager is unavailable. Both hold the same JSON structure.

**API**: `saveWorkspace(patch)` — merges partial update, writes to both layers. `loadWorkspace()` — reads cacheManager first, falls back to localStorage. `mergeWorkspace(partial)` — deep-merge utility.

**Rules**: (1) All components MUST read/write workspace via `workspaceConfig` methods. (2) Always use `saveWorkspace({ field: value })`, never replace the entire object. (3) After saving to cacheManager, always write a parallel copy to localStorage for fallback resilience.

### Lib Loader (External Dependencies)

Lib loading is governed by `process-lib-governance`. `core/lib-loader.js` holds `LIB_SOURCES` — the SSOT for library versions. Directory structure: `libs/vue/`, `libs/chartjs/`, `libs/assets/`. Load priority: GitHub Pages (primary for Web) → CDN (backup) → Local `file://` (primary for Dev/Offline). Usage: `await window.libLoader.load('vue', '3.4.0')`. Version lock in `LIB_SOURCES` is mandatory; the browser cannot write to disk — user must run `download-libs.sh` for offline support.

### Settings Sync (Development Environment)

**Context**: Unified sync of development environment settings (Cursor, Continue, Git, Terminal) between machines via cloud storage. SSOT: `INFRASTRUCTURE_CONFIG.yaml` for paths and profiles *(file created when settings sync is deployed; may not exist yet)*.

**What gets synced**: Cursor (settings.json, keybindings.json); Continue (config.yaml); Git (.gitconfig); Project (.cursorrules, .cursor/rules). **Commands**: `backup` (Local → Cloud) at session end; `restore` (Cloud → Local) only when requested.

**Agent protocol**: Session end — run backup, confirm "Cloud SSOT updated"; Session start — restore only if explicitly requested. **Safety**: Backup before overwrite; structure validation; no destructive operations.
