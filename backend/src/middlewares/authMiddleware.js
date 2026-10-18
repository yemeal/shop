const config = require('../config');
const { UnauthorizedError } = require('../errors');
const { TokenExpiredError } = require('../security');

function extractTokens(req) {
  let accessToken = null;
  let refreshToken = null;

  // куки
  if (req.cookies) {
    accessToken = req.cookies.access_token || req.cookies.session_token || req.cookies.token || null;
    refreshToken = req.cookies.refresh_token || null;
  }

  // заголовок authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7).trim();
  }

  // заголовок x-refresh-token или тело запроса
  if (!refreshToken) {
    refreshToken = req.headers['x-refresh-token'] || req.body?.refreshToken || null;
  }

  return { accessToken, refreshToken };
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  const isSecure =
    config.cookieSecure !== undefined ? config.cookieSecure : config.nodeEnv === 'production';

  if (accessToken) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      maxAge: config.jwt.accessTokenTtlSeconds * 1000,
    });
  }

  if (refreshToken) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      maxAge: config.jwt.refreshTokenTtlMs,
    });
  }
}

function clearAuthCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('session_token');
  res.clearCookie('token');
}

/**
 * проверка jwt и прозрачное обновление по refresh-токену
 *
 * @param {import('../services/authService')} authService
 */
function requireAuth(authService) {
  return async (req, res, next) => {
    try {
      const { accessToken, refreshToken } = extractTokens(req);

      if (!accessToken && !refreshToken) {
        return next(new UnauthorizedError('Требуется авторизация'));
      }

      // проверка access-токена
      if (accessToken) {
        try {
          const claims = authService.validateAccessToken(accessToken);
          req.user = {
            id: claims.userId,
            role: claims.role,
          };
          req.token = accessToken;
          return next();
        } catch (err) {
          // автообновление при истечении срока access-токена
          if (err instanceof TokenExpiredError) {
            if (refreshToken) {
              return await performAutoRefresh(authService, refreshToken, req, res, next);
            }
            return next(err);
          }

          // проверка устаревших токенов для обратной совместимости
          try {
            const user = await authService.getCurrentUser(accessToken);
            req.user = user;
            req.token = accessToken;
            return next();
          } catch {
            // попытка обновления при неудаче устаревшей проверки
            if (refreshToken) {
              return await performAutoRefresh(authService, refreshToken, req, res, next);
            }
            return next(err);
          }
        }
      }

      // прямое обновление если access-токен отсутствует
      if (refreshToken) {
        return await performAutoRefresh(authService, refreshToken, req, res, next);
      }

      return next(new UnauthorizedError('Требуется авторизация'));
    } catch (err) {
      next(err);
    }
  };
}

async function performAutoRefresh(authService, refreshToken, req, res, next) {
  try {
    const refreshed = await authService.refresh({ rawRefreshToken: refreshToken });
    setAuthCookies(res, refreshed);
    req.user = {
      id: refreshed.user.id,
      role: refreshed.user.role,
    };
    req.token = refreshed.accessToken;
    return next();
  } catch (refreshErr) {
    clearAuthCookies(res);
    return next(refreshErr);
  }
}

/**
 * опциональная аутентификация
 */
function optionalAuth(authService) {
  return async (req, res, next) => {
    try {
      const { accessToken, refreshToken } = extractTokens(req);
      if (!accessToken && !refreshToken) {
        return next();
      }

      if (accessToken) {
        try {
          const claims = authService.validateAccessToken(accessToken);
          req.user = { id: claims.userId, role: claims.role };
          req.token = accessToken;
          return next();
        } catch (err) {
          if (err instanceof TokenExpiredError && refreshToken) {
            return await performAutoRefresh(authService, refreshToken, req, res, next);
          }
          try {
            const user = await authService.getCurrentUser(accessToken);
            req.user = user;
            req.token = accessToken;
            return next();
          } catch {
            return next();
          }
        }
      }

      if (refreshToken) {
        return await performAutoRefresh(authService, refreshToken, req, res, next);
      }

      next();
    } catch {
      next();
    }
  };
}

module.exports = {
  extractTokens,
  setAuthCookies,
  clearAuthCookies,
  requireAuth,
  optionalAuth,
  extractToken: (req) => extractTokens(req).accessToken,
};
