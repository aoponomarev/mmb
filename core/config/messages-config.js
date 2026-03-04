/**
 * ================================================================================================
 * MESSAGES CONFIG - System messages configuration (v2 - simplified schema)
 * ================================================================================================
 *
 * PURPOSE: SSOT for all system messages in the application.
 * Source texts in Russian (base language).
 * Skill: core/skills/config-contracts
 *
 * PRINCIPLES:
 * - Short keys: e.net, e.rate, w.proxy, i.switch, s.ok
 * - Short types: d (danger), w (warning), i (info), s (success)
 * - Minimal structure: { t: text, d: details, type, p: priority }
 * - Translations via messages-translator.js with simplified format
 *
 * Source texts in Russian (base language).
 * - e.* - errors
 * - w.* - warnings
 * - i.* - info
 * - s.* - success
 * - v.* - validation
 * - a.* - auth
 *
 * USAGE:
 * window.messagesConfig.get('e.net')
 * window.messagesConfig.get('e.rate', { time: '5 minutes' })
 *
 * REFERENCES:
 * - Single source of truth principles: app/skills/ux-principles
 * - Translation module: core/api/messages-translator.js
 */

// @skill-anchor core/skills/messages-architecture #for-short-message-keys #for-short-message-types
(function() {
    'use strict';

    /**
     * Mapping of short types to Bootstrap classes
     */
    const TYPE_MAP = {
        'd': 'danger',
        'w': 'warning',
        'i': 'info',
        's': 'success'
    };

    /**
     * Mapping of types to priorities
     */
    const PRIORITY_MAP = {
        'd': 4,
        'w': 3,
        'i': 2,
        's': 1
    };

    /**
     * Source message texts in Russian (base language)
     * Structure: key -> { t: text, d?: details, type: 'd'|'w'|'i'|'s' }
     */
    const MESSAGES = {
        // === Errors (e.*) ===
        'e.net': {
            t: 'Ошибка сети',
            d: 'Проверьте подключение к интернету',
            type: 'd'
        },
        'e.time': {
            t: 'Превышено время ожидания',
            d: 'Сервер не ответил вовремя',
            type: 'w'
        },
        'e.rate': {
            t: 'Превышен лимит запросов',
            d: 'Следующий запрос будет доступен через {time}',
            type: 'w'
        },
        'e.load': {
            t: 'Ошибка загрузки данных',
            d: 'Не удалось получить данные от сервера',
            type: 'd'
        },
        'e.valid': {
            t: 'Данные не прошли проверку',
            type: 'w'
        },
        'e.schema': {
            t: 'Неверная структура данных',
            type: 'd'
        },
        'e.calc': {
            t: 'Ошибка при расчёте',
            type: 'd'
        },
        'e.math': {
            t: 'Ошибка в математических вычислениях',
            type: 'd'
        },
        'e.save': {
            t: 'Ошибка при сохранении данных',
            type: 'd'
        },
        'e.quota': {
            t: 'Недостаточно места for сохранения данных',
            type: 'w'
        },
        'e.unknown': {
            t: 'Произошла неизвестная ошибка',
            type: 'd'
        },

        // === Validation (v.*) ===
        'v.wsum': {
            t: 'Сумма весов портфеля должна быть равна 1',
            type: 'w'
        },
        'v.wrange': {
            t: 'Вес актива должен быть от 0 до 1',
            type: 'w'
        },
        'v.assets': {
            t: 'Портфель должен содержать хотя бы один актив',
            type: 'w'
        },
        'v.corr': {
            t: 'Корреляция должна быть от -1 до 1',
            type: 'w'
        },
        'v.nan': {
            t: 'Метрика содержит некорректное значение',
            type: 'd'
        },
        'v.mono': {
            t: 'Нарушена монотонность временного ряда',
            type: 'w'
        },
        'v.empty': {
            t: 'Временной ряд должен содержать хотя бы одну точку',
            type: 'w'
        },

        // === Health/Status (h.*) ===
        'h.proxy.down': {
            t: 'Прокси недоступен',
            d: 'Используется резервный',
            type: 'w'
        },
        'h.proxy.up': {
            t: 'Прокси восстановлен',
            d: 'Все системы работают нормально',
            type: 's'
        },
        'h.mod': {
            t: 'Модуль {name} not loaded',
            type: 'd'
        },

        // === Integrations (i.*) ===
        'i.switch': {
            t: 'Переключение провайдера',
            d: 'Переключено на {provider} из-за недоступности {previous}',
            type: 'i'
        },
        'i.cache': {
            t: 'Кэш промах, загрузка из {source}',
            type: 'i'
        },

        // === Monitoring (m.*) ===
        'm.slow': {
            t: 'Медленный ответ от {service} ({time}ms)',
            type: 'w'
        },
        'm.quota': {
            t: 'Использовано {percent}% хранилища',
            type: 'w'
        },

        // === Auth (a.*) ===
        'a.login': {
            t: 'Ошибка при инициации авторизации',
            type: 'd'
        },
        'a.logout': {
            t: 'Ошибка при logoutе из системы',
            type: 'd'
        },

        // === Portfolios (p.*) ===
        'p.load': {
            t: 'Ошибка при загрузке портфелей',
            type: 'd'
        },
        'p.save': {
            t: 'Ошибка при сохранении портфеля',
            type: 'd'
        },
        'p.del': {
            t: 'Ошибка при удалении портфеля',
            type: 'd'
        },

        // === AI API (ai.*) ===
        'ai.key': {
            t: 'API ключ for {provider} not configured',
            d: 'Откройте настройки "AI API"',
            type: 'w'
        },

        // === Rate Limiting (r.*) ===
        'r.limit': {
            t: 'Превышен лимит запросов',
            d: 'Повтор через {time}',
            type: 'w'
        },
        'r.timeout': {
            t: 'Таймаут увеличен до {time}ms из-за ошибок API',
            type: 'i'
        }
    };

    /**
     * Mapping of legacy keys to new keys (for backward compatibility)
     */
    const LEGACY_KEY_MAP = {
        'error.api.network': 'e.net',
        'error.api.timeout': 'e.time',
        'error.api.rate-limit': 'e.rate',
        'error.api.error': 'e.load',
        'error.validation.error': 'e.valid',
        'error.validation.schema': 'e.schema',
        'error.calculation.error': 'e.calc',
        'error.calculation.math': 'e.math',
        'error.storage.error': 'e.save',
        'error.storage.quota': 'e.quota',
        'error.unknown': 'e.unknown',
        'validation.portfolio.weights.sum': 'v.wsum',
        'validation.portfolio.weights.range': 'v.wrange',
        'validation.portfolio.assets.required': 'v.assets',
        'validation.correlation.range': 'v.corr',
        'validation.metric.nan': 'v.nan',
        'validation.timeseries.monotonic': 'v.mono',
        'validation.timeseries.empty': 'v.empty',
        'rate-limit.exceeded': 'r.limit',
        'rate-limit.timeout.increased': 'r.timeout',
        'health.proxy.unavailable': 'h.proxy.down',
        'health.proxy.restored': 'h.proxy.up',
        'health.module.missing': 'h.mod',
        'integration.provider.switched': 'i.switch',
        'integration.cache.miss': 'i.cache',
        'monitoring.performance.slow': 'm.slow',
        'monitoring.storage.quota.warning': 'm.quota',
        'auth.login.error': 'a.login',
        'auth.logout.error': 'a.logout',
        'portfolios.load.error': 'p.load',
        'portfolios.save.error': 'p.save',
        'portfolios.delete.error': 'p.del',
        'ai.api-key.missing': 'ai.key'
    };

    /**
     * Registry of actions for message buttons
     */
    const ACTIONS = {
        'retry': {
            label: 'Повторить',
            kind: 'primary',
            handler: null
        },
        'settings': {
            label: 'Открыть настройки',
            kind: 'outline',
            handler: () => {
                const vm = window.appRoot?._instance || window.appRoot;
                if (vm && typeof vm.openTimezoneModal === 'function') {
                    vm.openTimezoneModal();
                }
            }
        },
        'ai-settings': {
            label: 'Настройки AI API',
            kind: 'primary',
            handler: () => {
                const vm = window.appRoot?._instance || window.appRoot;
                if (vm && typeof vm.openAiApiModal === 'function') {
                    vm.openAiApiModal();
                }
            }
        },
        'dismiss': {
            label: 'Закрыть',
            kind: 'outline',
            handler: null
        }
    };

    /**
     * Normalize key (legacy key support)
     * @param {string} key - message key
     * @returns {string} - normalized short key
     */
    function normalizeKey(key) {
        if (!key) return null;
        // If legacy key — map to new
        if (LEGACY_KEY_MAP[key]) {
            return LEGACY_KEY_MAP[key];
        }
        return key;
    }

    /**
     * Replace placeholders in text
     * @param {string} text - text with placeholders {name}
     * @param {Object} params - parameters for replacement
     * @returns {string} - text with replaced placeholders
     */
    function replacePlaceholders(text, params = {}) {
        if (!text || !params) return text;
        let result = text;
        for (const [key, value] of Object.entries(params)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
    }

    /**
     * Get full type from short type
     * @param {string} shortType - short type (d, w, i, s)
     * @returns {string} - full type (danger, warning, info, success)
     */
    function getFullType(shortType) {
        return TYPE_MAP[shortType] || 'info';
    }

    /**
     * Get priority from short type
     * @param {string} shortType - short type (d, w, i, s)
     * @returns {number} - priority (1-4)
     */
    function getPriority(shortType) {
        return PRIORITY_MAP[shortType] || 2;
    }

    /**
     * Get message by key
     * @param {string} key - message key (new or legacy)
     * @param {Object} params - parameters for placeholder replacement
     * @returns {Object} - { text, details?, type, priority, key }
     */
    function get(key, params = {}) {
        const normalizedKey = normalizeKey(key);

        if (!normalizedKey || !MESSAGES[normalizedKey]) {
            console.warn(`messages-config.get: key "${key}" not found`);
            return {
                text: key || '',
                details: null,
                type: 'info',
                priority: 2,
                key: normalizedKey || key
            };
        }

        const msg = MESSAGES[normalizedKey];
        const text = replacePlaceholders(msg.t, params);
        const details = msg.d ? replacePlaceholders(msg.d, params) : null;

        return {
            text,
            details,
            type: getFullType(msg.type),
            priority: getPriority(msg.type),
            key: normalizedKey
        };
    }

    /**
     * Get message by key (alias for backward compatibility)
     * @deprecated Use get() instead of getMessage()
     */
    function getMessage(key, params = {}) {
        return get(key, params);
    }

    /**
     * Get action by key
     * @param {string} key - action key
     * @returns {Object|null} - { label, kind, handler } or null
     */
    function getAction(key) {
        if (!key || !ACTIONS[key]) {
            return null;
        }
        return ACTIONS[key];
    }

    /**
     * Register or update action
     * @param {string} key - action key
     * @param {Object} action - { label, kind, handler }
     */
    function registerAction(key, action) {
        if (!key || !action) return;
        ACTIONS[key] = {
            label: action.label || key,
            kind: action.kind || 'outline',
            handler: action.handler || null
        };
    }

    /**
     * Get all message keys
     * @returns {string[]} - array of keys
     */
    function getAllKeys() {
        return Object.keys(MESSAGES);
    }

    /**
     * Get all messages for translation
     * @returns {Object} - { key: { t, d } }
     */
    function getAllForTranslation() {
        const result = {};
        for (const [key, msg] of Object.entries(MESSAGES)) {
            result[key] = {
                t: msg.t,
                d: msg.d || null
            };
        }
        return result;
    }

    /**
     * Initialize messages (stub for backward compatibility)
     * @param {string} language - language (ignored)
     * @returns {Promise<void>}
     */
    async function init(language) {
        return Promise.resolve();
    }

    // Export to global scope
    window.messagesConfig = {
        // New API
        get,
        getAllKeys,
        getAllForTranslation,
        getFullType,
        getPriority,
        normalizeKey,

        // Legacy API (backward compatibility)
        getMessage,
        getAction,
        registerAction,
        init,

        // Constants
        MESSAGES,
        ACTIONS,
        TYPE_MAP,
        PRIORITY_MAP,
        LEGACY_KEY_MAP
    };

})();
