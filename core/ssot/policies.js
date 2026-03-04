(function() {
    'use strict';

    const DURATIONS_MS = Object.freeze({
        SECOND: 1000,
        MINUTE: 60 * 1000,
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000
    });

    const CONTRACTS = {
        topCoins: Object.freeze({
            ttlMs: 2 * DURATIONS_MS.HOUR,
            uiStaleThresholdMs: 2 * DURATIONS_MS.HOUR,
            requestRegistryMinIntervalMs: 2 * DURATIONS_MS.HOUR,
            rationale: 'top-coins-by-market-cap / top-coins-by-volume'
        }),
        marketMetrics: Object.freeze({
            minIntervalMs: 4 * DURATIONS_MS.HOUR,
            rationale: 'BTC dominance, OI, funding rate, long/short'
        }),
        appFooter: Object.freeze({
            marketUpdateDelayMaxMs: 24 * DURATIONS_MS.HOUR,
            marketUpdateFallbackMs: 3 * DURATIONS_MS.HOUR,
            cryptoNewsCacheMaxAgeMs: 24 * DURATIONS_MS.HOUR
        }),
        requestRegistry: Object.freeze({
            // On 429 we do not multiply interval — just wait standard minInterval.
            // CoinGecko actual limit: ~3 req/60s; our minInterval (2h) is already conservative.
            rateLimitBackoffMultiplierOnError: 1
        }),
        cacheManager: Object.freeze({
            fallbackCacheTtlMs: 24 * DURATIONS_MS.HOUR
        })
    };

    const POLICY_VERSION = '1.0.0';

    function deepFreeze(obj) {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (value && typeof value === 'object' && !Object.isFrozen(value)) {
                deepFreeze(value);
            }
        });
        return Object.freeze(obj);
    }

    const frozenContracts = deepFreeze(Object.freeze(CONTRACTS));

    function getDuration(name) {
        return DURATIONS_MS[name] || null;
    }

    function getContract(name) {
        return frozenContracts[name] || null;
    }

    function getTopCoinsPolicy() {
        return getContract('topCoins');
    }

    function getPolicy(path, fallback) {
        if (!path || typeof path !== 'string') return fallback;
        const parts = path.split('.');
        let current = frozenContracts;
        for (const part of parts) {
            if (!current || !Object.prototype.hasOwnProperty.call(current, part)) {
                return fallback;
            }
            current = current[part];
        }
        return current;
    }

    function requireContract(name) {
        const contract = getContract(name);
        if (!contract) {
            throw new Error(`SSOT contract "${name}" is missing`);
        }
        return contract;
    }

    function getTopCoinsTimingWindowMs() {
        return getPolicy('topCoins.ttlMs', 2 * DURATIONS_MS.HOUR);
    }

    function getTopCoinsUiStaleThresholdMs() {
        return getPolicy('topCoins.uiStaleThresholdMs', 2 * DURATIONS_MS.HOUR);
    }

    function getTopCoinsRequestIntervalMs() {
        return getPolicy('topCoins.requestRegistryMinIntervalMs', 2 * DURATIONS_MS.HOUR);
    }

    function getMarketMetricsIntervalMs() {
        return getPolicy('marketMetrics.minIntervalMs', 4 * DURATIONS_MS.HOUR);
    }

    function getRequestRegistryBackoffMultiplier() {
        return getPolicy('requestRegistry.rateLimitBackoffMultiplierOnError', 3);
    }

    function getFooterMarketUpdateDelayMaxMs() {
        return getPolicy('appFooter.marketUpdateDelayMaxMs', 24 * DURATIONS_MS.HOUR);
    }

    function getFooterMarketUpdateFallbackMs() {
        return getPolicy('appFooter.marketUpdateFallbackMs', 3 * DURATIONS_MS.HOUR);
    }

    function getFooterCryptoNewsCacheMaxAgeMs() {
        return getPolicy('appFooter.cryptoNewsCacheMaxAgeMs', 24 * DURATIONS_MS.HOUR);
    }

    function validateContracts() {
        const requiredPaths = [
            'topCoins.ttlMs',
            'topCoins.uiStaleThresholdMs',
            'topCoins.requestRegistryMinIntervalMs',
            'marketMetrics.minIntervalMs',
            'requestRegistry.rateLimitBackoffMultiplierOnError',
            'appFooter.marketUpdateDelayMaxMs',
            'appFooter.marketUpdateFallbackMs',
            'appFooter.cryptoNewsCacheMaxAgeMs'
        ];
        const invalid = requiredPaths.filter(path => {
            const value = getPolicy(path, null);
            return !Number.isFinite(value) || Number(value) <= 0;
        });

        if (invalid.length > 0) {
            throw new Error(`SSOT contract validation failed: ${invalid.join(', ')}`);
        }
        return true;
    }

    const ssot = {
        version: POLICY_VERSION,
        DURATIONS_MS,
        CONTRACTS: frozenContracts,
        getDuration,
        getContract,
        getPolicy,
        requireContract,
        getTopCoinsTimingWindowMs,
        getTopCoinsUiStaleThresholdMs,
        getTopCoinsRequestIntervalMs,
        getMarketMetricsIntervalMs,
        getRequestRegistryBackoffMultiplier,
        getFooterMarketUpdateDelayMaxMs,
        getFooterMarketUpdateFallbackMs,
        getFooterCryptoNewsCacheMaxAgeMs,
        validateContracts
    };

    window.ssot = ssot;
    ssot.validateContracts();

    console.log('ssot-policies.js: initialized');
})();
