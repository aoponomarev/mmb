/**
 * ================================================================================================
 * COINGECKO PROVIDER - Провайдер данных CoinGecko API
 * ================================================================================================
 * Skill: core/skills/api-layer
 * Skill: core/skills/api-layer
 *
 * ЦЕЛЬ: Реализация провайдера данных для CoinGecko API.
 * Наследует BaseDataProvider и реализует все обязательные методы.
 *
 * ИСТОЧНИК: Адаптирован из do-overs/BOT/core/api/coingecko.js
 * - Сохранена вся логика работы с API
 * - Добавлена нормализация данных к единому формату
 * - Интегрирована система сообщений для ошибок
 * - Использованы конфигурация и rate limiting из новой архитектуры
 *
 * ПРИНЦИПЫ:
 * - Нормализация данных CoinGecko к единому формату приложения
 * - Обработка rate limiting (429) через адаптивный таймаут
 * - Трансформация данных для совместимости с математической моделью (pvs, PV1h, PV24h и т.д.)
 * - Логирование ошибок через систему сообщений
 *
 * НОРМАЛИЗАЦИЯ ДАННЫХ:
 * - На file:// протоколе ВСЕ запросы ОБЯЗАТЕЛЬНО проксируются через Cloudflare Worker
 * - buildUrl() автоматически выбирает proxy (file://) или прямой запрос (HTTP/HTTPS)
 * - ЗАПРЕЩЕНО блокировать запросы на file:// с early return
 * - Подробности: `app/skills/file-protocol-cors-guard`
 *
 * RATE LIMITING:
 * - Бесплатный tier: 10-50 запросов/минуту
 * - При 429 ошибке: увеличение задержки между запросами
 * - При успешном запросе: уменьшение задержки
 * - Управление через встроенный rate limiter
 *
 * НОРМАЛИЗАЦИЯ ДАННЫХ:
 * Преобразует ответ CoinGecko API к единому формату:
 * {
 *   id: 'bitcoin',
 *   symbol: 'btc',
 *   name: 'Bitcoin',
 *   image: 'https://...',
 *   current_price: 50000,
 *   market_cap: 1000000000,
 *   market_cap_rank: 1,
 *   total_volume: 50000000,
 *   price_change_percentage_1h: 0.5,
 *   price_change_percentage_24h: 2.1,
 *   price_change_percentage_7d: 5.3,
 *   price_change_percentage_14d: 8.2,
 *   price_change_percentage_30d: 12.5,
 *   price_change_percentage_200d: 150.0,
 *   pvs: [0.5, 2.1, 5.3, 8.2, 12.5, 150.0], // Для математической модели
 *   PV1h, PV24h, PV7d, PV14d, PV30d, PV200d  // Отдельные поля для удобства
 * }
 *
 * ССЫЛКИ:
 * - Base Provider: core/api/data-providers/base-provider.js
 * - Config: core/config/data-providers-config.js
 * - Rate Limiter: core/api/rate-limiter.js
 * - Старый код: do-overs/BOT/core/api/coingecko.js
 */

