/**
 * #JS-882U8X4J
 * @description Load coin metadata (stablecoins, wrapped, LST) from GitHub CDN a/data/coins.json; cache 24h, populates window.coinsConfig.
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * ARCHITECTURE:
 * - Load on startup or on demand; cache via cacheManager (TTL 24h); populates window.coinsConfig (SSOT)
 */

(function() {
    'use strict';

    const CONFIG = {
        baseUrl: 'https://aoponomarev.github.io/a/data/',
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
            console.warn('coinsMetadataLoader: cacheManager или coinsConfig not loaded');
            return null;
        }

        // 1. Try load from cache
        if (!forceRefresh) {
            const cached = await window.cacheManager.get(CONFIG.cacheKey, { useVersioning: true });
            if (cached && cached.data && cached.expiresAt && cached.expiresAt > Date.now()) {
                applyMetadata(cached.data);
                console.log('coinsMetadataLoader: метаданные loaded из кэша');
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
            console.log('coinsMetadataLoader: метаданные успешно loaded из сети');

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
     * Expected format: data.stable = { usd: [id,...], eur: [...], gold: [...], ... } (by peg)
     */
    function applyMetadata(data) {
        if (!data || !window.coinsConfig) return;

        if (data.stable) {
            const stableList = normalizeStablecoinsList(data.stable);
            if (stableList.length > 0) {
                window.coinsConfig.setStablecoins(stableList);
            }
        }

        if (data.wrapped) {
            window.coinsConfig.setWrappedCoins(data.wrapped);
        }

        if (data.lst) {
            window.coinsConfig.setLstCoins(data.lst);
        }
    }

    /**
     * Normalize stable to array of { id, symbol, name, baseCurrency }
     * @param {Object} stable - { usd: [ids], eur: [ids], gold: [ids], ... }
     * @returns {Array<{id, symbol, name, baseCurrency}>}
     */
    function normalizeStablecoinsList(stable) {
        if (typeof stable !== 'object' || stable === null || Array.isArray(stable)) {
            return [];
        }
        const result = [];
        for (const [peg, ids] of Object.entries(stable)) {
            if (!Array.isArray(ids)) continue;
            const baseCurrency = peg === 'gold_small' ? 'gold' : peg;
            for (const id of ids) {
                result.push({
                    id: String(id).toLowerCase(),
                    symbol: '',
                    name: '',
                    baseCurrency
                });
            }
        }
        return result;
    }

    window.coinsMetadataLoader = {
        load
    };

    console.log('coins-metadata-loader.js: initialized');
})();
