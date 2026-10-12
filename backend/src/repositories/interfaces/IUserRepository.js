/**
 * Контракт репозитория пользователей
 *
 * @typedef {Object} IUserRepository
 * @property {(id: string) => Promise<Object|null>} findById
 * @property {(email: string) => Promise<Object|null>} findByEmail
 * @property {(id: string) => Promise<boolean>} exists
 * @property {(userData: { id: string, email: string, passwordHash: string, firstName?: string|null, lastName?: string|null, role?: string }) => Promise<Object>} create
 * @property {(id: string, updates: Object) => Promise<Object|null>} update
 */

class IUserRepository {}

module.exports = { IUserRepository };
