/**
 * ================================================================================================
 * CLOUDFLARE CONFIG - Конфигурация Cloudflare Workers API
 * ================================================================================================
 * Skill: core/skills/config-contracts
 *
 * ЦЕЛЬ: Единый источник правды для всех параметров Cloudflare Workers API.
 * Base URL, endpoints для portfolios, datasets, auth.
 *
 * ПРИНЦИПЫ:
 * - Все endpoints определяются здесь и используются везде
 * - Запрещено дублировать значения в компонентах или API клиентах
 * - Использовать функции-геттеры вместо прямого доступа к CONFIG
 * - Проверка наличия конфигурации при инициализации
 *
 * ПРИНЦИПЫ:
 * {
 *   workers: {
 *     baseUrl: '...',
 *     endpoints: {
 *       auth: {...},
 *       portfolios: {...},
 *       datasets: {...}
 *     }
 *   }
 * }
 *
 * ССЫЛКИ:
 * - Принципы единого источника правды: `app/skills/ux-principles`
 * - План интеграции: `core/skills/config-contracts`
 * - Cloudflare инфраструктура: `core/skills/config-contracts`
 */

(function() {
    'use strict';

    /**
     * Конфигурация Cloudflare Workers
     */
    const CONFIG = {
        workers: {
            // Base URL Cloudflare Worker
            baseUrl: 'https://app-api.ponomarev-ux.workers.dev',

            // Endpoints для различных API
            endpoints: {
                // Auth endpoints
                auth: {
                    google: '/auth/google',              // Инициация Google OAuth
                    callback: '/auth/callback',           // OAuth callback
                    logout: '/auth/logout',              // Выход
                    me: '/auth/me'                       // Получение текущего пользователя
                },

                // Portfolios API endpoints
                portfolios: {
                    list: '/api/portfolios',             // GET - список портфелей
                    get: '/api/portfolios',               // GET /api/portfolios/:id - получение портфеля
                    create: '/api/portfolios',           // POST - создание портфеля
                    update: '/api/portfolios',           // PUT /api/portfolios/:id - обновление портфеля
                    delete: '/api/portfolios'            // DELETE /api/portfolios/:id - удаление портфеля
                },

                // Datasets API endpoints
                datasets: {
                    timeSeries: '/api/datasets/time-series',      // GET/POST - временные ряды
                    metrics: '/api/datasets/metrics',             // GET/POST - метрики
                    snapshots: '/api/datasets/snapshots'          // GET/POST - снимки данных
                },

                // API Proxy endpoints (для обхода CORS на file://)
                proxy: {
                    coingecko: '/api/coingecko',         // CoinGecko API proxy
                    yahooFinance: '/api/yahoo-finance',  // Yahoo Finance API proxy
                    stooq: '/api/stooq',                 // Stooq API proxy
                    generic: '/api/proxy'                // Generic URL proxy (images, etc)
                },

                // Messages API endpoints (DEPRECATED - сообщения теперь в хардкоде)
                // messages: {
                //     module: '/api/messages',                      // GET ?module={module}&version={version} - получение модуля
                //     list: '/api/messages/list',                   // GET - список доступных модулей
                //     version: '/api/messages/version'              // GET - текущая версия датасета
                // },

                // App Settings API (KV-backed, replaces continue-wrapper snapshots)
                settings: '/api/settings',               // GET/POST - все настройки

                // Health check
                health: '/health'                         // GET - проверка работоспособности Worker
            }
        }
    };

    /**
     * Получить base URL Cloudflare Worker
     * @returns {string} Base URL
     */
    function getWorkersBaseUrl() {
        return CONFIG.workers.baseUrl;
    }

    /**
     * Получить base URL для auth flow.
     * Источник истины - origin из authConfig.getRedirectUri(), чтобы callback и проверка токена
     * всегда шли через один и тот же Worker.
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
            console.warn('cloudflare-config.getAuthBaseUrl: не удалось определить auth origin из redirect_uri', error);
        }
        return getWorkersBaseUrl();
    }

    /**
     * Получить полный URL для endpoint
     * @param {string} endpoint - Путь endpoint (например, '/auth/google')
     * @returns {string} Полный URL
     */
    function getEndpointUrl(endpoint) {
        const baseUrl = getWorkersBaseUrl();
        // Убираем ведущий слэш, если есть
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        const fullUrl = `${baseUrl}/${cleanEndpoint}`;
        return fullUrl;
    }

    /**
     * Получить URL для auth endpoints
     * @param {string} action - Действие ('google', 'callback', 'logout', 'me')
     * @returns {string} Полный URL для endpoint
     */
    function getAuthEndpoint(action) {
        const endpoint = CONFIG.workers.endpoints.auth[action];
        if (!endpoint) {
            console.warn(`cloudflare-config.getAuthEndpoint: неизвестное действие "${action}"`);
            return null;
        }
        const baseUrl = getAuthBaseUrl();
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        return `${baseUrl}/${cleanEndpoint}`;
    }

    /**
     * Получить URL для portfolios endpoints
     * @param {string} action - Действие ('list', 'get', 'create', 'update', 'delete')
     * @param {string|number} id - ID портфеля (опционально, для get, update, delete)
     * @returns {string} Полный URL для endpoint
     */
    function getPortfoliosEndpoint(action, id = null) {
        const endpoint = CONFIG.workers.endpoints.portfolios[action];
        if (!endpoint) {
            console.warn(`cloudflare-config.getPortfoliosEndpoint: неизвестное действие "${action}"`);
            return null;
        }

        let url = getEndpointUrl(endpoint);
        // Для get, update, delete добавляем ID в путь
        if (id && (action === 'get' || action === 'update' || action === 'delete')) {
            url = `${url}/${id}`;
        }

        return url;
    }

    /**
     * Получить URL для datasets endpoints
     * @param {string} type - Тип данных ('timeSeries', 'metrics', 'snapshots')
     * @param {Object} params - Параметры запроса (coin, date и т.д.)
     * @returns {string} Полный URL для endpoint
     */
    function getDatasetsEndpoint(type, params = {}) {
        const endpoint = CONFIG.workers.endpoints.datasets[type];
        if (!endpoint) {
            console.warn(`cloudflare-config.getDatasetsEndpoint: неизвестный тип "${type}"`);
            return null;
        }

        let url = getEndpointUrl(endpoint);

        // Добавляем параметры в путь, если указаны
        if (params.coin && params.date) {
            url = `${url}/${params.coin}/${params.date}`;
        } else if (params.coin) {
            url = `${url}/${params.coin}`;
        }

        // Добавляем query параметры, если есть
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
     * Получить URL для messages endpoints
     * ⚠️ DEPRECATED: Сообщения теперь в хардкоде, эндпоинты больше не используются.
     * Функция оставлена для обратной совместимости с messages-api.js (используется только для тестов).
     * @param {string} action - Действие ('module', 'list', 'version')
     * @param {Object} params - Параметры запроса (module, version для 'module')
     * @returns {string|null} Полный URL для endpoint или null
     */
    function getMessagesEndpoint(action, params = {}) {
        // Messages endpoints отключены - сообщения теперь в хардкоде
        if (!CONFIG.workers.endpoints.messages) {
            console.warn('cloudflare-config.getMessagesEndpoint: messages endpoints отключены (сообщения в хардкоде)');
            return null;
        }
        const endpoint = CONFIG.workers.endpoints.messages[action];
        if (!endpoint) {
            console.warn(`cloudflare-config.getMessagesEndpoint: неизвестное действие "${action}"`);
            return null;
        }

        let url = getEndpointUrl(endpoint);

        // Для 'module' добавляем query параметры
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
     * Получить URL для health check endpoint
     * @returns {string} Полный URL для health check
     */
    function getHealthEndpoint() {
        return getEndpointUrl(CONFIG.workers.endpoints.health);
    }

    /**
     * Получить URL для API proxy endpoint
     * @param {string} apiType - Тип API ('coingecko', 'yahooFinance', 'stooq', 'generic')
     * @param {string} path - Путь API (например, '/coins/markets') или пустая строка для generic
     * @param {Object} params - Query параметры (опционально)
     * @returns {string} Полный URL для proxy endpoint
     */
    function getApiProxyEndpoint(apiType, path, params = {}) {
        const endpoint = CONFIG.workers.endpoints.proxy[apiType];
        if (!endpoint) {
            console.warn(`cloudflare-config.getApiProxyEndpoint: неизвестный тип API "${apiType}"`);
            return null;
        }

        // Формируем URL: baseUrl + proxyEndpoint + apiPath
        let url = `${getWorkersBaseUrl()}${endpoint}${path}`;

        // Добавляем query параметры, если есть
        const queryParams = new URLSearchParams(params);
        if (queryParams.toString()) {
            url = `${url}?${queryParams.toString()}`;
        }

        return url;
    }

    /**
     * Получить URL для проксирования произвольного URL (для обхода CORS)
     * @param {string} targetUrl - Целевой URL
     * @returns {string} Прокси-URL
     */
    function getGenericProxyUrl(targetUrl) {
        return getApiProxyEndpoint('generic', '', { url: targetUrl });
    }

    /**
     * Проверить, что конфигурация инициализирована корректно
     * @returns {boolean} true если конфигурация валидна
     */
    function isValid() {
        return !!(
            CONFIG.workers.baseUrl &&
            CONFIG.workers.endpoints.auth &&
            CONFIG.workers.endpoints.portfolios &&
            CONFIG.workers.endpoints.datasets &&
            CONFIG.workers.endpoints.proxy
            // messages endpoints отключены (сообщения в хардкоде)
        );
    }

    // Проверка при инициализации
    if (!isValid()) {
        console.error('cloudflare-config.js: Конфигурация невалидна! Проверьте параметры.');
    }

    // Экспорт в глобальную область
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

    console.log('cloudflare-config.js: инициализирован');
})();
