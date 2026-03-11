/**
 * @description Facade for browser-side market metrics providers; cache, request registry, and fallback orchestration.
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-bb7c8e #for-partial-failure-tolerance
 * @skill-anchor id:sk-224210 #for-dual-channel-fallback
 *
 * PURPOSE: Keep fallback, caching, and provider ordering in one facade while individual providers stay fail-fast.
 */

(function() {
    'use strict';

    class MarketMetricsProviderManager {
        constructor() {
            this.providers = {};
            this.config = window.marketMetricsProvidersConfig;
            this.registry = window.adapterRegistry || null;
        }

        getMetricConfig(metricKey) {
            const config = this.config?.getMetricConfig(metricKey);
            if (!config) {
                throw new Error(`Unknown market metric: ${metricKey}`);
            }
            return config;
        }

        createProvider(providerName) {
            const constructors = {
                'alternative-me': window.AlternativeMeProvider,
                'yahoo-vix': window.YahooVixProvider,
                'stooq-vix': window.StooqVixProvider,
                'alpha-vantage-vix': window.AlphaVantageVixProvider,
                'binance-metrics': window.BinanceMetricsProvider,
                'coingecko-btc-dom': window.CoinGeckoBtcDomProvider
            };
            const ProviderClass = constructors[providerName];
            if (typeof ProviderClass !== 'function') {
                throw new Error(`Market metrics provider class is missing: ${providerName}`);
            }
            return new ProviderClass();
        }

        ensureProvider(providerName) {
            if (!this.providers[providerName]) {
                this.providers[providerName] = this.createProvider(providerName);
            }
            return this.providers[providerName];
        }

        getProviderOrder(metricKey, metricConfig) {
            if (this.registry?.getProviderOrder) {
                return this.registry.getProviderOrder('market-metrics', metricConfig.providers || [], { metricKey });
            }
            return [...(metricConfig.providers || [])];
        }

        recordAdapterSuccess(providerName, metricKey, latencyMs) {
            this.registry?.recordSuccess?.('market-metrics', providerName, { metricKey, latencyMs });
        }

        recordAdapterFailure(providerName, metricKey, error, latencyMs) {
            this.registry?.recordFailure?.('market-metrics', providerName, {
                metricKey,
                latencyMs,
                errorMessage: error?.message || 'unknown'
            });
        }

        getMarketMetricsIntervalMs() {
            return window.ssot?.getMarketMetricsIntervalMs?.() || 4 * 60 * 60 * 1000;
        }

        async getCachedMetric(metricConfig) {
            if (!window.cacheManager || !metricConfig?.cacheKey) {
                return null;
            }
            const cached = await window.cacheManager.get(metricConfig.cacheKey);
            if (!cached || cached.value === null || cached.value === undefined) {
                return null;
            }
            return cached;
        }

        async saveCachedMetric(metricConfig, value, source) {
            if (!window.cacheManager || !metricConfig?.cacheKey) {
                return;
            }
            await window.cacheManager.set(metricConfig.cacheKey, {
                value,
                timestamp: Date.now(),
                source: source || null
            });
        }

        getRegistryRecord(metricConfig) {
            return metricConfig?.requestRegistry || null;
        }

        isRequestAllowed(metricConfig) {
            const registry = this.getRegistryRecord(metricConfig);
            if (!registry || !window.requestRegistry) {
                return true;
            }
            return window.requestRegistry.isAllowed(
                registry.provider,
                registry.endpoint,
                registry.params || {},
                this.getMarketMetricsIntervalMs()
            );
        }

        recordRequestSuccess(metricConfig) {
            const registry = this.getRegistryRecord(metricConfig);
            if (!registry || !window.requestRegistry) {
                return;
            }
            window.requestRegistry.recordCall(
                registry.provider,
                registry.endpoint,
                registry.params || {},
                200,
                true
            );
        }

        recordRequestFailure(metricConfig, error) {
            const registry = this.getRegistryRecord(metricConfig);
            if (!registry || !window.requestRegistry) {
                return;
            }
            const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;
            window.requestRegistry.recordCall(
                registry.provider,
                registry.endpoint,
                registry.params || {},
                status,
                false
            );
        }

        formatMetricValue(metricKey, value) {
            if (!Number.isFinite(value)) {
                return '—';
            }

            if (metricKey === 'fgi') return String(Math.round(value));
            if (metricKey === 'vix') return value.toFixed(2);
            if (metricKey === 'btcDominance') return `${value.toFixed(2)}%`;
            if (metricKey === 'openInterest') return `$${value.toFixed(2)}`;
            if (metricKey === 'fundingRate') return `${value.toFixed(4)}%`;
            if (metricKey === 'longShortRatio') return value.toFixed(2);
            return String(value);
        }

        buildSuccessResult(metricKey, value, source) {
            return {
                success: true,
                value: this.formatMetricValue(metricKey, value),
                numericValue: value,
                source: source || null
            };
        }

        buildFailureResult(metricKey) {
            const numericValue = metricKey === 'vix' ? null : 0;
            return {
                success: false,
                value: null,
                numericValue,
                source: null
            };
        }

        formatCachedDate(cached) {
            return cached?.timestamp
                ? new Date(cached.timestamp).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : 'неизвестно';
        }

        buildFallbackMessage(metricKey, cached, error) {
            const valueText = this.formatMetricValue(metricKey, cached.value);
            const dateText = this.formatCachedDate(cached);
            const sourceText = cached.source || 'cache-only';
            const errorSuffix = error ? `; ошибка live: ${error.message || String(error)}` : '';

            if (metricKey === 'fgi') {
                return `FGI: ${valueText} (из кэша, live-источник недоступен; исходный source: ${sourceText}, ${dateText}${errorSuffix})`;
            }
            if (metricKey === 'vix') {
                return `VIX: ${valueText} (из кэша, live-источники недоступны; исходный source: ${sourceText}, ${dateText}${errorSuffix})`;
            }
            if (metricKey === 'btcDominance') {
                return `BTC Dominance: ${valueText} (из кэша, live-источник недоступен; ${dateText}${errorSuffix})`;
            }
            if (metricKey === 'openInterest') {
                return `OI: ${valueText} (из кэша, live-источник недоступен; ${dateText}${errorSuffix})`;
            }
            if (metricKey === 'fundingRate') {
                return `FR: ${valueText} (из кэша, live-источник недоступен; ${dateText}${errorSuffix})`;
            }
            if (metricKey === 'longShortRatio') {
                return `LSR: ${valueText} (из кэша, live-источник недоступен; ${dateText}${errorSuffix})`;
            }
            return `${metricKey}: ${valueText}`;
        }

        notifyCachedFallback(metricKey, cached, error) {
            if (!window.messagesStore?.addMessage) {
                return;
            }
            window.messagesStore.addMessage({
                type: 'info',
                text: this.buildFallbackMessage(metricKey, cached, error),
                scope: 'global',
                duration: 7000
            });
        }

        // @causality #for-validation-at-edge
        validateMetricValue(metricKey, value) {
            if (!Number.isFinite(value)) {
                throw new Error(`${metricKey}: invalid numeric value`);
            }

            if (metricKey === 'fgi' || metricKey === 'btcDominance') {
                return Math.max(0, Math.min(100, value));
            }
            if (metricKey === 'vix') {
                if (value <= 0 || value >= 1000) {
                    throw new Error('vix: value outside sanity range');
                }
                return value;
            }
            if (metricKey === 'openInterest' || metricKey === 'longShortRatio') {
                if (value < 0) {
                    throw new Error(`${metricKey}: value cannot be negative`);
                }
            }
            return value;
        }

        // @causality #for-dual-channel-fallback
        async fetchMetric(metricKey, options = {}) {
            const metricConfig = this.getMetricConfig(metricKey);
            const force = options.forceRefresh === true;

            if (!force && !this.isRequestAllowed(metricConfig)) {
                const cached = await this.getCachedMetric(metricConfig);
                if (cached) {
                    return this.buildSuccessResult(metricKey, cached.value, cached.source);
                }
            }

            let lastError = null;

            for (const providerName of this.getProviderOrder(metricKey, metricConfig)) {
                const startedAt = Date.now();
                try {
                    const provider = this.ensureProvider(providerName);
                    const live = await provider.fetchMetric(metricKey, options);
                    const normalizedValue = this.validateMetricValue(metricKey, live.value);
                    await this.saveCachedMetric(metricConfig, normalizedValue, live.source);
                    this.recordAdapterSuccess(providerName, metricKey, Date.now() - startedAt);
                    this.recordRequestSuccess(metricConfig);
                    return this.buildSuccessResult(metricKey, normalizedValue, live.source);
                } catch (error) {
                    this.recordAdapterFailure(providerName, metricKey, error, Date.now() - startedAt);
                    lastError = error;
                }
            }

            this.recordRequestFailure(metricConfig, lastError);

            const cached = await this.getCachedMetric(metricConfig);
            if (cached) {
                this.notifyCachedFallback(metricKey, cached, lastError);
                return this.buildSuccessResult(metricKey, cached.value, cached.source);
            }

            return this.buildFailureResult(metricKey);
        }

        async fetchFGI(options = {}) {
            return this.fetchMetric('fgi', options);
        }

        async fetchVIX(options = {}) {
            return this.fetchMetric('vix', options);
        }

        async fetchBTCDominance(options = {}) {
            return this.fetchMetric('btcDominance', options);
        }

        async fetchOpenInterest(options = {}) {
            return this.fetchMetric('openInterest', options);
        }

        async fetchFundingRate(options = {}) {
            return this.fetchMetric('fundingRate', options);
        }

        async fetchLongShortRatio(options = {}) {
            return this.fetchMetric('longShortRatio', options);
        }
    }

    window.MarketMetricsProviderManager = MarketMetricsProviderManager;

    console.log('market-metrics-provider-manager.js: initialized');
})();
