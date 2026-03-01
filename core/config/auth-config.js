/**
 * ================================================================================================
 * AUTH CONFIG - Конфигурация авторизации Google OAuth
 * ================================================================================================
 * Skill: app/skills/file-protocol-cors-guard
 *
 * ЦЕЛЬ: Единый источник правды для всех параметров Google OAuth авторизации.
 * Client ID, redirect URIs, scopes, endpoints.
 *
 * ПРИНЦИПЫ:
 * - Все параметры OAuth определяются здесь и используются везде
 * - Запрещено дублировать значения в компонентах или API клиентах
 * - Использовать функции-геттеры вместо прямого доступа к CONFIG
 * - Проверка наличия конфигурации при инициализации
 *
 * ПРИНЦИПЫ:
 * {
 *   google: {
 *     clientId: '...',
 *     redirectUris: {
 *       local: '...',
 *       production: '...'
 *     },
 *     scopes: [...],
 *     authUrl: '...',
 *     tokenUrl: '...'
 *   }
 * }
 *
 * ССЫЛКИ:
 * - Принципы единого источника правды: app/skills/ux-principles
 * - План интеграции: core/skills/config-contracts
 * - Cloudflare инфраструктура: core/skills/config-contracts
 */

(function() {
    'use strict';

    /**
     * Конфигурация авторизации
     */
    const CONFIG = {
        google: {
            // Google OAuth Client ID
            clientId: '926359695878-hr94rhkq1s30c3nqgkcbfcpr0537kt7i.apps.googleusercontent.com',

            // Redirect URIs для разных окружений
            redirectUris: {
                local: 'http://localhost:8787/auth/callback',
                // @exception anti-calque: live Google OAuth redirect URI registered in Google Console.
                // After adding app-api to Authorized redirect URIs list, replace with app-api origin.
                production: 'https://mbb-api.ponomarev-ux.workers.dev/auth/callback'
            },

            // OAuth scopes (права доступа)
            scopes: [
                'openid',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ],

            // Google OAuth endpoints
            authUrl: 'https://accounts.google.com/o/oauth2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',

            // Определение текущего окружения (local или production)
            // Можно переопределить через setEnvironment()
            environment: window.location.hostname === 'localhost' ? 'local' : 'production'
        }
    };

    /**
     * Получить Google OAuth Client ID
     * @returns {string} Client ID
     */
    function getGoogleClientId() {
        return CONFIG.google.clientId;
    }

    /**
     * Получить redirect URI для текущего окружения
     * @param {string} env - Окружение ('local' | 'production'), если не указано - определяется автоматически
     * @returns {string} Redirect URI
     */
    function getRedirectUri(env = null) {
        const environment = env || CONFIG.google.environment;
        return CONFIG.google.redirectUris[environment] || CONFIG.google.redirectUris.production;
    }

    /**
     * Получить массив OAuth scopes
     * @returns {Array<string>} Массив scopes
     */
    function getScopes() {
        return [...CONFIG.google.scopes];
    }

    /**
     * Получить строку scopes для URL (через пробел)
     * @returns {string} Scopes строка
     */
    function getScopesString() {
        return CONFIG.google.scopes.join(' ');
    }

    /**
     * Получить URL для инициации OAuth авторизации
     * @param {string} state - State параметр для защиты от CSRF
     * @param {string} env - Окружение ('local' | 'production')
     * @returns {string} Полный URL для редиректа на Google OAuth
     */
    function getAuthUrl(state, env = null) {
        const redirectUri = getRedirectUri(env);
        const scopes = getScopesString();
        const params = new URLSearchParams({
            client_id: CONFIG.google.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes,
            state: state || '',
            access_type: 'offline',
            prompt: 'consent'
        });

        return `${CONFIG.google.authUrl}?${params.toString()}`;
    }

    /**
     * Получить URL для обмена code на токен
     * @returns {string} Token URL
     */
    function getTokenUrl() {
        return CONFIG.google.tokenUrl;
    }

    /**
     * Установить окружение вручную
     * @param {string} env - 'local' | 'production'
     */
    function setEnvironment(env) {
        if (env === 'local' || env === 'production') {
            CONFIG.google.environment = env;
        } else {
            console.warn('auth-config.setEnvironment: неверное окружение, используйте "local" или "production"');
        }
    }

    /**
     * Получить текущее окружение
     * @returns {string} 'local' | 'production'
     */
    function getEnvironment() {
        return CONFIG.google.environment;
    }

    /**
     * Проверить, что конфигурация инициализирована корректно
     * @returns {boolean} true если конфигурация валидна
     */
    function isValid() {
        return !!(
            CONFIG.google.clientId &&
            CONFIG.google.redirectUris.local &&
            CONFIG.google.redirectUris.production &&
            CONFIG.google.scopes.length > 0
        );
    }

    // Проверка при инициализации
    if (!isValid()) {
        console.error('auth-config.js: Конфигурация невалидна! Проверьте параметры.');
    }

    // Экспорт в глобальную область
    window.authConfig = {
        CONFIG,
        getGoogleClientId,
        getRedirectUri,
        getScopes,
        getScopesString,
        getAuthUrl,
        getTokenUrl,
        setEnvironment,
        getEnvironment,
        isValid
    };

    console.log('auth-config.js: инициализирован');
})();
