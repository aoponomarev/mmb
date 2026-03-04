/**
 * #JS-9mWnz9iK
 * @description Base client for Yandex Cloud PostgreSQL API; CRUD for hot data (portfolios, settings); Data Provider pattern.
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 */

(function() {
    'use strict';

    /**
     * Execute fetch request to API with error handling
     */
    async function request(endpoint, options = {}) {
        let url;
        if (window.postgresConfig?.getEndpointUrl) {
            url = window.postgresConfig.getEndpointUrl(endpoint);
        } else {
            // Fallback if config not loaded or missing function
            const isAbsolute = typeof endpoint === 'string' && (endpoint.startsWith('http://') || endpoint.startsWith('https://'));
            url = isAbsolute ? endpoint : `${window.postgresConfig?.getApiBaseUrl() || ''}${endpoint}`;
        }

        const method = (options.method || 'GET').toUpperCase();
        const hasBody = options.body !== undefined && options.body !== null;
        const headers = { ...(options.headers || {}) };

        // For GET without body do not set Content-Type to avoid CORS preflight
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
            // Do not log network errors for health check to console as Error,
            // to avoid alarming user during CORS testing.
            if (endpoint !== '/health') {
                console.error(`postgres-client: request failed (${endpoint})`, error);
            }
            throw error;
        }
    }

    /**
     * API health check
     */
    async function checkHealth() {
        return request('/health');
    }

    /**
     * Sync user profile
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
     * Get all user portfolios
     */
    async function getPortfolios(userId) {
        if (!userId) return [];
        const endpoint = `${window.postgresConfig?.getPortfoliosEndpoint() || '/api/portfolios'}?user_id=${userId}`;
        return request(endpoint);
    }

    /**
     * Create or update portfolio
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
     * Save snapshot
     */
    async function saveSnapshot(snapshot) {
        return request(window.postgresConfig?.getSnapshotsEndpoint() || '/api/snapshots', {
            method: 'POST',
            body: JSON.stringify(snapshot)
        });
    }

    /**
     * Save snapshot batch (market + assets + metrics)
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
