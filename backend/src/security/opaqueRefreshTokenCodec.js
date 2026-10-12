const crypto = require('node:crypto');

class SHA256OpaqueRefreshTokenCodec {
  constructor(tokenBytes = 32) {
    this.tokenBytes = tokenBytes;
  }

  /**
   * генерация случайного refresh-токена и его sha-256 хеша
   * @returns {{ value: string, digest: string }}
   */
  issue() {
    const raw = crypto.randomBytes(this.tokenBytes).toString('base64url');
    const digest = this.digest(raw);
    return { value: raw, digest };
  }

  /**
   * вычисление sha-256 хеша для токена
   * @param {string} rawToken
   * @returns {string}
   */
  digest(rawToken) {
    return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
  }
}

module.exports = { SHA256OpaqueRefreshTokenCodec };
