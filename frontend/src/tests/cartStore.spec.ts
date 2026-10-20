import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCartStore } from '@/stores/cart';

// тестирование состояния и логики корзины покупок (pinia store)
describe('useCartStore', () => {
  beforeEach(() => {
    // перед каждым тестом создаем чистый экземпляр pinia
    setActivePinia(createPinia());
  });

  it('инициализируется с пустой корзиной', () => {
    const cartStore = useCartStore();

    // проверка начальных значений
    expect(cartStore.itemsCount).toBe(0);
    expect(cartStore.total).toBe(0);
    expect(cartStore.cart.items).toEqual([]);
    expect(cartStore.isLoading).toBe(false);
  });

  it('корректно рассчитывает количество товаров и итоговую сумму', () => {
    const cartStore = useCartStore();

    // задаем состояние корзины с двумя позициями
    cartStore.cart = {
      items: [
        {
          id: 'item-1',
          productId: 'p-1',
          sku: 'SKU-1',
          name: 'Смартфон',
          price: 25000,
          quantity: 2,
          lineTotal: 50000,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'item-2',
          productId: 'p-2',
          sku: 'SKU-2',
          name: 'Чехол',
          price: 1000,
          quantity: 3,
          lineTotal: 3000,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 53000,
      itemsCount: 5,
    };

    // проверка работы вычисляемых свойств (computed)
    expect(cartStore.itemsCount).toBe(5);
    expect(cartStore.total).toBe(53000);
    expect(cartStore.cart.items.length).toBe(2);
  });
});
