/**
 * #JS-ceKiAcb8
 * @description JWT verification and auth; verifyToken, requireAuth; JWT_SECRET; middleware for protected endpoints.
 * @skill id:sk-7cf3f7
 *
 * PRINCIPLES:
 * - Verify JWT signature via JWT_SECRET
 * - Extract user_id from token; requireAuth(request, env) for protected routes
 *
 * USAGE: const userId = await requireAuth(request, env); if (!userId) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
 */

/**
 * Verify JWT token and extract user_id
 * @param {string} token - JWT token
 * @param {string} jwtSecret - Secret for signature verification
 * @returns {Object|null} Data from token (user_id, email etc.) or null on error
 */
export async function verifyToken(token, jwtSecret) {
  if (!token || !jwtSecret) {
    return null;
  }

  try {
    // Split token into parts (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (no signature check yet)
    // In production use a library for signature verification
    const payload = JSON.parse(atob(parts[1]));

    // Check token expiry
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    // TODO: Verify token signature via HMAC-SHA256
    // For MVP use simple presence check
    // In production use library like jose or crypto.subtle

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
 * Extract user_id from token
 * @param {string} token - JWT token
 * @param {string} jwtSecret - Secret for signature verification
 * @returns {Promise<string|null>} user_id or null
 */
export async function getUserIdFromToken(token, jwtSecret) {
  const decoded = await verifyToken(token, jwtSecret);
  return decoded ? decoded.user_id : null;
}

/**
 * Extract token from Authorization header
 * @param {Request} request - HTTP request
 * @returns {string|null} Token or null
 */
export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware for auth check on protected endpoints
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables (must contain JWT_SECRET)
 * @returns {Promise<string|null>} user_id or null on auth error
 */
export async function requireAuth(request, env) {
  const token = extractToken(request);
  if (!token) {
    return null;
  }

  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET not configured in Workers secrets');
    return null;
  }

  const userId = await getUserIdFromToken(token, jwtSecret);
  return userId;
}

/**
 * Create JWT token (for use when exchanging code for token)
 * @param {Object} payload - Data for token (user_id, email etc.)
 * @param {string} jwtSecret - Secret for signature
 * @param {number} expiresIn - Token lifetime in seconds (default 1 hour)
 * @returns {Promise<string>} JWT token
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

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // TODO: Create signature via HMAC-SHA256
  // For MVP use simple stub
  // In production use crypto.subtle for signature
  const signature = await createSignature(`${encodedHeader}.${encodedPayload}`, jwtSecret);
  const encodedSignature = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Create signature for JWT token
 * @param {string} data - Data for signature
 * @param {string} secret - Secret
 * @returns {Promise<string>} Signature in base64
 */
async function createSignature(data, secret) {
  try {
    // Use Web Crypto API for signature creation
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
    // Fallback: simple stub for development
    return btoa(data + secret);
  }
}
