const { NotFoundError, ValidationError } = require('../errors');
const { ensureUser, mapProduct } = require('./shared');

/**
 * создание сервиса избранного
 *
 * @param {Object} deps
 * @param {import('../repositories/interfaces/IFavouriteRepository').IFavouriteRepository} deps.favouriteRepository
 * @param {import('../repositories/interfaces/IUserRepository').IUserRepository} deps.userRepository
 * @param {import('../repositories/interfaces/IProductRepository').IProductRepository} deps.productRepository
 */
function createFavouriteService({ favouriteRepository, userRepository, productRepository }) {
  if (!favouriteRepository || !userRepository || !productRepository) {
    throw new Error('FavouriteService требует favouriteRepository, userRepository и productRepository');
  }

  async function listFavourites(userId) {
    await ensureUser(userRepository, userId);
    const rows = await favouriteRepository.listFavourites(userId);
    return rows.map((row) => ({
      ...mapProduct(row),
      addedAt: row.favourite_created_at,
    }));
  }

  async function addFavourite(userId, productId) {
    if (!productId || typeof productId !== 'string') {
      throw new ValidationError('Поле productId обязательно');
    }

    await ensureUser(userRepository, userId);

    const product = await productRepository.findActiveById(productId);
    if (!product) {
      throw new NotFoundError('Товар', { productId });
    }

    const result = await favouriteRepository.addFavourite(userId, productId);
    return {
      product: mapProduct(product),
      created: result.created,
    };
  }

  async function removeFavourite(userId, productId) {
    await ensureUser(userRepository, userId);

    const removed = await favouriteRepository.removeFavourite(userId, productId);
    if (!removed) {
      throw new NotFoundError('Избранный товар', { userId, productId });
    }
  }

  return {
    listFavourites,
    addFavourite,
    removeFavourite,
  };
}

module.exports = { createFavouriteService };
