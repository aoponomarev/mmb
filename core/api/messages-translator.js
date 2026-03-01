/**
 * ================================================================================================
 * MESSAGES TRANSLATOR - Переводчик системных сообщений (v2 - упрощённая схема)
 * ================================================================================================
 * Skill: core/skills/config-contracts
 *
 * PURPOSE: Перевод системных сообщений через AI провайдеры с кэшированием.
 *
 * PRINCIPLES:
 * - Упрощённый формат промпта: KEY|TEXT|DETAILS
 * - Компактное хранение в localStorage: { key: [text, details] }
 * - Lazy translation — перевод только при смене языка
 * - Fallback на русский при ошибках
 * - Версионирование кэша — привязка к версии приложения for автоматической инвалидации
 *
 * ФОРМАТ КЭША (localStorage):
 * Ключ: 'tr-{lang}-{versionHash}' (например: 'tr-en-aBc12XyZ')
 * Значение: { "e.net": ["Network error", "Check connection"], ... }
 *
 * USAGE:
 * - При обновлении приложения создается новый ключ кэша с новым versionHash
 * - Старый кэш автоматически становится неактуальным
 * - Гарантирует соответствие переводов структуре сообщений в новой версии
 * - Исключает ошибки при изменении ключей сообщений между версиями
 *
 * USAGE:
 * await messagesTranslator.init('en');
 * await messagesTranslator.updateLanguage('es');
 * const translated = messagesTranslator.translate('e.net');
 *
 * REFERENCES:
 * - Конфигурация: core/config/messages-config.js
 * - AI провайдеры: core/api/ai-provider-manager.js
 * - i18n конфиг: core/config/i18n-config.js
 * - Версионирование: core/config/app-config.js (getVersionHash)
 */

