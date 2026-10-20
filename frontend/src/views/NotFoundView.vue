<script setup lang="ts">
import MainLayout from '@/components/layout/MainLayout.vue';
import { useRouter } from 'vue-router';

// роутер для навигации
const router = useRouter();
</script>

<template>
  <MainLayout>
    <div class="not-found-container">
      <el-result
        icon="warning"
        title="404 — Страница не найдена"
        sub-title="Запрашиваемая страница перемещена или никогда не существовала."
      >
        <template #extra>
          <el-button type="primary" @click="router.push('/')">
            Вернуться на главную
          </el-button>
        </template>
      </el-result>
    </div>
  </MainLayout>
</template>

<style scoped>
/* центрирование контейнера 404 */
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}
</style>
