<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import ProductCard from '@/components/product/ProductCard.vue';
import ProductQuickViewModal from '@/components/product/ProductQuickViewModal.vue';
import { api, type Product, type Category } from '@/api';
import { Goods, Van, CircleCheck, Service, ArrowRight } from '@element-plus/icons-vue';

const router = useRouter();

// список популярных товаров для главной
const popularProducts = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const isLoading = ref<boolean>(false);

// быстрый просмотр
const isQuickViewOpen = ref<boolean>(false);
const quickViewProduct = ref<Product | null>(null);

function openQuickView(product: Product) {
  quickViewProduct.value = product;
  isQuickViewOpen.value = true;
}

// баннеры главной страницы
const banners = [
  {
    title: 'Новая коллекция электроники и аксессуаров',
    subtitle: 'Лучшие цены, быстрая доставка и официальная гарантия на все товары.',
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1a73e8 100%)',
  },
  {
    title: 'Специальные предложения для постоянных клиентов',
    subtitle: 'Зарегистрируйтесь сегодня и получите доступ к эксклюзивным скидкам.',
    bg: 'linear-gradient(135deg, #064e3b 0%, #047857 60%, #10b981 100%)',
  },
];

async function loadData() {
  isLoading.value = true;
  try {
    const [productsRes, catsRes] = await Promise.all([
      api.catalog.products({ limit: 8, sortBy: 'created_at', sortOrder: 'desc' }),
      api.catalog.categories({ limit: 6 }),
    ]);
    popularProducts.value = productsRes.items || [];
    categories.value = catsRes.items || [];
  } catch {
    popularProducts.value = [];
    categories.value = [];
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <MainLayout>
    <div class="home-page">
      <!-- главный промо-баннер (карусель) -->
      <section class="hero-section">
        <el-carousel height="320px" class="hero-carousel">
          <el-carousel-item v-for="(b, i) in banners" :key="i">
            <div class="banner-slide" :style="{ background: b.bg }">
              <div class="banner-content">
                <h1 class="banner-title">{{ b.title }}</h1>
                <p class="banner-subtitle">{{ b.subtitle }}</p>
                <el-button
                  type="warning"
                  size="large"
                  class="banner-btn"
                  :icon="ArrowRight"
                  @click="router.push('/catalog')"
                >
                  Перейти в каталог
                </el-button>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>
      </section>

      <!-- преимущества магазина -->
      <section class="features-section">
        <div class="features-grid">
          <div class="feature-item">
            <el-icon class="feature-icon"><Van /></el-icon>
            <div class="feature-text">
              <h4>Быстрая доставка</h4>
              <p>Доставляем заказы прямо до вашей двери за 1-2 дня</p>
            </div>
          </div>
          <div class="feature-item">
            <el-icon class="feature-icon"><CircleCheck /></el-icon>
            <div class="feature-text">
              <h4>Гарантия качества</h4>
              <p>Только проверенная и оригинальная продукция</p>
            </div>
          </div>
          <div class="feature-item">
            <el-icon class="feature-icon"><Service /></el-icon>
            <div class="feature-text">
              <h4>Поддержка 24/7</h4>
              <p>Всегда готовы ответить на любые ваши вопросы</p>
            </div>
          </div>
        </div>
      </section>

      <!-- популярные категории -->
      <section v-if="categories.length" class="section-block">
        <div class="section-header">
          <h2 class="section-title">Популярные категории</h2>
          <el-button link type="primary" @click="router.push('/catalog')">
            Все категории →
          </el-button>
        </div>
        <div class="categories-grid">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="category-card"
            @click="router.push({ path: '/catalog', query: { category: cat.id } })"
          >
            <el-icon class="cat-icon"><Goods /></el-icon>
            <span class="cat-name">{{ cat.name }}</span>
            <span class="cat-count">{{ cat.productCount }} товаров</span>
          </div>
        </div>
      </section>

      <!-- новинки и популярные товары -->
      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">Новинки каталога</h2>
          <el-button link type="primary" @click="router.push('/catalog')">
            Смотреть все →
          </el-button>
        </div>

        <div v-if="isLoading" class="loading">
          <el-skeleton :rows="4" animated />
        </div>

        <div v-else-if="popularProducts.length === 0" class="empty">
          <p>В каталоге пока нет добавленных товаров.</p>
        </div>

        <div v-else class="products-grid">
          <div v-for="prod in popularProducts" :key="prod.id">
            <ProductCard :product="prod" @quick-view="openQuickView" />
          </div>
        </div>
      </section>

      <!-- модальное окно быстрого просмотра -->
      <ProductQuickViewModal v-model="isQuickViewOpen" :product="quickViewProduct" />
    </div>
  </MainLayout>
</template>

<style scoped>
/* стили главной страницы */
.home-page {
  display: flex;
  flex-direction: column;
  gap: 40px;
  padding-bottom: 40px;
}

.hero-carousel {
  border-radius: 16px;
  overflow: hidden;
}

.banner-slide {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 48px;
  color: #ffffff;
}

.banner-content {
  max-width: 600px;
}

.banner-title {
  font-family: var(--font-sans);
  font-size: clamp(1.75rem, 3vw, 2.35rem);
  font-weight: 700;
  letter-spacing: var(--tracking-tightest, -0.035em);
  line-height: 1.2;
  margin: 0 0 12px 0;
  color: #ffffff !important;
}

.banner-subtitle {
  font-family: var(--font-sans);
  font-size: var(--font-size-lead, 1.05rem);
  letter-spacing: var(--tracking-normal, -0.008em);
  color: rgba(255, 255, 255, 0.9) !important;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.banner-btn {
  font-family: var(--font-sans);
  font-weight: 600;
  letter-spacing: var(--tracking-tight, -0.015em);
  border-radius: var(--radius-md, 10px);
}

/* преимущества */
.features-section {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px 32px;
  box-shadow: var(--shadow-card);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.feature-icon {
  font-size: 2.2rem;
  color: var(--color-primary);
}

.feature-text h4 {
  margin: 0 0 4px 0;
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
}

.feature-text p {
  margin: 0;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-muted);
}

/* секции категорий и товаров */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--font-size-h2);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.category-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--shadow-card);
}

.category-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
  border-color: var(--color-primary-border);
}

.cat-icon {
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.cat-name {
  font-family: var(--font-sans);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
  margin-bottom: 4px;
}

.cat-count {
  font-size: var(--font-size-caption);
  color: var(--color-text-subtle);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

@media (max-width: 640px) {
  .hero-carousel :deep(.el-carousel__container) {
    height: 220px !important;
  }

  .banner-slide {
    padding: 0 16px;
  }

  .banner-title {
    font-size: 1.15rem !important;
    margin-bottom: 6px;
    line-height: 1.25;
  }

  .banner-subtitle {
    font-size: 0.8rem !important;
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .banner-btn {
    padding: 8px 16px;
    font-size: 0.85rem;
  }

  .features-section {
    padding: 16px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .category-card {
    padding: 14px;
  }

  .products-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
