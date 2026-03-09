/**
 * #JS-2fGHr2c5
 * @description App settings in Cloudflare KV (SETTINGS namespace); get/set all or by key; auth via Bearer SETTINGS_TOKEN or JWT.
 * @skill id:sk-02d3ea
 *
 * ROUTES:
 * - GET /api/settings — all settings (import into UI)
 * - POST /api/settings — save all (export from UI)
 * - GET /api/settings/:key — single field
 * - PUT /api/settings/:key — set single field
 *
 * FIELDS: provider, yandexApiKey, yandexFolderId, yandexModel, perplexityApiKey, perplexityModel, githubToken, apiBaseUrl, syncEnabled.
 *
 * SECURITY: Bearer token (SETTINGS_TOKEN or OAuth JWT); without SETTINGS_TOKEN endpoint unavailable.
 */

import { jsonResponse } from './utils/cors.js';
import { requireAuth } from './utils/auth.js';

const KV_KEY = 'app-app-settings';
const USER_KEY_PREFIX = `${KV_KEY}:user:`;

/**
 * Allow 2 auth types:
 * 1) Service token: SETTINGS_TOKEN (legacy/migration, manual access)
 * 2) OAuth JWT: current user token after Google login
 */
async function resolveAuthorizationContext(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearerToken) {
    return { authorized: false, mode: null, userId: null, reason: 'Missing bearer token' };
  }

  const expectedToken = env.SETTINGS_TOKEN;
  if (expectedToken && bearerToken === expectedToken) {
    return { authorized: true, mode: 'settings-token', userId: null, reason: '' };
  }

  const userId = await requireAuth(request, env);
  if (userId) {
    return { authorized: true, mode: 'oauth-jwt', userId, reason: '' };
  }

  if (!expectedToken && !env.JWT_SECRET) {
    return { authorized: false, mode: null, userId: null, reason: 'SETTINGS_TOKEN and JWT_SECRET not configured' };
  }
  return { authorized: false, mode: null, userId: null, reason: 'Token mismatch or invalid JWT' };
}

function getScopedSettingsKey(authContext) {
  if (authContext && authContext.userId) {
    return `${USER_KEY_PREFIX}${authContext.userId}`;
  }
  return KV_KEY;
}

async function readSettings(env, authContext) {
  const scopedKey = getScopedSettingsKey(authContext);
  const scoped = await env.SETTINGS.get(scopedKey, { type: 'json' });
  if (scoped || !authContext?.userId) {
    return scoped || {};
  }

  // Migration fallback: settings were previously in shared key.
  const legacy = await env.SETTINGS.get(KV_KEY, { type: 'json' });
  return legacy || {};
}

/**
 * Normalize and sanitize incoming settings payload.
 * Accept only known fields — protect from writing junk to KV.
 */
function normalizeSettings(data) {
  const allowed = [
    'provider', 'yandexApiKey', 'yandexFolderId', 'yandexModel',
    'perplexityApiKey', 'perplexityModel',
    'githubToken', 'apiBaseUrl', 'syncEnabled',
    'workspace',
  ];
  const result = {};
  for (const key of allowed) {
    if (key in data) {
      result[key] = data[key];
    }
  }
  return result;
}

export async function handleSettings(request, env, path) {
  if (!env.SETTINGS) {
    return jsonResponse({ error: 'SETTINGS KV namespace not bound' }, { status: 503 });
  }

  const authContext = await resolveAuthorizationContext(request, env);
  if (!authContext.authorized) {
    return jsonResponse(
      { error: 'Unauthorized', reason: authContext.reason || 'Authorization failed' },
      { status: 401 }
    );
  }
  const scopedKey = getScopedSettingsKey(authContext);

  const method = request.method;

  // GET /api/settings — all settings
  if (method === 'GET' && (path === '/api/settings' || path === '/api/settings/')) {
    const raw = await readSettings(env, authContext);
    return jsonResponse({ data: raw || {} });
  }

  // POST /api/settings — save all settings (full replace)
  if (method === 'POST' && (path === '/api/settings' || path === '/api/settings/')) {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, { status: 400 });
    }

    const normalized = normalizeSettings(body);
    await env.SETTINGS.put(scopedKey, JSON.stringify(normalized));
    return jsonResponse({ success: true, saved: Object.keys(normalized) });
  }

  // GET /api/settings/:key — single field
  const keyMatch = path.match(/^\/api\/settings\/([a-zA-Z0-9_-]+)$/);
  if (method === 'GET' && keyMatch) {
    const fieldKey = keyMatch[1];
    const raw = await readSettings(env, authContext);
    const value = raw ? raw[fieldKey] : undefined;
    if (value === undefined) {
      return jsonResponse({ error: 'Key not found' }, { status: 404 });
    }
    return jsonResponse({ key: fieldKey, value });
  }

  // PUT /api/settings/:key — update single field
  if (method === 'PUT' && keyMatch) {
    const fieldKey = keyMatch[1];
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, { status: 400 });
    }

    const current = (await readSettings(env, authContext)) || {};
    const updated = normalizeSettings({ ...current, [fieldKey]: body.value });
    await env.SETTINGS.put(scopedKey, JSON.stringify(updated));
    return jsonResponse({ success: true, key: fieldKey });
  }

  return jsonResponse({ error: 'Method Not Allowed' }, { status: 405 });
}
