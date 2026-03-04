/**
 * #JS-1Ccp719R
 * @description Single reactive store for app system messages; Vue.reactive or CustomEvent fallback; priority, scope, eventBus.
 * @skill id:sk-483943
 *
 * PRINCIPLES:
 * - Reactive via Vue.reactive (if available); fallback CustomEvent for non-Vue
 * - Priority: danger > warning > info > success; scope for filtering; eventBus integration
 *
 * USAGE:
 * window.AppMessages.push({ text: 'Message text', type: 'info', scope: 'global' });
 * window.AppMessages.dismiss(id);
 * window.AppMessages.clear('global');
 *
 * REFERENCES:
 * - Messages config: core/config/messages-config.js
 * - Event system: core/events/event-bus.js
 */

(function() {
    'use strict';

    const hasVueReactive = typeof window.Vue !== 'undefined' && typeof window.Vue.reactive === 'function';

    /**
     * Reactive store state
     * If Vue available - use Vue.reactive for auto UI update
     * Otherwise - plain object + events
     */
    const state = hasVueReactive
        ? window.Vue.reactive({ messages: [] })
        : { messages: [] };

    /**
     * Normalize message type to Bootstrap types
     * @param {string} type - message type
     * @returns {string} - normalized type (danger, warning, success, info)
     */
    function normalizeType(type) {
        const t = String(type || 'info').toLowerCase();
        if (t === 'danger' || t === 'error') return 'danger';
        if (t === 'warn' || t === 'warning') return 'warning';
        if (t === 'success') return 'success';
        return 'info';
    }

    /**
     * Normalize message scope
     * @param {string} scope - message scope
     * @returns {string} - normalized scope
     */
    function normalizeScope(scope) {
        const s = String(scope || 'global').trim();
        return s || 'global';
    }

    /**
     * Get priority by message type
     * @param {string} type - message type
     * @returns {number} - priority (danger=4, warning=3, info=2, success=1)
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
     * Generate unique ID for message
     * @returns {string} - unique ID
     */
    function makeId() {
        return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }

    /**
     * Emit messages change event
     * Used for non-Vue pages
     */
    function emitChanged() {
        try {
            document.dispatchEvent(new CustomEvent('app-messages:changed'));
        } catch {
            // Fallback for envs without CustomEvent
            try {
                document.dispatchEvent(new Event('app-messages:changed'));
            } catch {
                // ignore
            }
        }
    }

    /**
     * Emit event via eventBus (if available)
     * @param {string} eventName - event name
     * @param {Object} data - event data
     */
    function emitEvent(eventName, data) {
        if (window.eventBus && typeof window.eventBus.emit === 'function') {
            window.eventBus.emit(eventName, data);
        }
    }

    /**
     * Sort messages by priority and creation time
     * Sort: priority DESC, then createdAt DESC (newer first)
     */
    function sortMessages() {
        state.messages.sort((a, b) => {
            // First by priority (higher = more important)
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // Then by creation time (newer first)
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    /**
     * Add or update message
     * @param {Object} msg - message { id?, text, type?, scope?, priority?, details?, actions?, sticky? }
     * @returns {Object} - normalized message
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
            // actions: array of action keys ['retry', 'open-settings']
            actions: Array.isArray(msg.actions) ? msg.actions : [],
            createdAt: msg.createdAt || new Date().toISOString(),
            sticky: Boolean(msg.sticky),
            // key: message key from messagesConfig (for subsequent translation)
            key: msg.key || null,
            // params: params for placeholders (for subsequent translation)
            params: msg.params || null
        };

        const idx = state.messages.findIndex(m => m.id === id);
        if (idx >= 0) {
            // Update existing message
            state.messages.splice(idx, 1, normalized);
        } else {
            // Add new message
            state.messages.push(normalized);
        }

        // Sort after add/update
        sortMessages();

        // Emit events
        emitChanged();
        emitEvent('message-shown', normalized);

        return normalized;
    }

    /**
     * Delete message by ID
     * @param {string} id - message ID
     * @returns {boolean} - true if message was removed
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
     * Clear all messages or messages in given scope
     * @param {string} scope - scope to clear (if omitted - clear all)
     */
    function clear(scope) {
        const s = scope ? normalizeScope(scope) : null;
        if (!s) {
            // Clear all messages
            state.messages.splice(0, state.messages.length);
            emitChanged();
            emitEvent('messages-cleared', { scope: 'all' });
            return;
        }
        // Clear messages in specific scope
        const remaining = state.messages.filter(m => m.scope !== s);
        state.messages.splice(0, state.messages.length, ...remaining);
        emitChanged();
        emitEvent('messages-cleared', { scope: s });
    }

    /**
     * Get messages by scope
     * @param {string} scope - scope for filtering
     * @param {boolean} includeUnscoped - include messages without scope
     * @returns {Array} - messages array
     */
    function getMessages(scope, includeUnscoped = true) {
        const s = normalizeScope(scope);
        return state.messages.filter(m => {
            if (m.scope === s) return true;
            if (includeUnscoped && !m.scope) return true;
            return false;
        });
    }

    // Export to global scope
    window.AppMessages = {
        state,
        // push/replace use same upsert; difference is semantic
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

    // Alias for backward compat with code using messagesStore
    window.messagesStore = {
        addMessage(msg) {
            return upsert(msg);
        },
        dismiss,
        clear,
        getMessages
    };

    console.log('messages-store.js: initialized');
})();
