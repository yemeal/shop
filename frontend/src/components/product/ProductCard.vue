<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Product } from '@/api';
import { useProductActions } from '@/composables/useProductActions';
import { formatCurrency } from '@/utils/formatters';
import { ShoppingCart, Star, StarFilled, View } from '@element-plus/icons-vue';

// входные параметры компонента карточки товара
const props = defineProps<{
  product: Product;
}>();

// события, излучаемые карточкой
const emit = defineEmits<{
  (e: 'quick-view', product: Product): void;
}>();

const router = useRouter();
const { getProductImageUrl, handleImageError, isFavorite, addToCart, toggleFavorite } =
  useProductActions();

const isFav = computed(() => isFavorite(props.product.id));
const formattedPrice = computed(() => formatCurrency(props.product.price));
const imageSrc = computed(() => getProductImageUrl(props.product.id, props.product.imageUrl));

function onImageError(event: Event) {
  handleImageError(event, props.product.id);
}

function handleAddToCart() {
  addToCart(props.product, 1);
}

function handleToggleFavorite() {
  toggleFavorite(props.product);
}

function navigateToDetail() {
  router.push(`/catalog/${props.product.id}`);
}
</script>

<template>
  <!-- переиспользуемая карточка товара -->
  <el-card class="product-card" :body-style="{ padding: '0px' }" shadow="hover">
    <!-- превью изображения товара -->
    <div class="image-wrapper" @click="navigateToDetail">
      <img
        :src="imageSrc"
        :alt="product.name"
        class="product-image"
        loading="lazy"
        @error="onImageError"
      />

      <!-- бейдж наличия товара -->
      <span v-if="product.isActive" class="stock-badge in-stock">В наличии</span>
      <span v-else class="stock-badge out-of-stock">Нет в наличии</span>

      <!-- кнопка быстрого просмотра -->
      <button
        type="button"
        class="quick-view-btn"
        title="Быстрый просмотр"
        @click.stop="emit('quick-view', product)"
      >
        <el-icon><View /></el-icon>
      </button>

      <!-- кнопка добавления в избранное -->
      <button
        type="button"
        class="favorite-btn"
        :class="{ active: isFav }"
        title="В избранное"
        @click.stop="handleToggleFavorite"
      >
        <el-icon v-if="isFav" class="star-active"><StarFilled /></el-icon>
        <el-icon v-else><Star /></el-icon>
      </button>
    </div>

    <!-- текстовый контент карточки -->
    <div class="card-content">
      <!-- список категорий -->
      <div v-if="product.categories && product.categories.length" class="card-categories">
        <el-tag
          v-for="cat in product.categories"
          :key="cat.id"
          size="small"
          type="info"
          effect="light"
          class="cat-tag"
        >
          {{ cat.name }}
        </el-tag>
      </div>

      <!-- название товара -->
      <h3 class="product-title" :title="product.name" @click="navigateToDetail">
        {{ product.name }}
      </h3>

      <!-- краткое описание -->
      <p class="product-desc" :title="product.description || ''">
        {{ product.description || 'Описание отсутствует' }}
      </p>

      <!-- нижняя панель: цена и кнопка покупки -->
      <div class="card-footer">
        <div class="price-block">
          <span class="price-value">{{ formattedPrice }}</span>
        </div>

        <el-button
          type="primary"
          :disabled="!product.isActive"
          :icon="ShoppingCart"
          size="default"
          @click="handleAddToCart"
        >
          В корзину
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
/* общие стили карточки товара */
.product-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  background-color: var(--color-bg-surface);
}

.product-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
  overflow: hidden;
}

.product-card:hover {
  transform: translateY(-3px);
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-lg);
}

/* контейнер превью картинки */
.image-wrapper {
  position: relative;
  width: 100%;
  height: 220px;
  background-color: var(--color-bg-surface);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.product-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

/* бейдж наличия */
.stock-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 8px;
  border-radius: var(--radius-xs);
  font-size: 0.75rem;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.stock-badge.in-stock {
  background-color: var(--color-success);
  color: var(--color-primary-contrast);
}

.stock-badge.out-of-stock {
  background-color: var(--color-danger);
  color: var(--color-primary-contrast);
}

/* круглая кнопка быстрого просмотра */
.quick-view-btn {
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--color-text-body);
  box-shadow: var(--shadow-sm);
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.2s;
}

.product-card:hover .quick-view-btn {
  opacity: 1;
  transform: translateY(0);
}

.quick-view-btn:hover {
  background-color: var(--color-primary);
  color: var(--color-primary-contrast);
}

/* кнопка добавления в избранное */
.favorite-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: var(--color-text-muted);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
}

.favorite-btn:hover,
.favorite-btn.active {
  background-color: var(--color-bg-surface);
  transform: scale(1.1);
}

.star-active {
  color: var(--color-star);
}

/* текстовый контент */
.card-content {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.card-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.cat-tag {
  font-size: 11px;
  border-radius: var(--radius-pill, 9999px);
}

.product-title {
  margin: 0 0 6px 0;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
  line-height: 1.35;
  cursor: pointer;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.7em;
}

.product-title:hover {
  color: var(--color-primary);
}

.product-desc {
  margin: 0 0 16px 0;
  font-family: var(--font-sans);
  font-size: var(--font-size-body-sm);
  letter-spacing: var(--tracking-normal);
  color: var(--color-text-muted);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.9em;
}

/* футер карточки */
.card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.price-block {
  min-width: 0;
  flex-shrink: 1;
}

.price-value {
  font-family: var(--font-sans);
  font-size: 1.15rem;
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-main);
}

.card-footer .el-button {
  flex-shrink: 0;
  padding: 8px 14px;
}

@media (max-width: 640px) {
  .image-wrapper {
    height: 180px;
    padding: 8px;
  }

  .stock-badge {
    top: 8px;
    left: 8px;
    font-size: 0.7rem;
    padding: 3px 6px;
  }

  .favorite-btn {
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .quick-view-btn {
    display: none;
  }

  .card-content {
    padding: 12px;
  }

  .product-title {
    font-size: 0.9rem;
    height: auto;
    min-height: 2.5em;
    margin-bottom: 4px;
  }

  .product-desc {
    font-size: 0.8rem;
    margin-bottom: 10px;
    height: auto;
    max-height: 2.8em;
  }

  .price-value {
    font-size: 1.05rem;
  }

  .card-footer .el-button {
    padding: 6px 12px;
    font-size: 0.85rem;
  }
}
</style>
