<script setup lang="ts">
import { ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

export interface AddressFormData {
  city: string;
  street: string;
  house: string;
  apartment: string | null;
}

const props = defineProps<{
  modelValue: AddressFormData;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: AddressFormData): void;
}>();

const formRef = ref<FormInstance>();

const rules: FormRules = {
  city: [{ required: true, message: 'Укажите город', trigger: 'blur' }],
  street: [{ required: true, message: 'Укажите улицу', trigger: 'blur' }],
  house: [{ required: true, message: 'Укажите номер дома', trigger: 'blur' }],
};

function updateField(field: keyof AddressFormData, value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  });
}

async function validate(): Promise<boolean> {
  if (!formRef.value) return false;
  return formRef.value
    .validate()
    .then(() => true)
    .catch(() => false);
}

function resetFields() {
  formRef.value?.resetFields();
}

defineExpose({
  validate,
  resetFields,
});
</script>

<template>
  <el-form
    ref="formRef"
    :model="modelValue"
    :rules="rules"
    label-position="top"
    class="address-form"
  >
    <div class="form-row">
      <el-form-item label="Город" prop="city" class="col-6">
        <el-input
          :model-value="modelValue.city"
          placeholder="Например, Москва"
          @update:model-value="(val: string) => updateField('city', val)"
        />
      </el-form-item>
      <el-form-item label="Улица" prop="street" class="col-6">
        <el-input
          :model-value="modelValue.street"
          placeholder="Например, Тверская"
          @update:model-value="(val: string) => updateField('street', val)"
        />
      </el-form-item>
    </div>

    <div class="form-row">
      <el-form-item label="Дом / Корпус" prop="house" class="col-6">
        <el-input
          :model-value="modelValue.house"
          placeholder="10"
          @update:model-value="(val: string) => updateField('house', val)"
        />
      </el-form-item>
      <el-form-item label="Квартира / Офис" prop="apartment" class="col-6">
        <el-input
          :model-value="modelValue.apartment || ''"
          placeholder="42"
          @update:model-value="(val: string) => updateField('apartment', val)"
        />
      </el-form-item>
    </div>
  </el-form>
</template>

<style scoped>
.form-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.col-6 {
  flex: 1;
  min-width: 200px;
}
</style>
