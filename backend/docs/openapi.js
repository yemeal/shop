const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema, description) => ({
  description,
  content: { 'application/json': { schema: typeof schema === 'string' ? ref(schema) : schema } },
});

const errorResponses = {
  '400': json('Error', 'Некорректные данные или ошибка валидации'),
  '401': json('Error', 'Требуется авторизация'),
  '403': json('Error', 'Доступ запрещен'),
  '404': json('Error', 'Ресурс не найден'),
  '409': json('Error', 'Конфликт или нарушение ограничения базы данных'),
  '500': json('Error', 'Внутренняя ошибка сервера'),
};

const paginationParameters = [
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
  { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
];

const paginationSchema = (itemSchema) => ({
  type: 'object',
  required: ['items', 'total', 'limit', 'offset'],
  properties: {
    items: { type: 'array', items: ref(itemSchema) },
    total: { type: 'integer' },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
  },
});

const pathParameter = (name) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
});

const paths = {
  '/health': {
    get: {
      tags: ['System'],
      summary: 'Проверка API и подключения к SQLite',
      responses: {
        '200': json({
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            database: { type: 'string', example: 'ok' },
          },
        }, 'Сервис доступен'),
      },
    },
  },

  // аутентификация
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Регистрация нового пользователя',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email', example: 'user@example.com' },
                password: { type: 'string', minLength: 4, example: 'secret123' },
                firstName: { type: 'string', example: 'Иван' },
                lastName: { type: 'string', example: 'Иванов' },
              },
            },
          },
        },
      },
      responses: {
        '201': json('AuthResponse', 'Успешная регистрация'),
        '400': errorResponses['400'],
        '409': errorResponses['409'],
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Авторизация пользователя (получение сессии и куки)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', example: 'demo@example.com' },
                password: { type: 'string', example: 'demo-password-hash' },
              },
            },
          },
        },
      },
      responses: {
        '200': json('AuthResponse', 'Успешный вход'),
        '400': errorResponses['400'],
        '401': errorResponses['401'],
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Завершение текущей сессии',
      responses: {
        '200': json({ type: 'object', properties: { message: { type: 'string' } } }, 'Сессия завершена'),
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Получить данные текущего пользователя',
      security: [{ BearerAuth: [] }, { CookieAuth: [] }],
      responses: {
        '200': json({ type: 'object', properties: { user: ref('User') } }, 'Профиль пользователя'),
        '401': errorResponses['401'],
      },
    },
  },

  // каталог
  '/catalog/products': {
    get: {
      tags: ['Catalog'],
      summary: 'Каталог активных товаров с фильтрацией, поиском и сортировкой',
      parameters: [
        { name: 'search', in: 'query', description: 'Поиск по названию или артикулу', schema: { type: 'string' } },
        { name: 'categoryId', in: 'query', schema: { type: 'string' } },
        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['created_at', 'price', 'name'], default: 'created_at' } },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ...paginationParameters,
      ],
      responses: {
        '200': json(paginationSchema('Product'), 'Список товаров'),
        '400': errorResponses['400'],
      },
    },
    post: {
      tags: ['Admin Catalog'],
      summary: 'Создание товара (требуется роль admin)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('ProductCreate') } },
      },
      responses: {
        '201': json('ProductDetails', 'Товар создан'),
        '400': errorResponses['400'],
        '401': errorResponses['401'],
        '403': errorResponses['403'],
      },
    },
  },
  '/catalog/products/{productId}': {
    get: {
      tags: ['Catalog'],
      summary: 'Карточка товара',
      parameters: [pathParameter('productId')],
      responses: {
        '200': json('ProductDetails', 'Товар найден'),
        '404': errorResponses['404'],
      },
    },
    patch: {
      tags: ['Admin Catalog'],
      summary: 'Обновление товара (требуется роль admin)',
      parameters: [pathParameter('productId')],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('ProductUpdate') } },
      },
      responses: {
        '200': json('ProductDetails', 'Товар обновлен'),
        '400': errorResponses['400'],
        '401': errorResponses['401'],
        '403': errorResponses['403'],
        '404': errorResponses['404'],
      },
    },
    delete: {
      tags: ['Admin Catalog'],
      summary: 'Удаление товара (требуется роль admin)',
      parameters: [pathParameter('productId')],
      security: [{ BearerAuth: [] }],
      responses: {
        '204': { description: 'Товар удален' },
        '401': errorResponses['401'],
        '403': errorResponses['403'],
        '404': errorResponses['404'],
      },
    },
  },
  '/catalog/categories': {
    get: {
      tags: ['Catalog'],
      summary: 'Категории каталога',
      parameters: paginationParameters,
      responses: {
        '200': json(paginationSchema('Category'), 'Список категорий'),
        '400': errorResponses['400'],
      },
    },
  },
  '/catalog/categories/{categoryId}/products': {
    get: {
      tags: ['Catalog'],
      summary: 'Товары выбранной категории',
      parameters: [pathParameter('categoryId'), ...paginationParameters],
      responses: {
        '200': json({
          type: 'object',
          properties: {
            items: { type: 'array', items: ref('Product') },
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' },
          },
        }, 'Категория и её товары'),
        '400': errorResponses['400'],
        '404': errorResponses['404'],
      },
    },
  },

  // корзина
  '/cart': {
    get: {
      tags: ['Cart'],
      summary: 'Получить текущую корзину',
      parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': json('Cart', 'Содержимое корзины'),
        '401': errorResponses['401'],
      },
    },
    delete: {
      tags: ['Cart'],
      summary: 'Очистить корзину',
      parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': json('Cart', 'Корзина очищена'),
      },
    },
  },
  '/cart/items': {
    post: {
      tags: ['Cart'],
      summary: 'Добавить товар в корзину',
      parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['productId'],
              properties: {
                productId: { type: 'string', example: 'demo-product' },
                quantity: { type: 'integer', minimum: 1, default: 1 },
              },
            },
          },
        },
      },
      responses: {
        '201': json('Cart', 'Товар добавлен в корзину'),
        '400': errorResponses['400'],
        '404': errorResponses['404'],
      },
    },
  },
  '/cart/items/{productId}': {
    patch: {
      tags: ['Cart'],
      summary: 'Изменить количество товара в корзине',
      parameters: [pathParameter('productId'), { name: 'userId', in: 'query', schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['quantity'],
              properties: { quantity: { type: 'integer', minimum: 1 } },
            },
          },
        },
      },
      responses: {
        '200': json('Cart', 'Количество обновлено'),
        '400': errorResponses['400'],
      },
    },
    delete: {
      tags: ['Cart'],
      summary: 'Удалить товар из корзины',
      parameters: [pathParameter('productId'), { name: 'userId', in: 'query', schema: { type: 'string' } }],
      responses: {
        '200': json('Cart', 'Товар удален из корзины'),
      },
    },
  },
  '/cart/checkout': {
    post: {
      tags: ['Cart'],
      summary: 'Оформить заказ из корзины',
      parameters: [{ name: 'userId', in: 'query', schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['deliveryAddressId'],
              properties: { deliveryAddressId: { type: 'string', example: 'demo-address' } },
            },
          },
        },
      },
      responses: {
        '201': json('Order', 'Заказ успешно оформлен'),
        '400': errorResponses['400'],
      },
    },
  },

  // заказы
  '/orders': {
    get: {
      tags: ['Admin Orders'],
      summary: 'Список всех заказов магазина (только для роли admin)',
      parameters: [
        ...paginationParameters,
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'],
          },
          description: 'Фильтрация по статусу заказа',
        },
      ],
      security: [{ BearerAuth: [] }, { CookieAuth: [] }],
      responses: {
        '200': json(paginationSchema('OrderSummary'), 'Список всех заказов магазина'),
        '401': errorResponses['401'],
        '403': errorResponses['403'],
      },
    },
    post: {
      tags: ['Orders'],
      summary: 'Оформить заказ напрямую',
      description: 'Цена каждой позиции берётся из каталога на момент оформления заказа.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: ref('OrderCreate') } },
      },
      responses: {
        '201': json('Order', 'Заказ создан'),
        '400': errorResponses['400'],
        '404': errorResponses['404'],
        '409': errorResponses['409'],
      },
    },
  },
  '/orders/{orderId}': {
    get: {
      tags: ['Orders'],
      summary: 'Детали заказа',
      parameters: [pathParameter('orderId')],
      responses: {
        '200': json('Order', 'Заказ найден'),
        '404': errorResponses['404'],
      },
    },
  },
  '/orders/{orderId}/status': {
    patch: {
      tags: ['Admin Orders'],
      summary: 'Обновление статуса заказа (требуется роль admin)',
      parameters: [pathParameter('orderId')],
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'],
                },
              },
            },
          },
        },
      },
      responses: {
        '200': json('Order', 'Статус заказа обновлен'),
        '400': errorResponses['400'],
        '401': errorResponses['401'],
        '403': errorResponses['403'],
        '404': errorResponses['404'],
      },
    },
  },
  '/users/{userId}/orders': {
    get: {
      tags: ['Orders'],
      summary: 'История заказов пользователя',
      parameters: [pathParameter('userId'), ...paginationParameters],
      responses: {
        '200': json(paginationSchema('OrderSummary'), 'История заказов'),
        '400': errorResponses['400'],
        '404': errorResponses['404'],
      },
    },
  },

  // избранное
  '/users/{userId}/favourites': {
    get: {
      tags: ['Favourites'],
      summary: 'Избранные товары пользователя',
      parameters: [pathParameter('userId')],
      responses: {
        '200': json({
          type: 'object',
          properties: { items: { type: 'array', items: ref('Product') } },
        }, 'Список избранного'),
        '404': errorResponses['404'],
      },
    },
    post: {
      tags: ['Favourites'],
      summary: 'Добавить товар в избранное',
      parameters: [pathParameter('userId')],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['productId'],
              properties: { productId: { type: 'string', example: 'demo-product' } },
            },
          },
        },
      },
      responses: {
        '201': json('Product', 'Товар добавлен в избранное'),
        '200': json('Product', 'Товар уже был в избранном'),
        '404': errorResponses['404'],
      },
    },
  },
  '/users/{userId}/favourites/{productId}': {
    delete: {
      tags: ['Favourites'],
      summary: 'Удалить товар из избранного',
      parameters: [pathParameter('userId'), pathParameter('productId')],
      responses: {
        '204': { description: 'Товар удалён из избранного' },
        '404': errorResponses['404'],
      },
    },
  },

  // адреса доставки
  '/users/{userId}/addresses': {
    get: {
      tags: ['Addresses'],
      summary: 'Список адресов доставки пользователя',
      parameters: [pathParameter('userId')],
      responses: {
        '200': json({
          type: 'object',
          properties: { items: { type: 'array', items: ref('Address') } },
        }, 'Список адресов доставки'),
        '400': errorResponses['400'],
        '401': errorResponses['401'],
        '403': errorResponses['403'],
        '404': errorResponses['404'],
      },
    },
    post: {
      tags: ['Addresses'],
      summary: 'Добавить новый адрес доставки',
      parameters: [pathParameter('userId')],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: ref('AddressCreate'),
          },
        },
      },
      responses: {
        '201': json('Address', 'Адрес успешно добавлен'),
        '400': errorResponses['400'],
        '401': errorResponses['401'],
        '403': errorResponses['403'],
        '404': errorResponses['404'],
      },
    },
  },
  '/users/{userId}/addresses/{addressId}': {
    delete: {
      tags: ['Addresses'],
      summary: 'Удалить адрес доставки',
      parameters: [pathParameter('userId'), pathParameter('addressId')],
      responses: {
        '204': { description: 'Адрес успешно удалён' },
        '400': errorResponses['400'],
        '401': errorResponses['401'],
        '403': errorResponses['403'],
        '404': errorResponses['404'],
        '409': errorResponses['409'],
      },
    },
  },
};

