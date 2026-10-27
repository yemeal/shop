const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const defaultConfig = require('./config');
const openapiDocument = require('../docs/openapi');
const { createApiRouter } = require('./routes/api');
const { ApiError, asyncHandler, ErrorCodes } = require('./errors');
const { errorMiddleware } = require('./middlewares');
const { createRepositories } = require('./repositories');
const { createServices } = require('./services');

function createApp({ db, config = defaultConfig }) {
  if (!db) {
    throw new Error('Для создания приложения требуется подключение к базе данных');
  }

  const app = express();

  // базовые заголовки безопасности
  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // безопасная настройка cors
  const allowedOrigins = config.cors.allowedOrigins;

  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) => {
        // разрешение запросов без origin, при разрешении всех хостов (*) и из белого списка
        if (
          !origin ||
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin) ||
          config.nodeEnv === 'test'
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
    }),
  );

  app.get('/', (_request, response) => {
    response.json({
      name: 'shop-api',
      status: 'ok',
      api: '/api',
    });
  });

  app.get('/openapi.json', (_request, response) => {
    response.json(openapiDocument);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.get(
    '/api/health',
    asyncHandler(async (_request, response) => {
      await db.get('SELECT 1 AS ok');
      response.json({ status: 'ok', database: 'ok' });
    }),
  );

  const repositories = createRepositories(db);
  const services = createServices(repositories, config);

  // доступ к сервисам и репозиториям для тестов
  app.locals.repositories = repositories;
  app.locals.services = services;

  app.use('/api', createApiRouter(services));

  app.use((_request, _response, next) => {
    next(new ApiError(404, 'Маршрут не найден', ErrorCodes.ROUTE_NOT_FOUND));
  });
  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
