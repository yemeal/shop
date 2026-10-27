const crypto = require('node:crypto');
const { randomUUID } = require('node:crypto');
const { promisify } = require('node:util');
const config = require('../config');
const { UnauthorizedError, ConflictError, NotFoundError } = require('../errors');
const {
  AccessTokenIssuer,
  AccessTokenVerifier,
  SHA256OpaqueRefreshTokenCodec,
  getOrCreateRSAKeyPair,
  TokenExpiredError,
} = require('../security');
const { mapUser } = require('./shared');

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;

  // строго формат scrypt с солью, без plaintext и небезопасных fallback-ов
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, keyHex] = parts;
    const expectedBuffer = Buffer.from(keyHex, 'hex');
    const derivedKey = await scryptAsync(password, salt, 64);
    if (derivedKey.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, expectedBuffer);
  }

  return false;
}

/**
 * создание сервиса аутентификации с jwt rs256 и ротацией refresh-токенов
 *
 * @param {Object} deps
 * @param {Object} deps.userRepository
 * @param {Object} deps.sessionRepository
 * @param {AccessTokenIssuer} [deps.accessTokenIssuer]
 * @param {AccessTokenVerifier} [deps.accessTokenVerifier]
 * @param {SHA256OpaqueRefreshTokenCodec} [deps.refreshTokenCodec]
 */
