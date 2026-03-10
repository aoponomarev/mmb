/**
 * #JS-BybitKlineProvider
 * @description Bybit API kline data provider; extends BaseDataProvider; public kline endpoint access.
 * @skill id:sk-224210
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 * @skill-anchor id:sk-224210 #for-direct-first-transport
 *
 * PURPOSE: Fetch OHLC candlestick data from Bybit V5 API.
 */

(function() {
    'use strict';

    /**
     * Bybit Kline Provider
     */
    class BybitKlineProvider extends window.BaseDataProvider {
        constructor() {
            super();
            this.config = window.dataProvidersConfig.getProviderConfig('bybit');
        }

        getName() {
            return 'bybit';
        }

        getDisplayName() {
            return 'Bybit';
        }

        /**
         * Check if running on file:// protocol
         */
        isFileProtocol() {
            return Boolean(window.location && (
                window.location.protocol === 'file:' || 
                window.location.hostname.includes('github.io') || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1'
            ));
        }

        /**
         * Build URL with proxy for file://
         */
        buildDirectUrl(path, params = {}) {
            const queryString = new URLSearchParams(params).toString();
            const fullPath = queryString ? `${path}?${queryString}` : path;
            return `${this.config.baseUrl}${fullPath}`;
        }

        buildProxyUrl(path, params = {}) {
            const directUrl = this.buildDirectUrl(path, params);
            if (window.cloudflareConfig && typeof window.cloudflareConfig.getGenericProxyUrl === 'function') {
                return window.cloudflareConfig.getGenericProxyUrl(directUrl);
            }
            return null;
        }

        /**
         * Get klines (candles) for a symbol
         * @param {string} symbol - Ticker symbol (e.g. BTC)
         * @param {string} interval - Interval (1, 3, 5, 15, 30, 60, D, W, M)
         * @param {number} limit - Number of candles (default 200)
         * @returns {Promise<Array>} Normalized OHLC data
         */
        async getKlines(symbol, interval, limit = 200) {
            const ticker = `${symbol.toUpperCase()}USDT`;
            const params = {
                category: 'linear',
                symbol: ticker,
                interval: String(interval),
                limit: limit
            };

            const directUrl = this.buildDirectUrl(this.config.endpoints.kline, params);
            const proxyUrl = this.isFileProtocol() ? this.buildProxyUrl(this.config.endpoints.kline, params) : null;

            try {
                // Direct-first strategy: Bybit public market endpoint can be queried directly.
                // Proxy is used only as fallback if direct transport fails.
                let response = await fetch(directUrl, {
                    signal: AbortSignal.timeout(this.config.timeout)
                });

                if (!response.ok && proxyUrl) {
                    response = await fetch(proxyUrl, {
                        signal: AbortSignal.timeout(this.config.timeout)
                    });
                }

                if (!response.ok) {
                    this.handleHttpError(response, `getKlines(${ticker}, ${interval})`);
                }

                const data = await response.json();
                
                if (data.retCode !== 0) {
                    throw new Error(`Bybit API error: ${data.retMsg} (code: ${data.retCode})`);
                }

                return this.normalizeKlines(data.result.list);
            } catch (error) {
                // If direct transport failed before HTTP response (CORS/network), try proxy fallback.
                if (proxyUrl && (error.name === 'TypeError' || error.name === 'AbortError')) {
                    try {
                        const response = await fetch(proxyUrl, {
                            signal: AbortSignal.timeout(this.config.timeout)
                        });
                        if (!response.ok) {
                            this.handleHttpError(response, `getKlines(${ticker}, ${interval})`);
                        }
                        const data = await response.json();
                        if (data.retCode !== 0) {
                            throw new Error(`Bybit API error: ${data.retMsg} (code: ${data.retCode})`);
                        }
                        return this.normalizeKlines(data.result.list);
                    } catch (_) {
                        // Fall through to canonical error logging below.
                    }
                }
                this.logError(`Failed to fetch klines for ${ticker}`, error.message);
                throw error;
            }
        }

        /**
         * Normalize Bybit kline data
         * Bybit returns: [startTime, open, high, low, close, volume, turnover]
         */
        normalizeKlines(list) {
            if (!Array.isArray(list)) return [];
            
            return list.map(item => ({
                startTime: parseInt(item[0]),
                open: parseFloat(item[1]),
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4]),
                volume: parseFloat(item[5]),
                turnover: parseFloat(item[6]),
                // Calculate change percentage for convenience
                changePercent: ((parseFloat(item[4]) - parseFloat(item[1])) / parseFloat(item[1])) * 100
            }));
        }
    }

    // Export to global scope
    window.BybitKlineProvider = BybitKlineProvider;

    console.log('✅ BybitKlineProvider loaded');
})();
