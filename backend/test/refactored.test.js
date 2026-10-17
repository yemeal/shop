const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const initDB = require('../db/db');
const { createApp } = require('../src/app');
const {
  IUserRepository,
  IProductRepository,
  ICategoryRepository,
  IOrderRepository,
  IFavouriteRepository,
  ICartRepository,
  ITransactionManager,
  NotImplementedError,
} = require('../src/repositories/interfaces');

async function startTestServer() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'shop-api-refactor-'));
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
      await fs.rm(directory, { recursive: true, force: true });
    },
  };
}

test('Refactored Architecture & Repository Interface Conformance', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const repos = server.app.locals.repositories;

  // проверка соответствия репозиториев контрактам интерфейсов (JSDoc @implements)
  const contracts = {
    userRepository: ['findById', 'findByEmail', 'exists', 'create', 'update'],
    productRepository: ['findById', 'findActiveById', 'findActiveByIds', 'listProducts', 'createProduct', 'updateProduct', 'deleteProduct'],
    categoryRepository: ['findById', 'listCategories', 'countCategories', 'createCategory', 'updateCategory', 'deleteCategory'],
    orderRepository: ['createOrder', 'createOrderItems', 'findOrderById', 'findOrderItems', 'listOrdersByUserId', 'countOrdersByUserId', 'updateOrderStatus'],
    favouriteRepository: ['listFavourites', 'addFavourite', 'removeFavourite', 'isFavourite'],
    cartRepository: ['getCartByUserId', 'addItem', 'updateQuantity', 'removeItem', 'clearCart'],
    transactionManager: ['runInTransaction'],
  };

  for (const [repoName, methods] of Object.entries(contracts)) {
    assert.ok(repos[repoName], `Репозиторий ${repoName} должен быть зарегистрирован`);
    for (const method of methods) {
      assert.equal(typeof repos[repoName][method], 'function', `${repoName} обязан реализовывать метод ${method}`);
    }
  }
});

test('Unit of Work: Service layer wraps atomic repository operations in transaction and rolls back on failure', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const txManager = server.app.locals.repositories.transactionManager;
  const userRepo = server.app.locals.repositories.userRepository;

  await assert.rejects(
    async () => {
      await txManager.runInTransaction(async (trx) => {
        await userRepo.create(
          {
            id: 'rollback-user',
            email: 'rollback@example.com',
            passwordHash: 'dummy',
          },
          trx,
        );
        throw new Error('Simulated business error');
      });
    },
    /Simulated business error/,
  );

  const userAfterRollback = await userRepo.findById('rollback-user');
  assert.equal(userAfterRollback, null, 'Сущность не должна быть сохранена в БД после отката транзакции');
});

test('Standardized Error Responses with Machine-Readable Codes and Details', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const request = (route, options) => fetch(`${server.url}${route}`, options);
  const json = (body) => ({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  // вход под demo-user для авторизованных действий
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    ...json({ email: 'demo@example.com', password: 'demo-password-hash' }),
  });
  const { token } = await loginRes.json();
  const authHeaders = { authorization: `Bearer ${token}` };

  // ошибка валидации при создании заказа
  const invalidOrderRes = await request('/api/orders', {
    method: 'POST',
    headers: { ...authHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      deliveryAddressId: 'demo-address',
      items: [{ productId: 'demo-product', quantity: -2 }],
    }),
  });
  assert.equal(invalidOrderRes.status, 400);
  const validationError = await invalidOrderRes.json();
  assert.equal(validationError.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(validationError.error.details));
  assert.ok(
    validationError.error.details.some(
      (d) => d.field === 'items[0].quantity' && d.code === 'MIN_VALUE',
    ),
  );

  // ошибка ресурса который не найден
  const notFoundRes = await request('/api/catalog/products/non-existent-product');
  assert.equal(notFoundRes.status, 404);
  const notFoundData = await notFoundRes.json();
  assert.equal(notFoundData.error.code, 'RESOURCE_NOT_FOUND');
  assert.ok(notFoundData.error.details?.key?.productId === 'non-existent-product');

  // ошибка несуществующего маршрута
  const routeNotFoundRes = await request('/api/unknown-endpoint');
  assert.equal(routeNotFoundRes.status, 404);
  const routeError = await routeNotFoundRes.json();
  assert.equal(routeError.error.code, 'ROUTE_NOT_FOUND');
});

