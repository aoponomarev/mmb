/**
 * #JS-Xa3QAdTk
 * @description Orchestrates fetching of market metrics (FGI, VIX, dominance, Binance indicators).
 * @skill id:sk-bb7c8e
 */
import { createDataCacheManager } from "../cache/data-cache-manager.js";
import { BACKEND_ERROR_CODES, BackendCoreError } from "./providers/errors.js";
import { createBinanceMetricsProvider } from "./providers/binance-metrics-provider.js";

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
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

export class MarketMetricsService {
  constructor(params = {}) {
    this.fetchFn = resolveFetchFn(params.fetchFn);
    this.cache = params.cache || createDataCacheManager({ namespace: "market-metrics" });
    this.timeoutMs = Number.isFinite(params.timeoutMs) ? Math.max(1, Math.floor(params.timeoutMs)) : 10_000;
    this.binanceProvider = params.binanceProvider || createBinanceMetricsProvider({
      fetchFn: this.fetchFn,
      timeoutMs: this.timeoutMs,
    });
    // @causality #for-distinct-ttls: VIX daily, funding 4h/8h
    this.ttl = {
      fgi: 60 * 60 * 1000,
      vix: 24 * 60 * 60 * 1000,
      btcDominance: 60 * 60 * 1000,
      openInterest: 4 * 60 * 60 * 1000,
      fundingRate: 4 * 60 * 60 * 1000,
      longShortRatio: 4 * 60 * 60 * 1000,
      ...(params.ttl || {}),
    };
  }

  // @causality #for-fail-fast
  async fetchJson(url, op) {
    let response;
    try {
      response = await this.fetchFn(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalTimeout, `${op}: timeout`, { op });
      }
      throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalUnknown, `${op}: request failed`, { op, cause: error?.message || String(error) });
    }
    if (!response.ok) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalHttp, `${op}: HTTP ${response.status}`, { op, status: response.status });
    }
    return response.json();
  }

  async getFearGreedIndex() {
    const key = { metric: "fgi" };
    const cached = this.cache.get("market-metric", key, this.ttl.fgi);
    if (cached.hit) return { source: "cache", value: cached.value };

    const data = await this.fetchJson("https://api.alternative.me/fng/?limit=1", "fetchFGI");
    const raw = data?.data?.[0]?.value;
    const value = clamp(toNumber(raw, 0), 0, 100);
    this.cache.set("market-metric", key, value);
    return { source: "live", value };
  }

  async getBtcDominance() {
    const key = { metric: "btc-dominance" };
    const cached = this.cache.get("market-metric", key, this.ttl.btcDominance);
    if (cached.hit) return { source: "cache", value: cached.value };

    const data = await this.fetchJson("https://api.coingecko.com/api/v3/global", "fetchBtcDominance");
    const raw = data?.data?.market_cap_percentage?.btc;
    const value = clamp(toNumber(raw, 0), 0, 100);
    this.cache.set("market-metric", key, value);
    return { source: "live", value };
  }

  async getVix() {
    const key = { metric: "vix" };
    const cached = this.cache.get("market-metric", key, this.ttl.vix);
    if (cached.hit) return { source: "cache", value: cached.value };

    const data = await this.fetchJson("https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d", "fetchVix");
    const raw = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const value = toNumber(raw, null);
    if (value === null || value <= 0 || value > 1000) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalUnknown, "fetchVix: invalid value", { value: raw });
    }
    this.cache.set("market-metric", key, value);
    return { source: "live", value };
  }

  async getOpenInterest() {
    const key = { metric: "open-interest" };
    const cached = this.cache.get("market-metric", key, this.ttl.openInterest);
    if (cached.hit) return { source: "cache", value: cached.value };
    const value = await this.binanceProvider.getOpenInterest();
    this.cache.set("market-metric", key, value);
    return { source: "live", value };
  }

  async getFundingRate() {
    const key = { metric: "funding-rate" };
    const cached = this.cache.get("market-metric", key, this.ttl.fundingRate);
    if (cached.hit) return { source: "cache", value: cached.value };

    const value = await this.binanceProvider.getFundingRate();
    this.cache.set("market-metric", key, value);
    return { source: "live", value };
  }

  async getLongShortRatio() {
    const key = { metric: "long-short-ratio" };
    const cached = this.cache.get("market-metric", key, this.ttl.longShortRatio);
    if (cached.hit) return { source: "cache", value: cached.value };

    const value = await this.binanceProvider.getLongShortRatio();
    this.cache.set("market-metric", key, value);
    return { source: "live", value };
  }

  async getAll() {
    // @causality #for-fail-fast
    const [fgi, vix, btcDominance, openInterest, fundingRate, longShortRatio] = await Promise.all([
      this.getFearGreedIndex(),
      this.getVix(),
      this.getBtcDominance(),
      this.getOpenInterest(),
      this.getFundingRate(),
      this.getLongShortRatio(),
    ]);
    return { fgi, vix, btcDominance, openInterest, fundingRate, longShortRatio };
  }

  async getAllBestEffort() {
    // @causality #for-partial-failure-tolerance
    const entries = [
      ["fgi", () => this.getFearGreedIndex()],
      ["vix", () => this.getVix()],
      ["btcDominance", () => this.getBtcDominance()],
      ["openInterest", () => this.getOpenInterest()],
      ["fundingRate", () => this.getFundingRate()],
      ["longShortRatio", () => this.getLongShortRatio()],
    ];
    const settled = await Promise.allSettled(entries.map(([, fn]) => fn()));
    const result = {};
    for (let i = 0; i < entries.length; i += 1) {
      const [name] = entries[i];
      const item = settled[i];
      if (item.status === "fulfilled") {
        result[name] = item.value;
      } else {
        const error = item.reason;
        const mapped = error instanceof BackendCoreError
          ? error
          : new BackendCoreError(BACKEND_ERROR_CODES.ExternalUnknown, `${name}: failed`, { cause: error?.message || String(error) });
        result[name] = { source: "error", error: { code: mapped.code, message: mapped.message } };
      }
    }
    return result;
  }
}

export function createMarketMetricsService(params = {}) {
  return new MarketMetricsService(params);
}
