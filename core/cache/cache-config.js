/**
 * ================================================================================================
 * CACHE CONFIG - Конфигурация кэширования
 * ================================================================================================
 * Skill: core/skills/cache-layer
 *
 * ЦЕЛЬ: Централизованное управление TTL, версиями схем и стратегиями кэширования.
 * Единый источник правды — запрещено дублировать значения TTL в компонентах.
 *
 * TTL (Time To Live) — объяснение значений:
 * - icons-cache: 1 час — иконки меняются редко, но могут обновиться (новые монеты, обновление дизайна)
 * - coins-list: 1 день — список монет стабилен, обновляется раз в день через API
 * - market-metrics: 1 час — метрики обновляются часто (цены меняются постоянно)
 * - api-cache: 5 минут — кэш API-ответов, быстрое устаревание для актуальности
 * - time-series: 1 час — временные ряды обновляются регулярно, час — баланс актуальности/производительности
 * - history: 1 день — история изменяется реже, день достаточен
 * - crypto-news-cache-max-age: 24 часа — максимальный возраст состояния новостей (не самих новостей)
 * - market-update-fallback: 3 часа — fallback при ошибке расчета времени обновления
 * - market-update-delay-max: 24 часа — максимальная задержка обновления метрик
 *
 * Без TTL (null) — постоянное хранение:
 * - Пользовательские данные (portfolios, strategies) — должны сохраняться
 * - Настройки (settings, theme, timezone) — пользователь не должен терять настройки
 * - API ключи и провайдеры — чувствительные данные, хранятся без срока
 *
 * ИСПОЛЬЗОВАНИЕ:
 * - cache-first: icons-cache, coins-list — данные стабильны, важна скорость доступа
 * - network-first: market-metrics, api-cache — актуальность критична, сначала запрос к сети
 * - stale-while-revalidate: time-series, history — показываем кэш, обновляем в фоне
 * - cache-only: portfolios, strategies, settings, API ключи — только локальные данные, нет источника обновления
 *
 * ИСПОЛЬЗОВАНИЕ:
 * Версионирование структуры данных пользовательских ключей (portfolios, strategies и т.д.).
 * При изменении структуры создается миграция в cache-migrations.js.
 * Версионирование схем отличается от версионирования приложения (префикс v:{hash}:).
 *
 * ИСПОЛЬЗОВАНИЕ:
 * cacheConfig.getTTL('coins-list') // 86400000 (1 день)
 * cacheConfig.getStrategy('icons-cache') // 'cache-first'
 * cacheConfig.getVersion('portfolios') // '1.0.0'
 *
 * ССЫЛКА: Общие принципы кэширования: core/skills/cache-layer
 */

