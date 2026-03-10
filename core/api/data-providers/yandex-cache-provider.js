/**
 * #JS-qz3WnWnA
 * @description Data provider from PostgreSQL (Yandex Cloud) coin_market_cache; updated by cron every 15 min.
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * ADVANTAGES: No rate limit, instant load, data ≤15 min old, works without CoinGecko connection.
 *
 * ENDPOINT: GET /api/coins/market-cache (API Gateway). Response: { coins, count, fetched_at }.
 */

(function() {
    'use strict';

    const API_GATEWAY_BASE = 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net';
    const MARKET_CACHE_ENDPOINT = `${API_GATEWAY_BASE}/api/coins/market-cache`;

    /**
     * Data provider from Yandex Cloud PostgreSQL (coin_market_cache)
     */
    class YandexCacheProvider extends window.BaseDataProvider {

        getName() { return 'yandex-cache'; }
        getDisplayName() { return 'Yandex Cloud Cache (PostgreSQL)'; }

        /**
         * Get top N coins from DB cache
         * @param {number} count - Coin count (1-1000)
         * @param {string} sortBy - 'market_cap' | 'volume'
         * @param {Object} options - { onProgress, signal }
         * @returns {Promise<Array>} Normalized coins
         */
        async getTopCoins(count = 250, sortBy = 'market_cap', options = {}) {
            const url = `${MARKET_CACHE_ENDPOINT}?sort=${encodeURIComponent(sortBy)}&limit=${count}`;
            const data = await this._fetchFromCache(url, options.signal);

            const coins = (data.coins || []).map(row => this._normalizeRow(row));
            if (options.onProgress) {
                options.onProgress({ type: 'complete', coins, total: coins.length });
            }
            return coins;
        }

        /**
         * Get coin data by ID from DB cache
         * @param {string[]} coinIds - Array of coin IDs
         * @param {Object} options - { onProgress, signal }
         * @returns {Promise<Array>} Normalized coins
         */
        async getCoinData(coinIds, options = {}) {
            if (!Array.isArray(coinIds) || coinIds.length === 0) return [];

            // Request in chunks of 100 IDs (URL limit)
            const CHUNK = 100;
            const allCoins = [];

            for (let i = 0; i < coinIds.length; i += CHUNK) {
                if (options.signal?.aborted) break;
                const chunk = coinIds.slice(i, i + CHUNK);
                const url = `${MARKET_CACHE_ENDPOINT}?ids=${encodeURIComponent(chunk.join(','))}`;
                const data = await this._fetchFromCache(url, options.signal);
                const normalized = (data.coins || []).map(row => this._normalizeRow(row));
                allCoins.push(...normalized);

                if (options.onProgress) {
                    options.onProgress({
                        type: 'chunk-success',
                        chunkCoins: normalized,
                        loaded: allCoins.length,
                        total: coinIds.length
                    });
                }
            }

            return allCoins;
        }

        /**
         * Search coins by name/ticker (searches in cache)
         */
        async searchCoins(query) {
            // Load all coins from cache and filter locally
            const data = await this._fetchFromCache(`${MARKET_CACHE_ENDPOINT}?limit=500`);
            const q = query.toLowerCase();
            return (data.coins || [])
                .filter(row => row.coin_id.includes(q) || row.symbol.includes(q) || row.name.toLowerCase().includes(q))
                .map(row => this._normalizeRow(row));
        }

        /**
         * Get coin ID by ticker
         */
        async getCoinIdBySymbol(symbol) {
            const data = await this._fetchFromCache(`${MARKET_CACHE_ENDPOINT}?limit=500`);
            const sym = symbol.toLowerCase();
            const found = (data.coins || []).find(row => row.symbol.toLowerCase() === sym);
            return found ? found.coin_id : null;
        }

        /**
         * Check cache availability and get actual coin count in DB
         * Uses count_only=true — lightweight request without data fetch
         * @returns {Promise<{available: boolean, fetchedAt: Date|null, ageMinutes: number, count: number|null}>}
         */
        async checkCacheStatus() {
            try {
                const data = await this._fetchFromCache(`${MARKET_CACHE_ENDPOINT}?count_only=true`);
                const fetchedAt = data.fetched_at ? new Date(data.fetched_at) : null;
                const ageMinutes = fetchedAt ? Math.round((Date.now() - fetchedAt.getTime()) / 60000) : null;
                return { available: true, fetchedAt, ageMinutes, count: data.count ?? null };
            } catch (e) {
                return { available: false, error: e.message };
            }
        }

        // ─── Private ────────────────────────────────────────────────────────────────

        async _fetchFromCache(url, signal) {
            const fetchOptions = { headers: { 'Accept': 'application/json' } };
            if (signal) fetchOptions.signal = signal;

            const res = await fetch(url, fetchOptions);
            if (!res.ok) {
                throw new Error(`YandexCacheProvider: HTTP ${res.status} от ${url}`);
            }
            return res.json();
        }

        /**
         * Normalize row from coin_market_cache to app standard format
         */
        _normalizeRow(row) {
            const pv1h   = parseFloat(row.pv_1h)   || 0;
            const pv24h  = parseFloat(row.pv_24h)  || 0;
            const pv7d   = parseFloat(row.pv_7d)   || 0;
            const pv14d  = parseFloat(row.pv_14d)  || 0;
            const pv30d  = parseFloat(row.pv_30d)  || 0;
            const pv200d = parseFloat(row.pv_200d) || 0;
            const pvs = [pv1h, pv24h, pv7d, pv14d, pv30d, pv200d];
            return {
                id:                           row.coin_id,
                symbol:                       row.symbol,
                name:                         row.name,
                image:                        row.image || '',
                current_price:                parseFloat(row.current_price) || 0,
                market_cap:                   parseFloat(row.market_cap) || 0,
                market_cap_rank:              row.market_cap_rank || null,
                total_volume:                 parseFloat(row.total_volume) || 0,
                price_change_percentage_1h:   pv1h,
                price_change_percentage_24h:  pv24h,
                price_change_percentage_7d:   pv7d,
                price_change_percentage_14d:  pv14d,
                price_change_percentage_30d:  pv30d,
                price_change_percentage_200d: pv200d,
                // Fields for math model (calculators use pvs / PV*)
                pvs,
                PV1h:   pv1h,
                PV24h:  pv24h,
                PV7d:   pv7d,
                PV14d:  pv14d,
                PV30d:  pv30d,
                PV200d: pv200d,
                ticker: row.symbol,  // calculator looks up btcCoin by coin.ticker
                _cachedAt: row.fetched_at ? new Date(row.fetched_at).getTime() : Date.now(),
                _updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
                _source:   'yandex-cache'
            };
        }
    }

    window.YandexCacheProvider = YandexCacheProvider;

})();
