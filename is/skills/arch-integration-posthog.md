---
id: sk-8e5f6a
title: "Integration: PostHog (Product Analytics)"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-10
reasoning_checksum: e5961b83
last_change: ""
related_skills:
  - sk-5cd3c9
  - sk-d76b68
related_ais:
  - ais-775420

---

# Integration: PostHog (Product Analytics)

> **Context**: PostHog MCP and Cursor plugin for product analytics, feature flags, A/B experiments. Aligns with Edge Analytics roadmap.
> **Scope**: app (event capture), core/config (feature flag reads), is/cloudflare (future Edge Analytics). Cursor rule: `.cursor/rules/infra-posthog.mdc`.

## Reasoning

- **#for-product-analytics** PostHog provides product usage, feature adoption, experiments. MCP runs on Cloudflare Workers — fits our edge infra.
- **#for-observability** Complements id:sk-92384e (local) and id:sk-7f4e5d (Sentry errors). PostHog = user behavior and feature rollout.
- **#for-ai-tooling-abstraction** MCP tools: "What are my most common errors?", "Add feature flag for X" — natural language over API.

## Core Rules

1. **Event naming:** `snake_case`, domain-prefixed: `portfolio_created`, `market_cache_refreshed`, `ai_provider_switched`.
2. **Feature flags:** Align with id:ais-775420 — flags for Cloudflare vs Yandex transport features; never mix domains in one flag.
3. **LLM analytics:** PostHog tracks AI costs — map to AIProviderManager (id:sk-d76b68) providers.
4. **Roadmap link:** id:sk-5cd3c9 "Edge Analytics (tracking API usage per user)" — PostHog complements.

## Contracts

- **MCP:** `https://mcp.posthog.com/mcp` (remote). Auth via Cursor plugin UI.
- **EU/self-hosted:** `POSTHOG_BASE_URL` env for custom instance.
- **SSOT:** id:ais-775420, id:sk-5cd3c9 (Cloudflare roadmap), id:sk-d76b68 (AI providers), core/config/*. Cursor rule: `.cursor/rules/infra-posthog.mdc`.
