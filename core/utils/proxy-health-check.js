/**
 * ================================================================================================
 * PROXY HEALTH CHECK - Проверка доступности прокси
 * ================================================================================================
 *
 * ЦЕЛЬ: Проверка доступности прокси перед переключением или использованием.
 * Skill: a/skills/app/skills/integrations/integrations-api-proxy.md
 *
 * ИСПОЛЬЗОВАНИЕ:
 * const isAvailable = await window.proxyHealthCheck.check(url);
 * const result = await window.proxyHealthCheck.checkWithDetails(url);
 *
 * ССЫЛКИ:
 * - Конфигурация прокси: core/config/app-config.js
 */

(function() {
    'use strict';

    /**
     * Проверка доступности прокси
     */
    class ProxyHealthCheck {
        /**
         * Проверить доступность прокси (простая проверка)
         * @param {string} proxyUrl - URL прокси
         * @param {number} timeout - таймаут в миллисекундах (по умолчанию 5000)
         * @returns {Promise<boolean>} true если прокси доступен
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
         * Проверить доступность прокси с деталями
         * @param {string} proxyUrl - URL прокси
         * @param {number} timeout - таймаут в миллисекундах (по умолчанию 5000)
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
                // Используем AbortController для таймаута
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                // Отправляем OPTIONS запрос (preflight) для проверки CORS
                const response = await fetch(proxyUrl, {
                    method: 'OPTIONS',
                    signal: controller.signal,
                    headers: {
                        'Origin': window.location.origin || 'null'
                    }
                });

                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;

                // Проверяем статус ответа (200 или 204 для OPTIONS)
                const isOk = response.status === 200 || response.status === 204;

                // Проверяем наличие CORS заголовков
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
                    error: error.message || 'Неизвестная ошибка',
                    duration: duration
                };
            }
        }

        /**
         * Проверить доступность всех прокси для провайдера
         * @param {string} providerName - имя провайдера ('yandex')
         * @returns {Promise<Array<Object>>} Массив результатов проверки [{type, url, available, ...}]
         */
        async checkAllProxies(providerName) {
            if (!window.appConfig) {
                console.error('proxy-health-check: appConfig не загружен');
                return [];
            }

            const proxies = window.appConfig.getAvailableProxies(providerName);
            if (!proxies || proxies.length === 0) {
                return [];
            }

            // Проверяем все прокси параллельно
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

    // Экспорт в глобальную область
    window.proxyHealthCheck = new ProxyHealthCheck();

    console.log('proxy-health-check.js: инициализирован');
})();
