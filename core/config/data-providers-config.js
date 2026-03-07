/**
 * #JS-siMJxsfA
 * @description SSOT for coin data provider settings (CoinGecko, CoinMarketCap, Binance); multi-provider, seamless switch.
 * @skill id:sk-bb7c8e
 *
 * PURPOSE: Centralized config for all financial data providers; API keys in localStorage; default and available list.
 *
 * PRINCIPLES:
 * - SSOT for provider settings; no duplication in components
 * - Per-provider: name, displayName, baseUrl, requiresApiKey, apiKeyUrl, rateLimit, timeout, endpoints, features
 * - API keys: localStorage 'data-provider-keys', JSON { 'coingecko': 'key123', ... }; managed via DataProviderManager
 *
 * CACHE:
 * - External provider data versioned in cache-manager; key coins-list-v${version}; new version on provider/structure change.
 *
 * REFERENCES:
 * - AI Providers Config (analog): id:sk-bb7c8e
 * - Data Provider Manager: #JS-2436XKxE (data-provider-manager.js)
 * - Base Data Provider: #JS-17n4k14b (core/api/data-providers/base-provider.js)
 * - Cache Manager: #JS-XsMewXpA (cache-manager.js)
 */

(function() {
    'use strict';

    /**
     * Coin data providers configuration
     */
    const CONFIG = {
        // Default provider
        defaultProvider: 'coingecko',

        // Data structure version (for caching)
        // Increment when normalized data format changes
        dataVersion: 1,

        // Available providers
        providers: {
            coingecko: {
                name: 'coingecko',
                displayName: 'CoinGecko',
                description: 'Популярный агрегатор криптовалютных данных с бесплатным API',
                baseUrl: 'https://api.coingecko.com/api/v3',
                requiresApiKey: false, // Free tier does not require key
                apiKeyUrl: 'https://www.coingecko.com/en/api/pricing',
                rateLimit: {
                    // Real CoinGecko public API limit: ~3 req/60s (sliding window).
                    // Empirically tested: safe delay — 21s between requests.
                    // With Demo/Pro key limit is much higher (500 req/min).
                    requestsPerMinute: 2,
                    requestsPerSecond: 0.048
                },
                timeout: 30000, // 30 секунд
                endpoints: {
                    coinsList: '/coins/list',
                    coinsMarkets: '/coins/markets',
                    search: '/search',
                    coin: '/coins/{id}'
                },
                features: [
                    'top-coins',        // Top coins by cap/volume
                    'search',           // Coin search
                    'price-change',     // Price change over periods
                    'market-data',      // Market data
                    'icons'             // Coin icons
                ],
                // Request parameters
                defaultParams: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 100,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '1h,24h,7d,14d,30d,200d'
                }
            },
            'yandex-cache': {
                name: 'yandex-cache',
                displayName: 'Yandex Cloud Cache',
                description: 'Данные из PostgreSQL (Yandex Cloud), обновляются кроном каждые 15 минут',
                baseUrl: 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net',
                requiresApiKey: false,
                rateLimit: {
                    requestsPerMinute: 600,
                    requestsPerSecond: 10
                },
                timeout: 10000,
                endpoints: {
                    marketCache: '/api/coins/market-cache'
                },
                features: [
                    'top-coins',
                    'search',
                    'price-change',
                    'market-data',
                    'icons',
                    'instant-load'
                ]
            }
            // Future providers:
            // coinmarketcap: { ... },
            // binance: { ... },
            // cryptocompare: { ... }
        }
    };

    /**
     * Get provider config by name
     * @param {string} providerName - provider name
     * @returns {Object|null} provider config or null
     */
    function getProviderConfig(providerName) {
        return CONFIG.providers[providerName] || null;
    }

    /**
     * Get default provider
     * @returns {string} default provider name
     */
    function getDefaultProvider() {
        return CONFIG.defaultProvider;
    }

    /**
     * Get list of all available providers
     * @returns {Array<Object>} array of provider configs
     */
    function getAvailableProviders() {
        return Object.values(CONFIG.providers);
    }

    /**
     * Check if API key required for provider
     * @param {string} providerName - provider name
     * @returns {boolean}
     */
    function requiresApiKey(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.requiresApiKey : false;
    }

    /**
     * Get URL to obtain API key
     * @param {string} providerName - provider name
     * @returns {string|null}
     */
    function getApiKeyUrl(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.apiKeyUrl : null;
    }

    /**
     * Get provider base URL
     * @param {string} providerName - provider name
     * @returns {string|null}
     */
    function getBaseUrl(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.baseUrl : null;
    }

    /**
     * Get request timeout for provider
     * @param {string} providerName - provider name
     * @returns {number} timeout in milliseconds
     */
    function getTimeout(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.timeout : 30000;
    }

    /**
     * Get provider request limits
     * @param {string} providerName - provider name
     * @returns {Object|null} limits object
     */
    function getRateLimit(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.rateLimit : null;
    }

    /**
     * Get provider endpoints
     * @param {string} providerName - provider name
     * @returns {Object|null} endpoints object
     */
    function getEndpoints(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.endpoints : null;
    }

    /**
     * Get default request params
     * @param {string} providerName - provider name
     * @returns {Object|null} params object
     */
    function getDefaultParams(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.defaultParams : null;
    }

    /**
     * Get data version (for caching)
     * @returns {number}
     */
    function getDataVersion() {
        return CONFIG.dataVersion;
    }

    /**
     * Check if provider supports feature
     * @param {string} providerName - provider name
     * @param {string} feature - feature name
     * @returns {boolean}
     */
    function supportsFeature(providerName, feature) {
        const config = getProviderConfig(providerName);
        return config ? config.features.includes(feature) : false;
    }

    // Export to global scope
    window.dataProvidersConfig = {
        CONFIG,
        getProviderConfig,
        getDefaultProvider,
        getAvailableProviders,
        requiresApiKey,
        getApiKeyUrl,
        getBaseUrl,
        getTimeout,
        getRateLimit,
        getEndpoints,
        getDefaultParams,
        getDataVersion,
        supportsFeature
    };

    console.log('✅ dataProvidersConfig loaded');
})();
