const { IProductRepository } = require('../interfaces/IProductRepository');

class SqliteProductRepository extends IProductRepository {
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

  async findActiveById(id, trx = null) {
    const executor = this._getExecutor(trx);
    const row = await executor.get(
      `SELECT id, sku, name, description, price, is_active, image_url, created_at, updated_at
       FROM products
       WHERE id = ? AND is_active = 1`,
      id,
    );
    return row || null;
  }

  async findById(id, trx = null) {
    const executor = this._getExecutor(trx);
    const row = await executor.get(
      `SELECT id, sku, name, description, price, is_active, image_url, created_at, updated_at
       FROM products
       WHERE id = ?`,
      id,
    );
    return row || null;
  }

  async findActiveByIds(ids, trx = null) {
    if (!ids || ids.length === 0) return [];
    const executor = this._getExecutor(trx);
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await executor.all(
      `SELECT id, sku, name, description, price, is_active, image_url, created_at, updated_at
       FROM products
       WHERE id IN (${placeholders}) AND is_active = 1`,
      ...ids,
    );
    return rows;
  }

  async listProducts({
    search = '',
    categoryId = null,
    minPrice = null,
    maxPrice = null,
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 50,
    offset = 0,
    includeInactive = false,
  } = {}, trx = null) {
    const executor = this._getExecutor(trx);
    const conditions = includeInactive ? [] : ['p.is_active = 1'];
    const params = [];

    if (categoryId) {
      conditions.push(
        'EXISTS (SELECT 1 FROM product_categories filter_pc WHERE filter_pc.product_id = p.id AND filter_pc.category_id = ?)',
      );
      params.push(categoryId);
    }

    if (minPrice !== null && minPrice !== undefined) {
      conditions.push('p.price >= ?');
      params.push(minPrice);
    }

    if (maxPrice !== null && maxPrice !== undefined) {
      conditions.push('p.price <= ?');
      params.push(maxPrice);
    }

    const rawSearch = typeof search === 'string' ? search.trim() : '';

    if (rawSearch) {
      const escapedSearch = rawSearch
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .toLowerCase();

      conditions.push("(p.search_text LIKE ? ESCAPE '\\' OR lower(p.name) LIKE ? ESCAPE '\\' OR lower(p.sku) LIKE ? ESCAPE '\\')");
      params.push(`%${escapedSearch}%`, `%${escapedSearch}%`, `%${escapedSearch}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeSortBy = ['created_at', 'price', 'name'].includes(sortBy) ? `p.${sortBy}` : 'p.created_at';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [rows, countRow] = await Promise.all([
      executor.all(
        `SELECT p.id, p.sku, p.name, p.description, p.price, p.is_active, p.image_url, p.created_at, p.updated_at
         FROM products p
         ${where}
         ORDER BY ${safeSortBy} ${safeSortOrder}, p.id
         LIMIT ? OFFSET ?`,
        ...params,
        limit,
        offset,
      ),
      executor.get(`SELECT COUNT(*) AS total FROM products p ${where}`, ...params),
    ]);

    return {
      items: rows,
      total: Number(countRow?.total || 0),
    };
  }

  async countProducts(filter = {}, trx = null) {
    const res = await this.listProducts({ ...filter, limit: 1, offset: 0 }, trx);
    return res.total;
  }

  async getCategoriesForProduct(productId, trx = null) {
    const executor = this._getExecutor(trx);
    const rows = await executor.all(
      `SELECT c.id, c.name, c.parent_id
       FROM categories c
       JOIN product_categories pc ON pc.category_id = c.id
       WHERE pc.product_id = ?
       ORDER BY c.name`,
      productId,
    );
    return rows;
  }

  async createProduct(
    { id, sku, name, description = null, price, isActive = 1, imageUrl = null },
    categoryIds = [],
    trx = null,
  ) {
    const executor = this._getExecutor(trx);
    const searchText = `${name || ''} ${sku || ''} ${description || ''}`.toLowerCase();

    await executor.run(
      `INSERT INTO products (id, sku, name, description, price, is_active, image_url, search_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      sku,
      name,
      description,
      price,
      isActive ? 1 : 0,
      imageUrl,
      searchText,
    );

    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => '(?, ?)').join(', ');
      const params = [];
      for (const catId of categoryIds) {
        params.push(id, catId);
      }
      await executor.run(
        `INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES ${placeholders}`,
        ...params,
      );
    }

    return this.findById(id, trx);
  }

  async updateProduct(id, updates = {}, categoryIds = undefined, trx = null) {
    const executor = this._getExecutor(trx);
    const existing = await this.findById(id, trx);
    const allowed = ['sku', 'name', 'description', 'price', 'is_active', 'image_url'];
    const sets = [];
    const params = [];

    for (const [key, val] of Object.entries(updates)) {
      const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowed.includes(snake)) {
        sets.push(`${snake} = ?`);
        params.push(snake === 'is_active' ? (val ? 1 : 0) : val);
      }
    }

    const mergedName = updates.name !== undefined ? updates.name : existing?.name;
    const mergedSku = updates.sku !== undefined ? updates.sku : existing?.sku;
    const mergedDesc = updates.description !== undefined ? updates.description : existing?.description;
    const searchText = `${mergedName || ''} ${mergedSku || ''} ${mergedDesc || ''}`.toLowerCase();
    sets.push('search_text = ?');
    params.push(searchText);

    if (sets.length > 0) {
      sets.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      await executor.run(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, ...params);
    }

    if (Array.isArray(categoryIds)) {
      await executor.run('DELETE FROM product_categories WHERE product_id = ?', id);
      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => '(?, ?)').join(', ');
        const catParams = [];
        for (const catId of categoryIds) {
          catParams.push(id, catId);
        }
        await executor.run(
          `INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES ${placeholders}`,
          ...catParams,
        );
      }
    }

    return this.findById(id, trx);
  }

  async deleteProduct(id, trx = null) {
    const executor = this._getExecutor(trx);
    const result = await executor.run('DELETE FROM products WHERE id = ?', id);
    return result.changes > 0;
  }
}

module.exports = { SqliteProductRepository };
