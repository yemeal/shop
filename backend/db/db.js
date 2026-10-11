const crypto = require('node:crypto');
const path = require('node:path');
const { promisify } = require('node:util');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const config = require('../src/config');

const scryptAsync = promisify(crypto.scrypt);
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

const DEFAULT_DB_FILENAME = config.dbFile;

const SCHEMA_SQL = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS ix_users_email_lower ON users(lower(email));

  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id ON user_sessions(user_id);

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    revoked_at TEXT,
    idle_expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS ix_auth_sessions_user_id ON auth_sessions(user_id);

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    used_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES auth_sessions(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS ix_refresh_tokens_session_id ON refresh_tokens(session_id);
  CREATE INDEX IF NOT EXISTS ix_refresh_tokens_hash ON refresh_tokens(token_hash);

  CREATE TABLE IF NOT EXISTS user_delivery_addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    street TEXT NOT NULL,
    house TEXT NOT NULL,
    apartment TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS ix_user_delivery_addresses_user_id
    ON user_delivery_addresses(user_id);

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS ix_categories_parent_id ON categories(parent_id);

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    image_url TEXT,
    search_text TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS ix_products_search_text ON products(search_text);

  CREATE TABLE IF NOT EXISTS product_categories (
    product_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS ix_product_categories_category_id
    ON product_categories(category_id);

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    delivery_address_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
      status IN ('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled')
    ),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (delivery_address_id) REFERENCES user_delivery_addresses(id)
  );
  CREATE INDEX IF NOT EXISTS ix_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS ix_orders_status ON orders(status);

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
    UNIQUE (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS ix_order_items_product_id ON order_items(product_id);

  CREATE TABLE IF NOT EXISTS favourite_user_products (
    product_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, user_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS ix_cart_items_user_id ON cart_items(user_id);
`;

const SEED_SQL = `
  INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, role)
  VALUES ('demo-user', 'demo@example.com', 'demo-password-hash', 'Demo', 'User', 'user');

  INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, role)
  VALUES ('demo-admin', 'admin@example.com', 'demo-admin-password-hash', 'Admin', 'User', 'admin');

  INSERT OR IGNORE INTO user_sessions (id, user_id, token_hash, expires_at)
  VALUES ('demo-session', 'demo-user', 'demo-token-hash', '2099-01-01T00:00:00.000Z');

  INSERT OR IGNORE INTO auth_sessions (id, user_id, device_info, idle_expires_at)
  VALUES ('demo-auth-session', 'demo-user', 'Demo Device', '2099-01-01T00:00:00.000Z');

  INSERT OR IGNORE INTO refresh_tokens (id, session_id, token_hash, expires_at)
  VALUES ('demo-refresh-token', 'demo-auth-session', 'demo-refresh-token-hash', '2099-01-01T00:00:00.000Z');

  INSERT OR IGNORE INTO user_delivery_addresses
    (id, user_id, country, city, street, house, apartment)
  VALUES ('demo-address', 'demo-user', 'Россия', 'Новосибирск', 'Красный проспект', '1', '1');

  INSERT OR IGNORE INTO categories (id, parent_id, name)
  VALUES ('demo-category', NULL, 'Демонстрационная категория');

  INSERT OR IGNORE INTO products (id, sku, name, description, price, is_active, image_url, search_text)
  VALUES ('demo-product', 'DEMO-001', 'Демонстрационный товар', 'Запись для проверки API', 999.99, 1, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', 'демонстрационный товар demo-001 запись для проверки api');

  INSERT OR IGNORE INTO product_categories (product_id, category_id)
  VALUES ('demo-product', 'demo-category');

  INSERT OR IGNORE INTO orders (id, user_id, delivery_address_id, status)
  VALUES ('demo-order', 'demo-user', 'demo-address', 'pending');

  INSERT OR IGNORE INTO order_items (id, order_id, product_id, quantity, unit_price)
  VALUES ('demo-order-item', 'demo-order', 'demo-product', 1, 999.99);

  INSERT OR IGNORE INTO favourite_user_products (product_id, user_id)
  VALUES ('demo-product', 'demo-user');

  INSERT OR IGNORE INTO cart_items (id, user_id, product_id, quantity)
  VALUES ('demo-cart-item', 'demo-user', 'demo-product', 1);
`;

async function migrateFavouriteUserProducts(db) {
  const foreignKeys = await db.all('PRAGMA foreign_key_list(favourite_user_products)');
  const userForeignKey = foreignKeys.find((foreignKey) => foreignKey.from === 'user_id');

  if (!userForeignKey || userForeignKey.table === 'users') {
    return;
  }

  const invalidRows = await db.get(`
    SELECT COUNT(*) AS count
    FROM favourite_user_products AS favourites
    LEFT JOIN users ON users.id = favourites.user_id
    WHERE users.id IS NULL
  `);

  if (invalidRows.count > 0) {
    throw new Error(
      'Нельзя автоматически исправить favourite_user_products: найдены записи без соответствующего пользователя.',
    );
  }

  await db.exec('BEGIN');
  try {
    await db.exec('ALTER TABLE favourite_user_products RENAME TO favourite_user_products_legacy');
    await db.exec(`
      CREATE TABLE favourite_user_products (
        product_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (product_id, user_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      INSERT INTO favourite_user_products (product_id, user_id, created_at)
        SELECT product_id, user_id, created_at FROM favourite_user_products_legacy;
      DROP TABLE favourite_user_products_legacy;
    `);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

async function migrateSchemaAdditions(db) {
  const userColumns = await db.all('PRAGMA table_info(users)');
  const hasRole = userColumns.some((col) => col.name === 'role');
  if (!hasRole) {
    await db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  }

  const productColumns = await db.all('PRAGMA table_info(products)');
  const hasImageUrl = productColumns.some((col) => col.name === 'image_url');
  if (!hasImageUrl) {
    await db.exec('ALTER TABLE products ADD COLUMN image_url TEXT');
  }

  const hasSearchText = productColumns.some((col) => col.name === 'search_text');
  if (!hasSearchText) {
    await db.exec('ALTER TABLE products ADD COLUMN search_text TEXT');
    await db.exec('CREATE INDEX IF NOT EXISTS ix_products_search_text ON products(search_text)');
  }

  // заполнение search_text для неиндексированных товаров
  const unindexedProducts = await db.all('SELECT id, name, sku, description FROM products WHERE search_text IS NULL');
  for (const prod of unindexedProducts) {
    const st = `${prod.name || ''} ${prod.sku || ''} ${prod.description || ''}`.toLowerCase();
    await db.run('UPDATE products SET search_text = ? WHERE id = ?', st, prod.id);
  }

  await db.exec('CREATE INDEX IF NOT EXISTS ix_users_email_lower ON users(lower(email))');
}

async function initDB(filename = config.dbFile, options = {}) {
  const dbPath = filename === ':memory:' ? ':memory:' : path.resolve(filename);
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
  `);

  await db.exec(SCHEMA_SQL);
  await migrateFavouriteUserProducts(db);
  await migrateSchemaAdditions(db);

  const shouldSeed = options.seed ?? process.env.SEED_DEMO_DATA !== 'false';
  if (shouldSeed) {
    await db.exec(SEED_SQL);

    const demoUser = await db.get("SELECT password_hash FROM users WHERE id = 'demo-user'");
    if (demoUser && !demoUser.password_hash.startsWith('scrypt:')) {
      const userHash = await hashPassword('demo-password-hash');
      await db.run("UPDATE users SET password_hash = ? WHERE id = 'demo-user'", userHash);
    }

    const demoAdmin = await db.get("SELECT password_hash FROM users WHERE id = 'demo-admin'");
    if (demoAdmin && !demoAdmin.password_hash.startsWith('scrypt:')) {
      const adminHash = await hashPassword('demo-admin-password-hash');
      await db.run("UPDATE users SET password_hash = ? WHERE id = 'demo-admin'", adminHash);
    }
  }

  return db;
}

module.exports = initDB;
module.exports.DEFAULT_DB_FILENAME = DEFAULT_DB_FILENAME;
