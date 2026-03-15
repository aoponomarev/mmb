/**
 * Deep audit: CoinGecko categories API for commodity/wrapped/lst/stablecoins mapping.
 * Phase 1: List all categories, find commodity-related ones.
 * Phase 2: Fetch each commodity category, show overlap analysis.
 *
 * Run: node is/scripts/test-coingecko-categories-deep.cjs
 *      node is/scripts/test-coingecko-categories-deep.cjs --phase=2
 *      node is/scripts/test-coingecko-categories-deep.cjs --phase=3 --category=tokenized-commodities
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
        if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY;

        https.get(url, { headers, timeout: 30000 }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 429) {
                    reject(Object.assign(new Error(`Rate limit (429)`), { retryAfter: res.headers['retry-after'] }));
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
                    return;
                }
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error('JSON parse: ' + e.message)); }
            });
        }).on('error', reject);
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const delayMs = API_KEY ? 2500 : 12000;

async function phase1_listCategories() {
    console.log('\n========== PHASE 1: List all CoinGecko categories ==========');
    const cats = await fetchJson('/coins/categories/list');
    console.log(`Total categories: ${cats.length}\n`);

    const keywords = ['token', 'gold', 'silver', 'platinum', 'palladium', 'oil', 'commodity', 'commodit',
        'wrapped', 'liquid', 'staking', 'stable', 'peg', 'backed', 'rwa', 'real-world', 'asset'];
    const relevant = cats.filter(c => {
        const id = (c.category_id || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        return keywords.some(kw => id.includes(kw) || name.includes(kw));
    });

    console.log(`Relevant categories (matching keywords: ${keywords.join(', ')}):`);
    console.log('---');
    for (const c of relevant) {
        console.log(`  id: ${c.category_id}  |  name: ${c.name}`);
    }
    console.log(`\n--- Total relevant: ${relevant.length} ---`);
    return relevant;
}

async function phase2_fetchCommodityCategories() {
    console.log('\n========== PHASE 2: Fetch commodity-related categories ==========');

    const categories = [
        'tokenized-gold',
        'tokenized-silver',
        'tokenized-commodities',
        'asset-backed-tokens',
        'liquid-staking',
        'stablecoins'
    ];

    const results = {};
    for (const cat of categories) {
        console.log(`\n--- Fetching: ${cat} ---`);
        try {
            const data = await fetchJson(`/coins/markets?vs_currency=usd&category=${cat}&per_page=250&page=1&sparkline=false`);
            if (!Array.isArray(data)) {
                console.error(`  ERROR: not array, got ${typeof data}`);
                results[cat] = [];
                continue;
            }
            results[cat] = data;
            console.log(`  Count: ${data.length}`);
            console.log(`  Top 15: ${data.slice(0, 15).map(c => `${c.id} (${c.symbol})`).join(', ')}`);
        } catch (err) {
            console.error(`  ERROR: ${err.message}`);
            results[cat] = [];
        }
        await sleep(delayMs);
    }

    console.log('\n========== OVERLAP ANALYSIS ==========');
    const goldIds = new Set(results['tokenized-gold'].map(c => c.id));
    const silverIds = new Set(results['tokenized-silver'].map(c => c.id));
    const commodIds = new Set(results['tokenized-commodities'].map(c => c.id));
    const wrappedIds = new Set(results['asset-backed-tokens'].map(c => c.id));
    const lstIds = new Set(results['liquid-staking'].map(c => c.id));

    console.log(`\ntokenized-gold: ${goldIds.size}`);
    console.log(`tokenized-silver: ${silverIds.size}`);
    console.log(`tokenized-commodities: ${commodIds.size}`);

    const commodOnlyIds = [...commodIds].filter(id => !goldIds.has(id) && !silverIds.has(id));
    const commodAndGold = [...commodIds].filter(id => goldIds.has(id));
    const commodAndSilver = [...commodIds].filter(id => silverIds.has(id));
    const goldOnly = [...goldIds].filter(id => !commodIds.has(id));
    const silverOnly = [...silverIds].filter(id => !commodIds.has(id));

    console.log(`\nOverlap commodities ∩ gold: ${commodAndGold.length} (${commodAndGold.join(', ')})`);
    console.log(`Overlap commodities ∩ silver: ${commodAndSilver.length} (${commodAndSilver.join(', ')})`);
    console.log(`Gold-only (not in commodities): ${goldOnly.length} (${goldOnly.join(', ')})`);
    console.log(`Silver-only (not in commodities): ${silverOnly.length} (${silverOnly.join(', ')})`);
    console.log(`Commodities-only (not gold, not silver): ${commodOnlyIds.length}`);
    if (commodOnlyIds.length > 0) {
        const commodOnlyCoins = results['tokenized-commodities'].filter(c => commodOnlyIds.includes(c.id));
        console.log(`  These are likely oil/platinum/palladium/other:`);
        for (const c of commodOnlyCoins) {
            console.log(`    ${c.id} (${c.symbol}) — ${c.name}, mcap=$${(c.market_cap || 0).toLocaleString()}`);
        }
    }

    const lstInWrapped = [...lstIds].filter(id => wrappedIds.has(id));
    const wrappedInLst = [...wrappedIds].filter(id => lstIds.has(id));
    console.log(`\nLST ∩ Wrapped: ${lstInWrapped.length}`);
    if (lstInWrapped.length > 0) console.log(`  ${lstInWrapped.slice(0, 10).join(', ')}`);

    return results;
}

async function phase3_deepCategory(category) {
    console.log(`\n========== PHASE 3: Deep inspect ${category} ==========`);
    const data = await fetchJson(`/coins/markets?vs_currency=usd&category=${category}&per_page=250&page=1&sparkline=false`);
    if (!Array.isArray(data)) {
        console.error('Not array');
        return;
    }
    console.log(`Count: ${data.length}\n`);
    for (const c of data) {
        console.log(`  ${c.id.padEnd(40)} ${(c.symbol || '').padEnd(10)} ${(c.name || '').padEnd(35)} mcap=$${(c.market_cap || 0).toLocaleString()}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const phaseArg = args.find(a => a.startsWith('--phase='));
    const catArg = args.find(a => a.startsWith('--category='));
    const phase = phaseArg ? parseInt(phaseArg.split('=')[1]) : 1;
    const category = catArg ? catArg.split('=')[1] : 'tokenized-commodities';

    console.log(`CoinGecko API Key: ${API_KEY ? 'set' : 'NOT set (free tier, slower)'}`);
    console.log(`Delay between requests: ${delayMs}ms`);

    if (phase === 1) {
        await phase1_listCategories();
    } else if (phase === 2) {
        await phase2_fetchCommodityCategories();
    } else if (phase === 3) {
        await phase3_deepCategory(category);
    }
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
