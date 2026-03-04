/**
 * ================================================================================================
 * COINS METADATA LOADER
 * ================================================================================================
 * Skill: core/skills/api-layer
 *
 * PURPOSE: Load centralized coin metadata (stablecoins, wrapped, LST)
 *
 * @skill-anchor core/skills/api-layer #for-layer-separation
 * @skill-anchor core/skills/data-providers-architecture #for-data-provider-interface
 * from external JSON file on GitHub CDN.
 *
 * FILE: libs/assets/data/coins.json
 *
 * ARCHITECTURE:
 * - Loads data on startup or on demand
 * - Caches via cacheManager (TTL: 24h)
 * - Populates window.coinsConfig (SSOT)
 */

(function() {
    'use strict';

    const CONFIG = {
        baseUrl: 'https://aoponomarev.github.io/libs/assets/data/',
        filename: 'coins.json',
        cacheKey: 'coins-metadata',
        defaultTtl: 24 * 60 * 60 * 1000 // 24 часа
    };

    /**
     * Build load URL (with cache-busting via app version)
     */
    function buildUrl() {
        const salt = window.appConfig ? window.appConfig.getVersionHash() : Date.now();
        return `${CONFIG.baseUrl}${CONFIG.filename}?v=${salt}`;
    }

    /**
     * Load metadata
     */
    async function load({ forceRefresh = false, ttl = CONFIG.defaultTtl } = {}) {
        if (!window.cacheManager || !window.coinsConfig) {
            console.warn('coinsMetadataLoader: cacheManager или coinsConfig not loadedы');
            return null;
        }

        // 1. Try load from cache
        if (!forceRefresh) {
            const cached = await window.cacheManager.get(CONFIG.cacheKey, { useVersioning: true });
            if (cached && cached.data && cached.expiresAt && cached.expiresAt > Date.now()) {
                applyMetadata(cached.data);
                console.log('coinsMetadataLoader: метаданные loadedы из кэша');
                return cached.data;
            }
        }

        // 2. Load from network
        try {
            const url = buildUrl();
            const response = await fetch(url);

            if (!response.ok) {
                // If file not found (404), not an error but valid state (use heuristics)
                if (response.status === 404) {
                    console.info(`coinsMetadataLoader: файл ${CONFIG.filename} не найден на сервере. Используется встроенная эвристика.`);
                    return null;
                }
                throw new Error(`HTTP ${response.status} при загрузке ${url}`);
            }

            const data = await response.json();

            // Save to cache
            const payload = {
                data: data,
                expiresAt: Date.now() + ttl,
                updatedAt: Date.now()
            };
            await window.cacheManager.set(CONFIG.cacheKey, payload, { useVersioning: true, ttl });

            // Apply data
            applyMetadata(data);
            console.log('coinsMetadataLoader: метаданные успешно loadedы из сети');

            return data;
        } catch (error) {
            console.error('coinsMetadataLoader: ошибка загрузки метаданных:', error);

            // Fallback to stale cache if exists
            const cached = await window.cacheManager.get(CONFIG.cacheKey, { useVersioning: true });
            if (cached && cached.data) {
                applyMetadata(cached.data);
                console.warn('coinsMetadataLoader: использованы устаревшие метаданные из кэша');
                return cached.data;
            }

            return null;
        }
    }

    /**
     * Pass data to coinsConfig
     */
    function applyMetadata(data) {
        if (!data || !window.coinsConfig) return;

        // data structure: { stable: [...], wrapped: [...], lst: [...] }
        if (data.stable) {
            // Format for setStablecoins (expects objects with id)
            const stableList = data.stable.map(id => ({ id: id, symbol: '', name: '' }));
            window.coinsConfig.setStablecoins(stableList);
        }

        if (data.wrapped) {
            window.coinsConfig.setWrappedCoins(data.wrapped);
        }

        if (data.lst) {
            window.coinsConfig.setLstCoins(data.lst);
        }
    }

    window.coinsMetadataLoader = {
        load
    };

    console.log('coins-metadata-loader.js: initialized');
})();
