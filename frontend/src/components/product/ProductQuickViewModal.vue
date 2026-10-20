<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Product } from '@/api';
import { useProductActions } from '@/composables/useProductActions';
import { formatCurrency } from '@/utils/formatters';
import { ShoppingCart } from '@element-plus/icons-vue';

// свойства модального окна быстрого просмотра
const props = defineProps<{
  modelValue: boolean;
  product: Product | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const router = useRouter();
const { getProductImageUrl, handleImageError, addToCart } = useProductActions();

const quantity = ref<number>(1);
const isAdding = ref<boolean>(false);

const formattedPrice = computed(() => {
  return props.product ? formatCurrency(props.product.price) : '';
});

const imageSrc = computed(() => {
  if (!props.product) return '';
  return getProductImageUrl(props.product.id, props.product.imageUrl);
});

function onImageError(event: Event) {
  if (props.product) {
    handleImageError(event, props.product.id);
  }
}

function handleClose() {
  emit('update:modelValue', false);
  quantity.value = 1;
}

async function handleAddToCart() {
  if (!props.product) return;
  isAdding.value = true;
  try {
    const success = await addToCart(props.product, quantity.value);
    if (success) {
      handleClose();
    }
  } finally {
    isAdding.value = false;
  }
}

function goToFullPage() {
  if (!props.product) return;
  const id = props.product.id;
  handleClose();
  router.push(`/catalog/${id}`);
}
</script>

<template>
  <!-- диалоговое окно быстрого просмотра товара -->
  <el-dialog
    :model-value="modelValue"
    title="Быстрый просмотр"
    width="680px"
    destroy-on-close
    align-center
    @close="handleClose"
  >
    <div v-if="product" class="quick-view-body">
      <!-- колонка с изображением -->
      <div class="image-col">
        <img
          :src="imageSrc"
          :alt="product.name"
          class="modal-image"
          @error="onImageError"
        />
      </div>

      <!-- колонка с подробной информацией -->
      <div class="info-col">
        <span class="sku-label">Артикул: {{ product.sku }}</span>
        <h2 class="title">{{ product.name }}</h2>

        <div class="status-row">
          <el-tag :type="product.isActive ? 'success' : 'danger'" effect="plain">
            {{ product.isActive ? 'В наличии' : 'Нет в наличии' }}
          </el-tag>
          <div v-if="product.categories?.length" class="cats">
            <el-tag
              v-for="cat in product.categories"
              :key="cat.id"
              size="small"
              type="info"
            >
              {{ cat.name }}
            </el-tag>
          </div>
        </div>

        <p class="description">
          {{ product.description || 'Подробное описание данного товара временно отсутствует.' }}
        </p>

        <div class="price-row">
          <span class="price">{{ formattedPrice }}</span>
        </div>

        <!-- блок выбора количества и добавления -->
        <div class="actions-row">
          <el-input-number
            v-model="quantity"
            :min="1"
            :max="99"
            :disabled="!product.isActive"
            size="large"
          />
          <el-button
            type="primary"
            size="large"
            :icon="ShoppingCart"
            :loading="isAdding"
            :disabled="!product.isActive"
            @click="handleAddToCart"
          >
            В корзину
          </el-button>
        </div>

        <el-button link type="primary" class="detail-link" @click="goToFullPage">
          Перейти на страницу товара →
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
/* разметка быстрого просмотра */
.quick-view-body {
  display: flex;
  gap: 24px;
}

.image-col {
  flex: 0 0 260px;
  height: 260px;
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  padding: 8px;
}

.modal-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.info-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.sku-label {
  font-size: var(--font-size-caption);
  color: var(--color-text-subtle);
  margin-bottom: 4px;
}

.title {
  margin: 0 0 12px 0;
  font-family: var(--font-sans);
  font-size: var(--font-size-h3);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.description {
  font-size: var(--font-size-body-sm);
  color: var(--color-text-muted);
  line-height: var(--leading-normal);
  margin: 0 0 16px 0;
}

.price-row {
  margin-bottom: 16px;
}

.price {
  font-family: var(--font-sans);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: var(--tracking-tighter);
  font-variant-numeric: tabular-nums;
  color: var(--color-primary);
}

.actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-link {
  align-self: flex-start;
  padding: 0;
}

@media (max-width: 640px) {
  .quick-view-body {
    flex-direction: column;
    gap: 16px;
  }

  .image-col {
    flex: none;
    width: 100%;
    height: 200px;
  }

  .actions-row {
    flex-wrap: wrap;
  }

  .actions-row .add-cart-btn {
    width: 100%;
  }
}
</style>
