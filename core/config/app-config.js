/**
 * ================================================================================================
 * APP CONFIG - Application configuration
 * ================================================================================================
 * Skill: is/skills/arch-foundation
 *
 * PURPOSE: Centralized application configuration.
 * API endpoints, limits, timeouts, default settings, version, feature flags.
 *
 * PRINCIPLES:
 * - All settings in one place
 * - Configuration versioning
 * - Feature flags for enabling/disabling features
 * - SSOT for all default values (no duplication in components)
 *
 * CHANGE HISTORY:
 * - Added default values (extracted from app-footer.js):
 *   - defaults.timezone: 'Europe/Moscow'
 *   - defaults.translationLanguage: 'ru'
 *   - defaults.marketUpdates.times: [9, 12, 18] — metric update times (MSK)
 *   - defaults.marketUpdates.timezone: 'Europe/Moscow' — timezone for update time calculation
 *   - defaults.timezoneAbbreviations: object mapping timezones to abbreviations (MSK, LON, NYC, etc.)
 *   - getTimezoneAbbr(timezone): function to get timezone abbreviation from config
 *
 * YANDEXGPT CONFIGURATION:
 * - defaults.yandex.folderId: 'b1gv03a122le5a934cqj' — Folder ID for Yandex Cloud
 * - defaults.yandex.proxyType: 'yandex' — default proxy type
 * - defaults.yandex.proxies: object with available proxies (single source of truth)
 * - modelUri format: gpt://{folderId}/{model}/latest
 *
 * REFERENCES:
 * - Critical structures described in is/skills/arch-foundation
 * - Authorization configuration: core/config/auth-config.js
 * - Cloudflare Workers configuration: core/config/cloudflare-config.js
 * - YandexGPT provider: core/api/ai-providers/yandex-provider.js
 * - Cloudflare integration plan: core/skills/config-contracts
 */

