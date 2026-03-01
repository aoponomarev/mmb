/**
 * ================================================================================================
 * MESSAGES STORE - Глобальное хранилище системных сообщений
 * ================================================================================================
 *
 * ЦЕЛЬ: Единое реактивное хранилище для всех системных сообщений приложения.
 * Работает как с Vue (реактивность), так и без него (через события).
 *
 * ПРИНЦИПЫ:
 * - Реактивное хранилище через Vue.reactive (если доступен)
 * - Fallback на события CustomEvent для не-Vue страниц
 * - Приоритезация сообщений (danger > warning > info > success)
 * - Интеграция с eventBus для глобальных событий
 * - Поддержка scope для фильтрации сообщений
 *
 * ИСПОЛЬЗОВАНИЕ:
 * window.AppMessages.push({ text: 'Текст', type: 'info', scope: 'global' })
 * window.AppMessages.dismiss(id)
 * window.AppMessages.clear('global')
 *
 * ССЫЛКИ:
 * - Конфигурация сообщений: core/config/messages-config.js
 * - Событийная система: core/events/event-bus.js
 */

(function() {
    'use strict';

    const hasVueReactive = typeof window.Vue !== 'undefined' && typeof window.Vue.reactive === 'function';

    /**
     * Реактивное состояние хранилища
     * Если Vue доступен - используем Vue.reactive для автоматического обновления UI
     * Если нет - используем обычный объект + события
     */
    const state = hasVueReactive
        ? window.Vue.reactive({ messages: [] })
        : { messages: [] };

    /**
     * Нормализовать тип сообщения к Bootstrap-типам
     * @param {string} type - тип сообщения
     * @returns {string} - нормализованный тип (danger, warning, success, info)
     */
    function normalizeType(type) {
        const t = String(type || 'info').toLowerCase();
        if (t === 'danger' || t === 'error') return 'danger';
        if (t === 'warn' || t === 'warning') return 'warning';
        if (t === 'success') return 'success';
        return 'info';
    }

    /**
     * Нормализовать scope сообщения
     * @param {string} scope - scope сообщения
     * @returns {string} - нормализованный scope
     */
    function normalizeScope(scope) {
        const s = String(scope || 'global').trim();
        return s || 'global';
    }

    /**
     * Получить приоритет по типу сообщения
     * @param {string} type - тип сообщения
     * @returns {number} - приоритет (danger=4, warning=3, info=2, success=1)
     */
    function getPriorityByType(type) {
        const priorities = {
            danger: 4,
            warning: 3,
            info: 2,
            success: 1
        };
        return priorities[type] || 2;
    }

    /**
     * Сгенерировать уникальный ID для сообщения
     * @returns {string} - уникальный ID
     */
    function makeId() {
        return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }

    /**
     * Эмитнуть событие изменения сообщений
     * Используется для не-Vue страниц
     */
    function emitChanged() {
        try {
            document.dispatchEvent(new CustomEvent('app-messages:changed'));
        } catch {
            // Fallback для окружений без CustomEvent
            try {
                document.dispatchEvent(new Event('app-messages:changed'));
            } catch {
                // ignore
            }
        }
    }

    /**
     * Эмитнуть событие через eventBus (если доступен)
     * @param {string} eventName - имя события
     * @param {Object} data - данные события
     */
    function emitEvent(eventName, data) {
        if (window.eventBus && typeof window.eventBus.emit === 'function') {
            window.eventBus.emit(eventName, data);
        }
    }

    /**
     * Сортировать сообщения по приоритету и времени создания
     * Сортировка: priority DESC, затем createdAt DESC (новые выше)
     */
    function sortMessages() {
        state.messages.sort((a, b) => {
            // Сначала по приоритету (выше = важнее)
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // Затем по времени создания (новые выше)
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    /**
     * Добавить или обновить сообщение
     * @param {Object} msg - сообщение { id?, text, type?, scope?, priority?, details?, actions?, sticky? }
     * @returns {Object} - нормализованное сообщение
     */
    function upsert(msg) {
        const id = msg.id || makeId();
        const scope = normalizeScope(msg.scope);
        const type = normalizeType(msg.type);
        const priority = msg.priority !== undefined ? msg.priority : getPriorityByType(type);

        const normalized = {
            id,
            scope,
            type,
            priority,
            text: msg.text != null ? String(msg.text) : '',
            details: msg.details != null ? String(msg.details) : null,
            // actions: массив ключей действий ['retry', 'open-settings']
            actions: Array.isArray(msg.actions) ? msg.actions : [],
            createdAt: msg.createdAt || new Date().toISOString(),
            sticky: Boolean(msg.sticky),
            // key: ключ сообщения из messagesConfig (для последующего перевода)
            key: msg.key || null,
            // params: параметры для плейсхолдеров (для последующего перевода)
            params: msg.params || null
        };

        const idx = state.messages.findIndex(m => m.id === id);
        if (idx >= 0) {
            // Обновление существующего сообщения
            state.messages.splice(idx, 1, normalized);
        } else {
            // Добавление нового сообщения
            state.messages.push(normalized);
        }

        // Сортировка после добавления/обновления
        sortMessages();

        // Эмитим события
        emitChanged();
        emitEvent('message-shown', normalized);

        return normalized;
    }

    /**
     * Удалить сообщение по ID
     * @param {string} id - ID сообщения
     * @returns {boolean} - true если сообщение было удалено
     */
    function dismiss(id) {
        const idx = state.messages.findIndex(m => m.id === id);
        if (idx >= 0) {
            const message = state.messages[idx];
            state.messages.splice(idx, 1);
            emitChanged();
            emitEvent('message-dismissed', { id, message });
            return true;
        }
        return false;
    }

    /**
     * Очистить все сообщения или сообщения в определённом scope
     * @param {string} scope - scope для очистки (если не указан - очищаются все)
     */
    function clear(scope) {
        const s = scope ? normalizeScope(scope) : null;
        if (!s) {
            // Очищаем все сообщения
            state.messages.splice(0, state.messages.length);
            emitChanged();
            emitEvent('messages-cleared', { scope: 'all' });
            return;
        }
        // Очищаем сообщения в конкретном scope
        const remaining = state.messages.filter(m => m.scope !== s);
        state.messages.splice(0, state.messages.length, ...remaining);
        emitChanged();
        emitEvent('messages-cleared', { scope: s });
    }

    /**
     * Получить сообщения по scope
     * @param {string} scope - scope для фильтрации
     * @param {boolean} includeUnscoped - включить сообщения без scope
     * @returns {Array} - массив сообщений
     */
    function getMessages(scope, includeUnscoped = true) {
        const s = normalizeScope(scope);
        return state.messages.filter(m => {
            if (m.scope === s) return true;
            if (includeUnscoped && !m.scope) return true;
            return false;
        });
    }

    // Экспорт в глобальную область
    window.AppMessages = {
        state,
        // push/replace используют один и тот же upsert; различие семантическое
        push(msg) {
            return upsert(msg);
        },
        replace(id, msg) {
            return upsert({ ...msg, id });
        },
        dismiss,
        clear,
        getMessages
    };

    // Алиас для обратной совместимости с кодом, использующим messagesStore
    window.messagesStore = {
        addMessage(msg) {
            return upsert(msg);
        },
        dismiss,
        clear,
        getMessages
    };

    console.log('messages-store.js: инициализирован');
})();
