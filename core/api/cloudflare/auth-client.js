/**
 * ================================================================================================
 * AUTH CLIENT - Клиент for Google OAuth авторизации через Cloudflare Workers
 * ================================================================================================
 *
 * PURPOSE: Реализация клиентской части OAuth flow: инициирование авторизации,
 * обработка callback, code-to-token exchange, управление токенами.
 *
 * Skill: app/skills/file-protocol-cors-guard
 *
 * PRINCIPLES:
 * - SSOT: Использовать `auth-config.js` for всех параметров OAuth
 * - Модульность: Независимый модуль без зависимостей от UI компонентов
 * - Безопасность: Токены хранятся через `cacheManager` БЕЗ версионирования (пользовательские данные)
 * - Обработка ошибок: Использование существующей системы обработки ошибок
 *
 * ОСОБЕННОСТИ:
 * - Initiation Google OAuth с генерацией state for CSRF protection
 * - Обработка callback от Google (извлечение code и state из URL)
 * - Обмен authorization code на access token через Workers endpoint
 * - Хранение токена в кэше с проверкой срока действия
 * - Автоматическое обновление токена при необходимости
 *
 * REFERENCES:
 * - Конфигурация OAuth: core/config/auth-config.js
 * - Конфигурация Workers: core/config/cloudflare-config.js
 * - План интеграции: core/skills/config-contracts
 */