const schemas = {
  Error: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Ошибка валидации входящих данных' },
          details: { type: 'object', additionalProperties: true },
        },
        required: ['code', 'message'],
      },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'demo-user' },
      email: { type: 'string', example: 'demo@example.com' },
      firstName: { type: 'string', nullable: true },
      lastName: { type: 'string', nullable: true },
      role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
      createdAt: { type: 'string' },
    },
  },
  AuthResponse: {
    type: 'object',
    required: ['user'],
    properties: {
      user: ref('User'),
    },
  },
  Product: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'demo-product' },
      sku: { type: 'string', example: 'DEMO-001' },
      name: { type: 'string', example: 'Демонстрационный товар' },
      description: { type: 'string', nullable: true },
      price: { type: 'number', format: 'float', minimum: 0 },
      isActive: { type: 'boolean' },
      imageUrl: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  },
  ProductDetails: {
    allOf: [
      ref('Product'),
      {
        type: 'object',
        properties: {
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, name: { type: 'string' } },
            },
          },
        },
      },
    ],
  },
  ProductCreate: {
    type: 'object',
    required: ['sku', 'name', 'price'],
    properties: {
      sku: { type: 'string', example: 'PROD-100' },
      name: { type: 'string', example: 'Новый товар' },
      description: { type: 'string', nullable: true },
      price: { type: 'number', minimum: 0, example: 1499.0 },
      isActive: { type: 'boolean', default: true },
      imageUrl: { type: 'string', nullable: true },
      categoryIds: { type: 'array', items: { type: 'string' } },
    },
  },
  ProductUpdate: {
    type: 'object',
    properties: {
      sku: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string', nullable: true },
      price: { type: 'number', minimum: 0 },
      isActive: { type: 'boolean' },
      imageUrl: { type: 'string', nullable: true },
      categoryIds: { type: 'array', items: { type: 'string' } },
    },
  },
  Category: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      parentId: { type: 'string', nullable: true },
      name: { type: 'string' },
      productCount: { type: 'integer' },
      createdAt: { type: 'string' },
    },
  },
  CartItem: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      productId: { type: 'string' },
      sku: { type: 'string' },
      name: { type: 'string' },
      price: { type: 'number' },
      quantity: { type: 'integer' },
      lineTotal: { type: 'number' },
      imageUrl: { type: 'string', nullable: true },
      createdAt: { type: 'string' },
    },
  },
  Cart: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ref('CartItem') },
      total: { type: 'number' },
      itemsCount: { type: 'integer' },
    },
  },
  OrderCreate: {
    type: 'object',
    required: ['userId', 'deliveryAddressId', 'items'],
    properties: {
      userId: { type: 'string', example: 'demo-user' },
      deliveryAddressId: { type: 'string', example: 'demo-address' },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', example: 'demo-product' },
            quantity: { type: 'integer', minimum: 1, example: 1 },
          },
        },
      },
    },
  },
  OrderItem: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      productId: { type: 'string' },
      productName: { type: 'string' },
      quantity: { type: 'integer' },
      unitPrice: { type: 'number' },
      lineTotal: { type: 'number' },
    },
  },
  AddressCreate: {
    type: 'object',
    required: ['city', 'street', 'house'],
    properties: {
      country: { type: 'string', example: 'Россия', default: 'Россия' },
      city: { type: 'string', example: 'Москва' },
      street: { type: 'string', example: 'ул. Тверская' },
      house: { type: 'string', example: '12' },
      apartment: { type: 'string', nullable: true, example: '45' },
    },
  },
  Address: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      country: { type: 'string' },
      city: { type: 'string' },
      street: { type: 'string' },
      house: { type: 'string' },
      apartment: { type: 'string', nullable: true },
    },
  },
  OrderSummary: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      userId: { type: 'string' },
      deliveryAddressId: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled'] },
      total: { type: 'number' },
      itemsCount: { type: 'integer' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  },
  Order: {
    allOf: [
      ref('OrderSummary'),
      {
        type: 'object',
        properties: {
          deliveryAddress: ref('Address'),
          items: { type: 'array', items: ref('OrderItem') },
        },
      },
    ],
  },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Shop API (Clean Architecture)',
    version: '2.0.0',
    description: 'REST API интернет-магазина: аутентификация, корзина, каталог, заказы, роли и избранное.',
  },
  servers: [{ url: 'http://localhost:3000/api', description: 'Локальный сервер' }],
  tags: [
    { name: 'System', description: 'Проверки сервиса' },
    { name: 'Auth', description: 'Регистрация, вход, сессии и профиль' },
    { name: 'Catalog', description: 'Просмотр товаров и категорий' },
    { name: 'Admin Catalog', description: 'Административное управление каталогом' },
    { name: 'Cart', description: 'Управление корзиной и оформление заказа' },
    { name: 'Orders', description: 'Оформление и история заказов' },
    { name: 'Admin Orders', description: 'Управление статусами заказов' },
    { name: 'Favourites', description: 'Избранные товары' },
    { name: 'Addresses', description: 'Управление сохраненными адресами доставки' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'session_token',
      },
    },
    schemas,
  },
  paths,
};
