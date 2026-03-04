/**
 * ================================================================================================
 * LOGGER - Structured logging
 * ================================================================================================
 *
 * PURPOSE: Uniform logging with levels and context.
 * Simplifies debugging and application monitoring.
 * Skill: id:sk-bb7c8e
 *
 * PRINCIPLES:
 * - Log levels (debug, info, warn, error)
 * - Context (component, action)
 * - Unified log format
 * - Optional server submission (if needed)
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    /**
     * Log levels
     */
    const LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    /**
     * Current log level (default INFO in production, DEBUG in development)
     */
    let currentLogLevel = LOG_LEVELS.INFO;

    /**
     * Set log level by environment
     */
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' || window.location.hostname.includes('github.io')) {
        currentLogLevel = LOG_LEVELS.DEBUG;
    }

    /**
     * Format log entry
     * @param {string} level - level
     * @param {string} message - message
     * @param {Object} context - context
     * @returns {string} - formatted message
     */
    function formatLog(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const contextStr = Object.keys(context).length > 0
            ? ` [${Object.entries(context).map(([k, v]) => `${k}:${v}`).join(', ')}]`
            : '';
        return `[${timestamp}] [${level}]${contextStr} ${message}`;
    }

    /**
     * Log message
     * @param {string} level - level
     * @param {string} message - message
     * @param {Object} context - context (showMessage: false disables auto-display)
     */
    function log(level, message, context = {}) {
        const levelNum = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;

        if (levelNum < currentLogLevel) {
            return; // Skip if level below current
        }

        const formatted = formatLog(level, message, context);

        // Write to sessionLogStore (if available) for display in Session Log modal
        if (window.sessionLogStore && typeof window.sessionLogStore.addLog === 'function') {
            try {
                // Extract source from context if present
                const source = context.component || context.source || 'logger.js';
                window.sessionLogStore.addLog(level, formatted, source);
            } catch (e) {
                // Ignore sessionLogStore write errors
            }
        }

        switch (levelNum) {
            case LOG_LEVELS.DEBUG:
                console.debug(formatted);
                break;
            case LOG_LEVELS.INFO:
                console.info(formatted);
                break;
            case LOG_LEVELS.WARN:
                console.warn(formatted);
                break;
            case LOG_LEVELS.ERROR:
                console.error(formatted);
                break;
        }

        // Emit event via eventBus (if available)
        if (window.eventBus && levelNum >= LOG_LEVELS.WARN) {
            window.eventBus.emit('log', { level, message, context, timestamp: Date.now() });
        }

        // Auto-display message to user for warn/error
        // Option showMessage: false disables auto-display
        const showMessage = context.showMessage !== false;
        if (showMessage && levelNum >= LOG_LEVELS.WARN && window.AppMessages) {
            const messageType = levelNum === LOG_LEVELS.ERROR ? 'danger' : 'warning';
            const priority = levelNum === LOG_LEVELS.ERROR ? 4 : 3;
            const scope = context.scope || 'global';

            // If context has messageKey, use messagesConfig for translatable message
            let messageText = message;
            let messageDetails = context.details || null;
            let messageKey = context.messageKey || null;

            if (messageKey && window.messagesConfig && typeof window.messagesConfig.getMessage === 'function') {
                try {
                    const messageData = window.messagesConfig.getMessage(messageKey, context.messageParams || {});
                    messageText = messageData.text || message;
                    messageDetails = messageData.details || messageDetails;
                } catch (error) {
                    console.warn('logger: ошибка получения сообщения из messagesConfig:', error);
                }
            }

            window.AppMessages.push({
                text: messageText,
                details: messageDetails,
                type: messageType,
                priority: priority,
                scope: scope,
                actions: context.actions || [],
                key: messageKey, // Store key for later translation
                params: context.messageParams || null // Store params for later translation
            });
        }
    }

    /**
     * Set log level
     * @param {string} level - level (debug, info, warn, error)
     */
    function setLogLevel(level) {
        const levelNum = LOG_LEVELS[level.toUpperCase()];
        if (levelNum !== undefined) {
            currentLogLevel = levelNum;
        }
    }

    // Methods for each level
    const logger = {
        debug: (message, context) => log('debug', message, context),
        info: (message, context) => log('info', message, context),
        warn: (message, context) => log('warn', message, context),
        error: (message, context) => log('error', message, context),
        setLogLevel
    };

    // Export to global scope
    window.logger = logger;

    console.log('logger.js: initialized');
})();

