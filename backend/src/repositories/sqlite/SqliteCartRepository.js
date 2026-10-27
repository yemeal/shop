const { randomUUID } = require('node:crypto');

class SqliteCartRepository {
  /**
   * @param {import('sqlite').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  async getCartByUserId(userId) {
    const rows = await this.db.all(
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

  async addItem(userId, productId, quantity = 1) {
    const id = randomUUID();
    // атомарный upsert для предотвращения гонок
    await this.db.run(
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
    return this.db.get(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      userId,
      productId,
    );
  }

  async updateQuantity(userId, productId, quantity) {
    await this.db.run(
      'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?',
      quantity,
      userId,
      productId,
    );
    return this.db.get(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      userId,
      productId,
    );
  }

  async removeItem(userId, productId) {
    const result = await this.db.run(
      'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
      userId,
      productId,
    );
    return result.changes > 0;
  }

  async clearCart(userId) {
    await this.db.run('DELETE FROM cart_items WHERE user_id = ?', userId);
  }
}

module.exports = { SqliteCartRepository };
