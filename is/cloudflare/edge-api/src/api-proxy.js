/**
 * ================================================================================================
 * API PROXY - Универсальный прокси для внешних API с KV кэшированием
 * ================================================================================================
 * Skill: a/skills/app/skills/integrations/integrations-api-proxy.md
 *
 * ЦЕЛЬ: Проксирование запросов к внешним API для обхода CORS при работе на file://
 *
 * ПОДДЕРЖИВАЕМЫЕ API:
 * - CoinGecko (https://api.coingecko.com/api/v3)
 * - Yahoo Finance (https://query1.finance.yahoo.com/v8/finance/chart)
 * - Stooq (https://stooq.com/q/d/l/)
 *
 * МАРШРУТЫ:
 * - /api/coingecko/* → CoinGecko API
 * - /api/yahoo-finance/* → Yahoo Finance API
 * - /api/stooq/* → Stooq API
 *
 * КЭШИРОВАНИЕ:
 * - Cloudflare KV для популярных запросов
 * - TTL зависит от типа данных (монеты: 5 мин, метрики: 1 час)
 * - Cache-Control headers для edge cache
 *
 * БЕЗОПАСНОСТЬ:
 * - Whitelist доменов (только разрешенные API)
 * - Rate limiting (опционально, через env.RATE_LIMIT)
 * - Валидация путей (только разрешенные endpoints)
 *
 * @param {Request} request - Входящий HTTP запрос
 * @param {Object} env - Переменные окружения (API_CACHE KV binding)
 * @param {string} apiType - Тип API ('coingecko', 'yahoo-finance', 'stooq')
 * @returns {Promise<Response>} HTTP ответ с CORS headers
 */

import { jsonResponse, handleOptions } from './utils/cors.js';

// Конфигурация поддерживаемых API
const API_CONFIGS = {
  coingecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
    defaultTTL: 300, // 5 минут
    cacheTTL: {
      '/coins/markets': 300,        // 5 минут (топ монет)
      '/coins/list': 86400,          // 24 часа (список всех монет)
      '/simple/price': 60,           // 1 минута (текущие цены)
      '/global': 3600,               // 1 час (глобальные метрики)
    }
  },
  'yahoo-finance': {
    baseUrl: 'https://query1.finance.yahoo.com',
    defaultTTL: 3600, // 1 час
    cacheTTL: {
      '/v8/finance/chart': 3600,    // 1 час (исторические данные)
    }
  },
  stooq: {
    baseUrl: 'https://stooq.com',
    defaultTTL: 3600, // 1 час
    cacheTTL: {
      '/q/d/l/': 3600,              // 1 час (исторические данные)
    }
  }
};

/**
 * Получить TTL для кэширования на основе пути запроса
 * @param {string} apiType - Тип API
 * @param {string} path - Путь запроса
 * @returns {number} TTL в секундах
 */
function getCacheTTL(apiType, path) {
  const config = API_CONFIGS[apiType];
  if (!config) return 300; // Дефолт 5 минут

  // Проверяем точное совпадение пути
  if (config.cacheTTL[path]) {
    return config.cacheTTL[path];
  }

  // Проверяем частичное совпадение (для путей с параметрами)
  for (const [pattern, ttl] of Object.entries(config.cacheTTL)) {
    if (path.startsWith(pattern)) {
      return ttl;
    }
  }

  return config.defaultTTL;
}

/**
 * Генерация ключа кэша для KV
 * Cloudflare KV key limit = 512 bytes. For long URLs (e.g. 50-coin /coins/markets),
 * we hash the query string portion to stay within limits.
 * @param {string} apiType - Тип API
 * @param {string} path - Путь запроса
 * @param {string} queryString - Query параметры
 * @returns {Promise<string>} Ключ кэша
 */
