/**
 * Контракт репозитория корзины
 *
 * @typedef {Object} ICartRepository
 * @property {(userId: string) => Promise<Array<Object>>} getCartByUserId
 * @property {(userId: string, productId: string, quantity?: number) => Promise<Object>} addItem
 * @property {(userId: string, productId: string, quantity: number) => Promise<Object|null>} updateQuantity
 * @property {(userId: string, productId: string) => Promise<boolean>} removeItem
 * @property {(userId: string, trx?: Object) => Promise<void>} clearCart
 */

class ICartRepository {}

module.exports = { ICartRepository };
