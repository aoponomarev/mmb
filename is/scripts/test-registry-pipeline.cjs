/**
 * Console test: full registry pipeline verification.
 * Tests: WLC categories (wrapped-tokens, liquid-staking, tokenized-gold/silver/commodities),
 * FIAT categories (per-currency stablecoins), peg detection, overlap/dedup logic.
 *
 * Run: node is/scripts/test-registry-pipeline.cjs
 *      node is/scripts/test-registry-pipeline.cjs --wlc-only
 *      node is/scripts/test-registry-pipeline.cjs --fiat-only
 */
'use strict';

const https = require('https');

const BASE_URL = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY || '';
const delayMs = API_KEY ? 2500 : 12000;

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${path}`;
        const headers = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' };
        if (API_KEY) headers['x-cg-demo-api-key'] = API_KEY;
        https.get(url, { headers, timeout: 30000 }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 429) {
                    const ra = parseInt(res.headers['retry-after'] || '60');
                    reject(Object.assign(new Error(`429 Rate Limit`), { status: 429, retryAfter: ra }));
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
                    return;
                }
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error('JSON parse: ' + e.message)); }
            });
        }).on('error', reject);
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchCategory(category, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const data = await fetchJson(`/coins/markets?vs_currency=usd&category=${category}&per_page=250&page=1&sparkline=false`);
            return Array.isArray(data) ? data : [];
        } catch (err) {
            if (err.status === 429 && attempt < retries) {
                const wait = (err.retryAfter || 60) * 1000 + 2000;
                console.log(`  429 on ${category}, waiting ${Math.round(wait / 1000)}s and retrying...`);
                await sleep(wait);
                continue;
            }
            console.error(`  ERROR fetching ${category}: ${err.message}`);
            return [];
        }
    }
    return [];
}

function detectCommodityPeg(coin) {
    const name = (coin.name || '').toLowerCase();
    const sym = (coin.symbol || '').toLowerCase();
    if (name.includes('platinum') || sym === 'pplt' || sym.startsWith('pplt')) return 'platinum';
    if (name.includes('palladium') || sym === 'pall' || sym.startsWith('pall')) return 'palladium';
    if (name.includes('uranium') || sym.includes('u3o8')) return 'uranium';
    if (name.includes('copper') || sym.startsWith('cper')) return 'copper';
    if (name.includes('oil') || name.includes('crude') || name.includes('petroleum')) return 'oil';
    if (name.includes('gold')) return 'gold';
    if (name.includes('silver')) return 'silver';
    return 'other';
}

// ─── WLC Test ─────────────────────────────────────────────────────────────────

async function testWlc() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  REGISTRY_WLC: wrapped + lst + commodity          ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const CATEGORIES = [
        { category: 'liquid-staking', type: 'lst', peg: null },
        { category: 'wrapped-tokens', type: 'wrapped', peg: null },
        { category: 'tokenized-gold', type: 'commodity', peg: 'gold' },
        { category: 'tokenized-silver', type: 'commodity', peg: 'silver' },
        { category: 'tokenized-commodities', type: 'commodity', peg: null },
    ];

    const seenIds = new Set();
    const registry = [];

    for (const { category, type, peg } of CATEGORIES) {
        console.log(`── ${category} (type=${type}, peg=${peg || 'auto-detect'}) ──`);
        const coins = await fetchCategory(category);
        let added = 0;
        for (const c of coins) {
            const id = (c.id || '').toLowerCase();
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);
            const resolvedPeg = peg !== null ? peg : (type === 'commodity' ? detectCommodityPeg(c) : null);
            registry.push({ coin_id: id, type, peg: resolvedPeg, source: category, name: c.name, symbol: c.symbol });
            added++;
        }
        console.log(`  Raw: ${coins.length}, New: ${added}, Total unique: ${registry.length}`);
        if (type === 'commodity' && peg === null) {
            const autoDetected = registry.filter(r => r.source === category);
            const pegGroups = {};
            for (const r of autoDetected) {
                pegGroups[r.peg] = (pegGroups[r.peg] || 0) + 1;
            }
            console.log('  Auto-detected pegs:', pegGroups);
            for (const r of autoDetected) {
                console.log(`    ${r.coin_id.padEnd(35)} ${r.symbol.padEnd(8)} peg=${r.peg.padEnd(10)} ${r.name}`);
            }
        }
        await sleep(delayMs);
    }

    // Summary
    const byType = {};
    for (const r of registry) {
        byType[r.type] = (byType[r.type] || 0) + 1;
    }
    console.log('\n── WLC Summary ──');
    console.log(`Total unique: ${registry.length}`);
    console.log('By type:', byType);

    const commodityByPeg = {};
    for (const r of registry.filter(r => r.type === 'commodity')) {
        commodityByPeg[r.peg] = (commodityByPeg[r.peg] || 0) + 1;
    }
    console.log('Commodity by peg:', commodityByPeg);

    return registry;
}

// ─── FIAT Test ────────────────────────────────────────────────────────────────

async function testFiat() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  REGISTRY_FIAT: stablecoins per-currency peg      ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const CATEGORIES = [
        { category: 'eur-stablecoin', peg: 'eur' },
        { category: 'gbp-stablecoin', peg: 'gbp' },
        { category: 'jpy-stablecoin', peg: 'jpy' },
        { category: 'chf-stablecoin', peg: 'chf' },
        { category: 'cny-stablecoin', peg: 'cny' },
        { category: 'try-stablecoins', peg: 'try' },
        { category: 'rub-stablecoin', peg: 'rub' },
        { category: 'stablecoins', peg: 'usd' },
    ];

    const seenIds = new Set();
    const registry = [];

    for (const { category, peg } of CATEGORIES) {
        console.log(`── ${category} (peg=${peg}) ──`);
        const coins = await fetchCategory(category);
        let added = 0;
        for (const c of coins) {
            const id = (c.id || '').toLowerCase();
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);
            registry.push({ coin_id: id, type: 'stable', peg, source: category, name: c.name, symbol: c.symbol });
            added++;
        }
        console.log(`  Raw: ${coins.length}, New: ${added}, Total unique: ${registry.length}`);
        if (peg !== 'usd') {
            const entries = registry.filter(r => r.source === category);
            if (entries.length > 0 && entries.length <= 20) {
                for (const r of entries) {
                    console.log(`    ${r.coin_id.padEnd(35)} ${r.symbol.padEnd(8)} ${r.name}`);
                }
            }
        }
        await sleep(delayMs);
    }

    // Summary
    const byPeg = {};
    for (const r of registry) {
        byPeg[r.peg] = (byPeg[r.peg] || 0) + 1;
    }
    console.log('\n── FIAT Summary ──');
    console.log(`Total unique: ${registry.length}`);
    console.log('By peg:', byPeg);

    return registry;
}

// ─── Cross-check: overlap between WLC and FIAT ───────────────────────────────

function crossCheck(wlcRegistry, fiatRegistry) {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  CROSS-CHECK: WLC ∩ FIAT overlap                  ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    const wlcIds = new Set(wlcRegistry.map(r => r.coin_id));
    const overlap = fiatRegistry.filter(r => wlcIds.has(r.coin_id));

    console.log(`WLC total: ${wlcRegistry.length}`);
    console.log(`FIAT total: ${fiatRegistry.length}`);
    console.log(`Overlap (coins in both): ${overlap.length}`);

    if (overlap.length > 0) {
        console.log('Overlapping coins (ON CONFLICT DO NOTHING means WLC type is preserved):');
        for (const fiat of overlap) {
            const wlc = wlcRegistry.find(r => r.coin_id === fiat.coin_id);
            console.log(`  ${fiat.coin_id.padEnd(30)} WLC: type=${wlc.type}/peg=${wlc.peg}  |  FIAT: type=stable/peg=${fiat.peg}  → kept as ${wlc.type}/${wlc.peg}`);
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const wlcOnly = args.includes('--wlc-only');
    const fiatOnly = args.includes('--fiat-only');

    console.log(`CoinGecko API Key: ${API_KEY ? 'SET' : 'NOT set (free tier)'}`);
    console.log(`Delay: ${delayMs}ms between requests`);

    let wlcReg = [];
    let fiatReg = [];

    if (!fiatOnly) {
        wlcReg = await testWlc();
    }

    if (!wlcOnly) {
        fiatReg = await testFiat();
    }

    if (wlcReg.length > 0 && fiatReg.length > 0) {
        crossCheck(wlcReg, fiatReg);
    }

    console.log('\n══ DONE ══');
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
