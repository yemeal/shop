const config = require('./src/config');
const initDB = require('./db/db');
const { createApp } = require('./src/app');

async function startServer(options = {}) {
  const port = Number(options.port ?? config.port);
  const db = await initDB(options.dbFilename ?? config.dbFile, { seed: options.seed });
  const app = createApp({ db, config });
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(port, () => resolve(instance));
    instance.once('error', reject);
  });

  const close = async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await db.close();
  };

  return { app, server, db, close };
}

if (require.main === module) {
  startServer()
    .then((runtime) => {
      const { server } = runtime;
      const address = server.address();
      console.log(`Shop API запущен: http://localhost:${address.port}`);

      let shuttingDown = false;
      const shutdown = async (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`Получен ${signal}, сервер завершает работу`);
        try {
          await runtime.close();
        } catch (error) {
          console.error('Ошибка при завершении сервера', error);
          process.exitCode = 1;
        }
      };

      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    })
    .catch((error) => {
      console.error('Не удалось запустить Shop API', error);
      process.exitCode = 1;
    });
}

module.exports = { startServer };
