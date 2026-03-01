import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataProviderManager } from './providers/backend-data-provider-manager.js';
import { createDataCacheManager } from '../cache/data-cache-manager.js';
import { createMarketDataService } from './market-data-service.js';
import { createMarketMetricsService } from './market-metrics-service.js';
import { createMarketSnapshotService } from './market-snapshot-service.js';
import { createBinanceMetricsProvider } from './providers/binance-metrics-provider.js';
import { BACKEND_ERROR_CODES, BackendCoreError } from './providers/errors.js';

test('MarketSnapshotService: Partial failure and invalid input handling', async () => {
  const providerManager = createDataProviderManager({
    defaultProvider: "mock-provider",
    apiKeyResolver: () => "",
  });
  providerManager.registerProvider({
    name: "mock-provider",
    async getTopCoins({ count, sortBy }) {
      return [{ id: "bitcoin", count, sortBy }];
    },
    async searchCoins({ query }) {
      return [{ id: "bitcoin", query }];
    },
    async getCoinData(coinIds) {
      return coinIds.map((id) => ({ id }));
    },
  });

  const marketDataService = createMarketDataService({
    providerManager,
    cache: createDataCacheManager({ namespace: "market-snapshot-data-e2e", defaultTtlMs: 3600000 }),
    marketTtlMs: 3600000,
  });

  const mockFetch = async (url) => {
    if (url.includes("alternative.me")) {
      return { ok: true, status: 200, async json() { return { data: [{ value: "41" }] }; } };
    }
    if (url.includes("finance.yahoo.com")) {
      return { ok: true, status: 200, async json() { return { chart: { result: [{ meta: { regularMarketPrice: 20.1 } }] } }; } };
    }
    if (url.includes("coingecko.com/api/v3/global")) {
      return { ok: true, status: 200, async json() { return { data: { market_cap_percentage: { btc: 55.9 } } }; } };
    }
    if (url.includes("openInterestHist")) {
      return { ok: false, status: 503, async json() { return {}; } };
    }
    if (url.includes("premiumIndex")) {
      return { ok: true, status: 200, async json() { return [{ lastFundingRate: "0.0002" }]; } };
    }
    if (url.includes("topLongShortPositionRatio")) {
      return { ok: true, status: 200, async json() { return [{ longShortRatio: "1.11" }]; } };
    }
    return { ok: false, status: 404, async json() { return {}; } };
  };

  const marketMetricsService = createMarketMetricsService({
    fetchFn: mockFetch,
    binanceProvider: createBinanceMetricsProvider({ fetchFn: mockFetch, timeoutMs: 1000 }),
    cache: createDataCacheManager({ namespace: "market-snapshot-metrics-e2e", defaultTtlMs: 3600000 }),
    timeoutMs: 1000,
  });

  const snapshotService = createMarketSnapshotService({
    marketDataService,
    marketMetricsService,
  });

  const snapshot = await snapshotService.getSnapshot({ topCount: 5, sortBy: "market_cap" });
  assert.equal(snapshot?.topCoins?.data?.length, 1, "snapshot topCoins contract failed");
  assert.notEqual(snapshot?.metrics?.fgi?.source, "error", "snapshot should include healthy metric results");
  assert.equal(snapshot?.metrics?.openInterest?.source, "error", "snapshot should surface degraded metric as error payload");

  let invalidSortErr = null;
  try {
    await snapshotService.getSnapshot({ topCount: 5, sortBy: "invalid_sort" });
  } catch (error) {
    invalidSortErr = error;
  }
  assert.ok(invalidSortErr instanceof BackendCoreError, "invalid sort should throw BackendCoreError");
  assert.equal(invalidSortErr.code, BACKEND_ERROR_CODES.InvalidInput, "invalid sort should map to InvalidInput");
});
