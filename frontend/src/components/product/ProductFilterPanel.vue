<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, type Category } from '@/api';
import { Search, RefreshLeft } from '@element-plus/icons-vue';

// модель фильтров
export interface FilterState {
  search: string;
  categoryId: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  sortBy: 'created_at' | 'price' | 'name';
  sortOrder: 'asc' | 'desc';
}

const props = defineProps<{
  filters: FilterState;
}>();

const emit = defineEmits<{
  (e: 'update:filters', value: FilterState): void;
  (e: 'apply'): void;
  (e: 'reset'): void;
}>();

// список категорий для выпадающего списка
const categories = ref<Category[]>([]);
const isLoadingCategories = ref<boolean>(false);

// опции сортировки с явным указанием полей без ненадежного сплита строк
interface SortOption {
  value: string;
  label: string;
  sortBy: FilterState['sortBy'];
  sortOrder: FilterState['sortOrder'];
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'created_at:desc', label: 'Сначала новые', sortBy: 'created_at', sortOrder: 'desc' },
  { value: 'price:asc', label: 'Сначала дешевле', sortBy: 'price', sortOrder: 'asc' },
  { value: 'price:desc', label: 'Сначала дороже', sortBy: 'price', sortOrder: 'desc' },
  { value: 'name:asc', label: 'По названию (А-Я)', sortBy: 'name', sortOrder: 'asc' },
];

function handleSortChange(val: string) {
  const selected = SORT_OPTIONS.find((opt) => opt.value === val);
  if (selected) {
    emit('update:filters', {
      ...props.filters,
      sortBy: selected.sortBy,
      sortOrder: selected.sortOrder,
    });
    emit('apply');
  }
}

// загрузка списка доступных категорий
async function loadCategories() {
  isLoadingCategories.value = true;
  try {
    const res = await api.catalog.categories({ limit: 100 });
    categories.value = res.items || [];
  } catch {
    categories.value = [];
  } finally {
    isLoadingCategories.value = false;
  }
}

// изменение отдельного поля фильтра
function updateField<K extends keyof FilterState>(key: K, value: FilterState[K]) {
  emit('update:filters', {
    ...props.filters,
    [key]: value,
  });
}

// сброс всех фильтров к значениям по умолчанию
function handleReset() {
  emit('update:filters', {
    search: '',
    categoryId: '',
    minPrice: undefined,
    maxPrice: undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  emit('reset');
}

onMounted(() => {
  loadCategories();
});
</script>

<template>
  <!-- панель фильтрации и поиска товаров -->
  <div class="filter-panel">
    <div class="filter-row top-row">
      <!-- поиск по названию или описанию -->
      <div class="filter-item search-item">
        <el-input
          :model-value="filters.search"
          placeholder="Поиск по названию или описанию..."
          clearable
          :prefix-icon="Search"
          @update:model-value="(val: string) => updateField('search', val)"
          @keyup.enter="emit('apply')"
        />
      </div>

      <!-- выбор категории -->
      <div class="filter-item">
        <el-select
          :model-value="filters.categoryId"
          placeholder="Все категории"
          clearable
          :loading="isLoadingCategories"
          @update:model-value="(val: string) => updateField('categoryId', val)"
          @change="emit('apply')"
        >
          <el-option label="Все категории" value="" />
          <el-option
            v-for="cat in categories"
            :key="cat.id"
            :label="`${cat.name} (${cat.productCount})`"
            :value="cat.id"
          />
        </el-select>
      </div>

      <!-- выбор сортировки -->
      <div class="filter-item">
        <el-select
          :model-value="`${filters.sortBy}:${filters.sortOrder}`"
          placeholder="Сортировка"
          @update:model-value="handleSortChange"
        >
          <el-option
            v-for="opt in SORT_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
    </div>

    <!-- строка диапазона цен и сброса -->
    <div class="filter-row bottom-row">
      <div class="price-range">
        <span class="range-label">Цена, ₽:</span>
        <el-input-number
          :model-value="filters.minPrice ?? null"
          :min="0"
          :controls="false"
          placeholder="От"
          class="price-input"
          @update:model-value="
            (val: number | undefined | null) =>
              updateField('minPrice', val !== null && val !== undefined ? val : undefined)
          "
        />
        <span class="range-divider">—</span>
        <el-input-number
          :model-value="filters.maxPrice ?? null"
          :min="0"
          :controls="false"
          placeholder="До"
          class="price-input"
          @update:model-value="
            (val: number | undefined | null) =>
              updateField('maxPrice', val !== null && val !== undefined ? val : undefined)
          "
        />
      </div>

      <div class="actions">
        <el-button type="primary" @click="emit('apply')"> Применить </el-button>
        <el-button :icon="RefreshLeft" @click="handleReset"> Сбросить </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* оформление карточки фильтров */
.filter-panel {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 18px 22px;
  box-shadow: var(--shadow-card);
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.top-row {
  display: flex;
}

.search-item {
  flex: 2;
  min-width: 250px;
}

.filter-item {
  flex: 1;
  min-width: 180px;
}

.bottom-row {
  justify-content: space-between;
}

.price-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-label {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-body);
}

.price-input {
  width: 110px;
}

.range-divider {
  color: var(--color-text-subtle);
}

.actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 640px) {
  .filter-panel {
    padding: 14px 12px;
    gap: 12px;
  }

  .filter-row {
    gap: 10px;
  }

  .search-item,
  .filter-item {
    min-width: 100%;
    flex: 1 1 100%;
  }

  .bottom-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .price-range {
    width: 100%;
    justify-content: space-between;
  }

  .price-input {
    flex: 1;
    width: auto;
  }

  .actions {
    width: 100%;
    display: flex;
  }

  .actions .el-button {
    flex: 1;
  }
}
</style>
