/**
 * ================================================================================================
 * CACHE CONFIG - Caching configuration
 * ================================================================================================
 * @skill id:sk-3c832d
 *
 * PURPOSE: Centralized TTL, schema versions and caching strategy management.
 * SSOT — do not duplicate TTL values in components.
 *
 * TTL (Time To Live) — value explanations:
 * - icons-cache: 1 hour — icons change rarely but may update (new coins, design refresh)
 * - coins-list: 1 day — coin list stable, updates daily via API
 * - market-metrics: 1 hour — metrics update often (prices change constantly)
 * - api-cache: 5 min — API response cache, fast expiry for freshness
 * - time-series: 1 hour — time series update regularly, hour balances freshness/performance
 * - history: 1 day — history changes less often, day sufficient
 * - crypto-news-cache-max-age: 24h — max age of news state (not news content)
 * - market-update-fallback: 3h — fallback on update time calc error
 * - market-update-delay-max: 24h — max metrics update delay
 *
 * No TTL (null) — permanent storage:
 * - User data (portfolios, strategies) — must persist
 * - Settings (settings, theme, timezone) — user must not lose settings
 * - API keys and providers — sensitive data, stored without expiry
 *
 * USAGE:
 * - cache-first: icons-cache, coins-list — data stable, access speed matters
 * - network-first: market-metrics, api-cache — freshness critical, network first
 * - stale-while-revalidate: time-series, history — show cache, update in background
 * - cache-only: portfolios, strategies, settings, API keys — local only, no update source
 *
 * USAGE:
 * Schema versioning for user keys (portfolios, strategies, etc.).
 * On structure change create migration in cache-migrations.js.
 * Schema versioning differs from app versioning (prefix v:{hash}:).
 *
 * USAGE:
 * cacheConfig.getTTL('coins-list') // 86400000 (1 day)
 * cacheConfig.getStrategy('icons-cache') // 'cache-first'
 * cacheConfig.getVersion('portfolios') // '1.0.0'
 *
 * REFERENCE: Caching principles: id:sk-3c832d
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

