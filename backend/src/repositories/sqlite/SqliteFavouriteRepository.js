class SqliteFavouriteRepository {
  /**
   * @param {import('sqlite').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  async listFavourites(userId) {
    const rows = await this.db.all(
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

  async addFavourite(userId, productId) {
    const result = await this.db.run(
      'INSERT OR IGNORE INTO favourite_user_products (product_id, user_id) VALUES (?, ?)',
      productId,
      userId,
    );
    return { created: result.changes === 1 };
  }

  async removeFavourite(userId, productId) {
    const result = await this.db.run(
      'DELETE FROM favourite_user_products WHERE product_id = ? AND user_id = ?',
      productId,
      userId,
    );
    return result.changes > 0;
  }

  async isFavourite(userId, productId) {
    const row = await this.db.get(
      'SELECT 1 FROM favourite_user_products WHERE product_id = ? AND user_id = ?',
      productId,
      userId,
    );
    return Boolean(row);
  }
}

module.exports = { SqliteFavouriteRepository };
