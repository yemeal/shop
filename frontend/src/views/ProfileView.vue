<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import ProductCard from '@/components/product/ProductCard.vue';
import AddressForm from '@/components/common/AddressForm.vue';
import OrderDetailsModal from '@/components/common/OrderDetailsModal.vue';
import { api, type Order } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useFavoritesStore } from '@/stores/favorites';
import { useAddressStore } from '@/stores/addresses';
import { getOrderStatusInfo } from '@/constants/orderStatus';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  User,
  ShoppingBag,
  Star,
  Location,
  Plus,
  Delete,
} from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const addressStore = useAddressStore();

// активная вкладка
const activeTab = ref<string>('orders');

// форма добавления нового адреса
const isAddressDialogOpen = ref<boolean>(false);
const addressFormCompRef = ref<InstanceType<typeof AddressForm>>();
const isSavingAddress = ref<boolean>(false);
const addressForm = ref({
  city: '',
  street: '',
  house: '',
  apartment: null as string | null,
});

// история заказов
const orders = ref<Order[]>([]);
const isLoadingOrders = ref<boolean>(false);

// текущий выбранный заказ для детального просмотра
const selectedOrder = ref<Order | null>(null);
const isOrderDetailsOpen = ref<boolean>(false);

// загрузка истории заказов текущего пользователя
async function loadOrders() {
  if (!authStore.user) return;
  isLoadingOrders.value = true;
  try {
    const res = await api.orders.byUser(authStore.user.id);
    orders.value = res.items || [];
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось загрузить историю заказов');
  } finally {
    isLoadingOrders.value = false;
  }
}

// открытие детального просмотра заказа
async function viewOrderDetails(orderId: string) {
  try {
    selectedOrder.value = await api.orders.get(orderId);
    isOrderDetailsOpen.value = true;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось загрузить данные заказа');
  }
}

// открытие диалога сохранения адреса
function openAddAddressDialog() {
  addressForm.value = {
    city: '',
    street: '',
    house: '',
    apartment: null,
  };
  isAddressDialogOpen.value = true;
}

// сохранение нового адреса
async function handleSaveAddress() {
  if (!addressFormCompRef.value || !authStore.user) return;
  const valid = await addressFormCompRef.value.validate();
  if (!valid) return;

  isSavingAddress.value = true;
  try {
    await addressStore.addAddress(authStore.user.id, {
      city: addressForm.value.city.trim(),
      street: addressForm.value.street.trim(),
      house: addressForm.value.house.trim(),
      apartment: addressForm.value.apartment ? addressForm.value.apartment.trim() : null,
    });
    ElMessage.success('Адрес доставки успешно сохранен');
    isAddressDialogOpen.value = false;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось сохранить адрес');
  } finally {
    isSavingAddress.value = false;
  }
}

// удаление адреса пользователя с подтверждением
async function handleDeleteAddress(addressId: string) {
  if (!authStore.user) return;
  try {
    await ElMessageBox.confirm(
      'Вы действительно хотите удалить этот адрес доставки?',
      'Удаление адреса',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning',
      },
    );
    await addressStore.removeAddress(authStore.user.id, addressId);
    ElMessage.success('Адрес успешно удален');
  } catch {
    // отмена
  }
}

onMounted(async () => {
  if (route.query.tab) {
    activeTab.value = String(route.query.tab);
  }
  if (authStore.user) {
    await loadOrders();
    await favoritesStore.fetchFavorites(authStore.user.id);
    await addressStore.fetchAddresses(authStore.user.id);
    // если передан параметр orderId — сразу открываем просмотр
    if (route.query.orderId) {
      viewOrderDetails(String(route.query.orderId));
    }
  }
});
</script>

