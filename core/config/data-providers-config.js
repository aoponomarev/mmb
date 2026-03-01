/**
 * ================================================================================================
 * DATA PROVIDERS CONFIG - Конфигурация провайдеров данных о монетах
 * ================================================================================================
 * Skill: a/skills/app/skills/integrations/integrations-data-providers.md
 *
 * ЦЕЛЬ: Централизованная конфигурация для всех провайдеров финансовых данных.
 * Аналогично AI провайдерам, но для источников данных о криптовалютах.
 *
 * ПРИНЦИПЫ:
 * - Единый источник правды для всех настроек провайдеров
 * - Поддержка множественных провайдеров (CoinGecko, CoinMarketCap, Binance и т.д.)
 * - Бесшовное переключение между провайдерами
 * - API ключи хранятся в localStorage (как для AI провайдеров)
 * - Провайдер по умолчанию и список доступных провайдеров
 *
 * ПРИНЦИПЫ:
 * {
 *   name: 'coingecko',                    // Внутреннее имя
 *   displayName: 'CoinGecko',             // Отображаемое имя
 *   baseUrl: 'https://api.coingecko.com', // Базовый URL API
 *   requiresApiKey: false,                // Требуется ли API ключ
 *   apiKeyUrl: 'https://...',             // URL для получения ключа
 *   rateLimit: {...},                     // Лимиты запросов
 *   timeout: 30000,                       // Таймаут запросов
 *   endpoints: {...},                     // Специфические эндпоинты
 *   features: [...]                       // Поддерживаемые возможности
 * }
 *
 * ХРАНЕНИЕ API КЛЮЧЕЙ:
 * - localStorage.getItem('data-provider-keys') - JSON объект с ключами
 * - Формат: { 'coingecko': 'key123', 'coinmarketcap': 'key456' }
 * - Управление через DataProviderManager
 *
 * ССЫЛКИ:
 * - Данные от внешних провайдеров версионируются в cache-manager
 * - Ключ: `coins-list-v${version}` (версия меняется при смене структуры данных)
 * - При смене провайдера структура может измениться → нужна новая версия
 *
 * ССЫЛКИ:
 * - AI Providers Config (аналогия): `a/skills/app/skills/integrations/integrations-ai-core.md`
 * - Data Provider Manager: core/api/data-provider-manager.js
 * - Base Data Provider: core/api/data-providers/base-provider.js
 * - Cache Manager: core/cache/cache-manager.js
 */

