/**
 * ================================================================================================
 * NORMALIZER - Нормализация данных к единому формату
 * ================================================================================================
 *
 * PURPOSE: Приводить данные из разных источников к единому формату.
 * Нормализация API-ответов, временных рядов, портфелей.
 * Skill: core/skills/domain-portfolio
 *
 * PRINCIPLES:
 * - Единый формат независимо от источника
 * - Сохранение всех данных при нормализации
 * - Обратная совместимость
 *
 * ССЫЛКА: Критически важные структуры описаны в is/skills/arch-foundation
 */

(function() {
    'use strict';

    /**
     * Нормализовать данные монеты из CoinGecko API
     * @param {Object} coinData - данные из API
     * @returns {Object} - нормализованные данные
     */
    function normalizeCoinGeckoCoin(coinData) {
        return {
            id: coinData.id || '',
            symbol: (coinData.symbol || '').toUpperCase(),
            name: coinData.name || '',
            image: coinData.image || coinData.image?.small || '',
            marketCapRank: coinData.market_cap_rank || null,
            currentPrice: coinData.market_data?.current_price?.usd || coinData.current_price || null,
            marketCap: coinData.market_data?.market_cap?.usd || coinData.market_cap || null,
            totalVolume: coinData.market_data?.total_volume?.usd || coinData.total_volume || null,
            priceChange24h: coinData.market_data?.price_change_percentage_24h || coinData.price_change_percentage_24h || null
        };
    }

    /**
     * Нормализовать массив монет из CoinGecko API
     * @param {Array} coinsArray - массив данных монет
     * @returns {Array} - массив нормализованных данных
     */
    function normalizeCoinGeckoCoins(coinsArray) {
        if (!Array.isArray(coinsArray)) {
            return [];
        }
        return coinsArray.map(normalizeCoinGeckoCoin);
    }

    /**
     * Нормализовать точку временного ряда
     * @param {Object} point - точка данных
     * @param {string} coinId - ID монеты
     * @returns {Object} - нормализованная точка
     */
    function normalizeTimeSeriesPoint(point, coinId) {
        return {
            timestamp: point.timestamp || point.time || point.date || Date.now(),
            value: typeof point.value === 'number' ? point.value : parseFloat(point.value) || 0,
            coinId: coinId || point.coinId || ''
        };
    }

    /**
     * Нормализовать метрику рынка
     * @param {Object} metric - данные metrics
     * @returns {Object} - нормализованная метрика
     */
    function normalizeMarketMetric(metric) {
        return {
            name: metric.name || metric.type || '',
            value: typeof metric.value === 'number' ? metric.value : parseFloat(metric.value) || 0,
            timestamp: metric.timestamp || metric.time || Date.now()
        };
    }

    // Export to global scope
    window.normalizer = {
        normalizeCoinGeckoCoin,
        normalizeCoinGeckoCoins,
        normalizeTimeSeriesPoint,
        normalizeMarketMetric
    };

    console.log('normalizer.js: initialized');
})();

