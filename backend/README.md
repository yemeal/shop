# Shop API (Clean Architecture)

REST-бэкенд интернет-магазина на Node.js, Express 5 и SQLite, построенный по принципам **Чистой архитектуры (Clean Architecture / Dependency Inversion)** без лишнего оверхеда.

## Архитектура

- **Слой HTTP (Маршруты и Контроллеры):** тонкие контроллеры без дублирования кода. Все пользовательские ресурсы унифицированы (`/api/me/...` и `/api/users/:userId/...`).
- **Слой схем (Schemas & Validation):** декларативная валидация `body`, `query` и `params` на Zod, единый безопасный формат ошибок с кодами (`code`) и деталями (`details`).
- **Слой сервисов (Service Layer):** чистая бизнес-логика без прямого SQL. Сервисы отвечают за бизнес-инварианты и оркестрацию транзакций.
- **Слой репозиториев (Repository Layer):** модульный доступ к данным SQLite (`Sqlite...Repository`), использующий утиную типизацию (duck typing) без лишних пустых абстракций.
- **Менеджер транзакций (Unit of Work):** последовательная сериализация транзакций (`SqliteTransactionManager`) на базе `BEGIN IMMEDIATE` с поддержкой безопасных вложенных вызовов.
- **Безопасность и JWT:** стандартный промышленный выпуск и верификация токенов RS256 (`jsonwebtoken`) с ротацией refresh-токенов в HttpOnly cookie.

## Запуск

```powershell
npm install
npm start
```

Сервер доступен на `http://localhost:3000`. Для разработки с автоперезапуском: `npm run dev`.

Интерактивная Swagger документация: `http://localhost:3000/docs`.

## Основные маршруты

### Аутентификация и сессии (`/api/auth`):

- `POST /api/auth/register` — регистрация пользователя
- `POST /api/auth/login` — авторизация (выдает HttpOnly куку `session_token` и `refresh_token`)
- `POST /api/auth/refresh` — ротация пары токенов
- `POST /api/auth/logout` — отзыв сессии и очистка кук
- `GET /api/auth/me` — получение профиля текущего пользователя

### Корзина (`/api/cart`):

- `GET /api/cart` — просмотр корзины
- `POST /api/cart/items` — добавление товара в корзину
- `PATCH /api/cart/items/:productId` — обновление количества
- `DELETE /api/cart/items/:productId` — удаление товара из корзины
- `DELETE /api/cart` — полная очистка корзины
- `POST /api/cart/checkout` — оформление заказа из корзины с автоочисткой

### Каталог (`/api/catalog`):

- `GET /api/catalog/products` — список товаров (поиск, категории, диапазон цен, сортировка, пагинация)
- `GET /api/catalog/products/:productId` — карточка товара
- `GET /api/catalog/categories` — список категорий с количеством товаров
- `GET /api/catalog/categories/:categoryId/products` — товары категории
- `POST /api/catalog/products` — создание товара _(роль `admin`)_
- `PATCH /api/catalog/products/:productId` — редактирование товара _(роль `admin`)_
- `DELETE /api/catalog/products/:productId` — удаление товара _(роль `admin`)_

### Заказы (`/api/orders`):

- `POST /api/orders` — создание заказа (только для авторизованного пользователя)
- `GET /api/orders/:orderId` — просмотр заказа
- `GET /api/orders` — просмотр всех заказов магазина _(роль `admin`)_
- `PATCH /api/orders/:orderId/status` — обновление статуса заказа _(роль `admin`)_

### Личные данные пользователя (`/api/me` и `/api/users/:userId`):

- `GET /api/me/orders` или `GET /api/users/:userId/orders` — история заказов
- `GET /api/me/favourites` или `GET /api/users/:userId/favourites` — избранное
- `POST /api/me/favourites` или `POST /api/users/:userId/favourites` — добавить в избранное
- `DELETE /api/me/favourites/:productId` или `DELETE /api/users/:userId/favourites/:productId` — удалить из избранного
- `GET /api/me/addresses` или `GET /api/users/:userId/addresses` — адреса доставки
- `POST /api/me/addresses` или `POST /api/users/:userId/addresses` — добавить адрес
- `DELETE /api/me/addresses/:addressId` или `DELETE /api/users/:userId/addresses/:addressId` — удалить адрес

### Служебные маршруты:

- `GET /api/health` — проверка состояния API и SQLite
- `GET /openapi.json` — спецификация OpenAPI
- `GET /docs` — Swagger UI

## Тестирование

```powershell
npm test
```
