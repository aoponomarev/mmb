import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackendMarketRuntime } from './backend-market-runtime.js';
import { createMarketSnapshotNodeServer } from './market-snapshot-node-server.js';
import http from 'node:http';
import { URL } from 'node:url';

function createMockFetch(state) {
  return async (url) => {
    if (url.includes("/coins/markets?") && !url.includes("ids=")) {
      if (state.mode === "provider-down") {
        return { ok: false, status: 503, async json() { return {}; } };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return [{ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 50000, market_cap: 1, total_volume: 1 }];
        },
      };
    }

    if (url.includes("/coins/markets?") && url.includes("ids=")) {
      if (state.mode === "provider-down") {
        return { ok: false, status: 503, async json() { return {}; } };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return [{ id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 50000, current_price_usd: 50000, market_cap: 1, total_volume: 1 }];
        },
      };
    }

    if (url.includes("/search?")) {
      if (state.mode === "provider-down") {
        return { ok: false, status: 503, async json() { return {}; } };
      }
      return { ok: true, status: 200, async json() { return { coins: [{ id: "bitcoin" }] }; } };
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
      if (state.mode === "metric-partial-failure") {
        return { ok: false, status: 503, async json() { return {}; } };
      }
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

function requestJson(url) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request({
      method: "GET",
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      timeout: 2000,
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("request timeout")));
    req.on("response", (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        const headers = new Map();
        for (const [key, value] of Object.entries(res.headers)) {
          if (value !== undefined) {
            headers.set(key.toLowerCase(), Array.isArray(value) ? value.join(",") : String(value));
          }
        }
        resolve({
          status: res.statusCode || 0,
          headers: {
            get(name) {
              return headers.get(name.toLowerCase()) || null;
            },
          },
          text: async () => body,
          json: async () => (body ? JSON.parse(body) : {}),
        });
      });
    });
    req.end();
  });
}

function sleep(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('Backend Runtime Cache-Aware Smoke E2E', async () => {
  const state = { mode: "baseline" };
  const runtime = createBackendMarketRuntime({
    fetchFn: createMockFetch(state),
    timeoutMs: 1000,
    marketTtlMs: 60 * 60 * 1000,
    marketDataCacheNamespace: "market-runtime-smoke-e2e-data",
    marketMetricsCacheNamespace: "market-runtime-smoke-e2e-metrics",
    minIntervalMs: 0,
    maxAttempts: 1,
    retryBaseDelayMs: 0,
  });

  const server = createMarketSnapshotNodeServer({
    handler: runtime.marketSnapshotHttpHandler,
    host: "127.0.0.1",
    port: 0,
  });
  const bound = await server.start();
  const baseUrl = `http://${bound.host}:${bound.port}`;
  runtime.marketDataService.cache.clearAll();
  runtime.marketMetricsService.cache.clearAll();

  try {
    const warmup = await requestJson(`${baseUrl}/api/market-snapshot?topCount=1&sortBy=market_cap`);
    assert.equal(warmup.status, 200, "runtime warmup status failed");
    const warmupBody = await warmup.json();
    assert.equal(warmupBody?.data?.topCoins?.source, "live", "first snapshot should use live topCoins");
    assert.equal(warmupBody?.data?.metrics?.openInterest?.source, "live", "first snapshot should populate openInterest");

    state.mode = "metric-partial-failure";
    const cached = await requestJson(`${baseUrl}/api/market-snapshot?topCount=1&sortBy=market_cap`);
    assert.equal(cached.status, 200, "cached snapshot status should remain 200");
    const cachedBody = await cached.json();
    assert.equal(cachedBody?.data?.topCoins?.source, "cache", "second snapshot should use cached topCoins");
    
    runtime.marketDataService.cache.clearAll();
    runtime.marketMetricsService.cache.clearAll();
    await sleep(1100);
    const degradedMetrics = await requestJson(`${baseUrl}/api/market-snapshot?topCount=1&sortBy=market_cap`);
    assert.equal(degradedMetrics.status, 200, "degraded metric snapshot should remain 200");
    const degradedBody = await degradedMetrics.json();
    assert.equal(degradedBody?.data?.metrics?.openInterest?.source, "error", "degraded scenario should expose openInterest error");
    assert.ok(degradedBody?.data?.metrics?.openInterest?.error?.code, "degraded metric must contain error code");
    assert.equal(degradedBody?.data?.metrics?.fgi?.source, "live", "other metrics should still be live when partially degraded");

    const readyOk = await requestJson(`${baseUrl}/api/ready`);
    assert.equal(readyOk.status, 200, "ready must be ok under baseline runtime");
    
    runtime.marketDataService.cache.clearAll();
    state.mode = "provider-down";
    await sleep(1100);
    const readyBad = await requestJson(`${baseUrl}/api/ready`);
    assert.equal(readyBad.status, 503, "readiness must be 503 when provider unavailable");

    const degradedSnapshot = await requestJson(`${baseUrl}/api/market-snapshot?topCount=1&sortBy=market_cap`);
    assert.ok(degradedSnapshot.status >= 500, "snapshot should fail when provider is unavailable");
    const degradedSnapshotBody = await degradedSnapshot.json();
    assert.equal(degradedSnapshotBody?.ok, false, "provider-down snapshot should return failure envelope");

  } finally {
    await server.stop();
  }
});
