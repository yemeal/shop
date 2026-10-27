const express = require('express');
const { createRepositories } = require('../repositories');
const { createServices } = require('../services');
const { createCatalogRouter } = require('./catalogRoutes');
const { createOrderRouter } = require('./orderRoutes');
const { createAuthRouter } = require('./authRoutes');
const { createCartRouter } = require('./cartRoutes');
const { createUserRouter } = require('./userRoutes');

/**
 * создание главного api роутера с внедрением зависимостей
 *
 * @param {import('sqlite').Database|Object} dbOrContainer
 */
function createApiRouter(dbOrContainer) {
  const router = express.Router();

  let services;
  if (dbOrContainer && dbOrContainer.catalogService) {
    services = dbOrContainer;
  } else if (dbOrContainer && dbOrContainer.userRepository) {
    services = createServices(dbOrContainer);
  } else {
    const repositories = createRepositories(dbOrContainer);
    services = createServices(repositories);
  }

  const userRouter = createUserRouter({
    orderService: services.orderService,
    favouriteService: services.favouriteService,
    addressService: services.addressService,
    authService: services.authService,
  });

  router.use('/auth', createAuthRouter(services.authService));
  router.use('/catalog', createCatalogRouter(services.catalogService, services.authService));
  router.use('/orders', createOrderRouter(services.orderService, services.authService));
  router.use('/cart', createCartRouter(services.cartService, services.authService));
  router.use('/users', userRouter);
  router.use('/me', userRouter);

  return router;
}

module.exports = { createApiRouter };
