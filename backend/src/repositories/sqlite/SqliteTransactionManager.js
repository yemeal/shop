const { AsyncLocalStorage } = require('node:async_hooks');
const { ITransactionManager } = require('../interfaces/ITransactionManager');

class SqliteTransactionManager extends ITransactionManager {
  /**
   * @param {import('sqlite').Database} db
   */
  constructor(db) {
    super();
    this.db = db;
    this._queue = Promise.resolve();
    this._storage = new AsyncLocalStorage();
  }

  /**
   * Текущий активный контекст транзакции (если есть)
   * @returns {import('sqlite').Database|null}
   */
  getActiveTransaction() {
    return this._storage.getStore() || null;
  }

  /**
   * Выполнение колбэка в транзакции (Unit of Work) с поддержкой вложенности (Savepoint) и очереди
   *
   * @template T
   * @param {(trx: import('sqlite').Database) => Promise<T>} callback
   * @returns {Promise<T>}
   */
  async runInTransaction(callback) {
    const activeTrx = this.getActiveTransaction();

    // Если транзакция уже открыта в текущем асинхронном контексте — используем SAVEPOINT
    if (activeTrx) {
      const savepoint = `sp_${Math.random().toString(36).substring(2, 9)}`;
      await this.db.exec(`SAVEPOINT ${savepoint}`);
      try {
        const result = await callback(activeTrx);
        await this.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
        return result;
      } catch (error) {
        try {
          await this.db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        } catch (rollbackErr) {
          console.error('Error rolling back savepoint:', rollbackErr);
        }
        throw error;
      }
    }

    // Иначе запускаем новую корневую транзакцию через очередь сериализации
    const previousQueue = this._queue;
    let release;
    this._queue = new Promise((resolve) => {
      release = resolve;
    });

    await previousQueue;

    try {
      await this.db.exec('BEGIN IMMEDIATE');
      try {
        const result = await this._storage.run(this.db, () => callback(this.db));
        await this.db.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          await this.db.exec('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during transaction rollback:', rollbackError);
        }
        throw error;
      }
    } finally {
      release();
    }
  }
}

module.exports = { SqliteTransactionManager };
