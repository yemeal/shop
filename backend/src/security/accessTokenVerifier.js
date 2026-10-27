const jwt = require('jsonwebtoken');
const { ApiError } = require('../errors');

class TokenExpiredError extends ApiError {
  constructor(message = 'Срок действия access-токена истек') {
    super(401, message, 'TOKEN_EXPIRED');
  }
}

class TokenMalformedError extends ApiError {
  constructor(message = 'Некорректный формат access-токена') {
    super(401, message, 'TOKEN_MALFORMED');
  }
}

class InvalidTokenSignatureError extends ApiError {
  constructor(message = 'Недействительная криптографическая подпись токена') {
    super(401, message, 'INVALID_TOKEN_SIGNATURE');
  }
}

class AccessTokenVerifier {
  /**
   * @param {Object} options
   * @param {string} options.publicKey - PEM RSA public key
   * @param {string} [options.issuer='shop-api'] - Expected issuer
   * @param {string} [options.audience='shop-client'] - Expected audience
   * @param {number} [options.leewaySeconds=0] - Clock skew allowance in seconds
   */
  constructor({ publicKey, issuer = 'shop-api', audience = 'shop-client', leewaySeconds = 0 }) {
    if (!publicKey) throw new Error('PublicKey обязателен для верификации JWT');
    this.publicKey = publicKey;
    this.issuer = issuer;
    this.audience = audience;
    this.leewaySeconds = leewaySeconds;
  }

  verify(token) {
    if (typeof token !== 'string') {
      throw new TokenMalformedError('Токен должен быть строкой');
    }

    try {
      const decoded = jwt.verify(token.trim(), this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: this.leewaySeconds,
      });

      return {
        userId: decoded.sub,
        role: decoded.role || 'user',
        jti: decoded.jti,
        exp: decoded.exp,
        iat: decoded.iat,
      };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError();
      }
      if (err instanceof jwt.JsonWebTokenError) {
        if (err.message && err.message.toLowerCase().includes('signature')) {
          throw new InvalidTokenSignatureError();
        }
        throw new TokenMalformedError(err.message);
      }
      throw new TokenMalformedError();
    }
  }
}

module.exports = {
  AccessTokenVerifier,
  TokenExpiredError,
  TokenMalformedError,
  InvalidTokenSignatureError,
};
