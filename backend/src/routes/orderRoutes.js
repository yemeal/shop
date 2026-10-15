const express = require('express');
const { asyncHandler, ForbiddenError } = require('../errors');
const { validateRequest } = require('../middlewares');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const {
  createOrderBodySchema,
  orderIdParamSchema,
  updateOrderStatusBodySchema,
} = require('../schemas/orderSchemas');

function createOrderRouter(orderService, authService = null) {
  const router = express.Router();

  const authMiddleware = authService ? requireAuth(authService) : (_req, _res, next) => next();

  router.post(
    '/',
    authMiddleware,
    validateRequest({ body: createOrderBodySchema }),
    asyncHandler(async (request, response) => {
      // Идентификатор пользователя берется строго из сессии (или переопределяется только администратором)
      const userId = (request.user && request.user.role === 'admin' && request.body.userId)
        ? request.body.userId
        : (request.user?.id || request.body.userId);

      const order = await orderService.createOrder({
        ...request.body,
        userId,
      });
      response.status(201).json(order);
    }),
  );

  router.get(
    '/:orderId',
    authMiddleware,
    validateRequest({ params: orderIdParamSchema }),
    asyncHandler(async (request, response) => {
      const order = await orderService.getOrder(request.params.orderId);

      // защита от idor: только владелец заказа или администратор
      if (
        request.user &&
        request.user.role !== 'admin' &&
        order.userId !== request.user.id
      ) {
        throw new ForbiddenError('Доступ запрещен: нельзя просматривать чужой заказ');
      }

      response.json(order);
    }),
  );

  if (authService) {
    router.patch(
      '/:orderId/status',
      requireAuth(authService),
      requireRole('admin'),
      validateRequest({
        params: orderIdParamSchema,
        body: updateOrderStatusBodySchema,
      }),
      asyncHandler(async (request, response) => {
        const order = await orderService.updateOrderStatus(
          request.params.orderId,
          request.body.status,
        );
        response.json(order);
      }),
    );
  }

  return router;
}

module.exports = { createOrderRouter };
