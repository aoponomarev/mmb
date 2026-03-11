/**
 * @description Client for icon asset transport: load external images via Cloudflare proxy and publish PNG assets to GitHub Contents API.
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 * @skill-anchor id:sk-7cf3f7 #for-cloudflare-kv-proxy
 */

(function() {
    'use strict';

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

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = typeof reader.result === 'string' ? reader.result : '';
                const parts = result.split(',');
                if (parts.length < 2) {
                    reject(new Error('Failed to convert blob to base64'));
                    return;
                }
                resolve(parts[1]);
            };
            reader.onerror = () => reject(reader.error || new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
        });
    }

    class IconAssetsClient {
        constructor(options = {}) {
            this.fetchFn = resolveFetchFn(options.fetchFn);
            this.registry = window.adapterRegistry || null;
        }

        recordSuccess(providerName, operation, latencyMs) {
            this.registry?.recordSuccess?.('icon-assets', providerName, {
                operation,
                latencyMs
            });
        }

        recordFailure(providerName, operation, error, latencyMs) {
            this.registry?.recordFailure?.('icon-assets', providerName, {
                operation,
                latencyMs,
                errorMessage: error?.message || 'unknown'
            });
        }

        getProxyUrl(targetUrl) {
            if (!targetUrl) {
                throw new Error('Target URL is required');
            }
            const proxyUrl = window.cloudflareConfig?.getGenericProxyUrl?.(targetUrl);
            if (!proxyUrl) {
                throw new Error('Generic proxy URL is unavailable');
            }
            return proxyUrl;
        }

        async loadExternalBlob(targetUrl) {
            const startedAt = Date.now();
            try {
                const response = await this.fetchFn(this.getProxyUrl(targetUrl));
                if (!response.ok) {
                    const error = new Error('Failed to load icon through proxy');
                    error.status = response.status;
                    throw error;
                }
                this.recordSuccess('cloudflare-generic-proxy', 'loadExternalBlob', Date.now() - startedAt);
                return response.blob();
            } catch (error) {
                this.recordFailure('cloudflare-generic-proxy', 'loadExternalBlob', error, Date.now() - startedAt);
                throw error;
            }
        }

        async publishToGitHub(options = {}) {
            const token = String(options.token || '').trim();
            const repo = String(options.repo || '').trim();
            const assetPath = String(options.path || '').trim();
            const message = String(options.message || '').trim();
            const blob = options.blob;

            if (!token) throw new Error('GitHub token is required');
            if (!repo) throw new Error('GitHub repository is required');
            if (!assetPath) throw new Error('GitHub asset path is required');
            if (!blob) throw new Error('PNG blob is required');

            const startedAt = Date.now();
            const apiUrl = `https://api.github.com/repos/${repo}/contents/${assetPath}`;

            try {
                const content = await blobToBase64(blob);
                let sha = null;

                const checkRes = await this.fetchFn(apiUrl, {
                    headers: {
                        Authorization: `token ${token}`,
                        Accept: 'application/vnd.github+json'
                    }
                });

                if (checkRes.ok) {
                    const fileData = await checkRes.json();
                    sha = fileData?.sha || null;
                } else if (checkRes.status !== 404) {
                    const details = await checkRes.text().catch(() => '');
                    const error = new Error(`GitHub lookup failed: ${checkRes.status}${details ? ` ${details}` : ''}`);
                    error.status = checkRes.status;
                    throw error;
                }

                const response = await this.fetchFn(apiUrl, {
                    method: 'PUT',
                    headers: {
                        Authorization: `token ${token}`,
                        Accept: 'application/vnd.github+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message || `Update asset ${assetPath}`,
                        content,
                        sha
                    })
                });

                if (!response.ok) {
                    let details = '';
                    try {
                        const errorPayload = await response.json();
                        details = errorPayload?.message || JSON.stringify(errorPayload);
                    } catch (_) {
                        details = await response.text().catch(() => '');
                    }
                    const error = new Error(details || `GitHub upload failed: ${response.status}`);
                    error.status = response.status;
                    throw error;
                }

                this.recordSuccess('github-contents', 'publishToGitHub', Date.now() - startedAt);
                return response.json();
            } catch (error) {
                this.recordFailure('github-contents', 'publishToGitHub', error, Date.now() - startedAt);
                throw error;
            }
        }
    }

    window.iconAssetsClient = new IconAssetsClient();
})();
