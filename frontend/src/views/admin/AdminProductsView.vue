<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import MainLayout from '@/components/layout/MainLayout.vue';
import { api, type Product, type Category } from '@/api';
import { formatCurrency } from '@/utils/formatters';
import { useProductActions } from '@/composables/useProductActions';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue';

// список товаров и категорий
const { getProductImageUrl, handleImageError } = useProductActions();
const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const isLoading = ref<boolean>(false);

// диалог создания / редактирования товара
const isDialogOpen = ref<boolean>(false);
const isEditing = ref<boolean>(false);
const editingProductId = ref<string | null>(null);
const formRef = ref<FormInstance>();
const isSaving = ref<boolean>(false);

// модель данных формы
const productForm = reactive({
  sku: '',
  name: '',
  description: '',
  price: 0,
  isActive: true,
  imageUrl: '',
  categoryIds: [] as string[],
});

// правила валидации полей формы товара
const rules: FormRules = {
  sku: [{ required: true, message: 'Укажите артикул SKU', trigger: 'blur' }],
  name: [{ required: true, message: 'Укажите наименование товара', trigger: 'blur' }],
  price: [
    { required: true, message: 'Укажите цену', trigger: 'blur' },
    { type: 'number', min: 0, message: 'Цена не может быть отрицательной', trigger: 'blur' },
  ],
};


// загрузка списка товаров и категорий
async function loadData() {
  isLoading.value = true;
  try {
    const [prodsRes, catsRes] = await Promise.all([
      api.catalog.products({ limit: 100 }),
      api.catalog.categories({ limit: 100 }),
    ]);
    products.value = prodsRes.items || [];
    categories.value = catsRes.items || [];
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось загрузить товары');
  } finally {
    isLoading.value = false;
  }
}

// открытие диалога добавления нового товара
function openCreateDialog() {
  isEditing.value = false;
  editingProductId.value = null;
  productForm.sku = `SKU-${Date.now().toString().slice(-4)}`;
  productForm.name = '';
  productForm.description = '';
  productForm.price = 1000;
  productForm.isActive = true;
  productForm.imageUrl = '';
  productForm.categoryIds = categories.value.length ? [categories.value[0].id] : [];
  isDialogOpen.value = true;
}

// открытие диалога редактирования существующего товара
function openEditDialog(prod: Product) {
  isEditing.value = true;
  editingProductId.value = prod.id;
  productForm.sku = prod.sku;
  productForm.name = prod.name;
  productForm.description = prod.description || '';
  productForm.price = prod.price;
  productForm.isActive = prod.isActive;
  productForm.imageUrl = prod.imageUrl || '';
  productForm.categoryIds = prod.categories ? prod.categories.map((c) => c.id) : [];
  isDialogOpen.value = true;
}

// сохранение товара (создание или обновление)
async function handleSave() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    isSaving.value = true;
    try {
      if (isEditing.value && editingProductId.value) {
        // редактирование
        await api.catalog.updateProduct(editingProductId.value, {
          sku: productForm.sku,
          name: productForm.name,
          description: productForm.description || null,
          price: productForm.price,
          isActive: productForm.isActive,
          imageUrl: productForm.imageUrl || null,
          categoryIds: productForm.categoryIds,
        });
        ElMessage.success('Товар успешно обновлен');
      } else {
        // создание нового товара
        await api.catalog.createProduct({
          sku: productForm.sku,
          name: productForm.name,
          description: productForm.description || null,
          price: productForm.price,
          isActive: productForm.isActive,
          imageUrl: productForm.imageUrl || null,
          categoryIds: productForm.categoryIds,
        });
        ElMessage.success('Новый товар успешно добавлен в каталог');
      }
      isDialogOpen.value = false;
      await loadData();
    } catch (err: any) {
      ElMessage.error(err?.message || 'Ошибка сохранения товара');
    } finally {
      isSaving.value = false;
    }
  });
}

