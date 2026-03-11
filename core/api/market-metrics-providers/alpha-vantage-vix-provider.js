/**
 * @description Adapter for VIX via Alpha Vantage daily series.
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-bb7c8e #for-fail-fast
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 */

(function() {
    'use strict';

    class AlphaVantageVixProvider extends window.BaseMarketMetricsProvider {
        constructor(options = {}) {
            super('alpha-vantage-vix', options);
        }

        supportsMetric(metricKey) {
            return metricKey === 'vix';
        }

        async fetchMetric(metricKey) {
            if (!this.supportsMetric(metricKey)) {
                throw new Error(`AlphaVantageVixProvider does not support ${metricKey}`);
            }

            const endpoint = this.config.endpoints?.vix || '/query?function=TIME_SERIES_DAILY&symbol=VIX&apikey=demo';
            const data = await this.fetchJson(`${this.config.baseUrl}${endpoint}`);
            const series = data?.['Time Series (Daily)'];
            const latestKey = series ? Object.keys(series)[0] : null;
            const numericValue = this.toNumber(latestKey ? series?.[latestKey]?.['4. close'] : null, null);
            this.requireFiniteNumber(numericValue, 'Alpha Vantage returned invalid VIX payload');

            return {
                value: numericValue,
                source: this.getDisplayName()
            };
        }
    }

    window.AlphaVantageVixProvider = AlphaVantageVixProvider;

    console.log('alpha-vantage-vix-provider.js: initialized');
})();
