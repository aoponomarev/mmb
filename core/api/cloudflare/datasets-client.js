/**
 * ================================================================================================
 * DATASETS CLIENT - API клиент для работы с датасетами через Cloudflare Workers
 * ================================================================================================
 *
 * ЦЕЛЬ: Браузерный клиент для работы с временными рядами и метриками через Cloudflare Workers API.
 *
 * Skill: a/skills/app/skills/integrations/integrations-cloudflare-core.md
 *
 * ПРИНЦИПЫ:
 * - Единый источник правды: Использовать `cloudflare-config.js` для всех endpoints
 * - Авторизация: Использовать `auth-client.js` для получения токена
 * - Обработка ошибок: Использовать существующую систему обработки ошибок
 * - Модульность: Независимый модуль без зависимостей от UI компонентов
 *
 * ОСОБЕННОСТИ:
 * - Автоматическое добавление Authorization заголовка с JWT токеном
 * - Обработка ошибок сети и авторизации
 * - Поддержка batch операций для сохранения данных
 *
 * ПРИМЕЧАНИЕ: R2 хранилище отложено, поэтому endpoints возвращают заглушки.
 * После активации R2 будет реализована полная функциональность.
 *
 * ССЫЛКИ:
 * - Конфигурация Workers: core/config/cloudflare-config.js
 * - OAuth клиент: core/api/cloudflare/auth-client.js
 * - План интеграции: a/skills/app/skills/integrations/integrations-cloudflare-plan.md
 */

(function() {
    'use strict';

    // Зависимости (загружаются до этого скрипта)
    // - core/config/cloudflare-config.js (window.cloudflareConfig)
    // - core/api/cloudflare/auth-client.js (window.authClient)

    if (typeof window.cloudflareConfig === 'undefined') {
        console.error('datasets-client.js: cloudflareConfig не загружен');
        return;
    }

    if (typeof window.authClient === 'undefined') {
        console.error('datasets-client.js: authClient не загружен');
        return;
    }

    /**
     * Получить заголовки для авторизованного запроса
     * @returns {Promise<Object>} Объект с заголовками или null при ошибке авторизации
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
     * Выполнить авторизованный fetch запрос
     * @param {string} url - URL запроса
     * @param {Object} options - Опции fetch (method, body и т.д.)
     * @returns {Promise<Response>} HTTP ответ
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

        // Проверка на ошибку авторизации
        if (response.status === 401) {
            if (window.authClient && typeof window.authClient.logout === 'function') {
                await window.authClient.logout();
            }
            throw new Error('Токен истёк или невалиден. Выполните повторный вход.');
        }

        return response;
    }

    /**
     * Получить временные ряды для монеты и даты
     * @param {string} coin - ID монеты
     * @param {string} date - Дата (формат: YYYY-MM-DD)
     * @returns {Promise<Array>} Массив точек временного ряда
     * @throws {Error} При ошибке сети или авторизации
     */
    async function getTimeSeries(coin, date) {
        try {
            if (!coin || !date) {
                throw new Error('ID монеты и дата обязательны');
            }

            const url = window.cloudflareConfig.getDatasetsEndpoint('timeSeries', { coin, date });
            if (!url) {
                throw new Error('Не удалось получить URL для временных рядов');
            }

            const response = await fetchWithAuth(url, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Проверка на заглушку (R2 не доступен)
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
     * Сохранить временные ряды (batch)
     * @param {Array} timeSeriesData - Массив данных временных рядов
     * @returns {Promise<boolean>} Успех операции
     * @throws {Error} При ошибке сети или авторизации
     */
    async function saveTimeSeries(timeSeriesData) {
        try {
            if (!Array.isArray(timeSeriesData) || timeSeriesData.length === 0) {
                throw new Error('Массив данных временных рядов обязателен');
            }

            const url = window.cloudflareConfig.getDatasetsEndpoint('timeSeries');
            if (!url) {
                throw new Error('Не удалось получить URL для сохранения временных рядов');
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

            // Проверка на заглушку (R2 не доступен)
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
     * Получить метрики для монеты и даты
     * @param {string} coin - ID монеты
     * @param {string} date - Дата (формат: YYYY-MM-DD)
     * @returns {Promise<Object>} Объект с метриками
     * @throws {Error} При ошибке сети или авторизации
     */
    async function getMetrics(coin, date) {
        try {
            if (!coin || !date) {
                throw new Error('ID монеты и дата обязательны');
            }

            const url = window.cloudflareConfig.getDatasetsEndpoint('metrics', { coin, date });
            if (!url) {
                throw new Error('Не удалось получить URL для метрик');
            }

            const response = await fetchWithAuth(url, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Проверка на заглушку (R2 не доступен)
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
                    userMessage: 'Ошибка при загрузке метрик'
                });
            }
            throw error;
        }
    }

    /**
     * Сохранить метрики (batch)
     * @param {Array} metricsData - Массив данных метрик
     * @returns {Promise<boolean>} Успех операции
     * @throws {Error} При ошибке сети или авторизации
     */
    async function saveMetrics(metricsData) {
        try {
            if (!Array.isArray(metricsData) || metricsData.length === 0) {
                throw new Error('Массив данных метрик обязателен');
            }

            const url = window.cloudflareConfig.getDatasetsEndpoint('metrics');
            if (!url) {
                throw new Error('Не удалось получить URL для сохранения метрик');
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

            // Проверка на заглушку (R2 не доступен)
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
                    userMessage: 'Ошибка при сохранении метрик'
                });
            }
            throw error;
        }
    }

    // Экспорт функций через window для использования в других модулях
    window.datasetsClient = {
        getTimeSeries,
        saveTimeSeries,
        getMetrics,
        saveMetrics,
    };

    console.log('datasets-client.js: инициализирован');
})();
