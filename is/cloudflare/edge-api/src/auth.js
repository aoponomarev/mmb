/**
 * #JS-oi2C6djt
 * @description OAuth endpoints: code-to-token, user in D1, JWT; /auth/callback, /auth/me, /auth/logout.
 * @skill id:sk-7cf3f7
 *
 * ENDPOINTS: POST /auth/callback (code→JWT, D1), GET /auth/me, POST /auth/logout. Usage: handleAuth(request, env, path).
 */

import { jsonResponse, handleOptions, getCorsHeaders } from './utils/cors.js';
import { requireAuth, createToken } from './utils/auth.js';
import { createUser, getUserByGoogleId, getUser } from './utils/d1-helpers.js';

/**
 * Handle OAuth callback from Google
 * Supports GET (redirect from Google) and POST (call from client)
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables (DB, GOOGLE_CLIENT_SECRET, JWT_SECRET)
 * @returns {Promise<Response>} JSON response with token or HTML with redirect
 */
async function handleCallback(request, env) {
  try {
    // Validate presence secrets
    if (!env.GOOGLE_CLIENT_SECRET) {
      console.error('auth.handleCallback: GOOGLE_CLIENT_SECRET not set');
      throw new Error('Google Client Secret not configured. Use: wrangler secret put GOOGLE_CLIENT_SECRET');
    }

    if (!env.JWT_SECRET) {
      console.error('auth.handleCallback: JWT_SECRET not set');
      throw new Error('JWT Secret not configured. Use: wrangler secret put JWT_SECRET');
    }

    let code, redirect_uri;
    let clientUrl = 'http://localhost:8787'; // Default for local development

    // Support GET (redirect from Google) and POST (call from client)
    if (request.method === 'GET') {
      const url = new URL(request.url);
      code = url.searchParams.get('code');
      const stateParam = url.searchParams.get('state');

      // Extract client_url from state, if provided
      if (stateParam) {
        try {
          const stateObj = JSON.parse(stateParam);
          if (stateObj && stateObj.client_url) {
            // Use provided URL directly (can be file:// or http://)
            clientUrl = stateObj.client_url;
            console.log('auth.handleCallback: extracted client_url from state:', clientUrl);
          }
        } catch (e) {
          // state not JSON, use default URL
          console.log('auth.handleCallback: state parse error, using default URL');
        }
      }

      // redirect_uri must match exactly what was used to initiate OAuth.
      // Origin comes from current request — works for both legacy-api and app-api workers.
      redirect_uri = `${new URL(request.url).origin}/auth/callback`;

      // For GET return HTML page, that will handle token
      if (!code) {
        return new Response(
          '<!DOCTYPE html><html><head><title>OAuth Error</title></head><body><h1>Authorization code not found</h1></body></html>',
          { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
      }
    } else if (request.method === 'POST') {
      const body = await request.json();
      code = body.code;
      redirect_uri = body.redirect_uri;
      if (body.client_url) {
        clientUrl = body.client_url;
      }
    } else {
      return jsonResponse(
        { error: 'Method Not Allowed' },
        { status: 405 }
      );
    }

    if (!code) {
      if (request.method === 'GET') {
        return new Response(
          '<!DOCTYPE html><html><head><title>OAuth Error</title></head><body><h1>Authorization code not found</h1></body></html>',
          { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
      }
      return jsonResponse(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Exchange code for access token from Google
    const googleTokenResponse = await exchangeCodeWithGoogle(code, redirect_uri, env.GOOGLE_CLIENT_SECRET);

    if (!googleTokenResponse.access_token) {
      return jsonResponse(
        { error: 'Failed to exchange code for token' },
        { status: 401 }
      );
    }

    // Get user data from Google
    console.log('auth.handleCallback: получение данных пользователя от Google');
    const userInfo = await getUserInfoFromGoogle(googleTokenResponse.access_token);
    console.log('auth.handleCallback: получен userInfo', {
      hasUserInfo: !!userInfo,
      hasId: !!userInfo?.id,
      hasSub: !!userInfo?.sub,
      keys: userInfo ? Object.keys(userInfo) : []
    });

    // Google API uses 'sub' instead of 'id' for user identifier
    const googleUserId = userInfo?.sub || userInfo?.id;

    if (!userInfo || !googleUserId) {
      console.error('auth.handleCallback: userInfo невалиден', { userInfo });
      return jsonResponse(
        { error: 'Failed to get user info from Google' },
        { status: 401 }
      );
    }

    // Save or update user in D1
    console.log('auth.handleCallback: поиск пользователя в D1', { googleUserId });
    let user = await getUserByGoogleId(env.DB, googleUserId);

    if (!user) {
      console.log('auth.handleCallback: создание нового пользователя в D1', {
        google_id: googleUserId,
        email: userInfo.email
      });
      user = await createUser(env.DB, {
        google_id: googleUserId,
        email: userInfo.email,
        name: userInfo.name || null,
        picture: userInfo.picture || null,
      });
      console.log('auth.handleCallback: пользователь создан', {
        userId: user?.id,
        success: !!user
      });
    } else {
      console.log('auth.handleCallback: пользователь найден в D1', { userId: user.id });
    }

    if (!user) {
      return jsonResponse(
        { error: 'Failed to create or get user' },
        { status: 500 }
      );
    }

    // Create JWT token
    console.log('auth.handleCallback: создание JWT токена', {
      userId: user.id,
      email: user.email,
      hasJWTSecret: !!env.JWT_SECRET
    });
    
    const EXPIRES_IN = 30 * 24 * 3600; // 30 days
    
    const jwtToken = await createToken(
      {
        user_id: user.id,
        email: user.email,
        google_id: user.google_id,
      },
      env.JWT_SECRET,
      EXPIRES_IN
    );
    console.log('auth.handleCallback: JWT токен создан', {
      hasToken: !!jwtToken,
      tokenLength: jwtToken?.length
    });

    // Return token and user data
    const tokenData = {
      access_token: jwtToken,
      token_type: 'Bearer',
      expires_in: EXPIRES_IN,
      expires_at: Date.now() + (EXPIRES_IN * 1000),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };

    // For GET request (redirect from Google) return HTML page with JavaScript
    // that will save token and redirect to client app
    if (request.method === 'GET') {
      // clientUrl already extracted from state param above

      // HTML page that will save token in localStorage and redirect to client
      const html = `<!DOCTYPE html>
<html>
<head>
    <title>Авторизация успешна</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1>Авторизация успешна! Перенаправление...</h1>
    <script>
        try {
            // Save token in localStorage via postMessage (if popup) or directly
            const tokenData = ${JSON.stringify(tokenData)};

            // Save token in localStorage (works regardless of origin)
            try {
                localStorage.setItem('auth-token', JSON.stringify(tokenData));
                localStorage.setItem('auth-user', JSON.stringify(tokenData.user));
                console.log('Token saved to localStorage');
            } catch (e) {
                console.error('Error saving token to localStorage:', e);
            }

            const targetUrl = '${clientUrl}';
            const isFileProtocol = targetUrl.startsWith('file://');
            const hasOpener = window.opener && !window.opener.closed;

            console.log('OAuth callback:', {
                targetUrl: targetUrl,
                isFileProtocol: isFileProtocol,
                hasOpener: hasOpener
            });

            // Try to send postMessage back to opener window (if OAuth opened via window.open)
            if (hasOpener) {
                try {
                    // Send message back to opener window
                    window.opener.postMessage({
                        type: 'oauth-callback',
                        success: true,
                        token: tokenData
                    }, '*'); // Используем '*' for поддержки file://

                    console.log('postMessage отправлен в исходное окно');

                    // For http:// close window automatically
                    if (!isFileProtocol) {
                        setTimeout(() => {
                            window.close();
                        }, 500);
                    }

                    // For file:// show message that window can be closed
                    if (isFileProtocol) {
                        document.body.innerHTML = \`
                            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 50px auto; padding: 30px; text-align: center; background: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                <div style="font-size: 48px; color: #4CAF50; margin-bottom: 20px;">✓</div>
                                <h1 style="color: #4CAF50; margin: 0 0 10px 0;">Авторизация успешна!</h1>
                                <p style="font-size: 16px; color: #666; margin: 10px 0;">Токен сохранен и отправлен в приложение.</p>

                                <div style="background: #4CAF50; color: white; padding: 20px; border-radius: 4px; margin: 30px 0;">
                                    <p style="font-size: 16px; margin: 0;">
                                        <strong>✓ Токен отправлен в приложение</strong>
                                    </p>
                                    <p style="font-size: 14px; margin: 10px 0 0 0; opacity: 0.9;">
                                        Можете закрыть эту вкладку. Приложение обновится автоматически.
                                    </p>
                                </div>

                                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                                    <p style="font-size: 12px; color: #999; margin: 5px 0;">
                                        Если приложение не обновилось автоматически, обновите страницу manually (F5)
                                    </p>
                                </div>
                            </div>
                        \`;
                    }
                } catch (e) {
                    console.error('Ошибка отправки postMessage:', e);
                    // Fallback to standard instruction
                    hasOpener = false;
                }
            }

            // If no opener (normal redirect), use legacy logic
            if (!hasOpener) {
                // For file:// protocol browser blocks redirect from https:// to file://
                // So show instruction for manual return
                if (isFileProtocol) {
                    document.body.innerHTML = \`
                        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 50px auto; padding: 30px; text-align: center; background: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <div style="font-size: 48px; color: #4CAF50; margin-bottom: 20px;">✓</div>
                            <h1 style="color: #4CAF50; margin: 0 0 10px 0;">Авторизация успешна!</h1>
                            <p style="font-size: 16px; color: #666; margin: 10px 0;">Токен сохранен в localStorage.</p>

                            <div style="background: #e3f2fd; border: 1px solid #2196F3; border-radius: 4px; padding: 20px; margin: 30px 0; text-align: left;">
                                <div style="font-size: 18px; color: #1976D2; margin-bottom: 15px; text-align: center;">
                                    <strong>📋 Что делать дальше:</strong>
                                </div>
                                <ol style="font-size: 15px; color: #1976D2; margin: 10px 0 0 20px; line-height: 1.8;">
                                    <li style="margin: 8px 0;"><strong>Закройте</strong> это окно или вкладку</li>
                                    <li style="margin: 8px 0;"><strong>Вернитесь</strong> к вкладке с приложением</li>
                                    <li style="margin: 8px 0;"><strong>Обновите</strong> страницу (нажмите F5)</li>
                                    <li style="margin: 8px 0;">Вы будете <strong>авторизованы автоматически</strong> ✓</li>
                                </ol>
                            </div>

                            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin: 20px 0;">
                                <p style="font-size: 13px; color: #856404; margin: 0;">
                                    <strong>⚠️ Note:</strong> Браузер не позволяет автоматически вернуться к локальному файлу с веб-страницы по соображениям безопасности.
                                </p>
                            </div>

                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                                <p style="font-size: 13px; color: #666; margin: 5px 0;">
                                    <strong>💡 Совет for разработки:</strong>
                                </p>
                                <p style="font-size: 12px; color: #999; margin: 5px 0;">
                                    Используйте локальный сервер for полноценной работы OAuth:
                                </p>
                                <code style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; display: inline-block; margin: 10px 0; font-size: 12px; color: #333;">
                                    python -m http.server 8787
                                </code>
                                <p style="font-size: 11px; color: #aaa; margin: 5px 0;">
                                    или установите расширение "Live Server" в VS Code
                                </p>
                            </div>
                        </div>
                    \`;
                } else {
                    // For http:// protocol perform normal redirect
                    console.log('Redirecting to:', targetUrl);
                    window.location.href = targetUrl;
                }
            }
        } catch (error) {
            console.error('Error saving token:', error);
            document.body.innerHTML = '<h1>Ошибка при сохранении токена. Закройте это окно и попробуйте снова.</h1>';
        }
    </script>
</body>
</html>`;

      // Create headers with CORS
      const headers = new Headers();
      headers.set('Content-Type', 'text/html; charset=UTF-8');
      const corsHeaders = getCorsHeaders();
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(html, {
        status: 200,
        headers: headers,
      });
    }

    // For POST request return JSON
    return jsonResponse(tokenData);
  } catch (error) {
    console.error('auth.handleCallback error:', error);
    console.error('auth.handleCallback error stack:', error.stack);
    console.error('auth.handleCallback env check:', {
      hasGOOGLE_CLIENT_SECRET: !!env.GOOGLE_CLIENT_SECRET,
      hasJWT_SECRET: !!env.JWT_SECRET,
      hasDB: !!env.DB
    });

    // For GET return HTML with error
    if (request.method === 'GET') {
      const errorMessage = error.message || 'Unknown error';
      const html = `<!DOCTYPE html>
<html>
<head>
    <title>Ошибка авторизации</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1>Ошибка авторизации</h1>
    <p>${errorMessage}</p>
    <p>Закройте это окно и попробуйте снова.</p>
    <p><small>Если ошибка повторяется, проверьте логи Worker через: wrangler tail</small></p>
</body>
</html>`;
      return new Response(html, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }

    return jsonResponse(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Exchange authorization code for access token from Google
 * @param {string} code - Authorization code
 * @param {string} redirectUri - Redirect URI
 * @param {string} clientSecret - Google OAuth Client Secret
 * @returns {Promise<Object>} Token from Google
 */
async function exchangeCodeWithGoogle(code, redirectUri, clientSecret) {
  const GOOGLE_CLIENT_ID = '926359695878-hr94rhkq1s30c3nqgkcbfcpr0537kt7i.apps.googleusercontent.com';
  const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

  console.log('exchangeCodeWithGoogle: отправка запроса', {
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    has_client_secret: !!clientSecret
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('exchangeCodeWithGoogle: ошибка от Google', {
      status: response.status,
      error: errorData
    });
    throw new Error(errorData.error_description || errorData.error || 'Failed to exchange code');
  }

  const tokenData = await response.json();
  console.log('exchangeCodeWithGoogle: успешно получен токен', {
    has_access_token: !!tokenData.access_token
  });
  return tokenData;
}

/**
 * Get user data from Google
 * @param {string} accessToken - Access token from Google
 * @returns {Promise<Object>} User data
 */
async function getUserInfoFromGoogle(accessToken) {
  const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

  console.log('getUserInfoFromGoogle: запрос данных пользователя', {
    url: GOOGLE_USERINFO_URL,
    hasAccessToken: !!accessToken
  });

  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('getUserInfoFromGoogle: ошибка от Google', {
      status: response.status,
      error: errorData
    });
    throw new Error(`Failed to get user info from Google: ${errorData.error || response.statusText}`);
  }

  const userInfo = await response.json();
  console.log('getUserInfoFromGoogle: успешно получены данные', {
    hasSub: !!userInfo.sub,
    hasId: !!userInfo.id,
    email: userInfo.email
  });
  return userInfo;
}

/**
 * Get current user by JWT token
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables (DB, JWT_SECRET)
 * @returns {Promise<Response>} JSON response with user data
 */
async function handleMe(request, env) {
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

  const user = await getUser(env.DB, userId);
  if (!user) {
    return jsonResponse(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return jsonResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    created_at: user.created_at,
  });
}

/**
 * Main auth endpoints handler
 * @param {Request} request - HTTP request
 * @param {Object} env - Environment variables
 * @param {string} path - Request path
 * @returns {Promise<Response>} HTTP response
 */
export async function handleAuth(request, env, path) {
  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  // Route by path
  if (path === '/auth/callback') {
    return await handleCallback(request, env);
  } else if (path === '/auth/me') {
    return await handleMe(request, env);
  } else {
    return jsonResponse(
      { error: 'Not Found', message: `Auth endpoint ${path} not found` },
      { status: 404 }
    );
  }
}
