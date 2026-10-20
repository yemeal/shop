<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import MainLayout from '@/components/layout/MainLayout.vue';
import AddressForm from '@/components/common/AddressForm.vue';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { useAddressStore } from '@/stores/addresses';
import { useProductActions } from '@/composables/useProductActions';
import { formatCurrency } from '@/utils/formatters';
import { Location, Check, ArrowLeft, Plus } from '@element-plus/icons-vue';

const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();
const addressStore = useAddressStore();
const { getProductImageUrl, handleImageError } = useProductActions();

const addressFormCompRef = ref<InstanceType<typeof AddressForm>>();
const isSubmitting = ref<boolean>(false);
const isSavingNewAddress = ref<boolean>(false);
const serverError = ref<string | null>(null);

// режим выбора адреса: 'saved' (из сохраненных) или 'new' (добавить новый)
const addressMode = ref<'saved' | 'new'>('new');
// выбранный сохраненный адрес доставки
const selectedAddressId = ref<string>('');

// форма ввода нового адреса доставки
const form = ref({
  city: '',
  street: '',
  house: '',
  apartment: null as string | null,
});

const items = computed(() => cartStore.cart.items || []);
const total = computed(() => cartStore.total);

function switchToNewAddress() {
  addressMode.value = 'new';
  serverError.value = null;
  form.value = {
    city: '',
    street: '',
    house: '',
    apartment: null,
  };
  addressFormCompRef.value?.resetFields();
}

function switchToSavedAddress() {
  addressMode.value = 'saved';
  serverError.value = null;
  if (!selectedAddressId.value && addressStore.addresses.length > 0) {
    selectedAddressId.value = addressStore.addresses[0].id;
  }
}

// инициализация сохраненных адресов и корзины
onMounted(async () => {
  serverError.value = null;
  const currentUser = await authStore.checkAuth();
  if (currentUser) {
    await cartStore.fetchCart();
    const list = await addressStore.fetchAddresses(currentUser.id);
    if (list && list.length > 0) {
      addressMode.value = 'saved';
      if (!selectedAddressId.value || !list.some((a) => a.id === selectedAddressId.value)) {
        selectedAddressId.value = list[0].id;
      }
    } else {
      addressMode.value = 'new';
    }
  } else {
    ElMessage.warning('Пожалуйста, войдите в систему для оформления заказа');
    router.push({ name: 'login', query: { redirect: '/checkout' } });
  }
});

// отдельное сохранение нового адреса без немедленного чекаута
async function handleSaveNewAddressOnly() {
  if (!addressFormCompRef.value) return;
  const isValid = await addressFormCompRef.value.validate();
  if (!isValid) return;

  const currentUser = authStore.user || (await authStore.checkAuth());
  if (!currentUser) {
    ElMessage.warning('Пожалуйста, авторизуйтесь');
    router.push({ name: 'login', query: { redirect: '/checkout' } });
    return;
  }

  isSavingNewAddress.value = true;
  serverError.value = null;
  try {
    const createdAddr = await addressStore.addAddress(currentUser.id, {
      city: form.value.city.trim(),
      street: form.value.street.trim(),
      house: form.value.house.trim(),
      apartment: form.value.apartment ? form.value.apartment.trim() : null,
    });
    selectedAddressId.value = createdAddr.id;
    addressMode.value = 'saved';
    ElMessage.success('Адрес успешно сохранен и выбран для доставки');
  } catch (err: any) {
    serverError.value = err?.message || 'Не удалось сохранить адрес доставки';
  } finally {
    isSavingNewAddress.value = false;
  }
}

