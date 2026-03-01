/**
 * ================================================================================================
 * COIN SETS API - Endpoints для работы с пользовательскими наборами монет
 * ================================================================================================
 *
 * ЦЕЛЬ: API для создания, чтения, обновления и удаления наборов монет пользователей.
 * Skill: core/skills/config-contracts
 *
 * ENDPOINTS:
 * - POST   /api/coin-sets          - Создание набора монет
 * - GET    /api/coin-sets          - Получение списка наборов пользователя
 * - GET    /api/coin-sets/:id      - Получение набора по ID
 * - PUT    /api/coin-sets/:id      - Обновление набора
 * - DELETE /api/coin-sets/:id      - Удаление набора
 * - PATCH  /api/coin-sets/:id/toggle - Архивирование/разархивирование
 *
 * ТРЕБОВАНИЯ:
 * - Все запросы требуют авторизации (Bearer token)
 * - Пользователь может управлять только своими наборами
 * - coin_ids валидируется как массив строк
 *
 * ИСПОЛЬЗОВАНИЕ:
 * import { handleCoinSets } from './coin-sets.js';
 * const response = await handleCoinSets(request, env);
 */

import { requireAuth } from './utils/auth.js';
import { jsonResponse, handleOptions } from './utils/cors.js';
import {
  createCoinSet,
  getCoinSet,
  getUserCoinSets,
  updateCoinSet,
  deleteCoinSet,
  toggleCoinSetActive
} from './utils/d1-helpers.js';

/**
 * Обработка запросов к /api/coin-sets
 * @param {Request} request - Запрос
 * @param {Object} env - Переменные окружения
 * @returns {Promise<Response>}
 */
export async function handleCoinSets(request, env) {
  const url = new URL(request.url);
  const method = request.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return handleOptions(request);
  }

  try {
    // Проверка авторизации
    const userId = await requireAuth(request, env);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    // Роутинг
    const pathParts = url.pathname.split('/').filter(Boolean);

    // GET /api/coin-sets - список наборов пользователя
    if (method === 'GET' && pathParts.length === 2) {
      const activeOnly = url.searchParams.get('active_only') === 'true';
      const coinSets = await getUserCoinSets(env.DB, userId, activeOnly);

      return jsonResponse({ coin_sets: coinSets });
    }

    // GET /api/coin-sets/:id - получение набора по ID
    if (method === 'GET' && pathParts.length === 3) {
      const coinSetId = parseInt(pathParts[2], 10);
      if (isNaN(coinSetId)) {
        return jsonResponse({ error: 'Invalid coin set ID' }, { status: 400 });
      }

      const coinSet = await getCoinSet(env.DB, coinSetId);
      if (!coinSet || coinSet.user_id !== userId) {
        return jsonResponse({ error: 'Coin set not found' }, { status: 404 });
      }

      return jsonResponse({ coin_set: coinSet });
    }

    // POST /api/coin-sets - создание набора
    if (method === 'POST' && pathParts.length === 2) {
      const body = await request.json();
      const { name, description, coin_ids, is_active, provider } = body;

      if (!name || typeof name !== 'string') {
        return jsonResponse({ error: 'Name is required' }, { status: 400 });
      }

      if (!Array.isArray(coin_ids)) {
        return jsonResponse({ error: 'coin_ids must be an array' }, { status: 400 });
      }

      const coinSet = await createCoinSet(env.DB, userId, {
        name,
        description: description || null,
        coin_ids,
        is_active: is_active !== undefined ? is_active : 1,
        provider: provider || 'coingecko'
      });

      if (!coinSet) {
        return jsonResponse({ error: 'Failed to create coin set' }, { status: 500 });
      }

      return jsonResponse({ coin_set: coinSet }, { status: 201 });
    }

    // PUT /api/coin-sets/:id - обновление набора
    if (method === 'PUT' && pathParts.length === 3) {
      const coinSetId = parseInt(pathParts[2], 10);
      if (isNaN(coinSetId)) {
        return jsonResponse({ error: 'Invalid coin set ID' }, { status: 400 });
      }

      const body = await request.json();
      const { name, description, coin_ids, is_active, provider } = body;

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (coin_ids !== undefined) {
        if (!Array.isArray(coin_ids)) {
          return jsonResponse({ error: 'coin_ids must be an array' }, { status: 400 });
        }
        updates.coin_ids = coin_ids;
      }
      if (is_active !== undefined) updates.is_active = is_active;
      if (provider !== undefined) updates.provider = provider;

      const coinSet = await updateCoinSet(env.DB, coinSetId, userId, updates);

      if (!coinSet) {
        return jsonResponse({ error: 'Failed to update coin set' }, { status: 500 });
      }

      return jsonResponse({ coin_set: coinSet });
    }

    // DELETE /api/coin-sets/:id - удаление набора
    if (method === 'DELETE' && pathParts.length === 3) {
      const coinSetId = parseInt(pathParts[2], 10);
      if (isNaN(coinSetId)) {
        return jsonResponse({ error: 'Invalid coin set ID' }, { status: 400 });
      }

      const success = await deleteCoinSet(env.DB, coinSetId, userId);

      if (!success) {
        return jsonResponse({ error: 'Failed to delete coin set' }, { status: 500 });
      }

      return jsonResponse({ success: true });
    }

    // PATCH /api/coin-sets/:id/toggle - архивирование/разархивирование
    if (method === 'PATCH' && pathParts.length === 4 && pathParts[3] === 'toggle') {
      const coinSetId = parseInt(pathParts[2], 10);
      if (isNaN(coinSetId)) {
        return jsonResponse({ error: 'Invalid coin set ID' }, { status: 400 });
      }

      const body = await request.json();
      const { is_active } = body;

      if (typeof is_active !== 'boolean' && typeof is_active !== 'number') {
        return jsonResponse({ error: 'is_active is required (boolean or number)' }, { status: 400 });
      }

      const coinSet = await toggleCoinSetActive(env.DB, coinSetId, userId, is_active);

      if (!coinSet) {
        return jsonResponse({ error: 'Failed to toggle coin set' }, { status: 500 });
      }

      return jsonResponse({ coin_set: coinSet });
    }

    // Неизвестный endpoint
    return jsonResponse({ error: 'Not found' }, { status: 404 });

  } catch (error) {
    console.error('handleCoinSets error:', error);
    return jsonResponse({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
