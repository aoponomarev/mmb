/**
 * #JS-Mw21ipJ7
 * @description CORS headers for Workers; preflight OPTIONS; addCorsHeaders, handleOptions.
 * @skill id:sk-7cf3f7
 */

/**
 * CORS headers for all responses
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow any origin for development
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // Cache preflight requests for 24 hours
};

/**
 * Get CORS headers
 * @param {Object} options - Options (origin for customization)
 * @returns {Object} Object with CORS headers
 */
export function getCorsHeaders(options = {}) {
  const headers = { ...corsHeaders };

  // If origin specified - use it (can restrict in production)
  if (options.origin) {
    headers['Access-Control-Allow-Origin'] = options.origin;
  }

  return headers;
}

/**
 * Add CORS headers to existing headers
 * @param {Headers} existingHeaders - Existing headers (optional)
 * @param {Object} options - Options for getCorsHeaders
 * @returns {Headers} New headers with CORS
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
 * Handle preflight OPTIONS requests
 * @param {Request} request - Incoming request
 * @returns {Response} Response with CORS headers
 */
export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

/**
 * Create JSON response with CORS headers
 * @param {any} data - Data for JSON response
 * @param {Object} options - Options (status, headers, corsOptions)
 * @returns {Response} JSON response with CORS headers
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