(function() {
    'use strict';

    // Зависимости (загружаются до этого скрипта)
    // - core/config/auth-config.js (window.authConfig)
    // - core/config/cloudflare-config.js (window.cloudflareConfig)
    // - core/cache/cache-manager.js (window.cacheManager)

    if (typeof window.authConfig === 'undefined') {
        console.error('auth-client.js: authConfig not loaded');
        return;
    }

    if (typeof window.cloudflareConfig === 'undefined') {
        console.error('auth-client.js: cloudflareConfig not loaded');
        return;
    }

    if (typeof window.cacheManager === 'undefined') {
        console.error('auth-client.js: cacheManager not loaded');
        return;
    }

    // Ключ for хранения токена в кэше
    const TOKEN_CACHE_KEY = 'auth-token';
    // Ключ for хранения state (CSRF protection)
    const STATE_CACHE_KEY = 'auth-state';

    /**
     * Генерация случайного state for CSRF protection
     * @returns {string} Случайная строка state
     */
    function generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Сохранение state в sessionStorage for проверки при callback
     * @param {string} state - State строка
     */
    function saveState(state) {
        try {
            sessionStorage.setItem(STATE_CACHE_KEY, state);
        } catch (error) {
            console.error('auth-client.saveState:', error);
        }
    }

    /**
     * Проверка state из sessionStorage
     * @param {string} receivedState - State из URL callback
     * @returns {boolean} true если state валиден
     */
    function validateState(receivedState) {
        try {
            const savedState = sessionStorage.getItem(STATE_CACHE_KEY);
            if (!savedState) {
                return false;
            }
            sessionStorage.removeItem(STATE_CACHE_KEY);
            return savedState === receivedState;
        } catch (error) {
            console.error('auth-client.validateState:', error);
            return false;
        }
    }

    /**
     * Initiation Google OAuth авторизации
     * Редиректит пользователя на страницу авторизации Google
     * @param {string} env - Environment ('local' | 'production'), if omitted - auto-detected
     * @returns {void}
     */
    function initiateGoogleAuth(env = null) {
        try {
            // Генерация state for CSRF protection
            const stateBase = generateState();

            // Добавляем URL клиентского приложения в state for правильного редиректа
            // Для file:// сохраняем полный путь с href, for http:// используем origin
            let clientUrl;
            if (window.location.protocol === 'file:' || window.location.hostname.includes('github.io') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                // Для file:// и подкаталогов (GitHub Pages) сохраняем полный путь к файлу
                // Убираем query и hash параметры, чтобы не дублировались при возврате
                clientUrl = window.location.href.split('?')[0].split('#')[0];
                console.log('auth-client: обнаружена локальная среда или GitHub Pages, сохраняем полный путь:', clientUrl);
            } else {
                // Для http:// используем origin
                clientUrl = window.location.origin;
            }

            const state = JSON.stringify({
                csrf: stateBase,
                client_url: clientUrl
            });

            saveState(stateBase);

            // Получение URL for авторизации из конфигурации
            const authUrl = window.authConfig.getAuthUrl(state, env);

            if (!authUrl) {
                throw new Error('Не удалось получить URL for авторизации');
            }

            // Открываем OAuth в новой вкладке вместо редиректа
            // Это сохраняет состояние исходной страницы
            const authWindow = window.open(
                authUrl,
                'google-oauth',
                'width=600,height=700,left=100,top=100'
            );

            if (!authWindow) {
                // Если popup заблокирован браузером, показываем предупреждение и предлагаем fallback-редирект.
                const userConfirmed = confirm(
                    'Для авторизации нужно открыть новую вкладку.\n\n' +
                    'Разрешите всплывающие окна for этого сайта или нажмите OK for открытия в текущей вкладке.'
                );

                if (userConfirmed) {
                    window.location.href = authUrl;
                }
                return;
            }

            console.log('OAuth открыт в новой вкладке. Ожидание авторизации...');

            // Note: проверка authWindow.closed удалена из-за COOP (Cross-Origin-Opener-Policy)
            // Браузер блокирует доступ к window.closed for cross-origin окон и выводит ошибку в консоль
            // @skill-anchor is/skills/arch-cloudflare-infrastructure #for-oauth-postmessage
            // Авторизация работает через postMessage
        } catch (error) {
            console.error('auth-client.initiateGoogleAuth:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'auth-client.initiateGoogleAuth',
                    userMessage: 'Ошибка при инициации авторизации'
                });
            } else {
                alert('Ошибка при инициации авторизации: ' + error.message);
            }
        }
    }

    /**
     * Обработка callback от Google OAuth
     * Извлекает code и state из URL, проверяет state, обменивает code на токен
     * @param {string} url - URL страницы с параметрами callback (optional, по умолчанию window.location.href)
     * @returns {Promise<Object|null>} Данные пользователя или null при ошибке
     */
    async function handleAuthCallback(url = null) {
        try {
            const currentUrl = url || window.location.href;
            const urlObj = new URL(currentUrl);

            // Извлечение параметров из URL
            const code = urlObj.searchParams.get('code');
            const state = urlObj.searchParams.get('state');
            const error = urlObj.searchParams.get('error');

            // Проверка на ошибку от Google
            if (error) {
                const errorDescription = urlObj.searchParams.get('error_description') || error;
                throw new Error(`Ошибка авторизации: ${errorDescription}`);
            }

            // Validate presence code
            if (!code) {
                // Если нет code и нет ошибки - возможно, это не callback страница
                return null;
            }

            // Парсинг state (can be JSON объектом с client_url или просто строкой)
            let stateObj = null;
            let stateCsrf = state;
            try {
                stateObj = JSON.parse(state);
                if (stateObj && stateObj.csrf) {
                    stateCsrf = stateObj.csrf;
                }
            } catch (e) {
                // state не JSON, используем как есть
            }

            // Проверка state (защита от CSRF)
            if (!stateCsrf || !validateState(stateCsrf)) {
                throw new Error('Невалидный state параметр. Возможна CSRF атака.');
            }

            // Обмен code на токен
            const tokenData = await exchangeCodeForToken(code);

            if (!tokenData || !tokenData.access_token) {
                throw new Error('Не удалось получить токен от сервера');
            }

            // Сохранение токена
            await saveToken(tokenData);

            // Очистка URL от параметров OAuth
            const cleanUrl = urlObj.origin + urlObj.pathname;
            window.history.replaceState({}, document.title, cleanUrl);

            return tokenData;
        } catch (error) {
            console.error('auth-client.handleAuthCallback:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'auth-client.handleAuthCallback',
                    userMessage: 'Ошибка при обработке callback авторизации'
                });
            } else {
                alert('Ошибка при обработке callback: ' + error.message);
            }
            return null;
        }
    }

    /**
     * Обмен authorization code на access token через Workers endpoint
     * @param {string} code - Authorization code от Google
     * @returns {Promise<Object>} Данные токена (access_token, refresh_token, expires_in и т.д.)
     * @throws {Error} При ошибке HTTP requestа или невалидном ответе
     */
    async function exchangeCodeForToken(code) {
        if (!code) {
            throw new Error('Authorization code не предоставлен');
        }

        try {
            const callbackUrl = window.cloudflareConfig.getAuthEndpoint('callback');
            if (!callbackUrl) {
                throw new Error('Не удалось получить URL for обмена токена');
            }

            const response = await fetch(callbackUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    redirect_uri: window.authConfig.getRedirectUri()
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: 'Неизвестная ошибка' } }));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const tokenData = await response.json();

            if (!tokenData.access_token) {
                throw new Error('Токен не найден в ответе сервера');
            }

            return tokenData;
        } catch (error) {
            console.error('auth-client.exchangeCodeForToken:', error);
            throw error;
        }
    }

    /**
     * Сохранение токена в кэш
     * @param {Object} tokenData - Данные токена (access_token, refresh_token, expires_in и т.д.)
     * @returns {Promise<boolean>} Успех операции
     */
    async function saveToken(tokenData) {
        try {
            // Вычисляем время истечения токена
            const expiresAt = tokenData.expires_in
                ? Date.now() + (tokenData.expires_in * 1000)
                : null;

            const tokenToSave = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                expires_at: expiresAt,
                token_type: tokenData.token_type || 'Bearer',
                scope: tokenData.scope || null,
                // Дополнительные данные пользователя, если есть
                user: tokenData.user || null
            };

            // Сохраняем токен БЕЗ версионирования (пользовательские данные)
            await window.cacheManager.set(TOKEN_CACHE_KEY, tokenToSave, {
                useVersioning: false
            });

            return true;
        } catch (error) {
            console.error('auth-client.saveToken:', error);
            return false;
        }
    }

    /**
     * Получение сохранённого токена из кэша
     * @returns {Promise<Object|null>} Данные токена или null
     */
    async function getAccessToken() {
        try {
            // Получаем токен БЕЗ версионирования
            const tokenData = await window.cacheManager.get(TOKEN_CACHE_KEY, {
                useVersioning: false
            });

            if (!tokenData) {
                return null;
            }

            // Проверка срока действия токена
            if (tokenData.expires_at && tokenData.expires_at < Date.now()) {
                // Токен истёк, пытаемся обновить через refresh_token
                if (tokenData.refresh_token) {
                    const refreshed = await refreshToken(tokenData.refresh_token);
                    if (refreshed) {
                        return refreshed;
                    }
                }
                // Если обновление failed to - удаляем токен
                await window.cacheManager.delete(TOKEN_CACHE_KEY, { useVersioning: false });
                return null;
            }

            return tokenData;
        } catch (error) {
            console.error('auth-client.getAccessToken:', error);
            return null;
        }
    }

    /**
     * Обновление токена через refresh_token
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<Object|null>} Новые данные токена или null
     */
    async function refreshToken(refreshToken) {
        try {
            // TODO: Реализовать обновление токена через Workers endpoint
            // Пока возвращаем null - функционал будет добавлен на Этапе 4
            console.warn('auth-client.refreshToken: обновление токена пока не реализовано');
            return null;
        } catch (error) {
            console.error('auth-client.refreshToken:', error);
            return null;
        }
    }

    /**
     * Validate presence валидного токена
     * @returns {Promise<boolean>} true если пользователь авторизован
     */
    async function isAuthenticated() {
        const token = await getAccessToken();
        return token !== null && token.access_token !== null;
    }

    /**
     * Get current user
     * @returns {Promise<Object|null>} Данные пользователя или null
     */
    async function getCurrentUser() {
        try {
            const tokenData = await getAccessToken();
            if (!tokenData) {
                return null;
            }

            // Если данные пользователя уже есть в токене - возвращаем их
            if (tokenData.user) {
                return tokenData.user;
            }

            // Иначе запрашиваем через Workers endpoint /auth/me
            const meUrl = window.cloudflareConfig.getAuthEndpoint('me');
            if (!meUrl) {
                return null;
            }

            const response = await fetch(meUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                return null;
            }

            const userData = await response.json();
            return userData;
        } catch (error) {
            console.error('auth-client.getCurrentUser:', error);
            return null;
        }
    }

    /**
     * Logout из системы
     * Очищает токен и редиректит на главную страницу
     * @returns {Promise<void>}
     */
    async function logout() {
        try {
            // Удаляем токен из кэша
            await window.cacheManager.delete(TOKEN_CACHE_KEY, { useVersioning: false });

            // Опционально: вызываем Workers endpoint for logout на сервере
            // Пока пропускаем - будет реализовано на Этапе 4

            // Редирект на главную страницу
            window.location.href = window.location.origin + window.location.pathname;
        } catch (error) {
            console.error('auth-client.logout:', error);
            // Даже при ошибке редиректим на главную
            window.location.href = window.location.origin + window.location.pathname;
        }
    }

    // Экспорт функций через window for использования в других модулях
    window.authClient = {
        initiateGoogleAuth,
        handleAuthCallback,
        exchangeCodeForToken,
        saveToken,
        getAccessToken,
        isAuthenticated,
        getCurrentUser,
        logout
    };

    console.log('auth-client.js: initialized');
})();
