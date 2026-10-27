const jwt = require('jsonwebtoken');
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
   * @param {number} [options.expiresInSeconds=900] - Default TTL
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

  issue(principal, customTtlSeconds = null) {
    try {
      const ttl = customTtlSeconds !== null ? customTtlSeconds : this.expiresInSeconds;
      return jwt.sign(
        {
          role: principal.role || 'user',
        },
        this.privateKey,
        {
          algorithm: 'RS256',
          keyid: this.keyId,
          header: {
            typ: 'at+jwt',
            kid: this.keyId,
          },
          issuer: this.issuer,
          audience: this.audience,
          subject: principal.userId,
          jwtid: randomUUID(),
          expiresIn: ttl,
        },
      );
    } catch (err) {
      throw new TokenIssuanceError(err.message);
    }
  }
}

module.exports = {
  AccessTokenIssuer,
  TokenIssuanceError,
};
