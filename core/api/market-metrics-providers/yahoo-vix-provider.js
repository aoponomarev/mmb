/**
 * @description Adapter for VIX via Yahoo Finance, with proxy support on file://.
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-bb7c8e #for-fail-fast
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 */

(function() {
    'use strict';

    class YahooVixProvider extends window.BaseMarketMetricsProvider {
        constructor(options = {}) {
            super('yahoo-vix', options);
        }

        supportsMetric(metricKey) {
            return metricKey === 'vix';
        }

        // @causality #for-direct-first-transport
        async fetchMetric(metricKey) {
            if (!this.supportsMetric(metricKey)) {
                throw new Error(`YahooVixProvider does not support ${metricKey}`);
            }

            const endpoint = this.config.endpoints?.vix || '/v8/finance/chart/%5EVIX?interval=1d&range=1d';
            const directUrl = `${this.config.baseUrl}${endpoint}`;
            const url = this.getDirectOrProxyUrl(directUrl, this.config.proxy);
            const data = await this.fetchJson(url);
            const numericValue = this.toNumber(data?.chart?.result?.[0]?.meta?.regularMarketPrice, null);
            this.requireFiniteNumber(numericValue, 'Yahoo Finance returned invalid VIX payload');

            return {
                value: numericValue,
                source: this.isFileProtocol() && this.config.proxy ? 'Yahoo Finance (Cloudflare proxy)' : this.getDisplayName()
            };
        }
    }

    window.YahooVixProvider = YahooVixProvider;

    console.log('yahoo-vix-provider.js: initialized');
})();
