<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useAddressStore } from '@/stores/addresses';
import { ElMessage } from 'element-plus';
import {
  ShoppingCart,
  Star,
  User as UserIcon,
  Setting,
  SwitchButton,
  Goods,
  Management,
  Document,
} from '@element-plus/icons-vue';

// роутер для переходов
const router = useRouter();
// хранилища состояний
const authStore = useAuthStore();
const cartStore = useCartStore();
const favoritesStore = useFavoritesStore();
const addressStore = useAddressStore();

// отображаемое имя пользователя
const displayName = computed(() => {
  if (!authStore.user) return '';
  const first = authStore.user.firstName || '';
  const last = authStore.user.lastName || '';
  const full = `${first} ${last}`.trim();
  return full || authStore.user.email;
});

// выход из системы
async function handleLogout() {
  try {
    await authStore.logout();
    favoritesStore.clear();
    cartStore.clearLocal();
    addressStore.clear();
    ElMessage.success('Вы успешно вышли из системы');
    router.push({ name: 'home' });
  } catch {
    ElMessage.error('Ошибка при выходе из системы');
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-container">
      <!-- логотип и название магазина -->
      <router-link to="/" class="brand">
        <el-icon class="brand-icon"><Goods /></el-icon>
        <span class="brand-title">ТехноШоп</span>
      </router-link>

      <!-- навигационные ссылки -->
      <nav class="nav-links">
        <router-link to="/" class="nav-link nav-home" active-class="active">Главная</router-link>
        <router-link to="/catalog" class="nav-link" active-class="active">Каталог</router-link>
      </nav>

      <!-- правая часть с действиями пользователя -->
      <div class="header-actions">
        <!-- ссылка на избранное с бейджем -->
        <router-link to="/favorites" class="action-btn" title="Избранное">
          <el-badge
            :value="favoritesStore.items.length"
            :hidden="favoritesStore.items.length === 0"
            class="badge-item"
          >
            <el-button circle :icon="Star" />
          </el-badge>
        </router-link>

        <!-- ссылка на корзину с бейджем количества товаров -->
        <router-link to="/cart" class="action-btn" title="Корзина">
          <el-badge
            :value="cartStore.itemsCount"
            :hidden="cartStore.itemsCount === 0"
            type="primary"
            class="badge-item"
          >
            <el-button circle :icon="ShoppingCart" />
          </el-badge>
        </router-link>

        <!-- блок профиля авторизованного пользователя -->
        <template v-if="authStore.isAuthenticated">
          <el-dropdown trigger="click">
            <div class="user-pill-btn" role="button" tabindex="0">
              <div class="user-avatar-circle">
                <el-icon><UserIcon /></el-icon>
              </div>
              <span class="user-name">{{ displayName }}</span>
              <span v-if="authStore.isAdmin" class="admin-chip">Админ</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="user-dropdown-menu">
                <el-dropdown-item @click="router.push('/profile')">
                  <el-icon><UserIcon /></el-icon>
                  Личный кабинет
                </el-dropdown-item>
                <el-dropdown-item @click="router.push('/favorites')">
                  <el-icon><Star /></el-icon>
                  Моё избранное
                </el-dropdown-item>
                
                <!-- секция администратора -->
                <template v-if="authStore.isAdmin">
                  <el-dropdown-item divided disabled>
                    <strong class="text-caption">Панель администратора</strong>
                  </el-dropdown-item>
                  <el-dropdown-item @click="router.push('/admin/products')">
                    <el-icon><Management /></el-icon>
                    Управление товарами
                  </el-dropdown-item>
                  <el-dropdown-item @click="router.push('/admin/categories')">
                    <el-icon><Setting /></el-icon>
                    Управление категориями
                  </el-dropdown-item>
                  <el-dropdown-item @click="router.push('/admin/orders')">
                    <el-icon><Document /></el-icon>
                    Все заказы
                  </el-dropdown-item>
                </template>

                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  Выйти
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>

        <!-- блок кнопок для неавторизованного гостя -->
        <template v-else>
          <div class="auth-buttons">
            <el-button class="btn-login" @click="router.push('/login')">Войти</el-button>
            <el-button class="btn-register" type="primary" @click="router.push('/register')">
              Регистрация
            </el-button>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* стилизация шапки сайта */
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* стили логотипа */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: var(--tracking-tightest);
  color: var(--color-text-main);
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.brand:hover {
  opacity: 0.85;
}

.brand-icon {
  font-size: 1.35rem;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background-color: var(--color-primary-subtle);
  border-radius: var(--radius-sm);
}

/* навигационное меню */
.nav-links {
  display: flex;
  gap: 8px;
}

.nav-link {
  font-size: var(--font-size-body);
  font-weight: 500;
  letter-spacing: var(--tracking-normal);
  color: var(--color-text-muted);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-link:hover {
  color: var(--color-primary);
  background-color: var(--color-border-subtle);
}

.nav-link.active {
  color: var(--color-primary);
  background-color: var(--color-primary-subtle);
  font-weight: 600;
}

/* правая колонка действий */
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.action-btn {
  display: inline-flex;
}

.action-btn :deep(.el-button) {
  border-color: var(--color-border);
  color: var(--color-text-muted);
  transition: all 0.2s ease;
}

.action-btn :deep(.el-button:hover) {
  color: var(--color-primary);
  border-color: var(--color-primary-border);
  background-color: var(--color-primary-subtle);
}

.badge-item :deep(.el-badge__content) {
  top: 4px;
  right: 4px;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 11px;
}

/* кнопка профиля пользователя */
.user-pill-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 5px;
  border-radius: var(--radius-pill);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.user-pill-btn:hover {
  border-color: var(--color-primary-border);
  box-shadow: var(--shadow-sm);
}

.user-avatar-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--color-primary-subtle);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.user-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-body-sm);
  font-weight: 600;
  letter-spacing: var(--tracking-normal);
  color: var(--color-text-main);
}

.admin-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  line-height: 1.2;
}

.auth-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* мобильная адаптивность */
@media (max-width: 640px) {
  .header-container {
    padding: 0 10px;
    height: 52px;
  }

  .brand {
    gap: 6px;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
    font-size: 1.1rem;
  }

  .brand-title {
    font-size: 1.05rem;
  }

  /* на мобильных скрываем "Главная" (кликом на логотип уже переходит на главную) */
  .nav-home {
    display: none !important;
  }

  .nav-link {
    padding: 4px 8px;
    font-size: 0.85rem;
  }

  .header-actions {
    gap: 6px;
  }

  .action-btn :deep(.el-button) {
    width: 32px;
    height: 32px;
    font-size: 13px;
  }

  .user-pill-btn {
    padding: 3px 6px;
  }

  .user-name,
  .admin-chip {
    display: none;
  }

  .auth-buttons {
    gap: 6px;
  }

  /* на мобилках скрываем длинную кнопку "Регистрация", оставляя только компактную "Войти" */
  .btn-register {
    display: none !important;
  }

  .btn-login {
    padding: 5px 10px !important;
    font-size: 0.8rem !important;
    height: 32px !important;
  }
}
</style>
