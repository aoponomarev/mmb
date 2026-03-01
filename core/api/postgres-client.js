/**
 * ================================================================================================
 * POSTGRES CLIENT - Клиент for взаимодействия с API слоем PostgreSQL
 * ================================================================================================
 * Skill: core/skills/api-layer
 *
 * PURPOSE: Базовый клиент for CRUD операций с данными в Yandex Cloud PostgreSQL.
 * Реализует паттерн "Data Provider" for горячих данных (портфели, настройки).
 *
 * REFERENCES:
 * - users: id, email, created_at, settings (jsonb)
 * - portfolios: id, user_id, name, created_at, updated_at, settings (jsonb), model_mix (jsonb)
 * - snapshots: id, portfolio_id, type (market/assets/metrics), data (jsonb), created_at
 *
 * REFERENCES:
 * - Конфигурация: core/config/postgres-config.js
 * - План реконструкции: RECONSTRUCTION_PLAN_260115.md (Этап 3.2)
 */

(function() {
    'use strict';

    /**
     * Выполняет fetch запрос к API с обработкой ошибок
     */
    async function request(endpoint, options = {}) {
        let url;
        if (window.postgresConfig?.getEndpointUrl) {
            url = window.postgresConfig.getEndpointUrl(endpoint);
        } else {
            // Резервный механизм, если конфиг not loaded или не содержит функции
            const isAbsolute = typeof endpoint === 'string' && (endpoint.startsWith('http://') || endpoint.startsWith('https://'));
            url = isAbsolute ? endpoint : `${window.postgresConfig?.getApiBaseUrl() || ''}${endpoint}`;
        }

        const method = (options.method || 'GET').toUpperCase();
        const hasBody = options.body !== undefined && options.body !== null;
        const headers = { ...(options.headers || {}) };

        // Для GET без тела не задаем Content-Type, чтобы не триггерить CORS preflight
        if (hasBody && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const requestOptions = { ...options, method, headers };

        if (!url) {
            const missingBaseUrlError = new Error('postgres-client: sync skipped - missing api baseUrl');
            missingBaseUrlError.code = 'POSTGRES_SYNC_SKIPPED_MISSING_BASE_URL';
            throw missingBaseUrlError;
        }

        try {
            const response = await fetch(url, requestOptions);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `API Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            // Не логируем сетевые ошибки for health check в консоль как ошибки (Error),
            // чтобы не пугать пользователя при тестировании CORS.
            if (endpoint !== '/health') {
                console.error(`postgres-client: request failed (${endpoint})`, error);
            }
            throw error;
        }
    }

    /**
     * Проверка здоровья API
     */
    async function checkHealth() {
        return request('/health');
    }

    /**
     * Синхронизация профиля пользователя
     */
    async function syncUser(user) {
        if (!user || !user.id || !user.email) return null;
        const endpoint = window.postgresConfig?.getUsersSyncEndpoint() || '/api/users/sync';
        return request(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                id: user.id,
                email: user.email,
                name: user.name,
                settings: user.settings || {}
            })
        });
    }

    /**
     * Get все портфели пользователя
     */
    async function getPortfolios(userId) {
        if (!userId) return [];
        const endpoint = `${window.postgresConfig?.getPortfoliosEndpoint() || '/api/portfolios'}?user_id=${userId}`;
        return request(endpoint);
    }

    /**
     * Создать или обновить портфель
     */
    async function savePortfolio(portfolio, userId) {
        if (!userId || !portfolio) return null;
        return request(window.postgresConfig?.getPortfoliosEndpoint() || '/api/portfolios', {
            method: 'POST',
            body: JSON.stringify({
                id: portfolio.id,
                user_id: userId,
                name: portfolio.name,
                model_version_id: portfolio.settings?.modelId,
                settings: portfolio.settings,
                model_mix_json: portfolio.modelMix
            })
        });
    }

    /**
     * Сохранить снимок (snapshot)
     */
    async function saveSnapshot(snapshot) {
        return request(window.postgresConfig?.getSnapshotsEndpoint() || '/api/snapshots', {
            method: 'POST',
            body: JSON.stringify(snapshot)
        });
    }

    /**
     * Сохранить пакет снимков (market + assets + metrics)
     */
    async function saveSnapshotsBatch(batch) {
        return request('/api/snapshots/batch', {
            method: 'POST',
            body: JSON.stringify(batch)
        });
    }

    window.postgresClient = {
        checkHealth,
        syncUser,
        getPortfolios,
        savePortfolio,
        saveSnapshot,
        saveSnapshotsBatch
    };

    console.log('postgres-client.js: initialized');
})();
