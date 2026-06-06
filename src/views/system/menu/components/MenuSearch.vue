<template>
  <div class="filter-section">
    <el-form ref="queryFormRef" :model="queryParams" :inline="true">
      <el-form-item label="关键字" prop="keywords">
        <el-input
          v-model="queryParams.keywords"
          placeholder="菜单名称"
          clearable
          @keyup.enter="handleQuery"
        />
      </el-form-item>

      <el-form-item class="search-buttons">
        <el-button type="primary" icon="search" @click="handleQuery">搜索</el-button>
        <el-button icon="refresh" @click="handleResetQuery">重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import type { MenuQueryParams } from "@/types/api";
import type { FormInstance } from "element-plus";

const props = defineProps<{
  modelValue: MenuQueryParams;
}>();

const emit = defineEmits<{
  (e: "query"): void;
  (e: "reset"): void;
}>();

const queryFormRef = ref<FormInstance>();
const queryParams = computed(() => props.modelValue);

function handleQuery() {
  emit("query");
}

function handleResetQuery() {
  queryFormRef.value?.resetFields();
  emit("reset");
}
</script>
