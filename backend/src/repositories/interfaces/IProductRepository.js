/**
 * Контракт репозитория товаров
 *
 * @typedef {Object} IProductRepository
 * @property {(id: string) => Promise<Object|null>} findActiveById
 * @property {(id: string) => Promise<Object|null>} findById
 * @property {(ids: string[]) => Promise<Array<Object>>} findActiveByIds
 * @property {(filter?: Object) => Promise<{ items: Array<Object>, total: number }>} listProducts
 * @property {(filter?: Object) => Promise<number>} countProducts
 * @property {(productId: string) => Promise<Array<Object>>} getCategoriesForProduct
 * @property {(product: Object, categoryIds?: string[]) => Promise<Object>} createProduct
 * @property {(id: string, updates?: Object, categoryIds?: string[]) => Promise<Object>} updateProduct
 * @property {(id: string) => Promise<boolean>} deleteProduct
 */

class IProductRepository {}

module.exports = { IProductRepository };
