/**
 * #JS-NE2miEJQ
 * @description Backend-core DataProviderManager; fail-fast, explicit provider and API key contract from env resolver.
 * @skill id:sk-bb7c8e
 */
import { BACKEND_ERROR_CODES, BackendCoreError } from "./errors.js";

function toNonEmptyString(input) {
  if (typeof input !== "string") return "";
  return input.trim();
}

function assertPositiveInt(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidInput, `INVALID_${field.toUpperCase()}: expected positive integer`, { field });
  }
}

function assertArrayOfNonEmptyStrings(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidInput, `INVALID_${field.toUpperCase()}: expected non-empty array`, { field });
  }
  for (const item of value) {
    if (!toNonEmptyString(item)) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidInput, `INVALID_${field.toUpperCase()}: array contains empty item`, { field });
    }
  }
}

function missingResolver() {
  return "";
}

export class DataProviderManager {
  constructor(params = {}) {
    this.providers = new Map();
    this.defaultProvider = toNonEmptyString(params.defaultProvider || "coingecko");
    this.activeProvider = this.defaultProvider;
    this.apiKeyResolver = typeof params.apiKeyResolver === "function" ? params.apiKeyResolver : missingResolver;
    this.beforeRequestHook = typeof params.beforeRequestHook === "function" ? params.beforeRequestHook : null;
  }

  registerProvider(provider) {
    const name = toNonEmptyString(provider?.name);
    if (!name) throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidProvider, "INVALID_PROVIDER: name is required");
    for (const method of ["getTopCoins", "searchCoins", "getCoinData"]) {
      if (typeof provider[method] !== "function") {
        throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidProvider, `INVALID_PROVIDER: ${name} missing ${method}()`, { provider: name, method });
      }
    }
    provider.requiresApiKey = provider.requiresApiKey === true;
    this.providers.set(name, provider);
  }

  getRegisteredProviders() {
    return [...this.providers.keys()];
  }

  setActiveProvider(providerName) {
    const name = toNonEmptyString(providerName);
    if (!this.providers.has(name)) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.ProviderNotFound, `PROVIDER_NOT_FOUND: ${name}`, { provider: name });
    }
    this.activeProvider = name;
  }

  getActiveProviderName() {
    if (this.providers.has(this.activeProvider)) return this.activeProvider;
    if (this.providers.has(this.defaultProvider)) return this.defaultProvider;
    throw new BackendCoreError(BACKEND_ERROR_CODES.NoProviderRegistered, "NO_PROVIDER_REGISTERED");
  }

  resolveApiKey(provider) {
    const key = toNonEmptyString(this.apiKeyResolver(provider.name) || "");
    if (provider.requiresApiKey && !key) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.MissingProviderApiKey, `MISSING_PROVIDER_API_KEY: ${provider.name}`, { provider: provider.name });
    }
    return key || null;
  }

  async call(methodName, payload) {
    const providerName = this.getActiveProviderName();
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.ProviderNotFound, `PROVIDER_NOT_FOUND: ${providerName}`, { provider: providerName });
    }
    if (this.beforeRequestHook) await this.beforeRequestHook(providerName);
    const apiKey = this.resolveApiKey(provider);
    return provider[methodName]({ ...payload, apiKey });
  }

    async getTopCoins(count = 100, sortBy = "market_cap", options = {}) {
    // If the first argument is an object, assume it's a query object from the newer API
    if (typeof count === 'object' && count !== null) {
        const query = count;
        return this.call("getTopCoins", query);
    }
    
    assertPositiveInt(count, "count");
    const normalizedSort = toNonEmptyString(sortBy) || "market_cap";
    if (!["market_cap", "volume"].includes(normalizedSort)) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidInput, "INVALID_SORT_BY: allowed values are market_cap | volume", { field: "sortBy" });
    }
    return this.call("getTopCoins", { topCount: count, sortBy: normalizedSort, options });
  }

  async searchCoins(query, options = {}) {
    const normalizedQuery = toNonEmptyString(query);
    if (!normalizedQuery || normalizedQuery.length < 2) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidInput, "INVALID_QUERY: expected at least 2 chars", { field: "query" });
    }
    return this.call("searchCoins", { query: normalizedQuery, options });
  }

  async getCoinData(coinIds, options = {}) {
    assertArrayOfNonEmptyStrings(coinIds, "coinIds");
    return this.call("getCoinData", { coinIds: coinIds.map((x) => x.trim()), options });
  }
}

export function createDataProviderManager(params = {}) {
  return new DataProviderManager(params);
}
