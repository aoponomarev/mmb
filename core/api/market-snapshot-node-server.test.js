/**
 * #JS-PN49VrKY
 * @description Tests for market-snapshot-node-server: createBackendMarketRuntime, createMarketSnapshotNodeServer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackendMarketRuntime } from './backend-market-runtime.js';
import { createMarketSnapshotNodeServer } from './market-snapshot-node-server.js';

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
      return { ok: true, status: 200, async json() { return { coins: [{ id: "bitcoin" }] }; } };
    }
    if (url.includes("alternative.me")) {
      return { ok: true, status: 200, async json() { return { data: [{ value: "55" }] }; } };
    }
    if (url.includes("finance.yahoo.com")) {
      return { ok: true, status: 200, async json() { return { chart: { result: [{ meta: { regularMarketPrice: 21.3 } }] } }; } };
    }
    if (url.includes("coingecko.com/api/v3/global")) {
      return { ok: true, status: 200, async json() { return { data: { market_cap_percentage: { btc: 58.2 } } }; } };
    }
    if (url.includes("openInterestHist")) {
      return { ok: true, status: 200, async json() { return [{ sumOpenInterestValue: "11000" }]; } };
    }
    if (url.includes("premiumIndex")) {
      return { ok: true, status: 200, async json() { return [{ lastFundingRate: "0.0001" }]; } };
    }
    if (url.includes("topLongShortPositionRatio")) {
      return { ok: true, status: 200, async json() { return [{ longShortRatio: "1.20" }]; } };
    }
    return { ok: false, status: 404, async json() { return {}; } };
  };
}

test('MarketSnapshotNodeServer: Live HTTP Loopback E2E', async () => {
  const runtime = createBackendMarketRuntime({
    fetchFn: createMockFetch(),
    timeoutMs: 1000,
    marketTtlMs: 3600000,
    marketDataCacheNamespace: "market-live-http-e2e-data",
    marketMetricsCacheNamespace: "market-live-http-e2e-metrics",
  });
  const server = createMarketSnapshotNodeServer({
    handler: runtime.marketSnapshotHttpHandler,
    host: "127.0.0.1",
    port: 0,
  });
  const bound = await server.start();
  try {
    const preflight = await fetch(`http://${bound.host}:${bound.port}/api/market-snapshot`, { method: "OPTIONS" });
    assert.equal(preflight.status, 204, "live-http cors preflight status failed");
    assert.equal(preflight.headers.get("access-control-allow-origin"), "*", "live-http cors allow-origin failed");

    const head = await fetch(`http://${bound.host}:${bound.port}/api/market-snapshot?topCount=1&sortBy=market_cap`, { method: "HEAD" });
    assert.equal(head.status, 200, "live-http HEAD status failed");
    const headBody = await head.text();
    assert.equal(headBody, "", "live-http HEAD must have empty body");
    assert.equal(head.headers.get("x-service-state"), "ok", "live-http service-state header failed");
    assert.equal(head.headers.get("x-api-version"), "v1", "live-http api version header failed");

    const healthResp = await fetch(`http://${bound.host}:${bound.port}/api/health`);
    assert.equal(healthResp.status, 200, "live-http health status failed");
    const readyResp = await fetch(`http://${bound.host}:${bound.port}/api/ready`);
    assert.equal(readyResp.status, 200, "live-http ready status failed");

    const okResp = await fetch(`http://${bound.host}:${bound.port}/api/market-snapshot?topCount=10&sortBy=market_cap`);
    assert.equal(okResp.status, 200, "live-http ok status failed");
    const okJson = await okResp.json();
    assert.equal(okJson?.ok, true, "live-http ok envelope failed");
    assert.ok(Array.isArray(okJson?.data?.topCoins?.data), "live-http topCoins payload failed");

    const badResp = await fetch(`http://${bound.host}:${bound.port}/api/market-snapshot?sortBy=bad`);
    assert.equal(badResp.status, 400, "live-http invalid query status failed");

    const notFound = await fetch(`http://${bound.host}:${bound.port}/api/unknown`);
    assert.equal(notFound.status, 404, "live-http route not-found failed");
  } finally {
    await server.stop();
  }
});
