const express = require('express');
const { asyncHandler, UnauthorizedError, ForbiddenError } = require('../errors');
const { validateRequest } = require('../middlewares');
const { requireAuth } = require('../middlewares/authMiddleware');
const {
  addCartItemBodySchema,
  updateCartItemBodySchema,
  checkoutCartBodySchema,
  cartProductParamSchema,
} = require('../schemas/cartSchemas');

function getUserId(req) {
  // защита от idor: работа с корзиной доступна только аутентифицированному пользователю
  if (!req.user || !req.user.id) {
    throw new UnauthorizedError('Требуется авторизация для доступа к корзине');
  }

  const specifiedUserId = req.query?.userId || req.body?.userId;
  if (specifiedUserId && specifiedUserId !== req.user.id && req.user.role !== 'admin') {
    throw new ForbiddenError('Доступ запрещен: нельзя обращаться к корзине другого пользователя');
  }

  return req.user.id;
}

function createCartRouter(cartService, authService = null) {
  const router = express.Router();

  const authMiddleware = authService ? requireAuth(authService) : (_req, _res, next) => next();
  router.use(authMiddleware);

  router.get(
    '/',
    asyncHandler(async (request, response) => {
      const userId = getUserId(request);
      const cart = await cartService.getCart(userId);
      response.json(cart);
    }),
  );

  router.post(
    '/items',
    validateRequest({ body: addCartItemBodySchema }),
    asyncHandler(async (request, response) => {
      const userId = getUserId(request);
      const cart = await cartService.addItem(
        userId,
        request.body.productId,
        request.body.quantity,
      );
      response.status(201).json(cart);
    }),
  );

  router.patch(
    '/items/:productId',
    validateRequest({
      params: cartProductParamSchema,
      body: updateCartItemBodySchema,
    }),
    asyncHandler(async (request, response) => {
      const userId = getUserId(request);
      const cart = await cartService.updateQuantity(
        userId,
        request.params.productId,
        request.body.quantity,
      );
      response.json(cart);
    }),
  );

  router.delete(
    '/items/:productId',
    validateRequest({ params: cartProductParamSchema }),
    asyncHandler(async (request, response) => {
      const userId = getUserId(request);
      const cart = await cartService.removeItem(userId, request.params.productId);
      response.json(cart);
    }),
  );

  router.delete(
    '/',
    asyncHandler(async (request, response) => {
      const userId = getUserId(request);
      const cart = await cartService.clearCart(userId);
      response.json(cart);
    }),
  );

  router.post(
    '/checkout',
    validateRequest({ body: checkoutCartBodySchema }),
    asyncHandler(async (request, response) => {
      const userId = getUserId(request);
      const order = await cartService.checkout(userId, request.body.deliveryAddressId);
      response.status(201).json(order);
    }),
  );

  return router;
}

module.exports = { createCartRouter };
