/**
 * #JS-M12i9VHB
 * @description Rate limiting parameters for various APIs; used by rate-limiter.js.
 * @skill id:sk-bb7c8e
 *
 * PRINCIPLES:
 * - Adaptive timeout parameters
 * - Request priorities
 * - Per-API settings
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    /**
     * Rate limiting configuration for various APIs
     */
    const API_CONFIG = {
        coingecko: {
            baseTimeout: 300,      // 300ms базовый таймаут
            maxTimeout: 10000,    // 10 секунд максимум
            retryDelay: 1000,     // 1 секунда задержка между повторами
            maxRetries: 3
        },
        marketMetrics: {
            baseTimeout: 200,
            maxTimeout: 5000,
            retryDelay: 500,
            maxRetries: 2
        }
    };

    /**
     * Request priorities (lower = higher priority)
     */
    const REQUEST_PRIORITIES = {
        CRITICAL: 1,    // Critical requests (user actions)
        HIGH: 3,        // Important requests (data refresh)
        NORMAL: 5,      // Normal requests (background updates)
        LOW: 7          // Low priority (caching, preload)
    };

    /**
     * Get config for API
     * @param {string} apiName - API name
     * @returns {Object} - config
     */
    function getApiConfig(apiName) {
        return API_CONFIG[apiName] || API_CONFIG.coingecko;
    }

    /**
     * Get request priority
     * @param {string} requestType - request type
     * @returns {number} - priority
     */
    function getPriority(requestType) {
        return REQUEST_PRIORITIES[requestType] || REQUEST_PRIORITIES.NORMAL;
    }

    // Export to global scope
    window.apiConfig = {
        API_CONFIG,
        REQUEST_PRIORITIES,
        getApiConfig,
        getPriority
    };

    console.log('api-config.js: initialized');
})();

