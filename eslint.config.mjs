import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 1. Игнорируемые файлы и директории
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/keys/**',
      '**/*.db*',
      '**/*.json',
      '**/*.pem',
      'frontend/dist/**',
    ],
  },

  // 2. Базовые правила JS для всех файлов
  js.configs.recommended,

  // 3. Бэкенд (Node.js CommonJS)
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
    },
  },

  // 4. Фронтенд: TypeScript
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['frontend/src/**/*.ts', 'frontend/*.ts'],
  })),
  {
    files: ['frontend/src/**/*.ts', 'frontend/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // 5. Фронтенд: Vue SFC
  ...pluginVue.configs['flat/essential'].map((cfg) => ({
    ...cfg,
    files: ['frontend/src/**/*.vue'],
  })),
  {
    files: ['frontend/src/**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
);