(function() {
    'use strict';

    // Базовые интервалы времени
    const DURATIONS = window.ssot?.DURATIONS_MS || {
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000
    };

    const topCoinsContract = window.ssot && typeof window.ssot.getTopCoinsPolicy === 'function'
        ? window.ssot.getTopCoinsPolicy()
        : null;
    const TOP_COINS_REFRESH_WINDOW_MS = topCoinsContract && Number.isFinite(topCoinsContract.ttlMs)
        ? topCoinsContract.ttlMs
        : 2 * DURATIONS.HOUR;

    // Контракты/правила для ключевых потоков данных.
    const DATA_FLOW_CONTRACTS = {
        topCoins: {
            ttlMs: TOP_COINS_REFRESH_WINDOW_MS,
            uiStaleThresholdMs: TOP_COINS_REFRESH_WINDOW_MS,
            requestRegistryMinIntervalMs: TOP_COINS_REFRESH_WINDOW_MS,
            rationale: topCoinsContract?.rationale || 'top-coins-by-market-cap / top-coins-by-volume'
        }
    };

    // TTL в миллисекундах
    const TTL = {
        'icons-cache': 60 * 60 * 1000,           // 1 час
        'coins-list': 24 * DURATIONS.HOUR,       // 1 день
        'top-coins': 60 * 60 * 1000,             // 1 час (кэш максимальных наборов монет)
        'top-coins-by-market-cap': TOP_COINS_REFRESH_WINDOW_MS,  // 2 часа (топ 250 по капитализации)
        'top-coins-by-volume': TOP_COINS_REFRESH_WINDOW_MS,      // 2 часа (топ 250 по объему)
        'active-coin-set-data': TOP_COINS_REFRESH_WINDOW_MS,     // 2 часа (полные данные монет активного набора)
        'market-metrics': 60 * DURATIONS.HOUR,   // 1 час
        'vix-index': 24 * 60 * 60 * 1000,        // 24 часа (VIX индекс волатильности)
        'fear-greed-index': 24 * 60 * 60 * 1000,  // 24 часа (Fear & Greed Index)
        'api-cache': 5 * 60 * 1000,              // 5 минут
        'time-series': 60 * DURATIONS.HOUR,       // 1 час
        'history': 24 * DURATIONS.HOUR,           // 1 день
        'portfolios': null,                       // Без TTL (локальные данные)
        'strategies': null,                       // Без TTL (локальные данные)
        'settings': null,                         // Без TTL
        'theme': null,                            // Без TTL
        'timezone': null,                         // Без TTL
        'favorites': null,                        // Без TTL
        'ui-state': null,                         // Без TTL
        'ai-provider': null,                      // Без TTL (текущий провайдер: 'yandex')
        'yandex-api-key': null,                   // Без TTL (чувствительные данные)
        'yandex-folder-id': null,                 // Без TTL
        'yandex-model': null,                     // Без TTL
        'yandex-proxy-type': null,                // Без TTL (тип прокси для YandexGPT: 'yandex' и т.д.)
        'translation-language': null,              // Без TTL
        'crypto-news-cache-max-age': 24 * 60 * 60 * 1000,  // 24 часа - максимальный возраст кэша новостей
        'market-update-fallback': 3 * 60 * 60 * 1000,        // 3 часа - fallback при ошибке расчета времени обновления
        'market-update-delay-max': 24 * 60 * 60 * 1000      // 24 часа - максимальная задержка обновления метрик
    };

    // Версии схем данных
    const VERSIONS = {
        'icons-cache': '1.0.0',
        'coins-list': '1.0.0',
        'top-coins': '1.0.0',
        'top-coins-by-market-cap': '1.0.0',
        'top-coins-by-volume': '1.0.0',
        'market-metrics': '1.0.0',
        'vix-index': '1.0.0',
        'fear-greed-index': '1.0.0',
        'portfolios': '1.0.0',
        'strategies': '1.0.0',
        'time-series': '1.0.0',
        'history': '1.0.0'
    };

    // Стратегии кэширования
    const STRATEGIES = {
        'cache-first': ['icons-cache', 'coins-list', 'top-coins-by-market-cap', 'top-coins-by-volume', 'active-coin-set-data', 'vix-index', 'fear-greed-index'],
        'network-first': ['top-coins', 'market-metrics', 'api-cache'],
        'stale-while-revalidate': ['time-series', 'history'],
        'cache-only': ['portfolios', 'strategies', 'settings', 'theme', 'timezone', 'favorites', 'ui-state', 'ai-provider', 'yandex-api-key', 'yandex-folder-id', 'yandex-model', 'yandex-proxy-type', 'translation-language']
    };

    /**
     * Получить TTL для ключа
     * @param {string} key - ключ кэша
     * @returns {number|null} - TTL в миллисекундах или null
     */
    function getTTL(key) {
        return TTL[key] || null;
    }

    /**
     * Получить версию схемы для ключа
     * @param {string} key - ключ кэша
     * @returns {string} - версия
     */
    function getVersion(key) {
        return VERSIONS[key] || '1.0.0';
    }

    /**
     * Получить стратегию кэширования для ключа
     * @param {string} key - ключ кэша
     * @returns {string} - стратегия
     */
    function getStrategy(key) {
        for (const [strategy, keys] of Object.entries(STRATEGIES)) {
            if (keys.includes(key)) {
                return strategy;
            }
        }
        return 'network-first'; // По умолчанию
    }

    function getTopCoinsContract() {
        return DATA_FLOW_CONTRACTS.topCoins;
    }

    function getTopCoinsRefreshWindowMs() {
        return DATA_FLOW_CONTRACTS.topCoins.ttlMs;
    }

    function getTopCoinsUiStaleThresholdMs() {
        return DATA_FLOW_CONTRACTS.topCoins.uiStaleThresholdMs;
    }

    function getTopCoinsRequestIntervalMs() {
        return DATA_FLOW_CONTRACTS.topCoins.requestRegistryMinIntervalMs;
    }

    // Экспорт в глобальную область
    window.cacheConfig = {
        TTL,
        VERSIONS,
        STRATEGIES,
        DURATIONS,
        TOP_COINS_REFRESH_WINDOW_MS,
        DATA_FLOW_CONTRACTS,
        getTopCoinsContract,
        getTopCoinsRefreshWindowMs,
        getTopCoinsUiStaleThresholdMs,
        getTopCoinsRequestIntervalMs,
        getTTL,
        getVersion,
        getStrategy
    };

    console.log('cache-config.js: инициализирован');
})();

