/**
 * #JS-Uq3gNwR1
 * @description Cloudflare KV client for user workspace: load/save via /api/settings (workspace field). Stateless, user-scoped via OAuth JWT.
 * // @skill-anchor id:sk-02d3ea #for-data-provider-interface
 *
 * METHODS: load(), save(workspaceObj).
 *
 * USAGE:
 * const ws = await window.cloudWorkspaceClient.load();
 * await window.cloudWorkspaceClient.save({ activeCoinSetIds: [...], activeModelId: '...' });
 */

(function() {
    'use strict';

    class CloudWorkspaceClient {
        constructor() {
            this.baseUrl = null;
            this._init();
        }

        _init() {
            // Workspace settings are served by Workers API base URL (app-api).
            if (window.cloudflareConfig && typeof window.cloudflareConfig.getWorkersBaseUrl === 'function') {
                this.baseUrl = window.cloudflareConfig.getWorkersBaseUrl();
            } else if (window.cloudflareConfig && typeof window.cloudflareConfig.getAuthBaseUrl === 'function') {
                this.baseUrl = window.cloudflareConfig.getAuthBaseUrl();
            } else {
                this.baseUrl = 'https://app-api.ponomarev-ux.workers.dev';
            }
        }

        _resolveBaseUrl() {
            try {
                if (window.cloudflareConfig && typeof window.cloudflareConfig.getWorkersBaseUrl === 'function') {
                    return window.cloudflareConfig.getWorkersBaseUrl();
                }
                if (window.cloudflareConfig && typeof window.cloudflareConfig.getAuthBaseUrl === 'function') {
                    return window.cloudflareConfig.getAuthBaseUrl();
                }
            } catch (_) { /* fallback */ }
            return this.baseUrl;
        }

        async _getAuthToken() {
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
         * Load workspace from Cloudflare KV (GET /api/settings → data.workspace)
         * @returns {Promise<Object|null>} workspace object or null
         */
        async load() {
            try {
                const token = await this._getAuthToken();
                const resolvedBaseUrl = this._resolveBaseUrl();
                const url = `${resolvedBaseUrl}/api/settings`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    console.warn('cloud-workspace-client: load failed, status', response.status);
                    return null;
                }

                const json = await response.json();
                const workspace = json?.data?.workspace;
                return (workspace && typeof workspace === 'object') ? workspace : null;
            } catch (error) {
                console.warn('cloud-workspace-client: load error:', error.message);
                return null;
            }
        }

        /**
         * Save workspace to Cloudflare KV (PUT /api/settings/workspace)
         * @param {Object} workspaceObj - workspace object matching DEFAULT_WORKSPACE structure
         * @returns {Promise<boolean>} success
         */
        async save(workspaceObj) {
            try {
                const token = await this._getAuthToken();
                const resolvedBaseUrl = this._resolveBaseUrl();
                const url = `${resolvedBaseUrl}/api/settings/workspace`;

                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ value: workspaceObj })
                });

                if (!response.ok) {
                    console.warn('cloud-workspace-client: save failed, status', response.status);
                    return false;
                }
                return true;
            } catch (error) {
                console.warn('cloud-workspace-client: save error:', error.message);
                return false;
            }
        }
    }

    window.cloudWorkspaceClient = new CloudWorkspaceClient();
})();
