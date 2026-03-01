/**
 * ================================================================================================
 * CORS UTILITIES - Утилиты для обработки CORS заголовков
 * ================================================================================================
 *
 * ЦЕЛЬ: Централизованная обработка CORS заголовков для всех ответов Workers.
 * Skill: a/skills/app/skills/troubleshooting/file-protocol-cors-guard.md
 *
 * ПРИНЦИПЫ:
 * - Все ответы должны включать CORS заголовки
 * - Поддержка preflight OPTIONS запросов
 * - Настраиваемые allowed origins (для продакшена можно ограничить)
 *
 * ИСПОЛЬЗОВАНИЕ:
 * import { addCorsHeaders, handleOptions } from './utils/cors.js';
 *
 * // Добавление заголовков к ответу
 * const response = new Response(data, { headers: addCorsHeaders() });
 *
 * // Обработка preflight запроса
 * if (request.method === 'OPTIONS') {
 *   return handleOptions(request);
 * }
 */

/**
 * CORS заголовки для всех ответов
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Разрешить любой источник для разработки
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // Кэширование preflight запросов на 24 часа
};

/**
 * Получить CORS заголовки
 * @param {Object} options - Опции (origin для кастомизации)
 * @returns {Object} Объект с CORS заголовками
 */
export function getCorsHeaders(options = {}) {
  const headers = { ...corsHeaders };

  // Если указан origin - используем его (для продакшена можно ограничить)
  if (options.origin) {
    headers['Access-Control-Allow-Origin'] = options.origin;
  }

  return headers;
}

/**
 * Добавить CORS заголовки к существующим заголовкам
 * @param {Headers} existingHeaders - Существующие заголовки (опционально)
 * @param {Object} options - Опции для getCorsHeaders
 * @returns {Headers} Новые заголовки с CORS
 */
export function addCorsHeaders(existingHeaders = null, options = {}) {
  const headers = existingHeaders ? new Headers(existingHeaders) : new Headers();
  const cors = getCorsHeaders(options);

  Object.entries(cors).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return headers;
}

/**
 * Обработка preflight OPTIONS запросов
 * @param {Request} request - Входящий запрос
 * @returns {Response} Ответ с CORS заголовками
 */
export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

/**
 * Создать JSON ответ с CORS заголовками
 * @param {any} data - Данные для JSON ответа
 * @param {Object} options - Опции (status, headers, corsOptions)
 * @returns {Response} JSON ответ с CORS заголовками
 */
export function jsonResponse(data, options = {}) {
  const {
    status = 200,
    headers = new Headers(),
    corsOptions = {},
  } = options;

  headers.set('Content-Type', 'application/json');
  const corsHeaders = addCorsHeaders(headers, corsOptions);

  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}
