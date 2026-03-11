/**
 * @description Cloudflare /api/settings client for app settings restore/export flows; supports OAuth JWT and service-token auth.
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 * @skill-anchor id:sk-7b4ee5 #for-endpoint-coherence
 */

(function() {
    'use strict';

    const FALLBACK_BASE_URL = 'https://app-api.ponomarev-ux.workers.dev';
    const SERVICE_TOKEN_STORAGE_KEY = 'app_github_token';

    function resolveFetchFn(fetchFn) {
        const candidate = typeof fetchFn === 'function' ? fetchFn : globalThis.fetch;
        if (typeof candidate !== 'function') {
            throw new Error('fetch is unavailable');
        }
        if (typeof window !== 'undefined' && typeof window.fetch === 'function' && candidate === window.fetch) {
            return window.fetch.bind(window);
        }
        return (...args) => candidate(...args);
    }

    class CloudSettingsClient {
        constructor(options = {}) {
            this.fetchFn = resolveFetchFn(options.fetchFn);
            this.registry = window.adapterRegistry || null;
            this.baseUrl = FALLBACK_BASE_URL;
        }

        resolveBaseUrl() {
            try {
                if (window.cloudflareConfig && typeof window.cloudflareConfig.getAuthBaseUrl === 'function') {
                    return window.cloudflareConfig.getAuthBaseUrl();
                }
                if (window.cloudflareConfig && typeof window.cloudflareConfig.getWorkersBaseUrl === 'function') {
                    return window.cloudflareConfig.getWorkersBaseUrl();
                }
            } catch (_) {
                // fall back to default app-api URL
            }
            return this.baseUrl;
        }

        readStoredServiceToken() {
            try {
                return String(localStorage.getItem(SERVICE_TOKEN_STORAGE_KEY) || '').trim();
            } catch (_) {
                return '';
            }
        }

        persistServiceToken(token) {
            if (!token) return;
            try {
                localStorage.setItem(SERVICE_TOKEN_STORAGE_KEY, token);
            } catch (_) {
                // ignore storage failures
            }
        }

        async resolveJwtToken() {
            try {
                if (!window.authClient || typeof window.authClient.getAccessToken !== 'function') {
                    return '';
                }
                const tokenData = await window.authClient.getAccessToken();
                return String(tokenData?.access_token || '').trim();
            } catch (_) {
                return '';
            }
        }

        async resolveAuthToken(options = {}) {
            const jwtToken = await this.resolveJwtToken();
            if (jwtToken) {
                return { token: jwtToken, source: 'oauth-jwt' };
            }

            const explicitServiceToken = typeof options.serviceToken === 'string'
                ? options.serviceToken.trim()
                : '';
            const storedServiceToken = this.readStoredServiceToken();
            const backupServiceToken = typeof options.backupServiceToken === 'string'
                ? options.backupServiceToken.trim()
                : '';

            for (const candidate of [explicitServiceToken, storedServiceToken, backupServiceToken]) {
                if (!candidate) continue;
                if (options.persistResolvedToken !== false && candidate !== storedServiceToken) {
                    this.persistServiceToken(candidate);
                }
                return { token: candidate, source: 'service-token' };
            }

            return { token: '', source: null };
        }

        recordSuccess(operation, latencyMs, authSource) {
            this.registry?.recordSuccess?.('cloudflare-settings', 'cloudflare-settings', {
                operation,
                latencyMs,
                authSource
            });
        }

        recordFailure(operation, error, latencyMs, authSource) {
            this.registry?.recordFailure?.('cloudflare-settings', 'cloudflare-settings', {
                operation,
                latencyMs,
                authSource,
                errorMessage: error?.message || 'unknown'
            });
        }

        async requestJson(path, init = {}, options = {}) {
            const startedAt = Date.now();
            const operation = options.operation || path;
            let authSource = null;

            try {
                const auth = await this.resolveAuthToken(options.authOptions || {});
                authSource = auth.source;
                if (!auth.token) {
                    const error = new Error('Cloud settings auth token is missing');
                    error.code = 'SETTINGS_AUTH_MISSING';
                    throw error;
                }

                const headers = {
                    Accept: 'application/json',
                    Authorization: `Bearer ${auth.token}`,
                    ...(init.headers || {})
                };
                if (init.body !== undefined && init.body !== null && !headers['Content-Type']) {
                    headers['Content-Type'] = 'application/json';
                }

                const response = await this.fetchFn(`${this.resolveBaseUrl()}${path}`, {
                    ...init,
                    headers
                });

                if (!response.ok) {
                    let errorText = '';
                    try {
                        errorText = await response.text();
                    } catch (_) {
                        errorText = '';
                    }
                    const error = new Error(options.errorMessage || `Cloud settings request failed: ${response.status}`);
                    error.status = response.status;
                    error.responseText = errorText;
                    throw error;
                }

                this.recordSuccess(operation, Date.now() - startedAt, authSource);
                if (response.status === 204) {
                    return null;
                }
                return response.json();
            } catch (error) {
                this.recordFailure(operation, error, Date.now() - startedAt, authSource);
                throw error;
            }
        }

        async loadAll(authOptions = {}) {
            const json = await this.requestJson('/api/settings', { method: 'GET' }, {
                operation: 'loadSettings',
                errorMessage: 'Failed to load Cloudflare settings',
                authOptions
            });
            return (json?.data && typeof json.data === 'object') ? json.data : {};
        }

        async saveAll(payload, authOptions = {}) {
            return this.requestJson('/api/settings', {
                method: 'POST',
                body: JSON.stringify(payload || {})
            }, {
                operation: 'saveSettings',
                errorMessage: 'Failed to save Cloudflare settings',
                authOptions
            });
        }
    }

    window.cloudSettingsClient = new CloudSettingsClient();
})();