// отправка и оформление заказа
async function handleCheckout() {
  if (items.value.length === 0) {
    ElMessage.warning('В корзине нет товаров для оформления');
    router.push('/catalog');
    return;
  }

  serverError.value = null;

  const currentUser = authStore.user || (await authStore.checkAuth());
  if (!currentUser) {
    ElMessage.warning('Пожалуйста, авторизуйтесь для оформления заказа');
    router.push({ name: 'login', query: { redirect: '/checkout' } });
    return;
  }

  let targetAddressId = '';

  if (addressMode.value === 'saved') {
    if (!selectedAddressId.value) {
      serverError.value = 'Пожалуйста, выберите адрес доставки из списка';
      return;
    }
    targetAddressId = selectedAddressId.value;
  } else {
    // валидация формы нового адреса через единый компонент
    if (!addressFormCompRef.value) return;
    const isValid = await addressFormCompRef.value.validate();
    if (!isValid) return;

    isSubmitting.value = true;
    try {
      // автоматически сохраняем новый адрес в базу данных пользователя
      const createdAddr = await addressStore.addAddress(currentUser.id, {
        city: form.value.city.trim(),
        street: form.value.street.trim(),
        house: form.value.house.trim(),
        apartment: form.value.apartment ? form.value.apartment.trim() : null,
      });
      targetAddressId = createdAddr.id;
      selectedAddressId.value = createdAddr.id;
      addressMode.value = 'saved';
    } catch (err: any) {
      serverError.value = err?.message || 'Не удалось сохранить адрес доставки';
      isSubmitting.value = false;
      return;
    }
  }

  isSubmitting.value = true;
  try {
    const order = await cartStore.checkout(targetAddressId);

    ElMessage.success({
      message: `Заказ #${order.id.slice(0, 8)} успешно оформлен!`,
      duration: 4000,
    });

    // перенаправление в личный кабинет на вкладку истории заказов
    router.push({ name: 'profile', query: { tab: 'orders', orderId: order.id } });
  } catch (err: any) {
    // устанавливаем serverError для отображения только в inline <el-alert>,
    // исключая дублирование плашек (без ElMessage.error)
    serverError.value = err?.message || 'Не удалось оформить заказ';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <MainLayout>
    <div class="checkout-page">
      <!-- навигация назад в корзину -->
      <div class="back-link-wrapper">
        <button class="btn-back-link" @click="router.push('/cart')">
          <el-icon><ArrowLeft /></el-icon>
          <span>Вернуться в корзину</span>
        </button>
      </div>

      <div class="checkout-header">
        <h1 class="page-title">Оформление заказа</h1>
        <p class="page-subtitle">Проверьте состав заказа и выберите удобный адрес доставки</p>
      </div>

      <el-alert
        v-if="serverError"
        :title="serverError"
        type="error"
        show-icon
        closable
        class="mb-4"
        @close="serverError = null"
      />

      <div class="checkout-grid">
        <!-- левая колонка: выбор или ввод адреса доставки -->
        <div class="address-col">
          <div class="card-base address-card">
            <div class="card-head-bar">
              <div class="card-head-title">
                <div class="head-icon-circle">
                  <el-icon><Location /></el-icon>
                </div>
                <h2 class="card-title">Адрес доставки</h2>
              </div>
              
              <!-- переключатель режима адреса -->
              <div v-if="addressStore.addresses.length > 0" class="mode-toggle">
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ active: addressMode === 'saved' }"
                  @click="switchToSavedAddress"
                >
                  Сохраненные ({{ addressStore.addresses.length }})
                </button>
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ active: addressMode === 'new' }"
                  @click="switchToNewAddress"
                >
                  + Новый адрес
                </button>
              </div>
            </div>

            <!-- режим 1: выбор из сохраненных адресов -->
            <div v-if="addressMode === 'saved'" class="saved-addresses-list">
              <div
                v-for="addr in addressStore.addresses"
                :key="addr.id"
                class="address-option-card"
                :class="{ active: selectedAddressId === addr.id }"
                @click="selectedAddressId = addr.id"
              >
                <div class="option-indicator">
                  <div class="radio-ring" :class="{ checked: selectedAddressId === addr.id }">
                    <div class="radio-inner" />
                  </div>
                </div>
                <div class="option-details">
                  <div class="option-title-row">
                    <span class="option-main">г. {{ addr.city }}, ул. {{ addr.street }}</span>
                    <span v-if="selectedAddressId === addr.id" class="badge-selected">Выбран для доставки</span>
                  </div>
                  <p class="option-sub">
                    дом {{ addr.house }}<span v-if="addr.apartment">, кв./оф. {{ addr.apartment }}</span> • {{ addr.country || 'Россия' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- режим 2: ввод нового адреса через переиспользуемый компонент -->
            <div v-else class="new-address-form">
              <AddressForm ref="addressFormCompRef" v-model="form" />
              <div class="new-addr-actions">
                <el-button
                  type="default"
                  :icon="Plus"
                  :loading="isSavingNewAddress"
                  class="save-addr-btn"
                  @click="handleSaveNewAddressOnly"
                >
                  Сохранить и выбрать этот адрес
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- правая колонка: состав заказа и подтверждение -->
        <div class="summary-col">
          <div class="card-base summary-card">
            <div class="summary-card-header">
              <h2 class="card-title">Состав заказа</h2>
              <span class="text-body-sm">{{ cartStore.itemsCount }} шт.</span>
            </div>

            <!-- список позиций заказа с фото -->
            <div class="order-items-list">
              <div v-for="item in items" :key="item.id" class="checkout-product-row">
                <img
                  :src="getProductImageUrl(item.productId, item.imageUrl)"
                  :alt="item.name"
                  class="checkout-item-thumb"
                  @error="(e) => handleImageError(e, item.productId)"
                />
                <div class="checkout-item-info">
                  <div class="checkout-item-title" :title="item.name">{{ item.name }}</div>
                  <div class="checkout-item-meta">
                    <span class="qty-pill">{{ item.quantity }} шт.</span>
                    <span class="price-single">{{ formatCurrency(item.price) }}</span>
                  </div>
                </div>
                <div class="checkout-item-total text-price">
                  {{ formatCurrency(item.lineTotal) }}
                </div>
              </div>
            </div>

            <div class="summary-divider" />

            <!-- строки сумм -->
            <div class="summary-totals">
              <div class="tot-row">
                <span class="text-body-sm">Товары:</span>
                <span class="text-price">{{ formatCurrency(total) }}</span>
              </div>
              <div class="tot-row">
                <span class="text-body-sm">Доставка курьером:</span>
                <span class="free-badge">Бесплатно</span>
              </div>
              <div class="tot-row total-highlight">
                <span class="total-label">Итого к оплате:</span>
                <span class="text-price-lg">{{ formatCurrency(total) }}</span>
              </div>
            </div>

            <!-- кнопка подтверждения чекаута -->
            <el-button
              type="primary"
              size="large"
              :icon="Check"
              :loading="isSubmitting"
              class="confirm-btn"
              @click="handleCheckout"
            >
              Подтвердить и оформить заказ
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
/* оформление страницы оформления заказа */
.checkout-page {
  padding-bottom: 50px;
}

.back-link-wrapper {
  margin-bottom: 16px;
}

.checkout-header {
  margin-bottom: 24px;
}

.mb-4 {
  margin-bottom: 20px;
}

.checkout-grid {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 28px;
  align-items: start;
}

@media (max-width: 960px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
}

/* стили карточек */
.address-card,
.summary-card {
  padding: 24px;
}

.card-head-bar,
.summary-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.card-head-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.head-icon-circle {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary-subtle);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

/* переключатель сохраненный / новый адрес */
.mode-toggle {
  display: inline-flex;
  background-color: var(--color-bg-subtle);
  padding: 3px;
  border-radius: var(--radius-pill);
  gap: 2px;
}

.toggle-btn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  color: var(--color-text-main);
}

.toggle-btn.active {
  background-color: var(--color-bg-surface);
  color: var(--color-primary);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

/* список сохраненных адресов */
.saved-addresses-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.address-option-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background-color: var(--color-bg-surface);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.address-option-card:hover {
  border-color: var(--color-primary-border);
  background-color: var(--color-bg-surface);
}

.address-option-card.active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-subtle);
  box-shadow: var(--shadow-sm);
}

