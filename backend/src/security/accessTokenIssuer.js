const crypto = require('node:crypto');
const { randomUUID } = require('node:crypto');

class TokenIssuanceError extends Error {
  constructor(message = 'Ошибка при выпуске access токена') {
    super(message);
    this.name = 'TokenIssuanceError';
  }
}

class AccessTokenIssuer {
  /**
   * @param {Object} options
   * @param {string} options.privateKey - PEM RSA private key
   * @param {string} [options.keyId='key-1'] - Key ID
   * @param {string} [options.issuer='shop-api'] - Token issuer
   * @param {string} [options.audience='shop-client'] - Token audience
   * @param {number} [options.expiresInSeconds=900] - Default TTL (15 minutes = 900s)
   */
  constructor({
    privateKey,
    keyId = 'key-1',
    issuer = 'shop-api',
    audience = 'shop-client',
    expiresInSeconds = 900,
  }) {
    if (!privateKey) throw new Error('PrivateKey обязателен для выпуска JWT');
    this.privateKey = privateKey;
    this.keyId = keyId;
    this.issuer = issuer;
    this.audience = audience;
    this.expiresInSeconds = expiresInSeconds;
  }

  /**
   * выпуск jwt с подписью rs256
   *
   * @param {Object} principal
   * @param {string} principal.userId
   * @param {string} principal.role
   * @param {number} [customTtlSeconds]
   * @returns {string} Encoded JWT
   */
  issue(principal, customTtlSeconds = null) {
    try {
      const ttl = customTtlSeconds !== null ? customTtlSeconds : this.expiresInSeconds;
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + ttl;

      const header = {
        alg: 'RS256',
        typ: 'at+jwt',
        kid: this.keyId,
      };

      const payload = {
        iss: this.issuer,
        sub: principal.userId,
        aud: this.audience,
        iat: now,
        exp: expiresAt,
        jti: randomUUID(),
        role: principal.role || 'user',
      };

      const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const dataToSign = `${headerB64}.${payloadB64}`;

      const signature = crypto.sign('sha256', Buffer.from(dataToSign), this.privateKey).toString('base64url');

      return `${dataToSign}.${signature}`;
    } catch (err) {
      throw new TokenIssuanceError(err.message);
    }
  }
}

module.exports = {
  AccessTokenIssuer,
  TokenIssuanceError,
};
