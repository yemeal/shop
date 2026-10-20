<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import MainLayout from '@/components/layout/MainLayout.vue';
import { User, Lock, Message } from '@element-plus/icons-vue';

const router = useRouter();
const authStore = useAuthStore();
const cartStore = useCartStore();

// ссылка на элемент формы
const formRef = ref<FormInstance>();
const isSubmitting = ref<boolean>(false);
const serverError = ref<string | null>(null);

// модель данных формы регистрации
const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
});

// кастомный валидатор совпадения паролей
const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value !== form.password) {
    callback(new Error('Пароли не совпадают'));
  } else {
    callback();
  }
};

// правила валидации
const rules: FormRules = {
  firstName: [
    { required: true, message: 'Укажите ваше имя', trigger: 'blur' },
    { min: 2, message: 'Имя должно содержать минимум 2 символа', trigger: 'blur' },
  ],
  lastName: [
    { required: true, message: 'Укажите вашу фамилию', trigger: 'blur' },
    { min: 2, message: 'Фамилия должна содержать минимум 2 символа', trigger: 'blur' },
  ],
  email: [
    { required: true, message: 'Укажите адрес электронной почты', trigger: 'blur' },
    { type: 'email', message: 'Введите корректный email адрес', trigger: ['blur', 'change'] },
  ],
  password: [
    { required: true, message: 'Придумайте пароль', trigger: 'blur' },
    { min: 6, message: 'Пароль должен содержать минимум 6 символов', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: 'Повторите пароль', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: ['blur', 'change'] },
  ],
};

// отправка формы регистрации
async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    serverError.value = null;
    isSubmitting.value = true;
    try {
      const user = await authStore.register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      });

      ElMessage.success(`Регистрация успешна! Добро пожаловать, ${user.firstName}!`);
      await cartStore.fetchCart();
      router.push('/catalog');
    } catch (err: any) {
      serverError.value = err?.message || 'Ошибка регистрации. Возможно, данный email уже занят.';
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
            <h2 class="auth-title">Создание аккаунта</h2>
            <p class="auth-subtitle">Зарегистрируйтесь для оформления покупок</p>
          </div>
        </template>

        <!-- сообщение об ошибке сервера -->
        <el-alert
          v-if="serverError"
          :title="serverError"
          type="error"
          show-icon
          closable
          class="server-error-alert"
          @close="serverError = null"
        />

        <!-- форма регистрации -->
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          status-icon
          @submit.prevent="handleSubmit"
        >
          <div class="name-fields">
            <!-- поле имя -->
            <el-form-item label="Имя" prop="firstName" class="half-width">
              <el-input
                v-model="form.firstName"
                placeholder="Иван"
                :prefix-icon="User"
              />
            </el-form-item>

            <!-- поле фамилия -->
            <el-form-item label="Фамилия" prop="lastName" class="half-width">
              <el-input
                v-model="form.lastName"
                placeholder="Иванов"
                :prefix-icon="User"
              />
            </el-form-item>
          </div>

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
              placeholder="Минимум 6 символов"
              :prefix-icon="Lock"
              autocomplete="new-password"
            />
          </el-form-item>

          <!-- подтверждение пароля -->
          <el-form-item label="Подтверждение пароля" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              show-password
              placeholder="Повторите пароль"
              :prefix-icon="Lock"
              autocomplete="new-password"
            />
          </el-form-item>

          <!-- кнопка регистрации -->
          <el-button
            type="primary"
            native-type="submit"
            size="large"
            :loading="isSubmitting"
            class="submit-btn"
          >
            Зарегистрироваться
          </el-button>
        </el-form>

        <template #footer>
          <div class="auth-card-footer">
            <span>Уже есть аккаунт?</span>
            <router-link to="/login" class="login-link">
              Войти
            </router-link>
          </div>
        </template>
      </el-card>
    </div>
  </MainLayout>
</template>

<style scoped>
/* оформление страницы регистрации */
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.auth-card {
  width: 100%;
  max-width: 480px;
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

.name-fields {
  display: flex;
  gap: 16px;
}

.half-width {
  flex: 1;
}

.submit-btn {
  width: 100%;
  margin-top: 12px;
  height: 44px;
  border-radius: var(--radius-md);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
}

.auth-card-footer {
  text-align: center;
  font-size: var(--font-size-body-sm);
  color: var(--color-text-muted);
}

.login-link {
  color: var(--color-primary);
  font-weight: 600;
  margin-left: 6px;
}

.login-link:hover {
  text-decoration: underline;
}
</style>
