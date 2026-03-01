/**
 * ================================================================================================
 * BASE DATA PROVIDER - Базовый класс for провайдеров данных о монетах
 * ================================================================================================
 * Skill: core/skills/api-layer
 *
 * PURPOSE: Единый интерфейс for работы с различными источниками данных о криптовалютах
 * (CoinGecko, CoinMarketCap, Binance и т.д.).
 *
 * PRINCIPLES:
 * - Абстракция различий между API провайдеров
 * - Нормализация данных к единому формату
 * - Обработка rate limiting и ошибок
 * - Поддержка кэширования
 *
 * ОБЯЗАТЕЛЬНЫЕ МЕТОДЫ (должны быть реализованы в дочерних классах):
 * - getTopCoins(count, sortBy) — получить топ N монет
 * - searchCoins(query) — поиск монет по названию/тикеру
 * - getCoinData(coinIds) — получить данные монет по ID
 * - getCoinIdBySymbol(symbol) — получить ID монеты по тикеру
 * - getName() — внутреннее имя провайдера
 * - getDisplayName() — отображаемое имя провайдера
 * - validateApiKey(apiKey) — валидация API ключа (если требуется)
 *
 * НОРМАЛИЗОВАННЫЙ ФОРМАТ ДАННЫХ:
 * {
 *   id: string,
 *   symbol: string,
 *   name: string,
 *   image: string,
 *   current_price: number,
 *   market_cap: number,
 *   market_cap_rank: number,
 *   total_volume: number,
 *   price_change_percentage_1h: number,
 *   price_change_percentage_24h: number,
 *   price_change_percentage_7d: number,
 *   price_change_percentage_14d: number,
 *   price_change_percentage_30d: number,
 *   price_change_percentage_200d: number
 * }
 *
 * USAGE:
 * class MyProvider extends BaseDataProvider {
 *   async getTopCoins(count, sortBy) { ... }
 *   // ... остальные методы
 * }
 *
 * REFERENCES:
 * - Data Provider Manager: core/api/data-provider-manager.js
 * - AI Provider for аналогии: core/api/ai-providers/base-provider.js
 * - Нормализация: core/validation/normalizer.js
 */

(function() {
    'use strict';

    /**
     * Базовый класс for провайдеров данных о монетах
     */
    class BaseDataProvider {
        constructor() {
            if (this.constructor === BaseDataProvider) {
                throw new Error('BaseDataProvider is abstract and cannot be instantiated directly');
            }
        }

        /**
         * Get топ N монет по капитализации или объему
         * @param {number} count - Количество монет (1-250)
         * @param {string} sortBy - Сортировка: 'market_cap' | 'volume'
         * @param {Object} options - Дополнительные опции (apiKey, timeout и т.д.)
         * @returns {Promise<Array>} Массив нормализованных данных монет
         */
        async getTopCoins(count, sortBy = 'market_cap', options = {}) {
            throw new Error('getTopCoins() must be implemented in derived class');
        }

        /**
         * Поиск монет по названию или тикеру
         * @param {string} query - Поисковый запрос
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<Array>} Массив найденных монет (до 10)
         */
        async searchCoins(query, options = {}) {
            throw new Error('searchCoins() must be implemented in derived class');
        }

        /**
         * Get данные монет по их ID
         * @param {Array<string>} coinIds - Массив ID монет
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<Array>} Массив нормализованных данных монет
         */
        async getCoinData(coinIds, options = {}) {
            throw new Error('getCoinData() must be implemented in derived class');
        }

        /**
         * Get ID монеты по тикеру
         * @param {string} symbol - Тикер монеты (BTC, ETH и т.д.)
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<string|null>} ID монеты или null
         */
        async getCoinIdBySymbol(symbol, options = {}) {
            throw new Error('getCoinIdBySymbol() must be implemented in derived class');
        }

        /**
         * Get внутреннее имя провайдера
         * @returns {string} Имя провайдера ('coingecko', 'coinmarketcap' и т.д.)
         */
        getName() {
            throw new Error('getName() must be implemented in derived class');
        }

        /**
         * Get отображаемое имя провайдера
         * @returns {string} Отображаемое имя ('CoinGecko', 'CoinMarketCap' и т.д.)
         */
        getDisplayName() {
            throw new Error('getDisplayName() must be implemented in derived class');
        }

        /**
         * Валидация API ключа (если требуется for провайдера)
         * @param {string} apiKey - API ключ
         * @returns {boolean} true если ключ валиден
         */
        validateApiKey(apiKey) {
            // Базовая реализация: проверка на пустоту
            // Дочерние классы могут переопределить for более строгой валидации
            return typeof apiKey === 'string' && apiKey.length > 0;
        }

        /**
         * Проверка, требуется ли API ключ for провайдера
         * @returns {boolean} true если API ключ обязателен
         */
        requiresApiKey() {
            // По умолчанию API ключ не требуется
            // Дочерние классы переопределяют при необходимости
            return false;
        }

        /**
         * Нормализация данных монеты к единому формату
         * Базовая реализация - возвращает данные как есть
         * Дочерние классы должны переопределить for приведения к единому формату
         * @param {Object} coinData - Данные монеты от провайдера
         * @returns {Object} Нормализованные данные
         */
        normalizeCoinData(coinData) {
            return coinData;
        }

        /**
         * Обработка ошибок HTTP requestов
         * @param {Response} response - HTTP response
         * @param {string} context - Контекст for сообщения об ошибке
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
         * Логирование ошибок через системные сообщения
         * @param {string} message - Сообщение об ошибке
         * @param {string} details - Детали ошибки
         */
        logError(message, details = null) {
            console.error(`[${this.getName()}] ${message}`, details);

            // Отправляем сообщение через систему сообщений если доступна
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
         * Логирование предупреждений
         * @param {string} message - Сообщение
         * @param {string} details - Детали
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

    // Экспорт через window for использования в других модулях
    window.BaseDataProvider = BaseDataProvider;

    console.log('✅ BaseDataProvider loaded');

})();
