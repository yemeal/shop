const express = require('express');
const { asyncHandler, ForbiddenError, UnauthorizedError } = require('../errors');
const { validateRequest } = require('../middlewares');
const { requireAuth } = require('../middlewares/authMiddleware');
const { paginationQuerySchema } = require('../schemas/commonSchemas');
const { createAddressBodySchema } = require('../schemas/addressSchemas');
const { addFavouriteBodySchema } = require('../schemas/favouriteSchemas');

function resolveUserId(request) {
  if (!request.user || !request.user.id) {
    throw new UnauthorizedError('Требуется авторизация');
  }
  const paramId = request.params.userId;
  if (!paramId || paramId === 'me') {
    return request.user.id;
  }
  if (request.user.role !== 'admin' && request.user.id !== paramId) {
    throw new ForbiddenError('Доступ запрещен: нельзя управлять данными другого пользователя');
  }
  return paramId;
}

function createUserRouter({ orderService, favouriteService, addressService, authService }) {
  if (!orderService || !favouriteService || !addressService || !authService) {
    throw new Error(
      'createUserRouter требует orderService, favouriteService, addressService и authService',
    );
  }

  const router = express.Router();
  router.use(requireAuth(authService));

  // --- Заказы пользователя ---
  router.get(
    ['/orders', '/:userId/orders'],
    validateRequest({ query: paginationQuerySchema }),
    asyncHandler(async (request, response) => {
      const targetUserId = resolveUserId(request);
      const orders = await orderService.listUserOrders(targetUserId, request.query);
      response.json(orders);
    }),
  );

  // --- Избранное пользователя ---
  router.get(
    ['/favourites', '/favorites', '/:userId/favourites', '/:userId/favorites'],
    asyncHandler(async (request, response) => {
      const targetUserId = resolveUserId(request);
      const items = await favouriteService.listFavourites(targetUserId);
      response.json({ items });
    }),
  );

  router.post(
    ['/favourites', '/favorites', '/:userId/favourites', '/:userId/favorites'],
    validateRequest({ body: addFavouriteBodySchema }),
    asyncHandler(async (request, response) => {
      const targetUserId = resolveUserId(request);
      const result = await favouriteService.addFavourite(targetUserId, request.body.productId);
      response.status(result.created ? 201 : 200).json(result.product);
    }),
  );

  router.delete(
    [
      '/favourites/:productId',
      '/favorites/:productId',
      '/:userId/favourites/:productId',
      '/:userId/favorites/:productId',
    ],
    asyncHandler(async (request, response) => {
      const targetUserId = resolveUserId(request);
      await favouriteService.removeFavourite(targetUserId, request.params.productId);
      response.status(204).send();
    }),
  );

  // --- Адреса доставки пользователя ---
  router.get(
    ['/addresses', '/:userId/addresses'],
    asyncHandler(async (request, response) => {
      const targetUserId = resolveUserId(request);
      const items = await addressService.listAddresses(targetUserId);
      response.json({ items });
    }),
  );

  router.post(
    ['/addresses', '/:userId/addresses'],
    validateRequest({ body: createAddressBodySchema }),
    asyncHandler(async (request, response) => {
      const targetUserId = resolveUserId(request);
      const address = await addressService.createAddress(targetUserId, request.body);
      response.status(201).json(address);
    }),
  );

  router.delete(
    ['/addresses/:addressId', '/:userId/addresses/:addressId'],
    asyncHandler(async (request, response) => {
      const targetUserId = resolveUserId(request);
      await addressService.deleteAddress(targetUserId, request.params.addressId);
      response.status(204).send();
    }),
  );

  return router;
}

module.exports = {
  createUserRouter,
  resolveUserId,
};
