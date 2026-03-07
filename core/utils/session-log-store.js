/**
 * #JS-AA4DgK6L
 * @description Centralized session logs storage for display in Session Log modal.
 * @skill id:sk-483943
 *
 * PRINCIPLES:
 * - Stores logs in memory (not in localStorage)
 * - Automatically limits log count (max 1000)
 * - Integrates with console.* method interceptor
 * - Integrates with logger.js
 *
 * USAGE:
 * window.sessionLogStore.addLog(level, message, source);
 * window.sessionLogStore.getLogs();
 * window.sessionLogStore.clear();
 *
 * REFERENCES:
 * - Session Log Modal: #JS-VNDFUVK2 (session-log-modal-body.js)
 * - Logger: #JS-Dd4AQf9o (logger.js)
 */

(function() {
    'use strict';

    const MAX_LOGS = 1000; // Max log count in store
    const logs = [];

    // Save original console.log before interceptor activation
    const originalConsoleLog = console.log.bind(console);

    /**
     * Add log to store
     * @param {string} level - Log level (log, warn, error, info, debug)
     * @param {string} message - Log message
     * @param {string} source - Log source (filename/module name)
     */
    function addLog(level, message, source = null) {
        const logEntry = {
            timestamp: Date.now(),
            level: level.toLowerCase(),
            message: String(message),
            source: source || null
        };

        logs.push(logEntry);

        // Limit log count
        if (logs.length > MAX_LOGS) {
            logs.shift(); // Remove oldest log
        }

        // Emit event for UI update
        if (window.eventBus) {
            window.eventBus.emit('session-log', logEntry);
        } else {
        }
    }

    /**
     * Get all logs
     * @returns {Array} Array of logs
     */
    function getLogs() {
        return [...logs]; // Возвращаем копию массива
    }

    /**
     * Clear all logs
     */
    function clear() {
        logs.length = 0;
    }

    /**
     * Get log count
     * @returns {number} Log count
     */
    function getCount() {
        return logs.length;
    }

    // Export to global scope
    window.sessionLogStore = {
        addLog,
        getLogs,
        clear,
        getCount
    };

    // Use saved original console.log to avoid interceptor
    try {
        originalConsoleLog('session-log-store.js: initialized');
    } catch (e) {
        // Ignore errors
    }
})();
