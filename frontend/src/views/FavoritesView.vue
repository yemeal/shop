<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import ProductCard from '@/components/product/ProductCard.vue';
import { useAuthStore } from '@/stores/auth';
import { useFavoritesStore } from '@/stores/favorites';

const router = useRouter();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();

onMounted(async () => {
  if (authStore.user) {
    await favoritesStore.fetchFavorites(authStore.user.id);
  }
});
</script>

<template>
  <MainLayout>
    <div class="favorites-page">
      <div class="page-header">
        <h1 class="page-title">Моё избранное</h1>
        <p class="page-subtitle">
          Товары, которые вы сохранили для будущих покупок
        </p>
      </div>

      <!-- состояние пустого списка избранного -->
      <div v-if="favoritesStore.items.length === 0" class="empty-state">
        <el-empty description="В вашем списке избранного пока ничего нет">
          <el-button type="primary" size="large" @click="router.push('/catalog')">
            Перейти в каталог
          </el-button>
        </el-empty>
      </div>

      <!-- сетка избранных товаров -->
      <div v-else class="favorites-grid">
        <div v-for="product in favoritesStore.items" :key="product.id">
          <ProductCard :product="product" />
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
/* страница избранного */
.favorites-page {
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
  display: flex;
  align-items: center;
  margin: 0 0 6px 0;
}

.mr-2 {
  margin-right: 8px;
  color: var(--color-star);
}

.page-subtitle {
  font-family: var(--font-sans);
  font-size: var(--font-size-lead);
  color: var(--color-text-muted);
  margin: 0;
}

.empty-state {
  padding: 60px 0;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
</style>
