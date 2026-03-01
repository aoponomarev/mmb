/**
 * @skill core/skills/api-layer
 * @description Minimal CoinGecko provider for market data. 
 * No fallback chains; all external failures are explicit (Fail-Fast).
 */

import { createRequestRegistry } from './backend-request-registry.js';
import { BACKEND_ERROR_CODES, BackendCoreError } from './errors.js';
import { marketQuerySchema } from '../../contracts/market-contracts.js';

function isRetriableStatus(status) {
    return [408, 429, 500, 502, 503, 504].includes(status);
}

function getRetryAfterMs(response) {
    const raw = response?.headers?.get?.("Retry-After");
    if (!raw) return null;
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber) && asNumber >= 0) return Math.max(1000, asNumber * 1000);
    const asDate = Date.parse(raw);
    if (!Number.isNaN(asDate)) return Math.max(1000, asDate - Date.now());
    return null;
}

async function sleep(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
}

function mapCoin(coin) {
    const safe = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    const pvs = [
        safe(coin?.price_change_percentage_1h_in_currency ?? coin?.price_change_percentage_1h),
        safe(coin?.price_change_percentage_24h_in_currency ?? coin?.price_change_percentage_24h),
        safe(coin?.price_change_percentage_7d_in_currency ?? coin?.price_change_percentage_7d),
        safe(coin?.price_change_percentage_14d_in_currency ?? coin?.price_change_percentage_14d),
        safe(coin?.price_change_percentage_30d_in_currency ?? coin?.price_change_percentage_30d),
        safe(coin?.price_change_percentage_200d_in_currency ?? coin?.price_change_percentage_200d),
    ];
    return {
        id: coin?.id || "",
        symbol: coin?.symbol || "",
        name: coin?.name || "",
        image: coin?.image || "",
        current_price: safe(coin?.current_price),
        market_cap: safe(coin?.market_cap),
        market_cap_rank: Number.isFinite(Number(coin?.market_cap_rank)) ? Number(coin.market_cap_rank) : null,
        total_volume: safe(coin?.total_volume),
        price_change_percentage_1h: pvs[0],
        price_change_percentage_24h: pvs[1],
        price_change_percentage_7d: pvs[2],
        price_change_percentage_14d: pvs[3],
        price_change_percentage_30d: pvs[4],
        price_change_percentage_200d: pvs[5],
        pvs,
        PV1h: pvs[0],
        PV24h: pvs[1],
        PV7d: pvs[2],
        PV14d: pvs[3],
        PV30d: pvs[4],
        PV200d: pvs[5],
    };
}

async function parseJsonOrThrow(response, operation) {
    if (!response.ok) {
        const err = new Error(`COINGECKO_HTTP_${response.status}: ${operation}`);
        err.status = response.status;
        throw err;
    }
    return response.json();
}

export class CoinGeckoProvider {
    constructor(params = {}) {
        this.name = "coingecko";
        this.requiresApiKey = false; // We can use pro api later via env
        this.fetchFn = typeof params.fetchFn === "function" ? params.fetchFn : fetch;
        this.baseUrl = (params.baseUrl || "https://api.coingecko.com/api/v3").replace(/\/+$/, "");
        this.timeoutMs = params.timeoutMs || 10_000;
        this.minIntervalMs = params.minIntervalMs || 1_000;
        this.maxAttempts = params.maxAttempts || 2;
        this.retryBaseDelayMs = params.retryBaseDelayMs || 1_000;
        this.requestRegistry = params.requestRegistry || createRequestRegistry();
    }

    async guardedFetch(endpoint, params, operation) {
        const allowance = this.requestRegistry.isAllowed(this.name, endpoint, params, this.minIntervalMs);
        if (!allowance.allowed) {
            throw new BackendCoreError(BACKEND_ERROR_CODES.RateLimitBlocked, `RATE_LIMIT_BLOCKED: wait ${allowance.waitMs}ms before ${operation}`, {
                provider: this.name,
                endpoint,
                waitMs: allowance.waitMs,
            });
        }

        const url = `${this.baseUrl}${endpoint}`;
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
            try {
                // @skill-anchor process-ai-collaboration: explicit AbortSignal for timeouts avoids hanging promises
                const response = await this.fetchFn(url, { signal: AbortSignal.timeout(this.timeoutMs) });
                
                if (!response.ok) {
                    throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalHttp, `COINGECKO_HTTP_${response.status}: ${operation}`, {
                        provider: this.name,
                        endpoint,
                        status: response.status,
                        operation,
                        response,
                    });
                }
                const payload = await parseJsonOrThrow(response, operation);
                this.requestRegistry.recordCall(this.name, endpoint, params, response.status, true);
                return payload;
            } catch (error) {
                const status = Number.isFinite(error?.details?.status) ? error.details.status : 0;
                this.requestRegistry.recordCall(this.name, endpoint, params, status, false);
                lastError = error;

                const isTimeout = error?.name === "AbortError" || error?.name === "TimeoutError";
                if (isTimeout) {
                    lastError = new BackendCoreError(BACKEND_ERROR_CODES.ExternalTimeout, `COINGECKO_TIMEOUT: ${operation}`, {
                        provider: this.name,
                        endpoint,
                        operation,
                    });
                }

                const retriable = isRetriableStatus(status) || isTimeout;
                if (!retriable || attempt >= this.maxAttempts) break;

                const retryAfterMs = getRetryAfterMs(error?.details?.response);
                const delayMs = retryAfterMs ?? (this.retryBaseDelayMs * attempt);
                await sleep(delayMs);
            }
        }
        throw lastError;
    }

    async getTopCoins(query) {
        // Enforce domain contract via Zod before touching the network
        const { topCount, sortBy } = marketQuerySchema.parse(query);
        
        const order = sortBy === "volume" ? "volume_desc" : "market_cap_desc";
        const params = new URLSearchParams({
            vs_currency: "usd",
            order,
            per_page: String(topCount),
            page: "1",
            price_change_percentage: "1h,24h,7d,14d,30d,200d",
        });
        
        const endpoint = `/coins/markets?${params.toString()}`;
        const data = await this.guardedFetch(endpoint, { topCount, order }, "getTopCoins");
        
        return Array.isArray(data) ? data.map(mapCoin).slice(0, topCount) : [];
    }

    async searchCoins({ query }) {
        if (!query || typeof query !== 'string') return [];
        
        const params = new URLSearchParams({ query });
        const endpoint = `/search?${params.toString()}`;
        const data = await this.guardedFetch(endpoint, { query }, "searchCoins");
        
        const coins = Array.isArray(data?.coins) ? data.coins : [];
        return coins.slice(0, 10).map((coin) => ({
            id: coin.id || "",
            symbol: coin.symbol || "",
            name: coin.name || "",
            image: coin.thumb || coin.large || "",
            current_price: null,
            price_change_percentage_24h: null,
        }));
    }

    async getCoinData({ coinIds }) {
        if (!Array.isArray(coinIds) || coinIds.length === 0) return [];

        const params = new URLSearchParams({
            vs_currency: "usd",
            ids: coinIds.join(","),
            price_change_percentage: "1h,24h,7d,14d,30d,200d",
        });

        const endpoint = `/coins/markets?${params.toString()}`;
        const data = await this.guardedFetch(endpoint, { ids: coinIds }, "getCoinData");
        
        return Array.isArray(data) ? data.map(mapCoin) : [];
    }
}

export function createCoinGeckoProvider(params = {}) {
    return new CoinGeckoProvider(params);
}
