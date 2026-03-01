import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataProviderManager } from './backend-data-provider-manager.js';

test('DataProviderManager Contract Validation', async () => {
    const manager = createDataProviderManager({
        defaultProvider: "coingecko",
        apiKeyResolver: () => "",
    });

    manager.registerProvider({
        name: "coingecko",
        requiresApiKey: false,
        async getTopCoins(params) {
            return [{ id: "bitcoin", params }];
        },
        async searchCoins({ query }) {
            return [{ id: "bitcoin", query }];
        },
        async getCoinData({ coinIds }) {
            return coinIds.map((id) => ({ id }));
        },
    });

    const top = await manager.getTopCoins({ count: 10, sortBy: "market_cap" });
    assert.ok(Array.isArray(top) && top.length === 1, "top-coins contract failed");

    const search = await manager.searchCoins("btc");
    assert.ok(Array.isArray(search) && search.length === 1, "search contract failed");

    const data = await manager.getCoinData(["bitcoin", "ethereum"]);
    assert.ok(Array.isArray(data) && data.length === 2, "coin-data contract failed");

    // Fail-fast guard check
    const keyManager = createDataProviderManager({
        defaultProvider: "secure",
        apiKeyResolver: () => "",
    });
    keyManager.registerProvider({
        name: "secure",
        requiresApiKey: true,
        async getTopCoins() { return []; },
        async searchCoins() { return []; },
        async getCoinData() { return []; },
    });
    
    let missingKeyThrown = false;
    try {
        await keyManager.getTopCoins({ count: 1, sortBy: "market_cap" });
    } catch (e) {
        missingKeyThrown = String(e.message).includes("MISSING_PROVIDER_API_KEY");
    }
    assert.ok(missingKeyThrown, "missing-key fail-fast contract failed");
});
