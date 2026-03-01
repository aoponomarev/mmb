/**
 * ================================================================================================
 * API CONFIG - Конфигурация for rate limiter
 * ================================================================================================
 *
 * PURPOSE: Конфигурация параметров rate limiting for разных API.
 * Используется rate-limiter.js for managing запросами.
 * Skill: core/skills/api-layer
 *
 * PRINCIPLES:
 * - Параметры адаптивных таймаутов
 * - Приоритеты запросов
 * - Настройки for каждого API
 *
 * ССЫЛКА: Критически важные структуры описаны в is/skills/arch-foundation
 */

(function() {
    'use strict';

    /**
     * Конфигурация rate limiting for разных API
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
     * Приоритеты запросов (меньше = выше приоритет)
     */
    const REQUEST_PRIORITIES = {
        CRITICAL: 1,    // Критичные запросы (пользовательские действия)
        HIGH: 3,        // Важные запросы (обновление данных)
        NORMAL: 5,      // Обычные запросы (фоновые обновления)
        LOW: 7          // Низкий приоритет (кэширование, предзагрузка)
    };

    /**
     * Get конфигурацию for API
     * @param {string} apiName - имя API
     * @returns {Object} - конфигурация
     */
    function getApiConfig(apiName) {
        return API_CONFIG[apiName] || API_CONFIG.coingecko;
    }

    /**
     * Get приоритет запроса
     * @param {string} requestType - тип запроса
     * @returns {number} - приоритет
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

