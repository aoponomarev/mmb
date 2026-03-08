#!/usr/bin/env node
/**
 * @description Sequential console test of all VIX data sources.
 * Purpose: identify 2 most reliable sources for market-metrics.js fallback chain.
 *
 * Usage: node is/scripts/infrastructure/test-vix-sources.js
 * Optional: FRED_API_KEY=xxx node ... (for FRED source)
 */

const PROXY_BASE = 'https://app-api.ponomarev-ux.workers.dev';

function safeNumber(val, def = null) {
    if (val === null || val === undefined || val === '') return def;
    const num = parseFloat(val);
    return (Number.isFinite(num) && num > 0 && num < 1000) ? num : def;
}

async function testSource(name, fn) {
    const start = Date.now();
    try {
        const result = await fn();
        const ms = Date.now() - start;
        if (result !== null && Number.isFinite(result)) {
            return { ok: true, value: result, ms, name };
        }
        return { ok: false, error: 'Invalid value', ms, name };
    } catch (err) {
        const ms = Date.now() - start;
        return { ok: false, error: err.message || String(err), ms, name };
    }
}

const sources = [
    {
        name: 'Yahoo Finance (Cloudflare proxy)',
        fn: async () => {
            const url = `${PROXY_BASE}/api/yahoo-finance/v8/finance/chart/%5EVIX?interval=1d&range=1d`;
            const resp = await fetch(url);
            const data = await resp.json();
            return safeNumber(data?.chart?.result?.[0]?.meta?.regularMarketPrice, null);
        }
    },
    {
        name: 'Yahoo Finance (direct)',
        fn: async () => {
            const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d';
            const resp = await fetch(url);
            const data = await resp.json();
            return safeNumber(data?.chart?.result?.[0]?.meta?.regularMarketPrice, null);
        }
    },
    {
        name: 'Stooq VI.C (Cloudflare proxy)',
        fn: async () => {
            const url = `${PROXY_BASE}/api/stooq/q/d/l/?s=vi.c&i=d`;
            const resp = await fetch(url);
            const text = await resp.text();
            if (text.includes('No data') || text.includes('N/A')) return null;
            const lines = text.trim().split('\n');
            const last = lines[lines.length - 1]?.split(',');
            return safeNumber(last ? parseFloat(last[4]) : null, null);
        }
    },
    {
        name: 'Stooq VI.C (direct)',
        fn: async () => {
            const resp = await fetch('https://stooq.com/q/d/l/?s=vi.c&i=d');
            const text = await resp.text();
            if (text.includes('No data') || text.includes('N/A')) return null;
            const lines = text.trim().split('\n');
            const last = lines[lines.length - 1]?.split(',');
            return safeNumber(last ? parseFloat(last[4]) : null, null);
        }
    },
    {
        name: 'Alpha Vantage (demo key)',
        fn: async () => {
            const resp = await fetch('https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=VIX&apikey=demo');
            const data = await resp.json();
            const series = data['Time Series (Daily)'];
            const lastKey = series ? Object.keys(series)[0] : null;
            return safeNumber(lastKey ? parseFloat(series[lastKey]['4. close']) : null, null);
        }
    }
];

// FRED (optional, requires API key)
const fredKey = process.env.FRED_API_KEY;
if (fredKey) {
    sources.push({
        name: 'FRED (VIXCLS)',
        fn: async () => {
            const url = `https://api.stlouisfed.org/fred/series/observations?series_id=VIXCLS&api_key=${fredKey}&file_type=json&sort_order=desc&limit=1`;
            const resp = await fetch(url);
            const data = await resp.json();
            const obs = data?.observations?.[0]?.value;
            return safeNumber(obs ? parseFloat(obs) : null, null);
        }
    });
}

async function main() {
    console.log('VIX sources test — sequential run\n');
    const results = [];

    for (const s of sources) {
        process.stdout.write(`  ${s.name}... `);
        const r = await testSource(s.name, s.fn);
        results.push(r);
        if (r.ok) {
            console.log(`OK ${r.value.toFixed(2)} (${r.ms}ms)`);
        } else {
            console.log(`FAIL (${r.ms}ms) ${r.error}`);
        }
    }

    const ok = results.filter(r => r.ok);
    console.log('\n--- Summary ---');
    console.log(`Success: ${ok.length}/${results.length}`);
    if (ok.length >= 2) {
        const top2 = ok.slice(0, 2);
        console.log('\nTop 2 reliable sources (by order of success):');
        top2.forEach((r, i) => console.log(`  ${i + 1}. ${r.name} — ${r.value.toFixed(2)} (${r.ms}ms)`));
    } else if (ok.length === 1) {
        console.log('\nOnly 1 source succeeded. Consider adding FRED with FRED_API_KEY.');
    } else {
        console.log('\nNo sources succeeded. Check network / CORS / API availability.');
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
