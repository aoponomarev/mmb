/**
 * ================================================================================================
 * POSTGRES CONFIG - Конфигурация API слоя для Yandex Cloud PostgreSQL
 * ================================================================================================
 * Skill: a/skills/app/skills/integrations/integrations-postgres.md
 *
 * ЦЕЛЬ: Единый источник правды для параметров API слоя PostgreSQL.
 * Base URL и endpoints для health/portfolios/snapshots и др.
 *
 * ПРИНЦИПЫ:
 * - Все endpoints определяются здесь и используются везде
 * - Запрещено дублировать значения в компонентах или API клиентах
 * - Использовать функции-геттеры вместо прямого доступа к CONFIG
 *
 * ССЫЛКИ:
 * - План реконструкции: RECONSTRUCTION_PLAN_260115.md (Этап 3)
 * - Архитектурный план: a/skills/app/skills/architecture/architecture-core-stack.md
 */

(function() {
    'use strict';

    const CONFIG = {
        api: {
            // Боевой API Gateway по умолчанию (если локальный кэш пуст/сброшен)
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
        // Если эндпоинт уже является полным URL, возвращаем его как есть
        if (typeof endpoint === 'string' && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
            return endpoint;
        }

        let baseUrl = getApiBaseUrl();
        if (!baseUrl) {
            return null;
        }
        // Убираем слэш в конце baseUrl
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        // Убираем слэш в начале endpoint
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

        const fullUrl = `${baseUrl}/${cleanEndpoint}`;

        // Защита от дублирования эндпоинта (например, если пользователь ввел URL уже с /health)
        // Если эндпоинт - health, и URL уже заканчивается на /health, возвращаем baseUrl
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
