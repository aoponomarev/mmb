/**
 * ================================================================================================
 * I18N CONFIG - Конфигурация интернационализации
 * ================================================================================================
 * Skill: a/skills/app/skills/components/components-localization.md
 *
 * ЦЕЛЬ: Единый источник правды для всех настроек интернационализации (i18n).
 *
 * ПРИНЦИПЫ:
 * - Централизованное определение поддерживаемых языков
 * - Единое место для базового языка приложения
 * - Маппинг кодов языков на человеко-читаемые названия
 * - Константы для использования во всех модулях i18n (tooltips, messages)
 *
 * ИСПОЛЬЗОВАНИЕ:
 * window.i18nConfig.BASE_LANGUAGE         // 'ru'
 * window.i18nConfig.SUPPORTED_LANGUAGES   // ['ru', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko']
 * window.i18nConfig.getLanguageLabel('en') // 'English'
 * window.i18nConfig.isLanguageSupported('fr') // true
 *
 * ССЫЛКИ:
 * - Принципы единого источника правды: a/skills/app/skills/components/components-ssot.md
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
     * Получить человеко-читаемое название языка
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

    console.log('i18n-config: конфигурация загружена', {
        baseLanguage: BASE_LANGUAGE,
        supportedLanguages: SUPPORTED_LANGUAGES
    });
})();
