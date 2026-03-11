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
                defaultExternalProvider: 'coingecko',
                runtimePolicies: {
                    file: 'pg-primary-only',
                    network: 'pg-primary-then-selected-external'
                },
                policies: {
                    'pg-primary-only': {
                        providers: ['yandex-cache']
                    },
                    'pg-primary-then-selected-external': {
                        mode: 'pg-primary-then-selected-external'
                    },
                    'selected-external-only': {
                        mode: 'selected-external-only'
                    }
                },
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

    function uniqueProviders(providers) {
        return providers.filter((provider, index) => provider && providers.indexOf(provider) === index);
    }

    function resolveSelectedExternalProvider(config, options = {}) {
        const allowlist = Array.isArray(config?.allowlist) ? config.allowlist : [];
        const selectedProvider = typeof options.selectedProvider === 'string'
            ? options.selectedProvider.trim()
            : '';
        if (selectedProvider && selectedProvider !== 'yandex-cache' && allowlist.includes(selectedProvider)) {
            return selectedProvider;
        }
        if (config?.defaultExternalProvider && allowlist.includes(config.defaultExternalProvider)) {
            return config.defaultExternalProvider;
        }
        return allowlist.find((provider) => provider !== 'yandex-cache') || null;
    }

    function getDomainPolicy(domainKey, options = {}) {
        const config = getDomainConfig(domainKey);
        if (!config) return null;

        if (options.metricKey && Array.isArray(config.metrics?.[options.metricKey])) {
            return {
                policyKey: options.metricKey,
                providers: [...config.metrics[options.metricKey]]
            };
        }

        const explicitPolicyKey = typeof options.policyKey === 'string' && options.policyKey.trim()
            ? options.policyKey.trim()
            : '';
        const runtimePolicyKey = !explicitPolicyKey && typeof options.runtimeProfile === 'string'
            ? config.runtimePolicies?.[options.runtimeProfile] || ''
            : '';
        const resolvedPolicyKey = explicitPolicyKey || runtimePolicyKey || 'default';

        if (domainKey === 'coin-data') {
            const selectedExternalProvider = resolveSelectedExternalProvider(config, options);
            if (resolvedPolicyKey === 'pg-primary-only') {
                return {
                    policyKey: resolvedPolicyKey,
                    providers: ['yandex-cache']
                };
            }
            if (resolvedPolicyKey === 'selected-external-only') {
                return {
                    policyKey: resolvedPolicyKey,
                    providers: uniqueProviders([selectedExternalProvider])
                };
            }
            if (resolvedPolicyKey === 'pg-primary-then-selected-external') {
                return {
                    policyKey: resolvedPolicyKey,
                    providers: uniqueProviders(['yandex-cache', selectedExternalProvider])
                };
            }
        }

        if (explicitPolicyKey && Array.isArray(config.policies?.[explicitPolicyKey]?.providers)) {
            return {
                policyKey: explicitPolicyKey,
                providers: [...config.policies[explicitPolicyKey].providers]
            };
        }

        return {
            policyKey: resolvedPolicyKey,
            providers: Array.isArray(config.providers) ? [...config.providers] : []
        };
    }

    function getProviderOrder(domainKey, options = {}) {
        return getDomainPolicy(domainKey, options)?.providers || [];
    }

    window.adapterRegistryConfig = {
        CONFIG,
        getDomainConfig,
        getHealthConfig,
        getAllowedProviders,
        getDomainPolicy,
        getProviderOrder
    };

    console.log('adapter-registry-config.js: initialized');
})();
