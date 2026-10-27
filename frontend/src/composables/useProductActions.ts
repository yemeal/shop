import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Product } from '@/api';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { useFavoritesStore } from '@/stores/favorites';

export const DEFAULT_PRODUCT_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' fill='none'%3E%3Crect width='400' height='400' rx='16' fill='%23f1f5f9'/%3E%3Cpath d='M160 140h80v120h-80z' fill='%23cbd5e1'/%3E%3Ccircle cx='185' cy='175' r='14' fill='%2394a3b8'/%3E%3Cpath d='M160 230l25-30 20 20 15-15 20 25z' fill='%2394a3b8'/%3E%3Ctext x='200' y='305' font-family='system-ui, -apple-system, sans-serif' font-size='15' font-weight='500' fill='%2394a3b8' text-anchor='middle'%3E%D0%9D%D0%B5%D1%82%20%D1%84%D0%BE%D1%82%D0%BE%3C/text%3E%3C/svg%3E";

export function useProductActions() {
  const router = useRouter();
  const route = useRoute();
  const cartStore = useCartStore();
  const authStore = useAuthStore();
  const favoritesStore = useFavoritesStore();

  function getProductImageUrl(_productId?: string, imageUrl?: string | null): string {
    return imageUrl?.trim() ? imageUrl : DEFAULT_PRODUCT_PLACEHOLDER;
  }

  function handleImageError(event: Event, _productId?: string) {
    const img = event.target as HTMLImageElement;
    if (img.src !== DEFAULT_PRODUCT_PLACEHOLDER) {
      img.src = DEFAULT_PRODUCT_PLACEHOLDER;
    }
  }

  function isFavorite(productId: string): boolean {
    return favoritesStore.isFavorite(productId);
  }

  async function addToCart(product: Product, quantity = 1): Promise<boolean> {
    if (!authStore.isAuthenticated) {
      ElMessage.warning('Для добавления в корзину необходимо авторизоваться');
      const currentPath = route?.fullPath || '/catalog';
      router.push({ name: 'login', query: { redirect: currentPath } });
      return false;
    }

    try {
      await cartStore.addToCart(product.id, quantity);
      const qtySuffix = quantity > 1 ? ` (${quantity} шт.)` : '';
      ElMessage.success(`«${product.name}»${qtySuffix} добавлен в корзину`);
      return true;
    } catch (err) {
      ElMessage.error((err as Error)?.message || 'Не удалось добавить товар в корзину');
      return false;
    }
  }

  async function toggleFavorite(product: Product): Promise<boolean> {
    if (!authStore.isAuthenticated || !authStore.user) {
      ElMessage.warning('Для добавления в избранное необходимо авторизоваться');
      const currentPath = route?.fullPath || '/catalog';
      router.push({ name: 'login', query: { redirect: currentPath } });
      return false;
    }

    try {
      const added = await favoritesStore.toggleFavorite(authStore.user.id, product);
      if (added) {
        ElMessage.success(`«${product.name}» добавлен в избранное`);
      } else {
        ElMessage.info(`«${product.name}» удален из избранного`);
      }
      return added;
    } catch (err) {
      ElMessage.error((err as Error)?.message || 'Ошибка обновления избранного');
      return false;
    }
  }

  return {
    getProductImageUrl,
    handleImageError,
    isFavorite,
    addToCart,
    toggleFavorite,
  };
}
