---
id: sk-5cd3c9
title: "Cloudflare Infrastructure"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-09
reasoning_checksum: 61fc2879
last_change: ""

---

# Cloudflare Infrastructure

> **Context**: The architectural rules for Cloudflare Workers, KV caching, D1 databases, and the OAuth flow.
> **Scope**: Edge API Worker (is/cloudflare/edge-api/), core/config (cloudflare, auth)

## Reasoning

- **#for-oauth-postmessage** Browsers strictly block automatic redirects from HTTPS (Google OAuth) to `file://` URIs for security reasons. To bypass this, the OAuth flow must be opened in a popup (`window.open`), and the Worker must return an HTML page that uses `window.opener.postMessage` to send the token back to the local static app.
- **#for-cloudflare-kv-proxy** External APIs (CoinGecko, Yahoo) block `file://` origins via CORS. A Cloudflare Worker acts as a proxy to inject correct CORS headers. Backing this proxy with KV storage prevents rapid rate-limit exhaustion from multiple clients.
- **#for-d1-schema-migrations** D1 is a serverless SQLite database. Manual schema mutations in production are forbidden. All changes must be tracked in SQL migration files and applied deterministically via Wrangler.

## Core Rules

1.  **OAuth on `file://` Protocol:**
    Do not attempt to use standard `window.location.href` redirects for OAuth when the app is running locally. Always use the `auth-client.js` popup mechanism.
    The Worker endpoint (OAuth handler в Edge API) must detect the `file://` origin in the state and return the `postMessage` HTML payload instead of a 302 redirect.
2.  **Worker Proxying:**
    All external API requests from the UI when running on `file://` MUST go through the Cloudflare Worker proxy (`cloudflareConfig.getApiProxyEndpoint`).
3.  **D1 Migrations:**
    Database schema changes must be placed in the Edge API migrations folder and applied using `wrangler d1 migrations apply`.
4.  **Secrets Management:**
    Never commit `.env` or `wrangler.toml` files containing real API tokens or Client Secrets. Use `wrangler secret put` for production and `.dev.vars` for local development.

### Cloudflare Core (Infrastructure Map)

**Context**: Edge infrastructure for API Proxy, Auth, Settings, State. SSOT: #JS-4r2GQb12 (cloudflare-config.js).

**Infrastructure**: Workers (logic); D1 (Users, Portfolios, Coin Sets); KV — `API_CACHE` (ephemeral), `SETTINGS` (persistent app settings). Migration scripts are stored in `is/cloudflare/edge-api/migrations` (legacy donor path in path-contracts.js SKIP_LINK_PATTERNS).

