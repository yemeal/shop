class SqliteUserRepository {
  /**
   * @param {import('sqlite').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  async findById(id) {
    const row = await this.db.get(
      `SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at
       FROM users WHERE id = ?`,
      id,
    );
    return row || null;
  }

  async findByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const row = await this.db.get(
      `SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at
       FROM users WHERE lower(email) = ? OR email = ?`,
      normalized,
      normalized,
    );
    return row || null;
  }

  async exists(id) {
    const row = await this.db.get('SELECT 1 FROM users WHERE id = ?', id);
    return Boolean(row);
  }

  async create({ id, email, passwordHash, firstName = null, lastName = null, role = 'user' }) {
    await this.db.run(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      email,
      passwordHash,
      firstName,
      lastName,
      role,
    );
    return this.findById(id);
  }

  async update(id, updates = {}) {
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

    if (sets.length === 0) return this.findById(id);

    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await this.db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...params);
    return this.findById(id);
  }
}

module.exports = { SqliteUserRepository };
