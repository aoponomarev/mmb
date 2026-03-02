---
title: "Data Providers Architecture"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "7076d8b9"
---

# Data Providers Architecture

> **Context**: The architectural rules for integrating, managing, and falling back between various market data providers (e.g., CoinGecko, PostgreSQL/Yandex Cache).
> **Scope**: `core/api/data-providers/*`, `core/api/data-provider-manager.js`

## Reasoning

- **#for-data-provider-interface** A unified interface (extending `BaseProvider`) ensures that the orchestrator (`DataProviderManager`) does not need to know the specific fetching, parsing, or ratelimiting details of individual providers.
- **#for-dual-channel-fallback** Relying solely on external APIs (like CoinGecko) exposes the application to strict rate limits and downtime. A dual-channel fetch mechanism (PostgreSQL primary + CoinGecko fallback) guarantees data availability and speed while minimizing external API usage.

## Core Rules

1.  **Unified Provider Interface:**
    All data providers must extend from a base class or implement a strict contract (e.g., `getCoinData`, `getGlobalMetrics`). They are responsible for their own mapping to the application's internal data formats.
2.  **Dual-Channel Fallback Mechanism:**
    The `DataProviderManager` implements a `getCoinDataDualChannel` strategy. It must first attempt to fetch data from the fast/internal primary source (e.g., Yandex Cache/PostgreSQL). Any missing IDs are then fetched from the fallback source (e.g., CoinGecko).
3.  **No Hardcoded `fetch` in Components:**
    UI components must never call `fetch` directly for market data. All requests must go through `window.dataProviderManager` or appropriate service layers.
4.  **Isolated Storage of API Keys and Caches:**
    API keys and cached responses must be stored separately for each provider to prevent key collision and ensure that clearing one provider's cache doesn't destroy another's.

## Contracts

- **Fail-Fast in Providers**: Individual providers must fail fast and explicitly throw errors (like `BackendCoreError`) when they hit hard limits. They should not internally fallback to another provider; the fallback orchestration belongs strictly to `DataProviderManager`.
