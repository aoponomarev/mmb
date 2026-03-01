/**
 * ================================================================================================
 * SETTINGS - Хранение настроек приложения в Cloudflare KV
 * ================================================================================================
 * Skill: core/skills/config-contracts
 *
 * PURPOSE: Замена continue-wrapper снимков (JSON файлы на диске) на облачное хранилище.
 * Настройки хранятся в KV namespace SETTINGS, доступны с любого устройства.
 *
 * МАРШРУТЫ:
 * - GET  /api/settings        — получить all settings (for импорта в UI)
 * - POST /api/settings        — сохранить all settings (экспорт из UI)
 * - GET  /api/settings/:key   — получить одно поле
 * - PUT  /api/settings/:key   — установить одно поле
 *
 * БЕЗОПАСНОСТЬ:
 * - Все запросы требуют заголовок Authorization: Bearer <githubToken>
 * - githubToken хранится как Cloudflare Secret (SETTINGS_TOKEN)
 * - При отсутствии SETTINGS_TOKEN эндпоинт недоступен (fail-safe)
 *
 * ПОЛЯ:
 * - provider, yandexApiKey, yandexFolderId, yandexModel
 * - perplexityApiKey, perplexityModel
 * - githubToken, apiBaseUrl, syncEnabled
 *
 * @param {Request} request
 * @param {Object} env - env.SETTINGS (KV), env.SETTINGS_TOKEN (Secret)
 */

import { jsonResponse } from './utils/cors.js';
import { requireAuth } from './utils/auth.js';

const KV_KEY = 'app-app-settings';
const USER_KEY_PREFIX = `${KV_KEY}:user:`;

/**
 * Разрешаем 2 типа авторизации:
 * 1) Service token: SETTINGS_TOKEN (legacy/migration, ручной доступ)
 * 2) OAuth JWT: токен текущего пользователя после Google login
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
    return { authorized: false, mode: null, userId: null, reason: 'SETTINGS_TOKEN и JWT_SECRET not configuredы' };
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

  // Миграционный fallback: ранее настройки были в общем ключе.
  const legacy = await env.SETTINGS.get(KV_KEY, { type: 'json' });
  return legacy || {};
}

/**
 * Нормализовать и очистить входящий payload настроек.
 * Принимаем только известные поля — защита от записи мусора в KV.
 */
function normalizeSettings(data) {
  const allowed = [
    'provider', 'yandexApiKey', 'yandexFolderId', 'yandexModel',
    'perplexityApiKey', 'perplexityModel',
    'githubToken', 'apiBaseUrl', 'syncEnabled',
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

  // POST /api/settings — сохранить all settings (полная замена)
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

  // GET /api/settings/:key — одно поле
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

  // PUT /api/settings/:key — обновить одно поле
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