(function() {
    'use strict';

    // Текущий язык
    let currentLanguage = 'ru';

    // Кэш переводов в памяти: { key: [text, details] }
    let translationsCache = null;

    // Флаг инициализации
    let isInitialized = false;

    /**
     * Get ключ кэша for языка с версионированием
     * @param {string} lang - код языка
     * @returns {string} - ключ localStorage с версией приложения
     */
    function getCacheKey(lang) {
        // Версионирование кэша переводов for привязки к версии приложения
        // При обновлении приложения (изменении ключей сообщений) создается новый кэш
        const versionHash = window.appConfig?.getVersionHash() || 'v1';
        return `tr-${lang}-${versionHash}`;
    }

    /**
     * Загрузить кэш переводов из localStorage
     * @param {string} lang - код языка
     * @returns {Object|null} - кэш переводов или null
     */
    function loadCache(lang) {
        if (lang === 'ru') return null; // Русский — базовый язык

        try {
            const key = getCacheKey(lang);
            const data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('messages-translator: ошибка загрузки кэша', error);
        }
        return null;
    }

    /**
     * Сохранить кэш переводов в localStorage
     * @param {string} lang - код языка
     * @param {Object} cache - кэш переводов
     */
    function saveCache(lang, cache) {
        if (lang === 'ru') return;

        try {
            const key = getCacheKey(lang);
            localStorage.setItem(key, JSON.stringify(cache));
        } catch (error) {
            console.warn('messages-translator: ошибка сохранения кэша', error);
        }
    }

    /**
     * Сформировать промпт for AI
     * @param {string} targetLang - целевой язык
     * @returns {string} - промпт
     */
    function buildPrompt(targetLang) {
        if (!window.messagesConfig) {
            console.error('messages-translator: messagesConfig not loaded');
            return '';
        }

        const messages = window.messagesConfig.getAllForTranslation();
        const langLabel = window.i18nConfig?.getLanguageLabel(targetLang) || targetLang;

        let prompt = `Translate Russian system messages to ${langLabel}.\n`;
        prompt += `Format: KEY|TEXT|DETAILS (if no details, omit |DETAILS)\n`;
        prompt += `Keep placeholders like {name} unchanged.\n\n`;

        for (const [key, msg] of Object.entries(messages)) {
            if (msg.d) {
                prompt += `${key}|${msg.t}|${msg.d}\n`;
            } else {
                prompt += `${key}|${msg.t}\n`;
            }
        }

        prompt += `\nReply in same format, only translated text after |`;

        return prompt;
    }

    /**
     * Парсить ответ AI
     * @param {string} response - ответ от AI
     * @returns {Object} - { key: [text, details] }
     */
    function parseResponse(response) {
        const result = {};

        if (!response) return result;

        const lines = response.split('\n').filter(line => line.trim());

        for (const line of lines) {
            // Пропускаем строки без разделителя
            if (!line.includes('|')) continue;

            const parts = line.split('|');
            if (parts.length < 2) continue;

            const key = parts[0].trim();
            const text = parts[1].trim();
            const details = parts.length > 2 ? parts[2].trim() : null;

            // Проверяем, что ключ существует в конфиге
            if (window.messagesConfig?.MESSAGES[key]) {
                result[key] = details ? [text, details] : [text, null];
            }
        }

        return result;
    }

    /**
     * Выполнить перевод всех сообщений через AI
     * @param {string} lang - целевой язык
     * @returns {Promise<Object>} - кэш переводов
     */
    async function translateAll(lang) {
        if (lang === 'ru') return null;

        if (!window.aiProviderManager) {
            console.warn('messages-translator: aiProviderManager not loaded');
            return null;
        }

        try {
            const prompt = buildPrompt(lang);
            if (!prompt) return null;

            const response = await window.aiProviderManager.sendRequest([
                { role: 'user', content: prompt }
            ]);

            if (!response) {
                console.warn('messages-translator: пустой ответ от AI');
                return null;
            }

            const cache = parseResponse(response);
            const translatedCount = Object.keys(cache).length;

            if (translatedCount === 0) {
                console.warn('messages-translator: failed to распарсить переводы из ответа AI');
                return null;
            }

            // Сохраняем в localStorage
            if (translatedCount > 0) {
                saveCache(lang, cache);
            }

            return cache;
        } catch (error) {
            console.error('messages-translator: ошибка перевода', error);
            return null;
        }
    }

    /**
     * Перевести одно сообщение
     * @param {string} key - ключ сообщения
     * @param {Object} params - параметры for плейсхолдеров
     * @returns {Object} - { text, details }
     */
    function translate(key, params = {}) {
        // Нормализуем params: если null/undefined, используем пустой объект
        const safeParams = (params && typeof params === 'object') ? params : {};

        // Нормализуем ключ
        const normalizedKey = window.messagesConfig?.normalizeKey(key) || key;

        // Для русского — возвращаем оригинал
        if (currentLanguage === 'ru' || !translationsCache) {
            const msg = window.messagesConfig?.get(normalizedKey, safeParams);
            return msg ? { text: msg.text, details: msg.details } : { text: key, details: null };
        }

        // Ищем в кэше
        const cached = translationsCache[normalizedKey];

        if (cached) {
            let text = cached[0];
            let details = cached[1];

            // Заменяем плейсхолдеры
            if (safeParams && typeof safeParams === 'object' && Object.keys(safeParams).length > 0) {
                for (const [k, v] of Object.entries(safeParams)) {
                    const regex = new RegExp(`\\{${k}\\}`, 'g');
                    text = text.replace(regex, v);
                    if (details) {
                        details = details.replace(regex, v);
                    }
                }
            }

            return { text, details };
        }

        // Fallback на оригинал
        const msg = window.messagesConfig?.get(normalizedKey, safeParams);
        return msg ? { text: msg.text, details: msg.details } : { text: key, details: null };
    }

    /**
     * Инициализировать переводчик
     * @param {string} lang - язык
     * @returns {Promise<void>}
     */
    async function init(lang) {
        currentLanguage = lang || 'ru';

        if (currentLanguage === 'ru') {
            translationsCache = null;
            isInitialized = true;
            // Эмитим событие for инициализации компонентов
            document.dispatchEvent(new CustomEvent('messages-translator:language-changed', {
                detail: { language: currentLanguage }
            }));
            return;
        }

        // Загружаем кэш
        translationsCache = loadCache(currentLanguage);

        isInitialized = true;

        // Эмитим событие for инициализации компонентов
        document.dispatchEvent(new CustomEvent('messages-translator:language-changed', {
            detail: { language: currentLanguage }
        }));
    }

    /**
     * Сменить язык и обновить все отображаемые сообщения
     * @param {string} lang - новый язык
     * @returns {Promise<void>}
     */
    async function updateLanguage(lang) {
        if (lang === currentLanguage && isInitialized) {
            return;
        }

        currentLanguage = lang;

        if (lang === 'ru') {
            translationsCache = null;
            await updateDisplayedMessages();
            return;
        }

        // Загружаем или создаём кэш
        translationsCache = loadCache(lang);

        if (!translationsCache) {
            // Переводим через AI
            translationsCache = await translateAll(lang);
        }

        // Обновляем отображаемые сообщения
        await updateDisplayedMessages();

        // Эмитим событие for принудительного пересчета computed в компонентах
        document.dispatchEvent(new CustomEvent('messages-translator:language-changed', {
            detail: { language: lang }
        }));
    }

    /**
     * Update все отображаемые сообщения
     * @returns {Promise<void>}
     */
    async function updateDisplayedMessages() {
        if (!window.AppMessages?.state?.messages) {
            return;
        }

        const messages = [...window.AppMessages.state.messages];

        if (messages.length === 0) {
            return;
        }

        // Очищаем и пересоздаём
        window.AppMessages.clear();

        for (const msg of messages) {
            if (!msg.key) {
                // Сообщение без ключа — оставляем как есть
                window.AppMessages.push(msg);
                continue;
            }

            // Получаем перевод
            const translated = translate(msg.key, msg.params);

            // Пересоздаём сообщение с сохранением всех свойств
            window.AppMessages.push({
                ...msg,
                text: translated.text,
                details: translated.details
            });
        }

    }

    /**
     * Принудительно перевести все сообщения (сбросить кэш)
     * @param {string} lang - язык
     * @returns {Promise<void>}
     */
    async function forceTranslate(lang) {
        if (lang === 'ru') return;

        // Удаляем кэш
        try {
            localStorage.removeItem(getCacheKey(lang));
        } catch (e) {}

        // Переводим заново
        translationsCache = await translateAll(lang);

        // Обновляем UI
        await updateDisplayedMessages();
    }

    /**
     * Get текущий язык
     * @returns {string}
     */
    function getCurrentLanguage() {
        return currentLanguage;
    }

    /**
     * Проверить, initialized ли переводчик
     * @returns {boolean}
     */
    function isReady() {
        return isInitialized;
    }

    /**
     * Очистить кэш for языка
     * @param {string} lang - язык (если не указан — текущий)
     */
    function clearCache(lang) {
        const targetLang = lang || currentLanguage;
        try {
            localStorage.removeItem(getCacheKey(targetLang));
            if (targetLang === currentLanguage) {
                translationsCache = null;
            }
        } catch (e) {}
    }

    // Export to global scope
    window.messagesTranslator = {
        init,
        translate,
        updateLanguage,
        updateDisplayedMessages,
        forceTranslate,
        getCurrentLanguage,
        isReady,
        clearCache
    };

})();
