/**
 * ================================================================================================
 * SESSION LOG STORE - Хранилище логов сессии
 * ================================================================================================
 *
 * ЦЕЛЬ: Централизованное хранение логов сессии для отображения в модальном окне Session Log.
 * Skill: a/skills/app/skills/architecture/architecture-core-stack.md
 *
 * ПРИНЦИПЫ:
 * - Хранит логи в памяти (не в localStorage)
 * - Автоматически ограничивает количество логов (максимум 1000)
 * - Интегрируется с перехватчиком console.* методов
 * - Интегрируется с logger.js
 *
 * ИСПОЛЬЗОВАНИЕ:
 * window.sessionLogStore.addLog(level, message, source);
 * window.sessionLogStore.getLogs();
 * window.sessionLogStore.clear();
 *
 * ССЫЛКИ:
 * - Session Log Modal: app/components/session-log-modal-body.js
 * - Logger: core/logging/logger.js
 */

(function() {
    'use strict';

    const MAX_LOGS = 1000; // Максимальное количество логов в хранилище
    const logs = [];

    // Сохраняем оригинальный console.log до активации перехватчика
    const originalConsoleLog = console.log.bind(console);

    /**
     * Добавить лог в хранилище
     * @param {string} level - Уровень лога (log, warn, error, info, debug)
     * @param {string} message - Сообщение лога
     * @param {string} source - Источник лога (имя файла/модуля)
     */
    function addLog(level, message, source = null) {
        const logEntry = {
            timestamp: Date.now(),
            level: level.toLowerCase(),
            message: String(message),
            source: source || null
        };

        logs.push(logEntry);

        // Ограничиваем количество логов
        if (logs.length > MAX_LOGS) {
            logs.shift(); // Удаляем самый старый лог
        }

        // Эмитим событие для обновления UI
        if (window.eventBus) {
            window.eventBus.emit('session-log', logEntry);
        } else {
        }
    }

    /**
     * Получить все логи
     * @returns {Array} Массив логов
     */
    function getLogs() {
        return [...logs]; // Возвращаем копию массива
    }

    /**
     * Очистить все логи
     */
    function clear() {
        logs.length = 0;
    }

    /**
     * Получить количество логов
     * @returns {number} Количество логов
     */
    function getCount() {
        return logs.length;
    }

    // Экспорт в глобальную область
    window.sessionLogStore = {
        addLog,
        getLogs,
        clear,
        getCount
    };

    // Используем сохраненный оригинальный console.log, чтобы не попасть в перехватчик
    try {
        originalConsoleLog('session-log-store.js: инициализирован');
    } catch (e) {
        // Игнорируем ошибки
    }
})();
