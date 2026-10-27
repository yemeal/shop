import type { Order } from '@/api';

export interface OrderStatusMeta {
  value: Order['status'];
  label: string;
  tagType: '' | 'success' | 'warning' | 'info' | 'danger';
}

export const ORDER_STATUS_MAP: Record<
  Order['status'],
  { label: string; tagType: '' | 'success' | 'warning' | 'info' | 'danger' }
> = {
  pending: { label: 'Ожидает оплаты', tagType: 'warning' },
  paid: { label: 'Оплачен', tagType: 'success' },
  processing: { label: 'В обработке', tagType: 'info' },
  shipped: { label: 'Отправлен покупателю', tagType: '' },
  completed: { label: 'Доставлен / Выполнен', tagType: 'success' },
  cancelled: { label: 'Отменен', tagType: 'danger' },
};

export const ORDER_STATUS_OPTIONS: OrderStatusMeta[] = (
  Object.keys(ORDER_STATUS_MAP) as Array<Order['status']>
).map((key) => ({
  value: key,
  label: ORDER_STATUS_MAP[key].label,
  tagType: ORDER_STATUS_MAP[key].tagType,
}));

export function getOrderStatusInfo(status: string) {
  const typedKey = status as Order['status'];
  if (typedKey in ORDER_STATUS_MAP) {
    return ORDER_STATUS_MAP[typedKey];
  }
  return {
    label: status,
    tagType: 'info' as const,
  };
}
