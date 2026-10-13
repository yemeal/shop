const { randomUUID } = require('node:crypto');
const { ICartRepository } = require('../interfaces/ICartRepository');

class SqliteCartRepository extends ICartRepository {
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

  async getCartByUserId(userId, trx = null) {
    const executor = this._getExecutor(trx);
    const rows = await executor.all(
      `SELECT ci.id, ci.user_id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
              p.sku, p.name, p.price, p.is_active, p.image_url
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ?
       ORDER BY ci.created_at DESC`,
      userId,
    );
    return rows;
  }

  async addItem(userId, productId, quantity = 1, trx = null) {
    const executor = this._getExecutor(trx);
    const id = randomUUID();
    // атомарный upsert для предотвращения гонок
    await executor.run(
      `INSERT INTO cart_items (id, user_id, product_id, quantity)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, product_id) DO UPDATE SET
         quantity = cart_items.quantity + excluded.quantity,
         updated_at = CURRENT_TIMESTAMP`,
      id,
      userId,
      productId,
      quantity,
    );
    return executor.get(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      userId,
      productId,
    );
  }

  async updateQuantity(userId, productId, quantity, trx = null) {
    const executor = this._getExecutor(trx);
    await executor.run(
      'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?',
      quantity,
      userId,
      productId,
    );
    return executor.get(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      userId,
      productId,
    );
  }

  async removeItem(userId, productId, trx = null) {
    const executor = this._getExecutor(trx);
    const result = await executor.run(
      'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
      userId,
      productId,
    );
    return result.changes > 0;
  }

  async clearCart(userId, trx = null) {
    const executor = this._getExecutor(trx);
    await executor.run('DELETE FROM cart_items WHERE user_id = ?', userId);
  }
}

module.exports = { SqliteCartRepository };
