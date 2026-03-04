/**
 * ================================================================================================
 * COINGECKO PROVIDER - CoinGecko API data provider
 * ================================================================================================
 * Skill: core/skills/api-layer
 * Skill: core/skills/api-layer
 *
 * PURPOSE: Data provider implementation for CoinGecko API.
 *
 * @skill-anchor core/skills/api-layer #for-layer-separation
 * @skill-anchor core/skills/data-providers-architecture #for-data-provider-interface
 * Extends BaseDataProvider and implements all required methods.
 *
 * SOURCE: Adapted from do-overs/BOT/core/api/coingecko.js
 * - Preserved all API logic
 * - Added data normalization to unified format
 * - Integrated error message system
 * - Uses config and rate limiting from new architecture
 *
*/

(function() {
    'use strict';

    /**
     * CoinGecko Provider - implementation for CoinGecko API
     */
    class CoinGeckoProvider extends window.BaseDataProvider {
        constructor() {
            super();

            // Get config from data-providers-config
            this.config = window.dataProvidersConfig.getProviderConfig('coingecko');

            // Rate limiter for managing request frequency
            this.rateLimiter = null;
            this.initRateLimiter();
        }

        /**
         * Build URL with proxy consideration (for file://)
         * On file:// using Cloudflare Worker proxy for CORS bypass
         */
        buildUrl(pathWithQuery) {
            // Skill anchor: on file:// and GitHub Pages ALL requests via proxy, direct access can be blocked by CORS.
            // See app/skills/file-protocol-cors-guard
            const needsProxy = this.isFileProtocol();

            // If proxy needed — use Cloudflare Worker
            if (needsProxy && window.cloudflareConfig) {
                // Split path and query params
                const [path, query] = pathWithQuery.split('?');
                const params = query ? Object.fromEntries(new URLSearchParams(query)) : {};

                return window.cloudflareConfig.getApiProxyEndpoint('coingecko', path, params);
            }

            // Otherwise — direct request to CoinGecko
            return `${this.config.baseUrl}${pathWithQuery}`;
        }

        /**
         * Initialize rate limiter
         */
        initRateLimiter() {
            if (window.RateLimiter) {
                const rateLimit = this.config.rateLimit;
                // Use shared named instance for CoinGecko (SSOT)
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
         * Get internal provider name
         */
        getName() {
            return 'coingecko';
        }

        /**
         * Get display name of provider
         */
        getDisplayName() {
            return 'CoinGecko';
        }

        /**
         * Check if API key is required
         */
        requiresApiKey() {
            return this.config.requiresApiKey;
        }

        /**
         * Check if proxy is required (file://, GitHub Pages, or localhost)
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
         * Pause between requests
         * @param {number} ms
         */
        async sleep(ms) {
            await new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Safely emit load progress events
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
         * Chunk size for top coins load
         * @param {number} count
         * @param {Object} options
         * @returns {number}
         */
        getTopCoinsChunkSize(count, options = {}) {
            const requestedChunkSize = Number(options.chunkSize);
            if (Number.isFinite(requestedChunkSize) && requestedChunkSize >= 1) {
                return Math.max(1, Math.min(250, Math.floor(requestedChunkSize)));
            }

            // Skill anchor: stabilizes file:// Top-N runbook (chunks to avoid 429 on heavy requests).
            // See core/skills/api-layer
            // On file:// use lighter mode: 25 coins per request
            if (this.isFileProtocol()) {
                return Math.min(25, count);
            }

            return Math.min(50, count);
        }

        /**
         * Whether to enable chunked top load
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
            // On file:// prefer chunks from 51 coins
            return this.isFileProtocol() && count > chunkSize;
        }

        /**
         * Build query params for /coins/markets
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

            // Param supported by CoinGecko /coins/markets, enable only on request
            if (options.includeRehypothecated === true) {
                params.set('include_rehypothecated', 'true');
            }

            return params;
        }

        /**
         * Get retry delay from Retry-After or fallback
         * @param {Response} response
         * @param {number} fallbackMs
         * @returns {number}
         */
        getRetryDelayMs(response, fallbackMs) {
            const retryAfterRaw = response && response.headers ? response.headers.get('Retry-After') : null;
            if (!retryAfterRaw) {
                return fallbackMs;
            }

            // Option 1: Retry-After in seconds
            const retryAfterSeconds = Number(retryAfterRaw);
            if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
                return Math.max(1000, retryAfterSeconds * 1000);
            }

            // Option 2: Retry-After as HTTP-date
            const retryAfterDate = Date.parse(retryAfterRaw);
            if (!Number.isNaN(retryAfterDate)) {
                return Math.max(1000, retryAfterDate - Date.now());
            }

            return fallbackMs;
        }

        /**
         * Normalize coins array to unified format
         * @param {Array} coins
         * @returns {Array}
         */
        normalizeTopCoinsList(coins) {
            return Array.isArray(coins) ? coins.map(coin => this.normalizeCoinData(coin)) : [];
        }

        /**
         * Fetch single /coins/markets page with retries
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
                            // @skill-anchor core/skills/data-providers-architecture #for-rate-limiting
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
         * Load top coins in chunks with progress
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
         * Get top N coins
         * @param {number} count - Coin count (1-250)
         * @param {string} sortBy - Sort: 'market_cap' | 'volume'
         * @param {Object} options - Additional options (apiKey, timeout)
         * @returns {Promise<Array>} Normalized coin data array
         */
        async getTopCoins(count = 100, sortBy = 'market_cap', options = {}) {
            if (!count || count <= 0 || count > 250) {
                throw new Error('Count must be between 1 and 250');
            }

            // Determine sort order
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
         * Search coins by name or ticker
         * @param {string} query - Search query
         * @param {Object} options - Additional options
         * @returns {Promise<Array>} Found coins array (up to 10)
         */
        async searchCoins(query, options = {}) {
            if (!query || query.length < 2) {
                return [];
            }

            // Use buildUrl for proxy support on file://
            const url = this.buildUrl(`/search?query=${encodeURIComponent(query)}`);

            try {
                // Wait for rate limiter
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

                // Decrease timeout on successful request
                if (this.rateLimiter) {
                    this.rateLimiter.decreaseTimeout();
                }

                const data = await response.json();
                let coins = data.coins || [];

                // Sort results: exact ticker matches first
                const queryLower = query.toLowerCase();
                coins.sort((a, b) => {
                    const aSymbol = a.symbol ? a.symbol.toLowerCase() : '';
                    const bSymbol = b.symbol ? b.symbol.toLowerCase() : '';

                    // Exact ticker match - to top
                    const aExactMatch = aSymbol === queryLower ? 1 : 0;
                    const bExactMatch = bSymbol === queryLower ? 1 : 0;
                    if (aExactMatch !== bExactMatch) {
                        return bExactMatch - aExactMatch;
                    }

                    // Ticker starts with query - higher
                    const aStartsWith = aSymbol.startsWith(queryLower) ? 1 : 0;
                    const bStartsWith = bSymbol.startsWith(queryLower) ? 1 : 0;
                    if (aStartsWith !== bStartsWith) {
                        return bStartsWith - aStartsWith;
                    }

                    // Rest sorted deterministically without hidden rank dependency.
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

                // Normalize search data: map thumb/large to image for consistency
                const normalizedResults = results.map(coin => ({
                    ...coin,
                    image: coin.thumb || coin.large || '', // Use thumb (small icon) or large if thumb missing
                    current_price: null, // Search does not return price
                    price_change_percentage_24h: null // Search does not return price change
                }));

                return normalizedResults;

            } catch (error) {
                this.logError('Search failed', error.message);
                return [];
            }
        }

        /**
         * Get coin data by IDs (with chunk and progress support)
         * @param {Array<string>} coinIds - Массив ID монет
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<Array>} Массив нормализованных данных монет
         */
        async getCoinData(coinIds, options = {}) {
            if (!coinIds || coinIds.length === 0) {
                return [];
            }

            // Skill anchor: force chunking for large ID sets on file://.
            // See core/skills/api-layer
            const totalCount = coinIds.length;
            const isFile = this.isFileProtocol();
            const maxChunkSize = isFile ? 25 : 50;

            // If coins exceed threshold, split into equal chunks
            if (totalCount > maxChunkSize || options.forceChunking) {
                const chunksTotal = Math.ceil(totalCount / maxChunkSize);
                // Compute chunk size for maximum uniformity
                const chunkSize = Math.ceil(totalCount / chunksTotal);
                // CoinGecko limit: ~3 req/60s. Safe delay — 21s.
                // On file:// use 21s, on HTTP (with key) can be less.
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

                    // Use internal method for single ID page request
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

            // If chunking not needed, single request via fetchCoinDataPage
            return await this.fetchCoinDataPage(coinIds, options, 1, 1, totalCount);
        }

        /**
         * Internal method for loading ID page with retries
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
         * Get coin ID by ticker
         * @param {string} symbol - Coin ticker (BTC, ETH, etc.)
         * @param {Object} options - Дополнительные опции
         * @returns {Promise<string|null>} Coin ID or null
         */
        async getCoinIdBySymbol(symbol, options = {}) {
            if (!symbol) return null;

            try {
                // Use search to get ID
                const results = await this.searchCoins(symbol, options);

                if (results.length === 0) {
                    return null;
                }

                // Find exact ticker match (case-insensitive)
                const symbolUpper = symbol.toUpperCase();
                const exactMatch = results.find(coin =>
                    coin.symbol && coin.symbol.toUpperCase() === symbolUpper
                );

                if (exactMatch) {
                    return exactMatch.id;
                }

                // If no exact match, return first result (most popular)
                return results[0].id || null;

            } catch (error) {
                this.logError(`Failed to get coin ID for symbol ${symbol}`, error.message);
                return null;
            }
        }

        /**
         * Normalize coin data to unified format
         * Adds pvs and individual PV* fields for math model compatibility
         * @param {Object} coinData - Coin data from CoinGecko API
         * @returns {Object} Normalized data
         */
        normalizeCoinData(coinData) {
            // Safe value extraction with fallback to 0
            const safeValue = (value) => {
                const num = parseFloat(value);
                return Number.isFinite(num) ? num : 0;
            };

            // Create pvs array (Price Variations) - for math model
            // Source: legacy app, old_app_not_write/parsing.js
            const pvs = [
                safeValue(coinData.price_change_percentage_1h_in_currency ?? coinData.price_change_percentage_1h),   // pvs[0] - PV1h
                safeValue(coinData.price_change_percentage_24h_in_currency ?? coinData.price_change_percentage_24h),  // pvs[1] - PV24h
                safeValue(coinData.price_change_percentage_7d_in_currency ?? coinData.price_change_percentage_7d),   // pvs[2] - PV7d
                safeValue(coinData.price_change_percentage_14d_in_currency ?? coinData.price_change_percentage_14d),  // pvs[3] - PV14d
                safeValue(coinData.price_change_percentage_30d_in_currency ?? coinData.price_change_percentage_30d),  // pvs[4] - PV30d
                safeValue(coinData.price_change_percentage_200d_in_currency ?? coinData.price_change_percentage_200d)  // pvs[5] - PV200d
            ];

            // Normalized format (unified for all providers)
            return {
                // Base fields
                id: coinData.id,
                symbol: coinData.symbol,
                name: coinData.name,
                image: coinData.image,
                current_price: safeValue(coinData.current_price),
                market_cap: safeValue(coinData.market_cap),
                market_cap_rank: coinData.market_cap_rank_with_rehypothecated || coinData.market_cap_rank || null,
                total_volume: safeValue(coinData.total_volume),

                // Price changes (normalized names without _in_currency)
                price_change_percentage_1h: pvs[0],
                price_change_percentage_24h: pvs[1],
                price_change_percentage_7d: pvs[2],
                price_change_percentage_14d: pvs[3],
                price_change_percentage_30d: pvs[4],
                price_change_percentage_200d: pvs[5],

                // For math model compatibility (legacy app)
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

    // Export via window
    window.CoinGeckoProvider = CoinGeckoProvider;

    console.log('✅ CoinGeckoProvider loaded');
})();
