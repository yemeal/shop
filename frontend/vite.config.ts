import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

// конфигурация сборщика vite
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // псевдоним @ указывает на папку src
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // проксирование запросов к бэкенду
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
