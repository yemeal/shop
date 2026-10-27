<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import MainLayout from '@/components/layout/MainLayout.vue';
import { Lock, Message } from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const cartStore = useCartStore();
const favoritesStore = useFavoritesStore();

// ссылка на элемент формы для валидации
const formRef = ref<FormInstance>();
// флаг отправки формы
const isSubmitting = ref<boolean>(false);
// сообщение об ошибке сервера
const serverError = ref<string | null>(null);

// модель данных формы авторизации
const form = reactive({
  email: '',
  password: '',
});

// правила валидации полей
const rules: FormRules = {
  email: [
    { required: true, message: 'Пожалуйста, укажите email', trigger: 'blur' },
    { type: 'email', message: 'Введите корректный email адрес', trigger: ['blur', 'change'] },
  ],
  password: [
    { required: true, message: 'Пожалуйста, введите пароль', trigger: 'blur' },
    { min: 6, message: 'Пароль должен содержать минимум 6 символов', trigger: 'blur' },
  ],
};

// обработчик отправки формы входа
async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    serverError.value = null;
    isSubmitting.value = true;
    try {
      const user = await authStore.login(form.email, form.password);
      ElMessage.success(`Добро пожаловать, ${user.firstName || user.email}!`);

      // подгружаем данные пользователя после авторизации
      await cartStore.fetchCart();
      await favoritesStore.fetchFavorites(user.id);

      // редирект на запрошенную страницу или в каталог
      const redirectPath = (route.query.redirect as string) || '/catalog';
      router.push(redirectPath);
    } catch (err: any) {
      serverError.value = err?.message || 'Неверный email или пароль';
    } finally {
      isSubmitting.value = false;
    }
  });
}
</script>

<template>
  <MainLayout>
    <div class="auth-page">
      <el-card class="auth-card" shadow="always">
        <template #header>
          <div class="auth-card-header">
            <h2 class="auth-title">Вход в личный кабинет</h2>
            <p class="auth-subtitle">Введите учетные данные для доступа</p>
          </div>
        </template>

        <!-- алерт при ошибке сервера -->
        <el-alert
          v-if="serverError"
          :title="serverError"
          type="error"
          show-icon
          closable
          class="server-error-alert"
          @close="serverError = null"
        />

        <!-- форма авторизации -->
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          status-icon
          @submit.prevent="handleSubmit"
        >
          <!-- поле email -->
          <el-form-item label="Email" prop="email">
            <el-input
              v-model="form.email"
              placeholder="example@mail.ru"
              :prefix-icon="Message"
              autocomplete="email"
            />
          </el-form-item>

          <!-- поле пароль -->
          <el-form-item label="Пароль" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="••••••••"
              :prefix-icon="Lock"
              autocomplete="current-password"
            />
          </el-form-item>

          <!-- кнопка входа -->
          <el-button
            type="primary"
            native-type="submit"
            size="large"
            :loading="isSubmitting"
            class="submit-btn"
          >
            Войти
          </el-button>
        </el-form>

        <template #footer>
          <div class="auth-card-footer">
            <span>Ещё нет аккаунта?</span>
            <router-link to="/register" class="register-link"> Зарегистрироваться </router-link>
          </div>
        </template>
      </el-card>
    </div>
  </MainLayout>
</template>

<style scoped>
/* центрирование формы авторизации */
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.auth-card-header {
  text-align: center;
}

.auth-title {
  margin: 0 0 6px 0;
  font-family: var(--font-sans);
  font-size: var(--font-size-h2);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--color-text-main);
}

.auth-subtitle {
  margin: 0;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-muted);
}

.server-error-alert {
  margin-bottom: 20px;
}

.submit-btn {
  width: 100%;
  margin-top: 12px;
  border-radius: var(--radius-md);
  height: 44px;
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
}

.auth-card-footer {
  text-align: center;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-muted);
}

.register-link {
  color: var(--color-primary);
  font-weight: 600;
  margin-left: 6px;
}

.register-link:hover {
  text-decoration: underline;
}
</style>