**Route map**: auth/*, api/portfolios/*, api/coin-sets/*, api/datasets/*, api/coingecko/*, api/yahoo-finance/*, api/stooq/*, api/proxy, api/settings, health (HTTP routes, not file paths; legacy API route notation in prose only; skip in path-contracts.js).

**Component bindings**: D1, API_CACHE, SETTINGS, GOOGLE_CLIENT_SECRET, JWT_SECRET, SETTINGS_TOKEN.

**KV cache key limit (critical)**: 512-byte limit. Hash query strings via SHA-256 when key >480 bytes. Format: short keys readable; long keys `api-cache:coingecko:/coins/markets?h=<sha256hex>`. Symptoms: Worker 500 with "KV GET failed: 414 UTF-8 encoded length exceeds 512"; affects /coins/markets?ids= (HTTP route). Prevention: test with max-size requests; use `X-Cache-Key` header for debugging.

**Security**: Generic proxy whitelist only; Settings require `Authorization: Bearer <token>`.

**Deployment**: `npx wrangler deploy`; auth via OAuth token.

### Cloudflare Roadmap (Edge Infrastructure)

**Context**: Status of Edge infrastructure integration. SSOT: см. arch-cloudflare-infrastructure.md.

**Completed phases**: Infrastructure (Workers, D1, KV); Auth (Google OAuth 2.0); Proxy (CoinGecko/Yahoo); Storage (Portfolios CRUD via D1).

**Pending phases**: R2 Storage (object storage for datasets, requires payment method); Edge Analytics (tracking API usage per user).

**Hard constraint**: Local-First Fallback — app must remain functional via `localStorage` if Cloudflare is unreachable.

### Auth Worker Deployment (OAuth Restore)

**Context**: Protocol for deploying or restoring the Cloudflare Worker responsible for OAuth. Scope: secrets management, bindings verification, deployment.

**Prerequisites**: Wrangler CLI authenticated; Account ID; `GOOGLE_CLIENT_SECRET` and `JWT_SECRET` ready.

**Steps**: (1) Verify bindings in `is/cloudflare/edge-api/wrangler.toml` (legacy path in path-contracts.js); (2) `wrangler secret put GOOGLE_CLIENT_SECRET` and `JWT_SECRET`; (3) `wrangler deploy` from `is/cloudflare/edge-api`; (4) Health check via `health` route (HTTP route; skip in path-contracts.js).

**Client config**: Update #JS-Uf4GZ4Qq (auth-config.js) with correct `clientId` and `redirectUri`.

### Cloud Functions (Yandex / Serverless Parity)

**Context**: When using Yandex Cloud Functions for API proxying (e.g. YandexGPT). Runtime: Node.js 18+.

**Rules**: Use native `fetch()`; respond to OPTIONS with 204 and CORS headers; read secrets from `process.env`; validate `modelUri` and `messages` before forwarding.

**CORS pattern**: OPTIONS → 204, Access-Control-Allow-Origin: *, Allow-Methods: POST OPTIONS, Allow-Headers: Content-Type Authorization.

**Constraints**: Function set to Public in console; timeout 30s for LLM latency.

### Yandex IAM Binding (PermissionDenied)

**Context**: `PermissionDenied` when deploying Cloud Functions. Role must be assigned to the **Folder**, not just the Service Account.

**Fix**: `yc resource-manager folder add-access-binding <folder-id> --role editor --subject serviceAccount:<sa-id>`. Validate via "Access Bindings" tab in Yandex Console.

### Yandex CORS (file:// Mode)

**Context**: "Preflight request failed" errors. Checklist: (1) Function must be Public; (2) Code MUST handle `httpMethod === 'OPTIONS'` and return 200 with headers; (3) `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: Content-Type, Authorization`.

**file:// mode**: MBB runs from `index.html` directly (`origin = null`). Detect `window.location.protocol === 'file:'` before direct external fetch; skip CORS-restricted direct call; use proxy/server endpoint or safe fallback so UI rendering does not break.

### Yandex Function Deployment (yandexgpt-proxy)

**Context**: Step-by-step guide for deploying Yandex Cloud Functions. Setup: Create Function in Console; Runtime Node.js 22; paste code; add `YANDEX_API_KEY`; Memory 128MB, Timeout 30s; enable "Public function". Verification: `curl -X POST https://functions.yandexcloud.net/... -H "Content-Type: application/json" -d '{"messages":[...]}'`. Troubleshooting: 403 → Public toggle ON; 504 → increase timeout; CORS → check OPTIONS handling.

### Yandex API Key Retrieval

**Context**: Obtaining credentials for Yandex Cloud. Procedure: IAM → Service Account → Create API Key; copy immediately (shown once). Usage: add to `.env` as `YANDEX_API_KEY`; add to Function env vars. Security: if leaked, delete and rotate; if lost, create new (old keys unrecoverable).

### Yandex coins-db-gateway Function (PostgreSQL Gateway)

**Context**: Deploying `coins-db-gateway` Cloud Function requires YC CLI with OAuth. Deploy: authenticate via OAuth token; build ZIP; run `yc serverless function version create` with `--source-path`; preserve DB credentials from the active version. Do not trust stale repo defaults for production DB selection. If an optional env value is empty, omit it from the deploy command instead of sending an empty string. Verification for HTTP behavior must be performed through the real API Gateway URL, because direct `yc serverless function invoke` can produce false-negative 404 results when the event shape does not match API Gateway transport. **Critical rule:** The function MUST be made public via `yc serverless function allow-unauthenticated-invoke`, otherwise API Gateway will return silent 502 Bad Gateway errors. Related causalities: `#for-cloud-env-readback`, `#for-no-empty-cloud-env`, `#for-transport-shape-verification`, `#for-yc-public-invoke`.

### Yandex coingecko-fetcher Function (Coin Market Ingest)

**Context**: `coingecko-fetcher` is a timer-driven ingest function. Current deployment model: two independent timer triggers (`:00` for `market_cap`, `:30` for `volume`), one top-250 request per invocation, no long internal sleep chain. Preserve the production DB env contract from the live Yandex function version. Post-deploy verification: manual invoke should return `coins_fetched: 250`; downstream `GET /api/coins/market-cache?count_only=true` should expose fresh `fetched_at`. Related causalities: `#for-serverless-short-runs`, `#for-trigger-minute-routing`, `#for-cloud-env-readback`.

## Contracts

- **Worker Structure**: The Worker code must remain modular (entrypoint, auth handler, utils) in `is/cloudflare/edge-api/src/{index.js,auth.js,utils/}`. Legacy local paths (`src/index.js`, etc.) are in path-contracts.js SKIP_LINK_PATTERNS.
- **CORS Headers**: The Worker must consistently return `Access-Control-Allow-Origin: *` for all proxy and API endpoints.
