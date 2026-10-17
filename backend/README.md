# Shop API (Clean Architecture)

REST-бэкенд интернет-магазина на Node.js, Express 5 и SQLite, построенный по принципам **Чистой слоистой архитектуры (Clean Architecture / Dependency Inversion)**.

## Архитектура

- **Слой HTTP (Маршруты и Контроллеры):** тонкие обработчики, валидирующие входные данные схемами и вызывающие сервисы.
- **Слой схем (Schemas & Validation):** декларативная валидация `body`, `query` и `params`, единый безопасный формат ошибок с кодами (`code`) и деталями (`details`).
- **Слой сервисов (Service Layer):** чистая бизнес-логика без единого SQL-запроса. Сервисы зависят исключительно от интерфейсов репозиториев (DIP).
- **Слой репозиториев (Repository Layer):** на каждую сущность выделен абстрактный интерфейс (`I...Repository`) и конкретная реализация под SQLite (`Sqlite...Repository`).
- **Менеджер транзакций (Unit of Work):** атомарное выполнение операций через `ITransactionManager` без привязки сервисов к СУБД.

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
- `POST /api/auth/login` — авторизация (выдает HttpOnly куку `session_token` и Bearer токен)
- `POST /api/auth/logout` — отзыв сессии и очистка куки
- `GET /api/auth/me` — получение профиля текущего пользователя

### Корзина (`/api/cart`):
- `GET /api/cart` — просмотр корзины
- `POST /api/cart/items` — добавление товара в корзину
- `PATCH /api/cart/items/:productId` — обновление количества
- `DELETE /api/cart/items/:productId` — удаление товара из корзины
- `DELETE /api/cart` — полная очистка корзины
- `POST /api/cart/checkout` — оформление заказа из корзины с автоочисткой

### Каталог (`/api/catalog`):
- `GET /api/catalog/products` — список товаров (поиск `search`, категории `categoryId`, цены `minPrice`/`maxPrice`, сортировка `sortBy`/`sortOrder`, пагинация `limit`/`offset`)
- `GET /api/catalog/products/:productId` — карточка товара
- `GET /api/catalog/categories` — список категорий с количеством товаров
- `GET /api/catalog/categories/:categoryId/products` — товары категории
- `POST /api/catalog/products` — создание товара *(роль `admin`)*
- `PATCH /api/catalog/products/:productId` — редактирование товара *(роль `admin`)*
- `DELETE /api/catalog/products/:productId` — удаление товара *(роль `admin`)*

### Заказы (`/api/orders`):
- `POST /api/orders` — создание заказа
- `GET /api/orders/:orderId` — просмотр заказа
- `PATCH /api/orders/:orderId/status` — обновление статуса заказа *(роль `admin`)*
- `GET /api/users/:userId/orders` — история заказов пользователя

### Избранное (`/api/users/:userId/favourites`):
- `GET /api/users/:userId/favourites` — избранное пользователя
- `POST /api/users/:userId/favourites` — добавить в избранное
- `DELETE /api/users/:userId/favourites/:productId` — удалить из избранного

### Служебные маршруты:
- `GET /api/health` — проверка состояния API и SQLite
- `GET /openapi.json` — спецификация OpenAPI
- `GET /docs` — Swagger UI

## Тестирование

```powershell
npm test
```
