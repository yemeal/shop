const { createCatalogService } = require('./catalogService');
const { createOrderService } = require('./orderService');
const { createFavouriteService } = require('./favouriteService');
const { createAuthService } = require('./authService');
const { createCartService } = require('./cartService');
const { createAddressService } = require('./addressService');
const shared = require('./shared');

/**
 * фабрика сервисов предметной области
 *
 * @param {ReturnType<typeof import('../repositories').createRepositories>} repositories
 */
function createServices(repositories) {
  const catalogService = createCatalogService({
    productRepository: repositories.productRepository,
    categoryRepository: repositories.categoryRepository,
    transactionManager: repositories.transactionManager,
  });

  const orderService = createOrderService({
    orderRepository: repositories.orderRepository,
    productRepository: repositories.productRepository,
    userRepository: repositories.userRepository,
    addressRepository: repositories.addressRepository,
    transactionManager: repositories.transactionManager,
  });

  const favouriteService = createFavouriteService({
    favouriteRepository: repositories.favouriteRepository,
    userRepository: repositories.userRepository,
    productRepository: repositories.productRepository,
    transactionManager: repositories.transactionManager,
  });

  const authService = createAuthService({
    userRepository: repositories.userRepository,
    sessionRepository: repositories.sessionRepository,
    transactionManager: repositories.transactionManager,
  });

  const cartService = createCartService({
    cartRepository: repositories.cartRepository,
    userRepository: repositories.userRepository,
    productRepository: repositories.productRepository,
    orderService,
    transactionManager: repositories.transactionManager,
  });

  const addressService = createAddressService({
    addressRepository: repositories.addressRepository,
    userRepository: repositories.userRepository,
    transactionManager: repositories.transactionManager,
  });

  return {
    catalogService,
    orderService,
    favouriteService,
    authService,
    cartService,
    addressService,
  };
}

module.exports = {
  createCatalogService,
  createOrderService,
  createFavouriteService,
  createAuthService,
  createCartService,
  createAddressService,
  createServices,
  ...shared,
};
