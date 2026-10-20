<script setup lang="ts">
import type { Order } from '@/api';
import { getOrderStatusInfo } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/formatters';
import { Location } from '@element-plus/icons-vue';

defineProps<{
  modelValue: boolean;
  order: Order | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="Информация о заказе"
    width="650px"
    align-center
    @update:model-value="(val: boolean) => emit('update:modelValue', val)"
  >
    <div v-if="order" class="order-modal-body">
      <div class="modal-info-bar">
        <div>
          <span class="label">Заказ: </span>
          <strong>#{{ order.id }}</strong>
        </div>
        <div>
          <el-tag :type="getOrderStatusInfo(order.status).tagType">
            {{ getOrderStatusInfo(order.status).label }}
          </el-tag>
        </div>
      </div>

      <div v-if="order.deliveryAddress" class="modal-address-box">
        <h4><el-icon><Location /></el-icon> Адрес доставки</h4>
        <p>
          {{ order.deliveryAddress.country || 'Россия' }},
          г. {{ order.deliveryAddress.city }},
          ул. {{ order.deliveryAddress.street }},
          д. {{ order.deliveryAddress.house }}
          <span v-if="order.deliveryAddress.apartment">
            , кв. {{ order.deliveryAddress.apartment }}
          </span>
        </p>
      </div>

      <h4 class="mt-4">Состав заказа</h4>
      <el-table :data="order.items" style="width: 100%" size="small">
        <el-table-column prop="productName" label="Наименование" />
        <el-table-column prop="quantity" label="Кол-во" width="80" align="center" />
        <el-table-column label="Цена" width="110" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.unitPrice) }}
          </template>
        </el-table-column>
        <el-table-column label="Сумма" width="120" align="right">
          <template #default="{ row }">
            <strong>{{ formatCurrency(row.lineTotal) }}</strong>
          </template>
        </el-table-column>
      </el-table>

      <div class="modal-total-row">
        <span>Итоговая сумма:</span>
        <span class="total-big">{{ formatCurrency(order.total) }}</span>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.order-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-x: hidden;
}

.order-modal-body :deep(.el-table) {
  max-width: 100%;
}

.modal-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.modal-info-bar .label {
  color: var(--color-text-muted);
}

.modal-address-box {
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
}

.modal-address-box h4 {
  margin: 0 0 6px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
}

.modal-address-box p {
  margin: 0;
  color: var(--color-text-body);
  font-size: 0.9rem;
}

.mt-4 {
  margin: 8px 0 4px 0;
  font-size: 0.95rem;
}

.modal-total-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  font-size: 1rem;
}

.total-big {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
}
</style>
