<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import { useCartStore } from '@/stores/cart';
import { useProductActions } from '@/composables/useProductActions';
import { formatCurrency } from '@/utils/formatters';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, ShoppingBag, ArrowRight } from '@element-plus/icons-vue';

const router = useRouter();
const cartStore = useCartStore();
const { getProductImageUrl, handleImageError } = useProductActions();

// список позиций в корзине
const items = computed(() => cartStore.cart.items || []);
const isEmpty = computed(() => items.value.length === 0);

// изменение количества товара
async function handleQuantityChange(productId: string, newQty: number) {
  try {
    await cartStore.updateQuantity(productId, newQty);
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось обновить количество');
  }
}

// удаление товара из корзины с подтверждением
async function handleRemoveItem(productId: string, name: string) {
  try {
    await ElMessageBox.confirm(
      `Вы действительно хотите удалить «${name}» из корзины?`,
      'Подтверждение удаления',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning',
      },
    );
    await cartStore.removeFromCart(productId);
    ElMessage.success('Товар удален из корзины');
  } catch {
    // пользователь отменил диалог
  }
}

// очистка всей корзины
async function handleClearCart() {
  try {
    await ElMessageBox.confirm(
      'Вы уверены, что хотите полностью очистить корзину?',
      'Очистка корзины',
      {
        confirmButtonText: 'Очистить',
        cancelButtonText: 'Отмена',
        type: 'warning',
      },
    );
    await cartStore.clearCart();
    ElMessage.success('Корзина полностью очищена');
  } catch {
    // отмена
  }
}
</script>

<template>
  <MainLayout>
    <div class="cart-page">
      <div class="page-header">
        <h1 class="page-title">Корзина покупок</h1>
        <p v-if="!isEmpty" class="page-subtitle">
          В вашей корзине {{ cartStore.itemsCount }} товаров
        </p>
      </div>

      <!-- состояние пустой корзины -->
      <div v-if="isEmpty" class="empty-cart">
        <el-empty description="Ваша корзина пока пуста">
          <template #image>
            <el-icon class="empty-icon"><ShoppingBag /></el-icon>
          </template>
          <el-button type="primary" size="large" @click="router.push('/catalog')">
            Перейти в каталог за покупками
          </el-button>
        </el-empty>
      </div>

      <!-- таблица товаров и панель оформления -->
      <div v-else class="cart-grid">
        <!-- таблица позиций (десктоп) -->
        <div class="cart-table-card desktop-only">
          <el-table :data="items" style="width: 100%" class="custom-cart-table">
            <!-- колонка товара (фото + название) -->
            <el-table-column label="Товар" min-width="260">
              <template #default="{ row }">
                <div class="item-product-cell">
                  <img
                    :src="getProductImageUrl(row.productId, row.imageUrl)"
                    :alt="row.name"
                    class="item-thumb"
                    @error="(e) => handleImageError(e, row.productId)"
                  />
                  <div class="item-text">
                    <router-link :to="`/catalog/${row.productId}`" class="item-title">
                      {{ row.name }}
                    </router-link>
                    <span class="item-sku">Артикул: {{ row.sku }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>

            <!-- цена за единицу -->
            <el-table-column label="Цена" width="130" align="center">
              <template #default="{ row }">
                <span class="cell-price">{{ formatCurrency(row.price) }}</span>
              </template>
            </el-table-column>

            <!-- количество (+ / -) -->
            <el-table-column label="Количество" width="160" align="center">
              <template #default="{ row }">
                <el-input-number
                  :model-value="row.quantity"
                  :min="1"
                  :max="99"
                  size="default"
                  @change="(val: number | undefined) => val && handleQuantityChange(row.productId, val)"
                />
              </template>
            </el-table-column>

            <!-- стоимость позиции -->
            <el-table-column label="Сумма" width="150" align="right">
              <template #default="{ row }">
                <span class="cell-line-total">{{ formatCurrency(row.lineTotal) }}</span>
              </template>
            </el-table-column>

            <!-- кнопка удаления -->
            <el-table-column width="70" align="center">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  link
                  :icon="Delete"
                  title="Удалить позицию"
                  @click="handleRemoveItem(row.productId, row.name)"
                />
              </template>
            </el-table-column>
          </el-table>

          <!-- кнопка очистки всей корзины -->
          <div class="table-actions">
            <el-button link type="danger" :icon="Delete" @click="handleClearCart">
              Очистить корзину
            </el-button>
          </div>
        </div>

        <!-- карточки позиций (мобильные устройства) -->
        <div class="mobile-cart-list mobile-only">
          <div v-for="row in items" :key="row.productId" class="mobile-cart-card">
            <img
              :src="getProductImageUrl(row.productId, row.imageUrl)"
              :alt="row.name"
              class="mobile-cart-thumb"
              @error="(e) => handleImageError(e, row.productId)"
            />
            <div class="mobile-cart-info">
              <div class="mobile-cart-header">
                <router-link :to="`/catalog/${row.productId}`" class="mobile-cart-title">
                  {{ row.name }}
                </router-link>
                <el-button
                  type="danger"
                  link
                  :icon="Delete"
                  @click="handleRemoveItem(row.productId, row.name)"
                />
              </div>
              <div class="mobile-cart-sku">Арт: {{ row.sku }}</div>
              <div class="mobile-cart-footer">
                <el-input-number
                  :model-value="row.quantity"
                  :min="1"
                  :max="99"
                  size="small"
                  @change="(val: number | undefined) => val && handleQuantityChange(row.productId, val)"
                />
                <span class="mobile-cart-price">{{ formatCurrency(row.lineTotal) }}</span>
              </div>
            </div>
          </div>
          <div class="mobile-clear-wrap">
            <el-button link type="danger" :icon="Delete" @click="handleClearCart">
              Очистить корзину
            </el-button>
          </div>
        </div>

        <!-- боковая панель с итогом -->
        <div class="cart-summary-card">
          <el-card shadow="never">
            <template #header>
              <h2 class="summary-title">Итог заказа</h2>
            </template>

            <div class="summary-rows">
              <div class="summary-row">
                <span class="summary-label">Количество товаров:</span>
                <span class="summary-val">{{ cartStore.itemsCount }} шт.</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Доставка курьером:</span>
                <span class="summary-val free-delivery">Бесплатно</span>
              </div>

              <el-divider />

              <div class="summary-row total-row">
                <span class="total-label">К оплате:</span>
                <span class="total-val">{{ formatCurrency(cartStore.total) }}</span>
              </div>
            </div>

            <!-- кнопка перехода к оформлению заказа -->
            <el-button
              type="primary"
              size="large"
              class="checkout-btn"
              :icon="ArrowRight"
              @click="router.push('/checkout')"
            >
              Перейти к оформлению
            </el-button>
          </el-card>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
/* оформление страницы корзины */
.cart-page {
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
  margin: 0 0 6px 0;
}

.page-subtitle {
  font-family: var(--font-sans);
  font-size: var(--font-size-lead);
  color: var(--color-text-muted);
  margin: 0;
}

.empty-cart {
  padding: 60px 0;
}

.empty-icon {
  font-size: 4rem;
  color: var(--color-text-subtle);
}

.cart-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}

