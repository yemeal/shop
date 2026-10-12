const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const config = require('../config');

const DEFAULT_KEYS_DIR = config.keysDir;
const PRIVATE_KEY_PATH = path.join(DEFAULT_KEYS_DIR, 'rsa_private.pem');
const PUBLIC_KEY_PATH = path.join(DEFAULT_KEYS_DIR, 'rsa_public.pem');

/**
 * загрузка или генерация ключей rsa
 */
function getOrCreateRSAKeyPair(keysDir = DEFAULT_KEYS_DIR) {
  const privatePath = path.join(keysDir, 'rsa_private.pem');
  const publicPath = path.join(keysDir, 'rsa_public.pem');

  if (fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
    const privateKey = fs.readFileSync(privatePath, 'utf8');
    const publicKey = fs.readFileSync(publicPath, 'utf8');
    return { privateKey, publicKey, keyId: 'key-1' };
  }

  // генерация новой пары ключей rsa 2048 бит
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  fs.writeFileSync(privatePath, privateKey, { mode: 0o600 });
  fs.writeFileSync(publicPath, publicKey, { mode: 0o644 });

  return { privateKey, publicKey, keyId: 'key-1' };
}

module.exports = {
  getOrCreateRSAKeyPair,
  DEFAULT_KEYS_DIR,
  PRIVATE_KEY_PATH,
  PUBLIC_KEY_PATH,
};
