const crypto = require('node:crypto');
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
  constructor({
    publicKey,
    issuer = 'shop-api',
    audience = 'shop-client',
    leewaySeconds = 0,
  }) {
    if (!publicKey) throw new Error('PublicKey обязателен для верификации JWT');
    this.publicKey = publicKey;
    this.issuer = issuer;
    this.audience = audience;
    this.leewaySeconds = leewaySeconds;
  }

  /**
   * проверка jwt с подписью rs256
   *
   * @param {string} token
   * @returns {{ userId: string, role: string, jti: string, exp: number, iat: number }}
   */
  verify(token) {
    if (typeof token !== 'string') {
      throw new TokenMalformedError('Токен должен быть строкой');
    }

    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      throw new TokenMalformedError();
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header;
    let payload;
    try {
      header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      throw new TokenMalformedError('Невозможно декодировать JSON токена');
    }

    // проверка алгоритма и типа
    if (header.alg !== 'RS256') {
      throw new TokenMalformedError('Неподдерживаемый алгоритм подписи: ожидается RS256');
    }

    // проверка криптографической подписи
    const dataToVerify = `${headerB64}.${payloadB64}`;
    const signatureBuffer = Buffer.from(signatureB64, 'base64url');
    const isValid = crypto.verify('sha256', Buffer.from(dataToVerify), this.publicKey, signatureBuffer);

    if (!isValid) {
      throw new InvalidTokenSignatureError();
    }

    // проверка срока действия и утверждений
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp + this.leewaySeconds < now) {
      throw new TokenExpiredError();
    }

    if (this.issuer && payload.iss !== this.issuer) {
      throw new TokenMalformedError(`Неверный issuer токена: ожидается ${this.issuer}`);
    }

    if (this.audience && payload.aud !== this.audience) {
      throw new TokenMalformedError(`Неверная аудитория токена: ожидается ${this.audience}`);
    }

    return {
      userId: payload.sub,
      role: payload.role || 'user',
      jti: payload.jti,
      exp: payload.exp,
      iat: payload.iat,
    };
  }
}

module.exports = {
  AccessTokenVerifier,
  TokenExpiredError,
  TokenMalformedError,
  InvalidTokenSignatureError,
};
