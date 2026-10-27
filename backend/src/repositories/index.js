const { SqliteUserRepository } = require('./sqlite/SqliteUserRepository');
const { SqliteSessionRepository } = require('./sqlite/SqliteSessionRepository');
const { SqliteUserAddressRepository } = require('./sqlite/SqliteUserAddressRepository');
const { SqliteProductRepository } = require('./sqlite/SqliteProductRepository');
const { SqliteCategoryRepository } = require('./sqlite/SqliteCategoryRepository');
const { SqliteOrderRepository } = require('./sqlite/SqliteOrderRepository');
const { SqliteFavouriteRepository } = require('./sqlite/SqliteFavouriteRepository');
const { SqliteCartRepository } = require('./sqlite/SqliteCartRepository');
const { SqliteTransactionManager } = require('./sqlite/SqliteTransactionManager');

/**
 * фабрика создания репозиториев sqlite
 *
 * @param {import('sqlite').Database} db
 */
function createRepositories(db) {
  if (!db) {
    throw new Error('Подключение к базе данных обязательно для создания репозиториев');
  }

  const transactionManager = new SqliteTransactionManager(db);

  return {
    transactionManager,
    userRepository: new SqliteUserRepository(db),
    sessionRepository: new SqliteSessionRepository(db),
    addressRepository: new SqliteUserAddressRepository(db),
    productRepository: new SqliteProductRepository(db),
    categoryRepository: new SqliteCategoryRepository(db),
    orderRepository: new SqliteOrderRepository(db),
    favouriteRepository: new SqliteFavouriteRepository(db),
    cartRepository: new SqliteCartRepository(db),
  };
}

module.exports = {
  SqliteUserRepository,
  SqliteSessionRepository,
  SqliteUserAddressRepository,
  SqliteProductRepository,
  SqliteCategoryRepository,
  SqliteOrderRepository,
  SqliteFavouriteRepository,
  SqliteCartRepository,
  SqliteTransactionManager,
  createRepositories,
};