@media (max-width: 900px) {
  .cart-grid {
    grid-template-columns: 1fr;
  }
}

.cart-table-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.item-product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-thumb {
  width: 56px;
  height: 56px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  padding: 2px;
}

.item-text {
  display: flex;
  flex-direction: column;
}

.item-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-body);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
  line-height: 1.35;
}

.item-title:hover {
  color: var(--color-primary);
}

.item-sku {
  font-size: var(--font-size-caption);
  color: var(--color-text-subtle);
}

.cell-price {
  font-family: var(--font-sans);
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-muted);
}

.cell-line-total {
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  font-variant-numeric: tabular-nums;
  color: var(--color-text-main);
}

.table-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.cart-summary-card :deep(.el-card) {
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.summary-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--font-size-h3);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
}

.summary-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-body);
  color: var(--color-text-muted);
}

.free-delivery {
  color: var(--color-success);
  font-weight: 600;
}

.total-row {
  align-items: baseline;
  margin-top: 4px;
}

.total-label {
  font-family: var(--font-sans);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
}

.total-val {
  font-family: var(--font-sans);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: var(--tracking-tighter);
  font-variant-numeric: tabular-nums;
  color: var(--color-primary);
}

.checkout-btn {
  width: 100%;
  margin-top: 24px;
  height: 46px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  box-shadow: var(--shadow-primary);
  transition: all 0.2s ease;
}

.checkout-btn:hover {
  background-color: var(--color-primary-hover);
  box-shadow: var(--shadow-hover);
}

.desktop-only {
  display: block;
}
.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  .mobile-only {
    display: flex !important;
    flex-direction: column;
    gap: 12px;
  }
}

.mobile-cart-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 12px;
  display: flex;
  gap: 12px;
  box-shadow: var(--shadow-card);
}

.mobile-cart-thumb {
  width: 68px;
  height: 68px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  padding: 4px;
  flex-shrink: 0;
}

.mobile-cart-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.mobile-cart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.mobile-cart-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-main);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-cart-sku {
  font-size: 0.75rem;
  color: var(--color-text-subtle);
  margin-top: 2px;
  margin-bottom: 8px;
}

.mobile-cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.mobile-cart-price {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.mobile-clear-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0;
}
</style>
