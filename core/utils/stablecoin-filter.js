/**
 * #JS-St4bF1t3
 * @description Extract stablecoins from market coins by price peg; used by coins-metadata-generator and app-ui-root Update metadata.
 * SSOT for stablecoin detection from market-cache (Yandex) data — no CoinGecko category API.
 *
 * PEG RANGES: based on real USD prices (1 oz gold, 1 oz silver, per-barrel oil, fiat FX rates).
 * Order: check narrowest ranges first to avoid misclassification.
 */
(function() {
    'use strict';

    /** Price ranges (USD) — order matters: most specific first */
    const PEG_RANGES = [
        { id: 'gold', min: 1850, max: 3600 },      // XAUT, PAXG 1 oz
        { id: 'gold_small', min: 90, max: 130 },   // KAU per-gram
        { id: 'silver', min: 18, max: 45 },        // KAG 1 oz
        { id: 'oil', min: 60, max: 110 },         // tokenized oil per barrel
        { id: 'gbp', min: 1.22, max: 1.35 },
        { id: 'eur', min: 1.02, max: 1.18 },
        { id: 'chf', min: 1.04, max: 1.22 },
        { id: 'jpy', min: 0.005, max: 0.009 },    // 1 JPY ≈ 0.0067 USD
        { id: 'cad', min: 0.68, max: 0.80 },
        { id: 'aud', min: 0.60, max: 0.72 },
        { id: 'sgd', min: 0.72, max: 0.80 },
        { id: 'brl', min: 0.15, max: 0.24 },
        { id: 'cnh', min: 0.132, max: 0.148 },
        { id: 'mxn', min: 0.050, max: 0.068 },
        { id: 'usd', min: 0.92, max: 1.08 }       // broad last
    ];

    /** Peg ids that count as USD for menu "Select USD stablecoins" */
    const USD_PEGS = new Set(['usd']);

    function detectBaseCurrency(price) {
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
        for (const { id, min, max } of PEG_RANGES) {
            if (price >= min && price <= max) return id;
        }
        return null;
    }

    /**
     * @param {Array} coins - Coins with id, symbol, name, current_price
     * @returns {Array<{id, symbol, name, baseCurrency}>}
     */
    function extractStablecoinsFromCoins(coins) {
        if (!Array.isArray(coins)) return [];
        const seen = new Set();
        const result = [];
        for (const c of coins) {
            if (!c || !c.id) continue;
            const price = parseFloat(c.current_price);
            const baseCurrency = detectBaseCurrency(price);
            if (!baseCurrency) continue;
            const id = String(c.id).toLowerCase();
            if (seen.has(id)) continue;
            seen.add(id);
            result.push({
                id,
                symbol: (c.symbol || '').toLowerCase(),
                name: c.name || '',
                baseCurrency,
                source: 'market-cache',
                updatedAt: Date.now()
            });
        }
        return result;
    }

    window.stablecoinFilter = {
        extractStablecoinsFromCoins,
        extractFromCoins: extractStablecoinsFromCoins
    };
})();
