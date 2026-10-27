<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import { api, type Product } from '@/api';
import { useProductActions } from '@/composables/useProductActions';
import { formatCurrency } from '@/utils/formatters';
import { ShoppingCart, Star, StarFilled, ArrowLeft, Check, Close } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const { getProductImageUrl, handleImageError, isFavorite, addToCart, toggleFavorite } =
  useProductActions();

const product = ref<Product | null>(null);
const isLoading = ref<boolean>(true);
const isAdding = ref<boolean>(false);
const quantity = ref<number>(1);

const imageSrc = computed(() => {
  if (!product.value) return '';
  return getProductImageUrl(product.value.id, product.value.imageUrl);
});

function onDetailImageError(event: Event) {
  if (product.value) {
    handleImageError(event, product.value.id);
  }
}

const formattedPrice = computed(() => {
  return product.value ? formatCurrency(product.value.price) : '';
});

const isFav = computed(() => {
  return product.value ? isFavorite(product.value.id) : false;
});

async function loadProduct() {
  const id = String(route.params.id);
  isLoading.value = true;
  try {
    product.value = await api.catalog.product(id);
  } catch {
    product.value = null;
  } finally {
    isLoading.value = false;
  }
}

async function handleAddToCart() {
  if (!product.value) return;
  isAdding.value = true;
  try {
    await addToCart(product.value, quantity.value);
  } finally {
    isAdding.value = false;
  }
}

async function handleToggleFavorite() {
  if (!product.value) return;
  await toggleFavorite(product.value);
}

onMounted(() => {
  loadProduct();
});
</script>

<template>
  <MainLayout>
    <div class="product-detail-page">
      <!-- кнопка возврата в каталог -->
      <div class="back-nav">
        <button class="btn-back-link" @click="router.push('/catalog')">
          <el-icon><ArrowLeft /></el-icon>
          <span>Назад в каталог</span>
        </button>
      </div>

      <!-- индикатор загрузки -->
      <div v-if="isLoading" class="loading-state">
        <el-skeleton :rows="10" animated />
      </div>

      <!-- если товар не найден -->
      <div v-else-if="!product" class="not-found">
        <el-result
          icon="error"
          title="Товар не найден"
          sub-title="Возможно, он был удален или деактивирован."
        >
          <template #extra>
            <el-button type="primary" @click="router.push('/catalog')">
              Перейти в каталог
            </el-button>
          </template>
        </el-result>
      </div>

      <!-- детальная карточка товара -->
      <div v-else class="product-layout">
        <!-- левая колонка: изображение товара -->
        <div class="gallery-column">
          <div class="product-image-box">
            <img
              :src="imageSrc"
              :alt="product.name"
              class="product-main-image"
              @error="onDetailImageError"
            />
          </div>
        </div>

        <!-- правая колонка: свойства и покупка -->
        <div class="info-column">
          <!-- артикул и статус наличия -->
          <div class="meta-row">
            <span class="sku">Артикул: {{ product.sku }}</span>
            <el-tag :type="product.isActive ? 'success' : 'danger'" effect="plain">
              <el-icon class="mr-1">
                <Check v-if="product.isActive" />
                <Close v-else />
              </el-icon>
              {{ product.isActive ? 'В наличии' : 'Нет в наличии' }}
            </el-tag>
          </div>

          <!-- наименование -->
          <h1 class="product-title">{{ product.name }}</h1>

          <!-- категории -->
          <div v-if="product.categories?.length" class="categories-row">
            <el-tag
              v-for="cat in product.categories"
              :key="cat.id"
              size="small"
              type="info"
              class="cat-chip"
            >
              {{ cat.name }}
            </el-tag>
          </div>

          <!-- цена -->
          <div class="price-box">
            <span class="price-main">{{ formattedPrice }}</span>
            <span class="price-hint">цена с учетом всех налогов</span>
          </div>

          <!-- блок покупки и выбора количества -->
          <div class="purchase-box">
            <div class="quantity-picker">
              <span class="picker-label">Количество:</span>
              <el-input-number
                v-model="quantity"
                :min="1"
                :max="99"
                :disabled="!product.isActive"
                size="large"
              />
            </div>

            <div class="buttons-row">
              <el-button
                type="primary"
                size="large"
                :icon="ShoppingCart"
                :loading="isAdding"
                :disabled="!product.isActive"
                class="add-to-cart-btn"
                @click="handleAddToCart"
              >
                Добавить в корзину
              </el-button>

              <el-button
                size="large"
                :type="isFav ? 'warning' : 'default'"
                :icon="isFav ? StarFilled : Star"
                class="fav-btn"
                @click="handleToggleFavorite"
              >
                {{ isFav ? 'В избранном' : 'В избранное' }}
              </el-button>
            </div>
          </div>

          <!-- характеристики и описание -->
          <el-divider />

          <div class="description-section">
            <h3 class="section-heading">Описание товара</h3>
            <p class="description-text">
              {{ product.description || 'Подробное описание товара временно не добавлено.' }}
            </p>
          </div>

          <div class="specs-section">
            <h3 class="section-heading">Характеристики</h3>
            <ul class="specs-list">
              <li>
                <span class="spec-name">Идентификатор:</span>
                <span class="spec-val">{{ product.id }}</span>
              </li>
              <li>
                <span class="spec-name">Артикул SKU:</span>
                <span class="spec-val">{{ product.sku }}</span>
              </li>
              <li>
                <span class="spec-name">Статус активности:</span>
                <span class="spec-val">{{ product.isActive ? 'Активен' : 'Архивирован' }}</span>
              </li>
              <li>
                <span class="spec-name">Гарантия:</span> <span class="spec-val">12 месяцев</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
