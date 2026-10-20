<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppFooter from './AppFooter.vue';
// основной макет страницы с шапкой и подвалом
</script>

<template>
  <div class="layout-wrapper">
    <AppHeader />
    <main class="main-content">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
/* обертка для прижатия футера к низу страницы */
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 20px;
}

@media (max-width: 640px) {
  .main-content {
    padding: 16px 12px;
  }
}
</style>
