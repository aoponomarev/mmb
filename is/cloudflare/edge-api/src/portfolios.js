/**
 * ================================================================================================
 * PORTFOLIOS ENDPOINTS - API для работы с портфелями
 * ================================================================================================
 *
 * ЦЕЛЬ: CRUD операции для портфелей пользователя.
 * Skill: a/skills/app/skills/integrations/integrations-cloudflare-core.md
 *
 * ENDPOINTS:
 * - GET /api/portfolios — список портфелей пользователя (из D1)
 * - GET /api/portfolios/:id — получение портфеля по ID (из D1)
 * - POST /api/portfolios — создание портфеля (сохранение в D1)
 * - PUT /api/portfolios/:id — обновление портфеля
 * - DELETE /api/portfolios/:id — удаление портфеля
 *
 * ИСПОЛЬЗОВАНИЕ:
 * import { handlePortfolios } from './portfolios.js';
 *
 * if (path.startsWith('/api/portfolios')) {
 *   return await handlePortfolios(request, env, path);
 * }
 */

import { jsonResponse, handleOptions } from './utils/cors.js';
import { requireAuth } from './utils/auth.js';
import {
  getUserPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} from './utils/d1-helpers.js';

/**
 * Получение списка портфелей пользователя
 * @param {Request} request - HTTP запрос
 * @param {Object} env - Переменные окружения (DB, JWT_SECRET)
 * @returns {Promise<Response>} JSON ответ со списком портфелей
 */
async function handleList(request, env) {
  if (request.method !== 'GET') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  const userId = await requireAuth(request, env);
  if (!userId) {
    return jsonResponse(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const portfolios = await getUserPortfolios(env.DB, userId);
  return jsonResponse({ portfolios });
}

/**
 * Получение портфеля по ID
 * @param {Request} request - HTTP запрос
 * @param {Object} env - Переменные окружения (DB, JWT_SECRET)
 * @param {string} portfolioId - ID портфеля
 * @returns {Promise<Response>} JSON ответ с портфелем
 */
async function handleGet(request, env, portfolioId) {
  if (request.method !== 'GET') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  const userId = await requireAuth(request, env);
  if (!userId) {
    return jsonResponse(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const portfolio = await getPortfolio(env.DB, portfolioId);

  if (!portfolio) {
    return jsonResponse(
      { error: 'Portfolio not found' },
      { status: 404 }
    );
  }

  // Проверка прав доступа
  if (portfolio.user_id !== userId) {
    return jsonResponse(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  return jsonResponse({ portfolio });
}

/**
 * Создание портфеля
 * @param {Request} request - HTTP запрос
 * @param {Object} env - Переменные окружения (DB, JWT_SECRET)
 * @returns {Promise<Response>} JSON ответ с созданным портфелем
 */
async function handleCreate(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  const userId = await requireAuth(request, env);
  if (!userId) {
    return jsonResponse(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, description, assets } = body;

    if (!name) {
      return jsonResponse(
        { error: 'Portfolio name is required' },
        { status: 400 }
      );
    }

    const portfolio = await createPortfolio(env.DB, userId, {
      name,
      description,
      assets: assets || [],
    });

    if (!portfolio) {
      return jsonResponse(
        { error: 'Failed to create portfolio' },
        { status: 500 }
      );
    }

    return jsonResponse({ portfolio }, { status: 201 });
  } catch (error) {
    console.error('portfolios.handleCreate error:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Обновление портфеля
 * @param {Request} request - HTTP запрос
 * @param {Object} env - Переменные окружения (DB, JWT_SECRET)
 * @param {string} portfolioId - ID портфеля
 * @returns {Promise<Response>} JSON ответ с обновлённым портфелем
 */
async function handleUpdate(request, env, portfolioId) {
  if (request.method !== 'PUT') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  const userId = await requireAuth(request, env);
  if (!userId) {
    return jsonResponse(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, description, assets } = body;

    const portfolio = await updatePortfolio(env.DB, portfolioId, userId, {
      name,
      description,
      assets,
    });

    if (!portfolio) {
      return jsonResponse(
        { error: 'Portfolio not found or access denied' },
        { status: 404 }
      );
    }

    return jsonResponse({ portfolio });
  } catch (error) {
    console.error('portfolios.handleUpdate error:', error);
    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Удаление портфеля
 * @param {Request} request - HTTP запрос
 * @param {Object} env - Переменные окружения (DB, JWT_SECRET)
 * @param {string} portfolioId - ID портфеля
 * @returns {Promise<Response>} JSON ответ
 */
async function handleDelete(request, env, portfolioId) {
  if (request.method !== 'DELETE') {
    return jsonResponse(
      { error: 'Method Not Allowed' },
      { status: 405 }
    );
  }

  const userId = await requireAuth(request, env);
  if (!userId) {
    return jsonResponse(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const success = await deletePortfolio(env.DB, portfolioId, userId);

  if (!success) {
    return jsonResponse(
      { error: 'Portfolio not found or access denied' },
      { status: 404 }
    );
  }

  return jsonResponse({ success: true });
}

/**
 * Главный обработчик portfolios endpoints
 * @param {Request} request - HTTP запрос
 * @param {Object} env - Переменные окружения
 * @param {string} path - Путь запроса
 * @returns {Promise<Response>} HTTP ответ
 */
export async function handlePortfolios(request, env, path) {
  // Обработка preflight OPTIONS запросов
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // Извлечение ID из пути (если есть)
  const pathParts = path.split('/').filter(p => p);
  const portfolioId = pathParts.length === 3 && pathParts[2] ? pathParts[2] : null;

  // Маршрутизация по методам и путям
  if (portfolioId) {
    // Операции с конкретным портфелем
    if (request.method === 'GET') {
      return await handleGet(request, env, portfolioId);
    } else if (request.method === 'PUT') {
      return await handleUpdate(request, env, portfolioId);
    } else if (request.method === 'DELETE') {
      return await handleDelete(request, env, portfolioId);
    }
  } else {
    // Операции со списком портфелей
    if (request.method === 'GET') {
      return await handleList(request, env);
    } else if (request.method === 'POST') {
      return await handleCreate(request, env);
    }
  }

  return jsonResponse(
    { error: 'Not Found', message: `Portfolio endpoint ${path} not found` },
    { status: 404 }
  );
}
