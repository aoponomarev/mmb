/**
 * #JS-H232EpDC
 * @description Intercepts console.* calls and writes to sessionLogStore; preserves original behavior.
 * @skill id:sk-483943
 *
 * PRINCIPLES:
 * - Saves original console.* methods
 * - Intercepts calls and writes to sessionLogStore
 * - Invokes original methods to preserve standard behavior
 * - Extracts source from stack trace (when possible)
 *
 * USAGE:
 * Automatically activated on module load.
 * To deactivate: window.consoleInterceptor.disable()
 *
 * REFERENCES:
 * - Session Log Store: core/utils/session-log-store.js
 * - Logger: core/logging/logger.js
 */

(function() {
    'use strict';

    // Save original console methods
    const originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console)
    };

    let isEnabled = false; // Initially false, activated via enable()
    let suppressBrowserConsole = localStorage.getItem('suppressBrowserConsole') === 'true'; // Load state from localStorage

    /**
     * Extract source from stack trace
     * @param {Error} error - Error object for stack trace extraction
     * @returns {string|null} Filename or null
     */
    function extractSource(error) {
        if (!error || !error.stack) {
            return null;
        }

        try {
            const stack = error.stack.split('\n');
            // Skip first line (the call itself) and find actual source
            for (let i = 1; i < Math.min(stack.length, 5); i++) {
                const line = stack[i];
                // Look for pattern: "at functionName (filename:line:column)" or "at filename:line:column"
                const match = line.match(/at\s+(?:\S+\s+)?\(?([^:]+):(\d+):(\d+)\)?/);
                if (match) {
                    const filename = match[1];
                    // Extract filename without path
                    const filenameMatch = filename.match(/([^/\\]+)$/);
                    if (filenameMatch) {
                        return filenameMatch[1];
                    }
                    return filename;
                }
            }
        } catch (e) {
            // Ignore stack trace parsing errors
        }

        return null;
    }

    /**
     * Create interceptor for console method
     * @param {string} level - Log level
     * @param {Function} originalMethod - Original console method
     * @returns {Function} Interceptor function
     */
    function createInterceptor(level, originalMethod) {
        return function(...args) {
            // Call original method only if browser console output is not disabled
            if (!suppressBrowserConsole || level === 'error' || level === 'warn') {
                originalMethod.apply(console, args);
            }

            if (!isEnabled || !window.sessionLogStore) {
                return;
            }

            try {
                // Format message from arguments
                let message = '';
                if (args.length === 0) {
                    message = '';
                } else if (args.length === 1) {
                    if (typeof args[0] === 'string') {
                        message = args[0];
                    } else {
                        message = JSON.stringify(args[0], null, 2);
                    }
                } else {
                    message = args.map(arg => {
                        if (typeof arg === 'string') {
                            return arg;
                        } else if (typeof arg === 'object') {
                            try {
                                return JSON.stringify(arg, null, 2);
                            } catch (e) {
                                return String(arg);
                            }
                        } else {
                            return String(arg);
                        }
                    }).join(' ');
                }

                // Skip logs from interceptor and session-log-store to avoid infinite loop
                if (typeof message === 'string') {
                    if (message.includes('console-interceptor.js') ||
                        message.includes('session-log-store.js') ||
                        message.includes('console-interceptor:') ||
                        message.includes('session-log-store:')) {
                        return;
                    }
                }

                // Extract source from stack trace
                let source = null;
                try {
                    const error = new Error();
                    source = extractSource(error);
                    // Skip logs from interceptor itself
                    if (source && (source.includes('console-interceptor') || source.includes('session-log-store'))) {
                        return;
                    }
                } catch (e) {
                    // Ignore source extraction errors
                }

                // Write to sessionLogStore
                window.sessionLogStore.addLog(level, message, source);
            } catch (e) {
                // Ignore sessionLogStore write errors
                // Do not log interceptor errors to avoid infinite loop
            }
        };
    }

    /**
     * Enable interceptor
     */
    function enable() {
        if (isEnabled) return;

        console.log = createInterceptor('log', originalConsole.log);
        console.warn = createInterceptor('warn', originalConsole.warn);
        console.error = createInterceptor('error', originalConsole.error);
        console.info = createInterceptor('info', originalConsole.info);
        console.debug = createInterceptor('debug', originalConsole.debug);

        isEnabled = true;
    }

    /**
     * Disable interceptor
     */
    function disable() {
        if (!isEnabled) return;

        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.info = originalConsole.info;
        console.debug = originalConsole.debug;

        isEnabled = false;
    }

    // Enable interceptor automatically on load
    enable();

    /**
     * Set browser console output suppression mode
     * @param {boolean} suppress - true to disable browser console output
     */
    function setSuppressBrowserConsole(suppress) {
        suppressBrowserConsole = suppress === true;
        localStorage.setItem('suppressBrowserConsole', suppressBrowserConsole);
    }

    // Export to global scope
    window.consoleInterceptor = {
        enable,
        disable,
        isEnabled: () => isEnabled,
        setSuppressBrowserConsole,
        getSuppressBrowserConsole: () => suppressBrowserConsole
    };

    // Use original console.log for init to avoid interceptor
    originalConsole.log('console-interceptor.js: initialized');
})();