async function generateCacheKey(apiType, path, queryString) {
  const prefix = `api-cache:${apiType}:${path}`;
  if (!queryString) return prefix;

  const fullKey = `${prefix}?${queryString}`;
  // KV key limit is 512 bytes; use hash when approaching limit (with safety margin)
  if (fullKey.length <= 480) return fullKey;

  // SHA-256 hash of the query string to produce a compact, deterministic key
  const encoder = new TextEncoder();
  const data = encoder.encode(queryString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}?h=${hashHex}`;
}

/**
 * Проверка валидности пути (защита от инъекций)
 * @param {string} path - Путь запроса
 * @returns {boolean} true если путь валиден
 */
function isValidPath(path) {
  // Запрещаем: ../, ..\, абсолютные пути, протоколы
  const dangerousPatterns = [
    /\.\./,           // Parent directory
    /^[a-z]+:/i,      // Protocol (http:, file:, etc)
    /\/\//,           // Double slash
    /[<>'"]/,         // HTML/JS injection
  ];

  return !dangerousPatterns.some(pattern => pattern.test(path));
}

/**
 * Обработка прокси запроса для CoinGecko
 * @param {Request} request - Входящий запрос
 * @param {Object} env - Переменные окружения
 * @param {string} path - Путь после /api/coingecko
 * @returns {Promise<Response>} Ответ от CoinGecko или из кэша
 */
export async function handleCoinGeckoProxy(request, env, path) {
  return handleApiProxy(request, env, 'coingecko', path);
}

/**
 * Обработка прокси запроса для Yahoo Finance
 * @param {Request} request - Входящий запрос
 * @param {Object} env - Переменные окружения
 * @param {string} path - Путь после /api/yahoo-finance
 * @returns {Promise<Response>} Ответ от Yahoo Finance или из кэша
 */
export async function handleYahooFinanceProxy(request, env, path) {
  return handleApiProxy(request, env, 'yahoo-finance', path);
}

/**
 * Обработка прокси запроса для Stooq
 * @param {Request} request - Входящий запрос
 * @param {Object} env - Переменные окружения
 * @param {string} path - Путь после /api/stooq
 * @returns {Promise<Response>} Ответ от Stooq или из кэша
 */
export async function handleStooqProxy(request, env, path) {
  return handleApiProxy(request, env, 'stooq', path);
}

/**
 * Универсальный обработчик прокси запросов
 * @param {Request} request - Входящий запрос
 * @param {Object} env - Переменные окружения
 * @param {string} apiType - Тип API
 * @param {string} path - Путь запроса
 * @returns {Promise<Response>} Ответ от API или из кэша
 */
async function handleApiProxy(request, env, apiType, path) {
  try {
    // Валидация типа API
    const config = API_CONFIGS[apiType];
    if (!config) {
      return jsonResponse(
        { error: 'Unsupported API', message: `API type "${apiType}" is not supported` },
        { status: 400 }
      );
    }

    // Валидация пути
    if (!isValidPath(path)) {
      return jsonResponse(
        { error: 'Invalid Path', message: 'Path contains invalid characters' },
        { status: 400 }
      );
    }

    // Извлекаем query параметры
    const url = new URL(request.url);
    const queryString = url.search.substring(1); // Убираем '?'

    // Генерируем ключ кэша (async — may hash long query strings)
    const cacheKey = await generateCacheKey(apiType, path, queryString);
    const cacheTTL = getCacheTTL(apiType, path);

    // Проверяем KV кэш (если доступен)
    if (env.API_CACHE) {
      const cached = await env.API_CACHE.get(cacheKey, { type: 'json' });
      if (cached) {
        console.log(`[API Proxy] Cache HIT: ${cacheKey}`);
        const headers = new Headers();
        headers.set('X-Cache', 'HIT');
        headers.set('X-Cache-Key', cacheKey);
        headers.set('Cache-Control', `public, max-age=${cacheTTL}`);
        return jsonResponse(cached.data, { headers });
      }
      console.log(`[API Proxy] Cache MISS: ${cacheKey}`);
    }

    // Формируем URL для внешнего API
    const targetUrl = queryString
      ? `${config.baseUrl}${path}?${queryString}`
      : `${config.baseUrl}${path}`;

    console.log(`[API Proxy] Fetching: ${targetUrl}`);

    // Делаем запрос к внешнему API
    const apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'app-Dataset-Integration/1.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30 секунд таймаут
    });

    // Проверяем статус ответа
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`[API Proxy] Error: ${apiResponse.status} - ${errorText}`);
      return jsonResponse(
        {
          error: 'API Error',
          message: `${apiType} returned ${apiResponse.status}`,
          details: errorText
        },
        { status: apiResponse.status }
      );
    }

    // Парсим ответ
    const data = await apiResponse.json();

    // Сохраняем в KV кэш (если доступен)
    if (env.API_CACHE) {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL
      };
      // KV TTL в секундах, expirationTtl задает время жизни ключа
      await env.API_CACHE.put(cacheKey, JSON.stringify(cacheEntry), {
        expirationTtl: cacheTTL
      });
      console.log(`[API Proxy] Cached: ${cacheKey} (TTL: ${cacheTTL}s)`);
    }

    // Возвращаем ответ с CORS headers и Cache-Control
    const headers = new Headers();
    headers.set('X-Cache', 'MISS');
    headers.set('X-Cache-Key', cacheKey);
    headers.set('Cache-Control', `public, max-age=${cacheTTL}`);
    return jsonResponse(data, { headers });

  } catch (error) {
    console.error(`[API Proxy] Exception:`, error);
    return jsonResponse(
      {
        error: 'Proxy Error',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Универсальный прокси для любых URL (в основном для изображений)
 * @param {Request} request - Входящий запрос
 * @param {Object} env - Переменные окружения
 * @returns {Promise<Response>} Ответ от целевого URL
 */
// Whitelist доменов для generic proxy (иконки монет и публичные CDN).
// Только эти хосты могут быть проксированы — защита от open proxy abuse.
const GENERIC_PROXY_ALLOWED_HOSTS = new Set([
  'assets.coingecko.com',
  'coin-images.coingecko.com',
  's2.coinmarketcap.com',
  'cryptologos.cc',
  'raw.githubusercontent.com',
  'github.com',
  'githubusercontent.com',
  'upload.wikimedia.org',
  'icons.iconarchive.com',
  'cryptoicons.org',
]);

export async function handleGenericProxy(request, env) {
  try {
    const url = new URL(request.url);
    const targetUrlStr = url.searchParams.get('url');

    if (!targetUrlStr) {
      return jsonResponse({ error: 'Missing URL parameter' }, { status: 400 });
    }

    const targetUrl = new URL(targetUrlStr);

    // Разрешаем только http/https
    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return jsonResponse({ error: 'Unsupported protocol' }, { status: 400 });
    }

    // Skill anchor: whitelist доменов защищает от open proxy abuse.
    // Добавлять новые домены только после ревью.
    const hostname = targetUrl.hostname.toLowerCase();
    const allowed = [...GENERIC_PROXY_ALLOWED_HOSTS].some(
      h => hostname === h || hostname.endsWith(`.${h}`)
    );
    if (!allowed) {
      console.warn(`[Generic Proxy] Blocked: ${hostname}`);
      return jsonResponse(
        { error: 'Forbidden', message: `Domain "${hostname}" is not in the proxy allowlist` },
        { status: 403 }
      );
    }

    console.log(`[Generic Proxy] Fetching: ${targetUrl.toString()}`);

    const apiResponse = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'app-Dataset-Integration/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!apiResponse.ok) {
      return jsonResponse(
        { error: 'Fetch Error', message: `Target returned ${apiResponse.status}` },
        { status: apiResponse.status }
      );
    }

    // Создаем новый ответ, чтобы скопировать заголовки (Content-Type)
    const headers = new Headers(apiResponse.headers);
    // Добавляем CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Cache-Control', 'public, max-age=3600');

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers
    });

  } catch (error) {
    console.error(`[Generic Proxy] Exception:`, error);
    return jsonResponse({ error: 'Proxy Error', message: error.message }, { status: 500 });
  }
}

