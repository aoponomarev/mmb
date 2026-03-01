import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketSnapshotHttpHandler } from './market-snapshot-http.js';

test('Market Snapshot HTTP Handler E2E Contracts', async () => {
  const handler = createMarketSnapshotHttpHandler({
    transport: {
      async handleGetSnapshot(query) {
        if (query.sortBy === "bad") {
          return {
            status: 400,
            body: {
              ok: false,
              error: { code: "INVALID_INPUT", message: "INVALID_SORT_BY" },
            },
          };
        }
        return {
          status: 200,
          body: {
            ok: true,
            data: {
              ts: new Date().toISOString(),
              topCoins: { source: "live", data: [{ id: "bitcoin" }] },
              metrics: { fgi: { source: "live", value: 52 } },
            },
          },
        };
      },
    },
  });

  const ok = await handler.handle({ method: "GET", url: "/api/market-snapshot?topCount=10&sortBy=market_cap" });
  assert.equal(ok.status, 200, "http handler ok status failed");
  const okBody = JSON.parse(ok.body);
  assert.equal(okBody.ok, true, "http handler ok payload failed");

  const badQuery = await handler.handle({ method: "GET", url: "/api/market-snapshot?sortBy=bad" });
  assert.equal(badQuery.status, 400, "http handler bad-query status failed");

  const health = await handler.handle({ method: "GET", url: "/api/health" });
  assert.equal(health.status, 200, "http handler health status failed");

  const ready = await handler.handle({ method: "GET", url: "/api/ready" });
  assert.equal(ready.status, 200, "http handler ready status failed");

  const wrongMethod = await handler.handle({ method: "POST", url: "/api/market-snapshot" });
  assert.equal(wrongMethod.status, 405, "http handler method status failed");
  assert.ok(wrongMethod.headers?.allow?.includes("GET"), "http handler allow header failed");

  const wrongPath = await handler.handle({ method: "GET", url: "/api/unknown" });
  assert.equal(wrongPath.status, 404, "http handler path status failed");
});