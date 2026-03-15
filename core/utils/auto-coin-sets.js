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
 * - Classifier: #JS-jy6Q4juu (coins-config.js)
 */

(function() {
    'use strict';

    // Keys stay stable so the modal and background classifiers see the same persisted auto-sets.
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
            console.warn(`auto-coin-sets: unknown auto-set type "${type}"`);
            return [];
        }

        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`auto-coin-sets: auto-set read failed for "${type}":`, error);
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
            console.warn(`auto-coin-sets: unknown auto-set type "${type}"`);
            return 0;
        }

        if (!Array.isArray(newCoins) || newCoins.length === 0) {
            return 0;
        }

        try {
            const existing = getAutoSet(type);
            const existingIds = new Set(existing.map(c => c.id));

            // Auto-sets remain append-only so repeated classifications never duplicate rows.
            const uniqueNewCoins = newCoins.filter(coin => {
                return coin && coin.id && !existingIds.has(coin.id);
            });

            if (uniqueNewCoins.length === 0) {
                return 0;
            }

            const coinsToAdd = uniqueNewCoins.map(coin => ({
                id: coin.id,
                symbol: coin.symbol || '',
                name: coin.name || ''
            }));

            const updated = [...existing, ...coinsToAdd];
            localStorage.setItem(key, JSON.stringify(updated));

            console.log(`auto-coin-sets: added ${coinsToAdd.length} coins to "${type}"`);
            return coinsToAdd.length;
        } catch (error) {
            console.error(`auto-coin-sets: auto-set write failed for "${type}":`, error);
            return 0;
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
            console.warn('auto-coin-sets: coinsConfig not loaded, classification skipped');
            return;
        }

        const stablecoins = [];
        const wrapped = [];
        const lst = [];

        // Wrapped/LST exact lists take priority over heuristic type guesses.
        const wrappedIds = new Set(window.coinsConfig.getWrappedCoins());
        const lstIds = new Set(window.coinsConfig.getLstCoins());

        coins.forEach(coin => {
            if (!coin || !coin.id) return;

            const coinId = String(coin.id).toLowerCase();

            if (window.coinsConfig.isStablecoinId(coin.id)) {
                stablecoins.push(coin);
                return;
            }

            if (window.coinsConfig.isWrappedOrLst(coin.id, coin.symbol, coin.name)) {
                if (wrappedIds.has(coinId)) {
                    wrapped.push(coin);
                } else if (lstIds.has(coinId)) {
                    lst.push(coin);
                } else {
                    // Heuristic matches are biased to wrapped so unknown LSTs never masquerade as stablecoins.
                    wrapped.push(coin);
                }
            }
        });

        const addedStablecoins = stablecoins.length > 0 ? addToAutoSet('stablecoins', stablecoins) : 0;
        const addedWrapped = wrapped.length > 0 ? addToAutoSet('wrapped', wrapped) : 0;
        const addedLst = lst.length > 0 ? addToAutoSet('lst', lst) : 0;

        const total = stablecoins.length + wrapped.length + lst.length;
        if (total > 0) {
            console.log(`auto-coin-sets: classified ${total} coins (stable: ${stablecoins.length}, wrapped: ${wrapped.length}, lst: ${lst.length})`);
        }

        if (addedStablecoins + addedWrapped + addedLst > 0) {
            emitAutoSetsUpdated('classify', {
                added: {
                    stablecoins: addedStablecoins,
                    wrapped: addedWrapped,
                    lst: addedLst
                }
            });
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
            console.warn(`auto-coin-sets: unknown auto-set type "${type}"`);
            return;
        }

        try {
            localStorage.removeItem(key);
            emitAutoSetsUpdated('clear', { type });
            console.log(`auto-coin-sets: cleared "${type}"`);
        } catch (error) {
            console.error(`auto-coin-sets: auto-set clear failed for "${type}":`, error);
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

    function emitAutoSetsUpdated(reason, payload = {}) {
        if (!window.eventBus || typeof window.eventBus.emit !== 'function') return;

        window.eventBus.emit('auto-coin-sets-updated', {
            reason,
            ...payload,
            counts: {
                stablecoins: getAutoSetCount('stablecoins'),
                wrapped: getAutoSetCount('wrapped'),
                lst: getAutoSetCount('lst')
            },
            updatedAt: Date.now()
        });
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
