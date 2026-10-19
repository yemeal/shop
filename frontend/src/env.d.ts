/// <reference types="vite/client" />

// декларация для импорта vue файлов в typescript
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
