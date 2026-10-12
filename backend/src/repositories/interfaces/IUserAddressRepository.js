/**
 * Контракт репозитория адресов доставки
 *
 * @typedef {Object} IUserAddressRepository
 * @property {(id: string) => Promise<Object|null>} findById
 * @property {(id: string, userId: string) => Promise<Object|null>} findByIdAndUserId
 * @property {(userId: string) => Promise<Array<Object>>} listByUserId
 * @property {(address: { id: string, userId: string, country: string, city: string, street: string, house: string, apartment?: string|null }) => Promise<Object>} createAddress
 */

class IUserAddressRepository {}

module.exports = { IUserAddressRepository };
