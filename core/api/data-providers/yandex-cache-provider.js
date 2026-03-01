/**
 * ================================================================================================
 * YANDEX CACHE PROVIDER - Провайдер данных из PostgreSQL (Yandex Cloud)
 * ================================================================================================
 *
 * ЦЕЛЬ: Читает данные монет из coin_market_cache (PostgreSQL Yandex Cloud),
 *       которая обновляется кроном каждые 15 минут через coingecko-fetcher.
 *
 * ПРЕИМУЩЕСТВА перед прямым CoinGecko:
 * - Нет rate limit (данные уже в БД)
 * - Мгновенная загрузка (нет задержек между чанками)
 * - Данные не старше 15 минут
 * - Работает без интернет-соединения к CoinGecko
 *
 * ЭНДПОИНТ: GET /api/coins/market-cache через app-api (Yandex Cloud Function)
 * API Gateway: d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net
 *
 * ФОРМАТ ОТВЕТА:
 * { coins: [...], count: 250, fetched_at: "2026-02-27T..." }
 *
 * ССЫЛКИ:
 * - CoinGecko Provider (аналог): core/api/data-providers/coingecko-provider.js
 * - Base Provider: core/api/data-providers/base-provider.js
 * - Fetcher function: app/cloud/yandex/functions/coingecko-fetcher/
 */

(function() {
    'use strict';

    const API_GATEWAY_BASE = 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net';
    const MARKET_CACHE_ENDPOINT = `${API_GATEWAY_BASE}/api/coins/market-cache`;

    /**
     * Провайдер данных из Yandex Cloud PostgreSQL (coin_market_cache)
     */
    class YandexCacheProvider extends window.BaseDataProvider {

        getName() { return 'yandex-cache'; }
        getDisplayName() { return 'Yandex Cloud Cache (PostgreSQL)'; }

        /**
         * Получить топ N монет из кэша БД
         * @param {number} count - Количество монет (1-500)
         * @param {string} sortBy - 'market_cap' | 'volume'
         * @param {Object} options - { onProgress, signal }
         * @returns {Promise<Array>} Нормализованные монеты
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
         * Получить данные монет по ID из кэша БД
         * @param {string[]} coinIds - Массив ID монет
         * @param {Object} options - { onProgress, signal }
         * @returns {Promise<Array>} Нормализованные монеты
         */
        async getCoinData(coinIds, options = {}) {
            if (!Array.isArray(coinIds) || coinIds.length === 0) return [];

            // Запрашиваем чанками по 100 ID (URL limit)
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
         * Поиск монет по имени/тикеру (ищет в кэше)
         */
        async searchCoins(query) {
            // Загружаем все монеты из кэша и фильтруем локально
            const data = await this._fetchFromCache(`${MARKET_CACHE_ENDPOINT}?limit=500`);
            const q = query.toLowerCase();
            return (data.coins || [])
                .filter(row => row.coin_id.includes(q) || row.symbol.includes(q) || row.name.toLowerCase().includes(q))
                .map(row => this._normalizeRow(row));
        }

        /**
         * Получить ID монеты по тикеру
         */
        async getCoinIdBySymbol(symbol) {
            const data = await this._fetchFromCache(`${MARKET_CACHE_ENDPOINT}?limit=500`);
            const sym = symbol.toLowerCase();
            const found = (data.coins || []).find(row => row.symbol.toLowerCase() === sym);
            return found ? found.coin_id : null;
        }

        /**
         * Проверить доступность кэша и получить реальное число монет в БД
         * Использует count_only=true — лёгкий запрос без выгрузки данных
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
         * Нормализует строку из coin_market_cache к стандартному формату приложения
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
                // Поля для математической модели (калькуляторы используют pvs / PV*)
                pvs,
                PV1h:   pv1h,
                PV24h:  pv24h,
                PV7d:   pv7d,
                PV14d:  pv14d,
                PV30d:  pv30d,
                PV200d: pv200d,
                ticker: row.symbol,  // калькулятор ищет btcCoin по coin.ticker
                _cachedAt: row.fetched_at ? new Date(row.fetched_at).getTime() : Date.now(),
                _updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
                _source:   'yandex-cache'
            };
        }
    }

    window.YandexCacheProvider = YandexCacheProvider;

})();
