/**
 * #JS-Nb3xmCJm
 * @description Cloudflare Workers API client for user coin sets: CRUD, archive/unarchive.
 * @skill id:sk-02d3ea
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * METHODS: getCoinSets(activeOnly), getCoinSet(id), createCoinSet(data), updateCoinSet(id, data), deleteCoinSet(id), toggleCoinSet(id, isActive).
 *
 * USAGE:
 * const sets = await window.coinSetsClient.getCoinSets();
 * const newSet = await window.coinSetsClient.createCoinSet({ name: 'My Set', coin_ids: ['bitcoin'] });
 */

(function() {
    'use strict';

    /**
     * Client for coin sets API
     */
    class CoinSetsClient {
        constructor() {
            this.baseUrl = null;
            this.init();
        }

        /**
         * Initialize base URL
         */
        init() {
            if (window.cloudflareConfig && window.cloudflareConfig.getWorkersBaseUrl) {
                // Coin sets — protected API, must use same origin as OAuth callback.
                this.baseUrl = window.cloudflareConfig.getAuthBaseUrl
                    ? window.cloudflareConfig.getAuthBaseUrl()
                    : window.cloudflareConfig.getWorkersBaseUrl();
                console.log('coin-sets-client: cloudflareConfig loaded, using protected URL:', this.baseUrl);
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
                console.warn('coin-sets-client: failed to determine auth origin, using init baseUrl', error);
            }
            return this.baseUrl;
        }

        /**
         * Get auth token
         * @returns {Promise<string|null>}
         */
        async getAuthToken() {
            if (!window.authClient) {
                throw new Error('authClient not loaded');
            }

            const tokenData = await window.authClient.getAccessToken();

            if (!tokenData || !tokenData.access_token) {
                throw new Error('User not authenticated');
            }

            return tokenData.access_token;
        }

        /**
         * Get user coin sets list
         * @param {Object} options - Filter params { activeOnly, type }
         * @returns {Promise<Array>} Coin sets array
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
         * Get coin set by ID
         * @param {number} id - Set ID
         * @returns {Promise<Object>} Coin set
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
         * Create new coin set
         * @param {Object} coinSetData - Set data { name, description, coin_ids, is_active, provider, type }
         * @returns {Promise<Object>} Created set
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
         * Update coin set
         * @param {number} id - Set ID
         * @param {Object} updates - Fields to update
         * @returns {Promise<Object>} Updated set
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
         * Delete coin set
         * @param {number} id - Set ID
         * @returns {Promise<boolean>} Operation success
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
         * Archive/unarchive coin set
         * @param {number} id - Set ID
         * @param {boolean} isActive - true = unarchive, false = archive
         * @returns {Promise<Object>} Updated set
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

    // Export
    window.coinSetsClient = new CoinSetsClient();
    console.log('✅ coin-sets-client loaded');
})();
