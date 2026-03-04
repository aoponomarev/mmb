/**
 * #JS-Uf4GZ4Qq
 * @description SSOT for Google OAuth parameters: client ID, redirect URIs, scopes, endpoints.
 * @skill id:sk-7cf3f7
 *
 * PRINCIPLES:
 * - All OAuth parameters are defined here and used everywhere
 * - Duplicating values in components or API clients is forbidden
 * - Use getter functions instead of direct CONFIG access
 * - Validate configuration presence at initialization
 *
 * REFERENCES:
 * - SSOT principles: id:sk-e0b8f3
 * - Integration plan: id:sk-02d3ea
 * - Cloudflare infrastructure: id:sk-02d3ea
 */

(function() {
    'use strict';

    /**
     * Authorization configuration
     */
    const CONFIG = {
        google: {
            // Google OAuth Client ID
            clientId: '926359695878-hr94rhkq1s30c3nqgkcbfcpr0537kt7i.apps.googleusercontent.com',

            // Redirect URIs per environment
            redirectUris: {
                local: 'http://localhost:8787/auth/callback',
                // @exception anti-calque: live Google OAuth redirect URI registered in Google Console.
                // After adding app-api to Authorized redirect URIs list, replace with app-api origin.
                production: 'https://mbb-api.ponomarev-ux.workers.dev/auth/callback'
            },

            // OAuth scopes (access rights)
            scopes: [
                'openid',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ],

            // Google OAuth endpoints
            authUrl: 'https://accounts.google.com/o/oauth2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',

            // Current environment (local or production). Override via setEnvironment()
            environment: window.location.hostname === 'localhost' ? 'local' : 'production'
        }
    };

    /**
     * Get Google OAuth Client ID
     * @returns {string} Client ID
     */
    function getGoogleClientId() {
        return CONFIG.google.clientId;
    }

    /**
     * Get redirect URI for current environment
     * @param {string} env - Environment ('local' | 'production'), auto-detected if omitted
     * @returns {string} Redirect URI
     */
    function getRedirectUri(env = null) {
        const environment = env || CONFIG.google.environment;
        return CONFIG.google.redirectUris[environment] || CONFIG.google.redirectUris.production;
    }

    /**
     * Get OAuth scopes array
     * @returns {Array<string>} Scopes array
     */
    function getScopes() {
        return [...CONFIG.google.scopes];
    }

    /**
     * Get scopes string for URL (space-separated)
     * @returns {string} Scopes string
     */
    function getScopesString() {
        return CONFIG.google.scopes.join(' ');
    }

    /**
     * Get URL to initiate OAuth authorization
     * @param {string} state - State parameter for CSRF protection
     * @param {string} env - Environment ('local' | 'production')
     * @returns {string} Full URL for redirect to Google OAuth
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
     * Get URL for code-to-token exchange
     * @returns {string} Token URL
     */
    function getTokenUrl() {
        return CONFIG.google.tokenUrl;
    }

    /**
     * Set environment manually
     * @param {string} env - 'local' | 'production'
     */
    function setEnvironment(env) {
        if (env === 'local' || env === 'production') {
            CONFIG.google.environment = env;
        } else {
            console.warn('auth-config.setEnvironment: invalid environment, use "local" or "production"');
        }
    }

    /**
     * Get current environment
     * @returns {string} 'local' | 'production'
     */
    function getEnvironment() {
        return CONFIG.google.environment;
    }

    /**
     * Check that configuration is initialized correctly
     * @returns {boolean} true if configuration is valid
     */
    function isValid() {
        return !!(
            CONFIG.google.clientId &&
            CONFIG.google.redirectUris.local &&
            CONFIG.google.redirectUris.production &&
            CONFIG.google.scopes.length > 0
        );
    }

    // Validation at initialization
    if (!isValid()) {
        console.error('auth-config.js: Invalid configuration! Check parameters.');
    }

    // Export to global scope
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

    console.log('auth-config.js: initialized');
})();