(function() {
    'use strict';

    /**
     * Application configuration
     */
    const CONFIG = {
        // Application version
        version: '1.0.0',

        // API endpoints
        api: {
            coingecko: {
                baseUrl: 'https://api.coingecko.com/api/v3',
                timeout: 30000, // 30 seconds
                rateLimit: {
                    requestsPerMinute: 50,
                    requestsPerSecond: 10
                }
            },
            marketMetrics: {
                baseUrl: 'https://api.alternative.me',
                timeout: 15000
            }
        },

        // Limits and timeouts
        limits: {
            maxPortfolioAssets: 100,
            maxTimeSeriesPoints: 10000,
            maxHistoryDays: 365
        },

        // Default settings
        defaults: {
            theme: 'light',
            currency: 'usd',
            updateInterval: 60000, // 1 minute
            timezone: 'Europe/Moscow', // Default timezone
            translationLanguage: 'ru', // Default news translation language
            cacheTTL: {
                icons: 3600000,      // 1 hour
                coinsList: 86400000, // 1 day
                metrics: 3600000     // 1 hour
            },
            // Default AI provider
            aiProvider: 'yandex',
            yandex: {
                // Folder ID for Yandex Cloud (b1gv03a122le5a934cqj)
                // Used for forming modelUri: gpt://{folderId}/{model}/latest
                folderId: 'b1gv03a122le5a934cqj',
                // Default YandexGPT model
                model: 'gpt://b1gv03a122le5a934cqj/yandexgpt-lite/latest',
                models: [
                    { value: 'gpt://b1gv03a122le5a934cqj/yandexgpt-lite/latest', label: 'YandexGPT Lite' },
                    { value: 'gpt://b1gv03a122le5a934cqj/yandexgpt/latest', label: 'YandexGPT' },
                    { value: 'assistant:fvtj79pcagqihmvsaivl', label: 'Assistant' }
                ],
                // Proxy for YandexGPT (Yandex Cloud Functions)
                // REQUIRED for browser usage (CORS bypass)
                // Function: yandexgpt-proxy (ID: d4erd8d1pttbufsl26s1)
                // Must be public and handle OPTIONS preflight
                proxyType: 'yandex', // Default proxy type
                // Available proxies for YandexGPT (single source of truth)
                proxies: {
                    yandex: {
                        url: 'https://functions.yandexcloud.net/d4erd8d1pttbufsl26s1',
                        label: 'Yandex Cloud Functions',
                        description: 'Единая платформа с YandexGPT'
                    }
                    // Other proxies can be added (e.g. Cloudflare Workers)
                }
            },
            marketUpdates: {
                times: [9, 12, 18], // Metric update hours (MSK)
                timezone: 'Europe/Moscow' // Timezone for update time calculation
            },
            timezoneAbbreviations: {
                'Europe/Moscow': 'MCK',
                'Europe/London': 'LON',
                'America/New_York': 'NYC',
                'America/Los_Angeles': 'LAX',
                'Asia/Tokyo': 'TYO',
                'Asia/Shanghai': 'SHA',
                'Europe/Berlin': 'BER',
                'America/Chicago': 'CHI',
                'UTC': 'UTC'
            }
        },

        // Feature flags
        features: {
            timeSeries: false,      // Time series (not yet implemented)
            portfolios: true,       // Portfolios (implemented via Cloudflare API)
            strategies: false,      // Strategies (not yet implemented)
            correlations: false,    // Correlations (not yet implemented)
            offlineMode: false,     // Offline mode (not yet implemented)
            auth: true,             // Google OAuth auth (Cloudflare Workers) - enabled
            cloudSync: true,        // Data sync with Cloudflare (D1/R2) - enabled
            postgresSync: false     // Yandex Cloud PostgreSQL sync (disabled, module removed)
        }
    };

    /**
     * Get config value by path
     * @param {string} path - dot-separated path (e.g. 'api.coingecko.baseUrl')
     * @param {any} defaultValue - default value
     * @returns {any}
     */
    function get(path, defaultValue = undefined) {
        const parts = path.split('.');
        let value = CONFIG;

        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Get timezone abbreviation
     * @param {string} timezone - timezone (e.g. 'Europe/Moscow')
     * @returns {string} - abbreviation (e.g. 'MCK') or auto-generated
     */
    function getTimezoneAbbr(timezone) {
        const abbreviations = CONFIG.defaults.timezoneAbbreviations || {};
        if (abbreviations[timezone]) {
            return abbreviations[timezone];
        }
        // Fallback: generate abbreviation from last part of timezone
        return timezone.split('/').pop().substring(0, 3).toUpperCase();
    }

    /**
     * Get application version hash
     * Used for:
     * - CSS class on body (app-version-{hash})
     * - Cache key versioning (for invalidation on version change)
     * - Debugging (app version visible in DOM)
     * @returns {string} - Base58 version hash (8 chars) or 'unknown'
     */
    function getVersionHash() {
        if (!window.hashGenerator) {
            console.warn('app-config.getVersionHash: hashGenerator not loaded, using fallback');
            return 'unknown';
        }
        // Generate deterministic hash from app version
        // Same version number always yields same hash
        return window.hashGenerator.generateHash(CONFIG.version, 8);
    }

    /**
     * Get full CSS class name for version on body
     * @returns {string} - class like 'app-version-{hash}'
     */
    function getVersionClass() {
        return `app-version-${getVersionHash()}`;
    }

    /**
     * Set config value (for runtime changes only)
     * @param {string} path - dot-separated path
     * @param {any} value - value
     */
    function set(path, value) {
        const parts = path.split('.');
        const lastPart = parts.pop();
        let target = CONFIG;

        for (const part of parts) {
            if (!target[part] || typeof target[part] !== 'object') {
                target[part] = {};
            }
            target = target[part];
        }

        target[lastPart] = value;
    }

    /**
     * Check if feature is enabled
     * @param {string} featureName - feature name
     * @returns {boolean}
     */
    function isFeatureEnabled(featureName) {
        return CONFIG.features[featureName] === true;
    }

    /**
     * Get proxy URL for AI provider
     * SSOT for proxy URL
     * @param {string} providerName - provider name ('yandex')
     * @param {string} proxyType - proxy type ('cloudflare' | 'yandex' etc.)
     * @returns {string|null} proxy URL or null if not found
     */
    // @skill-anchor core/skills/external-integrations #for-geo-optimization
    function getProxyUrl(providerName, proxyType = null) {
        const providerConfig = CONFIG.defaults[providerName];
        if (!providerConfig) return null;

        // If proxyType not specified, use default
        if (!proxyType) {
            proxyType = providerConfig.proxyType;
        }

        // Get URL from proxy list
        if (providerConfig.proxies && providerConfig.proxies[proxyType]) {
            return providerConfig.proxies[proxyType].url || null;
        }

        return null;
    }

    /**
     * Get list of available proxies for AI provider
     * @param {string} providerName - provider name ('yandex')
     * @returns {Array<Object>} Array of proxy objects with {type, url, label, description}
     */
    function getAvailableProxies(providerName) {
        const providerConfig = CONFIG.defaults[providerName];
        if (!providerConfig || !providerConfig.proxies) {
            return [];
        }

        return Object.entries(providerConfig.proxies).map(([type, config]) => ({
            type,
            url: config.url,
            label: config.label,
            description: config.description || ''
        }));
    }

    // Export to global scope
    window.appConfig = {
        CONFIG,
        get,
        set,
        isFeatureEnabled,
        getTimezoneAbbr,
        getVersionHash,
        getVersionClass,
        getProxyUrl,
        getAvailableProxies
    };

    console.log('app-config.js: initialized');
})();

