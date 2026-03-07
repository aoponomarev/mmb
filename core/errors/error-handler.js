/**
 * #JS-tWuXPtTi
 * @description Centralized error handling: classification, logging, user messages, retries.
 * @skill id:sk-483943
 *
 * PRINCIPLES:
 * - All errors go through single handler
 * - Automatic error classification
 * - Logging via logger
 * - User messages
 * - Automatic retries for network errors
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    // Dependencies (loaded before this script)
    // - #JS-Sq2CfSP1 (error-types.js) (window.errorTypes)
    // - #JS-Dd4AQf9o (logger.js) (window.logger)

    if (typeof window.errorTypes === 'undefined') {
        console.error('error-handler.js: errorTypes not loaded');
        return;
    }

    /**
     * Classify error by type
     * @param {Error|Object} error - error
     * @returns {string} - error type
     */
    // Skill anchor: HTTP error classification (429 vs 500 vs network) critical for retry policies.
    // See id:sk-bb7c8e
    function classifyError(error) {
        // HTTP errors
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

        // Validation
        if (error.type === 'validation' || error.name === 'ValidationError') {
            return window.errorTypes.ERROR_TYPES.VALIDATION_ERROR;
        }
        if (error.type === 'schema') {
            return window.errorTypes.ERROR_TYPES.SCHEMA_ERROR;
        }

        // Computation
        if (error.type === 'calculation' || error.name === 'CalculationError') {
            return window.errorTypes.ERROR_TYPES.CALCULATION_ERROR;
        }
        if (error.type === 'math' || (typeof error.value === 'number' && (isNaN(error.value) || !isFinite(error.value)))) {
            return window.errorTypes.ERROR_TYPES.MATH_ERROR;
        }

        // Storage
        if (error.name === 'QuotaExceededError') {
            return window.errorTypes.ERROR_TYPES.STORAGE_QUOTA;
        }
        if (error.name === 'StorageError') {
            return window.errorTypes.ERROR_TYPES.STORAGE_ERROR;
        }

        return window.errorTypes.ERROR_TYPES.UNKNOWN_ERROR;
    }

    /**
     * Get message key from messagesConfig by error type
     * @param {string} errorType - error type from errorTypes.ERROR_TYPES
     * @returns {string} - message key for messagesConfig
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
     * Handle error
     * @param {Error|Object} error - error
     * @param {Object} context - context (component, action, showMessage)
     * @returns {Object} - processed error { type, severity, message, userMessage, context }
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

        // Log via logger (if available)
        if (window.logger) {
            const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
            window.logger[logLevel](processedError.message, processedError.context);
        } else {
            console.error('Error:', processedError);
        }

        // Emit event via eventBus (if available)
        if (window.eventBus) {
            window.eventBus.emit('error-occurred', processedError);
        }

        // Automatic user message display via AppMessages
        // Option showMessage: false disables automatic display
        const showMessage = context.showMessage !== false;
        if (showMessage && window.AppMessages && window.messagesConfig) {
            const messageKey = getMessageKey(errorType);
            const messageData = window.messagesConfig.getMessage(messageKey);

            // Derive scope from context or use 'global'
            const scope = context.scope || 'global';

            window.AppMessages.push({
                text: userMessage || messageData.text,
                details: context.details || null,
                type: messageData.type || 'danger',
                priority: messageData.priority || 4,
                key: messageKey, // Store key for later translation
                scope: scope,
                actions: context.actions || []
            });
        }

        return processedError;
    }

    /**
     * Run operation with automatic retries
     * @param {Function} operation - async operation
     * @param {Object} options - options { maxRetries, retryDelay, retryableErrors }
     * @returns {Promise<any>} - operation result
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

                // Check if retry is allowed
                if (attempt < maxRetries && retryableErrors.includes(processedError.type)) {
                    const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                throw processedError;
            }
        }

        throw lastError;
    }

    // Export to global scope
    window.errorHandler = {
        handleError,
        withRetry,
        classifyError
    };

    console.log('error-handler.js: initialized');
})();

