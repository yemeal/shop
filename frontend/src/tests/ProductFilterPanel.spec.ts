import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ProductFilterPanel, { type FilterState } from '@/components/product/ProductFilterPanel.vue';

// мок api категорий
vi.mock('@/api', () => ({
  api: {
    catalog: {
      categories: vi.fn().mockResolvedValue({
        items: [
          { id: 'cat-phones', name: 'Смартфоны', productCount: 5 },
          { id: 'cat-laptops', name: 'Ноутбуки', productCount: 3 },
        ],
        total: 2,
      }),
    },
  },
}));

describe('ProductFilterPanel.vue', () => {
  const initialFilters: FilterState = {
    search: '',
    categoryId: '',
    minPrice: undefined,
    maxPrice: undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
  };

  it('эмитирует update:filters при вводе поисковой строки', async () => {
    const wrapper = mount(ProductFilterPanel, {
      props: {
        filters: initialFilters,
      },
      global: {
        stubs: {
          'el-input': {
            props: ['modelValue'],
            template:
              '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          },
          'el-select': { template: '<div><slot /></div>' },
          'el-option': { template: '<option><slot /></option>' },
          'el-input-number': { template: '<input />' },
          'el-button': { template: '<button><slot /></button>' },
        },
      },
    });

    const searchInput = wrapper.find('.search-item input');
    expect(searchInput.exists()).toBe(true);

    await searchInput.setValue('MacBook');

    expect(wrapper.emitted('update:filters')).toBeTruthy();
    const emittedFilters = wrapper.emitted('update:filters')![0][0] as FilterState;
    expect(emittedFilters.search).toBe('MacBook');
  });

  it('эмитирует reset при нажатии кнопки сброса', async () => {
    const wrapper = mount(ProductFilterPanel, {
      props: {
        filters: initialFilters,
      },
      global: {
        stubs: {
          'el-input': { template: '<input />' },
          'el-select': { template: '<div><slot /></div>' },
          'el-option': { template: '<option><slot /></option>' },
          'el-input-number': { template: '<input />' },
          'el-button': {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    });

    const buttons = wrapper.findAll('button');
    const resetBtn = buttons.find((b) => b.text().includes('Сбросить'));
    expect(resetBtn).toBeDefined();

    await resetBtn!.trigger('click');
    expect(wrapper.emitted('reset')).toBeTruthy();
  });

  it('корректно обновляет сортировку на "Сначала новые" без повреждения created_at', async () => {
    const wrapper = mount(ProductFilterPanel, {
      props: {
        filters: { ...initialFilters, sortBy: 'price', sortOrder: 'asc' },
      },
      global: {
        stubs: {
          'el-input': { template: '<input />' },
          'el-select': {
            props: ['modelValue'],
            template: '<div class="select-sort" :data-value="modelValue"><slot /></div>',
          },
          'el-option': { template: '<option><slot /></option>' },
          'el-input-number': { template: '<input />' },
          'el-button': { template: '<button><slot /></button>' },
        },
      },
    });

    (wrapper.vm as unknown as { handleSortChange: (val: string) => void }).handleSortChange(
      'created_at:desc',
    );

    expect(wrapper.emitted('update:filters')).toBeTruthy();
    const emitted = wrapper.emitted('update:filters')![0][0] as FilterState;
    expect(emitted.sortBy).toBe('created_at');
    expect(emitted.sortOrder).toBe('desc');
    expect(wrapper.emitted('apply')).toBeTruthy();
  });
});
