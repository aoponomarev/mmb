/**
 * ================================================================================================
 * I18N CONFIG - Конфигурация интернационализации
 * ================================================================================================
 * Skill: app/skills/ux-principles
 *
 * PURPOSE: SSOT for всех настроек интернационализации (i18n).
 *
 * PRINCIPLES:
 * - Централизованное определение поддерживаемых языков
 * - Единое место for базового языка приложения
 * - Маппинг кодов языков на человеко-читаемые названия
 * - Константы for использования во всех модулях i18n (tooltips, messages)
 *
 * USAGE:
 * window.i18nConfig.BASE_LANGUAGE         // 'ru'
 * window.i18nConfig.SUPPORTED_LANGUAGES   // ['ru', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko']
 * window.i18nConfig.getLanguageLabel('en') // 'English'
 * window.i18nConfig.isLanguageSupported('fr') // true
 *
 * REFERENCES:
 * - Принципы единого источника правды: app/skills/ux-principles
 * - Конфигурация tooltips: core/config/tooltips-config.js
 * - Конфигурация сообщений: core/config/messages-config.js
 */

(function() {
    'use strict';

    /**
     * Базовый язык приложения (язык исходных текстов)
     */
    const BASE_LANGUAGE = 'ru';

    /**
     * Поддерживаемые языки приложения
     * Порядок важен: базовый язык первым, остальные по популярности
     */
    const SUPPORTED_LANGUAGES = [
        'ru', // Русский (базовый)
        'en', // English
        'de', // Deutsch
        'zh'  // 中文
    ];

    /**
     * Маппинг кодов языков на человеко-читаемые названия
     */
    const LANGUAGE_LABELS = {
        'ru': 'Русский',
        'en': 'English',
        'de': 'Deutsch',
        'zh': '中文'
    };

    /**
     * Get человеко-читаемое название языка
     * @param {string} languageCode - код языка ('ru', 'en', etc.)
     * @returns {string} - название языка ('Русский', 'English', etc.)
     */
    function getLanguageLabel(languageCode) {
        return LANGUAGE_LABELS[languageCode] || languageCode;
    }

    /**
     * Проверить, поддерживается ли язык приложением
     * @param {string} languageCode - код языка
     * @returns {boolean}
     */
    function isLanguageSupported(languageCode) {
        return SUPPORTED_LANGUAGES.includes(languageCode);
    }

    /**
     * Нормализовать код языка (если передан неподдерживаемый - вернуть базовый)
     * @param {string} languageCode - код языка
     * @returns {string} - нормализованный код языка
     */
    function normalizeLanguage(languageCode) {
        if (!languageCode || !isLanguageSupported(languageCode)) {
            return BASE_LANGUAGE;
        }
        return languageCode;
    }

    // Экспортируем в глобальный объект window
    window.i18nConfig = {
        BASE_LANGUAGE,
        SUPPORTED_LANGUAGES,
        LANGUAGE_LABELS,
        getLanguageLabel,
        isLanguageSupported,
        normalizeLanguage
    };

    console.log('i18n-config: конфигурация loadedа', {
        baseLanguage: BASE_LANGUAGE,
        supportedLanguages: SUPPORTED_LANGUAGES
    });
})();
