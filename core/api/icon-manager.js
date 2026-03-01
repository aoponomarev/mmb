/**
 * ================================================================================================
 * ICON MANAGER - Менеджер иконок монет
 * ================================================================================================
 * Skill: app/skills/ui-architecture
 *
 * PURPOSE: SSOT for получения URL иконок монет.
 * Приоритизирует наш GitHub CDN над внешними источниками (CoinGecko).
 *
 * PRINCIPLES:
 * 1. GitHub CDN (наш "золотой фонд") - приоритет #1.
 * 2. Fallback на CoinGecko - если иконки нет у нас.
 * 3. Поддержка Alias Map for разрешения конфликтов именования.
 * 4. Cache Busting через "соль" (версия приложения).
 */

(function() {
    'use strict';

    /**
     * Конфигурация IconManager
     */
    const CONFIG = {
        // Базовый URL нашего CDN на GitHub
        cdnBaseUrl: 'https://aoponomarev.github.io/libs/assets/coins/',

        // Карта соответствий (если ID в CoinGecko отличается от имени файла в CDN)
        // Формат: { 'coingecko-id': 'cdn-filename' }
        aliasMap: {
            'tether': 'usdt',
            'usd-coin': 'usdc',
            'binance-usd': 'busd'
        }
    };

    /**
     * Get URL иконки for монеты
     * @param {string} coinId - ID монеты (обычно из CoinGecko)
     * @param {string} fallbackUrl - URL иконки от провайдера (если на CDN не найдено)
     * @returns {string} - URL иконки
     */
    function getIconUrl(coinId, fallbackUrl = '') {
        if (!coinId) return fallbackUrl;

        // 1. Проверяем alias map
        const filename = CONFIG.aliasMap[coinId] || coinId;

        // 2. Формируем URL нашего CDN
        // Добавляем соль (версию приложения) for обхода кэша GitHub Pages
        const salt = window.appConfig ? window.appConfig.getVersionHash() : Date.now();
        const cdnUrl = `${CONFIG.cdnBaseUrl}${filename}.png?v=${salt}`;

        // Мы возвращаем CDN URL. Если он вернет 404, компонент должен обработать это через onerror
        return cdnUrl;
    }

    /**
     * Проверить, есть ли у пользователя права на редактирование иконок (Dev-only)
     * @returns {boolean}
     */
    function canEditIcons() {
        // Проверяем наличие GitHub Token в localStorage (или через authClient в будущем)
        return !!localStorage.getItem('app_github_token');
    }

    // Export to global scope
    window.iconManager = {
        getIconUrl,
        canEditIcons,
        CONFIG
    };

    console.log('icon-manager.js: initialized');
})();
