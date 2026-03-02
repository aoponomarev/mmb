---
title: "Cloudflare Infrastructure"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "00cb3c5a"
---

# Cloudflare Infrastructure

> **Context**: The architectural rules for Cloudflare Workers, KV caching, D1 databases, and the OAuth flow.
> **Scope**: `cloud/cloudflare/workers/*`, `core/api/cloudflare/*`

## Reasoning

- **#for-oauth-postmessage** Browsers strictly block automatic redirects from HTTPS (Google OAuth) to `file://` URIs for security reasons. To bypass this, the OAuth flow must be opened in a popup (`window.open`), and the Worker must return an HTML page that uses `window.opener.postMessage` to send the token back to the local static app.
- **#for-cloudflare-kv-proxy** External APIs (CoinGecko, Yahoo) block `file://` origins via CORS. A Cloudflare Worker acts as a proxy to inject correct CORS headers. Backing this proxy with KV storage prevents rapid rate-limit exhaustion from multiple clients.
- **#for-d1-schema-migrations** D1 is a serverless SQLite database. Manual schema mutations in production are forbidden. All changes must be tracked in SQL migration files and applied deterministically via Wrangler.

## Core Rules

1.  **OAuth on `file://` Protocol:**
    Do not attempt to use standard `window.location.href` redirects for OAuth when the app is running locally. Always use the `auth-client.js` popup mechanism.
    The Worker endpoint (`src/auth.js`) must detect the `file://` origin in the state and return the `postMessage` HTML payload instead of a 302 redirect.
2.  **Worker Proxying:**
    All external API requests from the UI when running on `file://` MUST go through the Cloudflare Worker proxy (`cloudflareConfig.getApiProxyEndpoint`).
3.  **D1 Migrations:**
    Database schema changes must be placed in `cloud/cloudflare/workers/migrations/`. Apply them using `wrangler d1 migrations apply`.
4.  **Secrets Management:**
    Never commit `.env` or `wrangler.toml` files containing real API tokens or Client Secrets. Use `wrangler secret put` for production and `.dev.vars` for local development.

## Contracts

- **Worker Structure**: The Worker code must remain modular (`src/index.js`, `src/auth.js`, `src/utils/`). Do not bundle everything into a single massive file.
- **CORS Headers**: The Worker must consistently return `Access-Control-Allow-Origin: *` for all proxy and API endpoints.
