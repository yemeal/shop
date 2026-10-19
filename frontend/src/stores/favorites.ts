import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type Product } from '@/api';

// хранилище избранных товаров пользователя
export const useFavoritesStore = defineStore('favorites', () => {
  // список избранных товаров
  const items = ref<Product[]>([]);
  // индикатор загрузки
  const isLoading = ref<boolean>(false);
  // ошибка выполнения операции
  const error = ref<string | null>(null);

  // множество идентификаторов избранных товаров для быстрого поиска O(1)
  const favoriteIds = computed(() => new Set(items.value.map((p) => p.id)));

  // проверка, находится ли товар в избранном
  function isFavorite(productId: string): boolean {
    return favoriteIds.value.has(productId);
  }

  // загрузка списка избранного пользователя
  async function fetchFavorites(userId: string): Promise<void> {
    if (!userId) {
      items.value = [];
      return;
    }
    isLoading.value = true;
    error.value = null;
    try {
      // получение списка с бэкенда
      const response = await api.favourites.list(userId);
      items.value = response.items || [];
    } catch (err: any) {
      error.value = err?.message || 'Не удалось загрузить избранное';
    } finally {
      isLoading.value = false;
    }
  }

  // переключение состояния избранного (добавить / удалить)
  async function toggleFavorite(userId: string, product: Product): Promise<boolean> {
    if (!userId) return false;
    const exists = isFavorite(product.id);
    try {
      if (exists) {
        // удаляем из избранного на сервере
        await api.favourites.remove(userId, product.id);
        items.value = items.value.filter((p) => p.id !== product.id);
        return false;
      } else {
        // добавляем в избранное на сервере
        await api.favourites.add(userId, product.id);
        items.value.push(product);
        return true;
      }
    } catch (err: any) {
      error.value = err?.message || 'Ошибка обновления избранного';
      throw err;
    }
  }

  // очистка избранного при выходе
  function clear() {
    items.value = [];
  }

  return {
    items,
    isLoading,
    error,
    favoriteIds,
    isFavorite,
    fetchFavorites,
    toggleFavorite,
    clear,
  };
});
