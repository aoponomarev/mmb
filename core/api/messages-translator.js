/**
 * ================================================================================================
 * MESSAGES TRANSLATOR - System messages translator (v2 - simplified scheme)
 * ================================================================================================
 * Skill: core/skills/config-contracts
 *
 * PURPOSE: Translate system messages via AI providers with caching.
 *
 * @skill-anchor core/skills/api-layer #for-layer-separation
 * @skill-anchor core/skills/data-providers-architecture #for-data-provider-interface
 *
 * CACHE FORMAT (localStorage):
 * Key: 'tr-{lang}-{versionHash}' (e.g. 'tr-en-aBc12XyZ')
 * Value: { "e.net": ["Network error", "Check connection"], ... }
 *
 * USAGE:
 * - On app update new cache key created with new versionHash
 * - Old cache becomes stale automatically
 * - Ensures translations match message structure in new version
 * - Prevents errors when message keys change between versions
 *
 * USAGE:
 * await messagesTranslator.init('en');
 * await messagesTranslator.updateLanguage('es');
 * const translated = messagesTranslator.translate('e.net');
 *
*/

(function() {
    'use strict';

    // Current language
    let currentLanguage = 'ru';

    // Translation cache in memory: { key: [text, details] }
    let translationsCache = null;

    // Init flag
    let isInitialized = false;

    /**
     * Get cache key for language with versioning
     * @param {string} lang - language code
     * @returns {string} - localStorage key with app version
     */
    function getCacheKey(lang) {
        // Translation cache versioning tied to app version
        // On app update (message key changes) new cache created
        const versionHash = window.appConfig?.getVersionHash() || 'v1';
        return `tr-${lang}-${versionHash}`;
    }

    /**
     * Load translation cache from localStorage
     * @param {string} lang - language code
     * @returns {Object|null} - translation cache or null
     */
    function loadCache(lang) {
        if (lang === 'ru') return null; // Russian is base language

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
     * Save translation cache to localStorage
     * @param {string} lang - language code
     * @param {Object} cache - translation cache
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
     * Build prompt for AI
     * @param {string} targetLang - target language
     * @returns {string} - prompt
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
     * Parse AI response
     * @param {string} response - response from AI
     * @returns {Object} - { key: [text, details] }
     */
    function parseResponse(response) {
        const result = {};

        if (!response) return result;

        const lines = response.split('\n').filter(line => line.trim());

        for (const line of lines) {
            // Skip lines without separator
            if (!line.includes('|')) continue;

            const parts = line.split('|');
            if (parts.length < 2) continue;

            const key = parts[0].trim();
            const text = parts[1].trim();
            const details = parts.length > 2 ? parts[2].trim() : null;

            // Verify key exists in config
            if (window.messagesConfig?.MESSAGES[key]) {
                result[key] = details ? [text, details] : [text, null];
            }
        }

        return result;
    }

    /**
     * Translate all messages via AI
     * @param {string} lang - target language
     * @returns {Promise<Object>} - translation cache
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

            // Save to localStorage
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
     * Translate single message
     * @param {string} key - message key
     * @param {Object} params - params for placeholders
     * @returns {Object} - { text, details }
     */
    function translate(key, params = {}) {
        // Normalize params: if null/undefined use empty object
        const safeParams = (params && typeof params === 'object') ? params : {};

        // Normalize key
        const normalizedKey = window.messagesConfig?.normalizeKey(key) || key;

        // For Russian — return original
        if (currentLanguage === 'ru' || !translationsCache) {
            const msg = window.messagesConfig?.get(normalizedKey, safeParams);
            return msg ? { text: msg.text, details: msg.details } : { text: key, details: null };
        }

        // Look in cache
        const cached = translationsCache[normalizedKey];

        if (cached) {
            let text = cached[0];
            let details = cached[1];

            // Replace placeholders
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

        // Fallback to original
        const msg = window.messagesConfig?.get(normalizedKey, safeParams);
        return msg ? { text: msg.text, details: msg.details } : { text: key, details: null };
    }

    /**
     * Initialize translator
     * @param {string} lang - language
     * @returns {Promise<void>}
     */
    async function init(lang) {
        currentLanguage = lang || 'ru';

        if (currentLanguage === 'ru') {
            translationsCache = null;
            isInitialized = true;
            // Emit event for component init
            document.dispatchEvent(new CustomEvent('messages-translator:language-changed', {
                detail: { language: currentLanguage }
            }));
            return;
        }

        // Load cache
        translationsCache = loadCache(currentLanguage);

        isInitialized = true;

        // Эмитим событие for инициализации компонентов
        document.dispatchEvent(new CustomEvent('messages-translator:language-changed', {
            detail: { language: currentLanguage }
        }));
    }

    /**
     * Change language and update all displayed messages
     * @param {string} lang - new language
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

        // Load or create cache
        translationsCache = loadCache(lang);

        if (!translationsCache) {
            // Translate via AI
            translationsCache = await translateAll(lang);
        }

        // Update displayed messages
        await updateDisplayedMessages();

        // Emit event for forced computed recalc in components
        document.dispatchEvent(new CustomEvent('messages-translator:language-changed', {
            detail: { language: lang }
        }));
    }

    /**
     * Update all displayed messages
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
                // Message without key — leave as-is
                window.AppMessages.push(msg);
                continue;
            }

            // Get translation
            const translated = translate(msg.key, msg.params);

            // Recreate message preserving all props
            window.AppMessages.push({
                ...msg,
                text: translated.text,
                details: translated.details
            });
        }

    }

    /**
     * Force translate all messages (reset cache)
     * @param {string} lang - language
     * @returns {Promise<void>}
     */
    async function forceTranslate(lang) {
        if (lang === 'ru') return;

        // Remove cache
        try {
            localStorage.removeItem(getCacheKey(lang));
        } catch (e) {}

        // Translate again
        translationsCache = await translateAll(lang);

        // Update UI
        await updateDisplayedMessages();
    }

    /**
     * Get current language
     * @returns {string}
     */
    function getCurrentLanguage() {
        return currentLanguage;
    }

    /**
     * Check if translator is initialized
     * @returns {boolean}
     */
    function isReady() {
        return isInitialized;
    }

    /**
     * Clear cache for language
     * @param {string} lang - language (if omitted — current)
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
