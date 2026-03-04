/**
 * @skill id:sk-bb7c8e
 * @description Orchestrates the backend data fetching using providerManager and caches the results via dataCacheManager.
 */
import { createDataCacheManager } from "../cache/data-cache-manager.js";

export class MarketDataService {
  constructor(params = {}) {
    this.providerManager = params.providerManager;
    this.cache = params.cache || createDataCacheManager({ namespace: "market-data" });
    this.marketTtlMs = Number.isFinite(params.marketTtlMs) ? Math.max(1, Math.floor(params.marketTtlMs)) : 60 * 60 * 1000;
  }

  async getTopCoins(params, legacySortBy = "market_cap", legacyOptions = {}) {
    let topCount = 100;
    let sortBy = "market_cap";
    let options = {};

    if (typeof params === 'object' && params !== null) {
      topCount = params.topCount ?? 100;
      sortBy = params.sortBy ?? "market_cap";
      options = legacySortBy !== "market_cap" && typeof legacySortBy === 'object' ? legacySortBy : {};
    } else if (typeof params === 'number') {
      topCount = params;
      sortBy = legacySortBy;
      options = legacyOptions;
    }

    const cacheKeyParams = { topCount, sortBy, provider: this.providerManager.getActiveProviderName() };
    const cached = this.cache.get("top-coins", cacheKeyParams, this.marketTtlMs);
    if (cached.hit) return { source: "cache", data: cached.value };

    const data = await this.providerManager.getTopCoins({ topCount, sortBy }, options);
    this.cache.set("top-coins", cacheKeyParams, data);
    return { source: "live", data };
  }

  async searchCoins(query, options = {}) {
    const cacheKeyParams = { query, provider: this.providerManager.getActiveProviderName() };
    const cached = this.cache.get("search-coins", cacheKeyParams, this.marketTtlMs);
    if (cached.hit) return { source: "cache", data: cached.value };

    const data = await this.providerManager.searchCoins({ query }, options);
    this.cache.set("search-coins", cacheKeyParams, data);
    return { source: "live", data };
  }

  async getCoinData(coinIds, options = {}) {
    const cacheKeyParams = { coinIds: [...coinIds].sort(), provider: this.providerManager.getActiveProviderName() };
    const cached = this.cache.get("coin-data", cacheKeyParams, this.marketTtlMs);
    if (cached.hit) return { source: "cache", data: cached.value };

    const data = await this.providerManager.getCoinData(coinIds, options);
    this.cache.set("coin-data", cacheKeyParams, data);
    return { source: "live", data };
  }
}

export function createMarketDataService(params = {}) {
  return new MarketDataService(params);
}
