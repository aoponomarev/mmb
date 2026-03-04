/**
 * #JS-d3cQ6czR
 * @description Datasets API: time-series and metrics CRUD; R2 storage deferred (stubs for now); handleDatasets(request, env, path).
 * @skill id:sk-02d3ea
 *
 * ENDPOINTS:
 * - GET /api/datasets/time-series/:coin/:date — get time series
 * - POST /api/datasets/time-series — save (batch)
 * - GET /api/datasets/metrics/:coin/:date — get metrics
 * - POST /api/datasets/metrics — save (batch)
 *
 * USAGE: handleDatasets(request, env, path). Full R2 implementation after R2 binding added.
 */

import { jsonResponse, handleOptions } from './utils/cors.js';
import { requireAuth } from './utils/auth.js';

/**
 * Get time series
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} coin - Coin ID
 * @param {string} date - Date
 * @returns {Promise<Response>} JSON response with time series
 */
async function handleGetTimeSeries(request, env, coin, date) {
  if (request.method !== 'GET') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  // TODO: After R2 is added, implement data fetch from R2
  // const userId = await requireAuth(request, env);
  // if (!userId) {
  //   return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  // }

  return jsonResponse({
    message: 'R2 storage is not available yet',
    coin,
    date,
    data: [],
  });
}

/**
 * Save time series
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>} JSON response
 */
async function handleSaveTimeSeries(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  // TODO: After R2 is added, implement saving data to R2
  // const userId = await requireAuth(request, env);
  // if (!userId) {
  //   return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  // }

  return jsonResponse({
    message: 'R2 storage is not available yet',
    success: false,
  });
}

/**
 * Get metrics
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} coin - Coin ID
 * @param {string} date - Date
 * @returns {Promise<Response>} JSON response with metrics
 */
async function handleGetMetrics(request, env, coin, date) {
  if (request.method !== 'GET') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  // TODO: After R2 is added, implement data fetch from R2
  return jsonResponse({
    message: 'R2 storage is not available yet',
    coin,
    date,
    data: {},
  });
}

/**
 * Save metrics
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>} JSON response
 */
async function handleSaveMetrics(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  // TODO: After R2 is added, implement saving data to R2
  return jsonResponse({
    message: 'R2 storage is not available yet',
    success: false,
  });
}

/**
 * Main datasets endpoints handler
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} path - Request path
 * @returns {Promise<Response>} HTTP response
 */
export async function handleDatasets(request, env, path) {
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // Parse path: /api/datasets/time-series/:coin/:date or /api/datasets/metrics/:coin/:date
  const pathParts = path.split('/').filter(p => p);

  if (pathParts.length >= 3) {
    const type = pathParts[2]; // 'time-series' или 'metrics'

    if (pathParts.length === 5 && type === 'time-series') {
      // GET /api/datasets/time-series/:coin/:date
      const coin = pathParts[3];
      const date = pathParts[4];
      return await handleGetTimeSeries(request, env, coin, date);
    } else if (pathParts.length === 3 && type === 'time-series') {
      // POST /api/datasets/time-series
      return await handleSaveTimeSeries(request, env);
    } else if (pathParts.length === 5 && type === 'metrics') {
      // GET /api/datasets/metrics/:coin/:date
      const coin = pathParts[3];
      const date = pathParts[4];
      return await handleGetMetrics(request, env, coin, date);
    } else if (pathParts.length === 3 && type === 'metrics') {
      // POST /api/datasets/metrics
      return await handleSaveMetrics(request, env);
    }
  }

  return jsonResponse(
    { error: 'Not Found', message: `Dataset endpoint ${path} not found` },
    { status: 404 }
  );
}
