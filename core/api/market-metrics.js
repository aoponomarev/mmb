/**
 * #JS-bU2BihXe
 * @description Browser facade for market metrics; delegates external access to MarketMetricsProviderManager and preserves window.marketMetrics API.
 * @skill id:sk-7cf3f7
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 * @skill-anchor id:sk-3c832d #for-market-metrics-cache-fallback
 */

(function() {
    'use strict';

    let fgiVal = 0;
    let vixVal = null;
    let btcDomVal = 0;
    let oiVal = 0;
    let frVal = 0;
    let lsrVal = 0;
    let vixAvailable = false;

    const FAILURE_DEFAULTS = {
        fgi: { success: false, value: null, numericValue: 0, source: null },
        vix: { success: false, value: null, numericValue: null, source: null },
        btcDominance: { success: false, value: null, numericValue: 0, source: null },
        openInterest: { success: false, value: null, numericValue: 0, source: null },
        fundingRate: { success: false, value: null, numericValue: 0, source: null },
        longShortRatio: { success: false, value: null, numericValue: 0, source: null }
    };

    window.marketMetrics = {
        manager: null,

        updateWindowMetrics() {
            window.fgiVal = fgiVal;
            window.vixVal = vixVal;
            window.btcDomVal = btcDomVal;
            window.oiVal = oiVal;
            window.frVal = frVal;
            window.lsrVal = lsrVal;
            window.vixAvailable = vixAvailable;
        },

        ensureManager() {
            if (!this.manager) {
                if (typeof window.MarketMetricsProviderManager !== 'function') {
                    throw new Error('MarketMetricsProviderManager is not loaded');
                }
                this.manager = new window.MarketMetricsProviderManager();
            }
            return this.manager;
        },

        applyMetricResult(metricKey, result) {
            const numericValue = result?.numericValue;

            if (metricKey === 'fgi') {
                fgiVal = Number.isFinite(numericValue) ? numericValue : 0;
            } else if (metricKey === 'vix') {
                vixVal = Number.isFinite(numericValue) ? numericValue : null;
                vixAvailable = Number.isFinite(numericValue);
            } else if (metricKey === 'btcDominance') {
                btcDomVal = Number.isFinite(numericValue) ? numericValue : 0;
            } else if (metricKey === 'openInterest') {
                oiVal = Number.isFinite(numericValue) ? numericValue : 0;
            } else if (metricKey === 'fundingRate') {
                frVal = Number.isFinite(numericValue) ? numericValue : 0;
            } else if (metricKey === 'longShortRatio') {
                lsrVal = Number.isFinite(numericValue) ? numericValue : 0;
            }

            this.updateWindowMetrics();
        },

        getFailureResult(metricKey) {
            return { ...FAILURE_DEFAULTS[metricKey] };
        },

        // @causality #for-lazy-provider-init
        async fetchMetric(metricKey, options = {}) {
            try {
                const manager = this.ensureManager();
                const handlers = {
                    fgi: manager.fetchFGI.bind(manager),
                    vix: manager.fetchVIX.bind(manager),
                    btcDominance: manager.fetchBTCDominance.bind(manager),
                    openInterest: manager.fetchOpenInterest.bind(manager),
                    fundingRate: manager.fetchFundingRate.bind(manager),
                    longShortRatio: manager.fetchLongShortRatio.bind(manager)
                };
                const handler = handlers[metricKey];
                if (typeof handler !== 'function') {
                    throw new Error(`Unsupported market metric: ${metricKey}`);
                }

                const result = await handler(options);
                this.applyMetricResult(metricKey, result);
                return result;
            } catch (error) {
                console.error(`market-metrics: ${metricKey} fetch failed`, error);
                const failure = this.getFailureResult(metricKey);
                this.applyMetricResult(metricKey, failure);
                return failure;
            }
        },

        async fetchFGI(options = {}) {
            return this.fetchMetric('fgi', options);
        },

        async fetchVIX(options = {}) {
            return this.fetchMetric('vix', options);
        },

        async fetchBTCDominance(options = {}) {
            return this.fetchMetric('btcDominance', options);
        },

        async fetchOpenInterest(options = {}) {
            return this.fetchMetric('openInterest', options);
        },

        async fetchFundingRate(options = {}) {
            return this.fetchMetric('fundingRate', options);
        },

        async fetchLongShortRatio(options = {}) {
            return this.fetchMetric('longShortRatio', options);
        },

        async fetchAll(options = {}) {
            const force = options.forceRefresh === true;
            const [fgi, vix, btcDom, oi, fr, lsr] = await Promise.all([
                this.fetchFGI({ forceRefresh: force }),
                this.fetchVIX({ forceRefresh: force }),
                this.fetchBTCDominance({ forceRefresh: force }),
                this.fetchOpenInterest({ forceRefresh: force }),
                this.fetchFundingRate({ forceRefresh: force }),
                this.fetchLongShortRatio({ forceRefresh: force })
            ]);

            this.updateWindowMetrics();

            return {
                fgi: fgi.success ? fgi.value : '—',
                fgiSource: fgi.source || null,
                vix: vix.success ? vix.value : '—',
                vixSource: vix.source || null,
                btcDom: btcDom.success ? btcDom.value : '—',
                oi: oi.success ? oi.value : '—',
                fr: fr.success ? fr.value : '—',
                lsr: lsr.success ? lsr.value : '—'
            };
        }
    };

    window.marketMetrics.updateWindowMetrics();

    console.log('market-metrics.js: initialized');
})();

