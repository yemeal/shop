/**
 * Контракт менеджера транзакций (Unit of Work)
 *
 * @typedef {Object} ITransactionManager
 * @property {<T>(callback: (trx: any) => Promise<T>) => Promise<T>} runInTransaction
 */

class ITransactionManager {}

module.exports = { ITransactionManager };
