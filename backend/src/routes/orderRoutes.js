const express = require('express');
const { asyncHandler, ForbiddenError, UnauthorizedError } = require('../errors');
const { validateRequest } = require('../middlewares');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const {
  createOrderBodySchema,
  orderIdParamSchema,
  updateOrderStatusBodySchema,
  adminOrderListQuerySchema,
} = require('../schemas/orderSchemas');

function createOrderRouter(orderService, authService) {
  if (!orderService || !authService) {
    throw new Error('createOrderRouter требует orderService и authService');
  }

  const router = express.Router();
  const auth = requireAuth(authService);
  const adminAuth = [auth, requireRole('admin')];

  // получение списка всех заказов магазина (только для роли admin)
  router.get(
    '/',
    ...adminAuth,
    validateRequest({ query: adminOrderListQuerySchema }),
    asyncHandler(async (request, response) => {
      const result = await orderService.listAllOrders(request.query);
      response.json(result);
    }),
  );

  router.post(
    '/',
    auth,
    validateRequest({ body: createOrderBodySchema }),
    asyncHandler(async (request, response) => {
      if (!request.user || !request.user.id) {
        throw new UnauthorizedError('Требуется авторизация');
      }

      // Идентификатор пользователя берется строго из сессии (или переопределяется только администратором)
      const userId =
        request.user.role === 'admin' && request.body.userId
          ? request.body.userId
          : request.user.id;

      const order = await orderService.createOrder({
        ...request.body,
        userId,
      });
      response.status(201).json(order);
    }),
  );

  router.get(
    '/:orderId',
    auth,
    validateRequest({ params: orderIdParamSchema }),
    asyncHandler(async (request, response) => {
      const order = await orderService.getOrder(request.params.orderId);

      // защита от idor: только владелец заказа или администратор
      if (request.user && request.user.role !== 'admin' && order.userId !== request.user.id) {
        throw new ForbiddenError('Доступ запрещен: нельзя просматривать чужой заказ');
      }

      response.json(order);
    }),
  );

  router.patch(
    '/:orderId/status',
    ...adminAuth,
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

  return router;
}

module.exports = { createOrderRouter };
