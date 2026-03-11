/**
 * @description Adapter for VIX via Stooq CSV endpoint, with proxy support on file://.
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-bb7c8e #for-fail-fast
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 */

(function() {
    'use strict';

    class StooqVixProvider extends window.BaseMarketMetricsProvider {
        constructor(options = {}) {
            super('stooq-vix', options);
        }

        supportsMetric(metricKey) {
            return metricKey === 'vix';
        }

        // @causality #for-direct-first-transport
        async fetchMetric(metricKey) {
            if (!this.supportsMetric(metricKey)) {
                throw new Error(`StooqVixProvider does not support ${metricKey}`);
            }

            const endpoint = this.config.endpoints?.vix || '/q/d/l/?s=vi.c&i=d';
            const directUrl = `${this.config.baseUrl}${endpoint}`;
            const url = this.getDirectOrProxyUrl(directUrl, this.config.proxy);
            const text = await this.fetchText(url);
            if (text.includes('No data') || text.includes('N/A')) {
                throw new Error('Stooq returned empty VIX payload');
            }

            const lines = text.trim().split('\n');
            const lastRow = lines[lines.length - 1]?.split(',');
            const numericValue = this.toNumber(lastRow?.[4], null);
            this.requireFiniteNumber(numericValue, 'Stooq returned invalid VIX payload');

            return {
                value: numericValue,
                source: this.isFileProtocol() && this.config.proxy ? 'Stooq (Cloudflare proxy)' : this.getDisplayName()
            };
        }
    }

    window.StooqVixProvider = StooqVixProvider;

    console.log('stooq-vix-provider.js: initialized');
})();
