/**
 * #JS-Jx5vBJtt
 * @description Main router for Cloudflare Workers API; routes /auth, /api/portfolios, /api/coin-sets, /api/datasets, /api/coingecko, /api/yahoo-finance, /api/stooq, /api/settings, /health.
 * @skill id:sk-02d3ea
 *
 * ROUTES: /auth/* (auth.js), /api/portfolios/* (portfolios.js), /api/coin-sets/* (coin-sets.js), /api/datasets/* (datasets.js), /api/coingecko|yahoo-finance|stooq/* (api-proxy.js), /api/settings/* (settings.js), /health.
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

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    try {
      let response;

      // Route by path
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
      // Error handling
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