/* кастомный круг радио-кнопки */
.option-indicator {
  margin-top: 2px;
}

.radio-ring {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--color-border-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.radio-ring.checked {
  border-color: var(--color-primary);
}

.radio-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: transparent;
  transition: all 0.2s ease;
}

.radio-ring.checked .radio-inner {
  background-color: var(--color-primary);
}

.option-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.option-main {
  font-size: var(--font-size-body);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
}

.badge-selected {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background-color: var(--color-primary-subtle);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-border);
  white-space: nowrap;
}

.option-sub {
  margin: 0;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-muted);
}

/* блок комментария */
.comment-section {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border-subtle);
}

.input-label {
  display: block;
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  color: var(--color-text-main);
  margin-bottom: 8px;
}

/* правая колонка: товары и суммы */
.order-items-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}

.checkout-product-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.checkout-item-thumb {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  padding: 2px;
  flex-shrink: 0;
}

.checkout-item-info {
  flex: 1;
  min-width: 0;
}

.checkout-item-title {
  font-size: var(--font-size-body-sm);
  font-weight: 500;
  color: var(--color-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.checkout-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-pill {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  background-color: var(--color-bg-subtle);
  padding: 1px 6px;
  border-radius: var(--radius-xs);
}

.price-single {
  font-size: 11px;
  color: var(--color-text-subtle);
}

.checkout-item-total {
  font-size: 0.95rem;
  flex-shrink: 0;
}

.summary-divider {
  height: 1px;
  background-color: var(--color-border-subtle);
  margin: 18px 0;
}

.summary-totals {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.free-badge {
  color: var(--color-success);
  font-weight: 600;
  font-size: var(--font-size-body-sm);
}

.total-highlight {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);
}

.total-label {
  font-size: var(--font-size-body);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
}

.confirm-btn {
  width: 100%;
  margin-top: 20px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  height: 48px;
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  box-shadow: var(--shadow-primary);
  transition: all 0.2s ease;
}

.confirm-btn:hover {
  background-color: var(--color-primary-hover);
  box-shadow: var(--shadow-hover);
}

.form-row {
  display: flex;
  gap: 16px;
}

.col-6 {
  flex: 1;
}

.new-addr-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.save-addr-btn {
  font-weight: 500;
  border-radius: var(--radius-sm);
}

@media (max-width: 640px) {
  .address-card,
  .summary-card {
    padding: 16px 14px;
  }

  .card-head-bar,
  .summary-card-header {
    margin-bottom: 14px;
    padding-bottom: 12px;
  }

  .mode-toggle {
    width: 100%;
    display: flex;
  }

  .mode-toggle .toggle-btn {
    flex: 1;
    text-align: center;
    padding: 6px 8px;
    font-size: 12px;
  }

  .address-option-card {
    padding: 12px;
    gap: 10px;
  }

  .option-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .save-addr-btn {
    width: 100%;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
