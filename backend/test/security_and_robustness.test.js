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

function getCookieHeader(response) {
  const cookieHeaders = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return { cookie: cookieHeaders.map((c) => c.split(';')[0]).join('; ') };
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
  const aliceCookies = getCookieHeader(regAlice);
  const alice = await regAlice.json();
  assert.deepEqual(Object.keys(alice), ['user'], 'Registration must return ONLY user');

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
  const bobCookies = getCookieHeader(regBob);
  const bob = await regBob.json();
  assert.deepEqual(Object.keys(bob), ['user'], 'Registration must return ONLY user');

  // проверка хеширования пароля через scrypt
  const userARow = await server.db.get('SELECT password_hash FROM users WHERE id = ?', alice.user.id);
  assert.ok(
    userARow.password_hash.startsWith('scrypt:'),
    'Passwords must be hashed using scrypt with unique salt',
  );

  // попытка просмотра чужих заказов
  const aliceViewsBobOrders = await request(`/api/users/${bob.user.id}/orders`, {
    headers: aliceCookies,
  });
  assert.equal(aliceViewsBobOrders.status, 403);
  const ordersError = await aliceViewsBobOrders.json();
  assert.equal(ordersError.error.code, 'FORBIDDEN');

  // попытка изменения чужого избранного
  const aliceAddsBobFavourite = await request(`/api/users/${bob.user.id}/favourites`, {
    method: 'POST',
    headers: {
      ...aliceCookies,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ productId: 'demo-product' }),
  });
  assert.equal(aliceAddsBobFavourite.status, 403);

  // попытка доступа к чужой корзине через query
  const aliceAccessesBobCart = await request(`/api/cart?userId=${bob.user.id}`, {
    headers: aliceCookies,
  });
  assert.equal(aliceAccessesBobCart.status, 403);

  // создание категории обычным пользователем
  const invalidCategory = await request('/api/catalog/categories', {
    method: 'POST',
    headers: {
      ...aliceCookies, // куки пользователя без прав администратора
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
  const adminCookies = getCookieHeader(adminLogin);
  const admin = await adminLogin.json();
  assert.deepEqual(Object.keys(admin), ['user'], 'Login must return ONLY user');

  const emptyCategory = await request('/api/catalog/categories', {
    method: 'POST',
    headers: {
      ...adminCookies,
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  assert.equal(emptyCategory.status, 400);
  const catError = await emptyCategory.json();
  assert.equal(catError.error.code, 'VALIDATION_ERROR');

  // проверка доступа к общему списку заказов магазина (только для роли admin)
  const unauthOrders = await request('/api/orders');
  assert.equal(unauthOrders.status, 401);

  const aliceOrders = await request('/api/orders', { headers: aliceCookies });
  assert.equal(aliceOrders.status, 403);
  const forbiddenError = await aliceOrders.json();
  assert.equal(forbiddenError.error.code, 'FORBIDDEN');

  const adminOrders = await request('/api/orders', { headers: adminCookies });
  assert.equal(adminOrders.status, 200);
  const adminOrdersData = await adminOrders.json();
  assert.ok(Array.isArray(adminOrdersData.items));
  assert.ok(adminOrdersData.total >= 1);

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
