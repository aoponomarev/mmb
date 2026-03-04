/**
 * ================================================================================================
 * PORTFOLIOS CLIENT - API client for portfolios via Cloudflare Workers
 * ================================================================================================
 *
 * PURPOSE: Browser client for portfolio CRUD operations via Cloudflare Workers API.
 *
 * @skill-anchor core/skills/api-layer #for-layer-separation
 * @skill-anchor core/skills/data-providers-architecture #for-data-provider-interface
 *
 * FEATURES:
 * - Automatic Authorization header with JWT token
 * - Network and auth error handling
 * - Structured portfolio data return
 *
*/

(function() {
    'use strict';

    // Dependencies (loaded before this script)
    // - core/config/cloudflare-config.js (window.cloudflareConfig)
    // - core/api/cloudflare/auth-client.js (window.authClient)

    if (typeof window.cloudflareConfig === 'undefined') {
        console.error('portfolios-client.js: cloudflareConfig not loaded');
        return;
    }

    if (typeof window.authClient === 'undefined') {
        console.error('portfolios-client.js: authClient not loaded');
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
     * Get user portfolios list
     * @returns {Promise<Array>} Portfolios array
     * @throws {Error} On network or auth error
     */
    async function getPortfolios() {
        try {
            const url = window.cloudflareConfig.getPortfoliosEndpoint('list');
            if (!url) {
                throw new Error('Не удалось получить URL for списка портфелей');
            }

            const response = await fetchWithAuth(url, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.portfolios || [];
        } catch (error) {
            console.error('portfolios-client.getPortfolios error:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'portfolios-client.getPortfolios',
                    userMessage: 'Ошибка при загрузке портфелей'
                });
            }
            throw error;
        }
    }

    /**
     * Get portfolio by ID
     * @param {string|number} portfolioId - Portfolio ID
     * @returns {Promise<Object>} Portfolio
     * @throws {Error} On network, auth error, or portfolio not found
     */
    async function getPortfolio(portfolioId) {
        try {
            if (!portfolioId) {
                throw new Error('ID портфеля обязателен');
            }

            const url = window.cloudflareConfig.getPortfoliosEndpoint('get', portfolioId);
            if (!url) {
                throw new Error('Не удалось получить URL for портфеля');
            }

            const response = await fetchWithAuth(url, {
                method: 'GET',
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Портфель не найден');
                }
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.portfolio;
        } catch (error) {
            console.error('portfolios-client.getPortfolio error:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'portfolios-client.getPortfolio',
                    userMessage: 'Ошибка при загрузке портфеля'
                });
            }
            throw error;
        }
    }

    /**
     * Create new portfolio
     * @param {Object} portfolioData - Portfolio data { name, description, assets }
     * @returns {Promise<Object>} Created portfolio
     * @throws {Error} On network, auth, or validation error
     */
    async function createPortfolio(portfolioData) {
        try {
            if (!portfolioData || !portfolioData.name) {
                throw new Error('Название портфеля обязательно');
            }

            const url = window.cloudflareConfig.getPortfoliosEndpoint('create');
            if (!url) {
                throw new Error('Не удалось получить URL for создания портфеля');
            }

            const response = await fetchWithAuth(url, {
                method: 'POST',
                body: JSON.stringify({
                    name: portfolioData.name,
                    description: portfolioData.description || null,
                    assets: portfolioData.assets || [],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.portfolio;
        } catch (error) {
            console.error('portfolios-client.createPortfolio error:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'portfolios-client.createPortfolio',
                    userMessage: 'Ошибка при создании портфеля'
                });
            }
            throw error;
        }
    }

    /**
     * Update portfolio
     * @param {string|number} portfolioId - Portfolio ID
     * @param {Object} updates - Fields to update { name, description, assets }
     * @returns {Promise<Object>} Updated portfolio
     * @throws {Error} On network, auth error, or portfolio not found
     */
    async function updatePortfolio(portfolioId, updates) {
        try {
            if (!portfolioId) {
                throw new Error('ID портфеля обязателен');
            }

            if (!updates || Object.keys(updates).length === 0) {
                throw new Error('Необходимо указать хотя бы одно поле for обновления');
            }

            const url = window.cloudflareConfig.getPortfoliosEndpoint('update', portfolioId);
            if (!url) {
                throw new Error('Не удалось получить URL for обновления портфеля');
            }

            const response = await fetchWithAuth(url, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Портфель не найден или нет прав доступа');
                }
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.portfolio;
        } catch (error) {
            console.error('portfolios-client.updatePortfolio error:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'portfolios-client.updatePortfolio',
                    userMessage: 'Ошибка при обновлении портфеля'
                });
            }
            throw error;
        }
    }

    /**
     * Delete portfolio
     * @param {string|number} portfolioId - Portfolio ID
     * @returns {Promise<boolean>} Operation success
     * @throws {Error} On network, auth error, or portfolio not found
     */
    async function deletePortfolio(portfolioId) {
        try {
            if (!portfolioId) {
                throw new Error('ID портфеля обязателен');
            }

            const url = window.cloudflareConfig.getPortfoliosEndpoint('delete', portfolioId);
            if (!url) {
                throw new Error('Не удалось получить URL for удаления портфеля');
            }

            const response = await fetchWithAuth(url, {
                method: 'DELETE',
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Портфель не найден или нет прав доступа');
                }
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.success === true;
        } catch (error) {
            console.error('portfolios-client.deletePortfolio error:', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, {
                    context: 'portfolios-client.deletePortfolio',
                    userMessage: 'Ошибка при удалении портфеля'
                });
            }
            throw error;
        }
    }

    // Export functions via window for use in other modules
    window.portfoliosClient = {
        getPortfolios,
        getPortfolio,
        createPortfolio,
        updatePortfolio,
        deletePortfolio,
    };

    console.log('portfolios-client.js: initialized');
})();
