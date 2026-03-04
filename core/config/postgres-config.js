/**
 * ================================================================================================
 * POSTGRES CONFIG - API layer configuration for Yandex Cloud PostgreSQL
 * ================================================================================================
 * Skill: id:sk-bb7c8e
 *
 * PURPOSE: SSOT for PostgreSQL API layer parameters.
 * Base URL and endpoints for health/portfolios/snapshots etc.
 *
 * PRINCIPLES:
 * - All endpoints are defined here and used everywhere
 * - Duplicating values in components or API clients is forbidden
 * - Use getter functions instead of direct CONFIG access
 *
 * REFERENCES:
 * - Reconstruction plan: RECONSTRUCTION_PLAN_260115.md (Phase 3)
 * - Architecture plan: id:sk-483943
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
