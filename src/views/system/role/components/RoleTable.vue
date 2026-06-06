<template>
  <el-card shadow="hover" class="table-section">
    <div class="table-section__toolbar">
      <div class="table-section__toolbar--actions">
        <el-button type="success" icon="plus" @click="handleAdd">新增</el-button>
        <el-button type="danger" :disabled="ids.length === 0" icon="delete" @click="handleDelete()">
          删除
        </el-button>
      </div>
    </div>

    <el-table
      ref="dataTableRef"
      v-loading="loading"
      :data="data"
      highlight-current-row
      border
      class="table-section__content"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="角色名称" prop="name" min-width="100" />
      <el-table-column label="角色编码" prop="code" width="150" />

      <el-table-column label="数据权限" align="center" width="140" prop="dataScopeLabel" />

      <el-table-column label="状态" align="center" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.status === 1" type="success">正常</el-tag>
          <el-tag v-else type="info">禁用</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="排序" align="center" width="80" prop="sort" />

      <el-table-column fixed="right" label="操作" width="220">
        <template #default="scope">
          <el-button
            v-hasPerm="'sys:role:assign'"
            type="primary"
            size="small"
            link
            icon="position"
            @click="handleAssignPerm(scope.row)"
          >
            分配权限
          </el-button>
          <el-button type="primary" size="small" link icon="edit" @click="handleEdit(scope.row.id)">
            编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            link
            icon="delete"
            @click="handleDelete(scope.row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-if="total > 0"
      v-model:total="localTotal"
      v-model:page="localPageNum"
      v-model:limit="localPageSize"
      @pagination="handlePagination"
    />
  </el-card>
</template>

<script setup lang="ts">
import type { RoleItem } from "@/types/api";

const props = defineProps<{
  loading: boolean;
  data: RoleItem[];
  total: number;
  pageNum: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  (e: "update:total", value: number): void;
  (e: "update:pageNum", value: number): void;
  (e: "update:pageSize", value: number): void;
  (e: "pagination"): void;
  (e: "add"): void;
  (e: "delete", ids: string): void;
  (e: "edit", id: string): void;
  (e: "assign-perm", row: RoleItem): void;
}>();

const ids = ref<string[]>([]);

const localTotal = computed({
  get: () => props.total,
  set: (val) => emit("update:total", val),
});

const localPageNum = computed({
  get: () => props.pageNum,
  set: (val) => emit("update:pageNum", val),
});

const localPageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit("update:pageSize", val),
});

function handleSelectionChange(selection: RoleItem[]) {
  ids.value = selection.map((item) => item.id).filter((id): id is string => !!id);
}

function handleAdd() {
  emit("add");
}

function handleDelete(id?: string) {
  const roleIds = id ? String(id) : ids.value.join(",");
  if (!roleIds) {
    ElMessage.warning("请勾选删除项");
    return;
  }
  emit("delete", roleIds);
}

function handleEdit(id: string) {
  emit("edit", id);
}

function handleAssignPerm(row: RoleItem) {
  emit("assign-perm", row);
}

function handlePagination() {
  emit("pagination");
}
</script>
