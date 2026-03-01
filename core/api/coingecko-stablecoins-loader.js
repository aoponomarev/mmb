/**
 * ================================================================================================
 * COINGECKO STABLECOINS LOADER
 * ================================================================================================
 * Skill: a/skills/app/skills/integrations/integrations-data-providers.md
 *
 * ЦЕЛЬ: Получать список стейблкоинов из CoinGecko (официальный источник),
 * сохранять в кэш (версионированный ключ stablecoins-list) и пробрасывать
 * в coinsConfig (единый источник правды). Поддерживает не-USD стейблы путем
 * определения базовой валюты по близости к 1 для нескольких валют.
 *
 * ИСПОЛЬЗУЕТ:
 * - window.cacheManager (для кэша, TTL задается в вызове)
 * - window.coinsConfig (для установки актуального списка)
 *
 * API:
 *   await window.coingeckoStablecoinsLoader.load({ forceRefresh: false, ttl: 24*60*60*1000 });
 *
 * Источник:
 * - CoinGecko markets: /coins/markets?vs_currency={currency}&category=stablecoins&per_page=250&page=N
 *   Для определения базовой валюты берем vs_currency из набора ['usd','eur','gbp'] и
 *   выбираем ту, где цена ближе всего к 1 (допуск ±8%).
 *
 * Источник:
 * - На file:// протоколе ВСЕ запросы ОБЯЗАТЕЛЬНО проксируются через Cloudflare Worker
 * - buildUrl() автоматически выбирает proxy (file://) или прямой запрос (HTTP/HTTPS)
 * - ЗАПРЕЩЕНО блокировать запросы на file:// с early return
 * - Подробности: `a/skills/app/skills/integrations/integrations-api-proxy.md`
 *
 * Ограничения:
 * - CoinGecko лимиты (30-50 req/min). Используется общий RateLimiter (ЕИП).
 * - Нет UI-алертов по требованию; только консоль.
 */

(function() {
    'use strict';

    const MAX_PER_PAGE = 250;
    // Минимизируем количество запросов, чтобы не ловить 429 и CORS без Access-Control-Allow-Origin.
    // Берем только USD (CoinGecko категория stablecoins включает мультивалютные стейблы),
    // одна страница до 250 записей.
    const BASE_CURRENCIES = ['usd'];
    const PEG_TOLERANCE = 0.08; // 8% допуск для определения базовой валюты
    const CACHE_KEY = 'stablecoins-list';

    /**
     * Построить URL с учетом прокси (для file://)
     * На file:// используется Cloudflare Worker proxy для обхода CORS
     */
    function buildUrl(path) {
        const isFile = window.location && (window.location.protocol === 'file:' || 
                       window.location.hostname.includes('github.io') || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1');

        // Если file:// — используем Cloudflare Worker proxy
        if (isFile && window.cloudflareConfig) {
            // Разделяем путь и query параметры
            const [apiPath, query] = path.split('?');
            const params = query ? Object.fromEntries(new URLSearchParams(query)) : {};

            return window.cloudflareConfig.getApiProxyEndpoint('coingecko', apiPath, params);
        }

        // Иначе — прямой запрос к CoinGecko
        const base = 'https://api.coingecko.com/api/v3';
        return `${base}${path}`;
    }

    /**
     * Получить общий rate limiter для CoinGecko
     */
    function getRateLimiter() {
        if (window.RateLimiter) {
            // Используем те же лимиты, что и в CoinGeckoProvider (ЕИП)
            // Но здесь мы берем конфигурацию из dataProvidersConfig, если она есть
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
        return window.rateLimiter; // fallback на старый API
    }

    async function fetchStablecoinsForCurrency(vsCurrency, page = 1) {
        const url = buildUrl(`/coins/markets?vs_currency=${vsCurrency}&category=stablecoins&per_page=${MAX_PER_PAGE}&page=${page}&sparkline=false&locale=en&include_rehypothecated=true`);
        const limiter = getRateLimiter();

        let attempts = 0;
        const maxAttempts = 5;
        const BASE_RETRY_DELAY = 10000; // 10 секунд базовая задержка при 429

        while (attempts < maxAttempts) {
            attempts++;

            // Ожидаем rate limiter
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
                            // Экспоненциальная задержка: 10s, 20s, 40s, 80s
                            const delay = BASE_RETRY_DELAY * Math.pow(2, attempts - 1);
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
            console.warn('coingeckoStablecoinsLoader: cacheManager или coinsConfig не загружены');
            return [];
        }
        // Жесткий лимит 24 часа: блокируем запросы, если недавно уже был успешный
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
        // Кэш
        if (!forceRefresh) {
            const cached = await window.cacheManager.get(CACHE_KEY, { useVersioning: true });
            if (cached && Array.isArray(cached.items) && cached.expiresAt && cached.expiresAt > Date.now()) {
                window.coinsConfig.setStablecoins(cached.items);
                console.log(`coingeckoStablecoinsLoader: использован кэш (${cached.items.length} стейблкоинов)`);
                return cached.items;
            }
        }

        try {
            // Сбор минимальный: только USD, первая страница
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

            // Сохраняем в кэш с TTL
            const payload = {
                items: normalized,
                expiresAt: Date.now() + ttl
            };
            await window.cacheManager.set(CACHE_KEY, payload, { useVersioning: true, ttl });
            if (window.requestRegistry) {
                window.requestRegistry.recordCall('coingecko', 'stablecoins', { vs: BASE_CURRENCIES }, 200, true);
            }
            window.coinsConfig.setStablecoins(normalized);
            console.log(`coingeckoStablecoinsLoader: загружено ${normalized.length} стейблкоинов`);

            return normalized;
        } catch (error) {
            console.error('coingeckoStablecoinsLoader: ошибка загрузки', error);
            if (window.requestRegistry) {
                const status = error.message && error.message.includes('429') ? 429 : 500;
                window.requestRegistry.recordCall('coingecko', 'stablecoins', { vs: BASE_CURRENCIES }, status, false);
            }
            // Если есть кэш без учета TTL — используем как fallback
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
