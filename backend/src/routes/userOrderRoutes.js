const express = require('express');
const { asyncHandler, ForbiddenError } = require('../errors');
const { validateRequest } = require('../middlewares');
const { requireAuth } = require('../middlewares/authMiddleware');
const { userIdParamSchema } = require('../schemas/orderSchemas');
const { paginationQuerySchema } = require('../schemas/commonSchemas');

function createUserOrderRouter(orderService, authService = null) {
  const router = express.Router();

  const authMiddleware = authService ? requireAuth(authService) : (_req, _res, next) => next();

  router.get(
    '/:userId/orders',
    authMiddleware,
    validateRequest({
      params: userIdParamSchema,
      query: paginationQuerySchema,
    }),
    asyncHandler(async (request, response) => {
      // защита от idor: только владелец истории заказов или администратор
      if (
        request.user &&
        request.user.role !== 'admin' &&
        request.user.id !== request.params.userId
      ) {
        throw new ForbiddenError('Доступ запрещен: нельзя просматривать заказы другого пользователя');
      }

      const orders = await orderService.listUserOrders(request.params.userId, request.query);
      response.json(orders);
    }),
  );

  return router;
}

module.exports = { createUserOrderRouter };
