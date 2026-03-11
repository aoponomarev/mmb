/**
 * @description Adapter for BTC dominance via CoinGecko global endpoint.
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-bb7c8e #for-fail-fast
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 */

(function() {
    'use strict';

    class CoinGeckoBtcDomProvider extends window.BaseMarketMetricsProvider {
        constructor(options = {}) {
            super('coingecko-btc-dom', options);
        }

        supportsMetric(metricKey) {
            return metricKey === 'btcDominance';
        }

        // @causality #for-direct-first-transport
        async fetchMetric(metricKey) {
            if (!this.supportsMetric(metricKey)) {
                throw new Error(`CoinGeckoBtcDomProvider does not support ${metricKey}`);
            }

            const endpoint = this.config.endpoints?.global || '/global';
            const directUrl = `${this.config.baseUrl}${endpoint}`;
            const url = this.getDirectOrProxyUrl(directUrl, this.config.proxy);
            const data = await this.fetchJson(url);
            const numericValue = this.toNumber(data?.data?.market_cap_percentage?.btc, null);
            this.requireFiniteNumber(numericValue, 'CoinGecko returned invalid BTC dominance payload');

            return {
                value: Math.max(0, Math.min(100, numericValue)),
                source: this.getDisplayName()
            };
        }
    }

    window.CoinGeckoBtcDomProvider = CoinGeckoBtcDomProvider;

    console.log('coingecko-btc-dom-provider.js: initialized');
})();
