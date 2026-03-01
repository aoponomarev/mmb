/**
 * ================================================================================================
 * PORTFOLIOS CLIENT - API клиент для работы с портфелями через Cloudflare Workers
 * ================================================================================================
 *
 * ЦЕЛЬ: Браузерный клиент для CRUD операций с портфелями через Cloudflare Workers API.
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
 * - Возврат структурированных данных портфелей
 *
 * ССЫЛКИ:
 * - Doc: docs/A_PORTFOLIO_SYSTEM.md, docs/A_CLOUDFLARE.md
 * - Конфигурация Workers: core/config/cloudflare-config.js
 * - OAuth клиент: core/api/cloudflare/auth-client.js
 * - Skill: core/skills/config-contracts
 * - Skill: core/skills/config-contracts
 */

(function() {
    'use strict';

    // Зависимости (загружаются до этого скрипта)
    // - core/config/cloudflare-config.js (window.cloudflareConfig)
    // - core/api/cloudflare/auth-client.js (window.authClient)

    if (typeof window.cloudflareConfig === 'undefined') {
        console.error('portfolios-client.js: cloudflareConfig не загружен');
        return;
    }

    if (typeof window.authClient === 'undefined') {
        console.error('portfolios-client.js: authClient не загружен');
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
     * Получить список портфелей пользователя
     * @returns {Promise<Array>} Массив портфелей
     * @throws {Error} При ошибке сети или авторизации
     */
    async function getPortfolios() {
        try {
            const url = window.cloudflareConfig.getPortfoliosEndpoint('list');
            if (!url) {
                throw new Error('Не удалось получить URL для списка портфелей');
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
     * Получить портфель по ID
     * @param {string|number} portfolioId - ID портфеля
     * @returns {Promise<Object>} Портфель
     * @throws {Error} При ошибке сети, авторизации или если портфель не найден
     */
    async function getPortfolio(portfolioId) {
        try {
            if (!portfolioId) {
                throw new Error('ID портфеля обязателен');
            }

            const url = window.cloudflareConfig.getPortfoliosEndpoint('get', portfolioId);
            if (!url) {
                throw new Error('Не удалось получить URL для портфеля');
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
     * Создать новый портфель
     * @param {Object} portfolioData - Данные портфеля { name, description, assets }
     * @returns {Promise<Object>} Созданный портфель
     * @throws {Error} При ошибке сети, авторизации или валидации
     */
    async function createPortfolio(portfolioData) {
        try {
            if (!portfolioData || !portfolioData.name) {
                throw new Error('Название портфеля обязательно');
            }

            const url = window.cloudflareConfig.getPortfoliosEndpoint('create');
            if (!url) {
                throw new Error('Не удалось получить URL для создания портфеля');
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
     * Обновить портфель
     * @param {string|number} portfolioId - ID портфеля
     * @param {Object} updates - Обновляемые поля { name, description, assets }
     * @returns {Promise<Object>} Обновлённый портфель
     * @throws {Error} При ошибке сети, авторизации или если портфель не найден
     */
    async function updatePortfolio(portfolioId, updates) {
        try {
            if (!portfolioId) {
                throw new Error('ID портфеля обязателен');
            }

            if (!updates || Object.keys(updates).length === 0) {
                throw new Error('Необходимо указать хотя бы одно поле для обновления');
            }

            const url = window.cloudflareConfig.getPortfoliosEndpoint('update', portfolioId);
            if (!url) {
                throw new Error('Не удалось получить URL для обновления портфеля');
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
     * Удалить портфель
     * @param {string|number} portfolioId - ID портфеля
     * @returns {Promise<boolean>} Успех операции
     * @throws {Error} При ошибке сети, авторизации или если портфель не найден
     */
    async function deletePortfolio(portfolioId) {
        try {
            if (!portfolioId) {
                throw new Error('ID портфеля обязателен');
            }

            const url = window.cloudflareConfig.getPortfoliosEndpoint('delete', portfolioId);
            if (!url) {
                throw new Error('Не удалось получить URL для удаления портфеля');
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

    // Экспорт функций через window для использования в других модулях
    window.portfoliosClient = {
        getPortfolios,
        getPortfolio,
        createPortfolio,
        updatePortfolio,
        deletePortfolio,
    };

    console.log('portfolios-client.js: инициализирован');
})();
