import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

// конфигурация для запуска тестов с использованием vitest
export default defineConfig({
  plugins: [vue()],
  test: {
    // эмуляция dom-окружения через jsdom
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