function createAuthService({
  userRepository,
  sessionRepository,
  transactionManager = null,
  accessTokenIssuer = null,
  accessTokenVerifier = null,
  refreshTokenCodec = null,
}) {
  if (!userRepository || !sessionRepository) {
    throw new Error('AuthService требует userRepository и sessionRepository');
  }

  const runInTx = transactionManager
    ? (cb) => transactionManager.runInTransaction(cb)
    : (cb) => cb(null);

  // инициализация ключей rsa и кодеков
  let issuer = accessTokenIssuer;
  let verifier = accessTokenVerifier;
  const codec = refreshTokenCodec || new SHA256OpaqueRefreshTokenCodec();

  if (!issuer || !verifier) {
    const { privateKey, publicKey, keyId } = getOrCreateRSAKeyPair();
    issuer = issuer || new AccessTokenIssuer({ privateKey, keyId });
    verifier = verifier || new AccessTokenVerifier({ publicKey });
  }

  // конфигурация времени жизни сессий
  const REFRESH_TOKEN_TTL_MS = config.jwt.refreshTokenTtlMs;
  const ACCESS_TOKEN_TTL_SECONDS = config.jwt.accessTokenTtlSeconds;

  async function register({
    email,
    password,
    firstName = null,
    lastName = null,
    deviceInfo = 'Browser/Client',
    ipAddress = null,
  }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('Пользователь с таким email уже зарегистрирован', { email });
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(password);

    const sessionId = randomUUID();
    const tokenId = randomUUID();
    const opaqueRefresh = codec.issue();
    const now = Date.now();
    const idleExpiresAt = new Date(now + REFRESH_TOKEN_TTL_MS).toISOString();
    const tokenExpiresAt = new Date(now + REFRESH_TOKEN_TTL_MS).toISOString();

    let user;
    await runInTx(async () => {
      user = await userRepository.create({
        id: userId,
        email: email.trim().toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: 'user',
      });

      await sessionRepository.createAuthSession({
        sessionId,
        userId: user.id,
        deviceInfo,
        ipAddress,
        idleExpiresAt,
        tokenId,
        tokenHash: opaqueRefresh.digest,
        tokenExpiresAt,
      });
    });

    const accessToken = issuer.issue(
      { userId: user.id, role: user.role || 'user' },
      ACCESS_TOKEN_TTL_SECONDS,
    );

    return {
      user: mapUser(user),
      accessToken,
      refreshToken: opaqueRefresh.value,
      sessionId,
    };
  }

  async function login({ email, password, deviceInfo = 'Browser/Client', ipAddress = null }) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedError('Неверный email или пароль');
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Неверный email или пароль');
    }

    const sessionId = randomUUID();
    const tokenId = randomUUID();
    const opaqueRefresh = codec.issue();
    const now = Date.now();
    const idleExpiresAt = new Date(now + REFRESH_TOKEN_TTL_MS).toISOString();
    const tokenExpiresAt = new Date(now + REFRESH_TOKEN_TTL_MS).toISOString();

    await runInTx(async () => {
      await sessionRepository.createAuthSession({
        sessionId,
        userId: user.id,
        deviceInfo,
        ipAddress,
        idleExpiresAt,
        tokenId,
        tokenHash: opaqueRefresh.digest,
        tokenExpiresAt,
      });
    });

    const accessToken = issuer.issue(
      { userId: user.id, role: user.role || 'user' },
      ACCESS_TOKEN_TTL_SECONDS,
    );

    return {
      user: mapUser(user),
      accessToken,
      refreshToken: opaqueRefresh.value,
      sessionId,
    };
  }

  /**
   * обновление пары токенов с ротацией и обнаружением повторного использования
   */
  async function refresh({ rawRefreshToken }) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedError('Refresh-токен обязателен', { code: 'INVALID_REFRESH_TOKEN' });
    }

    const digest = codec.digest(rawRefreshToken.trim());
    const lookup = await sessionRepository.findRefreshTokenWithSession(digest);

    if (!lookup) {
      throw new UnauthorizedError('Недействительный refresh-токен', {
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const { token, session, user } = lookup;

    // обнаружение повторного использования токена и отзыв сессии
    if (token.isUsed) {
      await sessionRepository.revokeSession(session.id);
      throw new UnauthorizedError(
        'Обнаружена попытка повторного использования токена (Reuse Detection). Сессия устройства отозвана в целях безопасности.',
        { code: 'REFRESH_TOKEN_REUSE_DETECTED', sessionId: session.id },
      );
    }

    // проверка отзыва сессии
    if (session.revokedAt) {
      throw new UnauthorizedError('Сессия устройства была отозвана', { code: 'SESSION_REVOKED' });
    }

    // проверка срока действия токена и сессии
    const now = new Date();
    if (new Date(token.expiresAt) <= now || new Date(session.idleExpiresAt) <= now) {
      throw new UnauthorizedError('Срок действия сессии истек', { code: 'SESSION_EXPIRED' });
    }

    // ротация refresh-токена и выпуск нового access-токена
    const newTokenId = randomUUID();
    const replacementOpaque = codec.issue();
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
    const newIdleExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();

    try {
      await runInTx(async () => {
        await sessionRepository.rotateRefreshToken({
          sessionId: session.id,
          currentTokenId: token.id,
          newTokenId,
          newTokenHash: replacementOpaque.digest,
          newExpiresAt,
          newIdleExpiresAt,
        });
      });
    } catch (rotateErr) {
      if (rotateErr.code === 'REFRESH_TOKEN_REUSE_DETECTED') {
        await sessionRepository.revokeSession(session.id);
        throw new UnauthorizedError(
          'Обнаружена попытка повторного использования токена (Reuse Detection). Сессия устройства отозвана в целях безопасности.',
          { code: 'REFRESH_TOKEN_REUSE_DETECTED', sessionId: session.id },
        );
      }
      throw rotateErr;
    }

    const newAccessToken = issuer.issue(
      { userId: user.id, role: user.role || 'user' },
      ACCESS_TOKEN_TTL_SECONDS,
    );

    return {
      user: mapUser(user),
      accessToken: newAccessToken,
      refreshToken: replacementOpaque.value,
      sessionId: session.id,
    };
  }

  async function logout({ rawRefreshToken = null, sessionId = null } = {}) {
    if (rawRefreshToken) {
      const digest = codec.digest(rawRefreshToken);
      const lookup = await sessionRepository.findRefreshTokenWithSession(digest);
      if (lookup) {
        await sessionRepository.revokeSession(lookup.session.id);
        return;
      }
    }
    if (sessionId) {
      await sessionRepository.revokeSession(sessionId);
    }
  }

  /**
   * валидация access-токена rs256
   */
  function validateAccessToken(token) {
    return verifier.verify(token);
  }

  async function getCurrentUser(token) {
    if (!token) {
      throw new UnauthorizedError('Токен аутентификации отсутствует');
    }

    // проверка jwt токена
    try {
      const claims = verifier.verify(token);
      const user = await userRepository.findById(claims.userId);
      if (!user) {
        throw new NotFoundError('Пользователь', { userId: claims.userId });
      }
      return mapUser(user);
    } catch (err) {
      // проброс ошибки истечения токена для автообновления
      if (err instanceof TokenExpiredError) {
        throw err;
      }

      // проверка по устаревшим сессиям
      const hashed = crypto.createHash('sha256').update(token).digest('hex');
      let session = await sessionRepository.findValidSession(hashed);
      if (!session) {
        session = await sessionRepository.findValidSession(token);
      }
      if (session) {
        return mapUser(session);
      }

      throw err;
    }
  }

  async function listUserSessions(userId) {
    return sessionRepository.listUserSessions(userId);
  }

  async function revokeUserSession(userId, sessionId) {
    const sessions = await sessionRepository.listUserSessions(userId);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new NotFoundError('Сессия устройства', { sessionId });
    }
    await sessionRepository.revokeSession(sessionId);
  }

  return {
    register,
    login,
    refresh,
    logout,
    validateAccessToken,
    getCurrentUser,
    listUserSessions,
    revokeUserSession,
    issuer,
    verifier,
    codec,
  };
}

module.exports = { createAuthService };
