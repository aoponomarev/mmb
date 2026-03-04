/**
 * #JS-xc26vutn
 * @description Automatic classification and management of coin sets (stablecoins, wrapped, LST) from loaded coins.
 * @skill id:sk-02d3ea
 *
 * PRINCIPLES:
 * - Auto-sets are formed on each coin load (from rankings or direct search)
 * - Coins are added to auto-sets without duplicates
 * - Auto-sets are stored in localStorage and never cleared automatically
 * - Classification uses coinsConfig as SSOT
 *
 * STORAGE:
 * - `auto-set-stablecoins` - stablecoins auto-set
 * - `auto-set-wrapped` - wrapped tokens auto-set
 * - `auto-set-lst` - LST (liquid staking tokens) auto-set
 *
 * REFERENCES:
 * - SSOT: id:sk-e0b8f3
 * - Classifier: core/config/coins-config.js
 */

(function() {
    'use strict';

    // Keys for storing auto-sets in localStorage
    const AUTO_SET_KEYS = {
        stablecoins: 'auto-set-stablecoins',
        wrapped: 'auto-set-wrapped',
        lst: 'auto-set-lst'
    };

    /**
     * Get auto-set from localStorage
     * @param {string} type - Auto-set type ('stablecoins' | 'wrapped' | 'lst')
     * @returns {Array} Array of coin objects { id, symbol, name }
     */
    function getAutoSet(type) {
        const key = AUTO_SET_KEYS[type];
        if (!key) {
            console.warn(`auto-coin-sets: unknown type автонабора "${type}"`);
            return [];
        }

        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`auto-coin-sets: read error автонабора "${type}":`, error);
            return [];
        }
    }

    /**
     * Add coins to auto-set (no duplicates)
     * @param {string} type - Auto-set type ('stablecoins' | 'wrapped' | 'lst')
     * @param {Array} newCoins - Array of coins to add
     */
    function addToAutoSet(type, newCoins) {
        const key = AUTO_SET_KEYS[type];
        if (!key) {
            console.warn(`auto-coin-sets: unknown type автонабора "${type}"`);
            return;
        }

        if (!Array.isArray(newCoins) || newCoins.length === 0) {
            return;
        }

        try {
            const existing = getAutoSet(type);
            const existingIds = new Set(existing.map(c => c.id));

            // Filter only new coins
            const uniqueNewCoins = newCoins.filter(coin => {
                return coin && coin.id && !existingIds.has(coin.id);
            });

            if (uniqueNewCoins.length === 0) {
                return; // No new coins to add
            }

            // Keep only required fields
            const coinsToAdd = uniqueNewCoins.map(coin => ({
                id: coin.id,
                symbol: coin.symbol || '',
                name: coin.name || ''
            }));

            const updated = [...existing, ...coinsToAdd];
            localStorage.setItem(key, JSON.stringify(updated));

            console.log(`auto-coin-sets: добавлено ${coinsToAdd.length} монет в "${type}"`);
        } catch (error) {
            console.error(`auto-coin-sets: ошибка добавления в автонабор "${type}":`, error);
        }
    }

    /**
     * Classify coins and update auto-sets
     * @param {Array} coins - Array of coins to classify
     */
    function classifyAndUpdateAutoSets(coins) {
        if (!coins || !Array.isArray(coins) || coins.length === 0) {
            return;
        }

        if (!window.coinsConfig) {
            console.warn('auto-coin-sets: coinsConfig not loaded, классификация невозможна');
            return;
        }

        const stablecoins = [];
        const wrapped = [];
        const lst = [];

        // Get lists for membership check
        const wrappedIds = new Set(window.coinsConfig.getWrappedCoins());
        const lstIds = new Set(window.coinsConfig.getLstCoins());

        // Classify each coin
        coins.forEach(coin => {
            if (!coin || !coin.id) return;

            const coinId = String(coin.id).toLowerCase();

            // 1. Stablecoins
            if (window.coinsConfig.isStablecoinId(coin.id)) {
                stablecoins.push(coin);
                return; // Stablecoin cannot be both wrapped and lst
            }

            // 2. Wrapped or LST
            if (window.coinsConfig.isWrappedOrLst(coin.id, coin.symbol, coin.name)) {
                // Determine exact type from coins.json lists
                if (wrappedIds.has(coinId)) {
                    wrapped.push(coin);
                } else if (lstIds.has(coinId)) {
                    lst.push(coin);
                } else {
                    // Matched by heuristic (e.g. symbol starts with 'w')
                    // Conservatively assign to wrapped
                    wrapped.push(coin);
                }
            }
        });

        // Update auto-sets
        if (stablecoins.length > 0) {
            addToAutoSet('stablecoins', stablecoins);
        }
        if (wrapped.length > 0) {
            addToAutoSet('wrapped', wrapped);
        }
        if (lst.length > 0) {
            addToAutoSet('lst', lst);
        }

        // Log classification results
        const total = stablecoins.length + wrapped.length + lst.length;
        if (total > 0) {
            console.log(`auto-coin-sets: классифицировано ${total} монет (стейблы: ${stablecoins.length}, wrapped: ${wrapped.length}, LST: ${lst.length})`);
        }
    }

    /**
     * Get all auto-sets
     * @returns {Object} Object with three arrays: { stablecoins, wrapped, lst }
     */
    function getAllAutoSets() {
        const result = {
            stablecoins: getAutoSet('stablecoins'),
            wrapped: getAutoSet('wrapped'),
            lst: getAutoSet('lst')
        };
        return result;
    }

    /**
     * Clear auto-set (for debugging/manual management only)
     * @param {string} type - Auto-set type to clear
     */
    function clearAutoSet(type) {
        const key = AUTO_SET_KEYS[type];
        if (!key) {
            console.warn(`auto-coin-sets: unknown type автонабора "${type}"`);
            return;
        }

        try {
            localStorage.removeItem(key);
            console.log(`auto-coin-sets: автонабор "${type}" очищен`);
        } catch (error) {
            console.error(`auto-coin-sets: ошибка очистки автонабора "${type}":`, error);
        }
    }

    /**
     * Get coin count in auto-set
     * @param {string} type - Auto-set type
     * @returns {number}
     */
    function getAutoSetCount(type) {
        return getAutoSet(type).length;
    }

    // Export to global scope
    window.autoCoinSets = {
        classifyAndUpdateAutoSets,
        getAutoSet,
        getAllAutoSets,
        getAutoSetCount,
        clearAutoSet, // For debugging
        AUTO_SET_KEYS // For use in other modules
    };

    console.log('auto-coin-sets.js: initialized');
})();
