import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ProductCard from '@/components/product/ProductCard.vue';
import type { Product } from '@/api';

// мок для vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    currentRoute: { value: { fullPath: '/catalog' } },
  }),
  useRoute: () => ({
    fullPath: '/catalog',
    query: {},
    params: {},
  }),
}));

// тестирование компонента карточки товара
describe('ProductCard.vue', () => {
  // тестовые данные товара
  const mockProduct: Product = {
    id: 'test-prod-1',
    sku: 'TEST-SKU-001',
    name: 'Игровые наушники Pro',
    description: 'Отличные беспроводные наушники с активным шумоподавлением',
    price: 4990,
    isActive: true,
    imageUrl: 'https://images.unsplash.com/test.jpg',
    categories: [{ id: 'cat-1', name: 'Электроника' }],
  };

  it('рендерит наименование, цену и статус наличия товара', () => {
    // инициализация хранилища pinia
    setActivePinia(createPinia());

    // монтирование компонента с переданными props
    const wrapper = mount(ProductCard, {
      props: {
        product: mockProduct,
      },
      global: {
        stubs: {
          'el-card': { template: '<div class="el-card"><slot /></div>' },
          'el-tag': { template: '<span class="el-tag"><slot /></span>' },
          'el-button': { template: '<button class="el-button"><slot /></button>' },
          'el-icon': { template: '<i class="el-icon"><slot /></i>' },
        },
      },
    });

    // проверка отображения названия
    expect(wrapper.text()).toContain('Игровые наушники Pro');
    // проверка отображения категории
    expect(wrapper.text()).toContain('Электроника');
    // проверка отображения бейджа наличия
    expect(wrapper.find('.stock-badge.in-stock').exists()).toBe(true);
    expect(wrapper.text()).toContain('В наличии');
  });

  it('вызывает событие быстрого просмотра при клике на соответствующую кнопку', async () => {
    setActivePinia(createPinia());

    const wrapper = mount(ProductCard, {
      props: {
        product: mockProduct,
      },
      global: {
        stubs: {
          'el-card': { template: '<div><slot /></div>' },
          'el-tag': { template: '<span><slot /></span>' },
          'el-button': { template: '<button><slot /></button>' },
          'el-icon': { template: '<i><slot /></i>' },
        },
      },
    });

    // находим кнопку быстрого просмотра
    const quickViewBtn = wrapper.find('.quick-view-btn');
    expect(quickViewBtn.exists()).toBe(true);

    // имитируем клик
    await quickViewBtn.trigger('click');

    // проверяем генерацию события quick-view с объектом товара
    expect(wrapper.emitted('quick-view')).toBeTruthy();
    expect(wrapper.emitted('quick-view')![0]).toEqual([mockProduct]);
  });
});
