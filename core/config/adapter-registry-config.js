/**
 * @description SSOT for adapter domains, allowlists, fallback order, and health policy knobs.
 * @skill id:sk-bb7c8e
 * @skill id:sk-7b4ee5
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-7b4ee5 #for-endpoint-coherence
 *
 * PURPOSE: Keep adapter domain policies centralized so facades and clients do not hardcode provider order or allowlists.
 */

(function() {
    'use strict';

    const CONFIG = {
        domains: {
            'coin-data': {
                allowlist: ['yandex-cache', 'coingecko'],
                providers: ['yandex-cache', 'coingecko'],
                health: {
                    degradeAfterFailures: 3,
                    recoveryWindowMs: 5 * 60 * 1000
                }
            },
            'market-metrics': {
                allowlist: ['alternative-me', 'yahoo-vix', 'stooq-vix', 'alpha-vantage-vix', 'binance-metrics', 'coingecko-btc-dom'],
                metrics: {
                    fgi: ['alternative-me'],
                    vix: ['yahoo-vix', 'stooq-vix', 'alpha-vantage-vix'],
                    btcDominance: ['coingecko-btc-dom'],
                    openInterest: ['binance-metrics'],
                    fundingRate: ['binance-metrics'],
                    longShortRatio: ['binance-metrics']
                },
                health: {
                    degradeAfterFailures: 2,
                    recoveryWindowMs: 5 * 60 * 1000
                }
            },
            ai: {
                allowlist: ['yandex'],
                providers: ['yandex'],
                health: {
                    degradeAfterFailures: 2,
                    recoveryWindowMs: 5 * 60 * 1000
                }
            },
            'yandex-api-gateway': {
                allowlist: ['yandex-api-gateway'],
                providers: ['yandex-api-gateway'],
                health: {
                    degradeAfterFailures: 2,
                    recoveryWindowMs: 5 * 60 * 1000
                }
            },
            'cloudflare-workspace': {
                allowlist: ['cloudflare-workspace'],
                providers: ['cloudflare-workspace'],
                health: {
                    degradeAfterFailures: 2,
                    recoveryWindowMs: 5 * 60 * 1000
                }
            },
            'cloudflare-settings': {
                allowlist: ['cloudflare-settings'],
                providers: ['cloudflare-settings'],
                health: {
                    degradeAfterFailures: 2,
                    recoveryWindowMs: 5 * 60 * 1000
                }
            },
            'coin-sets': {
                allowlist: ['cloudflare-coin-sets'],
                providers: ['cloudflare-coin-sets'],
                health: {
                    degradeAfterFailures: 2,
                    recoveryWindowMs: 5 * 60 * 1000
                }
            },
            'icon-assets': {
                allowlist: ['cloudflare-generic-proxy', 'github-contents'],
                providers: ['cloudflare-generic-proxy', 'github-contents'],
                health: {
                    degradeAfterFailures: 2,
                    recoveryWindowMs: 5 * 60 * 1000
                }
            }
        }
    };

    function getDomainConfig(domainKey) {
        return CONFIG.domains[domainKey] || null;
    }

    function getHealthConfig(domainKey) {
        return getDomainConfig(domainKey)?.health || null;
    }

    function getAllowedProviders(domainKey) {
        const config = getDomainConfig(domainKey);
        return Array.isArray(config?.allowlist) ? [...config.allowlist] : [];
    }

    function getProviderOrder(domainKey, options = {}) {
        const config = getDomainConfig(domainKey);
        if (!config) return [];

        if (options.metricKey && Array.isArray(config.metrics?.[options.metricKey])) {
            return [...config.metrics[options.metricKey]];
        }

        return Array.isArray(config.providers) ? [...config.providers] : [];
    }

    window.adapterRegistryConfig = {
        CONFIG,
        getDomainConfig,
        getHealthConfig,
        getAllowedProviders,
        getProviderOrder
    };

    console.log('adapter-registry-config.js: initialized');
})();