(function() {
    'use strict';

    /**
     * Конфигурация провайдеров данных о монетах
     */
    const CONFIG = {
        // Провайдер по умолчанию
        defaultProvider: 'coingecko',

        // Версия структуры данных (для кэширования)
        // Увеличивать при изменении нормализованного формата данных
        dataVersion: 1,

        // Доступные провайдеры
        providers: {
            coingecko: {
                name: 'coingecko',
                displayName: 'CoinGecko',
                description: 'Популярный агрегатор криптовалютных данных с бесплатным API',
                baseUrl: 'https://api.coingecko.com/api/v3',
                requiresApiKey: false, // Бесплатный tier не требует ключа
                apiKeyUrl: 'https://www.coingecko.com/en/api/pricing',
                rateLimit: {
                    // Реальный лимит публичного API CoinGecko: ~3 req/60s (скользящее окно).
                    // Протестировано опытным путём: безопасная задержка — 21s между запросами.
                    // С ключом Demo/Pro лимит значительно выше (500 req/min).
                    requestsPerMinute: 2,
                    requestsPerSecond: 0.048
                },
                timeout: 30000, // 30 секунд
                endpoints: {
                    coinsList: '/coins/list',
                    coinsMarkets: '/coins/markets',
                    search: '/search',
                    coin: '/coins/{id}'
                },
                features: [
                    'top-coins',        // Топ монет по капитализации/объему
                    'search',           // Поиск монет
                    'price-change',     // Изменение цены за периоды
                    'market-data',      // Рыночные данные
                    'icons'             // Иконки монет
                ],
                // Параметры для запросов
                defaultParams: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 100,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '1h,24h,7d,14d,30d,200d'
                }
            },
            'yandex-cache': {
                name: 'yandex-cache',
                displayName: 'Yandex Cloud Cache',
                description: 'Данные из PostgreSQL (Yandex Cloud), обновляются кроном каждые 15 минут',
                baseUrl: 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net',
                requiresApiKey: false,
                rateLimit: {
                    requestsPerMinute: 600,
                    requestsPerSecond: 10
                },
                timeout: 10000,
                endpoints: {
                    marketCache: '/api/coins/market-cache'
                },
                features: [
                    'top-coins',
                    'search',
                    'price-change',
                    'market-data',
                    'icons',
                    'instant-load'
                ]
            }
            // Будущие провайдеры:
            // coinmarketcap: { ... },
            // binance: { ... },
            // cryptocompare: { ... }
        }
    };

    /**
     * Получить конфигурацию провайдера по имени
     * @param {string} providerName - имя провайдера
     * @returns {Object|null} конфигурация провайдера или null
     */
    function getProviderConfig(providerName) {
        return CONFIG.providers[providerName] || null;
    }

    /**
     * Получить дефолтного провайдера
     * @returns {string} имя провайдера по умолчанию
     */
    function getDefaultProvider() {
        return CONFIG.defaultProvider;
    }

    /**
     * Получить список всех доступных провайдеров
     * @returns {Array<Object>} массив конфигураций провайдеров
     */
    function getAvailableProviders() {
        return Object.values(CONFIG.providers);
    }

    /**
     * Проверить, требуется ли API ключ для провайдера
     * @param {string} providerName - имя провайдера
     * @returns {boolean}
     */
    function requiresApiKey(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.requiresApiKey : false;
    }

    /**
     * Получить URL для получения API ключа
     * @param {string} providerName - имя провайдера
     * @returns {string|null}
     */
    function getApiKeyUrl(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.apiKeyUrl : null;
    }

    /**
     * Получить базовый URL провайдера
     * @param {string} providerName - имя провайдера
     * @returns {string|null}
     */
    function getBaseUrl(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.baseUrl : null;
    }

    /**
     * Получить таймаут для запросов провайдера
     * @param {string} providerName - имя провайдера
     * @returns {number} таймаут в миллисекундах
     */
    function getTimeout(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.timeout : 30000;
    }

    /**
     * Получить лимиты запросов провайдера
     * @param {string} providerName - имя провайдера
     * @returns {Object|null} объект с лимитами
     */
    function getRateLimit(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.rateLimit : null;
    }

    /**
     * Получить эндпоинты провайдера
     * @param {string} providerName - имя провайдера
     * @returns {Object|null} объект с эндпоинтами
     */
    function getEndpoints(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.endpoints : null;
    }

    /**
     * Получить параметры по умолчанию для запросов
     * @param {string} providerName - имя провайдера
     * @returns {Object|null} объект с параметрами
     */
    function getDefaultParams(providerName) {
        const config = getProviderConfig(providerName);
        return config ? config.defaultParams : null;
    }

    /**
     * Получить версию данных (для кэширования)
     * @returns {number}
     */
    function getDataVersion() {
        return CONFIG.dataVersion;
    }

    /**
     * Проверить, поддерживает ли провайдер определенную возможность
     * @param {string} providerName - имя провайдера
     * @param {string} feature - название возможности
     * @returns {boolean}
     */
    function supportsFeature(providerName, feature) {
        const config = getProviderConfig(providerName);
        return config ? config.features.includes(feature) : false;
    }

    // Экспорт в глобальную область
    window.dataProvidersConfig = {
        CONFIG,
        getProviderConfig,
        getDefaultProvider,
        getAvailableProviders,
        requiresApiKey,
        getApiKeyUrl,
        getBaseUrl,
        getTimeout,
        getRateLimit,
        getEndpoints,
        getDefaultParams,
        getDataVersion,
        supportsFeature
    };

    console.log('✅ dataProvidersConfig loaded');
})();
