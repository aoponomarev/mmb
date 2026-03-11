/**
 * #JS-1n3NPbwx
 * @description Composition root for the backend market subsystem. Assembles all dependencies.
 * @skill id:sk-bb7c8e
 * @causality #for-composition-root
 */

import { createDataProviderManager } from "./providers/backend-data-provider-manager.js";
import { createCoinGeckoProvider } from "./providers/coingecko-provider.js";
import { createDataCacheManager } from "../cache/data-cache-manager.js";
import { createMarketDataService } from "./market-data-service.js";
import { createMarketMetricsService } from "./market-metrics-service.js";
import { createMarketSnapshotService } from "./market-snapshot-service.js";
import { createBinanceMetricsProvider } from "./providers/binance-metrics-provider.js";
import { createMarketSnapshotTransport } from "./market-snapshot-transport.js";
import { createMarketSnapshotHttpHandler } from "./market-snapshot-http.js";

function createApiKeyResolver(apiKeys = {}) {
  return (providerName) => {
    if (!providerName) return "";
    const key = apiKeys[providerName];
    return typeof key === "string" ? key : "";
  };
}

function resolveFetchFn(fetchFn) {
  const candidate = typeof fetchFn === "function" ? fetchFn : globalThis.fetch;
  if (typeof candidate !== "function") {
    throw new Error("fetch is unavailable");
  }
  if (typeof window !== "undefined" && typeof window.fetch === "function" && candidate === window.fetch) {
    return window.fetch.bind(window);
  }
  return (...args) => candidate(...args);
}

export function createBackendMarketRuntime(params = {}) {
  const fetchFn = resolveFetchFn(params.fetchFn);
  const timeoutMs = Number.isFinite(params.timeoutMs) ? Math.max(1, Math.floor(params.timeoutMs)) : 10_000;
  const marketTtlMs = Number.isFinite(params.marketTtlMs) ? Math.max(1, Math.floor(params.marketTtlMs)) : 60 * 60 * 1000;
  const metricsTtl = params.metricsTtl || {};

  const providerManager = createDataProviderManager({
    defaultProvider: "coingecko",
    apiKeyResolver: createApiKeyResolver(params.apiKeys || {}),
  });
  
  providerManager.registerProvider(createCoinGeckoProvider({
    fetchFn,
    timeoutMs,
    minIntervalMs: params.minIntervalMs,
    maxAttempts: params.maxAttempts,
    retryBaseDelayMs: params.retryBaseDelayMs,
  }));

  const marketDataCache = createDataCacheManager({
    namespace: params.marketDataCacheNamespace || "market-data",
    defaultTtlMs: marketTtlMs,
  });
  
  const marketMetricsCache = createDataCacheManager({
    namespace: params.marketMetricsCacheNamespace || "market-metrics",
    defaultTtlMs: marketTtlMs,
  });

  const marketDataService = createMarketDataService({
    providerManager,
    cache: marketDataCache,
    marketTtlMs,
  });

  const marketMetricsService = createMarketMetricsService({
    fetchFn,
    binanceProvider: createBinanceMetricsProvider({ fetchFn, timeoutMs }),
    cache: marketMetricsCache,
    timeoutMs,
    ttl: metricsTtl,
  });

  const marketSnapshotService = createMarketSnapshotService({
    marketDataService,
    marketMetricsService,
  });
  
  const marketSnapshotTransport = createMarketSnapshotTransport({
    snapshotService: marketSnapshotService,
  });
  
  // @causality #for-readiness-probe
  const readinessProbe = async () => {
    const result = await marketSnapshotTransport.handleGetSnapshot({
      topCount: "1",
      sortBy: "market_cap",
    });
    return result.status === 200;
  };
  
  const marketSnapshotHttpHandler = createMarketSnapshotHttpHandler({
    transport: marketSnapshotTransport,
    readinessProbe,
  });

  return {
    providerManager,
    marketDataService,
    marketMetricsService,
    marketSnapshotService,
    marketSnapshotTransport,
    marketSnapshotHttpHandler,
    readinessProbe,
  };
}
