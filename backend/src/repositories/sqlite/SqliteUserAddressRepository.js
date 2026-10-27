class SqliteUserAddressRepository {
  /**
   * @param {import('sqlite').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    const row = await this.db.get(
      `SELECT id, user_id, country, city, street, house, apartment, created_at
       FROM user_delivery_addresses WHERE id = ?`,
      id,
    );
    return row || null;
  }

  async findByIdAndUserId(id, userId) {
    const row = await this.db.get(
      `SELECT id, user_id, country, city, street, house, apartment, created_at
       FROM user_delivery_addresses WHERE id = ? AND user_id = ?`,
      id,
      userId,
    );
    return row || null;
  }

  async listByUserId(userId) {
    const rows = await this.db.all(
      `SELECT id, user_id, country, city, street, house, apartment, created_at
       FROM user_delivery_addresses WHERE user_id = ?
       ORDER BY created_at DESC`,
      userId,
    );
    return rows;
  }

  async createAddress({ id, userId, country, city, street, house, apartment = null }) {
    await this.db.run(
      `INSERT INTO user_delivery_addresses (id, user_id, country, city, street, house, apartment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      userId,
      country,
      city,
      street,
      house,
      apartment,
    );
    return this.findById(id);
  }

  async deleteAddress(id, userId) {
    const result = await this.db.run(
      `DELETE FROM user_delivery_addresses WHERE id = ? AND user_id = ?`,
      id,
      userId,
    );
    return result?.changes > 0;
  }
}

module.exports = { SqliteUserAddressRepository };
