const express = require('express');
const { asyncHandler } = require('../errors');
const { validateRequest } = require('../middlewares');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const {
  listProductsQuerySchema,
  productIdParamSchema,
  categoryIdParamSchema,
  createProductBodySchema,
  updateProductBodySchema,
  createCategoryBodySchema,
} = require('../schemas/catalogSchemas');
const { paginationQuerySchema } = require('../schemas/commonSchemas');

function createCatalogRouter(catalogService, authService = null) {
  const router = express.Router();

  // публичные маршруты каталога
  router.get(
    '/products',
    validateRequest({ query: listProductsQuerySchema }),
    asyncHandler(async (request, response) => {
      const result = await catalogService.listProducts(request.query);
      response.json(result);
    }),
  );

  router.get(
    '/products/:productId',
    validateRequest({ params: productIdParamSchema }),
    asyncHandler(async (request, response) => {
      const product = await catalogService.getProduct(request.params.productId);
      response.json(product);
    }),
  );

  router.get(
    '/categories',
    validateRequest({ query: paginationQuerySchema }),
    asyncHandler(async (request, response) => {
      const categories = await catalogService.listCategories(request.query);
      response.json(categories);
    }),
  );

  router.get(
    '/categories/:categoryId/products',
    validateRequest({
      params: categoryIdParamSchema,
      query: paginationQuerySchema,
    }),
    asyncHandler(async (request, response) => {
      const products = await catalogService.listCategoryProducts(
        request.params.categoryId,
        request.query,
      );
      response.json(products);
    }),
  );

  // маршруты администрирования каталога
  if (authService) {
    const adminAuth = [requireAuth(authService), requireRole('admin')];

    router.post(
      '/products',
      ...adminAuth,
      validateRequest({ body: createProductBodySchema }),
      asyncHandler(async (request, response) => {
        const product = await catalogService.createProduct(request.body);
        response.status(201).json(product);
      }),
    );

    router.patch(
      '/products/:productId',
      ...adminAuth,
      validateRequest({
        params: productIdParamSchema,
        body: updateProductBodySchema,
      }),
      asyncHandler(async (request, response) => {
        const product = await catalogService.updateProduct(
          request.params.productId,
          request.body,
        );
        response.json(product);
      }),
    );

    router.delete(
      '/products/:productId',
      ...adminAuth,
      validateRequest({ params: productIdParamSchema }),
      asyncHandler(async (request, response) => {
        await catalogService.deleteProduct(request.params.productId);
        response.status(204).send();
      }),
    );

    router.post(
      '/categories',
      ...adminAuth,
      validateRequest({ body: createCategoryBodySchema }),
      asyncHandler(async (request, response) => {
        const category = await catalogService.createCategory(request.body);
        response.status(201).json(category);
      }),
    );

    router.delete(
      '/categories/:categoryId',
      ...adminAuth,
      validateRequest({ params: categoryIdParamSchema }),
      asyncHandler(async (request, response) => {
        await catalogService.deleteCategory(request.params.categoryId);
        response.status(204).send();
      }),
    );
  }

  return router;
}

module.exports = { createCatalogRouter };
