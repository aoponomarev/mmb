/**
 * ================================================================================================
 * MESSAGES CONFIG - Конфигурация системных сообщений (v2 - упрощённая схема)
 * ================================================================================================
 *
 * ЦЕЛЬ: Единый источник правды для всех системных сообщений в приложении.
 * Исходные тексты на русском языке (базовый язык).
 * Skill: a/skills/app/skills/core-systems/messages-keys-and-config.md
 *
 * ПРИНЦИПЫ:
 * - Короткие ключи: e.net, e.rate, w.proxy, i.switch, s.ok
 * - Короткие типы: d (danger), w (warning), i (info), s (success)
 * - Минимальная структура: { t: text, d: details, type, p: priority }
 * - Переводы через messages-translator.js с упрощённым форматом
 *
 * Исходные тексты на русском языке (базовый язык).
 * - e.* - ошибки (errors)
 * - w.* - предупреждения (warnings)
 * - i.* - информация (info)
 * - s.* - успех (success)
 * - v.* - валидация (validation)
 * - a.* - авторизация (auth)
 *
 * ИСПОЛЬЗОВАНИЕ:
 * window.messagesConfig.get('e.net')
 * window.messagesConfig.get('e.rate', { time: '5 минут' })
 *
 * ССЫЛКИ:
 * - Принципы единого источника правды: a/skills/app/skills/components/components-ssot.md
 * - Модуль перевода: core/api/messages-translator.js
 */

(function() {
    'use strict';

    /**
     * Маппинг коротких типов в Bootstrap классы
     */
    const TYPE_MAP = {
        'd': 'danger',
        'w': 'warning',
        'i': 'info',
        's': 'success'
    };

    /**
     * Маппинг типов в приоритеты
     */
    const PRIORITY_MAP = {
        'd': 4,
        'w': 3,
        'i': 2,
        's': 1
    };

    /**
     * Исходные тексты сообщений на русском языке (базовый язык)
     * Структура: ключ -> { t: text, d?: details, type: 'd'|'w'|'i'|'s' }
     */
    const MESSAGES = {
        // === Ошибки (e.*) ===
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
            t: 'Недостаточно места для сохранения данных',
            type: 'w'
        },
        'e.unknown': {
            t: 'Произошла неизвестная ошибка',
            type: 'd'
        },

        // === Валидация (v.*) ===
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

        // === Health/Состояние (h.*) ===
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
            t: 'Модуль {name} не загружен',
            type: 'd'
        },

        // === Интеграции (i.*) ===
        'i.switch': {
            t: 'Переключение провайдера',
            d: 'Переключено на {provider} из-за недоступности {previous}',
            type: 'i'
        },
        'i.cache': {
            t: 'Кэш промах, загрузка из {source}',
            type: 'i'
        },

        // === Мониторинг (m.*) ===
        'm.slow': {
            t: 'Медленный ответ от {service} ({time}ms)',
            type: 'w'
        },
        'm.quota': {
            t: 'Использовано {percent}% хранилища',
            type: 'w'
        },

        // === Авторизация (a.*) ===
        'a.login': {
            t: 'Ошибка при инициации авторизации',
            type: 'd'
        },
        'a.logout': {
            t: 'Ошибка при выходе из системы',
            type: 'd'
        },

        // === Портфели (p.*) ===
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
            t: 'API ключ для {provider} не настроен',
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
     * Маппинг старых ключей на новые (для обратной совместимости)
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
     * Реестр действий для кнопок в сообщениях
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
     * Нормализовать ключ (поддержка legacy ключей)
     * @param {string} key - ключ сообщения
     * @returns {string} - нормализованный короткий ключ
     */
    function normalizeKey(key) {
        if (!key) return null;
        // Если это legacy ключ — маппим на новый
        if (LEGACY_KEY_MAP[key]) {
            return LEGACY_KEY_MAP[key];
        }
        return key;
    }

    /**
     * Заменить плейсхолдеры в тексте
     * @param {string} text - текст с плейсхолдерами {name}
     * @param {Object} params - параметры для замены
     * @returns {string} - текст с заменёнными плейсхолдерами
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
     * Получить полный тип из короткого
     * @param {string} shortType - короткий тип (d, w, i, s)
     * @returns {string} - полный тип (danger, warning, info, success)
     */
    function getFullType(shortType) {
        return TYPE_MAP[shortType] || 'info';
    }

    /**
     * Получить приоритет из короткого типа
     * @param {string} shortType - короткий тип (d, w, i, s)
     * @returns {number} - приоритет (1-4)
     */
    function getPriority(shortType) {
        return PRIORITY_MAP[shortType] || 2;
    }

    /**
     * Получить сообщение по ключу
     * @param {string} key - ключ сообщения (новый или legacy)
     * @param {Object} params - параметры для замены плейсхолдеров
     * @returns {Object} - { text, details?, type, priority, key }
     */
    function get(key, params = {}) {
        const normalizedKey = normalizeKey(key);

        if (!normalizedKey || !MESSAGES[normalizedKey]) {
            console.warn(`messages-config.get: ключ "${key}" не найден`);
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
     * Получить сообщение по ключу (alias для обратной совместимости)
     * @deprecated Используйте get() вместо getMessage()
     */
    function getMessage(key, params = {}) {
        return get(key, params);
    }

    /**
     * Получить действие по ключу
     * @param {string} key - ключ действия
     * @returns {Object|null} - { label, kind, handler } или null
     */
    function getAction(key) {
        if (!key || !ACTIONS[key]) {
            return null;
        }
        return ACTIONS[key];
    }

    /**
     * Зарегистрировать или обновить действие
     * @param {string} key - ключ действия
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
     * Получить все ключи сообщений
     * @returns {string[]} - массив ключей
     */
    function getAllKeys() {
        return Object.keys(MESSAGES);
    }

    /**
     * Получить все сообщения для перевода
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
     * Инициализировать сообщения (заглушка для обратной совместимости)
     * @param {string} language - язык (игнорируется)
     * @returns {Promise<void>}
     */
    async function init(language) {
        return Promise.resolve();
    }

    // Экспорт в глобальную область
    window.messagesConfig = {
        // Новый API
        get,
        getAllKeys,
        getAllForTranslation,
        getFullType,
        getPriority,
        normalizeKey,

        // Legacy API (обратная совместимость)
        getMessage,
        getAction,
        registerAction,
        init,

        // Константы
        MESSAGES,
        ACTIONS,
        TYPE_MAP,
        PRIORITY_MAP,
        LEGACY_KEY_MAP
    };

})();
