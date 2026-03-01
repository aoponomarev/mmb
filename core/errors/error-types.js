/**
 * ================================================================================================
 * ERROR TYPES - Типы ошибок и их классификация
 * ================================================================================================
 *
 * ЦЕЛЬ: Определить типы ошибок для единообразной обработки.
 * Классификация ошибок по категориям и уровням критичности.
 * Skill: a/skills/app/skills/architecture/architecture-core-stack.md
 *
 * ПРИНЦИПЫ:
 * - Чёткая классификация ошибок
 * - Уровни критичности
 * - Пользовательские сообщения для каждого типа
 *
 * ССЫЛКА: Критически важные структуры описаны в a/skills/app/skills/architecture/architecture-core-stack.md
 */

(function() {
    'use strict';

    /**
     * Типы ошибок
     */
    const ERROR_TYPES = {
        // API ошибки
        API_ERROR: 'api_error',
        API_TIMEOUT: 'api_timeout',
        API_RATE_LIMIT: 'api_rate_limit',
        API_NETWORK: 'api_network',

        // Валидация
        VALIDATION_ERROR: 'validation_error',
        SCHEMA_ERROR: 'schema_error',

        // Вычисления
        CALCULATION_ERROR: 'calculation_error',
        MATH_ERROR: 'math_error',

        // Хранилище
        STORAGE_ERROR: 'storage_error',
        STORAGE_QUOTA: 'storage_quota',

        // Общие
        UNKNOWN_ERROR: 'unknown_error'
    };

    /**
     * Уровни критичности
     */
    const ERROR_SEVERITY = {
        LOW: 'low',           // Информационные ошибки
        MEDIUM: 'medium',     // Предупреждения
        HIGH: 'high',         // Критические ошибки
        CRITICAL: 'critical'  // Критические ошибки, требующие внимания
    };

    /**
     * Пользовательские сообщения для каждого типа ошибки
     */
    const ERROR_MESSAGES = {
        [ERROR_TYPES.API_ERROR]: 'Ошибка при загрузке данных с сервера',
        [ERROR_TYPES.API_TIMEOUT]: 'Превышено время ожидания ответа от сервера',
        [ERROR_TYPES.API_RATE_LIMIT]: 'Превышен лимит запросов. Пожалуйста, подождите',
        [ERROR_TYPES.API_NETWORK]: 'Ошибка сети. Проверьте подключение к интернету',
        [ERROR_TYPES.VALIDATION_ERROR]: 'Данные не прошли проверку',
        [ERROR_TYPES.SCHEMA_ERROR]: 'Неверная структура данных',
        [ERROR_TYPES.CALCULATION_ERROR]: 'Ошибка при расчёте',
        [ERROR_TYPES.MATH_ERROR]: 'Ошибка в математических вычислениях',
        [ERROR_TYPES.STORAGE_ERROR]: 'Ошибка при сохранении данных',
        [ERROR_TYPES.STORAGE_QUOTA]: 'Недостаточно места для сохранения данных',
        [ERROR_TYPES.UNKNOWN_ERROR]: 'Произошла неизвестная ошибка'
    };

    /**
     * Получить уровень критичности для типа ошибки
     * @param {string} errorType - тип ошибки
     * @returns {string} - уровень критичности
     */
    function getSeverity(errorType) {
        const severityMap = {
            [ERROR_TYPES.API_RATE_LIMIT]: ERROR_SEVERITY.MEDIUM,
            [ERROR_TYPES.API_TIMEOUT]: ERROR_SEVERITY.MEDIUM,
            [ERROR_TYPES.API_NETWORK]: ERROR_SEVERITY.HIGH,
            [ERROR_TYPES.API_ERROR]: ERROR_SEVERITY.HIGH,
            [ERROR_TYPES.VALIDATION_ERROR]: ERROR_SEVERITY.HIGH,
            [ERROR_TYPES.SCHEMA_ERROR]: ERROR_SEVERITY.HIGH,
            [ERROR_TYPES.CALCULATION_ERROR]: ERROR_SEVERITY.CRITICAL,
            [ERROR_TYPES.MATH_ERROR]: ERROR_SEVERITY.CRITICAL,
            [ERROR_TYPES.STORAGE_QUOTA]: ERROR_SEVERITY.MEDIUM,
            [ERROR_TYPES.STORAGE_ERROR]: ERROR_SEVERITY.HIGH,
            [ERROR_TYPES.UNKNOWN_ERROR]: ERROR_SEVERITY.MEDIUM
        };
        return severityMap[errorType] || ERROR_SEVERITY.MEDIUM;
    }

    /**
     * Получить пользовательское сообщение для типа ошибки
     * @param {string} errorType - тип ошибки
     * @returns {string} - сообщение
     */
    function getUserMessage(errorType) {
        return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR];
    }

    // Экспорт в глобальную область
    window.errorTypes = {
        ERROR_TYPES,
        ERROR_SEVERITY,
        ERROR_MESSAGES,
        getSeverity,
        getUserMessage
    };

    console.log('error-types.js: инициализирован');
})();

