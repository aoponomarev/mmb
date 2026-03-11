/**
 * @description Adapter for Yandex API Gateway cycles history and manual market-cache trigger endpoints.
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 *
 * PURPOSE: Keep Yandex app-api transport and response normalization out of UI components.
 */

(function() {
    'use strict';

    const FALLBACK_BASE_URL = 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net';

    class YandexApiGatewayProvider {
        constructor(options = {}) {
            this.fetchFn = typeof options.fetchFn === 'function' ? options.fetchFn : fetch;
        }

        getBaseUrl() {
            return window.dataProvidersConfig?.getBaseUrl?.('yandex-cache') || FALLBACK_BASE_URL;
        }

        getTimeoutMs() {
            return window.dataProvidersConfig?.getTimeout?.('yandex-cache') || 10000;
        }

        buildRequestInit(init = {}) {
            if (init.signal || typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') {
                return init;
            }
            return { ...init, signal: AbortSignal.timeout(this.getTimeoutMs()) };
        }

        async requestJson(path, init = {}) {
            const response = await this.fetchFn(
                `${this.getBaseUrl()}${path}`,
                this.buildRequestInit(init)
            );

            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}`);
                error.status = response.status;
                throw error;
            }

            return response.json();
        }

        formatDateTime(value) {
            if (!value) return { date: '—', time: '—' };
            const dt = new Date(value);
            if (Number.isNaN(dt.getTime())) return { date: '—', time: '—' };

            return {
                date: dt.toLocaleDateString('ru-RU'),
                time: dt.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })
            };
        }

        // @causality #for-validation-at-edge
        normalizeCycles(cycles) {
            return (Array.isArray(cycles) ? cycles : []).map((cycle, index) => {
                const count = Number.parseInt(cycle?.coin_count, 10) || 0;
                const finished = this.formatDateTime(cycle?.finished_at || cycle?.started_at);
                const sortType = typeof cycle?.sort_type === 'string' ? cycle.sort_type : '';
                let typeLabel = '';

                if (sortType === 'market_cap') {
                    typeLabel = 'Cap';
                } else if (sortType === 'volume') {
                    typeLabel = 'Vol';
                } else if (cycle?.finished_at || cycle?.started_at) {
                    const dt = new Date(cycle.finished_at || cycle.started_at);
                    if (!Number.isNaN(dt.getTime())) {
                        typeLabel = dt.getMinutes() < 15 ? 'Cap' : 'Vol';
                    }
                }

                return {
                    cycleId: cycle?.cycle_id || `cycle-${index}`,
                    date: finished.date,
                    time: finished.time,
                    coinCount: count,
                    typeLabel,
                    status: count > 0 ? 'Успех' : 'Отказ'
                };
            });
        }

        async getCycles() {
            const data = await this.requestJson('/api/coins/cycles', {
                headers: { Accept: 'application/json' }
            });
            return this.normalizeCycles(data?.cycles);
        }

        // @causality #for-manual-trigger-order-payload
        async triggerMarketCache(order) {
            if (order !== 'market_cap' && order !== 'volume') {
                throw new Error('Unsupported trigger order');
            }

            return this.requestJson('/api/coins/market-cache/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({ order })
            });
        }
    }

    window.yandexApiGatewayProvider = new YandexApiGatewayProvider();

    console.log('yandex-api-gateway-provider.js: initialized');
})();
