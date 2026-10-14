const { NotFoundError, ValidationError } = require('../errors');
const { ensureUser, mapCartItem } = require('./shared');

/**
 * создание сервиса корзины
 *
 * @param {Object} deps
 * @param {import('../repositories/interfaces/ICartRepository').ICartRepository} deps.cartRepository
 * @param {import('../repositories/interfaces/IUserRepository').IUserRepository} deps.userRepository
 * @param {import('../repositories/interfaces/IProductRepository').IProductRepository} deps.productRepository
 * @param {Object} [deps.orderService]
 */
function createCartService({ cartRepository, userRepository, productRepository, orderService, transactionManager = null }) {
  if (!cartRepository || !userRepository || !productRepository) {
    throw new Error('CartService требует cartRepository, userRepository и productRepository');
  }

  const runInTx = transactionManager
    ? (cb) => transactionManager.runInTransaction(cb)
    : (cb) => cb(null);

  async function getCart(userId) {
    await ensureUser(userRepository, userId);
    const rows = await cartRepository.getCartByUserId(userId);
    const items = rows.map(mapCartItem);
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      total: Number(total.toFixed(2)),
      itemsCount,
    };
  }

  async function addItem(userId, productId, quantity = 1) {
    await ensureUser(userRepository, userId);
    const product = await productRepository.findActiveById(productId);
    if (!product) {
      throw new NotFoundError('Товар', { productId });
    }

    await cartRepository.addItem(userId, productId, quantity);
    return getCart(userId);
  }

  async function updateQuantity(userId, productId, quantity) {
    await ensureUser(userRepository, userId);
    await cartRepository.updateQuantity(userId, productId, quantity);
    return getCart(userId);
  }

  async function removeItem(userId, productId) {
    await ensureUser(userRepository, userId);
    const removed = await cartRepository.removeItem(userId, productId);
    if (!removed) {
      throw new NotFoundError('Товар в корзине', { userId, productId });
    }
    return getCart(userId);
  }

  async function clearCart(userId) {
    await ensureUser(userRepository, userId);
    await cartRepository.clearCart(userId);
    return {
      items: [],
      total: 0,
      itemsCount: 0,
    };
  }

  async function checkout(userId, deliveryAddressId) {
    if (!orderService) {
      throw new Error('Оформление заказа из корзины требует orderService');
    }

    const cart = await getCart(userId);
    if (cart.items.length === 0) {
      throw new ValidationError('Корзина пуста');
    }

    let order;
    await runInTx(async (trx) => {
      order = await orderService.createOrder({
        userId,
        deliveryAddressId,
        items: cart.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
      });

      await cartRepository.clearCart(userId, trx);
    });

    return order;
  }

  return {
    getCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    checkout,
  };
}

module.exports = { createCartService };
