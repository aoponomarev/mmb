/**
 * #JS-to2j4mpy
 * @description Data validation schemas for API responses, time series, portfolios and strategies.
 * @skill id:sk-c3d639
 *
 * PRINCIPLES:
 * - Strict validation of financial data
 * - Normalization to unified format
 * - Type and value range checks
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    /**
     * Validation schemas for different data types
     */
    const SCHEMAS = {
        // CoinGecko API responses
        coinGeckoCoin: {
            id: { type: 'string', required: true },
            symbol: { type: 'string', required: true },
            name: { type: 'string', required: true },
            image: { type: 'string', required: false },
            market_cap_rank: { type: 'number', required: false, min: 1 }
        },

        coinGeckoMarketData: {
            current_price: { type: 'number', required: false, min: 0 },
            market_cap: { type: 'number', required: false, min: 0 },
            total_volume: { type: 'number', required: false, min: 0 },
            price_change_percentage_24h: { type: 'number', required: false }
        },

        // Time series
        timeSeriesPoint: {
            timestamp: { type: 'number', required: true, min: 0 },
            value: { type: 'number', required: true },
            coinId: { type: 'string', required: true }
        },

        // Portfolios (updated D.1)
        portfolio: {
            id: { type: 'string', required: true },
            name: { type: 'string', required: true },
            createdAt: { type: 'string', required: true },
            coins: {
                type: 'array',
                required: true,
                itemSchema: {
                    coinId: { type: 'string', required: true },
                    ticker: { type: 'string', required: true },
                    portfolioPercent: { type: 'number', required: true, min: 0, max: 100 },
                    delegatedBy: {
                        type: 'object',
                        required: true,
                        properties: {
                            modelId: { type: 'string', required: true },
                            modelName: { type: 'string', required: true },
                            agrAtDelegation: { type: 'number', required: true }
                        }
                    }
                }
            },
            marketMetrics: { type: 'object', required: false },
            marketAnalysis: { type: 'object', required: false },
            settings: { type: 'object', required: false },
            modelMix: { type: 'object', required: false }
        },

        // Strategies
        strategy: {
            id: { type: 'string', required: true },
            type: { type: 'string', required: true, enum: ['rebalance', 'filter', 'weight-limit'] },
            rules: { type: 'object', required: true },
            isActive: { type: 'boolean', required: true }
        },

        // Market metrics
        marketMetric: {
            name: { type: 'string', required: true },
            value: { type: 'number', required: true },
            timestamp: { type: 'number', required: true }
        }
    };

    /**
     * Get schema by name
     * @param {string} schemaName - Schema name
     * @returns {Object|null} - Schema or null
     */
    function getSchema(schemaName) {
        return SCHEMAS[schemaName] || null;
    }

    // Export to global scope
    window.validationSchemas = {
        SCHEMAS,
        getSchema
    };

    console.log('validation-schemas.js: initialized');
})();

