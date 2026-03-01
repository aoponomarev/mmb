/**
 * ================================================================================================
 * DATA PROVIDER MANAGER - Менеджер для переключения между провайдерами данных
 * ================================================================================================
 * Skill: a/skills/app/skills/integrations/integrations-data-providers.md
 * Skill: a/skills/app/skills/integrations/integrations-rate-limiting.md
 *
 * ЦЕЛЬ: Единая точка доступа для работы с разными провайдерами данных о монетах
 * (CoinGecko, CoinMarketCap, Binance и т.д.). Управляет переключением между провайдерами
 * и предоставляет единый интерфейс.
 *
 * ПРИНЦИПЫ:
 * - Единый интерфейс для всех провайдеров
 * - Автоматическое получение настроек (API ключ) для текущего провайдера
 * - Бесшовное переключение между источниками данных
 * - Кэширование данных отдельно для каждого провайдера
 *
 * ОСОБЕННОСТИ:
 * - Дефолтный провайдер: CoinGecko
 * - Хранение текущего провайдера в cacheManager ('data-provider')
 * - Хранение API ключей отдельно для каждого провайдера в localStorage
 * - API ключи хранятся в JSON объекте: { 'coingecko': 'key123', 'coinmarketcap': 'key456' }
 *
 * ИСПОЛЬЗОВАНИЕ:
 * // Получить топ 10 монет через текущий провайдер
 * const coins = await window.dataProviderManager.getTopCoins(10);
 *
 * // Переключить провайдера
 * await window.dataProviderManager.setProvider('coingecko');
 *
 * // Получить текущий провайдер
 * const provider = await window.dataProviderManager.getCurrentProvider();
 *
 * // Установить API ключ для провайдера
 * await window.dataProviderManager.setApiKey('coingecko', 'my-api-key');
 *
 * ССЫЛКИ:
 * - AI Provider Manager (аналогия): core/api/ai-provider-manager.js
 * - Провайдеры: core/api/data-providers/
 * - Конфигурация: core/config/data-providers-config.js
 * - Кэш-менеджер: core/cache/cache-manager.js
 */

