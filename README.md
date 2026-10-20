# Интернет-магазин электроники и техники

Полнофункциональный веб-сервис интернет-магазина с современным интерфейсом и надежным серверным API, спроектированным по принципам **Чистой архитектуры (Clean Architecture)**.

- **Frontend:** Vue 3, TypeScript, Vite, Element Plus, Pinia, Vue Router (HTML5 History Mode).
- **Backend:** Node.js 22 LTS, Express 5, SQLite (WAL-режим), Unit of Work (транзакции), JWT (асимметричное шифрование RS256) + ротация Refresh-токенов в защищенных HttpOnly Cookie, строгая валидация схем на базе Zod.
- **Инфраструктура:** Docker, Docker Compose, Multi-stage builds, Nginx Alpine в качестве reverse-proxy и веб-сервера статики, автоматические проверки работоспособности (Healthchecks).

---

## Оглавление

1. [Архитектура развертывания](#-архитектура-развертывания)
2. [Системные требования](#-системные-требования)
3. [Быстрый старт (Quick Start)](#-быстрый-старт-quick-start)
4. [Конфигурация переменных окружения (.env)](#-конфигурация-переменных-окружения-env)
5. [Тестовые учетные записи и наполнение каталога (Seed)](#-тестовые-учетные-записи-и-наполнение-каталога-seed)
6. [Пошаговое развертывание на удаленном сервере (Ubuntu / Debian VPS)](#-пошаговое-развертывание-на-удаленном-сервере-ubuntu--debian-vps)
7. [Настройка домена и HTTPS (SSL Let's Encrypt)](#-настройка-домена-и-https-ssl-lets-encrypt)
8. [Управление контейнерами и полезные команды](#-управление-контейнерами-и-полезные-команды)
9. [Резервное копирование и восстановление базы данных](#-резервное-копирование-и-восстановление-базы-данных)
10. [Локальная разработка без Docker](#-локальная-разработка-без-docker)
11. [Часто встречающиеся проблемы (Troubleshooting)](#-часто-встречающиеся-проблемы-troubleshooting)

---

## 💻 Системные требования

- **Операционная система:** Linux (Ubuntu 20.04+, Debian 11+, CentOS/RHEL 8+, Alpine), macOS или Windows с установленным WSL2.
- **Docker Engine:** версия 24.0.0 или новее.
- **Docker Compose:** плагин Compose V2 (`docker compose` встроен в современный Docker).
- **Свободная память:** от 1 ГБ RAM (рекомендуется от 2 ГБ для плавной сборки образов на сервере).
- **Свободные порты:**
  - `80` (для веб-сайта и Nginx)
  - `3000` (опционально, для прямого доступа к API бэкенда)

---

## 🚀 Быстрый старт (Quick Start)

Развертывание всего проекта занимает 3 команды:

### 1. Склонируйте репозиторий и перейдите в каталог проекта:
```bash
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ>
cd server
```

### 2. Создайте файл конфигурации `.env`:
```bash
cp .env.example .env
```
*(При первом запуске на локальном компьютере или по прямому IP-адресу настройки по умолчанию уже готовы к работе).*

### 3. Запустите контейнеры в фоновом режиме:
```bash
docker compose up -d --build
```

### 4. Проверьте статус запуска:
```bash
docker compose ps
```
Оба контейнера (`shop-backend` и `shop-frontend`) должны иметь статус `healthy` (или `running`).

### 5. Доступ к приложению:
- 🌐 **Интернет-магазин (Фронтенд):** [http://localhost](http://localhost) (или `http://<IP-вашего-сервера>`)
- 📖 **Интерактивная документация Swagger UI:** [http://localhost/docs](http://localhost/docs)
- 🩺 **Проверка состояния бэкенда:** [http://localhost/api/health](http://localhost/api/health)

---

## ⚙ Конфигурация переменных окружения (.env)

Файл `.env` в корне проекта управляет поведением сервисов:

| Переменная | По умолчанию | Описание |
|---|---|---|
| `FRONTEND_PORT` | `80` | Внешний порт хоста, на котором открывается интернет-магазин. |
| `BACKEND_PORT` | `3000` | Внешний порт хоста для прямого обращения к API (можно закрыть в фаерволе, так как Nginx уже проксирует `/api`). |
| `NODE_ENV` | `production` | Режим работы Node.js (`production` включает оптимизации). |
| `COOKIE_SECURE` | `false` | **Критически важно:** установите `true` **только** если сайт работает по HTTPS (с SSL-сертификатом). При доступе по HTTP (`http://IP`) держите `false`, иначе браузеры отбросят cookie и авторизация не будет сохраняться! |
| `ALLOWED_ORIGINS` | `http://localhost,http://localhost:80...` | Список разрешенных источников для CORS через запятую. Для отладки или универсального доступа можно выставить `*`. |
| `DB_FILE` | `/app/data/shop.db` | Путь к базе SQLite внутри контейнера (хранится в томе). |
| `KEYS_DIR` | `/app/data/keys` | Путь к RSA-ключам для подписи токенов внутри контейнера. |
| `JWT_ACCESS_TTL_SECONDS` | `900` | Время жизни Access-токена в секундах (15 минут). |
| `REFRESH_TOKEN_TTL_MS` | `2592000000` | Время жизни Refresh-токена в мс (30 дней). |

---

## 👥 Тестовые учетные записи и наполнение каталога (Seed)

Бэкенд автоматически создает структуру базы данных при первом старте.

### Предустановленные учетные записи:
- 👤 **Обычный покупатель:**
  - **Email:** `demo@example.com`
  - **Пароль:** `demo-password-hash` (или можно зарегистрировать нового пользователя через форму «Регистрация»)
- 👑 **Администратор магазина** (доступ к админ-панели управления товарами, категориями и заказами):
  - **Email:** `admin@example.com`
  - **Пароль:** `demo-admin-password-hash`

> 💡 **Совет:** Вы можете зарегистрировать свой личный аккаунт через веб-интерфейс, а затем при необходимости выдать ему права администратора в БД:
> ```bash
> docker compose exec backend node -e "const initDB = require('./db/db'); (async () => { const db = await initDB('/app/data/shop.db'); await db.run(\"UPDATE users SET role = 'admin' WHERE email = 'ваш@email.com'\"); console.log('Права администратора выданы!'); await db.close(); })()"
> ```

### Первичное наполнение реальными товарами с фотографиями:
Чтобы наполнить магазин 21 реалистичным товаром с описаниями, ценами, категориями и качественными изображениями, выполните одну команду:
```bash
docker compose exec backend npm run seed
```
Товары сразу отобразятся на главной странице и в каталоге!

---

## 🐧 Пошаговое развертывание на удаленном сервере (Ubuntu / Debian VPS)

Подробное руководство по развертыванию с нуля на чистом сервере:

### Шаг 1: Подключение к серверу
```bash
ssh root@<IP_ВАШЕГО_СЕРВЕРА>
```

### Шаг 2: Установка Docker и Docker Compose
Выполните официальный скрипт установки Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```
Проверьте установку:
```bash
docker --version
docker compose version
```

### Шаг 3: Настройка сетевого экрана (UFW)
Разрешите SSH, веб-трафик и активируйте фаервол:
```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### Шаг 4: Клонирование проекта
```bash
cd /opt
git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> shop
cd shop
```

### Шаг 5: Настройка `.env`
```bash
cp .env.example .env
nano .env
```
Если вы пока разворачиваете без домена по IP-адресу:
- Убедитесь, что `COOKIE_SECURE=false`.
- В `ALLOWED_ORIGINS` добавьте IP вашего сервера (например: `http://<IP_СЕРВЕРА>,http://<IP_СЕРВЕРА>:80`) либо установите `ALLOWED_ORIGINS=*`.

### Шаг 6: Запуск проекта
```bash
docker compose up -d --build
```

### Шаг 7: Заполнение каталога товарами
```bash
docker compose exec backend npm run seed
```

Готово! Откройте в браузере `http://<IP_ВАШЕГО_СЕРВЕРА>` — магазин полностью готов к работе.

---

## 🔒 Настройка домена и HTTPS (SSL Let's Encrypt)

Для полноценной работы в продакшене рекомендуется подключить домен и настроить бесплатный SSL-сертификат.

### Вариант 1: Использование Nginx на хост-сервере с Certbot (Рекомендуемый)

1. Измените в `.env` порт фронтенда, чтобы освободить порт 80 для системного Nginx:
   ```ini
   FRONTEND_PORT=8080
   COOKIE_SECURE=true
   ALLOWED_ORIGINS=https://your-domain.com
   ```
   Перезапустите контейнеры:
   ```bash
   docker compose up -d
   ```

2. Установите Nginx и Certbot на хост-машине:
   ```bash
   apt update && apt install -y nginx certbot python3-certbot-nginx
   ```

3. Создайте конфигурацию сайта `/etc/nginx/sites-available/shop.conf`:
   ```nginx
   server {
       server_name your-domain.com www.your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

4. Активируйте конфигурацию и выпустите сертификат:
   ```bash
   ln -s /etc/nginx/sites-available/shop.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

Certbot автоматически настроит перенаправление с HTTP на HTTPS и автоматическое продление сертификата.

---

## 🛠 Управление контейнерами и полезные команды

### Просмотр статуса контейнеров:
```bash
docker compose ps
```

### Просмотр логов в реальном времени:
```bash
# Все логи:
docker compose logs -f

# Логи бэкенда:
docker compose logs -f backend

# Логи фронтенда (Nginx):
docker compose logs -f frontend
```

### Остановка и запуск:
```bash
# Остановка контейнеров:
docker compose stop

# Запуск остановленных контейнеров:
docker compose start

# Полная остановка с удалением контейнеров (данные в томе сохраняются):
docker compose down

# Перезапуск сервисов:
docker compose restart
```

### Обновление проекта до последней версии с Git:
```bash
git pull
docker compose up -d --build
```

### Запуск команд внутри контейнера бэкенда:
```bash
# Открыть интерактивную оболочку sh в контейнере:
docker compose exec backend sh

# Запустить тесты бэкенда внутри контейнера:
docker compose exec backend npm test

# Запустить скрипт наполнения товарами:
docker compose exec backend npm run seed
```

---

## 💾 Резервное копирование и восстановление базы данных

База данных SQLite хранится в файле `/app/data/shop.db` внутри именованного тома `shop-backend-data`.

### Создание резервной копии на хост-систему:
```bash
# Создание безопасного снапшота базы данных прямо на лету:
docker compose exec backend sqlite3 /app/data/shop.db ".backup '/app/data/backup_temp.db'"
docker cp shop-backend:/app/data/backup_temp.db ./shop_backup_$(date +%F_%H%M%S).db
docker compose exec backend rm /app/data/backup_temp.db
```
*Или просто скопируйте файл:*
```bash
docker cp shop-backend:/app/data/shop.db ./shop_backup.db
```

### Восстановление базы данных из резервной копии:
```bash
# Остановка бэкенда перед восстановлением
docker compose stop backend

# Копирование бэкапа в контейнер
docker cp ./shop_backup.db shop-backend:/app/data/shop.db

# Запуск бэкенда
docker compose start backend
```

---

## 💻 Локальная разработка без Docker

Если требуется разрабатывать код локально на своей машине:

### Запуск бэкенда:
```bash
cd backend
npm install
npm run dev
```
API будет доступно на `http://localhost:3000`.

### Запуск фронтенда:
```bash
cd frontend
npm install
npm run dev
```
Приложение Vite запустится на `http://localhost:5173` с автоматическим проксированием запросов `/api` на локальный порт `3000`.

### Запуск всех тестов:
```bash
# В корне проекта:
npm test          # тесты бэкенда (11 тестов)
npm run frontend:test  # тесты фронтенда (Vitest)
```

---

## ❓ Часто встречающиеся проблемы (Troubleshooting)

### 1. `Error: bind: address already in use` (Порт 80 или 3000 занят)
- **Причина:** На сервере уже запущен другой сервис (например, системный Apache или Nginx).
- **Решение:** 
  1. Выясните, какой процесс занимает порт: `sudo lsof -i :80` или `sudo netstat -tulpn | grep :80`.
  2. Либо измените внешний порт в `.env` (например, `FRONTEND_PORT=8080`), затем выполните `docker compose up -d`.

### 2. После логина пользователя сразу выбрасывает (не сохраняется авторизация)
- **Причина:** В `.env` включен флаг `COOKIE_SECURE=true`, но сайт открывается по незащищенному протоколу `http://...`. Браузеры Chrome и Firefox в целях безопасности игнорируют Cookie с флагом `Secure`, полученные по HTTP.
- **Решение:** В файле `.env` установите `COOKIE_SECURE=false` и перезапустите бэкенд: `docker compose up -d backend`.

### 3. Ошибка CORS при обращении к API
- **Причина:** Запрос отправлен с домена/IP, которого нет в `ALLOWED_ORIGINS`.
- **Решение:** В `.env` добавьте ваш домен в `ALLOWED_ORIGINS` (например, `ALLOWED_ORIGINS=http://my-ip,http://my-domain.com`) или временно установите `ALLOWED_ORIGINS=*`.

### 4. Контейнер `shop-backend` перезапускается со статусом unhealthy
- **Причина:** Возможная ошибка доступа к каталогу `/app/data` или повреждение базы данных.
- **Решение:** Проверьте логи контейнера:
  ```bash
  docker compose logs backend
  ```

---

## 📄 Лицензия

Проект распространяется для учебных и коммерческих целей. Разработано с использованием лучших практик современной веб-разработки и контейнеризации.
