const express = require('express');
const { asyncHandler, UnauthorizedError } = require('../errors');
const { validateRequest, requireAuth } = require('../middlewares');
const { setAuthCookies, clearAuthCookies, extractTokens } = require('../middlewares/authMiddleware');
const { registerBodySchema, loginBodySchema } = require('../schemas/authSchemas');

function createAuthRouter(authService) {
  const router = express.Router();

  router.post(
    '/register',
    validateRequest({ body: registerBodySchema }),
    asyncHandler(async (request, response) => {
      const deviceInfo = request.headers['user-agent'] || 'Browser/Client';
      const ipAddress = request.ip;

      const result = await authService.register({
        ...request.body,
        deviceInfo,
        ipAddress,
      });

      setAuthCookies(response, result);
      response.status(201).json({ user: result.user });
    }),
  );

  router.post(
    '/login',
    validateRequest({ body: loginBodySchema }),
    asyncHandler(async (request, response) => {
      const deviceInfo = request.headers['user-agent'] || 'Browser/Client';
      const ipAddress = request.ip;

      const result = await authService.login({
        ...request.body,
        deviceInfo,
        ipAddress,
      });

      setAuthCookies(response, result);
      response.json({ user: result.user });
    }),
  );

  router.post(
    '/refresh',
    asyncHandler(async (request, response) => {
      const { refreshToken } = extractTokens(request);
      if (!refreshToken) {
        throw new UnauthorizedError('Отсутствует refresh-токен в cookies', {
          code: 'REFRESH_TOKEN_REQUIRED',
        });
      }

      const result = await authService.refresh({ rawRefreshToken: refreshToken });
      setAuthCookies(response, result);
      response.json({ user: result.user });
    }),
  );

  router.post(
    '/logout',
    asyncHandler(async (request, response) => {
      const { refreshToken } = extractTokens(request);
      await authService.logout({ rawRefreshToken: refreshToken });
      clearAuthCookies(response);
      response.json({ message: 'Сессия успешно завершена' });
    }),
  );

  router.get(
    '/me',
    requireAuth(authService),
    asyncHandler(async (request, response) => {
      const user = await authService.getCurrentUser(request.token);
      response.json({ user });
    }),
  );

  router.get(
    '/sessions',
    requireAuth(authService),
    asyncHandler(async (request, response) => {
      const sessions = await authService.listUserSessions(request.user.id);
      response.json({ sessions });
    }),
  );

  router.delete(
    '/sessions/:sessionId',
    requireAuth(authService),
    asyncHandler(async (request, response) => {
      await authService.revokeUserSession(request.user.id, request.params.sessionId);
      response.json({ message: 'Сессия устройства отозвана' });
    }),
  );

  return router;
}

module.exports = { createAuthRouter };
