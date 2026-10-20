import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

// тестирование хранилища аутентификации (authStore)
describe('useAuthStore', () => {
  beforeEach(() => {
    // чистая инициализация pinia
    setActivePinia(createPinia());
  });

  it('по умолчанию пользователь не авторизован и не является администратором', () => {
    const authStore = useAuthStore();

    expect(authStore.user).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.isAdmin).toBe(false);
  });

  it('корректно определяет авторизованного покупателя', () => {
    const authStore = useAuthStore();

    // устанавливаем объект пользователя с ролью user
    authStore.user = {
      id: 'user-123',
      email: 'user@test.ru',
      firstName: 'Иван',
      lastName: 'Петров',
      role: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.isAdmin).toBe(false);
  });

  it('корректно определяет права администратора', () => {
    const authStore = useAuthStore();

    // устанавливаем пользователя с ролью admin
    authStore.user = {
      id: 'admin-999',
      email: 'admin@shop.ru',
      firstName: 'Главный',
      lastName: 'Администратор',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.isAdmin).toBe(true);
  });
});
