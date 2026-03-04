/**
 * ================================================================================================
 * REQUEST REGISTRY - Log of external API calls
 * ================================================================================================
 * PURPOSE: Track last request times to endpoints for rate limit compliance.
 * State stored in localStorage, survives page reload.
 *
 * @skill-anchor core/skills/api-layer #for-layer-separation
 * @skill-anchor core/skills/data-providers-architecture #for-data-provider-interface
 *
 * Skill: core/skills/api-layer
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'app_request_registry';
    const registry = {
        calls: {} // { 'provider:endpoint:hash': { lastSuccess: ts, lastError: ts, errorCount: n } }
    };

    /**
     * Load registry from storage
     */
    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                registry.calls = parsed.calls || {};
            }
        } catch (e) {
            console.warn('request-registry: ошибка загрузки журнала', e);
        }
    }

    /**
     * Save registry to storage
     */
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
        } catch (e) {
            // Ignore overflow errors
        }
    }

    /**
     * Create unique key for resource
     */
    function getResourceKey(provider, endpoint, params = {}) {
        const paramsHash = btoa(JSON.stringify(params)).substring(0, 16);
        return `${provider}:${endpoint}:${paramsHash}`;
    }

    /**
     * Check if request allowed now
     * @param {string} provider
     * @param {string} endpoint
     * @param {Object} params
     * @param {number} minInterval - min interval in ms
     * @returns {boolean}
     */
    function isAllowed(provider, endpoint, params, minInterval = 60000) {
        const key = getResourceKey(provider, endpoint, params);
        const record = registry.calls[key];

        if (!record) return true;
        const now = Date.now();
        const lastAttempt = Math.max(
            Number(record.lastSuccess) || 0,
            Number(record.lastError) || 0
        );

        if (!lastAttempt) return true;

        const backoffMultiplier = window.ssot && typeof window.ssot.getRequestRegistryBackoffMultiplier === 'function'
            ? window.ssot.getRequestRegistryBackoffMultiplier()
            : 1;
        const lastErrorStatus = Number(record.lastErrorStatus);
        // On 429 apply backoffMultiplier (default 1 — no multiply).
        // consecutiveFailureMultiplier removed: repeated 429 should not exponentially increase block.
        const errorMultiplier = Number.isFinite(lastErrorStatus) && lastErrorStatus === 429
            ? Math.max(backoffMultiplier, 1)
            : 1;

        const effectiveInterval = minInterval * errorMultiplier;

        return (now - lastAttempt) >= effectiveInterval;
    }

    /**
     * Record request result
     */
    function recordCall(provider, endpoint, params, status, isSuccess = true) {
        const key = getResourceKey(provider, endpoint, params);
        const now = Date.now();

        if (!registry.calls[key]) {
            registry.calls[key] = { errorCount: 0 };
        }

        const record = registry.calls[key];
        if (isSuccess) {
            record.lastSuccess = now;
            record.errorCount = 0;
            record.lastErrorStatus = null;
        } else {
            record.lastError = now;
            record.lastErrorStatus = status;
            record.errorCount++;
        }

        save();
    }

    /**
     * Get time until next allowed request
     */
    function getTimeUntilNext(provider, endpoint, params, minInterval) {
        const key = getResourceKey(provider, endpoint, params);
        const record = registry.calls[key];
        if (!record) return 0;

        const now = Date.now();
        const lastAttempt = Math.max(
            Number(record.lastSuccess) || 0,
            Number(record.lastError) || 0
        );
        if (!lastAttempt) return 0;

        const backoffMultiplier = window.ssot && typeof window.ssot.getRequestRegistryBackoffMultiplier === 'function'
            ? window.ssot.getRequestRegistryBackoffMultiplier()
            : 1;
        const lastErrorStatus = Number(record.lastErrorStatus);
        const errorMultiplier = Number.isFinite(lastErrorStatus) && lastErrorStatus === 429
            ? Math.max(backoffMultiplier, 1)
            : 1;
        const effectiveInterval = minInterval * errorMultiplier;
        const nextAllowed = lastAttempt + effectiveInterval;
        return Math.max(0, nextAllowed - now);
    }

    /**
     * Clear entire request registry (on manual cache reset)
     */
    function clear() {
        registry.calls = {};
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // ignore
        }
        console.log('request-registry: журнал сброшен');
    }

    load();

    window.requestRegistry = {
        isAllowed,
        recordCall,
        getTimeUntilNext,
        getResourceKey,
        clear
    };

    console.log('✅ Request Registry initialized');
})();
