/**
 * #JS-Sq2CfSP1
 * @description Error types and classification for uniform handling; categories and severity levels.
 * @skill id:sk-483943
 *
 * PRINCIPLES:
 * - Clear error classification
 * - Severity levels
 * - User messages for each type
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    /**
     * Error types
     */
    const ERROR_TYPES = {
        // API errors
        API_ERROR: 'api_error',
        API_TIMEOUT: 'api_timeout',
        API_RATE_LIMIT: 'api_rate_limit',
        API_NETWORK: 'api_network',

        // Validation
        VALIDATION_ERROR: 'validation_error',
        SCHEMA_ERROR: 'schema_error',

        // Computation
        CALCULATION_ERROR: 'calculation_error',
        MATH_ERROR: 'math_error',

        // Storage
        STORAGE_ERROR: 'storage_error',
        STORAGE_QUOTA: 'storage_quota',

        // General
        UNKNOWN_ERROR: 'unknown_error'
    };

    /**
     * Severity levels
     */
    const ERROR_SEVERITY = {
        LOW: 'low',           // Informational errors
        MEDIUM: 'medium',     // Warnings
        HIGH: 'high',         // Critical errors
        CRITICAL: 'critical'  // Critical errors requiring attention
    };

    /**
     * User messages for each error type
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
        [ERROR_TYPES.STORAGE_QUOTA]: 'Недостаточно места for сохранения данных',
        [ERROR_TYPES.UNKNOWN_ERROR]: 'Произошла неизвестная ошибка'
    };

    /**
     * Get severity level for error type
     * @param {string} errorType - error type
     * @returns {string} - severity level
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
     * Get user message for error type
     * @param {string} errorType - error type
     * @returns {string} - message
     */
    function getUserMessage(errorType) {
        return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR];
    }

    // Export to global scope
    window.errorTypes = {
        ERROR_TYPES,
        ERROR_SEVERITY,
        ERROR_MESSAGES,
        getSeverity,
        getUserMessage
    };

    console.log('error-types.js: initialized');
})();

