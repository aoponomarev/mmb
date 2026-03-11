/**
 * @description Unified adapter registry facade over domain config and shared health tracker.
 * @skill id:sk-bb7c8e
 * @skill id:sk-7b4ee5
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-7b4ee5 #for-integration-fallbacks
 *
 * PURPOSE: Let managers and clients ask one place for provider order and health bookkeeping.
 */

(function() {
    'use strict';

    class AdapterRegistry {
        getDomainConfig(domainKey) {
            return window.adapterRegistryConfig?.getDomainConfig?.(domainKey) || null;
        }

        getProviderOrder(domainKey, fallbackProviders = [], options = {}) {
            const config = this.getDomainConfig(domainKey);
            const preferred = window.adapterRegistryConfig?.getProviderOrder?.(domainKey, options) || [];
            const baseOrder = preferred.length > 0 ? preferred : [...fallbackProviders];
            const allowlist = window.adapterRegistryConfig?.getAllowedProviders?.(domainKey) || [];
            const filtered = baseOrder.filter((provider) => allowlist.length === 0 || allowlist.includes(provider));
            const candidates = filtered.length > 0 ? filtered : [...fallbackProviders];

            const healthConfig = config?.health || {};
            if (window.adapterHealthTracker?.sortProviders) {
                return window.adapterHealthTracker.sortProviders(domainKey, candidates, healthConfig);
            }

            return candidates;
        }

        recordSuccess(domainKey, providerName, meta = {}) {
            return window.adapterHealthTracker?.recordSuccess?.(domainKey, providerName, meta) || null;
        }

        recordFailure(domainKey, providerName, meta = {}) {
            return window.adapterHealthTracker?.recordFailure?.(domainKey, providerName, meta) || null;
        }

        getStats(domainKey, providerName) {
            return window.adapterHealthTracker?.getStats?.(domainKey, providerName) || null;
        }
    }

    window.adapterRegistry = new AdapterRegistry();

    console.log('adapter-registry.js: initialized');
})();
