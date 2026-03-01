import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataProviderManager } from './backend-data-provider-manager.js';
import { createRequestRegistry } from './backend-request-registry.js';
import { createCoinGeckoProvider } from './coingecko-provider.js';
import { BACKEND_ERROR_CODES, BackendCoreError } from './errors.js';

function createMockFetch() {
    let topCoinsCalls = 0;
    return async (url) => {
        if (url.includes("/coins/markets?") && !url.includes("ids=")) {
            topCoinsCalls += 1;
            if (topCoinsCalls === 1) {
                return {
                    ok: false,
                    status: 429,
                    headers: { get(name) { return name === "Retry-After" ? "0" : null; } },
                    async json() { return {}; },
                };
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
        return { ok: false, status: 404, async json() { return {}; } };
    };
}

test('Backend Provider E2E: Manager + CoinGecko + RequestRegistry', async () => {
    const requestRegistry = createRequestRegistry();
    const provider = createCoinGeckoProvider({
        fetchFn: createMockFetch(),
        requestRegistry,
        minIntervalMs: 1,
        timeoutMs: 1000,
        maxAttempts: 2,
        retryBaseDelayMs: 1,
    });

    const manager = createDataProviderManager({
        defaultProvider: "coingecko",
        apiKeyResolver: () => "",
    });
    manager.registerProvider(provider);

    // Call top coins (this tests backward compatibility wrapper in manager too)
    const top = await manager.getTopCoins({ count: 5, sortBy: "market_cap" });
    assert.ok(Array.isArray(top) && top.length === 1, "e2e top coins failed");
    assert.ok(Array.isArray(top[0].pvs) && top[0].pvs.length === 6, "e2e normalization failed");

    const search = await manager.searchCoins("btc");
    assert.ok(Array.isArray(search) && search.length === 1, "e2e search failed");

    const data = await manager.getCoinData(["bitcoin"]);
    assert.ok(Array.isArray(data) && data.length === 1, "e2e coin-data failed");

    const waitMs = requestRegistry.getTimeUntilNext("coingecko", "/search?query=btc", { query: "btc" }, 1);
    assert.ok(Number.isFinite(waitMs) && waitMs >= 0, "request-registry contract failed");

    // Negative scenario: retry is exhausted and error model is preserved.
    const failingProvider = createCoinGeckoProvider({
        fetchFn: async () => ({
            ok: false,
            status: 503,
            headers: { get() { return null; } },
            async json() { return {}; },
        }),
        requestRegistry: createRequestRegistry(),
        minIntervalMs: 1,
        timeoutMs: 1000,
        maxAttempts: 2,
        retryBaseDelayMs: 1,
    });

    const failingManager = createDataProviderManager({
        defaultProvider: "coingecko",
        apiKeyResolver: () => "",
    });
    failingManager.registerProvider(failingProvider);

    let exhaustedRetryError = null;
    try {
        await failingManager.getTopCoins({ count: 3, sortBy: "market_cap" });
    } catch (error) {
        exhaustedRetryError = error;
    }

    assert.ok(exhaustedRetryError instanceof BackendCoreError, "negative e2e: expected BackendCoreError");
    assert.equal(exhaustedRetryError.code, BACKEND_ERROR_CODES.ExternalHttp, "negative e2e: expected ExternalHttp code");
});
