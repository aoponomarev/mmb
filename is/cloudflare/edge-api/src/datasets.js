/**
 * ================================================================================================
 * DATASETS ENDPOINTS - API for работы с датасетами (time-series, metrics)
 * ================================================================================================
 *
 * PURPOSE: CRUD операции for временных рядов и metrics.
 * Skill: id:sk-02d3ea
 *
 * ENDPOINTS:
 * - GET /api/datasets/time-series/:coin/:date — получение временных рядов
 * - POST /api/datasets/time-series — сохранение временных рядов (batch)
 * - GET /api/datasets/metrics/:coin/:date — получение metrics
 * - POST /api/datasets/metrics — сохранение metrics (batch)
 *
 * ПРИМЕЧАНИЕ: R2 хранилище отложено, поэтому временно возвращаем заглушки.
 * После добавления R2 будет реализована полная функциональность.
 *
 * USAGE:
 * import { handleDatasets } from './datasets.js';
 *
 * if (path.startsWith('/api/datasets')) {
 *   return await handleDatasets(request, env, path);
 * }
 */

import { jsonResponse, handleOptions } from './utils/cors.js';
import { requireAuth } from './utils/auth.js';

/**
 * Получение временных рядов
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} coin - ID монеты
 * @param {string} date - Дата
 * @returns {Promise<Response>} JSON response с временными рядами
 */
async function handleGetTimeSeries(request, env, coin, date) {
  if (request.method !== 'GET') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  // TODO: После добавления R2 реализовать получение данных из R2
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
 * Сохранение временных рядов
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

  // TODO: После добавления R2 реализовать сохранение данных в R2
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
 * Получение metrics
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} coin - ID монеты
 * @param {string} date - Дата
 * @returns {Promise<Response>} JSON response с metricsами
 */
async function handleGetMetrics(request, env, coin, date) {
  if (request.method !== 'GET') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  // TODO: После добавления R2 реализовать получение данных из R2
  return jsonResponse({
    message: 'R2 storage is not available yet',
    coin,
    date,
    data: {},
  });
}

/**
 * Сохранение metrics
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

  // TODO: После добавления R2 реализовать сохранение данных в R2
  return jsonResponse({
    message: 'R2 storage is not available yet',
    success: false,
  });
}

/**
 * Главный обработчик datasets endpoints
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} path - Request path
 * @returns {Promise<Response>} HTTP ответ
 */
export async function handleDatasets(request, env, path) {
  // Handle preflight OPTIONS запросов
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // Парсинг пути: /api/datasets/time-series/:coin/:date или /api/datasets/metrics/:coin/:date
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
