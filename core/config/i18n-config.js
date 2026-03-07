/**
 * #JS-HX3kkTDh
 * @description SSOT for i18n settings: supported languages, base language, language labels.
 * @skill id:sk-e0b8f3
 *
 * PRINCIPLES:
 * - Centralized supported languages and base language
 * - Mapping of language codes to human-readable names
 * - Constants for tooltips, messages and other i18n modules
 *
 * USAGE:
 * window.i18nConfig.BASE_LANGUAGE;
 * window.i18nConfig.SUPPORTED_LANGUAGES;
 * window.i18nConfig.getLanguageLabel('en');
 * window.i18nConfig.isLanguageSupported('fr');
 *
 * REFERENCES:
 * - SSOT: id:sk-e0b8f3
 * - Tooltips: #JS-DR3gZC9b (tooltips-config.js)
 * - Messages: #JS-2Z2J49xj (messages-config.js)
 */

(function() {
    'use strict';

    /**
     * Base language of the application (source language)
     */
    const BASE_LANGUAGE = 'ru';

    /**
     * Supported application languages
     * Order matters: base language first, others by popularity
     */
    const SUPPORTED_LANGUAGES = [
        'ru', // Russian (base)
        'en', // English
        'de', // Deutsch
        'zh'  // 中文
    ];

    /**
     * Mapping of language codes to human-readable names
     */
    const LANGUAGE_LABELS = {
        'ru': 'Русский',
        'en': 'English',
        'de': 'Deutsch',
        'zh': '中文'
    };

    /**
     * Get human-readable language name
     * @param {string} languageCode - language code ('ru', 'en', etc.)
     * @returns {string} - language display name (e.g. 'Russian', 'English')
     */
    function getLanguageLabel(languageCode) {
        return LANGUAGE_LABELS[languageCode] || languageCode;
    }

    /**
     * Check if language is supported by the application
     * @param {string} languageCode - language code
     * @returns {boolean}
     */
    function isLanguageSupported(languageCode) {
        return SUPPORTED_LANGUAGES.includes(languageCode);
    }

    /**
     * Normalize language code (if unsupported passed, return base language)
     * @param {string} languageCode - language code
     * @returns {string} - normalized language code
     */
    function normalizeLanguage(languageCode) {
        if (!languageCode || !isLanguageSupported(languageCode)) {
            return BASE_LANGUAGE;
        }
        return languageCode;
    }

    // Export to global window object
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
