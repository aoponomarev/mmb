# Cache Layer Architecture

> **Scope**: `core/cache/`
> **Context**: Defines the multi-tier browser cache system that persists market data, user settings, and UI state across sessions.

## 1. Three-Tier Storage Model

The cache operates across three named layers managed by `core/cache/storage-layers.js`:

| Layer | Storage backend | Used for |
|---|---|---|
| **hot** | `localStorage` | Frequently accessed, small payloads (UI state, settings, favorites) |
| **warm** | `localStorage` (extended) | Market data, coin lists — medium TTL |
| **cold** | `IndexedDB` | Large datasets, icons cache, time-series history |

The `cacheManager` abstracts all three layers behind a single API. Callers use a key name; the layer is resolved automatically by `storageLayers.getLayerForKey(key)`.

## 2. Key Versioning Contract

Cache keys fall into two categories:

**Versioned** (auto-invalidated on app version change) — keys whose data structure depends on an external API's response format:
- `icons-cache`, `coins-list`, `api-cache`, `market-metrics`, `crypto-news-state`, `stablecoins-list`

**Unversioned** (persisted across updates) — user-owned data and UI state:
- `settings`, `portfolios`, `strategies`, `time-series`, `history`, `theme`, `timezone`, `favorites`, `yandex-api-key`

**Mechanism**: Versioned keys are stored as `v:{versionHash}:{key}`. The hash comes from `appConfig.getVersionHash()`. On app update, old-version keys become orphans; `cacheManager.clearOldVersions()` purges them.

**Reasoning**: External API data format changes (e.g., CoinGecko adds/removes fields) must invalidate cached data automatically, without manual intervention. User data must survive updates — it uses schema migrations instead.

## 3. Schema Migrations

`core/cache/cache-migrations.js` handles forward-migration of cached data when the in-code schema version is higher than the stored `cached.version`. This applies only to unversioned keys (user data).

On `cacheManager.get()`: if `cached.version` is present and migrations are available, the data is migrated before being returned to the caller. The migrated form is written back immediately.

## 4. TTL (Time-To-Live)

TTL per key is defined in `core/cache/cache-config.js`. On `set()`, `expiresAt = Date.now() + ttl` is stored. On `get()`, expired entries are deleted and `null` is returned (cache miss).

`cacheManager.set(key, value, { ttl: 86400000 })` — caller can override TTL explicitly.

## 5. Public API (`window.cacheManager`)

| Method | Signature | Description |
|---|---|---|
| `get` | `(key, options?) → Promise<any\|null>` | Fetch with TTL check + migration |
| `set` | `(key, value, options?) → Promise<bool>` | Store with layer + version resolution |
| `has` | `(key, options?) → Promise<bool>` | Key existence check |
| `delete` | `(key, options?) → Promise<bool>` | Remove from resolved layer |
| `clear` | `(layer?) → Promise<bool>` | Clear one layer or all |
| `clearOldVersions` | `() → Promise<number>` | Purge orphaned versioned keys |

## 6. Module Load Order

`storage-layers.js` and `cache-config.js` must be loaded before `cache-manager.js`. `cache-migrations.js` is optional (checked at runtime).

## 7. File Map

| File | Responsibility |
|---|---|
| `core/cache/storage-layers.js` | Layer definitions, key-to-layer routing |
| `core/cache/cache-config.js` | TTL, version, and layer config per key |
| `core/cache/cache-manager.js` | Unified read/write API — the only entry point |
| `core/cache/cache-migrations.js` | Schema migration handlers for versioned user data |
| `core/cache/cache-indexes.js` | Index structures for bulk lookups |
| `core/cache/cache-cleanup.js` | Utility for purging stale / old-version entries |
| `core/cache/data-cache-manager.js` | Server-side filesystem cache (Node.js `fs`, used by backend providers) |
