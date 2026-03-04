/**
 * ================================================================================================
 * PROXY HEALTH CHECK - Proxy availability check
 * ================================================================================================
 *
 * PURPOSE: Check proxy availability before switching or using.
 * Skill: id:sk-7cf3f7
 *
 * USAGE:
 * const isAvailable = await window.proxyHealthCheck.check(url);
 * const result = await window.proxyHealthCheck.checkWithDetails(url);
 *
 * REFERENCES:
 * - Proxy configuration: core/config/app-config.js
 */

(function() {
    'use strict';

    /**
     * Proxy availability check
     */
    class ProxyHealthCheck {
        /**
         * Check proxy availability (simple check)
         * @param {string} proxyUrl - Proxy URL
         * @param {number} timeout - Timeout in milliseconds (default 5000)
         * @returns {Promise<boolean>} true if proxy is available
         */
        async check(proxyUrl, timeout = 5000) {
            try {
                const result = await this.checkWithDetails(proxyUrl, timeout);
                return result.available;
            } catch (error) {
                console.error('proxy-health-check: ошибка проверки доступности прокси:', error);
                return false;
            }
        }

        /**
         * Check proxy availability with details
         * @param {string} proxyUrl - Proxy URL
         * @param {number} timeout - Timeout in milliseconds (default 5000)
         * @returns {Promise<Object>} {available: boolean, status?: number, error?: string, duration?: number}
         */
        async checkWithDetails(proxyUrl, timeout = 5000) {
            if (!proxyUrl) {
                return {
                    available: false,
                    error: 'URL прокси не указан'
                };
            }

            const startTime = Date.now();

            try {
                // Use AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                // Send OPTIONS request (preflight) for CORS check
                const response = await fetch(proxyUrl, {
                    method: 'OPTIONS',
                    signal: controller.signal,
                    headers: {
                        'Origin': window.location.origin || 'null'
                    }
                });

                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;

                // Check response status (200 or 204 for OPTIONS)
                const isOk = response.status === 200 || response.status === 204;

                // Check presence of CORS headers
                const corsHeaders = {
                    'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
                    'Access-Control-Allow-Methods': response.headers.get('access-control-allow-methods')
                };
                const hasCorsHeaders = corsHeaders['Access-Control-Allow-Origin'] !== null;

                return {
                    available: isOk && hasCorsHeaders,
                    status: response.status,
                    corsHeaders: corsHeaders,
                    hasCorsHeaders: hasCorsHeaders,
                    duration: duration
                };

            } catch (error) {
                const duration = Date.now() - startTime;

                if (error.name === 'AbortError') {
                    return {
                        available: false,
                        error: 'Таймаут проверки',
                        timeout: true,
                        duration: duration
                    };
                }

                if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                    return {
                        available: false,
                        error: 'Ошибка сети или CORS',
                        networkError: true,
                        duration: duration
                    };
                }

                return {
                    available: false,
                    error: error.message || 'Unknown error',
                    duration: duration
                };
            }
        }

        /**
         * Check availability of all proxies for provider
         * @param {string} providerName - Provider name ('yandex')
         * @returns {Promise<Array<Object>>} Array of check results [{type, url, available, ...}]
         */
        async checkAllProxies(providerName) {
            if (!window.appConfig) {
                console.error('proxy-health-check: appConfig not loaded');
                return [];
            }

            const proxies = window.appConfig.getAvailableProxies(providerName);
            if (!proxies || proxies.length === 0) {
                return [];
            }

            // Check all proxies in parallel
            const checks = proxies.map(async (proxy) => {
                const details = await this.checkWithDetails(proxy.url);
                return {
                    type: proxy.type,
                    url: proxy.url,
                    label: proxy.label,
                    description: proxy.description,
                    ...details
                };
            });

            return Promise.all(checks);
        }
    }

    // Export to global scope
    window.proxyHealthCheck = new ProxyHealthCheck();

    console.log('proxy-health-check.js: initialized');
})();
