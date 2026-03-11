/**
 * @description Abstract base class for browser-side market metrics providers.
 * @skill id:sk-bb7c8e
 * @skill id:sk-224210
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * PURPOSE: Keep transport helpers and provider contract in one place while the facade owns fallback orchestration.
 */

(function() {
    'use strict';

    class BaseMarketMetricsProvider {
        constructor(providerName, options = {}) {
            if (this.constructor === BaseMarketMetricsProvider) {
                throw new Error('BaseMarketMetricsProvider is abstract and cannot be instantiated directly');
            }

            this.providerName = providerName;
            this.config = window.marketMetricsProvidersConfig?.getProviderConfig(providerName) || {};
            this.fetchFn = typeof options.fetchFn === 'function' ? options.fetchFn : fetch;
            this.timeoutMs = Number.isFinite(options.timeoutMs)
                ? Math.max(1, Math.floor(options.timeoutMs))
                : (Number.isFinite(this.config.timeout) ? this.config.timeout : 10000);
        }

        getName() {
            return this.providerName;
        }

        getDisplayName() {
            return this.config.displayName || this.providerName;
        }

        supportsMetric(metricKey) {
            return false;
        }

        async fetchMetric(metricKey, options = {}) {
            throw new Error(`fetchMetric(${metricKey}) must be implemented in derived provider`);
        }

        isFileProtocol() {
            return Boolean(window.location && (
                window.location.protocol === 'file:' ||
                window.location.hostname.includes('github.io') ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1'
            ));
        }

        buildTransportInit(init = {}) {
            if (init.signal || typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') {
                return init;
            }
            return { ...init, signal: AbortSignal.timeout(this.timeoutMs) };
        }

        async fetchJson(url, init = {}) {
            const response = await this.fetchFn(url, this.buildTransportInit(init));
            if (!response.ok) {
                const error = new Error(`${this.getDisplayName()} HTTP ${response.status}`);
                error.status = response.status;
                throw error;
            }
            return response.json();
        }

        async fetchText(url, init = {}) {
            const response = await this.fetchFn(url, this.buildTransportInit(init));
            if (!response.ok) {
                const error = new Error(`${this.getDisplayName()} HTTP ${response.status}`);
                error.status = response.status;
                throw error;
            }
            return response.text();
        }

        getDirectOrProxyUrl(directUrl, proxyConfig = null) {
            if (proxyConfig && this.isFileProtocol() && window.cloudflareConfig?.getApiProxyEndpoint) {
                return window.cloudflareConfig.getApiProxyEndpoint(
                    proxyConfig.service,
                    proxyConfig.path || '',
                    proxyConfig.params || {}
                );
            }
            return directUrl;
        }

        toNumber(value, fallback = null) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        }

        requireFiniteNumber(value, message) {
            if (!Number.isFinite(value)) {
                throw new Error(message);
            }
            return value;
        }
    }

    window.BaseMarketMetricsProvider = BaseMarketMetricsProvider;

    console.log('base-market-metrics-provider.js: initialized');
})();
