# syntax=docker/dockerfile:1

# базовый образ с debian slim для стабильной работы sqlite3
FROM node:22-bookworm-slim AS base

WORKDIR /app

# сборка зависимостей
FROM base AS dependencies

# пакеты для сборки нативного модуля sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# установка только продакшен-зависимостей с кэшем npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# стадия для тестов в ci
FROM dependencies AS test

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .

RUN npm test

# продакшен-образ
FROM base AS production

ENV NODE_ENV=production \
    PORT=3000 \
    DB_FILE=/app/data/shop.db \
    KEYS_DIR=/app/data/keys

# каталог под бд и rsa-ключи
RUN mkdir -p /app/data /app/keys && \
    chown -R node:node /app

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node index.js ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node db/ ./db/
COPY --chown=node:node docs/ ./docs/

# запуск от непривилегированного пользователя
USER node

VOLUME ["/app/data"]

EXPOSE 3000

# проверка доступности сервиса
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "index.js"]
