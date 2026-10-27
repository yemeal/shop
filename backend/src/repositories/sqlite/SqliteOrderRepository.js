class SqliteOrderRepository {
  /**
   * @param {import('sqlite').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  async createOrder({ id, userId, deliveryAddressId, status = 'pending' }) {
    await this.db.run(
      `INSERT INTO orders (id, user_id, delivery_address_id, status)
       VALUES (?, ?, ?, ?)`,
      id,
      userId,
      deliveryAddressId,
      status,
    );
    return { id, userId, deliveryAddressId, status };
  }

  async createOrderItems(items) {
    if (!items || items.length === 0) return;
    const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = [];
    for (const item of items) {
      params.push(item.id, item.orderId, item.productId, item.quantity, item.unitPrice);
    }
    await this.db.run(
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
       VALUES ${placeholders}`,
      ...params,
    );
  }

  async findOrderById(orderId) {
    const row = await this.db.get(
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

  async findOrderItems(orderId) {
    const rows = await this.db.all(
      `SELECT oi.id, oi.product_id, p.name, oi.quantity, oi.unit_price
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?
       ORDER BY oi.id`,
      orderId,
    );
    return rows;
  }

  async listOrdersByUserId(userId, { limit = 50, offset = 0 } = {}) {
    const rows = await this.db.all(
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

  async countOrdersByUserId(userId) {
    const count = await this.db.get(
      'SELECT COUNT(*) AS total FROM orders WHERE user_id = ?',
      userId,
    );
    return Number(count?.total || 0);
  }

  async listAllOrders({ limit = 50, offset = 0, status } = {}) {
    const whereClauses = [];
    const params = [];
    if (status) {
      whereClauses.push('o.status = ?');
      params.push(status);
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const rows = await this.db.all(
      `SELECT o.id, o.user_id, o.delivery_address_id, o.status, o.created_at, o.updated_at,
              COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total,
              COUNT(oi.id) AS items_count,
              u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${whereSql}
       GROUP BY o.id
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT ? OFFSET ?`,
      ...params,
      limit,
      offset,
    );
    return rows;
  }

  async countAllOrders({ status } = {}) {
    if (status) {
      const count = await this.db.get(
        'SELECT COUNT(*) AS total FROM orders WHERE status = ?',
        status,
      );
      return Number(count?.total || 0);
    }
    const count = await this.db.get('SELECT COUNT(*) AS total FROM orders');
    return Number(count?.total || 0);
  }

  async updateOrderStatus(orderId, status) {
    await this.db.run(
      `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      status,
      orderId,
    );
    return this.findOrderById(orderId);
  }
}

module.exports = { SqliteOrderRepository };
