/**
 * ================================================================================================
 * VALIDATION SCHEMAS - Схемы валидации данных
 * ================================================================================================
 * Skill: core/skills/domain-portfolio
 *
 * PURPOSE: Определить структуру и типы данных for всех источников данных приложения.
 * Валидация API-ответов, временных рядов, портфелей и стратегий.
 * Skill: core/skills/domain-portfolio
 *
 * PRINCIPLES:
 * - Строгая валидация финансовых данных
 * - Нормализация к единому формату
 * - Проверка типов и диапазонов значений
 *
 * ССЫЛКА: Критически важные структуры описаны в is/skills/arch-foundation
 */

(function() {
    'use strict';

    /**
     * Схемы валидации for разных типов данных
     */
    const SCHEMAS = {
        // CoinGecko API ответы
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

        // Временные ряды
        timeSeriesPoint: {
            timestamp: { type: 'number', required: true, min: 0 },
            value: { type: 'number', required: true },
            coinId: { type: 'string', required: true }
        },

        // Портфели (Обновлено D.1)
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

        // Стратегии
        strategy: {
            id: { type: 'string', required: true },
            type: { type: 'string', required: true, enum: ['rebalance', 'filter', 'weight-limit'] },
            rules: { type: 'object', required: true },
            isActive: { type: 'boolean', required: true }
        },

        // Метрики рынка
        marketMetric: {
            name: { type: 'string', required: true },
            value: { type: 'number', required: true },
            timestamp: { type: 'number', required: true }
        }
    };

    /**
     * Get схему по имени
     * @param {string} schemaName - имя схемы
     * @returns {Object|null} - схема или null
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

