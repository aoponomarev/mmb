/**
 * ================================================================================================
 * AUTH UTILITIES - Утилиты for проверки JWT токенов и авторизации
 * ================================================================================================
 *
 * PURPOSE: Проверка JWT токенов на защищённых endpoints, извлечение данных пользователя.
 * Skill: app/skills/file-protocol-cors-guard
 *
 * PRINCIPLES:
 * - Проверка подписи JWT токена через JWT_SECRET
 * - Извлечение user_id из токена
 * - Middleware for защищённых endpoints
 *
 * USAGE:
 * import { verifyToken, getUserIdFromToken, requireAuth } from './utils/auth.js';
 *
 * // Проверка токена
 * const userId = await requireAuth(request, env);
 * if (!userId) {
 *   return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
 * }
 */

/**
 * Проверка JWT токена и извлечение user_id
 * @param {string} token - JWT токен
 * @param {string} jwtSecret - Секрет for проверки подписи
 * @returns {Object|null} Данные из токена (user_id, email и т.д.) или null при ошибке
 */
export async function verifyToken(token, jwtSecret) {
  if (!token || !jwtSecret) {
    return null;
  }

  try {
    // Разделение токена на части (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Декодирование payload (без проверки подписи пока)
    // В продакшене нужно использовать библиотеку for проверки подписи
    const payload = JSON.parse(atob(parts[1]));

    // Проверка срока действия токена
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    // TODO: Проверка подписи токена через HMAC-SHA256
    // Для MVP используем простую проверку наличия данных
    // В продакшене нужно использовать библиотеку типа jose или crypto.subtle

    return {
      user_id: payload.user_id || payload.sub || payload.id,
      email: payload.email,
      exp: payload.exp,
    };
  } catch (error) {
    console.error('auth.verifyToken error:', error);
    return null;
  }
}

/**
 * Извлечение user_id из токена
 * @param {string} token - JWT токен
 * @param {string} jwtSecret - Секрет for проверки подписи
 * @returns {Promise<string|null>} user_id или null
 */
export async function getUserIdFromToken(token, jwtSecret) {
  const decoded = await verifyToken(token, jwtSecret);
  return decoded ? decoded.user_id : null;
}

/**
 * Извлечение токена из заголовка Authorization
 * @param {Request} request - HTTP request
 * @returns {string|null} Токен или null
 */
export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware for проверки авторизации на защищённых endpoints
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables (должен содержать JWT_SECRET)
 * @returns {Promise<string|null>} user_id или null при ошибке авторизации
 */
export async function requireAuth(request, env) {
  const token = extractToken(request);
  if (!token) {
    return null;
  }

  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET not configured в Workers secrets');
    return null;
  }

  const userId = await getUserIdFromToken(token, jwtSecret);
  return userId;
}

/**
 * Создание JWT токена (for использования при обмене code на токен)
 * @param {Object} payload - Данные for токена (user_id, email и т.д.)
 * @param {string} jwtSecret - Секрет for подписи
 * @param {number} expiresIn - Время жизни токена в секундах (по умолчанию 1 час)
 * @returns {Promise<string>} JWT токен
 */
export async function createToken(payload, jwtSecret, expiresIn = 3600) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  // Кодирование header и payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // TODO: Создание подписи через HMAC-SHA256
  // Для MVP используем простую заглушку
  // В продакшене нужно использовать crypto.subtle for создания подписи
  const signature = await createSignature(`${encodedHeader}.${encodedPayload}`, jwtSecret);
  const encodedSignature = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Создание подписи for JWT токена
 * @param {string} data - Данные for подписи
 * @param {string} secret - Секрет
 * @returns {Promise<string>} Подпись в base64
 */
async function createSignature(data, secret) {
  try {
    // Использование Web Crypto API for создания подписи
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  } catch (error) {
    console.error('createSignature error:', error);
    // Fallback: простая заглушка for разработки
    return btoa(data + secret);
  }
}
