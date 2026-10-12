/**
 * Контракт репозитория категорий
 *
 * @typedef {Object} ICategoryRepository
 * @property {(id: string) => Promise<Object|null>} findById
 * @property {(pagination?: { limit?: number, offset?: number }) => Promise<Array<Object>>} listCategories
 * @property {() => Promise<number>} countCategories
 * @property {(category: { id: string, parentId?: string|null, name: string }) => Promise<Object>} createCategory
 * @property {(id: string, updates?: Object) => Promise<Object>} updateCategory
 * @property {(id: string) => Promise<boolean>} deleteCategory
 */

class ICategoryRepository {}

module.exports = { ICategoryRepository };
