const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const initDB = require('../db/db');
const { createApp } = require('../src/app');

async function startTestServer() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'shop-api-'));
  const db = await initDB(path.join(directory, 'test.db'), { seed: true });
  const app = createApp({ db });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const url = `http://127.0.0.1:${server.address().port}`;

  return {
    url,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      await db.close();
      await fs.rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    },
  };
}

test('public API describes real shop scenarios and rejects unauthenticated private access', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const request = (route, options) => fetch(`${server.url}${route}`, options);
  const json = (body) => ({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  // 1. Публичные маршруты: healthcheck, каталог, категории
  const health = await request('/api/health');
  assert.equal(health.status, 200);

  const productsResponse = await request('/api/catalog/products?search=демонстрационный');
  assert.equal(productsResponse.status, 200);
  const products = await productsResponse.json();
  assert.equal(products.total, 1);
  assert.equal(products.items[0].id, 'demo-product');

  const productResponse = await request('/api/catalog/products/demo-product');
  assert.equal(productResponse.status, 200);
  const product = await productResponse.json();
  assert.equal(product.price, 999.99);
  assert.equal(product.categories[0].id, 'demo-category');

  const categoriesResponse = await request('/api/catalog/categories');
  assert.equal(categoriesResponse.status, 200);
  assert.equal((await categoriesResponse.json()).items[0].productCount, 1);

  const categoryProductsResponse = await request('/api/catalog/categories/demo-category/products');
  assert.equal(categoryProductsResponse.status, 200);
  assert.equal((await categoryProductsResponse.json()).items[0].id, 'demo-product');

  // Несуществующие маршруты
  const rawCrudResponse = await request('/api/products');
  assert.equal(rawCrudResponse.status, 404);

  // 2. Проверка защиты приватных маршрутов (Auth Bypass / IDOR дыра закрыта: без авторизации возвращается 401)
  const unauthOrderRes = await request('/api/orders', {
    method: 'POST',
    ...json({
      deliveryAddressId: 'demo-address',
      items: [{ productId: 'demo-product', quantity: 2 }],
    }),
  });
  assert.equal(unauthOrderRes.status, 401, 'POST /api/orders должен требовать авторизацию');

  const unauthGetOrderRes = await request('/api/orders/demo-order');
  assert.equal(unauthGetOrderRes.status, 401, 'GET /api/orders/:id должен требовать авторизацию');

  const unauthUserOrdersRes = await request('/api/users/demo-user/orders');
  assert.equal(unauthUserOrdersRes.status, 401, 'GET /api/users/:id/orders должен требовать авторизацию');

  const unauthCartRes = await request('/api/cart');
  assert.equal(unauthCartRes.status, 401, 'GET /api/cart должен требовать авторизацию');

  const unauthFavouritesRes = await request('/api/users/demo-user/favourites');
  assert.equal(unauthFavouritesRes.status, 401, 'GET /api/users/:id/favourites должен требовать авторизацию');
});
