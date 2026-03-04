/**
 * ================================================================================================
 * PORTFOLIOS ENDPOINTS - API for portfolios
 * ================================================================================================
 *
 * PURPOSE: CRUD operations for user portfolios.
 * Skill: id:sk-02d3ea
 *
 * ENDPOINTS:
 * - GET /api/portfolios — list user portfolios (from D1)
 * - GET /api/portfolios/:id — get portfolio by ID (from D1)
 * - POST /api/portfolios — create portfolio (save to D1)
 * - PUT /api/portfolios/:id — update portfolio
 * - DELETE /api/portfolios/:id — delete portfolio
 *
 * USAGE:
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
 * Get user's list of portfolios
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables (DB, JWT_SECRET)
 * @returns {Promise<Response>} JSON response with portfolios list
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
 * Get portfolio by ID
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables (DB, JWT_SECRET)
 * @param {string} portfolioId - Portfolio ID
 * @returns {Promise<Response>} JSON response with portfolio
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

  // Access check
  if (portfolio.user_id !== userId) {
    return jsonResponse(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  return jsonResponse({ portfolio });
}

/**
 * Create portfolio
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables (DB, JWT_SECRET)
 * @returns {Promise<Response>} JSON response with created portfolio
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
 * Update portfolio
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables (DB, JWT_SECRET)
 * @param {string} portfolioId - Portfolio ID
 * @returns {Promise<Response>} JSON response with updated portfolio
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
 * Delete portfolio
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables (DB, JWT_SECRET)
 * @param {string} portfolioId - Portfolio ID
 * @returns {Promise<Response>} JSON response
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
 * Main portfolios endpoints handler
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} path - Request path
 * @returns {Promise<Response>} HTTP response
 */
export async function handlePortfolios(request, env, path) {
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // Extract ID from path (if present)
  const pathParts = path.split('/').filter(p => p);
  const portfolioId = pathParts.length === 3 && pathParts[2] ? pathParts[2] : null;

  // Route by method and path
  if (portfolioId) {
    // Operations on specific portfolio
    if (request.method === 'GET') {
      return await handleGet(request, env, portfolioId);
    } else if (request.method === 'PUT') {
      return await handleUpdate(request, env, portfolioId);
    } else if (request.method === 'DELETE') {
      return await handleDelete(request, env, portfolioId);
    }
  } else {
    // Operations on portfolios list
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
