/**
 * #JS-4r2GQb12
 * @description SSOT for Cloudflare Workers API: base URL, endpoints for portfolios, datasets, auth.
 * @skill id:sk-02d3ea
 *
 * PURPOSE: Single place for all Workers API parameters; no duplication in components or clients.
 *
 * PRINCIPLES:
 * - All endpoints defined here; use getter functions, not direct CONFIG access
 * - Validate configuration presence at initialization
 * - Structure: workers.baseUrl, workers.endpoints.{ auth, portfolios, datasets }
 *
 * REFERENCES:
 * - SSOT: id:sk-e0b8f3
 * - Integration / infrastructure: id:sk-02d3ea
 */

(function() {
    'use strict';

    /**
     * Cloudflare Workers configuration
     */
    const CONFIG = {
        workers: {
            // Base URL Cloudflare Worker
            baseUrl: 'https://app-api.ponomarev-ux.workers.dev',

            // Endpoints for various APIs
            endpoints: {
                // Auth endpoints
                auth: {
                    google: '/auth/google',              // Google OAuth initiation
                    callback: '/auth/callback',           // OAuth callback
                    logout: '/auth/logout',              // Logout
                    me: '/auth/me'                       // Get current user
                },

                // Portfolios API endpoints
                portfolios: {
                    list: '/api/portfolios',             // GET - list portfolios
                    get: '/api/portfolios',               // GET /api/portfolios/:id - get portfolio
                    create: '/api/portfolios',           // POST - create portfolio
                    update: '/api/portfolios',           // PUT /api/portfolios/:id - update portfolio
                    delete: '/api/portfolios'            // DELETE /api/portfolios/:id - delete portfolio
                },

                // Datasets API endpoints
                datasets: {
                    timeSeries: '/api/datasets/time-series',      // GET/POST - time series
                    metrics: '/api/datasets/metrics',             // GET/POST - metrics
                    snapshots: '/api/datasets/snapshots'          // GET/POST - data snapshots
                },

                // API Proxy endpoints (for CORS bypass on file://)
                proxy: {
                    coingecko: '/api/coingecko',         // CoinGecko API proxy
                    yahooFinance: '/api/yahoo-finance',  // Yahoo Finance API proxy
                    stooq: '/api/stooq',                 // Stooq API proxy
                    generic: '/api/proxy'                // Generic URL proxy (images, etc)
                },

                // Messages API endpoints (DEPRECATED - messages now hardcoded)
                // messages: {
                //     module: '/api/messages',                      // GET ?module={module}&version={version} - get module
                //     list: '/api/messages/list',                   // GET - list available modules
                //     version: '/api/messages/version'              // GET - current dataset version
                // },

                // App Settings API (KV-backed, replaces continue-wrapper snapshots)
                settings: '/api/settings',               // GET/POST - all settings

                // Health check
                health: '/health'                         // GET - Worker health check
            }
        }
    };

    /**
     * Get base URL Cloudflare Worker
     * @returns {string} Base URL
     */
    function getWorkersBaseUrl() {
        return CONFIG.workers.baseUrl;
    }

    /**
     * Get base URL for auth flow.
     * SSOT: origin from authConfig.getRedirectUri() so callback and token check
     * always go through the same Worker.
     * @returns {string} Base URL
     */
    function getAuthBaseUrl() {
        try {
            if (window.authConfig && typeof window.authConfig.getRedirectUri === 'function') {
                const redirectUri = window.authConfig.getRedirectUri();
                if (redirectUri) {
                    const origin = new URL(redirectUri).origin;
                    if (origin) {
                        return origin;
                    }
                }
            }
        } catch (error) {
            console.warn('cloudflare-config.getAuthBaseUrl: failed to determine auth origin from redirect_uri', error);
        }
        return getWorkersBaseUrl();
    }

    /**
     * Get full URL for endpoint
     * @param {string} endpoint - Endpoint path (e.g. '/auth/google')
     * @returns {string} Full URL
     */
    function getEndpointUrl(endpoint) {
        const baseUrl = getWorkersBaseUrl();
        // Remove leading slash if present
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        const fullUrl = `${baseUrl}/${cleanEndpoint}`;
        return fullUrl;
    }

    /**
     * Get URL for auth endpoints
     * @param {string} action - Action ('google', 'callback', 'logout', 'me')
     * @returns {string} Full URL for endpoint
     */
    function getAuthEndpoint(action) {
        const endpoint = CONFIG.workers.endpoints.auth[action];
        if (!endpoint) {
            console.warn(`cloudflare-config.getAuthEndpoint: unknown action "${action}"`);
            return null;
        }
        const baseUrl = getAuthBaseUrl();
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        return `${baseUrl}/${cleanEndpoint}`;
    }

    /**
     * Get URL for portfolios endpoints
     * @param {string} action - Action ('list', 'get', 'create', 'update', 'delete')
     * @param {string|number} id - Portfolio ID (optional, for get, update, delete)
     * @returns {string} Full URL for endpoint
     */
    function getPortfoliosEndpoint(action, id = null) {
        const endpoint = CONFIG.workers.endpoints.portfolios[action];
        if (!endpoint) {
            console.warn(`cloudflare-config.getPortfoliosEndpoint: unknown action "${action}"`);
            return null;
        }

        let url = getEndpointUrl(endpoint);
        // For get, update, delete add ID to path
        if (id && (action === 'get' || action === 'update' || action === 'delete')) {
            url = `${url}/${id}`;
        }

        return url;
    }

    /**
     * Get URL for datasets endpoints
     * @param {string} type - Data type ('timeSeries', 'metrics', 'snapshots')
     * @param {Object} params - Request params (coin, date, etc.)
     * @returns {string} Full URL for endpoint
     */
    function getDatasetsEndpoint(type, params = {}) {
        const endpoint = CONFIG.workers.endpoints.datasets[type];
        if (!endpoint) {
            console.warn(`cloudflare-config.getDatasetsEndpoint: unknown type "${type}"`);
            return null;
        }

        let url = getEndpointUrl(endpoint);

        // Add params to path if specified
        if (params.coin && params.date) {
            url = `${url}/${params.coin}/${params.date}`;
        } else if (params.coin) {
            url = `${url}/${params.coin}`;
        }

        // Add query params if any
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (key !== 'coin' && key !== 'date' && params[key] !== undefined) {
                queryParams.append(key, params[key]);
            }
        });

        if (queryParams.toString()) {
            url = `${url}?${queryParams.toString()}`;
        }

        return url;
    }

    /**
     * Get URL for messages endpoints
     * ⚠️ DEPRECATED: Messages now hardcoded, endpoints no longer used.
     * Kept for backward compatibility with messages-api.js (tests only).
     * @param {string} action - Action ('module', 'list', 'version')
     * @param {Object} params - Request params (module, version for 'module')
     * @returns {string|null} Full URL for endpoint or null
     */
    function getMessagesEndpoint(action, params = {}) {
        // Messages endpoints disabled - messages now hardcoded
        if (!CONFIG.workers.endpoints.messages) {
            console.warn('cloudflare-config.getMessagesEndpoint: messages endpoints disabled (messages hardcoded)');
            return null;
        }
        const endpoint = CONFIG.workers.endpoints.messages[action];
        if (!endpoint) {
            console.warn(`cloudflare-config.getMessagesEndpoint: unknown action "${action}"`);
            return null;
        }

        let url = getEndpointUrl(endpoint);

        // For 'module' add query params
        if (action === 'module' && params.module) {
            const queryParams = new URLSearchParams();
            queryParams.append('module', params.module);
            if (params.version) {
                queryParams.append('version', params.version);
            }
            url = `${url}?${queryParams.toString()}`;
        }

        return url;
    }

    /**
     * Get URL for health check endpoint
     * @returns {string} Full URL for health check
     */
    function getHealthEndpoint() {
        return getEndpointUrl(CONFIG.workers.endpoints.health);
    }

    /**
     * Get URL for API proxy endpoint
     * @param {string} apiType - API type ('coingecko', 'yahooFinance', 'stooq', 'generic')
     * @param {string} path - API path (e.g. '/coins/markets') or empty string for generic
     * @param {Object} params - Query params (optional)
     * @returns {string} Full URL for proxy endpoint
     */
    function getApiProxyEndpoint(apiType, path, params = {}) {
        const endpoint = CONFIG.workers.endpoints.proxy[apiType];
        if (!endpoint) {
            console.warn(`cloudflare-config.getApiProxyEndpoint: unknown type API "${apiType}"`);
            return null;
        }

        // Build URL: baseUrl + proxyEndpoint + apiPath
        let url = `${getWorkersBaseUrl()}${endpoint}${path}`;

        // Add query params if any
        const queryParams = new URLSearchParams(params);
        if (queryParams.toString()) {
            url = `${url}?${queryParams.toString()}`;
        }

        return url;
    }

    /**
     * Get URL for proxying arbitrary URL (for CORS bypass)
     * @param {string} targetUrl - Target URL
     * @returns {string} Proxy URL
     */
    function getGenericProxyUrl(targetUrl) {
        return getApiProxyEndpoint('generic', '', { url: targetUrl });
    }

    /**
     * Check that configuration is initialized correctly
     * @returns {boolean} true if configuration is valid
     */
    function isValid() {
        return !!(
            CONFIG.workers.baseUrl &&
            CONFIG.workers.endpoints.auth &&
            CONFIG.workers.endpoints.portfolios &&
            CONFIG.workers.endpoints.datasets &&
            CONFIG.workers.endpoints.proxy
            // messages endpoints disabled (messages hardcoded)
        );
    }

    // Validation at initialization
    if (!isValid()) {
        console.error('cloudflare-config.js: Invalid configuration! Check parameters.');
    }

    // Export to global scope
    window.cloudflareConfig = {
        CONFIG,
        getWorkersBaseUrl,
        getAuthBaseUrl,
        getEndpointUrl,
        getAuthEndpoint,
        getPortfoliosEndpoint,
        getDatasetsEndpoint,
        getMessagesEndpoint,
        getHealthEndpoint,
        getApiProxyEndpoint,
        getGenericProxyUrl,
        isValid
    };

    console.log('cloudflare-config.js: initialized');
})();
