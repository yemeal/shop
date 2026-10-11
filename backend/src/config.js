const path = require('node:path');

const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbFile: process.env.DB_FILE || path.resolve(__dirname, '..', 'shop.db'),
  jwt: {
    issuer: process.env.JWT_ISSUER || 'shop-api',
    audience: process.env.JWT_AUDIENCE || 'shop-client',
    accessTokenTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS || 900), // 15 минут
    refreshTokenTtlMs: Number(process.env.REFRESH_TOKEN_TTL_MS || 30 * 24 * 60 * 60 * 1000), // 30 дней
    keyId: process.env.JWT_KEY_ID || 'key-1',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  },
  keysDir: process.env.KEYS_DIR || path.resolve(__dirname, '..', 'keys'),
};

module.exports = config;
