/**
 * ================================================================================================
 * CONSOLE INTERCEPTOR - Перехватчик console.* методов
 * ================================================================================================
 *
 * PURPOSE: Перехватывать все вызовы console.log/warn/error/info/debug и записывать их в sessionLogStore.
 * Skill: is/skills/arch-foundation
 *
 * PRINCIPLES:
 * - Сохраняет оригинальные методы console.*
 * - Перехватывает вызовы и записывает в sessionLogStore
 * - Вызывает оригинальные методы for сохранения стандартного поведения
 * - Извлекает источник из stack trace (если возможно)
 *
 * USAGE:
 * Автоматически активируется при загрузке модуля.
 * Для деактивации: window.consoleInterceptor.disable()
 *
 * REFERENCES:
 * - Session Log Store: core/utils/session-log-store.js
 * - Logger: core/logging/logger.js
 */

(function() {
    'use strict';

    // Сохраняем оригинальные методы console
    const originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console),
        debug: console.debug.bind(console)
    };

    let isEnabled = false; // ИСПРАВЛЕНО: изначально false, активируется через enable()
    let suppressBrowserConsole = localStorage.getItem('suppressBrowserConsole') === 'true'; // Загружаем состояние из localStorage

    /**
     * Извлечь источник из stack trace
     * @param {Error} error - Объект Error for получения stack trace
     * @returns {string|null} Имя файла или null
     */
    function extractSource(error) {
        if (!error || !error.stack) {
            return null;
        }

        try {
            const stack = error.stack.split('\n');
            // Пропускаем первую строку (сам вызов) и ищем реальный источник
            for (let i = 1; i < Math.min(stack.length, 5); i++) {
                const line = stack[i];
                // Ищем паттерн: "at functionName (filename:line:column)" или "at filename:line:column"
                const match = line.match(/at\s+(?:\S+\s+)?\(?([^:]+):(\d+):(\d+)\)?/);
                if (match) {
                    const filename = match[1];
                    // Извлекаем только имя файла без пути
                    const filenameMatch = filename.match(/([^/\\]+)$/);
                    if (filenameMatch) {
                        return filenameMatch[1];
                    }
                    return filename;
                }
            }
        } catch (e) {
            // Игнорируем ошибки парсинга stack trace
        }

        return null;
    }

    /**
     * Создать перехватчик for console метода
     * @param {string} level - Уровень лога
     * @param {Function} originalMethod - Оригинальный метод console
     * @returns {Function} Перехватывающая функция
     */
    function createInterceptor(level, originalMethod) {
        return function(...args) {
            // Вызываем оригинальный метод только если не отключен вывод в браузерную консоль
            if (!suppressBrowserConsole || level === 'error' || level === 'warn') {
                originalMethod.apply(console, args);
            }

            if (!isEnabled || !window.sessionLogStore) {
                return;
            }

            try {
                // Форматируем сообщение из аргументов
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

                // Пропускаем логи самого перехватчика и session-log-store, чтобы избежать бесконечного цикла
                if (typeof message === 'string') {
                    if (message.includes('console-interceptor.js') ||
                        message.includes('session-log-store.js') ||
                        message.includes('console-interceptor:') ||
                        message.includes('session-log-store:')) {
                        return;
                    }
                }

                // Извлекаем источник из stack trace
                let source = null;
                try {
                    const error = new Error();
                    source = extractSource(error);
                    // Пропускаем логи самого перехватчика
                    if (source && (source.includes('console-interceptor') || source.includes('session-log-store'))) {
                        return;
                    }
                } catch (e) {
                    // Игнорируем ошибки извлечения источника
                }

                // Записываем в sessionLogStore
                window.sessionLogStore.addLog(level, message, source);
            } catch (e) {
                // Игнорируем ошибки записи в sessionLogStore
                // Не логируем ошибки перехватчика, чтобы избежать бесконечного цикла
            }
        };
    }

    /**
     * Включить перехватчик
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
     * Выключить перехватчик
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

    // Автоматически включаем перехватчик при загрузке
    enable();

    /**
     * Set режим подавления вывода в браузерную консоль
     * @param {boolean} suppress - true for отключения вывода в консоль браузера
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

    // Используем оригинальный console.log for инициализации, чтобы не попасть в перехватчик
    originalConsole.log('console-interceptor.js: initialized');
})();
