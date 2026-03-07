/**
 * #JS-17n4k14b
 * @description Base class for coin data providers; unified interface for CoinGecko, CoinMarketCap, Binance, etc.
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * PURPOSE: Abstract base; all concrete providers extend this and implement getTopCoins, searchCoins, etc.
 *
 * USAGE:
 * class MyProvider extends BaseDataProvider {
 *   async getTopCoins(count, sortBy) { ... }
 *   async searchCoins(query, options) { ... }
 * }
 *
 * REFERENCES:
 * - Data provider manager: #JS-2436XKxE (data-provider-manager.js)
 * - Provider config: #JS-siMJxsfA (data-providers-config.js)
 */

(function() {
    'use strict';

    /**
     * Base class for coin data providers
     */
    class BaseDataProvider {
        constructor() {
            if (this.constructor === BaseDataProvider) {
                throw new Error('BaseDataProvider is abstract and cannot be instantiated directly');
            }
        }

        /**
         * Get top N coins by market cap or volume
         * @param {number} count - Number of coins (1-250)
         * @param {string} sortBy - Sort by: 'market_cap' | 'volume'
         * @param {Object} options - Additional options (apiKey, timeout, etc.)
         * @returns {Promise<Array>} Array of normalized coin data
         */
        async getTopCoins(count, sortBy = 'market_cap', options = {}) {
            throw new Error('getTopCoins() must be implemented in derived class');
        }

        /**
         * Search coins by name or ticker
         * @param {string} query - Search query
         * @param {Object} options - Additional options
         * @returns {Promise<Array>} Array of found coins (up to 10)
         */
        async searchCoins(query, options = {}) {
            throw new Error('searchCoins() must be implemented in derived class');
        }

        /**
         * Get coin data by IDs
         * @param {Array<string>} coinIds - Array of coin IDs
         * @param {Object} options - Additional options
         * @returns {Promise<Array>} Array of normalized coin data
         */
        async getCoinData(coinIds, options = {}) {
            throw new Error('getCoinData() must be implemented in derived class');
        }

        /**
         * Get coin ID by ticker symbol
         * @param {string} symbol - Coin ticker (BTC, ETH, etc.)
         * @param {Object} options - Additional options
         * @returns {Promise<string|null>} Coin ID or null
         */
        async getCoinIdBySymbol(symbol, options = {}) {
            throw new Error('getCoinIdBySymbol() must be implemented in derived class');
        }

        /**
         * Get provider internal name
         * @returns {string} Provider name ('coingecko', 'coinmarketcap', etc.)
         */
        getName() {
            throw new Error('getName() must be implemented in derived class');
        }

        /**
         * Get provider display name
         * @returns {string} Display name ('CoinGecko', 'CoinMarketCap', etc.)
         */
        getDisplayName() {
            throw new Error('getDisplayName() must be implemented in derived class');
        }

        /**
         * Validate API key (if required for provider)
         * @param {string} apiKey - API key
         * @returns {boolean} true if key is valid
         */
        validateApiKey(apiKey) {
            // Base implementation: check for non-empty
            // Derived classes may override for stricter validation
            return typeof apiKey === 'string' && apiKey.length > 0;
        }

        /**
         * Check if API key is required for provider
         * @returns {boolean} true if API key is mandatory
         */
        requiresApiKey() {
            // By default API key is not required
            // Derived classes override when needed
            return false;
        }

        /**
         * Normalize coin data to unified format
         * Base implementation returns data as-is
         * Derived classes must override for format normalization
         * @param {Object} coinData - Coin data from provider
         * @returns {Object} Normalized data
         */
        normalizeCoinData(coinData) {
            return coinData;
        }

        /**
         * Handle HTTP request errors
         * @param {Response} response - HTTP response
         * @param {string} context - Context for error message
         * @throws {Error}
         */
        handleHttpError(response, context = 'HTTP request') {
            const status = response.status;
            let errorMessage = `${context} failed with status ${status}`;
            if (status === 429) {
                errorMessage = 'Rate limit exceeded. Please try again later.';
            } else if (status === 401) {
                errorMessage = 'Invalid API key or unauthorized access.';
            } else if (status === 404) {
                errorMessage = 'Resource not found.';
            } else if (status >= 500) {
                errorMessage = 'Provider server error. Please try again later.';
            }

            const error = new Error(errorMessage);
            error.status = status;
            error.context = context;
            throw error;
        }

        /**
         * Log errors via system messages
         * @param {string} message - Error message
         * @param {string} details - Error details
         */
        logError(message, details = null) {
            console.error(`[${this.getName()}] ${message}`, details);

            // Send message via system messages if available
            if (window.AppMessages && window.AppMessages.replace) {
                window.AppMessages.replace(`data-provider-${this.getName()}-error`, {
                    scope: 'data-provider',
                    type: 'danger',
                    text: `${this.getDisplayName()}: ${message}`,
                    details: details ? String(details) : null
                });
            }
        }

        /**
         * Log warnings
         * @param {string} message - Message
         * @param {string} details - Details
         */
        logWarning(message, details = null) {
            console.warn(`[${this.getName()}] ${message}`, details);

            if (window.AppMessages && window.AppMessages.replace) {
                window.AppMessages.replace(`data-provider-${this.getName()}-warning`, {
                    scope: 'data-provider',
                    type: 'warning',
                    text: `${this.getDisplayName()}: ${message}`,
                    details: details ? String(details) : null
                });
            }
        }
    }

    // Export via window for use in other modules
    window.BaseDataProvider = BaseDataProvider;

    console.log('✅ BaseDataProvider loaded');

})();
