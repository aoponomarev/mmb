import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataCacheManager } from '../cache/data-cache-manager.js';
import { createMarketMetricsService } from './market-metrics-service.js';
import { BACKEND_ERROR_CODES, BackendCoreError } from './providers/errors.js';
import { createBinanceMetricsProvider } from './providers/binance-metrics-provider.js';

function createMockFetch() {
  const calls = { fgi: 0, vix: 0, btc: 0, oi: 0, fr: 0, lsr: 0 };
  const fn = async (url) => {
    if (url.includes("alternative.me")) {
      calls.fgi += 1;
      return { ok: true, status: 200, async json() { return { data: [{ value: "42" }] }; } };
    }
    if (url.includes("finance.yahoo.com")) {
      calls.vix += 1;
      return { ok: true, status: 200, async json() { return { chart: { result: [{ meta: { regularMarketPrice: 19.5 } }] } }; } };
    }
    if (url.includes("coingecko.com/api/v3/global")) {
      calls.btc += 1;
      return { ok: true, status: 200, async json() { return { data: { market_cap_percentage: { btc: 56.3 } } }; } };
    }
    if (url.includes("openInterestHist")) {
      calls.oi += 1;
      return { ok: true, status: 200, async json() { return [{ sumOpenInterestValue: "12345.67" }]; } };
    }
    if (url.includes("premiumIndex")) {
      calls.fr += 1;
      return { ok: true, status: 200, async json() { return [{ lastFundingRate: "0.0001" }, { lastFundingRate: "0.0002" }]; } };
    }
    if (url.includes("topLongShortPositionRatio")) {
      calls.lsr += 1;
      return { ok: true, status: 200, async json() { return [{ longShortRatio: "1.23" }]; } };
    }
    return { ok: false, status: 404, async json() { return {}; } };
  };
  return { fn, calls };
}

test('MarketMetricsService: Cache and Live behavior', async () => {
  const mock = createMockFetch();
  const cache = createDataCacheManager({ namespace: "market-metrics-e2e", defaultTtlMs: 3600000 });
  cache.clearAll();

  const metrics = createMarketMetricsService({
    fetchFn: mock.fn,
    binanceProvider: createBinanceMetricsProvider({ fetchFn: mock.fn, timeoutMs: 1000 }),
    cache,
    ttl: { fgi: 3600000, vix: 3600000, btcDominance: 3600000, openInterest: 3600000, fundingRate: 3600000, longShortRatio: 3600000 },
    timeoutMs: 1000,
  });

  const first = await metrics.getAll();
  assert.equal(first.fgi.source, "live");
  assert.equal(first.vix.source, "live");
  assert.equal(first.btcDominance.source, "live");
  assert.equal(first.openInterest.source, "live");
  assert.equal(first.fundingRate.source, "live");
  assert.equal(first.longShortRatio.source, "live");

  const second = await metrics.getAll();
  assert.equal(second.fgi.source, "cache");
  assert.equal(second.vix.source, "cache");
  assert.equal(second.btcDominance.source, "cache");
  assert.equal(second.openInterest.source, "cache");
  assert.equal(second.fundingRate.source, "cache");
  assert.equal(second.longShortRatio.source, "cache");

  assert.ok(
    mock.calls.fgi === 1 &&
    mock.calls.vix === 1 &&
    mock.calls.btc === 1 &&
    mock.calls.oi === 1 &&
    mock.calls.fr === 1 &&
    mock.calls.lsr === 1,
    "cache hit should avoid extra fetches"
  );
});

test('MarketMetricsService: Negative scenario - fail-fast on invalid VIX', async () => {
  const mock = createMockFetch();
  const invalid = createMarketMetricsService({
    fetchFn: async (url) => {
      if (url.includes("finance.yahoo.com")) {
        return { ok: true, status: 200, async json() { return { chart: { result: [{ meta: { regularMarketPrice: null } }] } }; } };
      }
      return mock.fn(url);
    },
    cache: createDataCacheManager({ namespace: "market-metrics-e2e-invalid", defaultTtlMs: 3600000 }),
    timeoutMs: 1000,
  });

  let invalidErr = null;
  try {
    await invalid.getVix();
  } catch (error) {
    invalidErr = error;
  }
  assert.ok(invalidErr instanceof BackendCoreError);
  assert.equal(invalidErr.code, BACKEND_ERROR_CODES.ExternalUnknown);
});

test('MarketMetricsService: Partial failure degradation (getAllBestEffort)', async () => {
  const mock = createMockFetch();
  const partial = createMarketMetricsService({
    fetchFn: async (url, options) => {
      if (url.includes("futures/data/openInterestHist")) {
        return { ok: false, status: 503, async json() { return {}; } };
      }
      return mock.fn(url, options);
    },
    binanceProvider: createBinanceMetricsProvider({
      fetchFn: async (url, options) => {
        if (url.includes("futures/data/openInterestHist")) {
          return { ok: false, status: 503, async json() { return {}; } };
        }
        return mock.fn(url, options);
      },
      timeoutMs: 1000,
    }),
    cache: createDataCacheManager({ namespace: "market-metrics-e2e-partial", defaultTtlMs: 3600000 }),
    timeoutMs: 1000,
  });

  const partialView = await partial.getAllBestEffort();
  assert.equal(partialView.openInterest.source, "error");
  assert.equal(partialView.openInterest.error.code, BACKEND_ERROR_CODES.ExternalHttp);
  assert.notEqual(partialView.fgi.source, "error");
});
