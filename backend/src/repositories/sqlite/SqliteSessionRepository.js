const { ISessionRepository } = require('../interfaces/ISessionRepository');

class SqliteSessionRepository extends ISessionRepository {
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

  // атомарное создание сессии и начального refresh-токена
  async createAuthSession({
    sessionId,
    userId,
    deviceInfo = 'Unknown Device',
    ipAddress = null,
    idleExpiresAt,
    tokenId,
    tokenHash,
    tokenExpiresAt,
  }, trx = null) {
    const executor = this._getExecutor(trx);

    await executor.run(
      `INSERT INTO auth_sessions (id, user_id, device_info, ip_address, idle_expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      sessionId,
      userId,
      deviceInfo,
      ipAddress,
      idleExpiresAt,
    );

    await executor.run(
      `INSERT INTO refresh_tokens (id, session_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      tokenId,
      sessionId,
      tokenHash,
      tokenExpiresAt,
    );

    return {
      sessionId,
      userId,
      deviceInfo,
      ipAddress,
      idleExpiresAt,
      tokenId,
    };
  }

  async findRefreshTokenWithSession(tokenHash, trx = null) {
    const executor = this._getExecutor(trx);
    const row = await executor.get(
      `SELECT rt.id AS token_id, rt.session_id, rt.token_hash, rt.used_at, rt.expires_at AS token_expires_at, rt.created_at AS token_created_at,
              s.id AS session_id, s.user_id, s.device_info, s.ip_address, s.revoked_at, s.idle_expires_at,
              u.id AS user_id, u.email, u.first_name, u.last_name, u.role
       FROM refresh_tokens rt
       JOIN auth_sessions s ON s.id = rt.session_id
       JOIN users u ON u.id = s.user_id
       WHERE rt.token_hash = ?`,
      tokenHash,
    );

    if (!row) return null;

    return {
      token: {
        id: row.token_id,
        sessionId: row.session_id,
        tokenHash: row.token_hash,
        usedAt: row.used_at,
        expiresAt: row.token_expires_at,
        createdAt: row.token_created_at,
        isUsed: row.used_at !== null,
      },
      session: {
        id: row.session_id,
        userId: row.user_id,
        deviceInfo: row.device_info,
        ipAddress: row.ip_address,
        revokedAt: row.revoked_at,
        idleExpiresAt: row.idle_expires_at,
        isActive: row.revoked_at === null && new Date(row.idle_expires_at) > new Date(),
      },
      user: {
        id: row.user_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
      },
    };
  }

  async rotateRefreshToken({
    sessionId,
    currentTokenId,
    newTokenId,
    newTokenHash,
    newExpiresAt,
    newIdleExpiresAt,
  }, trx = null) {
    const executor = this._getExecutor(trx);

    // атомарное списание токена только если он еще не использован
    const updateResult = await executor.run(
      `UPDATE refresh_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ? AND used_at IS NULL`,
      currentTokenId,
    );

    if (updateResult.changes === 0) {
      const reuseErr = new Error('Refresh token already consumed (concurrent reuse detected)');
      reuseErr.code = 'REFRESH_TOKEN_REUSE_DETECTED';
      throw reuseErr;
    }

    // сохранение нового токена в цепочку сессии
    await executor.run(
      `INSERT INTO refresh_tokens (id, session_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      newTokenId,
      sessionId,
      newTokenHash,
      newExpiresAt,
    );

    // продление срока действия сессии
    await executor.run(
      `UPDATE auth_sessions
       SET idle_expires_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      newIdleExpiresAt,
      sessionId,
    );
  }

  async revokeSession(sessionId, trx = null) {
    const executor = this._getExecutor(trx);
    const result = await executor.run(
      `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE id = ? AND revoked_at IS NULL`,
      sessionId,
    );
    return result.changes > 0;
  }

  async revokeAllUserSessions(userId, trx = null) {
    const executor = this._getExecutor(trx);
    await executor.run(
      `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND revoked_at IS NULL`,
      userId,
    );
  }

  async listUserSessions(userId, trx = null) {
    const executor = this._getExecutor(trx);
    const rows = await executor.all(
      `SELECT id, user_id, device_info, ip_address, revoked_at, idle_expires_at, created_at, updated_at
       FROM auth_sessions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      userId,
    );
    return rows;
  }

  // поддержка устаревших сессий
  async createSession({ id, userId, tokenHash, expiresAt }, trx = null) {
    const executor = this._getExecutor(trx);
    await executor.run(
      `INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      id,
      userId,
      tokenHash,
      expiresAt,
    );
    return { id, userId, tokenHash, expiresAt };
  }

  async findValidSession(tokenHash, trx = null) {
    // поиск в сессиях устройств
    const rt = await this.findRefreshTokenWithSession(tokenHash, trx);
    if (rt && rt.session.isActive && !rt.token.isUsed) {
      return {
        sessionId: rt.session.id,
        user_id: rt.user.id,
        id: rt.user.id,
        email: rt.user.email,
        first_name: rt.user.firstName,
        last_name: rt.user.lastName,
        role: rt.user.role,
      };
    }

    const executor = this._getExecutor(trx);
    // поиск в устаревшей таблице сессий
    const row = await executor.get(
      `SELECT s.id AS session_id, s.user_id, s.expires_at, s.revoked_at,
              u.id, u.email, u.first_name, u.last_name, u.role, u.created_at
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
         AND s.revoked_at IS NULL
         AND datetime(s.expires_at) > datetime('now')`,
      tokenHash,
    );
    return row || null;
  }
}

module.exports = { SqliteSessionRepository };
