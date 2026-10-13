const { IOrderRepository } = require('../interfaces/IOrderRepository');

class SqliteOrderRepository extends IOrderRepository {
  /**
   * @param {import('sqlite').Database} db
   */
  constructor(db) {
    super();
    this.db = db;
  }

  _getExecutor(trx = null) {
    return trx || this.db;
  }

  async createOrder({ id, userId, deliveryAddressId, status = 'pending' }, trx = null) {
    const executor = this._getExecutor(trx);
    await executor.run(
      `INSERT INTO orders (id, user_id, delivery_address_id, status)
       VALUES (?, ?, ?, ?)`,
      id,
      userId,
      deliveryAddressId,
      status,
    );
    return { id, userId, deliveryAddressId, status };
  }

  async createOrderItems(items, trx = null) {
    if (!items || items.length === 0) return;
    const executor = this._getExecutor(trx);
    const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = [];
    for (const item of items) {
      params.push(item.id, item.orderId, item.productId, item.quantity, item.unitPrice);
    }
    await executor.run(
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
       VALUES ${placeholders}`,
      ...params,
    );
  }

  async findOrderById(orderId, trx = null) {
    const executor = this._getExecutor(trx);
    const row = await executor.get(
      `SELECT o.id, o.user_id, o.delivery_address_id, o.status, o.created_at, o.updated_at,
              COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total,
              COUNT(oi.id) AS items_count,
              a.id AS address_id, a.country, a.city, a.street, a.house, a.apartment
       FROM orders o
       JOIN user_delivery_addresses a ON a.id = o.delivery_address_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ?
       GROUP BY o.id`,
      orderId,
    );
    return row || null;
  }

  async findOrderItems(orderId, trx = null) {
    const executor = this._getExecutor(trx);
    const rows = await executor.all(
      `SELECT oi.id, oi.product_id, p.name, oi.quantity, oi.unit_price
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?
       ORDER BY oi.id`,
      orderId,
    );
    return rows;
  }

  async listOrdersByUserId(userId, { limit = 50, offset = 0 } = {}, trx = null) {
    const executor = this._getExecutor(trx);
    const rows = await executor.all(
      `SELECT o.id, o.user_id, o.delivery_address_id, o.status, o.created_at, o.updated_at,
              COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total,
              COUNT(oi.id) AS items_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT ? OFFSET ?`,
      userId,
      limit,
      offset,
    );
    return rows;
  }

  async countOrdersByUserId(userId, trx = null) {
    const executor = this._getExecutor(trx);
    const count = await executor.get('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', userId);
    return Number(count?.total || 0);
  }

  async updateOrderStatus(orderId, status, trx = null) {
    const executor = this._getExecutor(trx);
    await executor.run(
      `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      status,
      orderId,
    );
    return this.findOrderById(orderId, trx);
  }
}

module.exports = { SqliteOrderRepository };
