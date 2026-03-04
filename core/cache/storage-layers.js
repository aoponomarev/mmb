/**
 * ================================================================================================
 * STORAGE LAYERS - Data partitioning by storage layers
 * ================================================================================================
 *
 * PURPOSE: Distribute cache keys across storages (localStorage/IndexedDB) by size and access frequency.
 * @skill core/skills/cache-layer
 *
 * HOT (localStorage, ≤5MB) — synchronous access, fast:
 * - settings, theme, timezone, favorites, ui-state, active-tab — settings and UI state
 *   Reason: small size (<10KB), frequent access on every render/action, sync is important
 * - icons-cache — object {coinId: url}
 *   Reason: size ~100-500KB, access on every coin display, sync critical for rendering
 *
 * WARM (IndexedDB, ≤50MB) — async access, medium size:
 * - coins-list — list of all coins from CoinGecko API
 *   Reason: size 1-5MB (JSON), frequent access for search/filter, structured data
 * - market-metrics — market metrics
 *   Reason: size 100KB-2MB, frequent access, updated regularly
 * - api-cache — API response cache
 *   Reason: size depends on request count, frequent access, structured data
 *
 * COLD (IndexedDB, ≤500MB) — async access, large volumes:
 * - time-series — price time series
 *   Reason: size 10-100MB+ (thousands of points), rare access (on demand), indexes needed for search
 * - history — operation history
 *   Reason: size grows over time, rare access, indexes needed
 * - portfolios, strategies — portfolios and strategies
 *   Reason: size depends on user (can be large), rare access, structured data
 * - correlations — correlations between assets
 *   Reason: size can be large (matrices), rare access, computed data
 *
 * ADDING A NEW KEY:
 * - localStorage: sync access, ~5MB limit, simple structures
 * - IndexedDB: async access, large volumes, structured data, indexes
 * - Limits: overflow protection, priority cleanup (cold → warm → hot)
 *
 * ADDING A NEW KEY:
 * 1. Estimate size (<100KB → hot, 100KB-10MB → warm, >10MB → cold)
 * 2. Estimate access frequency (every render → hot/warm, on demand → cold)
 * 3. Estimate data type (simple objects → localStorage, arrays/structures → IndexedDB)
 * 4. Add key to LAYERS.{layer}.keys array
 *
 * REFERENCE: General caching principles: core/skills/cache-layer
 */

(function() {
    'use strict';

    const LAYERS = {
        hot: {
            type: 'localStorage',
            maxSize: 5 * 1024 * 1024, // 5MB
            keys: [
                'settings',
                'favorites',
                'ui-state',
                'active-tab',
                'theme',
                'icons-cache' // Coin icons (object {coinId: url})
            ]
        },
        warm: {
            type: 'indexedDB',
            maxSize: 50 * 1024 * 1024, // 50MB
            keys: [
                'coins-list',
                'market-metrics',
                'api-cache' // API response cache
            ]
        },
        cold: {
            type: 'indexedDB',
            maxSize: 500 * 1024 * 1024, // 500MB
            keys: [
                'time-series',
                'history',
                'portfolios',
                'strategies',
                'correlations'
            ]
        }
    };

    /**
     * Get layer config for key
     * @param {string} key - cache key
     * @returns {Object|null} - layer config or null
     */
    function getLayerForKey(key) {
        for (const [layerName, config] of Object.entries(LAYERS)) {
            if (config.keys.includes(key)) {
                return { layer: layerName, ...config };
            }
        }
        // Default hot for unknown keys
        return { layer: 'hot', ...LAYERS.hot };
    }

    /**
     * Get storage object for layer
     * @param {string} layer - 'hot', 'warm' or 'cold'
     * @returns {Object|null} - storage object with get/set/has/delete/clear methods
     */
    function getStorage(layer) {
        const config = LAYERS[layer];
        if (!config) {
            return null;
        }

        if (config.type === 'localStorage') {
            return {
                get: async (key) => {
                    try {
                        const item = localStorage.getItem(key);
                        if (!item) return null;

                        // Try to parse as JSON
                        try {
                            const parsed = JSON.parse(item);
                            // If object has data/version/timestamp - new cacheManager format
                            // If string or primitive - old value, need to wrap
                            if (parsed && typeof parsed === 'object' && (parsed.data !== undefined || parsed.version !== undefined)) {
                                return parsed;
                            }
                            // Old value (string or primitive) - wrap in new format
                            return {
                                data: parsed,
                                version: '1.0.0',
                                timestamp: Date.now(),
                                expiresAt: null
                            };
                        } catch (parseError) {
                            // If not JSON - old string, wrap it
                            return {
                                data: item,
                                version: '1.0.0',
                                timestamp: Date.now(),
                                expiresAt: null
                            };
                        }
                    } catch (error) {
                        console.error(`localStorage.get(${key}):`, error);
                        return null;
                    }
                },
                set: async (key, value) => {
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                        return true;
                    } catch (error) {
                        // localStorage overflow
                        console.error(`localStorage.set(${key}):`, error);
                        return false;
                    }
                },
                has: async (key) => {
                    return localStorage.getItem(key) !== null;
                },
                delete: async (key) => {
                    localStorage.removeItem(key);
                    return true;
                },
                clear: async () => {
                    // Clear only keys of this layer
                    for (const key of config.keys) {
                        localStorage.removeItem(key);
                    }
                    return true;
                },
                keys: async () => {
                    // Get all keys from localStorage
                    const allKeys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key) {
                            allKeys.push(key);
                        }
                    }
                    return allKeys;
                }
            };
        } else if (config.type === 'indexedDB') {
            // IndexedDB will be implemented later
            // For now return stub
            return {
                get: async (key) => {
                    console.warn(`IndexedDB for ${layer} not yet implemented, using localStorage`);
                    try {
                        const item = localStorage.getItem(`idb_${layer}_${key}`);
                        return item ? JSON.parse(item) : null;
                    } catch (error) {
                        return null;
                    }
                },
                set: async (key, value) => {
                    console.warn(`IndexedDB for ${layer} not yet implemented, using localStorage`);
                    try {
                        localStorage.setItem(`idb_${layer}_${key}`, JSON.stringify(value));
                        return true;
                    } catch (error) {
                        return false;
                    }
                },
                has: async (key) => {
                    return localStorage.getItem(`idb_${layer}_${key}`) !== null;
                },
                delete: async (key) => {
                    localStorage.removeItem(`idb_${layer}_${key}`);
                    return true;
                },
                clear: async () => {
                    for (const key of config.keys) {
                        localStorage.removeItem(`idb_${layer}_${key}`);
                    }
                    return true;
                },
                keys: async () => {
                    // Get all keys for this layer from localStorage (fallback for IndexedDB)
                    const prefix = `idb_${layer}_`;
                    const allKeys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith(prefix)) {
                            // Remove prefix
                            allKeys.push(key.substring(prefix.length));
                        }
                    }
                    return allKeys;
                }
            };
        }

        return null;
    }

    // Export to global scope
    window.storageLayers = {
        LAYERS,
        getLayerForKey,
        getStorage
    };

    console.log('storage-layers.js: initialized');
})();

