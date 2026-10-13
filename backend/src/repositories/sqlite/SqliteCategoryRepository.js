const { ICategoryRepository } = require('../interfaces/ICategoryRepository');

class SqliteCategoryRepository extends ICategoryRepository {
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
      'SELECT id, parent_id, name, created_at FROM categories WHERE id = ?',
      id,
    );
    return row || null;
  }

  async listCategories({ limit = 50, offset = 0 } = {}, trx = null) {
    const executor = this._getExecutor(trx);
    const rows = await executor.all(
      `SELECT c.id, c.parent_id, c.name, c.created_at, COUNT(DISTINCT p.id) AS product_count
       FROM categories c
       LEFT JOIN product_categories pc ON pc.category_id = c.id
       LEFT JOIN products p ON p.id = pc.product_id AND p.is_active = 1
       GROUP BY c.id
       ORDER BY c.name, c.id
       LIMIT ? OFFSET ?`,
      limit,
      offset,
    );
    return rows;
  }

  async countCategories(trx = null) {
    const executor = this._getExecutor(trx);
    const count = await executor.get('SELECT COUNT(*) AS total FROM categories');
    return Number(count?.total || 0);
  }

  async createCategory({ id, parentId = null, name }, trx = null) {
    const executor = this._getExecutor(trx);
    await executor.run(
      'INSERT INTO categories (id, parent_id, name) VALUES (?, ?, ?)',
      id,
      parentId,
      name,
    );
    return this.findById(id, trx);
  }

  async updateCategory(id, updates = {}, trx = null) {
    const executor = this._getExecutor(trx);
    const allowed = ['name', 'parent_id'];
    const sets = [];
    const params = [];

    for (const [key, val] of Object.entries(updates)) {
      const snake = key === 'parentId' ? 'parent_id' : key;
      if (allowed.includes(snake)) {
        sets.push(`${snake} = ?`);
        params.push(val);
      }
    }

    if (sets.length === 0) return this.findById(id, trx);

    params.push(id);
    await executor.run(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, ...params);
    return this.findById(id, trx);
  }

  async deleteCategory(id, trx = null) {
    const executor = this._getExecutor(trx);
    const result = await executor.run('DELETE FROM categories WHERE id = ?', id);
    return result.changes > 0;
  }
}

module.exports = { SqliteCategoryRepository };
