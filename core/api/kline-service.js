/**
 * #JS-DR2eBm9b
 * @description Service for managing kline (candlestick) data; caching, provider orchestration, and rate limiting.
 * @skill id:sk-224210
 *
 * PURPOSE: Provide a single point of access for kline data with caching and rate limiting.
 */

(function() {
    'use strict';

    /**
     * Kline Service
     */
    class KlineService {
        constructor() {
            this.provider = null;
            this.cachePrefix = 'kline:';
            this.cacheTTL = 60000; // 1 minute TTL for klines
        }

        /**
         * Initialize service and provider
         */
        init() {
            if (window.BybitKlineProvider) {
                this.provider = new window.BybitKlineProvider();
            } else {
                console.error('KlineService: BybitKlineProvider not found');
            }
        }

        ensureProvider() {
            // @skill-anchor id:sk-224210 #for-lazy-provider-init
            if (!this.provider) {
                this.init();
            }
            return Boolean(this.provider);
        }

        /**
         * Get klines for a symbol and interval
         * @param {string} symbol - Ticker symbol (e.g. BTC)
         * @param {string} interval - Interval (1, 3, 5, 15, 30)
         * @returns {Promise<Array>} OHLC data
         */
        async getKlines(symbol, interval) {
            if (!this.ensureProvider()) {
                throw new Error('KlineService: Provider not initialized');
            }

            const cacheKey = `${this.cachePrefix}${symbol}:${interval}`;
            
            // 1. Check local cache (memory/localStorage via CacheManager if available)
            if (window.cacheManager) {
                const cached = await window.cacheManager.get(cacheKey);
                if (cached && (Date.now() - cached._ts < this.cacheTTL)) {
                    return cached.data;
                }
            }

            // 2. Check RequestRegistry to avoid spamming
            if (window.requestRegistry) {
                const isAllowed = window.requestRegistry.isAllowed(
                    this.provider.getName(), 
                    'kline', 
                    { symbol, interval }, 
                    2000 // 2s min interval between same requests
                );
                
                if (!isAllowed) {
                    console.warn(`KlineService: Request for ${symbol}:${interval} throttled by registry`);
                    // If throttled, try to return stale cache if exists
                    if (window.cacheManager) {
                        const stale = await window.cacheManager.get(cacheKey);
                        if (stale) return stale.data;
                    }
                    throw new Error('Request throttled. Please wait a moment.');
                }
            }

            // 3. Fetch from provider
            try {
                const data = await this.provider.getKlines(symbol, interval);
                
                // 4. Save to cache
                if (window.cacheManager) {
                    await window.cacheManager.set(cacheKey, {
                        data: data,
                        _ts: Date.now()
                    });
                }

                // 5. Record in registry
                if (window.requestRegistry) {
                    window.requestRegistry.recordCall(
                        this.provider.getName(),
                        'kline',
                        { symbol, interval },
                        200,
                        true
                    );
                }

                return data;
            } catch (error) {
                if (window.requestRegistry) {
                    window.requestRegistry.recordCall(
                        this.provider.getName(),
                        'kline',
                        { symbol, interval },
                        error.status || 500,
                        false
                    );
                }
                throw error;
            }
        }

        /**
         * Get klines for multiple intervals in parallel
         * @param {string} symbol 
         * @param {Array<string>} intervals 
         * @returns {Promise<Object>} { interval: data }
         */
        async getKlinesMulti(symbol, intervals = ['1', '3', '5', '15', '30']) {
            const results = {};
            const promises = intervals.map(async (interval) => {
                try {
                    results[interval] = await this.getKlines(symbol, interval);
                } catch (error) {
                    console.error(`KlineService: Failed to fetch ${interval} for ${symbol}`, error);
                    results[interval] = null;
                }
            });

            await Promise.all(promises);
            return results;
        }
    }

    // Export to global scope
    window.klineService = new KlineService();

    console.log('✅ KlineService loaded');
})();
