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

        getCoinDataFallbackProviders() {
            return ['yandex-cache', 'coingecko'];
        }

        getProgressSource(providerName) {
            return providerName === 'yandex-cache' ? 'postgres' : providerName;
        }

        async getCoinDataPolicy(options = {}) {
            // @skill-anchor id:sk-bb7c8e #for-adapter-registry
            // Coin-data routing policy lives in AdapterRegistry; callers override
            // runtime defaults via explicit named policy keys only.
            const runtimeProfile = this.isFileProtocol() ? 'file' : 'network';
            const policyKey = typeof options.policyKey === 'string' && options.policyKey.trim()
                ? options.policyKey.trim()
                : '';
            const selectedProvider = await this.getCurrentProviderName();

            if (this.registry?.getDomainPolicy) {
                const registryPolicy = this.registry.getDomainPolicy('coin-data', this.getCoinDataFallbackProviders(), {
                    policyKey,
                    runtimeProfile,
                    selectedProvider
                });
                if (registryPolicy && Array.isArray(registryPolicy.providers)) {
                    return registryPolicy;
                }
            }

            const fallbackPolicyKey = policyKey || (
                runtimeProfile === 'file'
                    ? 'pg-primary-only'
                    : 'pg-primary-then-selected-external'
            );
            const externalProvider = selectedProvider && selectedProvider !== 'yandex-cache'
                ? selectedProvider
                : this.defaultProvider;
            const providers = fallbackPolicyKey === 'selected-external-only'
                ? [externalProvider]
                : fallbackPolicyKey === 'pg-primary-only'
                    ? ['yandex-cache']
                    : ['yandex-cache', externalProvider];

            return {
                policyKey: fallbackPolicyKey,
                providers: providers.filter((providerName, index) => (
                    providerName &&
                    this.providers[providerName] &&
                    providers.indexOf(providerName) === index
                ))
            };
        }

        getOrderedCoinDataProviders(policy) {
            const rawProviders = Array.isArray(policy?.providers) ? policy.providers : [];
            return rawProviders.filter((providerName, index) => (
                providerName &&
                this.providers[providerName] &&
                rawProviders.indexOf(providerName) === index
            ));
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
            const policy = await this.getCoinDataPolicy(options);
            const providerOrder = this.getOrderedCoinDataProviders(policy);
            const emitProgress = (payload) => {
                if (!options || typeof options.onProgress !== 'function') return;
                try {
                    options.onProgress(payload);
                } catch (_) {
                    // no-op
                }
            };

            if (providerOrder.length === 0) {
                throw new Error('Нет доступного провайдера данных for getTopCoins');
            }

            for (let index = 0; index < providerOrder.length; index++) {
                const providerName = providerOrder[index];
                const provider = this.providers[providerName];
                const source = this.getProgressSource(providerName);
                const startedAt = Date.now();
                try {
                    const providerOptions = { ...options };

                    if (providerName === 'yandex-cache') {
                        emitProgress({ source, phase: 'start', total: count, loaded: 0 });
                    } else if (window.requestRegistry) {
                        const minInterval = window.ssot && typeof window.ssot.getTopCoinsRequestIntervalMs === 'function'
                            ? window.ssot.getTopCoinsRequestIntervalMs()
                            : 2 * 60 * 60 * 1000;
                        if (!window.requestRegistry.isAllowed(providerName, 'getTopCoins', { count, sortBy }, minInterval)) {
                            console.log(`data-provider-manager: запрос ${providerName}:getTopCoins заблокирован журналом (слишком часто)`);
                            if (window.cacheManager) {
                                const cacheKey = sortBy === 'volume' ? 'top-coins-by-volume' : 'top-coins-by-market-cap';
                                const cached = await window.cacheManager.get(cacheKey);
                                if (cached && cached.length > 0) return cached;
                            }
                            const timeUntilNext = window.requestRegistry.getTimeUntilNext(providerName, 'getTopCoins', { count, sortBy }, minInterval);
                            const waitMinutes = Math.ceil(timeUntilNext / 60000);
                            console.warn(`data-provider-manager: кэш пуст, registry заблокирован ещё ${waitMinutes} мин. Запрос отклонён.`);
                            throw new Error(`Rate limit: API недоступен, повторите через ${waitMinutes} мин.`);
                        }
                    }

                    if (provider.requiresApiKey && provider.requiresApiKey()) {
                        const apiKey = await this.getApiKey(providerName);
                        if (!apiKey) {
                            const error = `API ключ for ${provider.getDisplayName()} not configured`;
                            provider.logError(error);
                            throw new Error(error);
                        }
                        providerOptions.apiKey = apiKey;
                    }

                    providerOptions.onProgress = (payload) => {
                        emitProgress({ ...(payload || {}), source });
                    };

                    const result = await provider.getTopCoins(count, sortBy, providerOptions);
                    const filtered = this.filterCoinsByBan(result);
                    if (providerName === 'yandex-cache') {
                        emitProgress({
                            source,
                            phase: 'done',
                            total: count,
                            loaded: Math.min(count, filtered.length)
                        });
                    }
                    if (window.requestRegistry) {
                        window.requestRegistry.recordCall(providerName, 'getTopCoins', { count, sortBy }, 200, true);
                    }
                    this.recordAdapterSuccess(providerName, 'getTopCoins', Date.now() - startedAt);
                    return filtered;
                } catch (error) {
                    this.recordAdapterFailure(providerName, 'getTopCoins', error, Date.now() - startedAt);
                    if (providerName === 'yandex-cache') {
                        emitProgress({
                            source,
                            phase: 'error',
                            total: count,
                            loaded: 0,
                            error: error.message || 'unknown'
                        });
                        if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                            window.fallbackMonitor.notify({
                                component: 'data-provider-manager',
                                event: 'top-coins-pg-primary-failed',
                                reason: error.message || 'unknown',
                                timestamp: Date.now()
                            });
                        }
                    }
                    if (window.requestRegistry) {
                        const status = Number.isFinite(error.status)
                            ? error.status
                            : (String(error.message || '').toLowerCase().includes('rate limit') ? 429 : 500);
                        window.requestRegistry.recordCall(providerName, 'getTopCoins', { count, sortBy }, status, false);
                    }
                    if (index === providerOrder.length - 1) {
                        throw error;
                    }
                }
            }

            throw new Error('Нет доступного провайдера данных for getTopCoins');
        }

        /**
         * Search coins via current provider
         * @param {string} query - Search query
         * @param {Object} options - Additional options
         * @returns {Promise<Array>} Found coins array
         */
        async searchCoins(query, options = {}) {
            const limit = this.normalizeLimit(options.limit, 10);
            const policy = await this.getCoinDataPolicy(options);
            const providerOrder = this.getOrderedCoinDataProviders(policy);
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

            for (let index = 0; index < providerOrder.length; index++) {
                const providerName = providerOrder[index];
                const provider = this.providers[providerName];
                const providerOptions = { ...options };
                const startedAt = Date.now();
                try {
                    if (provider.requiresApiKey && provider.requiresApiKey()) {
                        const apiKey = await this.getApiKey(providerName);
                        if (!apiKey) {
                            const error = `API ключ for ${provider.getDisplayName()} not configured`;
                            provider.logError(error);
                            throw new Error(error);
                        }
                        providerOptions.apiKey = apiKey;
                    }

                    const fromProvider = await provider.searchCoins(query, providerOptions);
                    appendUnique(this.filterCoinsByBan(fromProvider));
                    this.recordAdapterSuccess(providerName, 'searchCoins', Date.now() - startedAt);
                    if (merged.length >= limit) {
                        return merged.slice(0, limit);
                    }
                } catch (error) {
                    this.recordAdapterFailure(providerName, 'searchCoins', error, Date.now() - startedAt);
                    if (providerName === 'yandex-cache' && window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: 'search-pg-failed',
                            reason: error.message || 'unknown',
                            timestamp: Date.now()
                        });
                    }
                    if (index === providerOrder.length - 1 && merged.length === 0 && providerName !== 'yandex-cache') {
                        throw error;
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
         * Dual-channel coin data fetch: registry-selected primary provider plus secondary fallback.
         * Phase 1: resolve as many IDs as possible from the primary provider selected by AdapterRegistry.
         * Phase 2: fetch remaining missing IDs from the secondary provider when the selected policy includes one.
         * @param {string[]} coinIds
         * @param {Object} options - { onProgress, signal, chunkDelayMs, forceChunking }
         *   onProgress receives events with provider-tagged `source`
         * @returns {Promise<Array>} merged coin data
         */
        async getCoinDataDualChannel(coinIds, options = {}) {
            if (!Array.isArray(coinIds) || coinIds.length === 0) return [];

            const policy = await this.getCoinDataPolicy(options);
            const providerOrder = this.getOrderedCoinDataProviders(policy);
            const primaryProviderName = providerOrder[0] || null;
            const secondaryProviderName = providerOrder[1] || null;
            const primaryProvider = primaryProviderName ? this.providers[primaryProviderName] : null;
            const secondaryProvider = secondaryProviderName ? this.providers[secondaryProviderName] : null;
            const { bannedIds } = this.getBanContext();
            const filteredIds = coinIds.filter(id => !bannedIds.has(id));
            if (filteredIds.length === 0) return [];

            const resolvedMap = new Map();

            const buildProviderOptions = async (providerName, provider) => {
                const source = this.getProgressSource(providerName);
                const providerOptions = {
                    signal: options.signal,
                    onProgress: (payload) => {
                        if (options.onProgress) {
                            options.onProgress({ ...payload, source });
                        }
                    }
                };
                if (providerName !== 'yandex-cache') {
                    providerOptions.forceChunking = options.forceChunking ?? true;
                    providerOptions.chunkDelayMs = options.chunkDelayMs;
                    const apiKey = await this.getApiKey(providerName);
                    if (provider?.requiresApiKey && provider.requiresApiKey() && !apiKey) {
                        const error = `API ключ for ${provider.getDisplayName()} not configured`;
                        provider.logError(error);
                        throw new Error(error);
                    }
                    if (apiKey) {
                        providerOptions.apiKey = apiKey;
                    }
                }
                return providerOptions;
            };

            if (primaryProvider) {
                const source = this.getProgressSource(primaryProviderName);
                const startedAt = Date.now();
                try {
                    if (options.onProgress) {
                        options.onProgress({
                            source,
                            phase: 'start',
                            total: filteredIds.length, loaded: 0
                        });
                    }
                    const providerOptions = await buildProviderOptions(primaryProviderName, primaryProvider);
                    const primaryCoins = await primaryProvider.getCoinData(filteredIds, providerOptions);
                    if (Array.isArray(primaryCoins)) {
                        primaryCoins.forEach(coin => {
                            if (coin && coin.id) resolvedMap.set(coin.id, coin);
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source,
                            phase: 'done',
                            total: filteredIds.length, loaded: resolvedMap.size
                        });
                    }
                    this.recordAdapterSuccess(primaryProviderName, 'getCoinDataDualChannel', Date.now() - startedAt);
                } catch (error) {
                    this.recordAdapterFailure(primaryProviderName, 'getCoinDataDualChannel', error, Date.now() - startedAt);
                    console.warn(`dual-channel: ${source} phase failed`, error.message);
                    if (window.fallbackMonitor) {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: source === 'postgres' ? 'pg-phase-failed' : `${source}-phase-failed`,
                            reason: error.message,
                            timestamp: Date.now()
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source,
                            phase: 'error',
                            error: error.message
                        });
                    }
                }
            }

            const missingIds = filteredIds.filter(id => !resolvedMap.has(id));

            if (missingIds.length > 0 && secondaryProvider) {
                const source = this.getProgressSource(secondaryProviderName);
                const startedAt = Date.now();
                try {
                    if (options.onProgress) {
                        options.onProgress({
                            source,
                            phase: 'start',
                            total: missingIds.length, loaded: 0
                        });
                    }
                    const providerOptions = await buildProviderOptions(secondaryProviderName, secondaryProvider);
                    const secondaryCoins = await secondaryProvider.getCoinData(missingIds, providerOptions);
                    if (Array.isArray(secondaryCoins)) {
                        secondaryCoins.forEach(coin => {
                            if (coin && coin.id) resolvedMap.set(coin.id, coin);
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source,
                            phase: 'done',
                            total: missingIds.length,
                            loaded: missingIds.filter(id => resolvedMap.has(id)).length
                        });
                    }
                    this.recordAdapterSuccess(secondaryProviderName, 'getCoinDataDualChannel', Date.now() - startedAt);
                } catch (error) {
                    this.recordAdapterFailure(secondaryProviderName, 'getCoinDataDualChannel', error, Date.now() - startedAt);
                    console.warn(`dual-channel: ${source} phase failed`, error.message);
                    if (window.fallbackMonitor) {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: source === 'coingecko' ? 'cg-phase-failed' : `${source}-phase-failed`,
                            reason: error.message,
                            timestamp: Date.now()
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source,
                            phase: 'error',
                            error: error.message
                        });
                    }
                }
            } else if (missingIds.length > 0 && options.onProgress) {
                options.onProgress({
                    source: secondaryProviderName ? this.getProgressSource(secondaryProviderName) : 'fallback',
                    phase: 'skip',
                    reason: 'No secondary provider in selected registry policy'
                });
            } else if (missingIds.length === 0 && options.onProgress && secondaryProviderName) {
                options.onProgress({
                    source: this.getProgressSource(secondaryProviderName),
                    phase: 'skip',
                    reason: 'All coins resolved from primary provider'
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
            const policy = await this.getCoinDataPolicy(options);
            const providerOrder = this.getOrderedCoinDataProviders(policy);
            let lastExternalError = null;

            for (const providerName of providerOrder) {
                const provider = this.providers[providerName];
                const providerOptions = { ...options };
                try {
                    if (provider?.requiresApiKey && provider.requiresApiKey()) {
                        const apiKey = await this.getApiKey(providerName);
                        if (!apiKey) {
                            const error = `API ключ for ${provider.getDisplayName()} not configured`;
                            provider.logError(error);
                            throw new Error(error);
                        }
                        providerOptions.apiKey = apiKey;
                    }
                    const resolvedId = await provider.getCoinIdBySymbol(symbol, providerOptions);
                    if (resolvedId) {
                        return resolvedId;
                    }
                } catch (error) {
                    if (providerName !== 'yandex-cache') {
                        lastExternalError = error;
                    }
                }
            }

            if (lastExternalError) {
                throw lastExternalError;
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
