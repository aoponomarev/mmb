/**
 * #JS-Lh3NhHGs
 * @description Local "Draft" coin set in localStorage; transfer between accounts on one device.
 * @skill id:sk-02d3ea
 *
 * PRINCIPLES:
 * - Stored only in localStorage (not synced with D1)
 * - Accessible to all users on the device
 * - Automatically loaded at application startup
 * - Can be updated from any account
 *
 * USAGE:
 * const draftSet = window.draftCoinSet.get();
 * window.draftCoinSet.save(coinIds, coinsData);
 * window.draftCoinSet.clear();
 *
 * REFERENCES:
 * - Coin Sets: #JS-W23K9iSC (coin-set-load-modal-body.js)
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'draft-coin-set';

    /**
     * Extract tickers from coin data
     * @param {Array<Object>|null} coinsData - Full coin data
     * @param {Array<string>} coinIds - Array of coin IDs (fallback)
     * @returns {string} Comma-separated tickers string (sorted alphabetically)
     */
    function extractTickers(coinsData, coinIds = []) {
        if (coinsData && Array.isArray(coinsData) && coinsData.length > 0) {
            // Extract tickers from full coin data and sort alphabetically
            return coinsData
                .map(coin => coin.symbol || coin.id)
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .join(', ');
        }
        // If no full data, use coinIds as fallback (also sorted)
        if (coinIds && coinIds.length > 0) {
            return coinIds
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .join(', ');
        }
        // If no full data, return empty string
        return '';
    }

    /**
     * Get "Draft" set from localStorage
     * @returns {Object|null} Coin set or null
     */
    function getDraftSet() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return null;
            }
            const parsed = JSON.parse(stored);
            const coinIds = parsed.coin_ids || [];
            const coinsData = parsed.coins || null;

            // Extract tickers: first from saved, then from full coin data, then from coin_ids
            let tickers = parsed.tickers || '';
            if (!tickers || tickers.trim().length === 0) {
                tickers = extractTickers(coinsData, coinIds);
            } else {
                // If tickers exist but unsorted, re-sort alphabetically
                const tickersArray = tickers
                    .split(',')
                    .map(t => t.trim())
                    .filter(t => t.length > 0);
                if (tickersArray.length > 0) {
                    tickers = tickersArray
                        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                        .join(', ');
                }
            }

            const result = {
                id: 'draft',
                name: 'Draft (черновик)',
                description: 'Локальный набор (только на этом устройстве)',
                coin_ids: coinIds,
                coins: coinsData,
                tickers: tickers, // Строка с тикерами через запятую
                is_draft: true,
                is_local: true
            };

            return result;
        } catch (error) {
            console.error('draft-coin-set.getDraftSet error:', error);
            return null;
        }
    }

    /**
     * Save "Draft" set to localStorage
     * @param {Array<string>} coinIds - Array of coin IDs
     * @param {Array<Object>|null} coinsData - Full coin data (optional)
     */
    function saveDraftSet(coinIds, coinsData = null) {
        try {
            // Extract tickers from coin data
            const tickers = extractTickers(coinsData, coinIds);

            const data = {
                coin_ids: coinIds || [],
                coins: coinsData || null,
                tickers: tickers, // Строка с тикерами через запятую
                updated_at: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('✅ Draft набор сохранен:', coinIds.length, 'монет', tickers ? `(${tickers})` : '');
        } catch (error) {
            console.error('draft-coin-set.saveDraftSet error:', error);
        }
    }

    /**
     * Initialize "Draft" set (if not yet exists)
     * @param {Array<string>} defaultCoinIds - Default coin IDs (optional, default empty array)
     */
    function initializeDraftSet(defaultCoinIds = []) {
        const existing = getDraftSet();
        if (!existing || existing.coin_ids.length === 0) {
            saveDraftSet(defaultCoinIds || []);
            console.log('✅ Draft набор initialized:', defaultCoinIds.length || 0, 'монет');
        }
    }

    /**
     * Clear "Draft" set
     */
    function clearDraftSet() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('✅ Draft набор очищен');
        } catch (error) {
            console.error('draft-coin-set.clearDraftSet error:', error);
        }
    }

    // Export to global scope
    window.draftCoinSet = {
        get: getDraftSet,
        save: saveDraftSet,
        clear: clearDraftSet,
        initialize: initializeDraftSet
    };

    console.log('✅ draft-coin-set utility loaded');
})();
