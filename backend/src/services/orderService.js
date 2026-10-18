const { randomUUID } = require('node:crypto');
const { NotFoundError, ValidationError } = require('../errors');
const { ensureUser, mapAddress, mapOrderSummary } = require('./shared');

/**
 * создание сервиса заказов
 *
 * @param {Object} deps
 * @param {import('../repositories/interfaces/IOrderRepository').IOrderRepository} deps.orderRepository
 * @param {import('../repositories/interfaces/IProductRepository').IProductRepository} deps.productRepository
 * @param {import('../repositories/interfaces/IUserRepository').IUserRepository} deps.userRepository
 * @param {import('../repositories/interfaces/IUserAddressRepository').IUserAddressRepository} deps.addressRepository
 * @param {import('../repositories/interfaces/ITransactionManager').ITransactionManager} deps.transactionManager
 */
function createOrderService({
  orderRepository,
  productRepository,
  userRepository,
  addressRepository,
  transactionManager,
}) {
  if (
    !orderRepository ||
    !productRepository ||
    !userRepository ||
    !addressRepository ||
    !transactionManager
  ) {
    throw new Error('OrderService требует orderRepository, productRepository, userRepository, addressRepository и transactionManager');
  }

  async function getOrder(orderId) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Заказ', { orderId });
    }

    const items = await orderRepository.findOrderItems(orderId);

    return {
      ...mapOrderSummary(order),
      deliveryAddress: mapAddress(order),
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.unit_price) * item.quantity,
      })),
    };
  }

  async function listUserOrders(userId, { limit = 50, offset = 0 } = {}) {
    await ensureUser(userRepository, userId);

    const [rows, total] = await Promise.all([
      orderRepository.listOrdersByUserId(userId, { limit, offset }),
      orderRepository.countOrdersByUserId(userId),
    ]);

    return {
      items: rows.map(mapOrderSummary),
      total,
      limit,
      offset,
    };
  }

  async function listAllOrders({ limit = 50, offset = 0, status } = {}) {
    const [rows, total] = await Promise.all([
      orderRepository.listAllOrders({ limit, offset, status }),
      orderRepository.countAllOrders({ status }),
    ]);

    return {
      items: rows.map(mapOrderSummary),
      total,
      limit,
      offset,
    };
  }

  async function createOrder(input) {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('Тело запроса должно быть JSON-объектом');
    }
    if (!input.userId || typeof input.userId !== 'string') {
      throw new ValidationError('Поле userId обязательно');
    }
    if (!input.deliveryAddressId || typeof input.deliveryAddressId !== 'string') {
      throw new ValidationError('Поле deliveryAddressId обязательно');
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new ValidationError('Заказ должен содержать хотя бы один товар');
    }

    await ensureUser(userRepository, input.userId);

    const address = await addressRepository.findByIdAndUserId(
      input.deliveryAddressId,
      input.userId,
    );
    if (!address) {
      throw new ValidationError('Адрес доставки не принадлежит пользователю', {
        deliveryAddressId: input.deliveryAddressId,
      });
    }

    const productIds = input.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new ValidationError('Один товар нельзя добавить в заказ дважды');
    }

    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new ValidationError('Количество товара должно быть положительным целым числом');
      }
    }

    const products = await productRepository.findActiveByIds(productIds);
    const productsById = new Map(products.map((p) => [p.id, p]));

    const missingProduct = productIds.find((id) => !productsById.has(id));
    if (missingProduct) {
      throw new NotFoundError('Товар', { productId: missingProduct });
    }

    const orderId = randomUUID();

    await transactionManager.runInTransaction(async (trx) => {
      await orderRepository.createOrder(
        {
          id: orderId,
          userId: input.userId,
          deliveryAddressId: input.deliveryAddressId,
          status: 'pending',
        },
        trx,
      );

      const orderItems = input.items.map((item) => ({
        id: randomUUID(),
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: productsById.get(item.productId).price,
      }));

      await orderRepository.createOrderItems(orderItems, trx);
    });

    return getOrder(orderId);
  }

  async function updateOrderStatus(orderId, status) {
    const existing = await orderRepository.findOrderById(orderId);
    if (!existing) {
      throw new NotFoundError('Заказ', { orderId });
    }
    await orderRepository.updateOrderStatus(orderId, status);
    return getOrder(orderId);
  }

  return {
    getOrder,
    listUserOrders,
    listAllOrders,
    createOrder,
    updateOrderStatus,
  };
}

module.exports = { createOrderService };
