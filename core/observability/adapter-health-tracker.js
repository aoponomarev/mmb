/**
 * @description In-memory adapter health tracker with success/failure counters, latency averages, and degraded-provider sorting.
 * @skill id:sk-224210
 * @skill id:sk-7b4ee5
 * @skill-anchor id:sk-224210 #for-partial-failure-tolerance
 * @skill-anchor id:sk-7b4ee5 #for-integration-fallbacks
 *
 * PURPOSE: Give adapter facades a shared health plane without pushing fallback logic into individual providers.
 */

(function() {
    'use strict';

    const state = new Map();

    function buildKey(domain, provider) {
        return `${domain}::${provider}`;
    }

    function ensureEntry(domain, provider) {
        const key = buildKey(domain, provider);
        if (!state.has(key)) {
            state.set(key, {
                domain,
                provider,
                totalCalls: 0,
                totalSuccesses: 0,
                totalFailures: 0,
                consecutiveFailures: 0,
                avgLatencyMs: null,
                lastLatencyMs: null,
                lastSuccessAt: null,
                lastFailureAt: null,
                lastError: null
            });
        }
        return state.get(key);
    }

    function updateLatency(entry, latencyMs) {
        if (!Number.isFinite(latencyMs) || latencyMs < 0) {
            return;
        }
        entry.lastLatencyMs = latencyMs;
        entry.avgLatencyMs = entry.avgLatencyMs === null
            ? latencyMs
            : ((entry.avgLatencyMs * Math.max(entry.totalCalls - 1, 0)) + latencyMs) / Math.max(entry.totalCalls, 1);
    }

    function record(domain, provider, success, meta = {}) {
        const entry = ensureEntry(domain, provider);
        entry.totalCalls += 1;
        updateLatency(entry, meta.latencyMs);

        if (success) {
            entry.totalSuccesses += 1;
            entry.consecutiveFailures = 0;
            entry.lastSuccessAt = Date.now();
            entry.lastError = null;
        } else {
            entry.totalFailures += 1;
            entry.consecutiveFailures += 1;
            entry.lastFailureAt = Date.now();
            entry.lastError = meta.errorMessage || 'unknown';
        }

        if (window.eventBus?.emit) {
            window.eventBus.emit('adapter-health:updated', {
                domain,
                provider,
                success,
                summary: { ...entry }
            });
        }

        return { ...entry };
    }

    function getStats(domain, provider) {
        if (domain && provider) {
            const entry = state.get(buildKey(domain, provider));
            return entry ? { ...entry } : null;
        }

        return Array.from(state.values())
            .filter((entry) => !domain || entry.domain === domain)
            .map((entry) => ({ ...entry }));
    }

    function isDegraded(domain, provider, config = {}) {
        const entry = state.get(buildKey(domain, provider));
        if (!entry) return false;

        const threshold = Number.isFinite(config.degradeAfterFailures) ? config.degradeAfterFailures : 3;
        const recoveryWindowMs = Number.isFinite(config.recoveryWindowMs) ? config.recoveryWindowMs : 5 * 60 * 1000;
        if (entry.consecutiveFailures < threshold) {
            return false;
        }
        if (!entry.lastFailureAt) {
            return false;
        }
        return (Date.now() - entry.lastFailureAt) < recoveryWindowMs;
    }

    function sortProviders(domain, providers = [], config = {}) {
        return [...providers].sort((a, b) => {
            const aDegraded = isDegraded(domain, a, config);
            const bDegraded = isDegraded(domain, b, config);
            if (aDegraded !== bDegraded) {
                return aDegraded ? 1 : -1;
            }

            const aStats = state.get(buildKey(domain, a));
            const bStats = state.get(buildKey(domain, b));
            const aRate = aStats && aStats.totalCalls > 0 ? aStats.totalSuccesses / aStats.totalCalls : 1;
            const bRate = bStats && bStats.totalCalls > 0 ? bStats.totalSuccesses / bStats.totalCalls : 1;
            if (aRate !== bRate) {
                return bRate - aRate;
            }

            const aLatency = Number.isFinite(aStats?.avgLatencyMs) ? aStats.avgLatencyMs : Number.POSITIVE_INFINITY;
            const bLatency = Number.isFinite(bStats?.avgLatencyMs) ? bStats.avgLatencyMs : Number.POSITIVE_INFINITY;
            if (aLatency !== bLatency) {
                return aLatency - bLatency;
            }

            return 0;
        });
    }

    function clear(domain = null) {
        if (!domain) {
            state.clear();
            return;
        }

        for (const key of Array.from(state.keys())) {
            if (key.startsWith(`${domain}::`)) {
                state.delete(key);
            }
        }
    }

    window.adapterHealthTracker = {
        recordSuccess(domain, provider, meta = {}) {
            return record(domain, provider, true, meta);
        },
        recordFailure(domain, provider, meta = {}) {
            return record(domain, provider, false, meta);
        },
        getStats,
        isDegraded,
        sortProviders,
        clear
    };

    console.log('adapter-health-tracker.js: initialized');
})();
