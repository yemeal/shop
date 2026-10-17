const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const initDB = require('../db/db');
const { createApp } = require('../src/app');

async function startTestServer() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'shop-auth-test-'));
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

function parseCookies(response) {
  const cookieHeaders = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);

  const cookies = {};
  for (const str of cookieHeaders) {
    const [part] = str.split(';');
    const [k, v] = part.split('=');
    if (k && v) cookies[k.trim()] = v.trim();
  }
  return cookies;
}

test('RS256 JWT Access Token and Opaque Refresh Token with TokenFamily Rotation', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const request = (route, options) => fetch(`${server.url}${route}`, options);
  const json = (body) => ({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  // регистрация пользователя
  const registerRes = await request('/api/auth/register', {
    method: 'POST',
    ...json({
      email: 'device1@example.com',
      password: 'password123',
      firstName: 'Alice',
    }),
  });
  assert.equal(registerRes.status, 201);
  const registerCookies = parseCookies(registerRes);
  const regBody = await registerRes.json();

  assert.ok(regBody.accessToken, 'Must return RS256 access JWT');
  assert.ok(regBody.refreshToken, 'Must return opaque refresh token');
  assert.ok(regBody.sessionId, 'Must return sessionId representing the device token family');

  // проверка структуры jwt и алгоритма rs256
  const parts = regBody.accessToken.split('.');
  assert.equal(parts.length, 3);
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  assert.equal(header.alg, 'RS256');
  assert.equal(header.typ, 'at+jwt');

  // проверка установки кук
  assert.ok(registerCookies.access_token);
  assert.ok(registerCookies.refresh_token);

  // ротация токена через /api/auth/refresh
  const refreshRes = await request('/api/auth/refresh', {
    method: 'POST',
    headers: {
      cookie: `refresh_token=${regBody.refreshToken}`,
      'content-type': 'application/json',
    },
  });
  assert.equal(refreshRes.status, 200);
  const refreshBody = await refreshRes.json();
  const refreshedCookies = parseCookies(refreshRes);

  assert.ok(refreshBody.accessToken);
  assert.ok(refreshBody.refreshToken);
  assert.notEqual(refreshBody.refreshToken, regBody.refreshToken, 'Refresh token must rotate to a new random string');
  assert.ok(refreshedCookies.access_token);
  assert.ok(refreshedCookies.refresh_token);

  // повторное использование старого refresh-токена
  const reuseRes = await request('/api/auth/refresh', {
    method: 'POST',
    headers: {
      cookie: `refresh_token=${regBody.refreshToken}`,
      'content-type': 'application/json',
    },
  });
  assert.equal(reuseRes.status, 401);
  const reuseError = await reuseRes.json();
  assert.equal(reuseError.error.code, 'REFRESH_TOKEN_REUSE_DETECTED');

  // проверка аннулирования всей цепочки tokenfamily
  const revokedRes = await request('/api/auth/refresh', {
    method: 'POST',
    headers: {
      cookie: `refresh_token=${refreshBody.refreshToken}`,
      'content-type': 'application/json',
    },
  });
  assert.equal(revokedRes.status, 401);
  const revokedError = await revokedRes.json();
  assert.equal(revokedError.error.code, 'SESSION_REVOKED');
});

test('Automatic Transparent Access Refresh when Access Token is Expired', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const authService = server.app.locals.services.authService;

  // вход под demo-user
  const loginRes = await fetch(`${server.url}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@example.com',
      password: 'demo-password-hash',
    }),
  });
  assert.equal(loginRes.status, 200);
  const loginData = await loginRes.json();

  // выпуск просроченного access-токена
  const expiredAccessToken = authService.issuer.issue(
    { userId: loginData.user.id, role: loginData.user.role },
    -10, // просрочен на 10 секунд
  );

  // запрос с просроченным access-токеном и валидным refresh-токеном
  const autoRefreshRes = await fetch(`${server.url}/api/auth/me`, {
    headers: {
      cookie: `access_token=${expiredAccessToken}; refresh_token=${loginData.refreshToken}`,
    },
  });

  // проверка прозрачного обновления токенов через middleware
  assert.equal(autoRefreshRes.status, 200);
  const meData = await autoRefreshRes.json();
  assert.equal(meData.user.email, 'demo@example.com');

  // проверка новых токенов в куках ответа
  const cookies = parseCookies(autoRefreshRes);
  assert.ok(cookies.access_token);
  assert.ok(cookies.refresh_token);
  assert.notEqual(cookies.refresh_token, loginData.refreshToken, 'Refresh token must be rotated');
});

test('Multi-Device Token Family Independence', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const request = (route, options) => fetch(`${server.url}${route}`, options);
  const json = (body) => ({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  // устройство а
  const deviceARes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'user-agent': 'Mobile-iPhone', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@example.com', password: 'demo-password-hash' }),
  });
  const deviceA = await deviceARes.json();

  // устройство б
  const deviceBRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'user-agent': 'Desktop-Chrome', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@example.com', password: 'demo-password-hash' }),
  });
  const deviceB = await deviceBRes.json();

  assert.notEqual(deviceA.sessionId, deviceB.sessionId, 'Each device must receive its own session and TokenFamily');

  // выход с устройства а
  const logoutARes = await request('/api/auth/logout', {
    method: 'POST',
    headers: {
      cookie: `refresh_token=${deviceA.refreshToken}`,
      authorization: `Bearer ${deviceA.accessToken}`,
    },
  });
  assert.equal(logoutARes.status, 200);

  // проверка отклонения обновления для устройства а
  const refreshARes = await request('/api/auth/refresh', {
    method: 'POST',
    headers: { cookie: `refresh_token=${deviceA.refreshToken}` },
  });
  assert.equal(refreshARes.status, 401);

  // проверка работоспособности сессии устройства б
  const meBRes = await request('/api/auth/me', {
    headers: { authorization: `Bearer ${deviceB.accessToken}` },
  });
  assert.equal(meBRes.status, 200);
});
