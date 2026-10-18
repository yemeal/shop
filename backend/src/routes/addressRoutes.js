const express = require('express');
const { asyncHandler, ForbiddenError } = require('../errors');
const { validateRequest } = require('../middlewares');
const { requireAuth } = require('../middlewares/authMiddleware');
const {
  userIdParamSchema,
  userAddressParamsSchema,
  createAddressBodySchema,
} = require('../schemas/addressSchemas');

function createAddressRouter(addressService, authService = null) {
  if (!addressService) {
    throw new Error('createAddressRouter требует addressService');
  }

  const router = express.Router();

  const authMiddleware = authService ? requireAuth(authService) : (_req, _res, next) => next();

  function checkOwnership(req) {
    if (req.user && req.user.role !== 'admin' && req.user.id !== req.params.userId) {
      throw new ForbiddenError('Доступ запрещен: нельзя управлять адресами другого пользователя');
    }
  }

  router.use(authMiddleware);

  // получение списка всех адресов пользователя
  router.get(
    '/:userId/addresses',
    validateRequest({ params: userIdParamSchema }),
    asyncHandler(async (request, response) => {
      checkOwnership(request);
      const items = await addressService.listAddresses(request.params.userId);
      response.json({ items });
    }),
  );

  // добавление нового адреса пользователя
  router.post(
    '/:userId/addresses',
    validateRequest({
      params: userIdParamSchema,
      body: createAddressBodySchema,
    }),
    asyncHandler(async (request, response) => {
      checkOwnership(request);
      const address = await addressService.createAddress(
        request.params.userId,
        request.body,
      );
      response.status(201).json(address);
    }),
  );

  // удаление адреса
  router.delete(
    '/:userId/addresses/:addressId',
    validateRequest({ params: userAddressParamsSchema }),
    asyncHandler(async (request, response) => {
      checkOwnership(request);
      await addressService.deleteAddress(
        request.params.userId,
        request.params.addressId,
      );
      response.status(204).send();
    }),
  );

  return router;
}

module.exports = { createAddressRouter };
