import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoinGeckoProvider } from './coingecko-provider.js';

test('CoinGeckoProvider: getTopCoins validates query and builds correct URL', async () => {
    let requestedUrl = '';
    
    // Mock fetch
    const fetchFn = async (url) => {
        requestedUrl = url;
        return {
            ok: true,
            json: async () => [{ id: 'bitcoin', symbol: 'btc', current_price: 50000 }]
        };
    };

    const provider = createCoinGeckoProvider({ fetchFn });
    
    // The query defaults to topCount 25 and sortBy market_cap
    const data = await provider.getTopCoins({});
    
    assert.equal(data.length, 1);
    assert.equal(data[0].id, 'bitcoin');
    assert.match(requestedUrl, /per_page=25/);
    assert.match(requestedUrl, /order=market_cap_desc/);
});

test('CoinGeckoProvider: getTopCoins handles overridden query params', async () => {
    let requestedUrl = '';
    const fetchFn = async (url) => {
        requestedUrl = url;
        return { ok: true, json: async () => [] };
    };

    const provider = createCoinGeckoProvider({ fetchFn });
    
    await provider.getTopCoins({ topCount: 10, sortBy: 'volume' });
    
    assert.match(requestedUrl, /per_page=10/);
    assert.match(requestedUrl, /order=volume_desc/);
});

test('CoinGeckoProvider: rate limit block logic works', async () => {
    const provider = createCoinGeckoProvider({ 
        fetchFn: async () => ({ ok: true, json: async () => [] }),
        minIntervalMs: 5000 
    });

    // First call succeeds
    await provider.searchCoins({ query: 'btc' });
    
    // Immediate second call should fail due to rate limiter
    await assert.rejects(
        async () => await provider.searchCoins({ query: 'btc' }),
        /RATE_LIMIT_BLOCKED/
    );
});