test('Auth, Session Cookies, and Role-Based Access Control', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const request = (route, options) => fetch(`${server.url}${route}`, options);
  const json = (body) => ({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  // регистрация нового пользователя
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    ...json({
      email: 'newuser@example.com',
      password: 'secretPassword123',
      firstName: 'Ivan',
      lastName: 'Petrov',
    }),
  });
  assert.equal(regRes.status, 201);
  const regData = await regRes.json();
  assert.ok(regData.token);
  assert.equal(regData.user.email, 'newuser@example.com');
  assert.equal(regData.user.role, 'user');
  assert.equal(regData.user.passwordHash, undefined); // проверка отсутствия password_hash в ответе

  // обращение к профилю с bearer токеном
  const meRes = await request('/api/auth/me', {
    headers: { authorization: `Bearer ${regData.token}` },
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.user.email, 'newuser@example.com');

  // попытка создания товара без прав администратора
  const createProductForbidden = await request('/api/catalog/products', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${regData.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sku: 'TEST-SKU',
      name: 'Forbidden Item',
      price: 100,
    }),
  });
  assert.equal(createProductForbidden.status, 403);
  const forbiddenError = await createProductForbidden.json();
  assert.equal(forbiddenError.error.code, 'FORBIDDEN');

  // вход администратора и создание товара
  const adminLoginRes = await request('/api/auth/login', {
    method: 'POST',
    ...json({
      email: 'admin@example.com',
      password: 'demo-admin-password-hash',
    }),
  });
  assert.equal(adminLoginRes.status, 200);
  const adminData = await adminLoginRes.json();

  const createProductAdmin = await request('/api/catalog/products', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${adminData.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sku: 'ADMIN-PRODUCT-001',
      name: 'Admin Created Product',
      price: 499.5,
    }),
  });
  assert.equal(createProductAdmin.status, 201);
  const createdProduct = await createProductAdmin.json();
  assert.equal(createdProduct.name, 'Admin Created Product');
});

test('Cart Management & Checkout Flow', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const request = (route, options) => fetch(`${server.url}${route}`, options);
  const json = (body) => ({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  // вход под demo-user для работы с корзиной
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    ...json({ email: 'demo@example.com', password: 'demo-password-hash' }),
  });
  const { token } = await loginRes.json();
  const authHeaders = { authorization: `Bearer ${token}` };

  // получение начального состояния корзины
  const cartRes = await request('/api/cart', {
    headers: authHeaders,
  });
  assert.equal(cartRes.status, 200);
  const initialCart = await cartRes.json();
  assert.ok(Array.isArray(initialCart.items));

  // добавление товара в корзину
  const addCartRes = await request('/api/cart/items', {
    method: 'POST',
    headers: { ...authHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      productId: 'demo-product',
      quantity: 2,
    }),
  });
  assert.equal(addCartRes.status, 201);
  const updatedCart = await addCartRes.json();
  assert.ok(updatedCart.total > 0);

  // оформление заказа из корзины
  const checkoutRes = await request('/api/cart/checkout', {
    method: 'POST',
    headers: { ...authHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      deliveryAddressId: 'demo-address',
    }),
  });
  assert.equal(checkoutRes.status, 201);
  const order = await checkoutRes.json();
  assert.equal(order.status, 'pending');
  assert.ok(order.items.length >= 1);

  // проверка очистки корзины после заказа
  const emptyCartRes = await request('/api/cart', {
    headers: authHeaders,
  });
  const emptyCart = await emptyCartRes.json();
  assert.equal(emptyCart.items.length, 0);
  assert.equal(emptyCart.total, 0);
});
