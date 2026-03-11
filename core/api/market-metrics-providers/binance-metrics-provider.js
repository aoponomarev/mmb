/**
 * @description Adapter for Binance market metrics (open interest, funding rate, long/short ratio).
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-bb7c8e #for-fail-fast
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 */

(function() {
    'use strict';

    class BinanceMetricsProvider extends window.BaseMarketMetricsProvider {
        constructor(options = {}) {
            super('binance-metrics', options);
        }

        supportsMetric(metricKey) {
            return ['openInterest', 'fundingRate', 'longShortRatio'].includes(metricKey);
        }

        // @causality #for-fail-fast
        async fetchMetric(metricKey) {
            if (!this.supportsMetric(metricKey)) {
                throw new Error(`BinanceMetricsProvider does not support ${metricKey}`);
            }

            const endpointMap = {
                openInterest: this.config.endpoints?.openInterest,
                fundingRate: this.config.endpoints?.fundingRate,
                longShortRatio: this.config.endpoints?.longShortRatio
            };
            const endpoint = endpointMap[metricKey];
            const data = await this.fetchJson(`${this.config.baseUrl}${endpoint}`);

            if (metricKey === 'openInterest') {
                const numericValue = this.toNumber(data?.[0]?.sumOpenInterestValue, null);
                this.requireFiniteNumber(numericValue, 'Binance returned invalid open interest payload');
                return { value: numericValue, source: this.getDisplayName() };
            }

            if (metricKey === 'fundingRate') {
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error('Binance returned empty funding rate payload');
                }
                const numericValue = data.reduce((sum, item) => sum + this.toNumber(item?.lastFundingRate, 0), 0) / data.length * 100;
                this.requireFiniteNumber(numericValue, 'Binance returned invalid funding rate payload');
                return { value: numericValue, source: this.getDisplayName() };
            }

            const numericValue = this.toNumber(data?.[0]?.longShortRatio, null);
            this.requireFiniteNumber(numericValue, 'Binance returned invalid long/short ratio payload');
            return { value: numericValue, source: this.getDisplayName() };
        }
    }

    window.BinanceMetricsProvider = BinanceMetricsProvider;

    console.log('binance-metrics-provider.js: initialized');
})();
