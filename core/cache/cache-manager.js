/**
 * #JS-XsMewXpA
 * @description Unified cache interface for all components; abstraction over localStorage and IndexedDB.
 * @skill id:sk-3c832d
 *
 * PURPOSE: Single access point to cache; versioned keys for API data, non-versioned for user data.
 *
 * VERSIONING:
 * - Versioned (prefix v:{hash}:{key}): icons-cache, coins-list, api-cache, market-metrics, crypto-news-state.
 *   Reason: structure depends on external APIs; format changes cause parse errors.
 * - Not versioned: settings, portfolios, strategies, time-series, theme, timezone, favorites, ui-state, provider keys.
 *   Reason: persist across updates; use schema migrations when needed.
 * - getVersionedKey(): version from versionedKeys array via appConfig.getVersionHash(); user data excluded.
 *
 * METHODS:
 * - get(key, options) — value with TTL check and migrations
 * - set(key, value, options) — save with automatic layer detection
 * - has(key, options), delete(key, options)
 * - clearOldVersions() — remove keys of all versions except current
 *
 * USAGE:
 * await cacheManager.get('coins-list');
 * await cacheManager.set('coins-list', data, { ttl: 86400000 });
 * await cacheManager.clearOldVersions();
 *
 * REFERENCES:
 * - General caching principles: id:sk-3c832d
 */

