/**
 * #JS-8P3M724Z
 * @description SSOT for cache TTL, schema versions and strategies; do not duplicate in components.
 * @skill id:sk-3c832d
 *
 * PURPOSE: Centralized cache policy: TTL per key, strategy, schema versions for user data.
 *
 * TTL (Time To Live):
 * - icons-cache: 1h — icons change rarely but may update (new coins, design refresh)
 * - coins-list: 1d — coin list stable, updates daily via API
 * - market-metrics: 1h — metrics update often
 * - api-cache: 5min — API response cache, fast expiry for freshness
 * - time-series: 1h, history: 1d
 * - crypto-news-cache-max-age: 24h; market-update-fallback: 3h; market-update-delay-max: 24h
 *
 * No TTL (null) — permanent: user data (portfolios, strategies), settings (theme, timezone), API keys. Use schema migrations on structure change.
 *
 * STRATEGIES:
 * - cache-first: icons-cache, coins-list
 * - network-first: market-metrics, api-cache
 * - stale-while-revalidate: time-series, history
 * - cache-only: portfolios, strategies, settings, API keys
 *
 * USAGE:
 * cacheConfig.getTTL('coins-list');
 * cacheConfig.getStrategy('icons-cache');
 * cacheConfig.getVersion('portfolios');
 *
 * REFERENCES:
 * - Schema migrations: #JS-FWhpDFTW (cache-migrations.js)
 * - Caching principles: id:sk-3c832d
 */

(function() {
    'use strict';

    // Base time intervals
    const DURATIONS = window.ssot?.DURATIONS_MS || {
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000
    };

    const topCoinsContract = window.ssot && typeof window.ssot.getTopCoinsPolicy === 'function'
        ? window.ssot.getTopCoinsPolicy()
        : null;
    const TOP_COINS_REFRESH_WINDOW_MS = topCoinsContract && Number.isFinite(topCoinsContract.ttlMs)
        ? topCoinsContract.ttlMs
        : 2 * DURATIONS.HOUR;

    // Contracts/rules for key data flows.
    const DATA_FLOW_CONTRACTS = {
        topCoins: {
            ttlMs: TOP_COINS_REFRESH_WINDOW_MS,
            uiStaleThresholdMs: TOP_COINS_REFRESH_WINDOW_MS,
            requestRegistryMinIntervalMs: TOP_COINS_REFRESH_WINDOW_MS,
            rationale: topCoinsContract?.rationale || 'top-coins-by-market-cap / top-coins-by-volume'
        }
    };

    // TTL in milliseconds
    const TTL = {
        'icons-cache': 60 * 60 * 1000,           // 1 hour
        'coins-list': 24 * DURATIONS.HOUR,       // 1 day
        'top-coins': 60 * 60 * 1000,             // 1 hour (max coin sets cache)
        'top-coins-by-market-cap': TOP_COINS_REFRESH_WINDOW_MS,  // 2h (top 250 by market cap)
        'top-coins-by-volume': TOP_COINS_REFRESH_WINDOW_MS,      // 2h (top 250 by volume)
        'active-coin-set-data': TOP_COINS_REFRESH_WINDOW_MS,     // 2h (full data of active coin set)
        'market-metrics': 60 * DURATIONS.HOUR,   // 1 hour
        'vix-index': 24 * 60 * 60 * 1000,        // 24 hours (VIX volatility index)
        'fear-greed-index': 24 * 60 * 60 * 1000,  // 24 hours (Fear & Greed Index)
        'api-cache': 5 * 60 * 1000,              // 5 minutes
        'time-series': 60 * DURATIONS.HOUR,       // 1 hour
        'history': 24 * DURATIONS.HOUR,           // 1 day
        'portfolios': null,                       // No TTL (local data)
        'strategies': null,                       // No TTL (local data)
        'settings': null,                         // No TTL
        'theme': null,                            // No TTL
        'timezone': null,                         // No TTL
        'favorites': null,                        // No TTL
        'ui-state': null,                         // No TTL
        'ai-provider': null,                      // No TTL (current provider: 'yandex')
        'yandex-api-key': null,                   // No TTL (sensitive data)
        'yandex-folder-id': null,                 // No TTL
        'yandex-model': null,                     // No TTL
        'yandex-proxy-type': null,                // No TTL (proxy type for YandexGPT: 'yandex' etc.)
        'translation-language': null,              // No TTL
        'crypto-news-cache-max-age': 24 * 60 * 60 * 1000,  // 24h - max news cache age
        'market-update-fallback': 3 * 60 * 60 * 1000,        // 3h - fallback on update time calc error
        'market-update-delay-max': 24 * 60 * 60 * 1000      // 24h - max metrics update delay
    };

    // Data schema versions
    const VERSIONS = {
        'icons-cache': '1.0.0',
        'coins-list': '1.0.0',
        'top-coins': '1.0.0',
        'top-coins-by-market-cap': '1.0.0',
        'top-coins-by-volume': '1.0.0',
        'market-metrics': '1.0.0',
        'vix-index': '1.0.0',
        'fear-greed-index': '1.0.0',
        'portfolios': '1.0.0',
        'strategies': '1.0.0',
        'time-series': '1.0.0',
        'history': '1.0.0'
    };

    // Caching strategies
    const STRATEGIES = {
        'cache-first': ['icons-cache', 'coins-list', 'top-coins-by-market-cap', 'top-coins-by-volume', 'active-coin-set-data', 'vix-index', 'fear-greed-index'],
        'network-first': ['top-coins', 'market-metrics', 'api-cache'],
        'stale-while-revalidate': ['time-series', 'history'],
        'cache-only': ['portfolios', 'strategies', 'settings', 'theme', 'timezone', 'favorites', 'ui-state', 'ai-provider', 'yandex-api-key', 'yandex-folder-id', 'yandex-model', 'yandex-proxy-type', 'translation-language']
    };

    /**
     * Get TTL for key
     * @param {string} key - cache key
     * @returns {number|null} - TTL in ms or null
     */
    function getTTL(key) {
        return TTL[key] || null;
    }

    /**
     * Get schema version for key
     * @param {string} key - cache key
     * @returns {string} - version
     */
    function getVersion(key) {
        return VERSIONS[key] || '1.0.0';
    }

    /**
     * Get caching strategy for key
     * @param {string} key - cache key
     * @returns {string} - strategy
     */
    function getStrategy(key) {
        for (const [strategy, keys] of Object.entries(STRATEGIES)) {
            if (keys.includes(key)) {
                return strategy;
            }
        }
        return 'network-first'; // Default
    }

    function getTopCoinsContract() {
        return DATA_FLOW_CONTRACTS.topCoins;
    }

    function getTopCoinsRefreshWindowMs() {
        return DATA_FLOW_CONTRACTS.topCoins.ttlMs;
    }

    function getTopCoinsUiStaleThresholdMs() {
        return DATA_FLOW_CONTRACTS.topCoins.uiStaleThresholdMs;
    }

    function getTopCoinsRequestIntervalMs() {
        return DATA_FLOW_CONTRACTS.topCoins.requestRegistryMinIntervalMs;
    }

    // Export to global scope
    window.cacheConfig = {
        TTL,
        VERSIONS,
        STRATEGIES,
        DURATIONS,
        TOP_COINS_REFRESH_WINDOW_MS,
        DATA_FLOW_CONTRACTS,
        getTopCoinsContract,
        getTopCoinsRefreshWindowMs,
        getTopCoinsUiStaleThresholdMs,
        getTopCoinsRequestIntervalMs,
        getTTL,
        getVersion,
        getStrategy
    };

    console.log('cache-config.js: initialized');
})();