(function() {
    'use strict';

    /**
     * CoinGecko Provider - реализация провайдера для CoinGecko API
     */
    class CoinGeckoProvider extends window.BaseDataProvider {
        constructor() {
            super();

            // Получаем конфигурацию из data-providers-config
            this.config = window.dataProvidersConfig.getProviderConfig('coingecko');

            // Rate limiter для управления частотой запросов
            this.rateLimiter = null;
            this.initRateLimiter();
        }

        /**
         * Построить URL с учетом прокси (для file://)
         * На file:// используется Cloudflare Worker proxy для обхода CORS
         */
        buildUrl(pathWithQuery) {
            // Skill anchor: на file:// и GitHub Pages ВСЕ запросы через proxy, прямой доступ может быть заблокирован CORS.
            // See app/skills/file-protocol-cors-guard
            const needsProxy = this.isFileProtocol();

            // Если нужен прокси — используем Cloudflare Worker
            if (needsProxy && window.cloudflareConfig) {
                // Разделяем путь и query параметры
                const [path, query] = pathWithQuery.split('?');
                const params = query ? Object.fromEntries(new URLSearchParams(query)) : {};

                return window.cloudflareConfig.getApiProxyEndpoint('coingecko', path, params);
            }

            // Иначе — прямой запрос к CoinGecko
            return `${this.config.baseUrl}${pathWithQuery}`;
        }

        /**
         * Инициализация rate limiter
         */
        initRateLimiter() {
            if (window.RateLimiter) {
                const rateLimit = this.config.rateLimit;
                // Используем общий именованный экземпляр для CoinGecko (ЕИП)
                this.rateLimiter = window.RateLimiter.getOrCreate(
                    'coingecko',
                    rateLimit.requestsPerMinute,
                    rateLimit.requestsPerSecond
                );
            } else {
                console.warn('RateLimiter not available, rate limiting disabled');
            }
        }

        /**
         * Получить внутреннее имя провайдера
         */
        getName() {
            return 'coingecko';
        }

        /**
         * Получить отображаемое имя провайдера
         */
        getDisplayName() {
            return 'CoinGecko';
        }

        /**
         * Проверка, требуется ли API ключ
         */
        requiresApiKey() {
            return this.config.requiresApiKey;
        }

        /**
         * Проверка, требуется ли прокси (file://, GitHub Pages, или localhost)
         * @returns {boolean}
         */
        isFileProtocol() {
            return Boolean(window.location && (
                window.location.protocol === 'file:' || 
                window.location.hostname.includes('github.io') || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1'
            ));
        }

        /**
         * Пауза между запросами
         * @param {number} ms
         */
        async sleep(ms) {
            await new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Безопасная отправка событий прогресса загрузки
         * @param {Object} options
         * @param {Object} payload
         */
        emitTopCoinsProgress(options, payload) {
            if (!options || typeof options.onProgress !== 'function') {
                return;
            }
            try {
                options.onProgress(payload);
            } catch (error) {
                console.warn('coingecko-provider: onProgress callback failed', error);
            }
        }

        /**
         * Размер чанка для загрузки топа монет
         * @param {number} count
         * @param {Object} options
         * @returns {number}
         */
        getTopCoinsChunkSize(count, options = {}) {
            const requestedChunkSize = Number(options.chunkSize);
            if (Number.isFinite(requestedChunkSize) && requestedChunkSize >= 1) {
                return Math.max(1, Math.min(250, Math.floor(requestedChunkSize)));
            }

            // Skill anchor: стабилизирует file:// Top-N runbook (чанки, чтобы не ловить 429 на тяжелых запросах).
            // See core/skills/api-layer
            // На file:// используем более "легкий" режим по 25 монет на запрос
            if (this.isFileProtocol()) {
                return Math.min(25, count);
            }

            return Math.min(50, count);
        }

        /**
         * Нужно ли включать чанковую загрузку топа
         * @param {number} count
         * @param {Object} options
         * @returns {boolean}
         */
        shouldUseChunkedTopCoins(count, options = {}) {
            if (options.disableChunking === true) {
                return false;
            }
            if (options.forceChunking === true) {
                return true;
            }

            const chunkSize = this.getTopCoinsChunkSize(count, options);
            // На file:// предпочитаем чанки уже с 51 монеты
            return this.isFileProtocol() && count > chunkSize;
        }

        /**
         * Построить query параметры для /coins/markets
         * @param {number} perPage
         * @param {number} page
         * @param {string} order
         * @param {Object} options
         * @returns {URLSearchParams}
         */
        buildTopCoinsParams(perPage, page, order, options = {}) {
            const priceChangePercentage = (
                typeof options.priceChangePercentage === 'string' && options.priceChangePercentage.trim().length > 0
            )
                ? options.priceChangePercentage.trim()
                : '1h,24h,7d,14d,30d,200d';

            const params = new URLSearchParams({
                vs_currency: 'usd',
                order: order,
                per_page: perPage,
                page: page,
                price_change_percentage: priceChangePercentage
            });

            // Параметр поддерживается CoinGecko /coins/markets, но включаем только по запросу
            if (options.includeRehypothecated === true) {
                params.set('include_rehypothecated', 'true');
            }

            return params;
        }

        /**
         * Получить задержку ретрая из Retry-After или fallback
         * @param {Response} response
         * @param {number} fallbackMs
         * @returns {number}
         */
        getRetryDelayMs(response, fallbackMs) {
            const retryAfterRaw = response && response.headers ? response.headers.get('Retry-After') : null;
            if (!retryAfterRaw) {
                return fallbackMs;
            }

            // Вариант 1: Retry-After в секундах
            const retryAfterSeconds = Number(retryAfterRaw);
            if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
                return Math.max(1000, retryAfterSeconds * 1000);
            }

            // Вариант 2: Retry-After как HTTP-date
            const retryAfterDate = Date.parse(retryAfterRaw);
            if (!Number.isNaN(retryAfterDate)) {
                return Math.max(1000, retryAfterDate - Date.now());
            }

            return fallbackMs;
        }

        /**
         * Нормализация массива монет к единому формату
         * @param {Array} coins
         * @returns {Array}
         */
        normalizeTopCoinsList(coins) {
            return Array.isArray(coins) ? coins.map(coin => this.normalizeCoinData(coin)) : [];
        }

        /**
         * Запрос одной страницы /coins/markets с ретраями
         * @param {Object} params
         * @param {number} params.perPage
         * @param {number} params.page
         * @param {string} params.order
         * @param {Object} params.options
         * @param {number} params.chunkIndex
         * @param {number} params.chunksTotal
         * @param {number} params.total
         * @returns {Promise<Array>}
         */
        async fetchTopCoinsPage({ perPage, page, order, options = {}, chunkIndex = 1, chunksTotal = 1, total = perPage }) {
            const maxAttempts = Number.isFinite(options.maxAttempts)
                ? Math.max(1, Math.floor(options.maxAttempts))
                : 3;
            const retryBaseDelayMs = Number.isFinite(options.retryBaseDelayMs)
                ? Math.max(1000, Math.floor(options.retryBaseDelayMs))
                : 3000;

            const requestParams = this.buildTopCoinsParams(perPage, page, order, options);
            const url = this.buildUrl(`/coins/markets?${requestParams}`);

            let lastError = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    if (this.rateLimiter) {
                        await this.rateLimiter.waitForToken();
                    }

                    const response = await fetch(url, {
                        signal: AbortSignal.timeout(options.timeout || this.config.timeout)
                    });

                    if (!response.ok) {
                        if (response.status === 429 && this.rateLimiter) {
                            this.rateLimiter.increaseTimeout();
                        }

                        const retriableHttpStatuses = new Set([408, 429, 500, 502, 503, 504]);
                        const canRetry = retriableHttpStatuses.has(response.status) && attempt < maxAttempts;

                        if (canRetry) {
                            // Skill anchor: предотвращает регрессии в 429 recovery (Retry-After приоритетнее fallback delay).
                            // See core/skills/api-layer
                            const fallbackDelay = retryBaseDelayMs * attempt;
                            const retryDelayMs = response.status === 429
                                ? this.getRetryDelayMs(response, fallbackDelay)
                                : fallbackDelay;

                            this.emitTopCoinsProgress(options, {
                                phase: 'retry',
                                chunkIndex,
                                chunksTotal,
                                attempt,
                                nextAttempt: attempt + 1,
                                status: response.status,
                                delayMs: retryDelayMs,
                                loaded: Math.max(0, (chunkIndex - 1) * perPage),
                                total
                            });

                            await this.sleep(retryDelayMs);
                            continue;
                        }

                        this.handleHttpError(response, 'getTopCoins');
                    }

                    if (this.rateLimiter) {
                        this.rateLimiter.decreaseTimeout();
                    }

                    const responseData = await response.json();
                    return Array.isArray(responseData) ? responseData : [];
                } catch (error) {
                    lastError = error;

                    const status = error && Number.isFinite(error.status) ? error.status : null;
                    const retriableError =
                        status === 429 ||
                        status === 408 ||
                        status === 500 ||
                        status === 502 ||
                        status === 503 ||
                        status === 504 ||
                        error.name === 'AbortError' ||
                        /network|timeout|fetch failed/i.test(String(error.message || ''));

                    if (retriableError && attempt < maxAttempts) {
                        const retryDelayMs = retryBaseDelayMs * attempt;
                        this.emitTopCoinsProgress(options, {
                            phase: 'retry',
                            chunkIndex,
                            chunksTotal,
                            attempt,
                            nextAttempt: attempt + 1,
                            status: status || null,
                            delayMs: retryDelayMs,
                            loaded: Math.max(0, (chunkIndex - 1) * perPage),
                            total
                        });
                        await this.sleep(retryDelayMs);
                        continue;
                    }

                    throw error;
                }
            }

            throw lastError || new Error('getTopCoins page request failed');
        }

        /**
         * Загрузить топ монет чанками с прогрессом
         * @param {number} count
         * @param {string} order
         * @param {Object} options
         * @returns {Promise<Array>}
         */
        async fetchTopCoinsChunked(count, order, options = {}) {
            const chunkSize = this.getTopCoinsChunkSize(count, options);
            const chunksTotal = Math.ceil(count / chunkSize);
            const chunkDelayMs = Number.isFinite(options.chunkDelayMs)
                ? Math.max(0, Math.floor(options.chunkDelayMs))
                : (this.isFileProtocol() ? 800 : 200);

            const seenIds = new Set();
            const allCoins = [];

            this.emitTopCoinsProgress(options, {
                phase: 'start',
                total: count,
                loaded: 0,
                chunksTotal,
                chunkSize
            });

            for (let chunkNumber = 1; chunkNumber <= chunksTotal; chunkNumber++) {
                const loadedBeforeChunk = allCoins.length;
                const chunkCount = Math.min(chunkSize, count - loadedBeforeChunk);

                this.emitTopCoinsProgress(options, {
                    phase: 'chunk-start',
                    chunkIndex: chunkNumber,
                    chunksTotal,
                    loaded: loadedBeforeChunk,
                    total: count,
                    perPage: chunkCount,
                    page: chunkNumber
                });

                const rawChunk = await this.fetchTopCoinsPage({
                    perPage: chunkCount,
                    page: chunkNumber,
                    order,
                    options,
                    chunkIndex: chunkNumber,
                    chunksTotal,
                    total: count
                });

                const normalizedChunk = this.normalizeTopCoinsList(rawChunk);
                normalizedChunk.forEach(coin => {
                    if (!coin || !coin.id || seenIds.has(coin.id)) return;
                    seenIds.add(coin.id);
                    allCoins.push(coin);
                });

                const loadedAfterChunk = Math.min(allCoins.length, count);
                this.emitTopCoinsProgress(options, {
                    phase: 'chunk-success',
                    chunkIndex: chunkNumber,
                    chunksTotal,
                    loaded: loadedAfterChunk,
                    total: count,
                    perPage: chunkCount
                });

                if (loadedAfterChunk >= count) {
                    break;
                }

                if (chunkNumber < chunksTotal && chunkDelayMs > 0) {
                    this.emitTopCoinsProgress(options, {
                        phase: 'chunk-delay',
                        chunkIndex: chunkNumber,
                        chunksTotal,
                        loaded: loadedAfterChunk,
                        total: count,
                        delayMs: chunkDelayMs
                    });
                    await this.sleep(chunkDelayMs);
                }
            }

            const result = allCoins.slice(0, count);
            this.emitTopCoinsProgress(options, {
                phase: 'done',
                total: count,
                loaded: result.length,
                chunksTotal
            });

            return result;
        }

        /**
         * Получить топ N монет
         * @param {number} count - Количество монет (1-250)
         * @param {string} sortBy - Сортировка: 'market_cap' | 'volume'
         * @param {Object} options - Дополнительные опции (apiKey, timeout)
         * @returns {Promise<Array>} Массив нормализованных данных монет
         */
        async getTopCoins(count = 100, sortBy = 'market_cap', options = {}) {
            if (!count || count <= 0 || count > 250) {
                throw new Error('Count must be between 1 and 250');
            }

            // Определяем порядок сортировки
            const order = sortBy === 'volume' ? 'volume_desc' : 'market_cap_desc';

            try {
                if (this.shouldUseChunkedTopCoins(count, options)) {
                    return await this.fetchTopCoinsChunked(count, order, options);
                }

                this.emitTopCoinsProgress(options, {
                    phase: 'start',
                    total: count,
                    loaded: 0,
                    chunksTotal: 1,
                    chunkSize: count
                });

                const data = await this.fetchTopCoinsPage({
                    perPage: count,
                    page: 1,
                    order,
                    options,
                    chunkIndex: 1,
                    chunksTotal: 1,
                    total: count
                });

                const result = this.normalizeTopCoinsList(data).slice(0, count);
                this.emitTopCoinsProgress(options, {
                    phase: 'done',
                    total: count,
                    loaded: result.length,
                    chunksTotal: 1
                });
                return result;

            } catch (error) {
                this.logError('Failed to fetch top coins', error.message);
                throw error;
            }
        }

        /**
         * Поиск монет по названию или тикеру
         * @param {string} query - Поисковый запрос
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<Array>} Массив найденных монет (до 10)
         */
        async searchCoins(query, options = {}) {
            if (!query || query.length < 2) {
                return [];
            }

            // Используем buildUrl для поддержки proxy на file://
            const url = this.buildUrl(`/search?query=${encodeURIComponent(query)}`);

            try {
                // Ждем rate limiter
                if (this.rateLimiter) {
                    await this.rateLimiter.waitForToken();
                }

                const response = await fetch(url, {
                    signal: AbortSignal.timeout(options.timeout || this.config.timeout)
                });

                if (!response.ok) {
                    if (response.status === 429 && this.rateLimiter) {
                        this.rateLimiter.increaseTimeout();
                    }
                    this.handleHttpError(response, 'searchCoins');
                }

                // Уменьшаем таймаут при успешном запросе
                if (this.rateLimiter) {
                    this.rateLimiter.decreaseTimeout();
                }

                const data = await response.json();
                let coins = data.coins || [];

                // Сортируем результаты: полные совпадения с тикером вверху
                const queryLower = query.toLowerCase();
                coins.sort((a, b) => {
                    const aSymbol = a.symbol ? a.symbol.toLowerCase() : '';
                    const bSymbol = b.symbol ? b.symbol.toLowerCase() : '';

                    // Полное совпадение тикера - в начало
                    const aExactMatch = aSymbol === queryLower ? 1 : 0;
                    const bExactMatch = bSymbol === queryLower ? 1 : 0;
                    if (aExactMatch !== bExactMatch) {
                        return bExactMatch - aExactMatch;
                    }

                    // Тикер начинается с запроса - выше
                    const aStartsWith = aSymbol.startsWith(queryLower) ? 1 : 0;
                    const bStartsWith = bSymbol.startsWith(queryLower) ? 1 : 0;
                    if (aStartsWith !== bStartsWith) {
                        return bStartsWith - aStartsWith;
                    }

                    // Остальные сортируем детерминированно без скрытой зависимости от rank.
                    const aName = a.name ? a.name.toLowerCase() : '';
                    const bName = b.name ? b.name.toLowerCase() : '';
                    if (aName !== bName) {
                        return aName.localeCompare(bName);
                    }
                    const aId = a.id ? a.id.toLowerCase() : '';
                    const bId = b.id ? b.id.toLowerCase() : '';
                    return aId.localeCompare(bId);
                });

                const results = coins.slice(0, 10);

                // Нормализуем данные поиска: маппируем thumb/large на image для единообразия
                const normalizedResults = results.map(coin => ({
                    ...coin,
                    image: coin.thumb || coin.large || '', // Используем thumb (маленькая иконка) или large если thumb нет
                    current_price: null, // Поиск не возвращает цену
                    price_change_percentage_24h: null // Поиск не возвращает изменение цены
                }));

                return normalizedResults;

            } catch (error) {
                this.logError('Search failed', error.message);
                return [];
            }
        }

        /**
         * Получить данные монет по их ID (с поддержкой чанков и прогресса)
         * @param {Array<string>} coinIds - Массив ID монет
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<Array>} Массив нормализованных данных монет
         */
        async getCoinData(coinIds, options = {}) {
            if (!coinIds || coinIds.length === 0) {
                return [];
            }

            // Skill anchor: принудительный чанкинг для больших наборов ID на file://.
            // See core/skills/api-layer
            const totalCount = coinIds.length;
            const isFile = this.isFileProtocol();
            const maxChunkSize = isFile ? 25 : 50;

            // Если монет больше порога, разбиваем на равные чанки
            if (totalCount > maxChunkSize || options.forceChunking) {
                const chunksTotal = Math.ceil(totalCount / maxChunkSize);
                // Вычисляем размер чанка так, чтобы они были максимально равными (эстетика)
                const chunkSize = Math.ceil(totalCount / chunksTotal);
                // Реальный лимит CoinGecko: ~3 req/60s. Безопасная задержка — 21s.
                // На file:// используем 21s, на HTTP (с ключом) можно меньше.
                const chunkDelayMs = Number.isFinite(options.chunkDelayMs)
                    ? Math.max(0, Math.floor(options.chunkDelayMs))
                    : (isFile ? 21000 : 5000);

                const allCoins = [];
                const seenIds = new Set();

                this.emitTopCoinsProgress(options, {
                    phase: 'start',
                    total: totalCount,
                    loaded: 0,
                    chunksTotal,
                    chunkSize
                });

                for (let chunkNumber = 1; chunkNumber <= chunksTotal; chunkNumber++) {
                    const start = (chunkNumber - 1) * chunkSize;
                    const end = Math.min(start + chunkSize, totalCount);
                    const currentChunkIds = coinIds.slice(start, end);

                    this.emitTopCoinsProgress(options, {
                        phase: 'chunk-start',
                        chunkIndex: chunkNumber,
                        chunksTotal,
                        loaded: allCoins.length,
                        total: totalCount,
                        perPage: currentChunkIds.length,
                        page: chunkNumber
                    });

                    // Используем внутренний метод для запроса одной страницы ID
                    const rawChunk = await this.fetchCoinDataPage(currentChunkIds, options, chunkNumber, chunksTotal, totalCount);
                    
                    const normalizedChunk = this.normalizeTopCoinsList(rawChunk);
                    normalizedChunk.forEach(coin => {
                        if (coin && coin.id && !seenIds.has(coin.id)) {
                            seenIds.add(coin.id);
                            allCoins.push(coin);
                        }
                    });

                    const loadedAfterChunk = allCoins.length;
                    this.emitTopCoinsProgress(options, {
                        phase: 'chunk-success',
                        chunkIndex: chunkNumber,
                        chunksTotal,
                        loaded: loadedAfterChunk,
                        total: totalCount,
                        perPage: currentChunkIds.length,
                        chunkCoins: normalizedChunk
                    });

                    if (options.signal && options.signal.aborted) {
                        const abortErr = new DOMException('Aborted', 'AbortError');
                        throw abortErr;
                    }

                    if (chunkNumber < chunksTotal && chunkDelayMs > 0) {
                        this.emitTopCoinsProgress(options, {
                            phase: 'chunk-delay',
                            chunkIndex: chunkNumber,
                            chunksTotal,
                            loaded: loadedAfterChunk,
                            total: totalCount,
                            delayMs: chunkDelayMs
                        });
                        await this.sleep(chunkDelayMs);
                    }
                }

                this.emitTopCoinsProgress(options, {
                    phase: 'done',
                    total: totalCount,
                    loaded: allCoins.length,
                    chunksTotal
                });

                return allCoins;
            }

            // Если чанкинг не нужен, выполняем один запрос через fetchCoinDataPage
            return await this.fetchCoinDataPage(coinIds, options, 1, 1, totalCount);
        }

        /**
         * Внутренний метод для загрузки страницы ID с ретраями
         * @private
         */
        async fetchCoinDataPage(coinIds, options, chunkIndex, chunksTotal, total) {
            const maxAttempts = Number.isFinite(options.maxAttempts) ? Math.max(1, Math.floor(options.maxAttempts)) : 3;
            const retryBaseDelayMs = Number.isFinite(options.retryBaseDelayMs) ? Math.max(1000, Math.floor(options.retryBaseDelayMs)) : 3000;

            const params = new URLSearchParams({
                vs_currency: 'usd',
                ids: coinIds.join(','),
                price_change_percentage: '1h,24h,7d,14d,30d,200d'
            });

            const url = this.buildUrl(`/coins/markets?${params}`);
            let lastError = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    if (options.signal && options.signal.aborted) {
                        const abortErr = new DOMException('Aborted', 'AbortError');
                        throw abortErr;
                    }
                    if (this.rateLimiter) {
                        await this.rateLimiter.waitForToken();
                    }

                    const response = await fetch(url, {
                        signal: options.signal || AbortSignal.timeout(options.timeout || this.config.timeout)
                    });

                    if (!response.ok) {
                        if (response.status === 429 && this.rateLimiter) {
                            this.rateLimiter.increaseTimeout();
                        }

                        const retriable = new Set([408, 429, 500, 502, 503, 504]).has(response.status);
                        if (retriable && attempt < maxAttempts) {
                            const fallbackDelay = retryBaseDelayMs * attempt;
                            const retryDelayMs = response.status === 429 
                                ? this.getRetryDelayMs(response, fallbackDelay) 
                                : fallbackDelay;

                            this.emitTopCoinsProgress(options, {
                                phase: 'retry',
                                chunkIndex,
                                chunksTotal,
                                attempt,
                                nextAttempt: attempt + 1,
                                status: response.status,
                                delayMs: retryDelayMs,
                                loaded: Math.max(0, (chunkIndex - 1) * coinIds.length),
                                total
                            });

                            await this.sleep(retryDelayMs);
                            continue;
                        }
                        this.handleHttpError(response, 'getCoinData');
                    }

                    if (this.rateLimiter) {
                        this.rateLimiter.decreaseTimeout();
                    }

                    const data = await response.json();
                    return Array.isArray(data) ? data.map(coin => this.normalizeCoinData(coin)) : [];

                } catch (error) {
                    lastError = error;
                    if (error && error.name === 'AbortError') {
                        throw error;
                    }
                    const status = error && error.status;
                    const retriable = status === 429 || status === 500 || /network|timeout/i.test(error.message);

                    if (retriable && attempt < maxAttempts) {
                        const retryDelayMs = retryBaseDelayMs * attempt;
                        this.emitTopCoinsProgress(options, {
                            phase: 'retry',
                            chunkIndex,
                            chunksTotal,
                            attempt,
                            nextAttempt: attempt + 1,
                            status: status || null,
                            delayMs: retryDelayMs,
                            loaded: Math.max(0, (chunkIndex - 1) * coinIds.length),
                            total
                        });
                        await this.sleep(retryDelayMs);
                        continue;
                    }
                    throw error;
                }
            }
            throw lastError || new Error('getCoinData request failed');
        }

        /**
         * Получить ID монеты по тикеру
         * @param {string} symbol - Тикер монеты (BTC, ETH и т.д.)
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<string|null>} ID монеты или null
         */
        async getCoinIdBySymbol(symbol, options = {}) {
            if (!symbol) return null;

            try {
                // Используем поиск для получения ID
                const results = await this.searchCoins(symbol, options);

                if (results.length === 0) {
                    return null;
                }

                // Ищем точное совпадение по тикеру (case-insensitive)
                const symbolUpper = symbol.toUpperCase();
                const exactMatch = results.find(coin =>
                    coin.symbol && coin.symbol.toUpperCase() === symbolUpper
                );

                if (exactMatch) {
                    return exactMatch.id;
                }

                // Если точного совпадения нет, возвращаем первый результат (самый популярный)
                return results[0].id || null;

            } catch (error) {
                this.logError(`Failed to get coin ID for symbol ${symbol}`, error.message);
                return null;
            }
        }

        /**
         * Нормализация данных монеты к единому формату
         * Добавляет поля pvs и отдельные PV* для совместимости с математической моделью
         * @param {Object} coinData - Данные монеты от CoinGecko API
         * @returns {Object} Нормализованные данные
         */
        normalizeCoinData(coinData) {
            // Безопасное извлечение значений с fallback на 0
            const safeValue = (value) => {
                const num = parseFloat(value);
                return Number.isFinite(num) ? num : 0;
            };

            // Создаем массив pvs (Price Variations) - для математической модели
            // Источник: старое приложение, old_app_not_write/parsing.js
            const pvs = [
                safeValue(coinData.price_change_percentage_1h_in_currency ?? coinData.price_change_percentage_1h),   // pvs[0] - PV1h
                safeValue(coinData.price_change_percentage_24h_in_currency ?? coinData.price_change_percentage_24h),  // pvs[1] - PV24h
                safeValue(coinData.price_change_percentage_7d_in_currency ?? coinData.price_change_percentage_7d),   // pvs[2] - PV7d
                safeValue(coinData.price_change_percentage_14d_in_currency ?? coinData.price_change_percentage_14d),  // pvs[3] - PV14d
                safeValue(coinData.price_change_percentage_30d_in_currency ?? coinData.price_change_percentage_30d),  // pvs[4] - PV30d
                safeValue(coinData.price_change_percentage_200d_in_currency ?? coinData.price_change_percentage_200d)  // pvs[5] - PV200d
            ];

            // Нормализованный формат (единый для всех провайдеров)
            return {
                // Базовые поля
                id: coinData.id,
                symbol: coinData.symbol,
                name: coinData.name,
                image: coinData.image,
                current_price: safeValue(coinData.current_price),
                market_cap: safeValue(coinData.market_cap),
                market_cap_rank: coinData.market_cap_rank_with_rehypothecated || coinData.market_cap_rank || null,
                total_volume: safeValue(coinData.total_volume),

                // Изменения цены (нормализованные названия без _in_currency)
                price_change_percentage_1h: pvs[0],
                price_change_percentage_24h: pvs[1],
                price_change_percentage_7d: pvs[2],
                price_change_percentage_14d: pvs[3],
                price_change_percentage_30d: pvs[4],
                price_change_percentage_200d: pvs[5],

                // Для совместимости с математической моделью (старое приложение)
                pvs: pvs,
                PV1h: pvs[0],
                PV24h: pvs[1],
                PV7d: pvs[2],
                PV14d: pvs[3],
                PV30d: pvs[4],
                PV200d: pvs[5],
                _cachedAt: Date.now()
            };
        }
    }

    // Экспорт через window
    window.CoinGeckoProvider = CoinGeckoProvider;

    console.log('✅ CoinGeckoProvider loaded');
})();
