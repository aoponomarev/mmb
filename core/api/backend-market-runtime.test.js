import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackendMarketRuntime } from './backend-market-runtime.js';

function createMockFetch() {
  return async (url) => {
    if (url.includes("/coins/markets?") && !url.includes("ids=")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return [{ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 50000, market_cap: 1, total_volume: 1 }];
        },
      };
    }
    if (url.includes("/coins/markets?") && url.includes("ids=")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return [{ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 50000, market_cap: 1, total_volume: 1 }];
        },
      };
    }
    if (url.includes("/search?")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { coins: [{ id: "bitcoin", symbol: "btc", name: "Bitcoin", thumb: "img" }] };
        },
      };
    }
    if (url.includes("alternative.me")) {
      return { ok: true, status: 200, async json() { return { data: [{ value: "50" }] }; } };
    }
    if (url.includes("finance.yahoo.com")) {
      return { ok: true, status: 200, async json() { return { chart: { result: [{ meta: { regularMarketPrice: 18.7 } }] } }; } };
    }
    if (url.includes("coingecko.com/api/v3/global")) {
      return { ok: true, status: 200, async json() { return { data: { market_cap_percentage: { btc: 57.1 } } }; } };
    }
    if (url.includes("openInterestHist")) {
      return { ok: true, status: 200, async json() { return [{ sumOpenInterestValue: "10000" }]; } };
    }
    if (url.includes("premiumIndex")) {
      return { ok: true, status: 200, async json() { return [{ lastFundingRate: "0.0001" }]; } };
    }
    if (url.includes("topLongShortPositionRatio")) {
      return { ok: true, status: 200, async json() { return [{ longShortRatio: "1.15" }]; } };
    }
    return { ok: false, status: 404, async json() { return {}; } };
  };
}

test('Backend Market Runtime Composition E2E', async () => {
  const runtime = createBackendMarketRuntime({
    fetchFn: createMockFetch(),
    timeoutMs: 1000,
    marketTtlMs: 3600000,
    marketDataCacheNamespace: "market-runtime-e2e-data",
    marketMetricsCacheNamespace: "market-runtime-e2e-metrics",
  });

  const top = await runtime.marketDataService.getTopCoins({ topCount: 5, sortBy: "market_cap" });
  assert.ok(top.source === "live" || top.source === "cache", "runtime top-coins contract failed");
  assert.ok(Array.isArray(top.data) && top.data.length > 0, "runtime top-coins payload failed");

  const snapshot = await runtime.marketSnapshotService.getSnapshot({ topCount: 5 });
  assert.ok(snapshot?.topCoins?.data?.length > 0, "runtime snapshot top-coins failed");
  assert.ok(snapshot?.metrics?.fgi?.source !== "error", "runtime snapshot metrics failed");

  const transport = await runtime.marketSnapshotTransport.handleGetSnapshot({ topCount: "5", sortBy: "market_cap" });
  assert.equal(transport.status, 200, "runtime transport status failed");
  assert.equal(transport.body?.ok, true, "runtime transport envelope failed");

  const http = await runtime.marketSnapshotHttpHandler.handle({
    method: "GET",
    url: "/api/market-snapshot?topCount=5&sortBy=market_cap",
  });
  assert.equal(http.status, 200, "runtime http handler status failed");
  
  const health = await runtime.marketSnapshotHttpHandler.handle({
    method: "GET",
    url: "/api/health",
  });
  assert.equal(health.status, 200, "runtime http health status failed");
  
  const ready = await runtime.marketSnapshotHttpHandler.handle({
    method: "GET",
    url: "/api/ready",
  });
  assert.equal(ready.status, 200, "runtime http ready status failed");
});