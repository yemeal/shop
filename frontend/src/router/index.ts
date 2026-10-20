import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';

// определение списка маршрутов приложения
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Главная' },
  },
  {
    path: '/catalog',
    name: 'catalog',
    component: () => import('@/views/CatalogView.vue'),
    meta: { title: 'Каталог товаров' },
  },
  {
    path: '/catalog/:id',
    name: 'product-detail',
    component: () => import('@/views/ProductDetailView.vue'),
    meta: { title: 'Карточка товара' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Вход в систему', guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: 'Регистрация', guestOnly: true },
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/views/CartView.vue'),
    meta: { title: 'Корзина', requiresAuth: true },
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/views/CheckoutView.vue'),
    meta: { title: 'Оформление заказа', requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: 'Личный кабинет', requiresAuth: true },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesView.vue'),
    meta: { title: 'Избранное', requiresAuth: true },
  },
  // админские маршруты
  {
    path: '/admin',
    redirect: '/admin/products',
  },
  {
    path: '/admin/products',
    name: 'admin-products',
    component: () => import('@/views/admin/AdminProductsView.vue'),
    meta: { title: 'Управление товарами', requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/categories',
    name: 'admin-categories',
    component: () => import('@/views/admin/AdminCategoriesView.vue'),
    meta: { title: 'Управление категориями', requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/orders',
    name: 'admin-orders',
    component: () => import('@/views/admin/AdminOrdersView.vue'),
    meta: { title: 'Управление заказами', requiresAuth: true, requiresAdmin: true },
  },
  // 404 - страница не найдена
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Страница не найдена' },
  },
];

// создание экземпляра роутера с html5 history режимом
export const router = createRouter({
  history: createWebHistory(),
  routes,
  // прокрутка наверх при переходе между страницами
  scrollBehavior() {
    return { top: 0 };
  },
});

// глобальный навигационный страж (navigation guard)
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();
  const cartStore = useCartStore();
  const favoritesStore = useFavoritesStore();

  // если статус авторизации еще не проверен — подтягиваем пользователя по cookie один раз
  if (!authStore.isInitialized) {
    const user = await authStore.checkAuth();
    if (user) {
      cartStore.fetchCart();
      favoritesStore.fetchFavorites(user.id);
    }
  }

  // установка заголовка страницы
  if (to.meta.title) {
    document.title = `${to.meta.title} — Интернет-магазин`;
  }

  // проверка доступа к приватным страницам
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  // проверка прав администратора
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'home' });
  }

  // запрет перехода на страницы логина/регистрации для уже авторизованных
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return next({ name: 'home' });
  }

  next();
});
