/**
 * ================================================================================================
 * ERROR HANDLER - Единая система обработки ошибок
 * ================================================================================================
 *
 * ЦЕЛЬ: Централизованная обработка всех ошибок приложения.
 * Классификация, логирование, пользовательские сообщения, повторные попытки.
 *
 * Skill: is/skills/arch-foundation
 *
 * ПРИНЦИПЫ:
 * - Все ошибки проходят через единый обработчик
 * - Автоматическая классификация ошибок
 * - Логирование через logger
 * - Пользовательские сообщения
 * - Автоматические повторные попытки для сетевых ошибок
 *
 * ССЫЛКА: Критически важные структуры описаны в is/skills/arch-foundation
 */

(function() {
    'use strict';

    // Зависимости (загружаются до этого скрипта)
    // - core/errors/error-types.js (window.errorTypes)
    // - core/logging/logger.js (window.logger)

    if (typeof window.errorTypes === 'undefined') {
        console.error('error-handler.js: errorTypes не загружен');
        return;
    }

    /**
     * Классифицировать ошибку по типу
     * @param {Error|Object} error - ошибка
     * @returns {string} - тип ошибки
     */
    // Skill anchor: классификация HTTP ошибок (429 vs 500 vs network) критична для retry-политик.
    // See core/skills/api-layer
    function classifyError(error) {
        // HTTP ошибки
        if (error.status === 429) {
            return window.errorTypes.ERROR_TYPES.API_RATE_LIMIT;
        }
        if (error.status === 408 || error.name === 'TimeoutError') {
            return window.errorTypes.ERROR_TYPES.API_TIMEOUT;
        }
        if (error.status >= 400 && error.status < 500) {
            return window.errorTypes.ERROR_TYPES.API_ERROR;
        }
        if (error.status >= 500 || error.name === 'NetworkError') {
            return window.errorTypes.ERROR_TYPES.API_NETWORK;
        }

        // Валидация
        if (error.type === 'validation' || error.name === 'ValidationError') {
            return window.errorTypes.ERROR_TYPES.VALIDATION_ERROR;
        }
        if (error.type === 'schema') {
            return window.errorTypes.ERROR_TYPES.SCHEMA_ERROR;
        }

        // Вычисления
        if (error.type === 'calculation' || error.name === 'CalculationError') {
            return window.errorTypes.ERROR_TYPES.CALCULATION_ERROR;
        }
        if (error.type === 'math' || (typeof error.value === 'number' && (isNaN(error.value) || !isFinite(error.value)))) {
            return window.errorTypes.ERROR_TYPES.MATH_ERROR;
        }

        // Хранилище
        if (error.name === 'QuotaExceededError') {
            return window.errorTypes.ERROR_TYPES.STORAGE_QUOTA;
        }
        if (error.name === 'StorageError') {
            return window.errorTypes.ERROR_TYPES.STORAGE_ERROR;
        }

        return window.errorTypes.ERROR_TYPES.UNKNOWN_ERROR;
    }

    /**
     * Получить ключ сообщения из messagesConfig по типу ошибки
     * @param {string} errorType - тип ошибки из errorTypes.ERROR_TYPES
     * @returns {string} - ключ сообщения для messagesConfig
     */
    function getMessageKey(errorType) {
        const keyMap = {
            [window.errorTypes.ERROR_TYPES.API_ERROR]: 'error.api.error',
            [window.errorTypes.ERROR_TYPES.API_TIMEOUT]: 'error.api.timeout',
            [window.errorTypes.ERROR_TYPES.API_RATE_LIMIT]: 'error.api.rate-limit',
            [window.errorTypes.ERROR_TYPES.API_NETWORK]: 'error.api.network',
            [window.errorTypes.ERROR_TYPES.VALIDATION_ERROR]: 'error.validation.error',
            [window.errorTypes.ERROR_TYPES.SCHEMA_ERROR]: 'error.validation.schema',
            [window.errorTypes.ERROR_TYPES.CALCULATION_ERROR]: 'error.calculation.error',
            [window.errorTypes.ERROR_TYPES.MATH_ERROR]: 'error.calculation.math',
            [window.errorTypes.ERROR_TYPES.STORAGE_ERROR]: 'error.storage.error',
            [window.errorTypes.ERROR_TYPES.STORAGE_QUOTA]: 'error.storage.quota',
            [window.errorTypes.ERROR_TYPES.UNKNOWN_ERROR]: 'error.unknown'
        };
        return keyMap[errorType] || 'error.unknown';
    }

    /**
     * Обработать ошибку
     * @param {Error|Object} error - ошибка
     * @param {Object} context - контекст (компонент, действие, showMessage)
     * @returns {Object} - обработанная ошибка { type, severity, message, userMessage, context }
     */
    function handleError(error, context = {}) {
        const errorType = classifyError(error);
        const severity = window.errorTypes.getSeverity(errorType);
        const userMessage = context.userMessage || window.errorTypes.getUserMessage(errorType);

        const processedError = {
            type: errorType,
            severity,
            message: error.message || String(error),
            userMessage,
            context: {
                component: context.component || 'unknown',
                action: context.action || 'unknown',
                ...context
            },
            originalError: error,
            timestamp: Date.now()
        };

        // Логирование через logger (если доступен)
        if (window.logger) {
            const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
            window.logger[logLevel](processedError.message, processedError.context);
        } else {
            console.error('Error:', processedError);
        }

        // Эмит события через eventBus (если доступен)
        if (window.eventBus) {
            window.eventBus.emit('error-occurred', processedError);
        }

        // Автоматический показ сообщения пользователю через AppMessages
        // Опция showMessage: false отключает автоматический показ
        const showMessage = context.showMessage !== false;
        if (showMessage && window.AppMessages && window.messagesConfig) {
            const messageKey = getMessageKey(errorType);
            const messageData = window.messagesConfig.getMessage(messageKey);

            // Определяем scope из context или используем 'global'
            const scope = context.scope || 'global';

            window.AppMessages.push({
                text: userMessage || messageData.text,
                details: context.details || null,
                type: messageData.type || 'danger',
                priority: messageData.priority || 4,
                key: messageKey, // Сохраняем ключ для последующего перевода
                scope: scope,
                actions: context.actions || []
            });
        }

        return processedError;
    }

    /**
     * Выполнить операцию с автоматическими повторными попытками
     * @param {Function} operation - асинхронная операция
     * @param {Object} options - опции { maxRetries, retryDelay, retryableErrors }
     * @returns {Promise<any>} - результат операции
     */
    async function withRetry(operation, options = {}) {
        const {
            maxRetries = 3,
            retryDelay = 1000,
            retryableErrors = [
                window.errorTypes.ERROR_TYPES.API_NETWORK,
                window.errorTypes.ERROR_TYPES.API_TIMEOUT,
                window.errorTypes.ERROR_TYPES.API_RATE_LIMIT
            ]
        } = options;

        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                const processedError = handleError(error, { action: 'retry', attempt });

                // Проверка, можно ли повторить
                if (attempt < maxRetries && retryableErrors.includes(processedError.type)) {
                    const delay = retryDelay * Math.pow(2, attempt); // Экспоненциальная задержка
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                throw processedError;
            }
        }

        throw lastError;
    }

    // Экспорт в глобальную область
    window.errorHandler = {
        handleError,
        withRetry,
        classifyError
    };

    console.log('error-handler.js: инициализирован');
})();

