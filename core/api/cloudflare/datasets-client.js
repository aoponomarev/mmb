/**
 * #JS-Mq23dkJ1
 * @description Browser client for time series and metrics via Cloudflare Workers API; JWT auth, batch support.
 * @skill id:sk-02d3ea
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * FEATURES:
 * - Automatic Authorization header with JWT token
 * - Network and auth error handling
 * - Batch operation support for data persistence
 *
 * NOTE: R2 storage deferred; endpoints return stubs until R2 activation.
 */

(function() {
    'use strict';

    // Dependencies (loaded before this script)
    // - #JS-4r2GQb12 (cloudflare-config.js) (window.cloudflareConfig)
    // - #JS-He2SJ9Dp (auth-client.js) (window.authClient)

    if (typeof window.cloudflareConfig === 'undefined') {
        console.error('datasets-client.js: cloudflareConfig not loaded');
        return;
    }

    if (typeof window.authClient === 'undefined') {
        console.error('datasets-client.js: authClient not loaded');
        return;
    }

    /**
     * Get headers for authenticated request
     * @returns {Promise<Object>} Headers object or null on auth error
     */
    async function getAuthHeaders() {
        const tokenData = await window.authClient.getAccessToken();
        if (!tokenData || !tokenData.access_token) {
            return null;
        }

        return {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Execute authenticated fetch request
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options (method, body, etc.)
     * @returns {Promise<Response>} HTTP response
     */
    async function fetchWithAuth(url, options = {}) {
        const headers = await getAuthHeaders();
        if (!headers) {
            throw new Error('Не авторизован. Выполните вход через Google OAuth.');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {}),
            },
        });

        // Check for auth error
        if (response.status === 401) {
            if (window.authClient && typeof window.authClient.logout === 'function') {
                await window.authClient.logout();
            }
            throw new Error('Токен истёк или невалиден. Выполните повторный вход.');
        }

        return response;
    }

    /**
     * Get time series for coin and date
     * @param {string} coin - Coin ID
     * @param {string} date - Date (format: YYYY-MM-DD)
     * @returns {Promise<Array>} Time series points array
     * @throws {Error} On network or auth error
     */
    async function getTimeSeries(coin, date) {
        try {
            if (!coin || !date) {
                throw new Error('ID монеты и дата обязательны');
            }

            const url = window.cloudflareConfig.getDatasetsEndpoint('timeSeries', { coin, date });
            if (!url) {
                throw new Error('Не удалось получить URL for временных рядов');
            }

            const response = await fetchWithAuth(url, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Check for stub (R2 not available)
            if (data.message && data.message.includes('R2 storage is not available')) {
                console.warn('datasets-client.getTimeSeries: R2 хранилище не доступно');
                return [];
            }

            return data.data || [];
        } catch (error) {
            console.error('datasets-client.getTimeSeries error:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'datasets-client.getTimeSeries',
                    userMessage: 'Ошибка при загрузке временных рядов'
                });
            }
            throw error;
        }
    }

    /**
     * Save time series (batch)
     * @param {Array} timeSeriesData - Time series data array
     * @returns {Promise<boolean>} Operation success
     * @throws {Error} On network or auth error
     */
    async function saveTimeSeries(timeSeriesData) {
        try {
            if (!Array.isArray(timeSeriesData) || timeSeriesData.length === 0) {
                throw new Error('Массив данных временных рядов обязателен');
            }

            const url = window.cloudflareConfig.getDatasetsEndpoint('timeSeries');
            if (!url) {
                throw new Error('Не удалось получить URL for сохранения временных рядов');
            }

            const response = await fetchWithAuth(url, {
                method: 'POST',
                body: JSON.stringify(timeSeriesData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Check for stub (R2 not available)
            if (data.message && data.message.includes('R2 storage is not available')) {
                console.warn('datasets-client.saveTimeSeries: R2 хранилище не доступно');
                return false;
            }

            return data.success === true;
        } catch (error) {
            console.error('datasets-client.saveTimeSeries error:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'datasets-client.saveTimeSeries',
                    userMessage: 'Ошибка при сохранении временных рядов'
                });
            }
            throw error;
        }
    }

    /**
     * Get metrics for coin and date
     * @param {string} coin - Coin ID
     * @param {string} date - Date (format: YYYY-MM-DD)
     * @returns {Promise<Object>} Metrics object
     * @throws {Error} On network or auth error
     */
    async function getMetrics(coin, date) {
        try {
            if (!coin || !date) {
                throw new Error('ID монеты и дата обязательны');
            }

            const url = window.cloudflareConfig.getDatasetsEndpoint('metrics', { coin, date });
            if (!url) {
                throw new Error('Не удалось получить URL for metrics');
            }

            const response = await fetchWithAuth(url, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Check for stub (R2 not available)
            if (data.message && data.message.includes('R2 storage is not available')) {
                console.warn('datasets-client.getMetrics: R2 хранилище не доступно');
                return {};
            }

            return data.data || {};
        } catch (error) {
            console.error('datasets-client.getMetrics error:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'datasets-client.getMetrics',
                    userMessage: 'Ошибка при загрузке metrics'
                });
            }
            throw error;
        }
    }

    /**
     * Save metrics (batch)
     * @param {Array} metricsData - Metrics data array
     * @returns {Promise<boolean>} Operation success
     * @throws {Error} On network or auth error
     */
    async function saveMetrics(metricsData) {
        try {
            if (!Array.isArray(metricsData) || metricsData.length === 0) {
                throw new Error('Массив данных metrics обязателен');
            }

            const url = window.cloudflareConfig.getDatasetsEndpoint('metrics');
            if (!url) {
                throw new Error('Не удалось получить URL for сохранения metrics');
            }

            const response = await fetchWithAuth(url, {
                method: 'POST',
                body: JSON.stringify(metricsData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Check for stub (R2 not available)
            if (data.message && data.message.includes('R2 storage is not available')) {
                console.warn('datasets-client.saveMetrics: R2 хранилище не доступно');
                return false;
            }

            return data.success === true;
        } catch (error) {
            console.error('datasets-client.saveMetrics error:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'datasets-client.saveMetrics',
                    userMessage: 'Ошибка при сохранении metrics'
                });
            }
            throw error;
        }
    }

    // Export functions via window for use in other modules
    window.datasetsClient = {
        getTimeSeries,
        saveTimeSeries,
        getMetrics,
        saveMetrics,
    };

    console.log('datasets-client.js: initialized');
})();
