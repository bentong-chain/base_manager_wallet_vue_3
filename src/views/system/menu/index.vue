<template>
  <div class="app-container">
    <MenuSearch v-model="queryParams" @query="handleQuery" @reset="handleResetQuery" />

    <MenuTable
      :loading="loading"
      :data="menuTableData"
      @row-click="handleRowClick"
      @add="handleAdd"
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <MenuDialog ref="dialogRef" @success="fetchData" />
  </div>
</template>

<script setup lang="ts">
import MenuAPI from "@/api/system/menu";
import type { MenuQueryParams, MenuItem } from "@/types/api";
import MenuSearch from "./components/MenuSearch.vue";
import MenuTable from "./components/MenuTable.vue";
import MenuDialog from "./components/MenuDialog.vue";

defineOptions({
  name: "SysMenu",
  inheritAttrs: false,
});

const queryParams = reactive<MenuQueryParams>({});
const menuTableData = ref<MenuItem[]>([]);
const loading = ref(false);
const dialogRef = ref<InstanceType<typeof MenuDialog>>();
const selectedMenuId = ref<string | undefined>();

function fetchData() {
  loading.value = true;
  MenuAPI.getList(queryParams)
    .then((data) => {
      menuTableData.value = data;
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleQuery() {
  fetchData();
}

function handleResetQuery() {
  fetchData();
}

function handleRowClick(row: MenuItem) {
  selectedMenuId.value = row.id;
}

function handleAdd(parentId?: string) {
  dialogRef.value?.open(parentId);
}

function handleEdit(id: string) {
  dialogRef.value?.open(undefined, id);
}

function handleDelete(menuId: string) {
  if (!menuId) {
    ElMessage.warning("请勾选删除项");
    return;
  }

  ElMessageBox.confirm("确认删除已选中的数据项?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(
    () => {
      loading.value = true;
      MenuAPI.deleteById(menuId)
        .then(() => {
          ElMessage.success("删除成功");
          fetchData();
        })
        .finally(() => {
          loading.value = false;
        });
    },
    () => {
      ElMessage.info("已取消删除");
    }
  );
}

onMounted(() => {
  fetchData();
});
</script>
