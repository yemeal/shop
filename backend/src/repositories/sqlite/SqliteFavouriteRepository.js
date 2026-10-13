const { IFavouriteRepository } = require('../interfaces/IFavouriteRepository');

class SqliteFavouriteRepository extends IFavouriteRepository {
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

  async listFavourites(userId, trx = null) {
    const executor = this._getExecutor(trx);
    const rows = await executor.all(
      `SELECT p.id, p.sku, p.name, p.description, p.price, p.is_active, p.image_url,
              p.created_at, p.updated_at, f.created_at AS favourite_created_at
       FROM favourite_user_products f
       JOIN products p ON p.id = f.product_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC, p.id`,
      userId,
    );
    return rows;
  }

  async addFavourite(userId, productId, trx = null) {
    const executor = this._getExecutor(trx);
    const result = await executor.run(
      'INSERT OR IGNORE INTO favourite_user_products (product_id, user_id) VALUES (?, ?)',
      productId,
      userId,
    );
    return { created: result.changes === 1 };
  }

  async removeFavourite(userId, productId, trx = null) {
    const executor = this._getExecutor(trx);
    const result = await executor.run(
      'DELETE FROM favourite_user_products WHERE product_id = ? AND user_id = ?',
      productId,
      userId,
    );
    return result.changes > 0;
  }

  async isFavourite(userId, productId, trx = null) {
    const executor = this._getExecutor(trx);
    const row = await executor.get(
      'SELECT 1 FROM favourite_user_products WHERE product_id = ? AND user_id = ?',
      productId,
      userId,
    );
    return Boolean(row);
  }
}

module.exports = { SqliteFavouriteRepository };
