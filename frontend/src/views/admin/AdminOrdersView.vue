<script setup lang="ts">
import { ref, onMounted } from 'vue';
import MainLayout from '@/components/layout/MainLayout.vue';
import OrderDetailsModal from '@/components/common/OrderDetailsModal.vue';
import { api, type Order } from '@/api';
import { ORDER_STATUS_OPTIONS } from '@/constants/orderStatus';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';

// список заказов и пагинация
const orders = ref<Order[]>([]);
const totalOrders = ref<number>(0);
const currentPage = ref<number>(1);
const pageSize = ref<number>(10);
const statusFilter = ref<string>('');
const isLoading = ref<boolean>(false);

// детальный просмотр заказа
const selectedOrder = ref<Order | null>(null);
const isOrderDetailsOpen = ref<boolean>(false);

// загрузка всех заказов магазина через админский api метод
async function loadOrders() {
  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;
    const res = await api.orders.list({
      limit: pageSize.value,
      offset,
      status: (statusFilter.value as Order['status']) || undefined,
    });
    orders.value = res.items || [];
    totalOrders.value = res.total || 0;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось загрузить заказы');
  } finally {
    isLoading.value = false;
  }
}

// сброс страницы при смене фильтра статуса
function handleStatusFilterChange() {
  currentPage.value = 1;
  loadOrders();
}

// изменение статуса заказа администратором с сохранением на сервере
async function handleStatusChange(orderId: string, newStatus: Order['status']) {
  try {
    const updated = await api.orders.updateStatus(orderId, newStatus);
    ElMessage.success(`Статус заказа #${orderId.slice(0, 8)} изменен`);

    // локальное обновление в таблице
    const found = orders.value.find((o) => o.id === orderId);
    if (found) {
      found.status = updated.status;
    }
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось обновить статус заказа');
    await loadOrders();
  }
}

// просмотр деталей
async function viewDetails(orderId: string) {
  try {
    selectedOrder.value = await api.orders.get(orderId);
    isOrderDetailsOpen.value = true;
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось получить состав заказа');
  }
}

onMounted(() => {
  loadOrders();
});
</script>

<template>
  <MainLayout>
    <div class="admin-orders-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Управление заказами</h1>
          <p class="page-subtitle">
            Просмотр заказов клиентов и оперативное изменение статусов доставки
          </p>
        </div>
        <div class="header-actions">
          <el-select
            v-model="statusFilter"
            placeholder="Все статусы"
            clearable
            style="width: 170px"
            @change="handleStatusFilterChange"
          >
            <el-option
              v-for="opt in ORDER_STATUS_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-button :icon="Refresh" @click="loadOrders">Обновить</el-button>
        </div>
      </div>

      <div class="table-card">
        <el-table v-loading="isLoading" :data="orders" style="width: 100%" stripe>
          <el-table-column label="ID заказа" min-width="140">
            <template #default="{ row }">
              <span class="order-id">#{{ row.id.slice(0, 8) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="Покупатель" min-width="200">
            <template #default="{ row }">
              <div v-if="row.user" class="customer-info">
                <span class="customer-name" :title="row.user.email">
                  {{
                    row.user.firstName
                      ? `${row.user.firstName} ${row.user.lastName || ''}`.trim()
                      : row.user.email
                  }}
                </span>
                <span class="customer-email">{{ row.user.email }}</span>
              </div>
              <el-tag v-else size="small" type="info">#{{ row.userId.slice(0, 8) }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="Дата" min-width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="Товаров" width="110" align="center">
            <template #default="{ row }"> {{ row.itemsCount || '—' }} шт. </template>
          </el-table-column>

          <el-table-column label="Сумма" width="140" align="right">
            <template #default="{ row }">
              <strong>{{ formatCurrency(row.total) }}</strong>
            </template>
          </el-table-column>

          <!-- выпадающий список изменения статуса заказа -->
          <el-table-column label="Статус заказа" width="220" align="center">
            <template #default="{ row }">
              <el-select
                :model-value="row.status"
                size="default"
                style="width: 190px"
                @update:model-value="(val: Order['status']) => handleStatusChange(row.id, val)"
              >
                <el-option
                  v-for="opt in ORDER_STATUS_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                >
                  <el-tag :type="opt.tagType" size="small">{{ opt.label }}</el-tag>
                </el-option>
              </el-select>
            </template>
          </el-table-column>

          <!-- кнопка деталей -->
          <el-table-column label="Действия" width="120" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetails(row.id)">
                Состав
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- пагинация списка заказов -->
        <div v-if="totalOrders > pageSize" class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="totalOrders"
            layout="prev, pager, next, total"
            @current-change="loadOrders"
          />
        </div>
      </div>

      <!-- модальное окно подробного просмотра заказа (единый компонент) -->
      <OrderDetailsModal v-model="isOrderDetailsOpen" :order="selectedOrder" />
    </div>
  </MainLayout>
</template>

<style scoped>
/* страница управления заказами */
.admin-orders-page {
  padding-bottom: 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-h1);
  font-weight: 700;
  letter-spacing: var(--tracking-tighter);
  color: var(--color-text-main);
  display: flex;
  align-items: center;
  margin: 0 0 6px 0;
}

.page-subtitle {
  font-family: var(--font-sans);
  font-size: var(--font-size-lead);
  color: var(--color-text-muted);
  margin: 0;
}

.table-card {
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

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-head {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 12px;
}

.addr-box {
  background-color: var(--color-bg-subtle);
  padding: 12px;
  border-radius: var(--radius-sm);
}

.addr-box h4 {
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-main);
}

.addr-box p {
  margin: 0;
  color: var(--color-text-body);
}

.tot-bar {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 12px;
  font-size: 1.1rem;
}

.tot-price {
  font-family: var(--font-sans);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: var(--tracking-tighter);
  font-variant-numeric: tabular-nums;
  color: var(--color-primary);
}

.mr-2 {
  margin-right: 8px;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-name {
  font-weight: 600;
  color: var(--color-text-main);
  font-size: 0.9rem;
}

.customer-email {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