(function() {
    'use strict';

    /**
     * Менеджер провайдеров данных о монетах
     */
    class DataProviderManager {
        constructor() {
            this.providers = {};
            this.defaultProvider = 'coingecko'; // CoinGecko по умолчанию
            this.apiKeysStorageKey = 'data-provider-keys'; // Ключ для localStorage
        }

        isFileProtocol() {
            return Boolean(window.location && (
                window.location.protocol === 'file:' || 
                window.location.hostname.includes('github.io') || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1'
            ));
        }

        normalizeLimit(limit, fallback = 10) {
            const parsed = Number(limit);
            if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
            return Math.max(1, Math.floor(parsed));
        }

        getBanContext() {
            if (window.banCoinSet && typeof window.banCoinSet.getContext === 'function') {
                return window.banCoinSet.getContext();
            }
            return { bannedIds: new Set(), bannedTickers: new Set() };
        }

        isCoinBanned(coin) {
            const { bannedIds, bannedTickers } = this.getBanContext();
            const coinId = String(coin?.id || coin?.coinId || '').trim();
            const ticker = String(coin?.symbol || coin?.ticker || '').trim().toLowerCase();
            return (coinId && bannedIds.has(coinId)) || (ticker && bannedTickers.has(ticker));
        }

        filterCoinsByBan(coins) {
            if (!Array.isArray(coins) || coins.length === 0) return [];
            return coins.filter(coin => !this.isCoinBanned(coin));
        }

        /**
         * Инициализация провайдеров
         * Вызывается после загрузки всех провайдеров
         */
        init() {
            if (window.CoinGeckoProvider) {
                this.providers['coingecko'] = new window.CoinGeckoProvider();
            }
            if (window.YandexCacheProvider) {
                this.providers['yandex-cache'] = new window.YandexCacheProvider();
            }
            // Будущие провайдеры:
            // if (window.CoinMarketCapProvider) {
            //     this.providers['coinmarketcap'] = new window.CoinMarketCapProvider();
            // }
        }

        /**
         * Получить текущий активный провайдер
         * @returns {Promise<BaseDataProvider>}
         */
        async getCurrentProvider() {
            const providerName = await this.getCurrentProviderName();
            return this.providers[providerName] || this.providers[this.defaultProvider];
        }

        /**
         * Получить имя текущего провайдера
         * @returns {Promise<string>}
         */
        async getCurrentProviderName() {
            if (!window.cacheManager) {
                return this.defaultProvider;
            }
            try {
                const providerName = await window.cacheManager.get('data-provider');
                return providerName || this.defaultProvider;
            } catch (error) {
                console.warn('data-provider-manager: ошибка получения провайдера, используется дефолтный', error);
                return this.defaultProvider;
            }
        }

        /**
         * Установить активный провайдер
         * @param {string} providerName - 'coingecko' | 'coinmarketcap' и т.д.
         * @returns {Promise<void>}
         */
        async setProvider(providerName) {
            if (!this.providers[providerName]) {
                throw new Error(`Провайдер ${providerName} не найден`);
            }
            if (window.cacheManager) {
                await window.cacheManager.set('data-provider', providerName);
            }
        }

        /**
         * Получить топ N монет через текущий провайдер
         * @param {number} count - Количество монет (1-250)
         * @param {string} sortBy - Сортировка: 'market_cap' | 'volume'
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<Array>} Массив нормализованных данных монет
         */
        async getTopCoins(count = 100, sortBy = 'market_cap', options = {}) {
            const preferYandexFirst = options.preferYandexFirst !== false;
            const allowCoinGeckoFallback = typeof options.allowCoinGeckoFallback === 'boolean'
                ? options.allowCoinGeckoFallback
                : !this.isFileProtocol(); // На file:// по умолчанию не дергаем CoinGecko на старте
            const emitProgress = (payload) => {
                if (!options || typeof options.onProgress !== 'function') return;
                try {
                    options.onProgress(payload);
                } catch (_) {
                    // no-op
                }
            };

            // 1) PostgreSQL primary
            if (preferYandexFirst && this.providers['yandex-cache']) {
                try {
                    emitProgress({ source: 'postgres', phase: 'start', total: count, loaded: 0 });
                    const pgOptions = {
                        ...options,
                        onProgress: (payload) => {
                            emitProgress({ ...(payload || {}), source: 'postgres' });
                        }
                    };
                    const result = await this.providers['yandex-cache'].getTopCoins(count, sortBy, pgOptions);
                    const filtered = this.filterCoinsByBan(result);
                    emitProgress({
                        source: 'postgres',
                        phase: 'done',
                        total: count,
                        loaded: Math.min(count, filtered.length)
                    });
                    if (window.requestRegistry) {
                        window.requestRegistry.recordCall('yandex-cache', 'getTopCoins', { count, sortBy }, 200, true);
                    }
                    return filtered;
                } catch (pgError) {
                    emitProgress({
                        source: 'postgres',
                        phase: 'error',
                        total: count,
                        loaded: 0,
                        error: pgError.message || 'unknown'
                    });
                    if (window.requestRegistry) {
                        window.requestRegistry.recordCall('yandex-cache', 'getTopCoins', { count, sortBy }, 500, false);
                    }
                    if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: 'top-coins-pg-primary-failed',
                            reason: pgError.message || 'unknown',
                            timestamp: Date.now()
                        });
                    }
                    if (!allowCoinGeckoFallback) {
                        throw pgError;
                    }
                }
            }

            // 2) CoinGecko secondary (или выбранный провайдер, если не file://)
            let providerName = await this.getCurrentProviderName();
            let provider = this.providers[providerName] || this.providers[this.defaultProvider];

            if (providerName === 'yandex-cache' && this.providers['coingecko']) {
                providerName = 'coingecko';
                provider = this.providers['coingecko'];
            }

            if (!provider) {
                throw new Error('Нет доступного провайдера данных для getTopCoins');
            }

            // ПРОВЕРКА ЖУРНАЛА (Request Registry)
            if (window.requestRegistry) {
                // Минимальный интервал из ssot (2 часа), fallback 2 часа
                const minInterval = window.ssot && typeof window.ssot.getTopCoinsRequestIntervalMs === 'function'
                    ? window.ssot.getTopCoinsRequestIntervalMs()
                    : 2 * 60 * 60 * 1000;
                if (!window.requestRegistry.isAllowed(providerName, 'getTopCoins', { count, sortBy }, minInterval)) {
                    console.log(`data-provider-manager: запрос ${providerName}:getTopCoins заблокирован журналом (слишком часто)`);
                    // Пробуем вернуть кэш
                    if (window.cacheManager) {
                        const cacheKey = sortBy === 'volume' ? 'top-coins-by-volume' : 'top-coins-by-market-cap';
                        const cached = await window.cacheManager.get(cacheKey);
                        if (cached && cached.length > 0) return cached;
                    }
                    // Skill anchor: при пустом кэше и заблокированном registry (после 429) — бросаем ошибку
                    // вместо немедленного повтора запроса. Это предотвращает бесконечный цикл 429→запись→429.
                    // UI покажет ошибку, пользователь может подождать и попробовать через кнопку Refresh.
                    const timeUntilNext = window.requestRegistry.getTimeUntilNext(providerName, 'getTopCoins', { count, sortBy }, minInterval);
                    const waitMinutes = Math.ceil(timeUntilNext / 60000);
                    console.warn(`data-provider-manager: кэш пуст, registry заблокирован ещё ${waitMinutes} мин. Запрос отклонён.`);
                    throw new Error(`Rate limit: API недоступен, повторите через ${waitMinutes} мин.`);
                }
            }

            // Получаем API ключ если требуется
            const apiKey = await this.getApiKey(providerName);
            if (provider.requiresApiKey() && !apiKey) {
                const error = `API ключ для ${provider.getDisplayName()} не настроен`;
                provider.logError(error);
                throw new Error(error);
            }

            // Добавляем API ключ в опции если есть
            if (apiKey) {
                options.apiKey = apiKey;
            }

            try {
                const providerOptions = { ...options };
                if (providerName === 'coingecko') {
                    providerOptions.onProgress = (payload) => {
                        emitProgress({ ...(payload || {}), source: 'coingecko' });
                    };
                }
                const result = await provider.getTopCoins(count, sortBy, providerOptions);
                const filtered = this.filterCoinsByBan(result);
                if (window.requestRegistry) {
                    window.requestRegistry.recordCall(providerName, 'getTopCoins', { count, sortBy }, 200, true);
                }
                return filtered;
            } catch (error) {
                if (window.requestRegistry) {
                    // Skill anchor: в журнал должен попадать реальный HTTP статус, иначе 429 цикл маскируется как "generic error".
                    // See a/skills/app/skills/integrations/integrations-rate-limiting.md
                    const status = Number.isFinite(error.status)
                        ? error.status
                        : (String(error.message || '').toLowerCase().includes('rate limit') ? 429 : 500);
                    window.requestRegistry.recordCall(providerName, 'getTopCoins', { count, sortBy }, status, false);
                }
                throw error;
            }
        }

        /**
         * Поиск монет через текущий провайдер
         * @param {string} query - Поисковый запрос
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<Array>} Массив найденных монет
         */
        async searchCoins(query, options = {}) {
            const limit = this.normalizeLimit(options.limit, 10);
            const preferYandexFirst = options.preferYandexFirst !== false;
            const allowCoinGeckoFallback = options.allowCoinGeckoFallback !== false;
            const merged = [];
            const seenIds = new Set();

            const appendUnique = (coins) => {
                if (!Array.isArray(coins)) return;
                coins.forEach((coin) => {
                    if (!coin || !coin.id || seenIds.has(coin.id)) return;
                    seenIds.add(coin.id);
                    merged.push(coin);
                });
            };

            // 1) PostgreSQL search
            if (preferYandexFirst && this.providers['yandex-cache']) {
                try {
                    const fromPg = await this.providers['yandex-cache'].searchCoins(query, options);
                    appendUnique(this.filterCoinsByBan(fromPg));
                    if (merged.length >= limit) {
                        return merged.slice(0, limit);
                    }
                } catch (pgError) {
                    if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: 'search-pg-failed',
                            reason: pgError.message || 'unknown',
                            timestamp: Date.now()
                        });
                    }
                }
            }

            // 2) CoinGecko fallback
            if (allowCoinGeckoFallback && this.providers['coingecko']) {
                const provider = this.providers['coingecko'];
                const apiKey = await this.getApiKey('coingecko');
                const cgOptions = { ...options };
                if (apiKey) {
                    cgOptions.apiKey = apiKey;
                }

                try {
                    const fromCg = await provider.searchCoins(query, cgOptions);
                    appendUnique(this.filterCoinsByBan(fromCg));
                } catch (cgError) {
                    if (merged.length === 0) {
                        throw cgError;
                    }
                }
            }

            return merged.slice(0, limit);
        }

        /**
         * Получить данные монет по ID через текущий провайдер
         * @param {Array<string>} coinIds - Массив ID монет
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<Array>} Массив нормализованных данных монет
         */
        async getCoinData(coinIds, options = {}) {
            const useDualChannel = options.useDualChannel !== false &&
                typeof this.getCoinDataDualChannel === 'function' &&
                !!this.providers['yandex-cache'] &&
                !!this.providers['coingecko'];
            if (useDualChannel) {
                return this.getCoinDataDualChannel(coinIds, options);
            }

            const provider = await this.getCurrentProvider();
            const providerName = await this.getCurrentProviderName();
            const { bannedIds } = this.getBanContext();
            const requestedIds = Array.isArray(coinIds) ? coinIds : [];
            const filteredIds = requestedIds.filter(id => !bannedIds.has(id));
            if (filteredIds.length === 0) {
                return [];
            }

            const apiKey = await this.getApiKey(providerName);
            if (provider.requiresApiKey() && !apiKey) {
                const error = `API ключ для ${provider.getDisplayName()} не настроен`;
                provider.logError(error);
                throw new Error(error);
            }

            if (apiKey) {
                options.apiKey = apiKey;
            }

            const result = await provider.getCoinData(filteredIds, options);
            return this.filterCoinsByBan(result);
        }

        /**
         * Dual-channel coin data fetch: PostgreSQL primary, CoinGecko fallback.
         * Phase 1: resolve as many IDs as possible from YandexCacheProvider (PG).
         * Phase 2: fetch remaining missing IDs from the active provider (CoinGecko).
         * @param {string[]} coinIds
         * @param {Object} options - { onProgress, signal, chunkDelayMs, forceChunking }
         *   onProgress receives events with `source: 'postgres' | 'coingecko'`
         * @returns {Promise<Array>} merged coin data
         */
        async getCoinDataDualChannel(coinIds, options = {}) {
            if (!Array.isArray(coinIds) || coinIds.length === 0) return [];

            const pgProvider = this.providers['yandex-cache'];
            const cgProvider = this.providers['coingecko'];
            const allowCoinGeckoFallback = options.allowCoinGeckoFallback !== false;
            const { bannedIds } = this.getBanContext();
            const filteredIds = coinIds.filter(id => !bannedIds.has(id));
            if (filteredIds.length === 0) return [];

            const resolvedMap = new Map();

            // ── Phase 1: PostgreSQL ────────────────────────────────────────
            if (pgProvider) {
                try {
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'postgres', phase: 'start',
                            total: filteredIds.length, loaded: 0
                        });
                    }
                    const pgCoins = await pgProvider.getCoinData(filteredIds, {
                        signal: options.signal,
                        onProgress: (payload) => {
                            if (options.onProgress) {
                                options.onProgress({ ...payload, source: 'postgres' });
                            }
                        }
                    });
                    if (Array.isArray(pgCoins)) {
                        pgCoins.forEach(coin => {
                            if (coin && coin.id) resolvedMap.set(coin.id, coin);
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'postgres', phase: 'done',
                            total: filteredIds.length, loaded: resolvedMap.size
                        });
                    }
                } catch (pgErr) {
                    console.warn('dual-channel: PG phase failed, falling through to CoinGecko', pgErr.message);
                    if (window.fallbackMonitor) {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: 'pg-phase-failed',
                            reason: pgErr.message,
                            timestamp: Date.now()
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'postgres', phase: 'error',
                            error: pgErr.message
                        });
                    }
                }
            }

            // ── Phase 2: CoinGecko for missing IDs ─────────────────────────
            const missingIds = filteredIds.filter(id => !resolvedMap.has(id));

            if (missingIds.length > 0 && cgProvider && allowCoinGeckoFallback) {
                try {
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'coingecko', phase: 'start',
                            total: missingIds.length, loaded: 0
                        });
                    }

                    const apiKey = await this.getApiKey('coingecko');
                    const cgOptions = {
                        signal: options.signal,
                        forceChunking: options.forceChunking ?? true,
                        chunkDelayMs: options.chunkDelayMs,
                        onProgress: (payload) => {
                            if (options.onProgress) {
                                options.onProgress({ ...payload, source: 'coingecko' });
                            }
                        }
                    };
                    if (apiKey) cgOptions.apiKey = apiKey;

                    const cgCoins = await cgProvider.getCoinData(missingIds, cgOptions);
                    if (Array.isArray(cgCoins)) {
                        cgCoins.forEach(coin => {
                            if (coin && coin.id) resolvedMap.set(coin.id, coin);
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'coingecko', phase: 'done',
                            total: missingIds.length,
                            loaded: missingIds.filter(id => resolvedMap.has(id)).length
                        });
                    }
                } catch (cgErr) {
                    console.warn('dual-channel: CoinGecko phase failed', cgErr.message);
                    if (window.fallbackMonitor) {
                        window.fallbackMonitor.notify({
                            component: 'data-provider-manager',
                            event: 'cg-phase-failed',
                            reason: cgErr.message,
                            timestamp: Date.now()
                        });
                    }
                    if (options.onProgress) {
                        options.onProgress({
                            source: 'coingecko', phase: 'error',
                            error: cgErr.message
                        });
                    }
                }
            } else if (missingIds.length > 0 && !allowCoinGeckoFallback && options.onProgress) {
                options.onProgress({
                    source: 'coingecko', phase: 'skip',
                    reason: 'CoinGecko fallback disabled by options'
                });
            } else if (missingIds.length === 0 && options.onProgress) {
                options.onProgress({
                    source: 'coingecko', phase: 'skip',
                    reason: 'All coins resolved from PostgreSQL'
                });
            }

            return this.filterCoinsByBan(
                filteredIds.map(id => resolvedMap.get(id)).filter(Boolean)
            );
        }

        /**
         * Получить ID монеты по тикеру через текущий провайдер
         * @param {string} symbol - Тикер монеты
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<string|null>} ID монеты или null
         */
        async getCoinIdBySymbol(symbol, options = {}) {
            const preferYandexFirst = options.preferYandexFirst !== false;
            const allowCoinGeckoFallback = options.allowCoinGeckoFallback !== false;

            if (preferYandexFirst && this.providers['yandex-cache']) {
                try {
                    const fromPg = await this.providers['yandex-cache'].getCoinIdBySymbol(symbol, options);
                    if (fromPg) {
                        return fromPg;
                    }
                } catch (_) {
                    // no-op: fallback ниже
                }
            }

            if (allowCoinGeckoFallback && this.providers['coingecko']) {
                const apiKey = await this.getApiKey('coingecko');
                const cgOptions = { ...options };
                if (apiKey) {
                    cgOptions.apiKey = apiKey;
                }
                return await this.providers['coingecko'].getCoinIdBySymbol(symbol, cgOptions);
            }

            return null;
        }

        /**
         * Получить API ключ для провайдера из localStorage
         * @param {string} providerName - 'coingecko' | 'coinmarketcap' и т.д.
         * @returns {Promise<string|null>}
         */
        async getApiKey(providerName) {
            try {
                const keysJson = localStorage.getItem(this.apiKeysStorageKey);
                if (!keysJson) return null;

                const keys = JSON.parse(keysJson);
                return keys[providerName] || null;
            } catch (error) {
                console.warn(`data-provider-manager: ошибка получения API ключа для ${providerName}`, error);
                return null;
            }
        }

        /**
         * Установить API ключ для провайдера в localStorage
         * @param {string} providerName - 'coingecko' | 'coinmarketcap' и т.д.
         * @param {string} apiKey - API ключ
         * @returns {Promise<void>}
         */
        async setApiKey(providerName, apiKey) {
            try {
                const keysJson = localStorage.getItem(this.apiKeysStorageKey);
                const keys = keysJson ? JSON.parse(keysJson) : {};

                if (apiKey) {
                    keys[providerName] = apiKey;
                } else {
                    // Удаляем ключ если пустой
                    delete keys[providerName];
                }

                localStorage.setItem(this.apiKeysStorageKey, JSON.stringify(keys));
            } catch (error) {
                console.error(`data-provider-manager: ошибка сохранения API ключа для ${providerName}`, error);
                throw error;
            }
        }

        /**
         * Получить список всех доступных провайдеров
         * @returns {Array<Object>} [{ value: string, label: string, provider: BaseDataProvider }]
         */
        getAvailableProviders() {
            return Object.entries(this.providers).map(([name, provider]) => ({
                value: name,
                label: provider.getDisplayName(),
                provider: provider
            }));
        }

        /**
         * Получить провайдер по имени
         * @param {string} providerName
         * @returns {BaseDataProvider|null}
         */
        getProvider(providerName) {
            return this.providers[providerName] || null;
        }

        /**
         * Проверить, требуется ли API ключ для текущего провайдера
         * @returns {Promise<boolean>}
         */
        async currentProviderRequiresApiKey() {
            const provider = await this.getCurrentProvider();
            return provider.requiresApiKey();
        }

        /**
         * Получить URL для получения API ключа для текущего провайдера
         * @returns {Promise<string|null>}
         */
        async getApiKeyUrl() {
            const providerName = await this.getCurrentProviderName();
            return window.dataProvidersConfig.getApiKeyUrl(providerName);
        }
    }

    // Создаем и экспортируем экземпляр менеджера
    window.dataProviderManager = new DataProviderManager();

    // Инициализируем после загрузки всех провайдеров
    if (window.CoinGeckoProvider) {
        window.dataProviderManager.init();
        console.log('✅ dataProviderManager initialized with providers:', Object.keys(window.dataProviderManager.providers));
    } else {
        // Если провайдеры еще не загружены, ждем их
        const checkProviders = setInterval(() => {
            if (window.CoinGeckoProvider) {
                window.dataProviderManager.init();
                console.log('✅ dataProviderManager initialized with providers:', Object.keys(window.dataProviderManager.providers));
                clearInterval(checkProviders);
            }
        }, 50);
        // Таймаут на случай, если провайдеры не загрузятся
        setTimeout(() => {
            clearInterval(checkProviders);
            console.warn('⚠️ dataProviderManager: timeout waiting for providers');
        }, 5000);
    }

})();
