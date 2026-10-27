<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import ProductCard from '@/components/product/ProductCard.vue';
import ProductFilterPanel, { type FilterState } from '@/components/product/ProductFilterPanel.vue';
import ProductQuickViewModal from '@/components/product/ProductQuickViewModal.vue';
import { api, type Product } from '@/api';

const route = useRoute();
const router = useRouter();

// список товаров
const products = ref<Product[]>([]);
const totalProducts = ref<number>(0);
const isLoading = ref<boolean>(false);

// пагинация
const currentPage = ref<number>(1);
const pageSize = ref<number>(12);

// состояние фильтров
const filters = ref<FilterState>({
  search: '',
  categoryId: '',
  minPrice: undefined,
  maxPrice: undefined,
  sortBy: 'created_at',
  sortOrder: 'desc',
});

// состояние модального окна быстрого просмотра
const isQuickViewOpen = ref<boolean>(false);
const quickViewProduct = ref<Product | null>(null);

// открытие быстрого просмотра для выбранного товара
function openQuickView(product: Product) {
  quickViewProduct.value = product;
  isQuickViewOpen.value = true;
}

// загрузка каталога товаров с сервера
async function fetchProducts() {
  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;
    const response = await api.catalog.products({
      search: filters.value.search || undefined,
      categoryId: filters.value.categoryId || undefined,
      minPrice: filters.value.minPrice,
      maxPrice: filters.value.maxPrice,
      sortBy: filters.value.sortBy,
      sortOrder: filters.value.sortOrder,
      limit: pageSize.value,
      offset,
    });
    products.value = response.items || [];
    totalProducts.value = response.total || 0;
  } catch {
    products.value = [];
    totalProducts.value = 0;
  } finally {
    isLoading.value = false;
  }
}

// применение фильтров с переходом на первую страницу
function handleApplyFilters() {
  currentPage.value = 1;
  syncToUrl();
  fetchProducts();
}

// синхронизация фильтров в query параметры url
function syncToUrl() {
  const query: Record<string, string> = {};
  if (filters.value.search) query.search = filters.value.search;
  if (filters.value.categoryId) query.category = filters.value.categoryId;
  if (filters.value.minPrice !== undefined) query.minPrice = String(filters.value.minPrice);
  if (filters.value.maxPrice !== undefined) query.maxPrice = String(filters.value.maxPrice);
  if (filters.value.sortBy !== 'created_at') query.sortBy = filters.value.sortBy;
  if (filters.value.sortOrder !== 'desc') query.sortOrder = filters.value.sortOrder;
  if (currentPage.value > 1) query.page = String(currentPage.value);

  router.replace({ query });
}

// чтение параметров фильтрации из url
function syncFromUrl() {
  filters.value.search = typeof route.query.search === 'string' ? route.query.search : '';
  filters.value.categoryId = typeof route.query.category === 'string' ? route.query.category : '';
  filters.value.minPrice = route.query.minPrice ? Number(route.query.minPrice) : undefined;
  filters.value.maxPrice = route.query.maxPrice ? Number(route.query.maxPrice) : undefined;
  filters.value.sortBy = (route.query.sortBy as FilterState['sortBy']) || 'created_at';
  filters.value.sortOrder = (route.query.sortOrder as FilterState['sortOrder']) || 'desc';
  currentPage.value = route.query.page ? Math.max(1, Number(route.query.page)) : 1;
}

// сброс всех фильтров в начальное состояние
function handleResetFilters() {
  filters.value = {
    search: '',
    categoryId: '',
    minPrice: undefined,
    maxPrice: undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
  };
  currentPage.value = 1;
  syncToUrl();
  fetchProducts();
}

// смена страницы в пагинации
function handlePageChange(page: number) {
  currentPage.value = page;
  syncToUrl();
  fetchProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

watch(
  () => route.query.category,
  (newCat) => {
    if (newCat !== undefined && newCat !== filters.value.categoryId) {
      filters.value.categoryId = String(newCat || '');
      currentPage.value = 1;
      fetchProducts();
    }
  },
);

onMounted(() => {
  syncFromUrl();
  fetchProducts();
});
</script>

<template>
  <MainLayout>
    <div class="catalog-page">
      <div class="page-header">
        <h1 class="page-title">Каталог товаров</h1>
        <p class="page-subtitle">Широкий ассортимент качественных товаров с удобной доставкой</p>
      </div>

      <!-- панель фильтрации с корректным двусторонним v-model -->
      <ProductFilterPanel
        v-model:filters="filters"
        @apply="handleApplyFilters"
        @reset="handleResetFilters"
      />

      <!-- индикатор загрузки -->
      <div v-if="isLoading" class="loading-container">
        <el-skeleton :rows="6" animated />
      </div>

      <!-- если товаров не найдено -->
      <div v-else-if="products.length === 0" class="empty-state">
        <el-empty description="По заданным критериям товаров не найдено">
          <el-button type="primary" @click="handleResetFilters"> Сбросить фильтры </el-button>
        </el-empty>
      </div>

      <!-- сетка товаров -->
      <div v-else class="catalog-grid">
        <div v-for="product in products" :key="product.id" class="grid-item">
          <ProductCard :product="product" @quick-view="openQuickView" />
        </div>
      </div>

      <!-- блок пагинации -->
      <div v-if="totalProducts > pageSize" class="pagination-wrapper">
        <el-pagination
          background
          layout="prev, pager, next, total"
          :current-page="currentPage"
          :page-size="pageSize"
          :total="totalProducts"
          @current-change="handlePageChange"
        />
      </div>

      <!-- модальное окно быстрого просмотра -->
      <ProductQuickViewModal v-model="isQuickViewOpen" :product="quickViewProduct" />
    </div>
  </MainLayout>
</template>

<style scoped>
/* оформление страницы каталога */
.catalog-page {
  padding-bottom: 40px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-h1);
  font-weight: 700;
  letter-spacing: var(--tracking-tighter);
  color: var(--color-text-main);
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-family: var(--font-sans);
  font-size: var(--font-size-lead);
  color: var(--color-text-muted);
  margin: 0;
}

.loading-container {
  padding: 40px 0;
}

/* сетка карточек товаров (css grid) */
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.empty-state {
  padding: 60px 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

@media (max-width: 640px) {
  .catalog-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .pagination-wrapper :deep(.el-pagination__total) {
    display: none;
  }
}
</style>
