/**
 * #JS-ov24BAk6
 * @description SSOT for Yandex Cloud PostgreSQL API: base URL, health/portfolios/snapshots/models endpoints.
 * @skill id:sk-bb7c8e
 *
 * PURPOSE: Single place for API layer params; use getters, no duplication in components.
 *
 * REFERENCES:
 * - Architecture: id:sk-483943
 */

(function() {
    'use strict';

    const CONFIG = {
        api: {
            // Production API Gateway by default (when local cache is empty/reset)
            baseUrl: 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net',
            endpoints: {
                health: '/health',
                usersSync: '/api/users/sync',
                portfolios: '/api/portfolios',
                snapshots: '/api/snapshots',
                models: '/api/models'
            }
        }
    };

    function getApiBaseUrl() {
        return CONFIG.api.baseUrl;
    }

    function getEndpointUrl(endpoint) {
        // If endpoint is already a full URL, return as-is
        if (typeof endpoint === 'string' && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
            return endpoint;
        }

        let baseUrl = getApiBaseUrl();
        if (!baseUrl) {
            return null;
        }
        // Remove trailing slash from baseUrl
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        // Remove leading slash from endpoint
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

        const fullUrl = `${baseUrl}/${cleanEndpoint}`;

        // Prevent endpoint duplication (e.g. if user entered URL already with /health)
        // If endpoint is health and URL already ends with /health, return baseUrl
        if (cleanEndpoint === 'health' && baseUrl.endsWith('/health')) {
            return baseUrl;
        }

        return fullUrl;
    }

    function getHealthEndpoint() {
        return getEndpointUrl(CONFIG.api.endpoints.health);
    }

    function getUsersSyncEndpoint() {
        return getEndpointUrl(CONFIG.api.endpoints.usersSync);
    }

    function getPortfoliosEndpoint() {
        return getEndpointUrl(CONFIG.api.endpoints.portfolios);
    }

    function getSnapshotsEndpoint() {
        return getEndpointUrl(CONFIG.api.endpoints.snapshots);
    }

    function getModelsEndpoint() {
        return getEndpointUrl(CONFIG.api.endpoints.models);
    }

    function setApiBaseUrl(baseUrl) {
        CONFIG.api.baseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
    }

    window.postgresConfig = {
        getApiBaseUrl,
        getEndpointUrl,
        getHealthEndpoint,
        getUsersSyncEndpoint,
        getPortfoliosEndpoint,
        getSnapshotsEndpoint,
        getModelsEndpoint,
        setApiBaseUrl
    };
})();
