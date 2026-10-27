import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type User } from '@/api';
import { useCartStore } from './cart';
import { useFavoritesStore } from './favorites';
import { useAddressStore } from './addresses';

// хранилище состояния аутентификации пользователя
export const useAuthStore = defineStore('auth', () => {
  // текущий пользователь (null если гость)
  const user = ref<User | null>(null);
  // флаг процесса начальной проверки или выполнения запроса
  const isLoading = ref<boolean>(false);
  // текст последней возникшей ошибки
  const errorMessage = ref<string | null>(null);
  // признак завершения первичной проверки авторизации
  const isInitialized = ref<boolean>(false);

  // вычисляемый статус авторизации
  const isAuthenticated = computed(() => !!user.value);
  // вычисляемый признак администратора
  const isAdmin = computed(() => user.value?.role === 'admin');

  // проверка существующей сессии по cookie
  async function checkAuth(): Promise<User | null> {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      // запрос профиля текущего пользователя
      const response = await api.auth.me();
      user.value = response.user;
      return response.user;
    } catch {
      // если куки отсутствуют или просрочены — гостевой режим
      user.value = null;
      return null;
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
  }

  // вход пользователя по email и паролю
  async function login(email: string, password: string): Promise<User> {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      // отправка учетных данных на бэкенд
      const result = await api.auth.login({ email, password });
      user.value = result.user;
      return result.user;
    } catch (err) {
      errorMessage.value = (err as Error)?.message || 'Ошибка входа в систему';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // регистрация нового пользователя
  async function register(payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      // отправка регистрационных данных
      const result = await api.auth.register(payload);
      user.value = result.user;
      return result.user;
    } catch (err) {
      errorMessage.value = (err as Error)?.message || 'Ошибка при регистрации';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // завершение сессии пользователя
  async function logout(): Promise<void> {
    isLoading.value = true;
    try {
      // вызов logout для очистки сессионных cookie
      await api.auth.logout();
    } catch {
      // игнорируем ошибку выхода
    } finally {
      user.value = null;
      isLoading.value = false;
      useCartStore().clearLocal();
      useFavoritesStore().clear();
      useAddressStore().clear();
    }
  }

  return {
    user,
    isLoading,
    errorMessage,
    isInitialized,
    isAuthenticated,
    isAdmin,
    checkAuth,
    login,
    register,
    logout,
  };
});
