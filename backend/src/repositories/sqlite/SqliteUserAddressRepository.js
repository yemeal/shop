const { IUserAddressRepository } = require('../interfaces/IUserAddressRepository');

class SqliteUserAddressRepository extends IUserAddressRepository {
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

  async findById(id, trx = null) {
    const executor = this._getExecutor(trx);
    const row = await executor.get(
      `SELECT id, user_id, country, city, street, house, apartment, created_at
       FROM user_delivery_addresses WHERE id = ?`,
      id,
    );
    return row || null;
  }

  async findByIdAndUserId(id, userId, trx = null) {
    const executor = this._getExecutor(trx);
    const row = await executor.get(
      `SELECT id, user_id, country, city, street, house, apartment, created_at
       FROM user_delivery_addresses WHERE id = ? AND user_id = ?`,
      id,
      userId,
    );
    return row || null;
  }

  async listByUserId(userId, trx = null) {
    const executor = this._getExecutor(trx);
    const rows = await executor.all(
      `SELECT id, user_id, country, city, street, house, apartment, created_at
       FROM user_delivery_addresses WHERE user_id = ?
       ORDER BY created_at DESC`,
      userId,
    );
    return rows;
  }

  async createAddress({ id, userId, country, city, street, house, apartment = null }, trx = null) {
    const executor = this._getExecutor(trx);
    await executor.run(
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
    return this.findById(id, trx);
  }

  async deleteAddress(id, userId, trx = null) {
    const executor = this._getExecutor(trx);
    const result = await executor.run(
      `DELETE FROM user_delivery_addresses WHERE id = ? AND user_id = ?`,
      id,
      userId,
    );
    return result?.changes > 0;
  }
}

module.exports = { SqliteUserAddressRepository };
