const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const initDB = require('../db/db');
const { createApp } = require('../src/app');

async function startTestServer() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'shop-sec-test-'));
  const db = await initDB(path.join(directory, 'test.db'), { seed: true });
  const app = createApp({ db });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const url = `http://127.0.0.1:${server.address().port}`;

  return {
    url,
    app,
    db,
    async close() {
      await new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
      await db.close();
      await fs.rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    },
  };
}

test('Security & IDOR Protections: Users cannot access or tamper with other users resources', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const request = (route, options) => fetch(`${server.url}${route}`, options);
  const json = (body) => ({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  // регистрация пользователя а
  const regAlice = await request('/api/auth/register', {
    method: 'POST',
    ...json({
      email: 'alice@example.com',
      password: 'passwordAlice123',
      firstName: 'Alice',
    }),
  });
  assert.equal(regAlice.status, 201);
  const alice = await regAlice.json();
  const aliceToken = alice.accessToken;

  // регистрация пользователя б
  const regBob = await request('/api/auth/register', {
    method: 'POST',
    ...json({
      email: 'bob@example.com',
      password: 'passwordBob123',
      firstName: 'Bob',
    }),
  });
  assert.equal(regBob.status, 201);
  const bob = await regBob.json();
  const bobToken = bob.accessToken;

  // проверка хеширования пароля через scrypt
  const userARow = await server.db.get('SELECT password_hash FROM users WHERE id = ?', alice.user.id);
  assert.ok(
    userARow.password_hash.startsWith('scrypt:'),
    'Passwords must be hashed using scrypt with unique salt',
  );

  // попытка просмотра чужих заказов
  const aliceViewsBobOrders = await request(`/api/users/${bob.user.id}/orders`, {
    headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(aliceViewsBobOrders.status, 403);
  const ordersError = await aliceViewsBobOrders.json();
  assert.equal(ordersError.error.code, 'FORBIDDEN');

  // попытка изменения чужого избранного
  const aliceAddsBobFavourite = await request(`/api/users/${bob.user.id}/favourites`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${aliceToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ productId: 'demo-product' }),
  });
  assert.equal(aliceAddsBobFavourite.status, 403);

  // попытка доступа к чужой корзине через query
  const aliceAccessesBobCart = await request(`/api/cart?userId=${bob.user.id}`, {
    headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(aliceAccessesBobCart.status, 403);

  // создание категории обычным пользователем
  const invalidCategory = await request('/api/catalog/categories', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${aliceToken}`, // токен пользователя без прав администратора
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  assert.equal(invalidCategory.status, 403);

  // вход под учетной записью администратора
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    ...json({ email: 'admin@example.com', password: 'demo-admin-password-hash' }),
  });
  const admin = await adminLogin.json();

  const emptyCategory = await request('/api/catalog/categories', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${admin.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  assert.equal(emptyCategory.status, 400);
  const catError = await emptyCategory.json();
  assert.equal(catError.error.code, 'VALIDATION_ERROR');

  // параллельное выполнение транзакций через очередь
  const txManager = server.app.locals.repositories.transactionManager;
  const results = await Promise.all([
    txManager.runInTransaction(async (trx) => {
      await trx.get('SELECT 1');
      return 'tx1';
    }),
    txManager.runInTransaction(async (trx) => {
      await trx.get('SELECT 2');
      return 'tx2';
    }),
    txManager.runInTransaction(async (trx) => {
      await trx.get('SELECT 3');
      return 'tx3';
    }),
  ]);
  assert.deepEqual(results, ['tx1', 'tx2', 'tx3']);
});
