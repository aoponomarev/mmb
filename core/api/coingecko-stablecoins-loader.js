/**
 * #JS-ax34MBX8
 * @description Fetch stablecoins from CoinGecko; cache (versioned stablecoins-list), pass to coinsConfig; supports non-USD by base currency detection.
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * USES: window.cacheManager, window.coinsConfig.
 *
 * USAGE:
 * await window.coingeckoStablecoinsLoader.load({ forceRefresh: false, ttl: 24*60*60*1000 });
 *
 * SOURCE: CoinGecko /coins/markets?vs_currency={currency}&category=stablecoins&per_page=250; base currency from ['usd','eur','gbp'] closest to 1 (±8%).
 *
 * FILE PROTOCOL: On file:// all requests proxied via Cloudflare Worker; buildUrl() auto-selects proxy or direct; details id:sk-7cf3f7.
 *
 * LIMITATIONS: CoinGecko 30-50 req/min; shared RateLimiter; no UI alerts on demand.
 */

(function() {
    'use strict';

    const MAX_PER_PAGE = 250;
    // Minimize requests to avoid 429 and CORS without Access-Control-Allow-Origin.
    // USD only (CoinGecko stablecoins category includes multi-currency stables),
    // one page up to 250 records.
    const BASE_CURRENCIES = ['usd'];
    const PEG_TOLERANCE = 0.08; // 8% tolerance for base currency detection
    const CACHE_KEY = 'stablecoins-list';

    /**
     * Build URL with proxy consideration (for file://)
     * On file:// using Cloudflare Worker proxy for CORS bypass
     */
    function buildUrl(path) {
        const isFile = window.location && (window.location.protocol === 'file:' || 
                       window.location.hostname.includes('github.io') || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1');

        // If file:// — use Cloudflare Worker proxy
        if (isFile && window.cloudflareConfig) {
            // Split path and query params
            const [apiPath, query] = path.split('?');
            const params = query ? Object.fromEntries(new URLSearchParams(query)) : {};

            return window.cloudflareConfig.getApiProxyEndpoint('coingecko', apiPath, params);
        }

        // Otherwise — direct request to CoinGecko
        const base = 'https://api.coingecko.com/api/v3';
        return `${base}${path}`;
    }

    /**
     * Get shared rate limiter for CoinGecko
     */
    function getRateLimiter() {
        if (window.RateLimiter) {
            // Use same limits as CoinGeckoProvider (SSOT)
            // Here we take config from dataProvidersConfig if available
            let reqPerMin = 2;
            let reqPerSec = 0.048;
            if (window.dataProvidersConfig) {
                const config = window.dataProvidersConfig.getProviderConfig('coingecko');
                if (config && config.rateLimit) {
                    reqPerMin = config.rateLimit.requestsPerMinute;
                    reqPerSec = config.rateLimit.requestsPerSecond;
                }
            }
            return window.RateLimiter.getOrCreate('coingecko', reqPerMin, reqPerSec);
        }
        return window.rateLimiter; // fallback to legacy API
    }

    async function fetchStablecoinsForCurrency(vsCurrency, page = 1) {
        const url = buildUrl(`/coins/markets?vs_currency=${vsCurrency}&category=stablecoins&per_page=${MAX_PER_PAGE}&page=${page}&sparkline=false&locale=en&include_rehypothecated=true`);
        const limiter = getRateLimiter();

        let attempts = 0;
        const maxAttempts = 5;
        // Stablecoins are non-critical for core UI, so retry conservatively on 429.
        const BASE_RETRY_DELAY = 30000; // 30 seconds base delay on 429
        const MAX_RETRY_DELAY = 10 * 60 * 1000; // cap backoff to 10 minutes

        while (attempts < maxAttempts) {
            attempts++;

            // Wait for rate limiter
            if (limiter && typeof limiter.waitForToken === 'function') {
                await limiter.waitForToken();
            } else if (limiter && typeof limiter.waitBeforeRequest === 'function') {
                await limiter.waitBeforeRequest();
            }

            try {
                const response = await fetch(url);

                if (!response.ok) {
                    if (response.status === 429) {
                        if (limiter && typeof limiter.increaseTimeout === 'function') {
                            limiter.increaseTimeout();
                        }
                        if (attempts < maxAttempts) {
                            // Prefer server hint; fallback to conservative exponential backoff.
                            const retryAfterHeader = response.headers && typeof response.headers.get === 'function'
                                ? response.headers.get('Retry-After')
                                : null;
                            const retryAfterSeconds = Number(retryAfterHeader);
                            const backoffDelay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempts - 1), MAX_RETRY_DELAY);
                            const retryAfterDelay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                                ? retryAfterSeconds * 1000
                                : 0;
                            const delay = Math.max(backoffDelay, retryAfterDelay);
                            console.warn(`coingecko-stablecoins-loader: HTTP 429, попытка ${attempts} из ${maxAttempts}, ожидание ${Math.round(delay/1000)}s...`);
                            await new Promise(r => setTimeout(r, delay));
                            continue;
                        }
                    }
                    throw new Error(`CoinGecko stablecoins (${vsCurrency}) HTTP ${response.status}`);
                }
                const data = await response.json();
                return Array.isArray(data) ? data : [];
            } catch (error) {
                if (attempts >= maxAttempts) throw error;
                console.warn(`coingecko-stablecoins-loader: ошибка запроса (попытка ${attempts}):`, error);
                await new Promise(r => setTimeout(r, 2000 * attempts));
            }
        }
    }

    function detectBaseCurrency(prices) {
        let best = { currency: 'unknown', diff: Number.POSITIVE_INFINITY };
        BASE_CURRENCIES.forEach(currency => {
            const price = prices[currency];
            if (typeof price !== 'number') {
                return;
            }
            const diff = Math.abs(price - 1);
            if (diff < best.diff) {
                best = { currency, diff };
            }
        });
        if (best.diff <= PEG_TOLERANCE) {
            return best.currency;
        }
        return 'other';
    }

    function normalizeEntry(rawByCurrency) {
        // rawByCurrency: { [vsCurrency]: coin }
        const anyCoin = rawByCurrency[BASE_CURRENCIES.find(c => rawByCurrency[c])] || rawByCurrency.usd || Object.values(rawByCurrency)[0];
        if (!anyCoin) return null;

        const prices = {};
        BASE_CURRENCIES.forEach(c => {
            prices[c] = rawByCurrency[c]?.current_price;
        });

        const baseCurrency = detectBaseCurrency(prices);
        return {
            id: anyCoin.id,
            symbol: (anyCoin.symbol || '').toLowerCase(),
            name: anyCoin.name || '',
            baseCurrency,
            source: 'coingecko',
            updatedAt: Date.now()
        };
    }

    async function load({ forceRefresh = false, ttl = 24 * 60 * 60 * 1000 } = {}) {
        if (!window.cacheManager || !window.coinsConfig) {
            console.warn('coingeckoStablecoinsLoader: cacheManager or coinsConfig not loaded');
            return [];
        }
        // Hard 24h limit: block requests if successful one was recent
        if (!forceRefresh && window.requestRegistry) {
            const minInterval = 24 * 60 * 60 * 1000;
            const allowed = window.requestRegistry.isAllowed('coingecko', 'stablecoins', { vs: BASE_CURRENCIES }, minInterval);
            if (!allowed) {
                const cached = await window.cacheManager.get(CACHE_KEY, { useVersioning: true });
                if (cached && Array.isArray(cached.items)) {
                    window.coinsConfig.setStablecoins(cached.items);
                    console.log('coingeckoStablecoinsLoader: запрос заблокирован журналом (24h), используем кэш');
                    return cached.items;
                }
                return [];
            }
        }
        // Cache
        if (!forceRefresh) {
            const cached = await window.cacheManager.get(CACHE_KEY, { useVersioning: true });
            if (cached && Array.isArray(cached.items) && cached.expiresAt && cached.expiresAt > Date.now()) {
                window.coinsConfig.setStablecoins(cached.items);
                console.log(`coingeckoStablecoinsLoader: использован кэш (${cached.items.length} стейблкоинов)`);
                return cached.items;
            }
        }

        try {
            // Minimal fetch: USD only, first page
            const byId = new Map();
            for (const vsCurrency of BASE_CURRENCIES) {
                const chunk = await fetchStablecoinsForCurrency(vsCurrency, 1);
                chunk.forEach(coin => {
                    if (!byId.has(coin.id)) {
                        byId.set(coin.id, {});
                    }
                    byId.get(coin.id)[vsCurrency] = coin;
                });
            }

            const normalized = [];
            for (const entry of byId.values()) {
                const norm = normalizeEntry(entry);
                if (norm) {
                    normalized.push(norm);
                }
            }

            // Save to cache with TTL
            const payload = {
                items: normalized,
                expiresAt: Date.now() + ttl
            };
            await window.cacheManager.set(CACHE_KEY, payload, { useVersioning: true, ttl });
            if (window.requestRegistry) {
                window.requestRegistry.recordCall('coingecko', 'stablecoins', { vs: BASE_CURRENCIES }, 200, true);
            }
            window.coinsConfig.setStablecoins(normalized);
            console.log(`coingeckoStablecoinsLoader: loaded ${normalized.length} stablecoins`);

            return normalized;
        } catch (error) {
            console.error('coingeckoStablecoinsLoader: ошибка загрузки', error);
            if (window.requestRegistry) {
                const status = error.message && error.message.includes('429') ? 429 : 500;
                window.requestRegistry.recordCall('coingecko', 'stablecoins', { vs: BASE_CURRENCIES }, status, false);
            }
            // If cache exists regardless of TTL — use as fallback
            const cached = await window.cacheManager.get(CACHE_KEY, { useVersioning: true });
            if (cached && Array.isArray(cached.items)) {
                window.coinsConfig.setStablecoins(cached.items);
                console.warn('coingeckoStablecoinsLoader: использован устаревший кэш');
                return cached.items;
            }

            return [];
        }
    }

    window.coingeckoStablecoinsLoader = {
        load
    };
})();
