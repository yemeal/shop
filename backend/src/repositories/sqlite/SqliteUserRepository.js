const { IUserRepository } = require('../interfaces/IUserRepository');

class SqliteUserRepository extends IUserRepository {
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
      `SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at
       FROM users WHERE id = ?`,
      id,
    );
    return row || null;
  }

  async findByEmail(email, trx = null) {
    if (!email) return null;
    const executor = this._getExecutor(trx);
    const normalized = email.trim().toLowerCase();
    const row = await executor.get(
      `SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at
       FROM users WHERE lower(email) = ? OR email = ?`,
      normalized,
      normalized,
    );
    return row || null;
  }

  async exists(id, trx = null) {
    const executor = this._getExecutor(trx);
    const row = await executor.get('SELECT 1 FROM users WHERE id = ?', id);
    return Boolean(row);
  }

  async create({ id, email, passwordHash, firstName = null, lastName = null, role = 'user' }, trx = null) {
    const executor = this._getExecutor(trx);
    await executor.run(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      email,
      passwordHash,
      firstName,
      lastName,
      role,
    );
    return this.findById(id, trx);
  }

  async update(id, updates = {}, trx = null) {
    const executor = this._getExecutor(trx);
    const allowed = ['first_name', 'last_name', 'role'];
    const sets = [];
    const params = [];

    for (const [key, val] of Object.entries(updates)) {
      const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowed.includes(snake)) {
        sets.push(`${snake} = ?`);
        params.push(val);
      }
    }

    if (sets.length === 0) return this.findById(id, trx);

    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await executor.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...params);
    return this.findById(id, trx);
  }
}

module.exports = { SqliteUserRepository };
