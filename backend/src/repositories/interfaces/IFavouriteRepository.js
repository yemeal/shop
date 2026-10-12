/**
 * Контракт репозитория избранного
 *
 * @typedef {Object} IFavouriteRepository
 * @property {(userId: string) => Promise<Array<Object>>} listFavourites
 * @property {(userId: string, productId: string) => Promise<{ created: boolean }>} addFavourite
 * @property {(userId: string, productId: string) => Promise<boolean>} removeFavourite
 * @property {(userId: string, productId: string) => Promise<boolean>} isFavourite
 */

class IFavouriteRepository {}

module.exports = { IFavouriteRepository };
