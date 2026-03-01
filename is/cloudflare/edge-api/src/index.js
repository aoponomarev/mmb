/**
 * ================================================================================================
 * MAIN ROUTER - Главный роутер для Cloudflare Workers API
 * ================================================================================================
 * Skill: a/skills/app/skills/integrations/integrations-cloudflare-core.md
 *
 * ЦЕЛЬ: Обработка всех входящих запросов и маршрутизация к соответствующим handlers.
 *
 * МАРШРУТЫ:
 * - /auth/* → OAuth endpoints (auth.js)
 * - /api/portfolios/* → Portfolios API (portfolios.js)
 * - /api/coin-sets/* → Coin Sets API (coin-sets.js)
 * - /api/datasets/* → Datasets API (datasets.js)
 * - /api/coingecko/* → CoinGecko API Proxy (api-proxy.js)
 * - /api/yahoo-finance/* → Yahoo Finance API Proxy (api-proxy.js)
 * - /api/stooq/* → Stooq API Proxy (api-proxy.js)
 * - /api/settings/* → App Settings (settings.js, KV-backed)
 * - /health → Health check endpoint
 *
 * @param {Request} request - Входящий HTTP запрос
 * @param {Object} env - Переменные окружения и bindings (DB, API_CACHE, secrets)
 * @returns {Promise<Response>} HTTP ответ
 */

import { handleAuth } from './auth.js';
import { handlePortfolios } from './portfolios.js';
import { handleCoinSets } from './coin-sets.js';
import { handleDatasets } from './datasets.js';
import { handleCoinGeckoProxy, handleYahooFinanceProxy, handleStooqProxy, handleGenericProxy } from './api-proxy.js';
import { handleSettings } from './settings.js';
import { jsonResponse, handleOptions } from './utils/cors.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Обработка preflight OPTIONS запросов
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    try {
      let response;

      // Маршрутизация по путям
      if (path.startsWith('/auth/')) {
        // OAuth endpoints
        response = await handleAuth(request, env, path);
      } else if (path.startsWith('/api/portfolios')) {
        // Portfolios API
        response = await handlePortfolios(request, env, path);
      } else if (path.startsWith('/api/coin-sets')) {
        // Coin Sets API
        response = await handleCoinSets(request, env);
      } else if (path.startsWith('/api/datasets')) {
        // Datasets API
        response = await handleDatasets(request, env, path);
      } else if (path.startsWith('/api/coingecko/')) {
        // CoinGecko API Proxy
        const proxyPath = path.substring('/api/coingecko'.length);
        response = await handleCoinGeckoProxy(request, env, proxyPath);
      } else if (path.startsWith('/api/yahoo-finance/')) {
        // Yahoo Finance API Proxy
        const proxyPath = path.substring('/api/yahoo-finance'.length);
        response = await handleYahooFinanceProxy(request, env, proxyPath);
      } else if (path.startsWith('/api/stooq/')) {
        // Stooq API Proxy
        const proxyPath = path.substring('/api/stooq'.length);
        response = await handleStooqProxy(request, env, proxyPath);
      } else if (path === '/api/proxy') {
        // Generic Proxy (for images/external resources)
        response = await handleGenericProxy(request, env);
      } else if (path.startsWith('/api/settings')) {
        // App Settings API (KV-backed, replaces continue-wrapper snapshots)
        response = await handleSettings(request, env, path);
      } else if (path === '/' || path === '/health') {
        // Health check endpoint
        response = jsonResponse({
          status: 'ok',
          service: 'app Dataset Integration API',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        });
      } else {
        // 404 Not Found
        response = jsonResponse(
          {
            error: 'Not Found',
            message: `Endpoint ${path} not found`,
          },
          { status: 404 }
        );
      }

      return response;
    } catch (error) {
      // Обработка ошибок
      console.error('Worker error:', error);
      return jsonResponse(
        {
          error: 'Internal Server Error',
          message: error.message || 'An unexpected error occurred',
        },
        { status: 500 }
      );
    }
  },
};
