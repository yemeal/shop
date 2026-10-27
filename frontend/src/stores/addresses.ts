import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, type DeliveryAddress } from '@/api';

// хранилище сохраненных адресов доставки пользователя
export const useAddressStore = defineStore('addresses', () => {
  // список адресов текущего пользователя
  const addresses = ref<DeliveryAddress[]>([]);
  // индикатор загрузки
  const isLoading = ref<boolean>(false);
  // ошибка при операциях с адресами
  const error = ref<string | null>(null);

  // загрузка всех адресов пользователя
  async function fetchAddresses(userId: string): Promise<DeliveryAddress[]> {
    if (!userId) {
      addresses.value = [];
      return [];
    }
    isLoading.value = true;
    error.value = null;
    try {
      // запрос списка адресов с бэкенда
      const res = await api.addresses.list(userId);
      addresses.value = res.items || [];
      return addresses.value;
    } catch (err) {
      error.value = (err as Error)?.message || 'Не удалось загрузить сохраненные адреса';
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // добавление нового адреса пользователя
  async function addAddress(
    userId: string,
    data: {
      country?: string;
      city: string;
      street: string;
      house: string;
      apartment?: string | null;
    },
  ): Promise<DeliveryAddress> {
    isLoading.value = true;
    error.value = null;
    try {
      // сохранение на бэкенде
      const newAddress = await api.addresses.create(userId, data);
      addresses.value.unshift(newAddress);
      return newAddress;
    } catch (err) {
      error.value = (err as Error)?.message || 'Не удалось сохранить адрес';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // удаление адреса
  async function removeAddress(userId: string, addressId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      // удаление на сервере
      await api.addresses.delete(userId, addressId);
      addresses.value = addresses.value.filter((a) => a.id !== addressId);
    } catch (err) {
      error.value = (err as Error)?.message || 'Не удалось удалить адрес';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    addresses,
    isLoading,
    error,
    fetchAddresses,
    addAddress,
    removeAddress,
    clear() {
      addresses.value = [];
    },
  };
});
