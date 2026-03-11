/**
 * #JS-2436XKxE
 * @description Single access point for coin data providers (CoinGecko, CoinMarketCap, Binance); switching and unified API.
 * @skill-anchor id:sk-224210 #for-data-provider-interface #for-dual-channel-fallback
 *
 * PURPOSE: Manage provider selection and expose one interface for coin data regardless of backend.
 *
 * FEATURES:
 * - Default provider: CoinGecko
 * - Current provider in cacheManager key 'data-provider'
 * - API keys per provider in localStorage (JSON: { 'coingecko': 'key123', ... })
 *
 * USAGE:
 * const coins = await window.dataProviderManager.getTopCoins(10);
 * await window.dataProviderManager.setProvider('coingecko');
 * const provider = await window.dataProviderManager.getCurrentProvider();
 * await window.dataProviderManager.setApiKey('coingecko', 'my-api-key');
 *
 * REFERENCES:
 * - Data providers config: #JS-siMJxsfA (data-providers-config.js)
 * - Base provider: #JS-17n4k14b (core/api/data-providers/base-provider.js)
 */

(function() {
    'use strict';

    /**
     * Coin data providers manager
     */
    class DataProviderManager {
        constructor() {
            this.providers = {};
            this.defaultProvider = 'coingecko'; // CoinGecko by default
            this.apiKeysStorageKey = 'data-provider-keys'; // Key for localStorage
            this.registry = window.adapterRegistry || null;
        }

        isFileProtocol() {
            return Boolean(window.location && (
                window.location.protocol === 'file:' || 
                window.location.hostname.includes('github.io') || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1'
            ));
        }

        normalizeLimit(limit, fallback = 10) {
            const parsed = Number(limit);
            if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
            return Math.max(1, Math.floor(parsed));
        }

        getBanContext() {
            if (window.banCoinSet && typeof window.banCoinSet.getContext === 'function') {
                return window.banCoinSet.getContext();
            }
            return { bannedIds: new Set(), bannedTickers: new Set() };
        }

        isCoinBanned(coin) {
            const { bannedIds, bannedTickers } = this.getBanContext();
            const coinId = String(coin?.id || coin?.coinId || '').trim();
            const ticker = String(coin?.symbol || coin?.ticker || '').trim().toLowerCase();
            return (coinId && bannedIds.has(coinId)) || (ticker && bannedTickers.has(ticker));
        }

        filterCoinsByBan(coins) {
            if (!Array.isArray(coins) || coins.length === 0) return [];
            return coins.filter(coin => !this.isCoinBanned(coin));
        }

        recordAdapterSuccess(providerName, operation, latencyMs) {
            this.registry?.recordSuccess?.('coin-data', providerName, { operation, latencyMs });
        }

        recordAdapterFailure(providerName, operation, error, latencyMs) {
            this.registry?.recordFailure?.('coin-data', providerName, {
                operation,
                latencyMs,
                errorMessage: error?.message || 'unknown'
            });
        }

        /**
         * Initialize providers.
         * Called after all providers are loaded.
         */
        init() {
            if (window.CoinGeckoProvider) {
                this.providers['coingecko'] = new window.CoinGeckoProvider();
            }
            if (window.YandexCacheProvider) {
                this.providers['yandex-cache'] = new window.YandexCacheProvider();
            }
            // Future providers:
            // if (window.CoinMarketCapProvider) {
            //     this.providers['coinmarketcap'] = new window.CoinMarketCapProvider();
            // }
        }

        /**
         * Get current active provider
         * @returns {Promise<BaseDataProvider>}
         */
        async getCurrentProvider() {
            const providerName = await this.getCurrentProviderName();
            return this.providers[providerName] || this.providers[this.defaultProvider];
        }

        /**
         * Get current provider name
         * @returns {Promise<string>}
         */
        async getCurrentProviderName() {
            if (!window.cacheManager) {
                return this.defaultProvider;
            }
            try {
                const providerName = await window.cacheManager.get('data-provider');
                return providerName || this.defaultProvider;
            } catch (error) {
                console.warn('data-provider-manager: ошибка получения провайдера, using дефолтный', error);
                return this.defaultProvider;
            }
        }

        /**
         * Set active provider
         * @param {string} providerName - 'coingecko' | 'coinmarketcap' etc.
         * @returns {Promise<void>}
         */
        async setProvider(providerName) {
            if (!this.providers[providerName]) {
                throw new Error(`Провайдер ${providerName} не найден`);
            }
            if (window.cacheManager) {
                await window.cacheManager.set('data-provider', providerName);
            }
        }

        /**
         * Get top N coins via current provider
         * @param {number} count - Coin count (1-250)
         * @param {string} sortBy - Sort: 'market_cap' | 'volume'
         * @param {Object} options - Additional options
         * @returns {Promise<Array>} Normalized coin data array
         */
        async getTopCoins(count = 100, sortBy = 'market_cap', options = {}) {
            const preferYandexFirst = options.preferYandexFirst !== false;
            const allowCoinGeckoFallback = typeof options.allowCoinGeckoFallback === 'boolean'
                ? options.allowCoinGeckoFallback
                : !this.isFileProtocol(); // On file:// do not hit CoinGecko on startup by default
            const emitProgress = (payload) => {
                if (!options || typeof options.onProgress !== 'function') return;
                try {
                    options.onProgress(payload);
                } catch (_) {
                    // no-op
                }
            };

            // 1) PostgreSQL primary
            if (preferYandexFirst && this.providers['yandex-cache']) {
                const startedAt = Date.now();
                try {
                    emitProgress({ source: 'postgres', phase: 'start', total: count, loaded: 0 });
                    const pgOptions = {
                        ...options,
                        onProgress: (payload) => {
                            emitProgress({ ...(payload || {}), source: 'postgres' });
                        }
                    };
                    const result = await this.providers['yandex-cache'].getTopCoins(count, sortBy, pgOptions);
                    const filtered = this.filterCoinsByBan(result);
                    emitProgress({
                        source: 'postgres',
                        phase: 'done',
                        total: count,
                        loaded: Math.min(count, filtered.length)
                    });
                    if (window.requestRegistry) {
                        window.requestRegistry.recordCall('yandex-cache', 'getTopCoins', { count, sortBy }, 200, true);
                    }
                    this.recordAdapterSuccess('yandex-cache', 'getTopCoins', Date.now() - startedAt);
                    return filtered;
                } catch (pgError) {
                    this.recordAdapterFailure('yandex-cache', 'getTopCoins', pgError, Date.now() - startedAt);
                    emitProgress({
                        source: 'postgres',
                        phase: 'error',
                        total: count,
                        loaded: 0,
                        error: pgError.message || 'unknown'
                    });
                    if (window.requestRegistry) {
                        window.requestRegistry.recordCall('yandex-cache', 'getTopCoins', { count, sortBy }, 500, false);
                    }
                    if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: 'top-coins-pg-primary-failed',
                            reason: pgError.message || 'unknown',
                            timestamp: Date.now()
                        });
                    }
                    if (!allowCoinGeckoFallback) {
                        throw pgError;
                    }
                }
            }

            // 2) CoinGecko secondary (or selected provider if not file://)
            let providerName = await this.getCurrentProviderName();
            let provider = this.providers[providerName] || this.providers[this.defaultProvider];

            if (providerName === 'yandex-cache' && this.providers['coingecko']) {
                providerName = 'coingecko';
                provider = this.providers['coingecko'];
            }

            if (!provider) {
                throw new Error('Нет доступного провайдера данных for getTopCoins');
            }

            // REQUEST REGISTRY CHECK
            if (window.requestRegistry) {
                // Min interval from ssot (2h), fallback 2h
                const minInterval = window.ssot && typeof window.ssot.getTopCoinsRequestIntervalMs === 'function'
                    ? window.ssot.getTopCoinsRequestIntervalMs()
                    : 2 * 60 * 60 * 1000;
                if (!window.requestRegistry.isAllowed(providerName, 'getTopCoins', { count, sortBy }, minInterval)) {
                    console.log(`data-provider-manager: запрос ${providerName}:getTopCoins заблокирован журналом (слишком часто)`);
                    // Try return cache
                    if (window.cacheManager) {
                        const cacheKey = sortBy === 'volume' ? 'top-coins-by-volume' : 'top-coins-by-market-cap';
                        const cached = await window.cacheManager.get(cacheKey);
                        if (cached && cached.length > 0) return cached;
                    }
                    // Skill anchor: on empty cache and blocked registry (after 429) — throw error
                    // Instead of immediate retry. Prevents infinite 429→write→429 cycle.
                    // UI will show error, user can wait and retry via Refresh button.
                    const timeUntilNext = window.requestRegistry.getTimeUntilNext(providerName, 'getTopCoins', { count, sortBy }, minInterval);
                    const waitMinutes = Math.ceil(timeUntilNext / 60000);
                    console.warn(`data-provider-manager: кэш пуст, registry заблокирован ещё ${waitMinutes} мин. Запрос отклонён.`);
                    throw new Error(`Rate limit: API недоступен, повторите через ${waitMinutes} мин.`);
                }
            }

            // Get API key if required
            const apiKey = await this.getApiKey(providerName);
            if (provider.requiresApiKey() && !apiKey) {
                const error = `API ключ for ${provider.getDisplayName()} not configured`;
                provider.logError(error);
                throw new Error(error);
            }

            // Add API key to options if present
            if (apiKey) {
                options.apiKey = apiKey;
            }

            const startedAt = Date.now();
            try {
                const providerOptions = { ...options };
                if (providerName === 'coingecko') {
                    providerOptions.onProgress = (payload) => {
                        emitProgress({ ...(payload || {}), source: 'coingecko' });
                    };
                }
                const result = await provider.getTopCoins(count, sortBy, providerOptions);
                const filtered = this.filterCoinsByBan(result);
                if (window.requestRegistry) {
                    window.requestRegistry.recordCall(providerName, 'getTopCoins', { count, sortBy }, 200, true);
                }
                this.recordAdapterSuccess(providerName, 'getTopCoins', Date.now() - startedAt);
                return filtered;
            } catch (error) {
                this.recordAdapterFailure(providerName, 'getTopCoins', error, 0);
                if (window.requestRegistry) {
                    // Skill anchor: real HTTP status must be logged, else 429 cycle masked as "generic error".
                    // See id:sk-bb7c8e
                    const status = Number.isFinite(error.status)
                        ? error.status
                        : (String(error.message || '').toLowerCase().includes('rate limit') ? 429 : 500);
                    window.requestRegistry.recordCall(providerName, 'getTopCoins', { count, sortBy }, status, false);
                }
                throw error;
            }
        }

        /**
         * Search coins via current provider
         * @param {string} query - Search query
         * @param {Object} options - Additional options
         * @returns {Promise<Array>} Found coins array
         */
        async searchCoins(query, options = {}) {
            const limit = this.normalizeLimit(options.limit, 10);
            const preferYandexFirst = options.preferYandexFirst !== false;
            const allowCoinGeckoFallback = options.allowCoinGeckoFallback !== false;
            const merged = [];
            const seenIds = new Set();

            const appendUnique = (coins) => {
                if (!Array.isArray(coins)) return;
                coins.forEach((coin) => {
                    if (!coin || !coin.id || seenIds.has(coin.id)) return;
                    seenIds.add(coin.id);
                    merged.push(coin);
                });
            };

            // 1) PostgreSQL search
            if (preferYandexFirst && this.providers['yandex-cache']) {
                const startedAt = Date.now();
                try {
                    const fromPg = await this.providers['yandex-cache'].searchCoins(query, options);
                    appendUnique(this.filterCoinsByBan(fromPg));
                    this.recordAdapterSuccess('yandex-cache', 'searchCoins', Date.now() - startedAt);
                    if (merged.length >= limit) {
                        return merged.slice(0, limit);
                    }
                } catch (pgError) {
                    this.recordAdapterFailure('yandex-cache', 'searchCoins', pgError, Date.now() - startedAt);
                    if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: 'search-pg-failed',
                            reason: pgError.message || 'unknown',
                            timestamp: Date.now()
                        });
                    }
                }
            }

            // 2) CoinGecko fallback
            if (allowCoinGeckoFallback && this.providers['coingecko']) {
                const provider = this.providers['coingecko'];
                const apiKey = await this.getApiKey('coingecko');
                const cgOptions = { ...options };
                if (apiKey) {
                    cgOptions.apiKey = apiKey;
                }

                const startedAt = Date.now();
                try {
                    const fromCg = await provider.searchCoins(query, cgOptions);
                    appendUnique(this.filterCoinsByBan(fromCg));
                    this.recordAdapterSuccess('coingecko', 'searchCoins', Date.now() - startedAt);
                } catch (cgError) {
                    this.recordAdapterFailure('coingecko', 'searchCoins', cgError, 0);
                    if (merged.length === 0) {
                        throw cgError;
                    }
                }
            }

            return merged.slice(0, limit);
        }

        /**
         * Get coin data by ID via current provider
         * @param {Array<string>} coinIds - Array of coin IDs
         * @param {Object} options - Additional options
         * @returns {Promise<Array>} Normalized coin data array
         */
        async getCoinData(coinIds, options = {}) {
            const useDualChannel = options.useDualChannel !== false &&
                typeof this.getCoinDataDualChannel === 'function' &&
                !!this.providers['yandex-cache'] &&
                !!this.providers['coingecko'];
            if (useDualChannel) {
                return this.getCoinDataDualChannel(coinIds, options);
            }

            const provider = await this.getCurrentProvider();
            const providerName = await this.getCurrentProviderName();
            const { bannedIds } = this.getBanContext();
            const requestedIds = Array.isArray(coinIds) ? coinIds : [];
            const filteredIds = requestedIds.filter(id => !bannedIds.has(id));
            if (filteredIds.length === 0) {
                return [];
            }

            const apiKey = await this.getApiKey(providerName);
            if (provider.requiresApiKey() && !apiKey) {
                const error = `API ключ for ${provider.getDisplayName()} not configured`;
                provider.logError(error);
                throw new Error(error);
            }

            if (apiKey) {
                options.apiKey = apiKey;
            }

            const startedAt = Date.now();
            try {
                const result = await provider.getCoinData(filteredIds, options);
                this.recordAdapterSuccess(providerName, 'getCoinData', Date.now() - startedAt);
                return this.filterCoinsByBan(result);
            } catch (error) {
                this.recordAdapterFailure(providerName, 'getCoinData', error, Date.now() - startedAt);
                throw error;
            }
        }

        /**
         * @skill-anchor id:sk-7b4ee5 #for-integration-fallbacks
         * Dual-channel coin data fetch: PostgreSQL primary, CoinGecko fallback.
         * Phase 1: resolve as many IDs as possible from YandexCacheProvider (PG).
         * Phase 2: fetch remaining missing IDs from active provider (CoinGecko).
         * @param {string[]} coinIds
         * @param {Object} options - { onProgress, signal, chunkDelayMs, forceChunking }
         *   onProgress receives events with `source: 'postgres' | 'coingecko'`
         * @returns {Promise<Array>} merged coin data
         */
        async getCoinDataDualChannel(coinIds, options = {}) {
            if (!Array.isArray(coinIds) || coinIds.length === 0) return [];

            const pgProvider = this.providers['yandex-cache'];
            const cgProvider = this.providers['coingecko'];
            const allowCoinGeckoFallback = options.allowCoinGeckoFallback !== false;
            const { bannedIds } = this.getBanContext();
            const filteredIds = coinIds.filter(id => !bannedIds.has(id));
            if (filteredIds.length === 0) return [];

            const resolvedMap = new Map();

            // ── Phase 1: PostgreSQL ────────────────────────────────────────
            if (pgProvider) {
                const startedAt = Date.now();
                try {
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'postgres', phase: 'start',
                            total: filteredIds.length, loaded: 0
                        });
                    }
                    const pgCoins = await pgProvider.getCoinData(filteredIds, {
                        signal: options.signal,
                        onProgress: (payload) => {
                            if (options.onProgress) {
                                options.onProgress({ ...payload, source: 'postgres' });
                            }
                        }
                    });
                    if (Array.isArray(pgCoins)) {
                        pgCoins.forEach(coin => {
                            if (coin && coin.id) resolvedMap.set(coin.id, coin);
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'postgres', phase: 'done',
                            total: filteredIds.length, loaded: resolvedMap.size
                        });
                    }
                    this.recordAdapterSuccess('yandex-cache', 'getCoinDataDualChannel', Date.now() - startedAt);
                } catch (pgErr) {
                    this.recordAdapterFailure('yandex-cache', 'getCoinDataDualChannel', pgErr, Date.now() - startedAt);
                    console.warn('dual-channel: PG phase failed, falling through to CoinGecko', pgErr.message);
                    if (window.fallbackMonitor) {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: 'pg-phase-failed',
                            reason: pgErr.message,
                            timestamp: Date.now()
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'postgres', phase: 'error',
                            error: pgErr.message
                        });
                    }
                }
            }

            // ── Phase 2: CoinGecko for missing IDs ─────────────────────────
            const missingIds = filteredIds.filter(id => !resolvedMap.has(id));

            if (missingIds.length > 0 && cgProvider && allowCoinGeckoFallback) {
                const startedAt = Date.now();
                try {
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'coingecko', phase: 'start',
                            total: missingIds.length, loaded: 0
                        });
                    }

                    const apiKey = await this.getApiKey('coingecko');
                    const cgOptions = {
                        signal: options.signal,
                        forceChunking: options.forceChunking ?? true,
                        chunkDelayMs: options.chunkDelayMs,
                        onProgress: (payload) => {
                            if (options.onProgress) {
                                options.onProgress({ ...payload, source: 'coingecko' });
                            }
                        }
                    };
                    if (apiKey) cgOptions.apiKey = apiKey;

                    const cgCoins = await cgProvider.getCoinData(missingIds, cgOptions);
                    if (Array.isArray(cgCoins)) {
                        cgCoins.forEach(coin => {
                            if (coin && coin.id) resolvedMap.set(coin.id, coin);
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'coingecko', phase: 'done',
                            total: missingIds.length,
                            loaded: missingIds.filter(id => resolvedMap.has(id)).length
                        });
                    }
                    this.recordAdapterSuccess('coingecko', 'getCoinDataDualChannel', Date.now() - startedAt);
                } catch (cgErr) {
                    this.recordAdapterFailure('coingecko', 'getCoinDataDualChannel', cgErr, Date.now() - startedAt);
                    console.warn('dual-channel: CoinGecko phase failed', cgErr.message);
                    if (window.fallbackMonitor) {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: 'cg-phase-failed',
                            reason: cgErr.message,
                            timestamp: Date.now()
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'coingecko', phase: 'error',
                            error: cgErr.message
                        });
                    }
                }
            } else if (missingIds.length > 0 && !allowCoinGeckoFallback && options.onProgress) {
                options.onProgress({
                    source: 'coingecko', phase: 'skip',
                    reason: 'CoinGecko fallback disabled by options'
                });
            } else if (missingIds.length === 0 && options.onProgress) {
                options.onProgress({
                    source: 'coingecko', phase: 'skip',
                    reason: 'All coins resolved from PostgreSQL'
                });
            }

            return this.filterCoinsByBan(
                filteredIds.map(id => resolvedMap.get(id)).filter(Boolean)
            );
        }

        /**
         * Get coin ID by ticker via current provider
         * @param {string} symbol - Coin ticker
         * @param {Object} options - Additional options
         * @returns {Promise<string|null>} Coin ID or null
         */
        async getCoinIdBySymbol(symbol, options = {}) {
            const preferYandexFirst = options.preferYandexFirst !== false;
            const allowCoinGeckoFallback = options.allowCoinGeckoFallback !== false;

            if (preferYandexFirst && this.providers['yandex-cache']) {
                try {
                    const fromPg = await this.providers['yandex-cache'].getCoinIdBySymbol(symbol, options);
                    if (fromPg) {
                        return fromPg;
                    }
                } catch (_) {
                    // no-op: fallback below
                }
            }

            if (allowCoinGeckoFallback && this.providers['coingecko']) {
                const apiKey = await this.getApiKey('coingecko');
                const cgOptions = { ...options };
                if (apiKey) {
                    cgOptions.apiKey = apiKey;
                }
                return await this.providers['coingecko'].getCoinIdBySymbol(symbol, cgOptions);
            }

            return null;
        }

        /**
         * Get API key for provider from localStorage
         * @param {string} providerName - 'coingecko' | 'coinmarketcap' etc.
         * @returns {Promise<string|null>}
         */
        async getApiKey(providerName) {
            try {
                const keysJson = localStorage.getItem(this.apiKeysStorageKey);
                if (!keysJson) return null;

                const keys = JSON.parse(keysJson);
                return keys[providerName] || null;
            } catch (error) {
                console.warn(`data-provider-manager: ошибка получения API ключа for ${providerName}`, error);
                return null;
            }
        }

        /**
         * Set API key for provider in localStorage
         * @param {string} providerName - 'coingecko' | 'coinmarketcap' etc.
         * @param {string} apiKey - API key
         * @returns {Promise<void>}
         */
        async setApiKey(providerName, apiKey) {
            try {
                const keysJson = localStorage.getItem(this.apiKeysStorageKey);
                const keys = keysJson ? JSON.parse(keysJson) : {};

                if (apiKey) {
                    keys[providerName] = apiKey;
                } else {
                    // Remove key if empty
                    delete keys[providerName];
                }

                localStorage.setItem(this.apiKeysStorageKey, JSON.stringify(keys));
            } catch (error) {
                console.error(`data-provider-manager: ошибка сохранения API ключа for ${providerName}`, error);
                throw error;
            }
        }

        /**
         * Get list of all available providers
         * @returns {Array<Object>} [{ value: string, label: string, provider: BaseDataProvider }]
         */
        getAvailableProviders() {
            return Object.entries(this.providers).map(([name, provider]) => ({
                value: name,
                label: provider.getDisplayName(),
                provider: provider
            }));
        }

        /**
         * Get provider by name
         * @param {string} providerName
         * @returns {BaseDataProvider|null}
         */
        getProvider(providerName) {
            return this.providers[providerName] || null;
        }

        /**
         * Check if API key required for current provider
         * @returns {Promise<boolean>}
         */
        async currentProviderRequiresApiKey() {
            const provider = await this.getCurrentProvider();
            return provider.requiresApiKey();
        }

        /**
         * Get URL for API key of current provider
         * @returns {Promise<string|null>}
         */
        async getApiKeyUrl() {
            const providerName = await this.getCurrentProviderName();
            return window.dataProvidersConfig.getApiKeyUrl(providerName);
        }
    }

    // Create and export manager instance
    window.dataProviderManager = new DataProviderManager();

    // Initialize after all providers loaded
    if (window.CoinGeckoProvider) {
        window.dataProviderManager.init();
        console.log('✅ dataProviderManager initialized with providers:', Object.keys(window.dataProviderManager.providers));
    } else {
        // If providers not yet loaded, wait for them
        const checkProviders = setInterval(() => {
            if (window.CoinGeckoProvider) {
                window.dataProviderManager.init();
                console.log('✅ dataProviderManager initialized with providers:', Object.keys(window.dataProviderManager.providers));
                clearInterval(checkProviders);
            }
        }, 50);
        // Timeout if providers never load
        setTimeout(() => {
            clearInterval(checkProviders);
            console.warn('⚠️ dataProviderManager: timeout waiting for providers');
        }, 5000);
    }

})();
