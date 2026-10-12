/**
 * Контракт репозитория сессий и токенов
 *
 * @typedef {Object} ISessionRepository
 * @property {(params: { sessionId: string, userId: string, deviceInfo?: string, ipAddress?: string|null, idleExpiresAt: string, tokenId: string, tokenHash: string, tokenExpiresAt: string }) => Promise<Object>} createAuthSession
 * @property {(tokenHash: string) => Promise<Object|null>} findRefreshTokenWithSession
 * @property {(params: { sessionId: string, currentTokenId: string, newTokenId: string, newTokenHash: string, newExpiresAt: string, newIdleExpiresAt: string }) => Promise<void>} rotateRefreshToken
 * @property {(sessionId: string) => Promise<boolean>} revokeSession
 * @property {(userId: string) => Promise<void>} revokeAllUserSessions
 * @property {(userId: string) => Promise<Array<Object>>} listUserSessions
 * @property {(params: Object) => Promise<Object>} createSession
 * @property {(tokenHash: string) => Promise<Object|null>} findValidSession
 */

class ISessionRepository {}

module.exports = { ISessionRepository };
