/**
 * @description SSOT for browser-side market metrics providers, metric registry, endpoints, and routing order.
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 * @skill-anchor id:sk-cecbcc #for-multifactor-heuristics
 *
 * PURPOSE: Centralize metric-to-provider routing so the facade can orchestrate fallback without hardcoded endpoint drift.
 */

(function() {
    'use strict';

    const CONFIG = {
        metrics: {
            fgi: {
                name: 'fgi',
                cacheKey: 'fear-greed-index',
                providers: ['alternative-me']
            },
            vix: {
                name: 'vix',
                cacheKey: 'vix-index',
                providers: ['yahoo-vix', 'stooq-vix', 'alpha-vantage-vix']
            },
            btcDominance: {
                name: 'btcDominance',
                cacheKey: 'btc-dominance',
                providers: ['coingecko-btc-dom'],
                requestRegistry: {
                    provider: 'coingecko',
                    endpoint: 'global',
                    params: {}
                }
            },
            openInterest: {
                name: 'openInterest',
                cacheKey: 'open-interest',
                providers: ['binance-metrics'],
                requestRegistry: {
                    provider: 'binance',
                    endpoint: 'openInterest',
                    params: {}
                }
            },
            fundingRate: {
                name: 'fundingRate',
                cacheKey: 'funding-rate',
                providers: ['binance-metrics'],
                requestRegistry: {
                    provider: 'binance',
                    endpoint: 'fundingRate',
                    params: {}
                }
            },
            longShortRatio: {
                name: 'longShortRatio',
                cacheKey: 'long-short-ratio',
                providers: ['binance-metrics'],
                requestRegistry: {
                    provider: 'binance',
                    endpoint: 'longShortRatio',
                    params: {}
                }
            }
        },
        providers: {
            'alternative-me': {
                name: 'alternative-me',
                displayName: 'Alternative.me',
                timeout: 10000,
                baseUrl: 'https://api.alternative.me',
                endpoints: {
                    fgi: '/fng/?limit=1'
                }
            },
            'yahoo-vix': {
                name: 'yahoo-vix',
                displayName: 'Yahoo Finance',
                timeout: 10000,
                baseUrl: 'https://query1.finance.yahoo.com',
                endpoints: {
                    vix: '/v8/finance/chart/%5EVIX?interval=1d&range=1d'
                },
                proxy: {
                    service: 'yahooFinance',
                    path: '/v8/finance/chart/%5EVIX',
                    params: { interval: '1d', range: '1d' }
                }
            },
            'stooq-vix': {
                name: 'stooq-vix',
                displayName: 'Stooq',
                timeout: 10000,
                baseUrl: 'https://stooq.com',
                endpoints: {
                    vix: '/q/d/l/?s=vi.c&i=d'
                },
                proxy: {
                    service: 'stooq',
                    path: '/q/d/l/',
                    params: { s: 'vi.c', i: 'd' }
                }
            },
            'alpha-vantage-vix': {
                name: 'alpha-vantage-vix',
                displayName: 'Alpha Vantage',
                timeout: 10000,
                baseUrl: 'https://www.alphavantage.co',
                endpoints: {
                    vix: '/query?function=TIME_SERIES_DAILY&symbol=VIX&apikey=demo'
                }
            },
            'binance-metrics': {
                name: 'binance-metrics',
                displayName: 'Binance Futures',
                timeout: 10000,
                baseUrl: 'https://fapi.binance.com',
                endpoints: {
                    openInterest: '/futures/data/openInterestHist?symbol=BTCUSDT&period=5m&limit=1',
                    fundingRate: '/fapi/v1/premiumIndex',
                    longShortRatio: '/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=5m&limit=1'
                }
            },
            'coingecko-btc-dom': {
                name: 'coingecko-btc-dom',
                displayName: 'CoinGecko',
                timeout: 10000,
                baseUrl: 'https://api.coingecko.com/api/v3',
                endpoints: {
                    global: '/global'
                },
                proxy: {
                    service: 'coingecko',
                    path: '/global',
                    params: {}
                }
            }
        }
    };

    function getMetricConfig(metricName) {
        return CONFIG.metrics[metricName] || null;
    }

    function getProviderConfig(providerName) {
        return CONFIG.providers[providerName] || null;
    }

    window.marketMetricsProvidersConfig = {
        CONFIG,
        getMetricConfig,
        getProviderConfig
    };

    console.log('market-metrics-providers-config.js: initialized');
})();
