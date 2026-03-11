/**
 * #JS-jy6Q4juu
 * @description SSOT for coin reference lists (stablecoins etc.); used in UI for selections and filters.
 * @skill id:sk-e0b8f3
 *
 * PRINCIPLES:
 * - All coin reference lists defined here
 * - Returned structures immutable for caller (array/Set copies)
 * - Extensible: use getters when adding new lists
 *
 * Stablecoins = all pegged assets: USD, metals, oil, etc. Curated default list ensures
 * instant selection without network; CoinGecko loader supplements on "Update metadata".
 *
 * REFERENCES:
 * - SSOT: id:sk-e0b8f3 (section "SSOT")
 */

(function() {
    'use strict';

    /** Curated default: USD stables + tokenized gold/silver. No network needed for selection. */
    const DEFAULT_STABLECOIN_SYMBOLS = [
        'usdt', 'usdc', 'usds', 'usde', 'usd1', 'dai', 'pyusd', 'usdf', 'usdg', 'rlusd', 'bfusd', 'usdtb', 'usdd',
        'gho', 'usd0', 'tusd', 'eurc', 'fdusd', 'usx', 'busd', 'frax', 'crvusd', 'nusd', 'usda', 'ausd', 'satusd',
        'eurs', 'gusd', 'cash', 'pusd', 'avusd', 'frxusd', 'cusd', 'usr', 'dusd', 'usdr', 'mnee', 'xdai', 'usdz',
        'brz', 'dola', 'jusd', 'lisusd', 'feusd', 'jupusd', 'mim', 'usdm', 'usdo', 'aeur', 'euri', 'lusd', 'usn',
        'bold', 'eure', 'ustc', 'mimatic', 'susd', 'buck', 'usdn', 'honey', 'musd', 'usdb', 'usdcv', 'eusd', 'usdh',
        'nxusd', 'jpyc', 'fxusd', 'hyusd', 'wemix$', 'brla', 'xsgd', 'alusd', 'vcred', 'hollar', 'wusd', 'yusd',
        'tgbp', 'usdp', 'ylds', 'usdf', 'reusd', 'msusd', 'xtusd', 'zchf', 'usdx', 'cgusd', 'susda', 'yzusd',
        'xaut', 'paxg', 'kau', 'kag', 'pgold', 'xaut0', 'xaum', 'ggbr', 'dgld', 'cgo', 'vnxau', 'xnk', 'gldt',
        'slvon', 'slvr', 'onss', 'grams'
    ];

    /** CoinGecko ids for isStablecoinId when loader hasn't run yet */
    const DEFAULT_STABLECOIN_IDS = [
        'tether', 'usd-coin', 'tether-gold', 'pax-gold', 'kinesis-gold', 'kinesis-silver',
        'dai', 'usds', 'ethena-usde', 'usd1-wlfi', 'paypal-usd', 'dai', 'paxos-standard'
    ];

    /** Symbol/id -> peg label for tooltip "Стейблкоин {peg}" */
    const STABLECOIN_PEG_MAP = {
        xaut: 'ЗОЛОТО', paxg: 'ЗОЛОТО', kau: 'ЗОЛОТО', pgold: 'ЗОЛОТО', xaut0: 'ЗОЛОТО', xaum: 'ЗОЛОТО',
        ggbr: 'ЗОЛОТО', dgld: 'ЗОЛОТО', cgo: 'ЗОЛОТО', vnxau: 'ЗОЛОТО', xnk: 'ЗОЛОТО', gldt: 'ЗОЛОТО',
        kag: 'СЕРЕБРО', slvon: 'СЕРЕБРО', slvr: 'СЕРЕБРО', onss: 'СЕРЕБРО', grams: 'СЕРЕБРО',
        eurc: 'EUR', eurs: 'EUR', eurcv: 'EUR', eure: 'EUR', euri: 'EUR', aeur: 'EUR', eurr: 'EUR',
        tgbp: 'GBP', zchf: 'CHF', jpyc: 'JPY', brz: 'BRL', brla: 'BRL', xsgd: 'SGD'
    };

    /** Symbol/id -> base asset for tooltip "Обертка {base}" */
    const WRAPPED_BASE_MAP = {
        wbtc: 'BTC', weth: 'ETH', wbnb: 'BNB', wbt: 'BTC', wmatic: 'MATIC', wavax: 'AVAX',
        'wrapped-bitcoin': 'Bitcoin', 'wrapped-ether': 'Ethereum', 'wrapped-bnb': 'BNB',
        'wrapped-solana': 'SOL', 'wrapped-polygon': 'MATIC', 'wrapped-avax': 'AVAX',
        wsol: 'SOL', wftm: 'FTM', wcro: 'CRO', wone: 'ONE', wmovr: 'MOVR'
    };

    /** Symbol/id -> base asset for tooltip "LST {base}" */
    const LST_BASE_MAP = {
        steth: 'ETH', wsteth: 'stETH', wbeth: 'ETH', stbtc: 'BTC', wstbtc: 'stBTC',
        'wrapped-steth': 'stETH', 'lido-staked-ether': 'ETH', 'rocket-pool-eth': 'ETH',
        reth: 'ETH', cbeth: 'ETH', frxeth: 'ETH', sfrxeth: 'ETH', ankreth: 'ETH',
        stsol: 'SOL', msteth: 'stETH', sweth: 'ETH'
    };

    let stablecoins = []; // [{ id, symbol, name, baseCurrency, source, updatedAt }]
    let wrappedCoins = []; // [id1, id2, ...]
    let lstCoins = []; // [id1, id2, ...]

    function setStablecoins(list) {
        if (!Array.isArray(list)) return;
        stablecoins = list.map(item => ({
            id: item.id,
            symbol: (item.symbol || '').toLowerCase(),
            name: item.name || '',
            baseCurrency: item.baseCurrency || 'unknown',
            source: item.source || 'coingecko',
            updatedAt: item.updatedAt || Date.now()
        }));
    }

    function setWrappedCoins(list) {
        if (!Array.isArray(list)) return;
        wrappedCoins = list.map(id => String(id).toLowerCase());
    }

    function setLstCoins(list) {
        if (!Array.isArray(list)) return;
        lstCoins = list.map(id => String(id).toLowerCase());
    }

    function getStablecoins() {
        return [...stablecoins];
    }

    function getWrappedCoins() {
        return [...wrappedCoins];
    }

    function getLstCoins() {
        return [...lstCoins];
    }

    function getStablecoinSymbolsSet() {
        const fromLoader = stablecoins.map(s => s.symbol);
        return new Set([...DEFAULT_STABLECOIN_SYMBOLS, ...fromLoader]);
    }

    /** USD-pegged only (for menu "Стейблкоины USD") */
    function getUsdStablecoinSymbolsSet() {
        const all = getStablecoinSymbolsSet();
        const usd = new Set();
        all.forEach(sym => {
            const lower = sym.toLowerCase();
            if (!STABLECOIN_PEG_MAP[lower]) usd.add(lower);
            else if (STABLECOIN_PEG_MAP[lower] === 'USD') usd.add(lower);
        });
        stablecoins.filter(s => s.baseCurrency === 'usd').forEach(s => usd.add(s.symbol));
        return usd;
    }

    /** Non-USD: metals, other fiat (for menu "Валюты, металлы, фиат") */
    function getNonUsdStablecoinSymbolsSet() {
        const all = getStablecoinSymbolsSet();
        const nonUsd = new Set();
        all.forEach(sym => {
            const lower = sym.toLowerCase();
            const peg = STABLECOIN_PEG_MAP[lower] || (stablecoins.find(s => s.symbol === lower)?.baseCurrency?.toUpperCase());
            if (peg && peg !== 'USD') nonUsd.add(lower);
        });
        stablecoins.filter(s => s.baseCurrency && s.baseCurrency !== 'usd' && s.baseCurrency !== 'unknown').forEach(s => nonUsd.add(s.symbol));
        return nonUsd;
    }

    function isStablecoinSymbol(symbol) {
        if (!symbol) return false;
        return getStablecoinSymbolsSet().has(String(symbol).toLowerCase());
    }

    function isStablecoinId(id) {
        if (!id) return false;
        const lower = String(id).toLowerCase();
        return stablecoins.some(s => s.id === lower || s.symbol === lower)
            || DEFAULT_STABLECOIN_IDS.includes(lower)
            || DEFAULT_STABLECOIN_SYMBOLS.includes(lower);
    }

    /**
     * Check if coin is wrapped (Wrapped) or LST
     * @param {string} id - Coin ID
     * @param {string} symbol - Coin symbol (optional)
     * @param {string} name - Coin name (optional)
     * @returns {boolean}
     */
    function isWrappedOrLst(id, symbol = '', name = '') {
        const lowerId = String(id || '').toLowerCase();
        const lowerSymbol = String(symbol || '').toLowerCase();
        const lowerName = String(name || '').toLowerCase();

        // 1. Check pre-built lists first (high priority)
        if (wrappedCoins.includes(lowerId) || lstCoins.includes(lowerId)) {
            return true;
        }

        // 2. Heuristic search for "wrap" substring
        if (lowerId.includes('wrapped') || lowerName.includes('wrapped')) {
            return true;
        }

        // Check symbol
        if (lowerSymbol.startsWith('w') && lowerSymbol.length > 1) {
            return true;
        }

        return false;
    }

    /**
     * Get coin type (for UI indicators)
     * @param {string} id - Coin ID
     * @param {string} symbol - Coin symbol (optional)
     * @param {string} name - Coin name (optional)
     * @returns {'stable'|'wrapped'|'lst'|null}
     */
    function getCoinType(id, symbol = '', name = '') {
        if (!id) return null;
        const lowerId = String(id).toLowerCase();

        if (isStablecoinId(lowerId)) {
            return 'stable';
        }

        if (wrappedCoins.includes(lowerId)) {
            return 'wrapped';
        }

        if (lstCoins.includes(lowerId)) {
            return 'lst';
        }

        // If not in lists but looks like wrapped/LST — treat as wrapped
        if (isWrappedOrLst(lowerId, symbol, name)) {
            return 'wrapped';
        }

        return null;
    }

    /**
     * Coin type icon (SSOT for UI)
     * @param {'stable'|'wrapped'|'lst'|null} type
     * @returns {string|null}
     */
    function getCoinTypeIcon(type) {
        if (type === 'stable') return '🪙';
        if (type === 'wrapped') return '🔁';
        if (type === 'lst') return '🔥';
        return null;
    }

    /**
     * Base asset label for wrapped tooltip ("Обертка {base}")
     * @param {string} id - Coin ID
     * @param {string} symbol - Coin symbol
     * @param {string} name - Coin name
     * @returns {string}
     */
    function getWrappedBaseLabel(id, symbol, name) {
        const lowerId = String(id || '').toLowerCase();
        const lowerSym = String(symbol || '').toLowerCase();
        const fromMap = WRAPPED_BASE_MAP[lowerSym] || WRAPPED_BASE_MAP[lowerId];
        if (fromMap) return fromMap;
        if (lowerId.startsWith('wrapped-')) {
            const base = lowerId.replace('wrapped-', '').replace(/-/g, ' ');
            return base.charAt(0).toUpperCase() + base.slice(1).replace(/\b\w/g, c => c.toUpperCase());
        }
        if (lowerSym.startsWith('w') && lowerSym.length > 1) {
            return lowerSym.slice(1).toUpperCase();
        }
        const fromName = (name || '').replace(/^wrapped\s+/i, '');
        return fromName || '?';
    }

    /**
     * Base asset label for LST tooltip ("LST {base}")
     * @param {string} id - Coin ID
     * @param {string} symbol - Coin symbol
     * @returns {string}
     */
    function getLstBaseLabel(id, symbol) {
        const lowerId = String(id || '').toLowerCase();
        const lowerSym = String(symbol || '').toLowerCase();
        const fromMap = LST_BASE_MAP[lowerSym] || LST_BASE_MAP[lowerId];
        if (fromMap) return fromMap;
        if (lowerId.endsWith('-steth')) return 'stETH';
        if (lowerId.includes('staked-')) {
            const base = lowerId.replace('staked-', '').replace(/-/g, ' ');
            return base.charAt(0).toUpperCase() + base.slice(1).replace(/\b\w/g, c => c.toUpperCase());
        }
        if (lowerSym.startsWith('st') && lowerSym.length > 2) return lowerSym.toUpperCase();
        return '?';
    }

    /**
     * Peg label for stablecoin tooltip (ЗОЛОТО, СЕРЕБРО, USD, EUR, etc.)
     * @param {string} id - Coin ID
     * @param {string} symbol - Coin symbol
     * @returns {string}
     */
    function getStablecoinPegLabel(id, symbol) {
        const lowerId = String(id || '').toLowerCase();
        const lowerSym = String(symbol || '').toLowerCase();
        const fromMap = STABLECOIN_PEG_MAP[lowerSym] || STABLECOIN_PEG_MAP[lowerId];
        if (fromMap) return fromMap;
        const fromLoader = stablecoins.find(s => s.id === lowerId || s.symbol === lowerSym);
        if (fromLoader && fromLoader.baseCurrency && fromLoader.baseCurrency !== 'other') {
            return fromLoader.baseCurrency.toUpperCase();
        }
        return 'USD';
    }

    /**
     * Coin type tooltip (SSOT for UI)
     * @param {'stable'|'wrapped'|'lst'|null} type
     * @param {string} [id] - Coin ID (for stable/wrapped/lst: base label)
     * @param {string} [symbol] - Coin symbol (for stable/wrapped/lst: base label)
     * @param {string} [name] - Coin name (for wrapped: fallback parse)
     * @returns {string|null}
     */
    function getCoinTypeTitle(type, id, symbol, name) {
        if (type === 'stable') {
            if (id || symbol) return `Стейблкоин ${getStablecoinPegLabel(id, symbol)}`;
            return 'Стейблкоин';
        }
        if (type === 'wrapped') {
            if (id || symbol || name) return `Обертка ${getWrappedBaseLabel(id, symbol, name)}`;
            return 'Обертка';
        }
        if (type === 'lst') {
            if (id || symbol) return `LST ${getLstBaseLabel(id, symbol)}`;
            return 'LST';
        }
        return null;
    }

    // Export to global scope
    window.coinsConfig = {
        setStablecoins,
        setWrappedCoins,
        setLstCoins,
        getStablecoins,
        getWrappedCoins,
        getLstCoins,
        getStablecoinSymbolsSet,
        getUsdStablecoinSymbolsSet,
        getNonUsdStablecoinSymbolsSet,
        isStablecoinSymbol,
        isStablecoinId,
        isWrappedOrLst,
        getCoinType,
        getCoinTypeIcon,
        getCoinTypeTitle
    };

    console.log('coins-config.js: initialized');
})();
