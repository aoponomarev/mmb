/**
 * ================================================================================================
 * COIN SETS CLIENT - Клиент для работы с API пользовательских наборов монет
 * ================================================================================================
 *
 * ЦЕЛЬ: Взаимодействие с Cloudflare Workers API для управления наборами монет.
 *
 * Skill: core/skills/config-contracts
 *
 * МЕТОДЫ:
 * - getCoinSets(activeOnly) - Получить список наборов пользователя
 * - getCoinSet(id) - Получить набор по ID
 * - createCoinSet(data) - Создать новый набор
 * - updateCoinSet(id, data) - Обновить набор
 * - deleteCoinSet(id) - Удалить набор
 * - toggleCoinSet(id, isActive) - Архивировать/разархивировать набор
 *
 * ЗАВИСИМОСТИ:
 * - authClient (для получения токена)
 * - cloudflareConfig (для получения API URL)
 *
 * ИСПОЛЬЗОВАНИЕ:
 * const sets = await window.coinSetsClient.getCoinSets();
 * const newSet = await window.coinSetsClient.createCoinSet({ name: 'My Set', coin_ids: ['bitcoin'] });
 *
 * ССЫЛКИ:
 * - Workers API: cloud/cloudflare/workers/src/coin-sets.js
 * - D1 Helpers: cloud/cloudflare/workers/src/utils/d1-helpers.js
 * - Portfolios Client (аналогия): core/api/cloudflare/portfolios-client.js
 */

(function() {
    'use strict';

    /**
     * Клиент для работы с API наборов монет
     */
    class CoinSetsClient {
        constructor() {
            this.baseUrl = null;
            this.init();
        }

        /**
         * Инициализация базового URL
         */
        init() {
            if (window.cloudflareConfig && window.cloudflareConfig.getWorkersBaseUrl) {
                // Coin sets — защищенный API, должен использовать тот же origin, что и OAuth callback.
                this.baseUrl = window.cloudflareConfig.getAuthBaseUrl
                    ? window.cloudflareConfig.getAuthBaseUrl()
                    : window.cloudflareConfig.getWorkersBaseUrl();
                console.log('coin-sets-client: cloudflareConfig загружен, используется защищенный URL:', this.baseUrl);
            } else {
                // @exception anti-calque: legacy worker URL used as fallback until OAuth redirect migrated to app-api
                console.warn('coin-sets-client: cloudflareConfig not loaded, using fallback URL');
                this.baseUrl = 'https://mbb-api.ponomarev-ux.workers.dev';
            }
        }

        resolveBaseUrl() {
            try {
                if (window.cloudflareConfig && typeof window.cloudflareConfig.getAuthBaseUrl === 'function') {
                    return window.cloudflareConfig.getAuthBaseUrl();
                }
                if (window.authConfig && typeof window.authConfig.getRedirectUri === 'function') {
                    const redirectUri = window.authConfig.getRedirectUri();
                    if (redirectUri) {
                        return new URL(redirectUri).origin;
                    }
                }
            } catch (error) {
                console.warn('coin-sets-client: не удалось определить auth origin, используется init baseUrl', error);
            }
            return this.baseUrl;
        }

        /**
         * Получить токен авторизации
         * @returns {Promise<string|null>}
         */
        async getAuthToken() {
            if (!window.authClient) {
                throw new Error('authClient не загружен');
            }

            const tokenData = await window.authClient.getAccessToken();

            if (!tokenData || !tokenData.access_token) {
                throw new Error('Пользователь не авторизован');
            }

            return tokenData.access_token;
        }

        /**
         * Получить список наборов монет пользователя
         * @param {Object} options - Параметры фильтрации { activeOnly, type }
         * @returns {Promise<Array>} Массив наборов монет
         */
        async getCoinSets(options = {}) {
            const { activeOnly = false, type = null } = options;
            try {
                const token = await this.getAuthToken();
                const baseUrl = this.resolveBaseUrl();
                const url = new URL(`${baseUrl}/api/coin-sets`);
                if (activeOnly) {
                    url.searchParams.append('active_only', 'true');
                }
                if (type) {
                    url.searchParams.append('type', type);
                }

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to fetch coin sets');
                }

                const data = await response.json();
                return data.coin_sets || [];
            } catch (error) {
                console.error('coin-sets-client.getCoinSets error:', error);
                throw error;
            }
        }

        /**
         * Получить набор монет по ID
         * @param {number} id - ID набора
         * @returns {Promise<Object>} Набор монет
         */
        async getCoinSet(id) {
            try {
                const token = await this.getAuthToken();
                const baseUrl = this.resolveBaseUrl();

                const response = await fetch(`${baseUrl}/api/coin-sets/${id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to fetch coin set');
                }

                const data = await response.json();
                return data.coin_set;
            } catch (error) {
                console.error('coin-sets-client.getCoinSet error:', error);
                throw error;
            }
        }

        /**
         * Создать новый набор монет
         * @param {Object} coinSetData - Данные набора { name, description, coin_ids, is_active, provider, type }
         * @returns {Promise<Object>} Созданный набор
         */
        async createCoinSet(coinSetData) {
            try {
                const token = await this.getAuthToken();
                const baseUrl = this.resolveBaseUrl();

                const response = await fetch(`${baseUrl}/api/coin-sets`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(coinSetData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to create coin set');
                }

                const data = await response.json();
                return data.coin_set;
            } catch (error) {
                console.error('coin-sets-client.createCoinSet error:', error);
                throw error;
            }
        }

        /**
         * Обновить набор монет
         * @param {number} id - ID набора
         * @param {Object} updates - Обновляемые поля
         * @returns {Promise<Object>} Обновлённый набор
         */
        async updateCoinSet(id, updates) {
            try {
                const token = await this.getAuthToken();
                const baseUrl = this.resolveBaseUrl();

                const response = await fetch(`${baseUrl}/api/coin-sets/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updates)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to update coin set');
                }

                const data = await response.json();
                return data.coin_set;
            } catch (error) {
                console.error('coin-sets-client.updateCoinSet error:', error);
                throw error;
            }
        }

        /**
         * Удалить набор монет
         * @param {number} id - ID набора
         * @returns {Promise<boolean>} Успех операции
         */
        async deleteCoinSet(id) {
            try {
                const token = await this.getAuthToken();
                const baseUrl = this.resolveBaseUrl();

                const response = await fetch(`${baseUrl}/api/coin-sets/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to delete coin set');
                }

                return true;
            } catch (error) {
                console.error('coin-sets-client.deleteCoinSet error:', error);
                throw error;
            }
        }

        /**
         * Архивировать/разархивировать набор монет
         * @param {number} id - ID набора
         * @param {boolean} isActive - true = разархивировать, false = архивировать
         * @returns {Promise<Object>} Обновлённый набор
         */
        async toggleCoinSet(id, isActive) {
            try {
                const token = await this.getAuthToken();
                const baseUrl = this.resolveBaseUrl();

                const response = await fetch(`${baseUrl}/api/coin-sets/${id}/toggle`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ is_active: isActive })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to toggle coin set');
                }

                const data = await response.json();
                return data.coin_set;
            } catch (error) {
                console.error('coin-sets-client.toggleCoinSet error:', error);
                throw error;
            }
        }
    }

    // Экспорт
    window.coinSetsClient = new CoinSetsClient();
    console.log('✅ coin-sets-client loaded');
})();
