const express = require('express');
const { createRepositories } = require('../repositories');
const { createServices } = require('../services');
const { createCatalogRouter } = require('./catalogRoutes');
const { createOrderRouter } = require('./orderRoutes');
const { createUserOrderRouter } = require('./userOrderRoutes');
const { createFavouriteRouter } = require('./favouriteRoutes');
const { createAuthRouter } = require('./authRoutes');
const { createCartRouter } = require('./cartRoutes');

/**
 * создание главного api роутера с внедрением зависимостей
 *
 * @param {import('sqlite').Database|Object} dbOrContainer
 */
function createApiRouter(dbOrContainer) {
  const router = express.Router();

  let services;
  if (dbOrContainer && dbOrContainer.catalogService) {
    // переданы сервисы
    services = dbOrContainer;
  } else if (dbOrContainer && dbOrContainer.userRepository) {
    // переданы репозитории
    services = createServices(dbOrContainer);
  } else {
    // передана база данных sqlite
    const repositories = createRepositories(dbOrContainer);
    services = createServices(repositories);
  }

  router.use('/auth', createAuthRouter(services.authService));
  router.use('/catalog', createCatalogRouter(services.catalogService, services.authService));
  router.use('/orders', createOrderRouter(services.orderService, services.authService));
  router.use('/users', createUserOrderRouter(services.orderService, services.authService));
  router.use('/users', createFavouriteRouter(services.favouriteService, services.authService));
  router.use('/cart', createCartRouter(services.cartService, services.authService));

  return router;
}

module.exports = { createApiRouter };
