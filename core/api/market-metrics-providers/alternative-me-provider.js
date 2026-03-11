/**
 * @description Adapter for Alternative.me Fear and Greed Index.
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-bb7c8e #for-fail-fast
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 */

(function() {
    'use strict';

    class AlternativeMeProvider extends window.BaseMarketMetricsProvider {
        constructor(options = {}) {
            super('alternative-me', options);
        }

        supportsMetric(metricKey) {
            return metricKey === 'fgi';
        }

        // @causality #for-fail-fast
        async fetchMetric(metricKey) {
            if (!this.supportsMetric(metricKey)) {
                throw new Error(`AlternativeMeProvider does not support ${metricKey}`);
            }

            const endpoint = this.config.endpoints?.fgi || '/fng/?limit=1';
            const data = await this.fetchJson(`${this.config.baseUrl}${endpoint}`);
            const numericValue = this.toNumber(data?.data?.[0]?.value, null);
            if (numericValue === null) {
                throw new Error('Alternative.me returned invalid FGI payload');
            }

            return {
                value: Math.max(0, Math.min(100, numericValue)),
                source: this.getDisplayName()
            };
        }
    }

    window.AlternativeMeProvider = AlternativeMeProvider;

    console.log('alternative-me-provider.js: initialized');
})();
