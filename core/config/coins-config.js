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
 * REFERENCES:
 * - SSOT: id:sk-e0b8f3 (section "SSOT")
 */

(function() {
    'use strict';

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
        return new Set(stablecoins.map(s => s.symbol));
    }

    function isStablecoinSymbol(symbol) {
        if (!symbol) return false;
        return getStablecoinSymbolsSet().has(String(symbol).toLowerCase());
    }

    function isStablecoinId(id) {
        if (!id) return false;
        const lower = String(id).toLowerCase();
        return stablecoins.some(s => s.id === lower || s.symbol === lower);
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
     * Coin type tooltip (SSOT for UI)
     * @param {'stable'|'wrapped'|'lst'|null} type
     * @returns {string|null}
     */
    function getCoinTypeTitle(type) {
        if (type === 'stable') return 'Стейблкоин';
        if (type === 'wrapped') return 'Обертка';
        if (type === 'lst') return 'LST';
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
        isStablecoinSymbol,
        isStablecoinId,
        isWrappedOrLst,
        getCoinType,
        getCoinTypeIcon,
        getCoinTypeTitle
    };

    console.log('coins-config.js: initialized');
})();
