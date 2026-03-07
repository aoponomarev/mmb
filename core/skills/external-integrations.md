---
id: sk-7b4ee5
title: "External Integrations"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-07
reasoning_checksum: e845c465
last_change: ""

---

# External Integrations

> **Context**: Strategic integration of external services (Yandex Cloud, Cloudflare, GitHub) to ensure high availability, performance, and fault tolerance.
> **Scope**: core/api/, #JS-tn3fo2px (app-config.js)

## Reasoning

- **#for-integration-fallbacks** Relying on a single external provider creates a single point of failure. Implementing fallback chains (e.g., Active-Passive or Fallback Chain) ensures that if a primary provider (like an AI API or a proxy) goes down, the system automatically switches to a secondary provider without breaking the user experience.
- **#for-geo-optimization** Different cloud providers have different regional strengths. Routing requests based on geography (e.g., Yandex Cloud for RU/CIS users, Cloudflare for the rest of the world) minimizes latency and complies with regional data localization policies.
- **#for-endpoint-coherence** Authentication and user settings/workspace APIs must use the same backend domain contract for a given feature. Mixed origins (e.g., auth via one worker and settings via another) can produce false-positive writes and missing readback.

## Core Rules

1.  **Fault Tolerance by Default:**
    All new features relying on external services must implement a seamless fallback mechanism.
    - If the primary provider is unavailable, automatically switch to the secondary.
    - If the secondary is unavailable, fallback to a tertiary or local mock.
2.  **Centralized Integration Management:**
    Do not hardcode fallback logic in individual components. Use a centralized `IntegrationManager` or configuration (#JS-tn3fo2px) to define the active provider and fallback chain.
3.  **Geographic Optimization:**
    When configuring endpoints, prefer Yandex Cloud (Cloud Functions, API Gateway) for low-latency access within RU/CIS, and Cloudflare (Workers, Pages) for global edge-computing distribution.
4.  **Endpoint Coherence for Stateful APIs:**
    For stateful user data (settings/workspace/session-bound data), read/write/readback must target the same worker origin and namespace contract. Always verify with immediate readback after save in debugging scenarios.

### API Proxy (CORS Bypass & Caching)

**Context**: CORS bypass and response caching at the Edge. Allows `file://` frontend to access external APIs by routing through Cloudflare Worker that adds CORS headers and hides API keys.

**Supported routes**: `GET /api/coingecko/*` → api.coingecko.com; `GET /api/yahoo-finance/*` → query1.finance.yahoo.com; `GET /api/stooq/*` → stooq.com.

**Caching (KV)**: CoinGecko markets 5 min; list 24h; simple price 1 min; Yahoo/Stooq Charts 1h.

**Hard constraints**: Whitelist only — generic proxy must validate target URLs against strict whitelist; strip sensitive headers (Cookies, Auth) before forwarding.

### External Strategy Overview

**Core principles**: On-demand — integrate only what is necessary; Resilience — every cloud service must have local or secondary fallback; Geo-selection — Yandex for CIS, Cloudflare for Global Edge.

**Current stack**: Auth (Google OAuth via Workers); AI (YandexGPT primary + Perplexity fallback); Data (CoinGecko + Yahoo Finance); Storage (D1 + OneDrive).

**Hard constraints**: No vendor lock-in — business logic provider-agnostic via BaseProvider; secrets hygiene — no API keys in code, use `.env` and Wrangler Secrets.

### News Intelligence Pipeline

**Context**: Automated collection and sentiment analysis of news.

**Pipeline**: Fetch (RSS/sources) → Filter (AI removes noise) → Score (sentiment -1.0 to +1.0) → Store (news-queue).

**Rules**: Source weight — official > Tier 1 > influencers; deduplication — group similar stories.

**Hard constraints**: No FOMO — flag sensationalist language, reduce impact; verification — high-impact requires 2+ independent sources.
## Contracts

- **Single Source of Truth**: All integration keys, URLs, and feature flags must be stored in core/config/ (#JS-tn3fo2px, integration-config при наличии).
- **Monitoring**: The integration layer must log when a fallback occurs so the system health can be monitored without disrupting the user.
