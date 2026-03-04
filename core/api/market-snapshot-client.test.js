/**
 * #JS-D32ccb9D
 * @description Tests for MarketSnapshotApiClient (market-snapshot-client.js).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { MarketSnapshotApiClient, MarketSnapshotClientError } from './market-snapshot-client.js';

function createMockFetch() {
  const seen = [];
  const fn = async (url, options = {}) => {
    seen.push({ url, options });
    if (url.includes("/api/market-snapshot?topCount=2&sortBy=volume")) {
      return {
        ok: true,
        status: 200,
        headers: new Map([["x-request-id", "rsp_2_01"]]),
        json: async () => ({
          ok: true,
          meta: { requestId: "rsp_2_01", provider: "runtime" },
          data: {
            ts: "2026-01-01T00:00:00.000Z",
            topCoins: { source: "cache", data: [] },
            metrics: { vix: { source: "cache", value: 14 } },
          },
        }),
      };
    }
    if (url.includes("/api/market-snapshot")) {
      return {
        ok: false,
        status: 503,
        headers: new Map([["x-request-id", "rsp_2_503"]]),
        json: async () => ({
          ok: false,
          error: { code: "NOT_READY", message: "not ready" },
        }),
      };
    }
    return { ok: false, status: 404, headers: new Map([["x-request-id", "rsp_2_404"]]), json: async () => ({}) };
  };
  fn._seen = seen;
  return fn;
}

test('MarketSnapshotApiClient Contract', async () => {
  const fetchFn = createMockFetch();
  const client = new MarketSnapshotApiClient({
    baseUrl: "http://127.0.0.1:18082",
    fetchFn,
    defaultRequestId: "default-1",
  });

  const ok = await client.getSnapshot({
    topCount: 2,
    sortBy: "volume",
    requestId: "manual.valid_01",
  });
  assert.equal(ok.ok, true, "ok response expected");
  assert.equal(ok.status, 200, "ok status expected");
  assert.equal(ok.requestId, "rsp_2_01", "response request-id should match server response header");
  assert.equal(ok.data?.topCoins?.data?.length, 0, "snapshot payload should reach client");
  assert.equal(fetchFn._seen[0].options.headers["x-request-id"], "manual.valid_01", "request id must be forwarded");

  const degraded = await client.getSnapshot({ topCount: 3, sortBy: "market_cap" });
  assert.equal(degraded.ok, false, "degraded response should return ok=false");
  assert.equal(degraded.status, 503, "degraded response status expected");
  assert.equal(degraded.error?.code, "NOT_READY", "degraded response should preserve backend error code");
  assert.equal(degraded.error?.requestId, "rsp_2_503", "degraded request-id should preserve header");
});
