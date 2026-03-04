/**
 * ================================================================================================
 * NORMALIZER - Data normalization to unified format
 * ================================================================================================
 *
 * PURPOSE: Normalize data from different sources to unified format.
 * Normalization of API responses, time series, portfolios.
 * Skill: id:sk-c3d639
 *
 * PRINCIPLES:
 * - Unified format regardless of source
 * - Preserve all data during normalization
 * - Backward compatibility
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    /**
     * Normalize coin data from CoinGecko API
     * @param {Object} coinData - Data from API
     * @returns {Object} - Normalized data
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
     * Normalize coin array from CoinGecko API
     * @param {Array} coinsArray - Array of coin data
     * @returns {Array} - Array of normalized data
     */
    function normalizeCoinGeckoCoins(coinsArray) {
        if (!Array.isArray(coinsArray)) {
            return [];
        }
        return coinsArray.map(normalizeCoinGeckoCoin);
    }

    /**
     * Normalize time series point
     * @param {Object} point - Data point
     * @param {string} coinId - Coin ID
     * @returns {Object} - Normalized point
     */
    function normalizeTimeSeriesPoint(point, coinId) {
        return {
            timestamp: point.timestamp || point.time || point.date || Date.now(),
            value: typeof point.value === 'number' ? point.value : parseFloat(point.value) || 0,
            coinId: coinId || point.coinId || ''
        };
    }

    /**
     * Normalize market metric
     * @param {Object} metric - Metric data
     * @returns {Object} - Normalized metric
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

