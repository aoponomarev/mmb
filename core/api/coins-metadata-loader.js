/**
 * #JS-882U8X4J
 * @description Load coin metadata (stablecoins, wrapped, LST). Primary: Yandex API /api/coins/registry; fallback: GitHub CDN a/data/coins.json.
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * ARCHITECTURE (plan-coins-registry-cloud):
 * - Primary: GET /api/coins/registry from Yandex API Gateway
 * - Fallback: GitHub CDN a/data/coins.json
 */

(function() {
    'use strict';

    const CONFIG = {
        baseUrl: 'https://aoponomarev.github.io/a/data/',
        filename: 'coins.json',
        cacheKey: 'coins-metadata-v2',
        defaultTtl: 24 * 60 * 60 * 1000 // 24h
    };

    const STABLE_SECTIONS = ['fiat', 'commodity'];

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
            console.warn('coinsMetadataLoader: cacheManager or coinsConfig not loaded');
            return null;
        }

        // Cache reads must validate the schema because older payloads can survive until the next versioned refresh.
        if (!forceRefresh) {
            const cached = await window.cacheManager.get(CONFIG.cacheKey, { useVersioning: true });
            if (cached && cached.data && isStableMetadataShape(cached.data) && cached.expiresAt && cached.expiresAt > Date.now()) {
                applyMetadata(cached.data);
                emitMetadataUpdated(cached.data, 'cache');
                console.log('coinsMetadataLoader: metadata loaded from cache');
                return cached.data;
            }
        }

        try {
            let data = null;
            let source = 'network';

            const yandexProvider = window.yandexApiGatewayProvider;
            if (yandexProvider && typeof yandexProvider.requestJson === 'function') {
                try {
                    data = await yandexProvider.requestJson('/api/coins/registry', { headers: { Accept: 'application/json' } });
                    if (data && isStableMetadataShape(data)) {
                        source = 'yandex-api';
                    } else {
                        data = null;
                    }
                } catch (yandexErr) {
                    console.info('coinsMetadataLoader: Yandex registry unavailable, falling back to GitHub:', yandexErr?.message || 'unknown');
                }
            }

            if (!data) {
                const url = buildUrl();
                const response = await fetch(url);

                if (!response.ok) {
                    if (response.status === 404) {
                        console.info(`coinsMetadataLoader: ${CONFIG.filename} not available, using built-in fallback`);
                        return null;
                    }
                    throw new Error(`HTTP ${response.status} while loading ${url}`);
                }

                data = await response.json();
                if (!isStableMetadataShape(data)) {
                    throw new Error('coinsMetadataLoader: invalid stable metadata schema');
                }
            }

            const payload = {
                data,
                expiresAt: Date.now() + ttl,
                updatedAt: Date.now()
            };
            await window.cacheManager.set(CONFIG.cacheKey, payload, { useVersioning: true, ttl });

            applyMetadata(data);
            emitMetadataUpdated(data, source);
            console.log(`coinsMetadataLoader: metadata loaded from ${source}`);

            return data;
        } catch (error) {
            console.error('coinsMetadataLoader: metadata load failed:', error);

            // Stale cache is safer than dropping curated runtime references during a transient network or schema mismatch.
            const cached = await window.cacheManager.get(CONFIG.cacheKey, { useVersioning: true });
            if (cached && cached.data && isStableMetadataShape(cached.data)) {
                applyMetadata(cached.data);
                emitMetadataUpdated(cached.data, 'stale-cache');
                console.warn('coinsMetadataLoader: using stale cached metadata');
                return cached.data;
            }

            return null;
        }
    }

    /**
     * Pass data to coinsConfig
     * Expected format:
     * data.stable = {
     *   fiat: { usd: [id, ...], eur: [...], ... },
     *   commodity: { gold: [id, ...], silver: [...], oil: [...], ... }
     * }
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

    function emitMetadataUpdated(data, source) {
        if (!window.eventBus || typeof window.eventBus.emit !== 'function') return;

        const stable = data?.stable;
        const stableCount = isStableMetadataShape(data)
            ? STABLE_SECTIONS.reduce((sum, section) => sum + countGroupEntries(stable[section]), 0)
            : 0;

        window.eventBus.emit('coins-metadata-updated', {
            source,
            stableCount,
            wrappedCount: Array.isArray(data?.wrapped) ? data.wrapped.length : 0,
            lstCount: Array.isArray(data?.lst) ? data.lst.length : 0,
            updatedAt: Date.now()
        });
    }

    /**
     * Flatten grouped metadata into runtime entries so the UI keeps one stable list contract.
     * @param {Object} stable - { fiat: {...}, commodity: {...} }
     * @returns {Array<{id, symbol, name, baseCurrency}>}
     */
    function normalizeStablecoinsList(stable) {
        if (!isStableMetadataShape({ stable })) {
            return [];
        }

        const result = [];
        STABLE_SECTIONS.forEach(section => appendStableSectionEntries(result, stable[section]));
        return result;
    }

    function appendStableSectionEntries(result, groups) {
        if (!isGroupMap(groups)) return;

        Object.entries(groups).forEach(([peg, ids]) => {
            if (!Array.isArray(ids)) return;

            const baseCurrency = normalizeBaseCurrency(peg);
            ids.forEach(id => {
                result.push({
                    id: String(id).toLowerCase(),
                    symbol: '',
                    name: '',
                    baseCurrency,
                    source: 'coins-metadata'
                });
            });
        });
    }

    function normalizeBaseCurrency(peg) {
        return peg === 'gold_small' ? 'gold' : String(peg || '').toLowerCase();
    }

    function isStableMetadataShape(data) {
        if (!data || !isGroupMap(data.stable)) return false;
        return STABLE_SECTIONS.every(section => isGroupMap(data.stable[section]));
    }

    function isGroupMap(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    function countGroupEntries(groups) {
        if (!isGroupMap(groups)) return 0;

        return Object.values(groups).reduce((sum, ids) => {
            return sum + (Array.isArray(ids) ? ids.length : 0);
        }, 0);
    }

    window.coinsMetadataLoader = {
        load
    };

    console.log('coins-metadata-loader.js: initialized');
})();
