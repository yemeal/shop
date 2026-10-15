const express = require('express');
const { asyncHandler, ForbiddenError } = require('../errors');
const { validateRequest } = require('../middlewares');
const { requireAuth } = require('../middlewares/authMiddleware');
const { userIdParamSchema } = require('../schemas/orderSchemas');
const {
  addFavouriteBodySchema,
  favouriteParamsSchema,
} = require('../schemas/favouriteSchemas');

function createFavouriteRouter(favouriteService, authService = null) {
  const router = express.Router();

  const authMiddleware = authService ? requireAuth(authService) : (_req, _res, next) => next();

  function checkOwnership(req) {
    if (req.user && req.user.role !== 'admin' && req.user.id !== req.params.userId) {
      throw new ForbiddenError('Доступ запрещен: нельзя управлять избранным другого пользователя');
    }
  }

  router.use(authMiddleware);

  router.get(
    '/:userId/favourites',
    validateRequest({ params: userIdParamSchema }),
    asyncHandler(async (request, response) => {
      checkOwnership(request);
      const items = await favouriteService.listFavourites(request.params.userId);
      response.json({ items });
    }),
  );

  router.post(
    '/:userId/favourites',
    validateRequest({
      params: userIdParamSchema,
      body: addFavouriteBodySchema,
    }),
    asyncHandler(async (request, response) => {
      checkOwnership(request);
      const result = await favouriteService.addFavourite(
        request.params.userId,
        request.body.productId,
      );
      response.status(result.created ? 201 : 200).json(result.product);
    }),
  );

  router.delete(
    '/:userId/favourites/:productId',
    validateRequest({ params: favouriteParamsSchema }),
    asyncHandler(async (request, response) => {
      checkOwnership(request);
      await favouriteService.removeFavourite(
        request.params.userId,
        request.params.productId,
      );
      response.status(204).send();
    }),
  );

  return router;
}

module.exports = { createFavouriteRouter };
