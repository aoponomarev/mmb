/**
 * #JS-9Mg559JV
 * @description Universal proxy for CoinGecko, Yahoo Finance, Stooq; CORS bypass; KV caching; domain whitelist, rate limit, path validation.
 * @skill id:sk-7cf3f7
 *
 * ROUTES:
 * - /api/coingecko/*
 * - /api/yahoo-finance/*
 * - /api/stooq/*
 *
 * CACHING: KV store, Cache-Control headers; TTL by data type (e.g. coins 5 min, metrics 1 h).
 *
 * SECURITY: domain whitelist, path validation, optional env.RATE_LIMIT.
 */

import { jsonResponse, handleOptions } from './utils/cors.js';

// Supported APIs configuration
const API_CONFIGS = {
  coingecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
    defaultTTL: 300, // 5 minutes
    cacheTTL: {
      '/coins/markets': 300,        // 5 min (top coins)
      '/coins/list': 86400,          // 24 hours (all coins list)
      '/simple/price': 60,           // 1 min (current prices)
      '/global': 3600,               // 1 hour (global metrics)
    }
  },
  'yahoo-finance': {
    baseUrl: 'https://query1.finance.yahoo.com',
    defaultTTL: 3600, // 1 hour
    cacheTTL: {
      '/v8/finance/chart': 3600,    // 1 hour (historical data)
    }
  },
  stooq: {
    baseUrl: 'https://stooq.com',
    defaultTTL: 3600, // 1 hour
    cacheTTL: {
      '/q/d/l/': 3600,              // 1 hour (historical data)
    }
  }
};

/**
 * Get TTL for caching based on request path
 * @param {string} apiType - API type
 * @param {string} path - Request path
 * @returns {number} TTL in seconds
 */
function getCacheTTL(apiType, path) {
  const config = API_CONFIGS[apiType];
  if (!config) return 300; // Default 5 minutes

  // Check exact path match
  if (config.cacheTTL[path]) {
    return config.cacheTTL[path];
  }

  // Check partial match (for paths with params)
  for (const [pattern, ttl] of Object.entries(config.cacheTTL)) {
    if (path.startsWith(pattern)) {
      return ttl;
    }
  }

  return config.defaultTTL;
}

/**
 * Cache key generation for KV
 * Cloudflare KV key limit = 512 bytes. For long URLs (e.g. 50-coin /coins/markets),
 * we hash the query string portion to stay within limits.
 * @param {string} apiType - API type
 * @param {string} path - Request path
 * @param {string} queryString - Query params
 * @returns {Promise<string>} Cache key
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
 * Path validity check (injection protection)
 * @param {string} path - Request path
 * @returns {boolean} true if path valid
 */
function isValidPath(path) {
  // Forbid: ../, ..\, absolute paths, protocols
  const dangerousPatterns = [
    /\.\./,           // Parent directory
    /^[a-z]+:/i,      // Protocol (http:, file:, etc)
    /\/\//,           // Double slash
    /[<>'"]/,         // HTML/JS injection
  ];

  return !dangerousPatterns.some(pattern => pattern.test(path));
}

/**
 * Proxy request handling for CoinGecko
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment variables
 * @param {string} path - Path after /api/coingecko
 * @returns {Promise<Response>} Response from CoinGecko or from cache
 */
export async function handleCoinGeckoProxy(request, env, path) {
  return handleApiProxy(request, env, 'coingecko', path);
}

/**
 * Proxy request handling for Yahoo Finance
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment variables
 * @param {string} path - Path after /api/yahoo-finance
 * @returns {Promise<Response>} Response from Yahoo Finance or from cache
 */
export async function handleYahooFinanceProxy(request, env, path) {
  return handleApiProxy(request, env, 'yahoo-finance', path);
}

/**
 * Proxy request handling for Stooq
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment variables
 * @param {string} path - Path after /api/stooq
 * @returns {Promise<Response>} Response from Stooq or from cache
 */
export async function handleStooqProxy(request, env, path) {
  return handleApiProxy(request, env, 'stooq', path);
}

/**
 * Universal proxy request handler
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment variables
 * @param {string} apiType - API type
 * @param {string} path - Request path
 * @returns {Promise<Response>} Response from API or from cache
 */
async function handleApiProxy(request, env, apiType, path) {
  try {
    // API type validation
    const config = API_CONFIGS[apiType];
    if (!config) {
      return jsonResponse(
        { error: 'Unsupported API', message: `API type "${apiType}" is not supported` },
        { status: 400 }
      );
    }

    // Path validation
    if (!isValidPath(path)) {
      return jsonResponse(
        { error: 'Invalid Path', message: 'Path contains invalid characters' },
        { status: 400 }
      );
    }

    // Extract query params
    const url = new URL(request.url);
    const queryString = url.search.substring(1); // Remove '?'

    // Generate cache key (async — may hash long query strings)
    const cacheKey = await generateCacheKey(apiType, path, queryString);
    const cacheTTL = getCacheTTL(apiType, path);

    // Check KV cache (if available)
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

    // Build URL for external API
    const targetUrl = queryString
      ? `${config.baseUrl}${path}?${queryString}`
      : `${config.baseUrl}${path}`;

    console.log(`[API Proxy] Fetching: ${targetUrl}`);

    // Make request to external API
    const apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'app-Dataset-Integration/1.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    // Check response status
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

    // Parse response
    const data = await apiResponse.json();

    // Save to KV cache (if available)
    if (env.API_CACHE) {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL
      };
      // KV TTL in seconds, expirationTtl sets key lifetime
      await env.API_CACHE.put(cacheKey, JSON.stringify(cacheEntry), {
        expirationTtl: cacheTTL
      });
      console.log(`[API Proxy] Cached: ${cacheKey} (TTL: ${cacheTTL}s)`);
    }

    // Return response with CORS headers and Cache-Control
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
 * Universal proxy for any URL (mainly for images)
 * @param {Request} request - Incoming request
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>} Response from target URL
 */
// Domain whitelist for generic proxy (coin icons and public CDNs).
// Only these hosts can be proxied — protection from open proxy abuse.
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

    // Allow only http/https
    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return jsonResponse({ error: 'Unsupported protocol' }, { status: 400 });
    }

    // Skill anchor: domain whitelist protects from open proxy abuse.
    // Add new domains only after review.
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

    // Create new response to copy headers (Content-Type)
    const headers = new Headers(apiResponse.headers);
    // Add CORS headers
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