<template>
  <MainLayout>
    <div class="profile-page">
      <div class="profile-header">
        <h1 class="page-title">Личный кабинет</h1>
        <p class="page-subtitle">Управление заказами, избранным и профилем</p>
      </div>

      <!-- карточка информации о пользователе -->
      <div class="user-summary-card">
        <div class="avatar-col">
          <el-avatar :size="64" :icon="User" class="avatar-icon" />
        </div>
        <div class="user-details">
          <h2 class="user-full-name">
            {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
          </h2>
          <p class="user-email">{{ authStore.user?.email }}</p>
          <div class="user-tags">
            <el-tag :type="authStore.isAdmin ? 'danger' : 'info'" size="small">
              {{ authStore.isAdmin ? 'Администратор системы' : 'Покупатель' }}
            </el-tag>
            <span class="created-at">
              Регистрация: {{ formatDate(authStore.user?.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- вкладки личного кабинета -->
      <el-tabs v-model="activeTab" class="profile-tabs">
        <!-- вкладка 1: история заказов -->
        <el-tab-pane name="orders">
          <template #label>
            <span class="tab-label">
              <el-icon><ShoppingBag /></el-icon>
              История заказов ({{ orders.length }})
            </span>
          </template>

          <div v-if="isLoadingOrders" class="loading-state">
            <el-skeleton :rows="5" animated />
          </div>

          <div v-else-if="orders.length === 0" class="empty-orders">
            <el-empty description="У вас пока нет оформленных заказов">
              <el-button type="primary" @click="router.push('/catalog')">
                Перейти в каталог
              </el-button>
            </el-empty>
          </div>

          <div v-else class="orders-table-wrapper">
            <el-table :data="orders" style="width: 100%" class="orders-table">
              <el-table-column label="Номер заказа" min-width="150">
                <template #default="{ row }">
                  <span class="order-id">#{{ row.id.slice(0, 8) }}</span>
                </template>
              </el-table-column>

              <el-table-column label="Дата оформления" min-width="160">
                <template #default="{ row }">
                  <span>{{ formatDate(row.createdAt) }}</span>
                </template>
              </el-table-column>

              <el-table-column label="Статус" min-width="150">
                <template #default="{ row }">
                  <el-tag :type="getOrderStatusInfo(row.status).tagType" effect="light">
                    {{ getOrderStatusInfo(row.status).label }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column label="Товаров" width="110" align="center">
                <template #default="{ row }">
                  <span>{{ row.itemsCount || '—' }} шт.</span>
                </template>
              </el-table-column>

              <el-table-column label="Сумма" width="140" align="right">
                <template #default="{ row }">
                  <span class="order-sum">{{ formatCurrency(row.total) }}</span>
                </template>
              </el-table-column>

              <el-table-column label="Действия" width="130" align="center">
                <template #default="{ row }">
                  <el-button
                    type="primary"
                    link
                    size="small"
                    @click="viewOrderDetails(row.id)"
                  >
                    Подробнее
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- вкладка 2: избранные товары -->
        <el-tab-pane name="favorites">
          <template #label>
            <span class="tab-label">
              <el-icon><Star /></el-icon>
              Избранное ({{ favoritesStore.items.length }})
            </span>
          </template>

          <div v-if="favoritesStore.items.length === 0" class="empty-favs">
            <el-empty description="В избранном пока нет товаров">
              <el-button type="primary" @click="router.push('/catalog')">
                Выбрать товары
              </el-button>
            </el-empty>
          </div>

          <div v-else class="favorites-grid">
            <div v-for="prod in favoritesStore.items" :key="prod.id">
              <ProductCard :product="prod" />
            </div>
          </div>
        </el-tab-pane>

        <!-- вкладка 3: сохраненные адреса доставки -->
        <el-tab-pane name="addresses">
          <template #label>
            <span class="tab-label">
              <el-icon><Location /></el-icon>
              Мои адреса ({{ addressStore.addresses.length }})
            </span>
          </template>

          <div class="addresses-tab-content">
            <div class="tab-action-bar">
              <p class="tab-desc">Управляйте сохраненными адресами для быстрого оформления покупок</p>
              <el-button type="primary" :icon="Plus" @click="openAddAddressDialog">
                Добавить новый адрес
              </el-button>
            </div>

            <div v-if="addressStore.addresses.length === 0" class="empty-addresses">
              <el-empty description="У вас пока нет сохраненных адресов">
                <el-button type="primary" @click="openAddAddressDialog">
                  Добавить первый адрес
                </el-button>
              </el-empty>
            </div>

            <div v-else class="addresses-grid">
              <el-card
                v-for="addr in addressStore.addresses"
                :key="addr.id"
                shadow="hover"
                class="address-card-item"
              >
                <div class="addr-header">
                  <div class="addr-badge">
                    <el-icon><Location /></el-icon>
                    <span>Адрес доставки</span>
                  </div>
                  <el-button
                    type="danger"
                    link
                    size="small"
                    :icon="Delete"
                    title="Удалить адрес"
                    @click="handleDeleteAddress(addr.id)"
                  />
                </div>
                <div class="addr-body">
                  <p class="addr-main">
                    г. {{ addr.city }}, ул. {{ addr.street }}
                  </p>
                  <p class="addr-sub">
                    дом {{ addr.house }}
                    <span v-if="addr.apartment">, кв./офис {{ addr.apartment }}</span>
                  </p>
                  <p class="addr-country">{{ addr.country || 'Россия' }}</p>
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- модальное окно подробной информации о заказе (переиспользуемый компонент) -->
      <OrderDetailsModal
        v-model="isOrderDetailsOpen"
        :order="selectedOrder"
      />

      <!-- модальное окно добавления нового адреса доставки -->
      <el-dialog
        v-model="isAddressDialogOpen"
        title="Новый адрес доставки"
        width="520px"
        align-center
      >
        <AddressForm ref="addressFormCompRef" v-model="addressForm" />

        <template #footer>
          <div class="dialog-footer">
            <el-button @click="isAddressDialogOpen = false">Отмена</el-button>
            <el-button
              type="primary"
              :loading="isSavingAddress"
              @click="handleSaveAddress"
            >
              Сохранить адрес
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </MainLayout>
</template>

<style scoped>
/* стилизация страницы личного кабинета */
.profile-page {
  padding-bottom: 40px;
}

.profile-header {
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

.user-summary-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-card);
}

.avatar-icon {
  background-color: var(--color-primary);
  color: var(--color-primary-contrast);
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-full-name {
  margin: 0 0 4px 0;
  font-family: var(--font-sans);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
}

.user-email {
  margin: 0 0 8px 0;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-muted);
}

.user-tags {
  display: flex;
  align-items: center;
  gap: 12px;
}

.created-at {
  font-size: var(--font-size-caption);
  color: var(--color-text-subtle);
}

.profile-tabs :deep(.el-tabs__header) {
  margin-bottom: 24px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.orders-table-wrapper {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.order-id {
  font-weight: 600;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.order-sum {
  font-weight: 700;
  color: var(--color-text-main);
  font-variant-numeric: tabular-nums;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}

.order-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.modal-address-box {
  background-color: var(--color-bg-subtle);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
}

.modal-address-box h4 {
  margin: 0 0 6px 0;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-main);
}

.modal-address-box p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-body);
}

.mt-4 {
  margin-top: 16px;
  margin-bottom: 8px;
}

.modal-total-row {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 12px;
  margin-top: 12px;
  font-size: 1rem;
}

.total-big {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

/* стили вкладки управления адресами доставки */
.addresses-tab-content {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.tab-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.tab-desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-body-sm);
}

.addresses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.address-card-item {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  transition: all 0.2s ease;
}

.address-card-item:hover {
  border-color: var(--color-primary-border);
  box-shadow: var(--shadow-hover);
}

.addr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.addr-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  color: var(--color-primary);
}

.addr-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.addr-main {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-main);
}

.addr-sub {
  margin: 0;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-muted);
}

.addr-country {
  margin: 4px 0 0 0;
  font-size: var(--font-size-caption);
  color: var(--color-text-subtle);
}

.form-row {
  display: flex;
  gap: 16px;
}

.col-6 {
  flex: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 640px) {
  .user-summary-card {
    flex-direction: column;
    text-align: center;
    padding: 16px;
    gap: 12px;
  }

  .user-details {
    align-items: center;
  }

  .user-tags {
    flex-direction: column;
    gap: 6px;
  }

  .orders-table-wrapper {
    padding: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .addresses-tab-content {
    padding: 14px;
  }

  .tab-action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .tab-action-bar .el-button {
    width: 100%;
  }

  .addresses-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .favorites-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