/* стилизация детальной карточки */
.product-detail-page {
  padding-bottom: 40px;
}

.back-nav {
  margin-bottom: 20px;
}

.loading-state,
.not-found {
  padding: 40px 0;
}

.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-card);
}

@media (max-width: 850px) {
  .product-layout {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 20px;
  }
}

@media (max-width: 640px) {
  .product-layout {
    padding: 14px;
    gap: 16px;
  }

  .product-image-box {
    height: 260px;
    padding: 8px;
  }

  .product-title {
    font-size: 1.3rem;
  }

  .price-main {
    font-size: 1.6rem;
  }

  .buttons-row {
    flex-direction: column;
    gap: 10px;
  }

  .add-to-cart-btn,
  .fav-btn {
    width: 100%;
    min-width: 0;
    flex: none;
  }
}

/* контейнер изображения товара */
.gallery-column {
  border-radius: 12px;
  overflow: hidden;
}

.product-image-box {
  width: 100%;
  height: 420px;
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.product-main-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.product-main-image:hover {
  transform: scale(1.03);
}

/* колонка информации */
.info-column {
  display: flex;
  flex-direction: column;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.sku {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-subtle);
}

.product-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-h1);
  font-weight: 700;
  letter-spacing: var(--tracking-tighter);
  color: var(--color-text-main);
  margin: 0 0 12px 0;
  line-height: 1.25;
}

.categories-row {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.cat-chip {
  font-size: 11px;
  border-radius: var(--radius-pill);
}

.price-box {
  background-color: var(--color-primary-subtle);
  border: 1px solid var(--color-primary-border);
  padding: 16px 20px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.price-main {
  font-family: var(--font-sans);
  font-size: 2.15rem;
  font-weight: 700;
  letter-spacing: var(--tracking-tighter);
  font-variant-numeric: tabular-nums;
  color: var(--color-primary);
}

.price-hint {
  font-size: var(--font-size-caption);
  color: var(--color-text-muted);
  margin-top: 4px;
}

.purchase-box {
  margin-bottom: 24px;
}

.quantity-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.picker-label {
  font-weight: 500;
  color: var(--color-text-body);
}

.buttons-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.add-to-cart-btn {
  flex: 2;
  min-width: 200px;
}

.fav-btn {
  flex: 1;
  min-width: 140px;
}

.section-heading {
  font-family: var(--font-sans);
  font-size: var(--font-size-h3);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
  margin: 0 0 8px 0;
}

.description-text {
  font-size: var(--font-size-body);
  color: var(--color-text-muted);
  line-height: var(--leading-relaxed);
  margin: 0;
}

.specs-section {
  margin-top: 20px;
}

.specs-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.specs-list li {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed var(--color-border);
  padding-bottom: 6px;
  font-size: var(--font-size-body-sm);
}

.spec-name {
  color: var(--color-text-muted);
}

.spec-val {
  font-weight: 500;
  color: var(--color-text-main);
}

.mr-1 {
  margin-right: 4px;
}
</style>