(function() {
    'use strict';

    // Dependencies (loaded before this script)
    // - #JS-Fc2QzeBn (storage-layers.js) (window.storageLayers)
    // - #JS-8P3M724Z (cache-config.js) (window.cacheConfig)
    // - #JS-FWhpDFTW (cache-migrations.js) (window.cacheMigrations)

    if (typeof window.storageLayers === 'undefined') {
        console.error('cache-manager.js: storageLayers not loaded');
        return;
    }

    if (typeof window.cacheConfig === 'undefined') {
        console.error('cache-manager.js: cacheConfig not loaded');
        return;
    }

    /**
     * Get app version hash for cache versioning
     * @returns {string} - version hash or 'default'
     */
    function getAppVersionHash() {
        if (window.appConfig && typeof window.appConfig.getVersionHash === 'function') {
            return window.appConfig.getVersionHash();
        }
        return 'default';
    }

    /**
     * Determine storage layer for key
     * @param {string} key - cache key
     * @returns {string} - 'hot', 'warm' or 'cold'
     */
    function getStorageLayer(key) {
        const layerConfig = window.storageLayers.getLayerForKey(key);
        return layerConfig ? layerConfig.layer : 'hot';
    }

    /**
     * Get versioned cache key
     * Adds version prefix for keys that should invalidate on version change
     * @param {string} key - source key
     * @param {boolean} useVersioning - whether to use versioning (default auto-detected)
     * @returns {string} - versioned key like 'v:{hash}:{key}' or source key
     */
    function getVersionedKey(key, useVersioning = null) {
        // Auto-detect versioning necessity
        if (useVersioning === null) {
            // @skill-anchor id:sk-3c832d #for-key-versioning
            const versionedKeys = [
                'icons-cache',        // Coin icons (CoinGecko API structure)
                'coins-list',         // Coin list (CoinGecko API structure)
                'api-cache',          // API response cache (external API structure)
                'market-metrics',     // Market metrics (external API structure)
                'crypto-news-state',  // News state (structure depends on AI provider prompt)
                'stablecoins-list'    // Stablecoins list (CoinGecko API structure)
            ];
            useVersioning = versionedKeys.includes(key);
        }

        if (!useVersioning) {
            return key;
        }

        const versionHash = getAppVersionHash();
        return `v:${versionHash}:${key}`;
    }

    /**
     * Get value from cache
     * @param {string} key - key
     * @param {Object} options - options (strategy, ttl, useVersioning)
     * @returns {Promise<any>} - value or null
     */
    async function get(key, options = {}) {
        try {
            const versionedKey = getVersionedKey(key, options.useVersioning);
            const layer = getStorageLayer(key);
            const storage = window.storageLayers.getStorage(layer);

            if (!storage) {
                return null;
            }

            const cached = await storage.get(versionedKey);

            if (!cached) {
                return null;
            }

            // TTL check
            if (cached.expiresAt && cached.expiresAt < Date.now()) {
                await storage.delete(versionedKey);
                return null;
            }

            // Migrate data if needed
            if (cached.version && window.cacheMigrations) {
                const migrated = await window.cacheMigrations.migrate(key, cached);
                if (migrated !== cached) {
                    await storage.set(key, migrated);
                }
            }

            return cached.data;
        } catch (error) {
            console.error(`cache-manager.get(${key}):`, error);
            return null;
        }
    }

    /**
     * Save value to cache
     * @param {string} key - key
     * @param {any} value - value
     * @param {Object} options - options (ttl, version, useVersioning)
     * @returns {Promise<boolean>} - success
     */
    async function set(key, value, options = {}) {
        try {
            const versionedKey = getVersionedKey(key, options.useVersioning);
            const layer = getStorageLayer(key);
            const storage = window.storageLayers.getStorage(layer);

            if (!storage) {
                return false;
            }

            const ttl = options.ttl || window.cacheConfig.getTTL(key);
            const version = options.version || window.cacheConfig.getVersion(key);

            const cached = {
                data: value,
                version: version,
                timestamp: Date.now(),
                expiresAt: ttl ? Date.now() + ttl : null
            };

            await storage.set(versionedKey, cached);
            return true;
        } catch (error) {
            console.error(`cache-manager.set(${key}):`, error);
            return false;
        }
    }

    /**
     * Check if key exists in cache
     * @param {string} key - key
     * @param {Object} options - options (useVersioning)
     * @returns {Promise<boolean>}
     */
    async function has(key, options = {}) {
        try {
            const versionedKey = getVersionedKey(key, options.useVersioning);
            const layer = getStorageLayer(key);
            const storage = window.storageLayers.getStorage(layer);

            if (!storage) {
                return false;
            }

            return await storage.has(versionedKey);
        } catch (error) {
            console.error(`cache-manager.has(${key}):`, error);
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - key
     * @param {Object} options - options (useVersioning)
     * @returns {Promise<boolean>}
     */
    async function deleteKey(key, options = {}) {
        try {
            const versionedKey = getVersionedKey(key, options.useVersioning);
            const layer = getStorageLayer(key);
            const storage = window.storageLayers.getStorage(layer);

            if (!storage) {
                return false;
            }

            await storage.delete(versionedKey);
            return true;
        } catch (error) {
            console.error(`cache-manager.delete(${key}):`, error);
            return false;
        }
    }

    /**
     * Clear entire cache or layer
     * @param {string} layer - layer ('hot', 'warm', 'cold') or null for all
     * @returns {Promise<boolean>}
     */
    async function clear(layer = null) {
        try {
            if (layer) {
                const storage = window.storageLayers.getStorage(layer);
                if (storage) {
                    await storage.clear();
                }
            } else {
                // Clear all layers
                for (const layerName of ['hot', 'warm', 'cold']) {
                    const storage = window.storageLayers.getStorage(layerName);
                    if (storage) {
                        await storage.clear();
                    }
                }
            }
            return true;
        } catch (error) {
            console.error(`cache-manager.clear(${layer}):`, error);
            return false;
        }
    }

    // Export to global scope
    /**
     * Clear cache of old app versions
     * Removes all keys with version prefix except current
     * @returns {Promise<number>} - count of removed keys
     */
    async function clearOldVersions() {
        try {
            const currentVersionHash = getAppVersionHash();
            let deletedCount = 0;

            // Iterate over all storage layers
            const layers = ['hot', 'warm', 'cold'];
            for (const layerName of layers) {
                const storage = window.storageLayers.getStorage(layerName);
                if (!storage) continue;

                // Get all keys from layer
                const allKeys = await storage.keys();

                // Filter keys with version prefix
                for (const key of allKeys) {
                    if (key.startsWith('v:') && !key.startsWith(`v:${currentVersionHash}:`)) {
                        await storage.delete(key);
                        deletedCount++;
                    }
                }
            }

            console.log(`cache-manager: cleared ${deletedCount} old version keys`);
            return deletedCount;
        } catch (error) {
            console.error('cache-manager.clearOldVersions:', error);
            return 0;
        }
    }

    window.cacheManager = {
        get,
        set,
        has,
        delete: deleteKey,
        clear,
        clearOldVersions,
        getVersionedKey,
        getAppVersionHash
    };

    console.log('cache-manager.js: initialized');
})();

