<script setup lang="ts">
import { Goods, Phone, Message, Location, Service } from '@element-plus/icons-vue';

// текущий год для отображения в копирайте
const currentYear = new Date().getFullYear();
</script>

<template>
  <!-- подвал настоящего интернет-магазина -->
  <footer class="app-footer">
    <div class="footer-main">
      <div class="footer-container">
        <!-- колонка 1: бренд и краткое описание -->
        <div class="footer-col brand-col">
          <div class="brand">
            <el-icon class="brand-icon"><Goods /></el-icon>
            <span class="brand-title">ТехноШоп</span>
          </div>
          <p class="brand-desc">
            Современный интернет-магазин электроники, гаджетов и умных устройств. Мы предлагаем
            только оригинальную продукцию с гарантией качества и быстрой доставкой по всей стране.
          </p>
          <div class="contacts-list">
            <div class="contact-item">
              <el-icon><Phone /></el-icon>
              <span>8 (800) 555-35-35 (Бесплатно по РФ)</span>
            </div>
            <div class="contact-item">
              <el-icon><Message /></el-icon>
              <span>support@shop.ru</span>
            </div>
            <div class="contact-item">
              <el-icon><Location /></el-icon>
              <span>г. Москва, Пресненская наб., д. 12</span>
            </div>
          </div>
        </div>

        <!-- колонка 2: покупателям -->
        <div class="footer-col">
          <h4 class="col-title">Покупателям</h4>
          <ul class="footer-links">
            <li><router-link to="/catalog">Каталог товаров</router-link></li>
            <li><router-link to="/favorites">Избранное</router-link></li>
            <li><router-link to="/cart">Корзина и заказ</router-link></li>
            <li><a href="#delivery" @click.prevent>Доставка и оплата</a></li>
            <li><a href="#warranty" @click.prevent>Гарантия и возврат</a></li>
          </ul>
        </div>

        <!-- колонка 3: о компании -->
        <div class="footer-col">
          <h4 class="col-title">О компании</h4>
          <ul class="footer-links">
            <li><a href="#about" @click.prevent>О магазине</a></li>
            <li><a href="#news" @click.prevent>Новости и акции</a></li>
            <li><a href="#privacy" @click.prevent>Политика конфиденциальности</a></li>
            <li><a href="#terms" @click.prevent>Пользовательское соглашение</a></li>
            <li><a href="#careers" @click.prevent>Вакансии</a></li>
          </ul>
        </div>

        <!-- колонка 4: сервис и часы работы -->
        <div class="footer-col">
          <h4 class="col-title">Служба заботы</h4>
          <p class="service-text">
            Круглосуточный приём заказов на сайте. Операторы службы поддержки на связи ежедневно с
            9:00 до 22:00.
          </p>
          <div class="payment-methods">
            <span class="payment-badge">МИР</span>
            <span class="payment-badge">Visa</span>
            <span class="payment-badge">MasterCard</span>
            <span class="payment-badge">СБП</span>
          </div>
        </div>
      </div>
    </div>

    <!-- нижняя плашка с копирайтом -->
    <div class="footer-bottom">
      <div class="footer-container bottom-container">
        <p class="copyright-text">
          © {{ currentYear }} ТехноШоп. Все права защищены. Цены и наличие товаров актуальны на
          текущий момент.
        </p>
        <div class="secure-badge">
          <el-icon><Service /></el-icon>
          <span>Безопасная оплата 256-bit SSL</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* основной контейнер подвала */
.app-footer {
  margin-top: auto;
  background-color: var(--color-text-main);
  color: var(--color-text-subtle);
  font-size: var(--font-size-body-sm);
  font-family: var(--font-sans);
}

.footer-main {
  padding: 48px 0 36px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.footer-main .footer-container {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  gap: 40px;
}

@media (max-width: 900px) {
  .footer-main .footer-container {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
}

@media (max-width: 560px) {
  .footer-main .footer-container {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

/* колонка бренда */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.35rem;
  letter-spacing: var(--tracking-tightest);
  color: #ffffff;
  margin-bottom: 14px;
}

.brand-icon {
  font-size: 1.5rem;
  color: var(--color-primary);
}

.brand-desc {
  line-height: 1.6;
  margin: 0 0 18px 0;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-subtle);
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--font-size-body-sm);
  color: var(--color-border);
}

/* заголовки колонок */
.col-title {
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  margin: 0 0 16px 0;
}

/* списки ссылок */
.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-links a {
  color: var(--color-text-subtle);
  text-decoration: none;
  font-size: var(--font-size-body-sm);
  transition: color 0.2s;
}

.footer-links a:hover {
  color: var(--color-primary-border);
}

/* колонка сервиса */
.service-text {
  line-height: 1.5;
  margin: 0 0 16px 0;
  font-size: var(--font-size-body-sm);
}

.payment-methods {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.payment-badge {
  background-color: rgba(255, 255, 255, 0.06);
  color: var(--color-border);
  padding: 4px 10px;
  border-radius: var(--radius-xs);
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* нижняя часть подвала */
.footer-bottom {
  padding: 20px 0;
  background-color: rgba(0, 0, 0, 0.3);
  font-size: var(--font-size-caption);
}

.bottom-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.copyright-text {
  margin: 0;
  color: var(--color-text-muted);
}

.secure-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-success);
  font-weight: 500;
}
</style>