// модалка подтверждения удаления товара (требование пункта 13)
async function handleDelete(prod: Product) {
  try {
    await ElMessageBox.confirm(
      `Вы действительно хотите удалить товар «${prod.name}» (Артикул: ${prod.sku})? Это действие нельзя отменить.`,
      'Подтверждение удаления товара',
      {
        confirmButtonText: 'Да, удалить',
        cancelButtonText: 'Отмена',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    );
  } catch {
    // отмена диалога пользователем
    return;
  }

  try {
    // отправка запроса на удаление на бэкенд
    await api.catalog.deleteProduct(prod.id);
    ElMessage.success(`Товар «${prod.name}» успешно удален`);
    await loadData();
  } catch (err: any) {
    ElMessage.error(err?.message || 'Не удалось удалить товар');
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <MainLayout>
    <div class="admin-products-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Управление товарами</h1>
          <p class="page-subtitle">Добавление, редактирование и удаление товаров каталога (CRUD)</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" @click="loadData">Обновить</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">
            Добавить товар
          </el-button>
        </div>
      </div>

      <!-- таблица товаров -->
      <div class="table-card">
        <el-table
          v-loading="isLoading"
          :data="products"
          style="width: 100%"
          stripe
        >
          <!-- изображение -->
          <el-table-column label="Фото" width="80" align="center">
            <template #default="{ row }">
              <img
                :src="getProductImageUrl(row.id, row.imageUrl)"
                :alt="row.name"
                class="admin-thumb"
                @error="handleImageError($event, row.id)"
              />
            </template>
          </el-table-column>

          <!-- артикул -->
          <el-table-column prop="sku" label="SKU" width="130" />

          <!-- название -->
          <el-table-column prop="name" label="Наименование" min-width="200" />

          <!-- категории -->
          <el-table-column label="Категории" min-width="160">
            <template #default="{ row }">
              <el-tag
                v-for="cat in row.categories"
                :key="cat.id"
                size="small"
                class="mr-1"
              >
                {{ cat.name }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- цена -->
          <el-table-column label="Цена" width="130" align="right">
            <template #default="{ row }">
              <strong>{{ formatCurrency(row.price) }}</strong>
            </template>
          </el-table-column>

          <!-- статус наличия -->
          <el-table-column label="Статус" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? 'Активен' : 'Отключен' }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- действия -->
          <el-table-column label="Действия" width="160" align="center">
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                link
                :icon="Edit"
                @click="openEditDialog(row)"
              >
                Изменить
              </el-button>
              <el-button
                size="small"
                type="danger"
                link
                :icon="Delete"
                @click="handleDelete(row)"
              >
                Удалить
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- диалог создания / редактирования товара -->
      <el-dialog
        v-model="isDialogOpen"
        :title="isEditing ? 'Редактирование товара' : 'Добавление нового товара'"
        width="600px"
        align-center
      >
        <el-form
          ref="formRef"
          :model="productForm"
          :rules="rules"
          label-position="top"
        >
          <div class="form-row">
            <el-form-item label="Артикул (SKU)" prop="sku" class="col-6">
              <el-input v-model="productForm.sku" placeholder="PROD-001" />
            </el-form-item>
            <el-form-item label="Цена, ₽" prop="price" class="col-6">
              <el-input-number
                v-model="productForm.price"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </div>

          <el-form-item label="Наименование" prop="name">
            <el-input v-model="productForm.name" placeholder="Беспроводные наушники" />
          </el-form-item>

          <el-form-item label="URL изображения">
            <el-input
              v-model="productForm.imageUrl"
              placeholder="https://images.unsplash.com/..."
            />
          </el-form-item>

          <el-form-item label="Категории товара">
            <el-select
              v-model="productForm.categoryIds"
              multiple
              placeholder="Выберите категории"
              style="width: 100%"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="cat.name"
                :value="cat.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Описание товара">
            <el-input
              v-model="productForm.description"
              type="textarea"
              :rows="3"
              placeholder="Подробные характеристики и свойства товара..."
            />
          </el-form-item>

          <el-form-item label="Статус доступности">
            <el-switch
              v-model="productForm.isActive"
              active-text="Товар доступен к покупке"
              inactive-text="Скрыт из каталога"
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="isDialogOpen = false">Отмена</el-button>
          <el-button type="primary" :loading="isSaving" @click="handleSave">
            Сохранить
          </el-button>
        </template>
      </el-dialog>
    </div>
  </MainLayout>
</template>

<style scoped>
/* страница администрирования товаров */
.admin-products-page {
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

.admin-thumb {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: var(--radius-xs);
  background-color: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
}

.form-row {
  display: flex;
  gap: 16px;
}

.col-6 {
  flex: 1;
}

.mr-1 {
  margin-right: 4px;
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

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
