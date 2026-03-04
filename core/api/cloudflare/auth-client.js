/**
 * ================================================================================================
 * AUTH CLIENT - Client for Google OAuth authorization via Cloudflare Workers
 * ================================================================================================
 *
 * PURPOSE: Client-side OAuth flow implementation: initiating authorization,
 * callback handling, code-to-token exchange, token management.
 *
 * @skill-anchor core/skills/api-layer #for-layer-separation
 * @skill-anchor core/skills/data-providers-architecture #for-data-provider-interface
 *
 * Skill: app/skills/file-protocol-cors-guard
 *
 * FEATURES:
 * - Initiate Google OAuth with state generation for CSRF protection
 * - Handle callback from Google (extract code and state from URL)
 * - Exchange authorization code for access token via Workers endpoint
 * - Token storage in cache with expiry check
 * - Automatic token refresh when needed
 *
*/

(function() {
    'use strict';

    // Dependencies (loaded before this script)
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

    // Key for token storage in cache
    const TOKEN_CACHE_KEY = 'auth-token';
    // Key for state storage (CSRF protection)
    const STATE_CACHE_KEY = 'auth-state';

    /**
     * Generate random state for CSRF protection
     * @returns {string} Random state string
     */
    function generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Save state to sessionStorage for callback validation
     * @param {string} state - State string
     */
    function saveState(state) {
        try {
            sessionStorage.setItem(STATE_CACHE_KEY, state);
        } catch (error) {
            console.error('auth-client.saveState:', error);
        }
    }

    /**
     * Validate state from sessionStorage
     * @param {string} receivedState - State from URL callback
     * @returns {boolean} true if state is valid
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
     * Initiate Google OAuth authorization
     * Redirects user to Google authorization page
     * @param {string} env - Environment ('local' | 'production'), if omitted - auto-detected
     * @returns {void}
     */
    function initiateGoogleAuth(env = null) {
        try {
            // Generate state for CSRF protection
            const stateBase = generateState();

            // Add client app URL to state for correct redirect
            // For file:// save full path with href, for http:// use origin
            let clientUrl;
            if (window.location.protocol === 'file:' || window.location.hostname.includes('github.io') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                // For file:// and subdirectories (GitHub Pages) save full file path
                // Remove query and hash params to avoid duplication on return
                clientUrl = window.location.href.split('?')[0].split('#')[0];
                console.log('auth-client: обнаружена локальная среда или GitHub Pages, сохраняем полный путь:', clientUrl);
            } else {
                // For http:// use origin
                clientUrl = window.location.origin;
            }

            const state = JSON.stringify({
                csrf: stateBase,
                client_url: clientUrl
            });

            saveState(stateBase);

            // Get auth URL from config
            const authUrl = window.authConfig.getAuthUrl(state, env);

            if (!authUrl) {
                throw new Error('Не удалось получить URL for авторизации');
            }

            // Open OAuth in new tab instead of redirect
            // This preserves state of origin page
            const authWindow = window.open(
                authUrl,
                'google-oauth',
                'width=600,height=700,left=100,top=100'
            );

            if (!authWindow) {
                // If popup blocked by browser, show warning and offer fallback redirect.
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

            // Note: authWindow.closed check removed due to COOP (Cross-Origin-Opener-Policy)
            // Browser blocks access to window.closed for cross-origin windows and logs error to console
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
     * Handle callback from Google OAuth
     * Extracts code and state from URL, validates state, exchanges code for token
     * @param {string} url - Page URL with callback params (optional, default window.location.href)
     * @returns {Promise<Object|null>} User data or null on error
     */
    async function handleAuthCallback(url = null) {
        try {
            const currentUrl = url || window.location.href;
            const urlObj = new URL(currentUrl);

            // Extract params from URL
            const code = urlObj.searchParams.get('code');
            const state = urlObj.searchParams.get('state');
            const error = urlObj.searchParams.get('error');

            // Check for Google error
            if (error) {
                const errorDescription = urlObj.searchParams.get('error_description') || error;
                throw new Error(`Ошибка авторизации: ${errorDescription}`);
            }

            // Validate presence of code
            if (!code) {
                // If no code and no error - possibly not a callback page
                return null;
            }

            // Parse state (can be JSON object with client_url or plain string)
            let stateObj = null;
            let stateCsrf = state;
            try {
                stateObj = JSON.parse(state);
                if (stateObj && stateObj.csrf) {
                    stateCsrf = stateObj.csrf;
                }
            } catch (e) {
                // state is not JSON, use as-is
            }

            // Validate state (CSRF protection)
            if (!stateCsrf || !validateState(stateCsrf)) {
                throw new Error('Невалидный state параметр. Возможна CSRF атака.');
            }

            // Exchange code for token
            const tokenData = await exchangeCodeForToken(code);

            if (!tokenData || !tokenData.access_token) {
                throw new Error('Не удалось получить токен от сервера');
            }

            // Save token
            await saveToken(tokenData);

            // Clean URL from OAuth params
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
     * Exchange authorization code for access token via Workers endpoint
     * @param {string} code - Authorization code from Google
     * @returns {Promise<Object>} Token data (access_token, refresh_token, expires_in, etc.)
     * @throws {Error} On HTTP request error or invalid response
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
     * Save token to cache
     * @param {Object} tokenData - Token data (access_token, refresh_token, expires_in, etc.)
     * @returns {Promise<boolean>} Operation success
     */
    async function saveToken(tokenData) {
        try {
            // Calculate token expiry time
            const expiresAt = tokenData.expires_in
                ? Date.now() + (tokenData.expires_in * 1000)
                : null;

            const tokenToSave = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                expires_at: expiresAt,
                token_type: tokenData.token_type || 'Bearer',
                scope: tokenData.scope || null,
                // Additional user data if present
                user: tokenData.user || null
            };

            // Save token WITHOUT versioning (user data)
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
     * Get saved token from cache
     * @returns {Promise<Object|null>} Token data or null
     */
    async function getAccessToken() {
        try {
            // Get token WITHOUT versioning
            const tokenData = await window.cacheManager.get(TOKEN_CACHE_KEY, {
                useVersioning: false
            });

            if (!tokenData) {
                return null;
            }

            // Check token expiry
            if (tokenData.expires_at && tokenData.expires_at < Date.now()) {
                // Token expired, attempt refresh via refresh_token
                if (tokenData.refresh_token) {
                    const refreshed = await refreshToken(tokenData.refresh_token);
                    if (refreshed) {
                        return refreshed;
                    }
                }
                // If refresh failed - remove token
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
     * Refresh token via refresh_token
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<Object|null>} New token data or null
     */
    async function refreshToken(refreshToken) {
        try {
            // TODO: Implement token refresh via Workers endpoint
            // For now return null - will be added in Phase 4
            console.warn('auth-client.refreshToken: token refresh not yet implemented');
            return null;
        } catch (error) {
            console.error('auth-client.refreshToken:', error);
            return null;
        }
    }

    /**
     * Validate presence of valid token
     * @returns {Promise<boolean>} true if user is authenticated
     */
    async function isAuthenticated() {
        const token = await getAccessToken();
        return token !== null && token.access_token !== null;
    }

    /**
     * Get current user
     * @returns {Promise<Object|null>} User data or null
     */
    async function getCurrentUser() {
        try {
            const tokenData = await getAccessToken();
            if (!tokenData) {
                return null;
            }

            // If user data already in token - return it
            if (tokenData.user) {
                return tokenData.user;
            }

            // Otherwise fetch via Workers endpoint /auth/me
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
     * Logout from system
     * Clears token and redirects to main page
     * @returns {Promise<void>}
     */
    async function logout() {
        try {
            // Remove token from cache
            await window.cacheManager.delete(TOKEN_CACHE_KEY, { useVersioning: false });

            // Optional: call Workers endpoint for logout on server
            // Skipping for now - will be implemented in Phase 4

            // Redirect to main page
            window.location.href = window.location.origin + window.location.pathname;
        } catch (error) {
            console.error('auth-client.logout:', error);
            // Even on error redirect to main
            window.location.href = window.location.origin + window.location.pathname;
        }
    }

    // Export functions via window for use in other modules
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
