const { AsyncLocalStorage } = require('node:async_hooks');

class SqliteTransactionManager {
  /**
   * @param {import('sqlite').Database} db
   */
  constructor(db) {
    this.db = db;
    this._queue = Promise.resolve();
    this._storage = new AsyncLocalStorage();
  }

  /**
   * Атомарное выполнение колбэка в транзакции через последовательную очередь
   * с безопасной поддержкой вложенных вызовов
   *
   * @template T
   * @param {(trx: import('sqlite').Database) => Promise<T>} callback
   * @returns {Promise<T>}
   */
  async runInTransaction(callback) {
    // Если уже внутри транзакции в текущем асинхронном контексте — просто выполняем
    if (this._storage.getStore()) {
      return callback(this.db);
    }

    const previousQueue = this._queue;
    let release;
    this._queue = new Promise((resolve) => {
      release = resolve;
    });

    await previousQueue;

    try {
      await this.db.exec('BEGIN IMMEDIATE');
      try {
        const result = await this._storage.run(true, () => callback(this.db));
        await this.db.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          await this.db.exec('ROLLBACK');
        } catch (_rollbackErr) {
          // Игнорируем ошибку отката если соединение уже закрыто
        }
        throw error;
      }
    } finally {
      release();
    }
  }
}

module.exports = { SqliteTransactionManager };
