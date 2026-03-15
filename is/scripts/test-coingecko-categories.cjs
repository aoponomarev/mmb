/**
 * #JS-test-cg-cat
 * @description Console test: CoinGecko /coins/markets by category. Verifies registry_wlc and registry_fiat data before implementing market-fetcher.
 * @skill id:sk-8f9e0d
 *
 * Run: node is/scripts/test-coingecko-categories.cjs
 * Requires: COINGECKO_API_KEY (optional, for higher rate limit)
 */
'use strict';

const https = require('https');

const BASE_URL = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY || '';

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${path}`;
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        if (API_KEY) {
            headers['x-cg-demo-api-key'] = API_KEY;
        }

        https.get(url, { headers, timeout: 30000 }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 429) {
                    reject(new Error(`Rate limit (429). Retry-After: ${res.headers['retry-after']}`));
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('JSON parse error: ' + e.message));
                }
            });
        }).on('error', reject);
    });
}

async function testCategory(category, label) {
    const path = `/coins/markets?vs_currency=usd&category=${category}&per_page=250&page=1&sparkline=false&price_change_percentage=1h,24h,7d`;
    console.log(`\n--- ${label} (category=${category}) ---`);
    try {
        const data = await fetchJson(path);
        if (!Array.isArray(data)) {
            console.error('  ERROR: Expected array, got', typeof data);
            return [];
        }
        const ids = data.map(c => c.id);
        console.log(`  Count: ${data.length}`);
        console.log(`  Sample IDs: ${ids.slice(0, 10).join(', ')}${ids.length > 10 ? '...' : ''}`);
        if (data.length > 0) {
            const sample = data[0];
            console.log(`  Sample coin: id=${sample.id}, symbol=${sample.symbol}, name=${sample.name}`);
        }
        return data;
    } catch (err) {
        console.error('  ERROR:', err.message);
        return [];
    }
}

async function main() {
    console.log('=== CoinGecko Category Test (id:ais-82c9d0) ===');
    console.log('API Key:', API_KEY ? 'set' : 'not set (free tier)');

    // registry_wlc categories
    const wlcCategories = [
        ['asset-backed-tokens', 'Wrapped (asset-backed)'],
        ['liquid-staking', 'LST (liquid staking)'],
        ['tokenized-gold', 'Commodity: gold'],
        ['tokenized-silver', 'Commodity: silver'],
        ['tokenized-commodities', 'Commodity: general']
    ];

    const delayMs = API_KEY ? 2500 : 25000; // free tier: ~10 req/min
    for (const [cat, label] of wlcCategories) {
        await testCategory(cat, label);
        await new Promise(r => setTimeout(r, delayMs));
    }

    // registry_fiat
    await testCategory('stablecoins', 'Stablecoins (fiat)');

    console.log('\n=== Done ===');
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
