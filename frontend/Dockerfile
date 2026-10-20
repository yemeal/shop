# syntax=docker/dockerfile:1

# -------------------------------------------------------------------
# Этап 1: Сборка фронтенд-приложения (Vue 3, TypeScript, Vite)
# -------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Копируем файлы описания зависимостей для эффективного кэширования слоев
COPY package.json package-lock.json ./

# Установка зависимостей с кэшированием директории npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Копирование исходного кода фронтенда
COPY . .

# Переменная окружения для базового пути API (по умолчанию /api для прокси через Nginx)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Сборка продакшен-бандла (проверка типов vue-tsc и компиляция vite)
RUN npm run build

# -------------------------------------------------------------------
# Этап 2: Легковесный Nginx веб-сервер для раздачи статики и reverse-proxy
# -------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Очистка стандартной стартовой страницы Nginx
RUN rm -rf /usr/share/nginx/html/*

# Копирование скомпилированных файлов из этапа сборки
COPY --from=build /app/dist /usr/share/nginx/html

# Копирование конфигурации Nginx с поддержкой SPA и проксирования /api
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Проверка доступности фронтенда
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
