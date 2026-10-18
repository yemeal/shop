/**
 * Контракт репозитория заказов
 *
 * @typedef {Object} IOrderRepository
 * @property {(order: { id: string, userId: string, deliveryAddressId: string, status?: string }, trx?: Object) => Promise<Object>} createOrder
 * @property {(items: Array<Object>, trx?: Object) => Promise<void>} createOrderItems
 * @property {(orderId: string, trx?: Object) => Promise<Object|null>} findOrderById
 * @property {(orderId: string, trx?: Object) => Promise<Array<Object>>} findOrderItems
 * @property {(userId: string, pagination?: { limit?: number, offset?: number }, trx?: Object) => Promise<Array<Object>>} listOrdersByUserId
 * @property {(userId: string, trx?: Object) => Promise<number>} countOrdersByUserId
 * @property {(pagination?: { limit?: number, offset?: number, status?: string }, trx?: Object) => Promise<Array<Object>>} listAllOrders
 * @property {(filters?: { status?: string }, trx?: Object) => Promise<number>} countAllOrders
 * @property {(orderId: string, status: string, trx?: Object) => Promise<Object>} updateOrderStatus
 */

class IOrderRepository {}

module.exports = { IOrderRepository };
