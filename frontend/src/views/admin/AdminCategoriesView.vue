<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import MainLayout from '@/components/layout/MainLayout.vue';
import { api, type Category } from '@/api';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, Refresh } from '@element-plus/icons-vue';

// список категорий
const categories = ref<Category[]>([]);
const isLoading = ref<boolean>(false);

// диалог создания категории
const isDialogOpen = ref<boolean>(false);
const formRef = ref<FormInstance>();
const isSaving = ref<boolean>(false);

const categoryForm = reactive({
  name: '',
});

const rules: FormRules = {
  name: [
    { required: true, message: 'Укажите название категории', trigger: 'blur' },
    { min: 2, message: 'Минимум 2 символа', trigger: 'blur' },
  ],
};

// загрузка категорий
async function loadCategories() {
  isLoading.value = true;
  try {
    const res = await api.catalog.categories({ limit: 100 });
    categories.value = res.items || [];
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось загрузить категории');
  } finally {
    isLoading.value = false;
  }
}

// открытие диалога добавления
function openCreateDialog() {
  categoryForm.name = '';
  isDialogOpen.value = true;
}

// сохранение новой категории
async function handleSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    isSaving.value = true;
    try {
      await api.catalog.createCategory({ name: categoryForm.name.trim() });
      ElMessage.success(`Категория «${categoryForm.name}» создана`);
      isDialogOpen.value = false;
      await loadCategories();
    } catch (err: any) {
      ElMessage.error(err?.message || 'Ошибка создания категории');
    } finally {
      isSaving.value = false;
    }
  });
}

// удаление категории с подтверждением
async function handleDelete(cat: Category) {
  try {
    await ElMessageBox.confirm(
      `Вы действительно хотите удалить категорию «${cat.name}»?`,
      'Подтверждение удаления',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning',
      },
    );
  } catch {
    // отмена диалога пользователем
    return;
  }

  try {
    await api.catalog.deleteCategory(cat.id);
    ElMessage.success('Категория удалена');
    await loadCategories();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось удалить категорию');
  }
}

onMounted(() => {
  loadCategories();
});
</script>

<template>
  <MainLayout>
    <div class="admin-categories-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Управление категориями</h1>
          <p class="page-subtitle">Добавление и структурирование товарных категорий магазина</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" @click="loadCategories">Обновить</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">
            Добавить категорию
          </el-button>
        </div>
      </div>

      <div class="table-card">
        <el-table v-loading="isLoading" :data="categories" style="width: 100%" stripe>
          <el-table-column prop="id" label="ID категории" min-width="180" />
          <el-table-column prop="name" label="Название" min-width="200">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
            </template>
          </el-table-column>
          <el-table-column
            prop="productCount"
            label="Количество товаров"
            width="180"
            align="center"
          >
            <template #default="{ row }">
              <el-tag type="info">{{ row.productCount }} шт.</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Действия" width="120" align="center">
            <template #default="{ row }">
              <el-button type="danger" link size="small" :icon="Delete" @click="handleDelete(row)">
                Удалить
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- диалог создания категории -->
      <el-dialog v-model="isDialogOpen" title="Новая категория" width="450px" align-center>
        <el-form ref="formRef" :model="categoryForm" :rules="rules" label-position="top">
          <el-form-item label="Название категории" prop="name">
            <el-input v-model="categoryForm.name" placeholder="Например, Смартфоны и гаджеты" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="isDialogOpen = false">Отмена</el-button>
          <el-button type="primary" :loading="isSaving" @click="handleSave"> Создать </el-button>
        </template>
      </el-dialog>
    </div>
  </MainLayout>
</template>

<style scoped>
/* оформление страницы категорий */
.admin-categories-page {
  padding-bottom: 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.page-subtitle {
  font-family: var(--font-sans);
  font-size: var(--font-size-lead);
  color: var(--color-text-muted);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.table-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.mr-2 {
  margin-right: 8px;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .el-button {
    flex: 1;
  }

  .table-card {
    padding: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
