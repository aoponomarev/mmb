/**
 * ================================================================================================
 * COIN SETS API - Endpoints for user coin sets
 * ================================================================================================
 *
 * PURPOSE: API for creating, reading, updating and deleting user coin sets.
 * Skill: id:sk-02d3ea
 *
 * ENDPOINTS:
 * - POST   /api/coin-sets          - Create coin set
 * - GET    /api/coin-sets          - Get user's list of sets
 * - GET    /api/coin-sets/:id      - Get set by ID
 * - PUT    /api/coin-sets/:id      - Update set
 * - DELETE /api/coin-sets/:id      - Delete set
 * - PATCH  /api/coin-sets/:id/toggle - Archive/unarchive
 *
 * REQUIREMENTS:
 * - All requests require auth (Bearer token)
 * - User can manage only their own sets
 * - coin_ids validated as string array
 *
 * USAGE:
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
 * Handle requests to /api/coin-sets
 * @param {Request} request - Request
 * @param {Object} env - Environment variables
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
    // Auth check
    const userId = await requireAuth(request, env);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    // Routing
    const pathParts = url.pathname.split('/').filter(Boolean);

    // GET /api/coin-sets - user's list of sets
    if (method === 'GET' && pathParts.length === 2) {
      const activeOnly = url.searchParams.get('active_only') === 'true';
      const coinSets = await getUserCoinSets(env.DB, userId, activeOnly);

      return jsonResponse({ coin_sets: coinSets });
    }

    // GET /api/coin-sets/:id - get set by ID
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

    // POST /api/coin-sets - create set
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

    // PUT /api/coin-sets/:id - update set
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

    // DELETE /api/coin-sets/:id - delete set
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

    // PATCH /api/coin-sets/:id/toggle - archive/unarchive
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

    // Unknown endpoint
    return jsonResponse({ error: 'Not found' }, { status: 404 });

  } catch (error) {
    console.error('handleCoinSets error:', error);
    return jsonResponse({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
