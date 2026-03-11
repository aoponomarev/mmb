/**
 * #JS-Uq3gNwR1
 * @description Cloudflare KV client for user workspace: load/save via /api/settings (workspace field). Stateless, user-scoped via OAuth JWT.
 * @skill-anchor id:sk-02d3ea #for-data-provider-interface
 * @skill-anchor id:sk-7b4ee5 #for-endpoint-coherence
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
            this.registry = window.adapterRegistry || null;
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

        _recordSuccess(operation, latencyMs) {
            this.registry?.recordSuccess?.('cloudflare-workspace', 'cloudflare-workspace', { operation, latencyMs });
        }

        _recordFailure(operation, error, latencyMs) {
            this.registry?.recordFailure?.('cloudflare-workspace', 'cloudflare-workspace', {
                operation,
                latencyMs,
                errorMessage: error?.message || 'unknown'
            });
        }

        async _requestJson(path, init = {}, options = {}) {
            const startedAt = Date.now();
            try {
                const token = await this._getAuthToken();
                const resolvedBaseUrl = this._resolveBaseUrl();
                const response = await fetch(`${resolvedBaseUrl}${path}`, {
                    ...init,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        ...(init.headers || {})
                    }
                });

                if (!response.ok) {
                    const error = new Error(options.errorMessage || `Workspace request failed: ${response.status}`);
                    error.status = response.status;
                    throw error;
                }

                this._recordSuccess(options.operation || path, Date.now() - startedAt);
                if (response.status === 204) {
                    return null;
                }
                return response.json();
            } catch (error) {
                this._recordFailure(options.operation || path, error, Date.now() - startedAt);
                throw error;
            }
        }

        /**
         * Load workspace from Cloudflare KV (GET /api/settings → data.workspace)
         * @returns {Promise<Object|null>} workspace object or null
         */
        async load() {
            try {
                const json = await this._requestJson('/api/settings', { method: 'GET' }, {
                    operation: 'loadWorkspace',
                    errorMessage: 'Failed to load workspace'
                });
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
                await this._requestJson('/api/settings/workspace', {
                    method: 'PUT',
                    body: JSON.stringify({ value: workspaceObj })
                }, {
                    operation: 'saveWorkspace',
                    errorMessage: 'Failed to save workspace'
                });
                return true;
            } catch (error) {
                console.warn('cloud-workspace-client: save error:', error.message);
                return false;
            }
        }
    }

    window.cloudWorkspaceClient = new CloudWorkspaceClient();
})();
