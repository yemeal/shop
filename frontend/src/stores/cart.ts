import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, type Cart, type Order } from '@/api';

// хранилище состояния корзины покупок
export const useCartStore = defineStore('cart', () => {
  // текущее состояние корзины
  const cart = ref<Cart>({
    items: [],
    total: 0,
    itemsCount: 0,
  });

  // индикатор выполнения операции с корзиной
  const isLoading = ref<boolean>(false);
  // текст ошибки
  const error = ref<string | null>(null);

  // вычисляемое количество всех товаров в корзине для бейджика в шапке
  const itemsCount = computed(() => cart.value.itemsCount || 0);
  // вычисляемая общая сумма заказа
  const total = computed(() => cart.value.total || 0);

  // загрузка актуального состояния корзины с сервера
  async function fetchCart(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      // получение данных корзины авторизованного пользователя
      cart.value = await api.cart.get();
    } catch {
      // если пользователь не авторизован — сбрасываем корзину
      cart.value = { items: [], total: 0, itemsCount: 0 };
    } finally {
      isLoading.value = false;
    }
  }

  // добавление позиции в корзину
  async function addToCart(productId: string, quantity = 1): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      // отправка запроса на добавление товара
      cart.value = await api.cart.addItem(productId, quantity);
    } catch (err) {
      error.value = (err as Error)?.message || 'Не удалось добавить товар в корзину';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // изменение количества конкретного товара
  async function updateQuantity(productId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    isLoading.value = true;
    error.value = null;
    try {
      // обновление количества
      cart.value = await api.cart.updateQuantity(productId, quantity);
    } catch (err) {
      error.value = (err as Error)?.message || 'Не удалось изменить количество';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // удаление товара из корзины
  async function removeFromCart(productId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      // отправка запроса на удаление
      cart.value = await api.cart.removeItem(productId);
    } catch (err) {
      error.value = (err as Error)?.message || 'Не удалось удалить товар из корзины';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // полная очистка корзины
  async function clearCart(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      // очистка на стороне сервера
      cart.value = await api.cart.clear();
    } catch (err) {
      error.value = (err as Error)?.message || 'Не удалось очистить корзину';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // оформление заказа из корзины
  async function checkout(deliveryAddressId: string): Promise<Order> {
    isLoading.value = true;
    error.value = null;
    try {
      // отправка запроса на оформление заказа
      const order = await api.cart.checkout(deliveryAddressId);
      // после успешного заказа локально очищаем корзину
      cart.value = { items: [], total: 0, itemsCount: 0 };
      return order;
    } catch (err) {
      error.value = (err as Error)?.message || 'Не удалось оформить заказ';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // локальный сброс состояния корзины (например, при логауте)
  function clearLocal() {
    cart.value = { items: [], total: 0, itemsCount: 0 };
  }

  return {
    cart,
    isLoading,
    error,
    itemsCount,
    total,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    clearLocal,
    checkout,
  };
});
