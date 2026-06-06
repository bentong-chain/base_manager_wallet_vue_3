<template>
  <el-card shadow="hover" class="table-section">
    <div class="table-section__toolbar">
      <div class="table-section__toolbar--actions">
        <el-button v-hasPerm="['sys:user:create']" type="success" icon="plus" @click="handleAdd">
          新增
        </el-button>
        <el-button
          v-hasPerm="'sys:user:delete'"
          type="danger"
          icon="delete"
          :disabled="!hasSelection"
          @click="handleDelete()"
        >
          删除
        </el-button>
      </div>
      <div class="table-section__toolbar--tools">
        <el-button v-hasPerm="'sys:user:import'" icon="upload" @click="handleImport">
          导入
        </el-button>

        <el-button v-hasPerm="'sys:user:export'" icon="download" @click="handleExport">
          导出
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="data"
      border
      stripe
      highlight-current-row
      class="table-section__content"
      row-key="id"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="用户名" prop="username" />
      <el-table-column label="昵称" width="200" align="center" prop="nickname" />
      <el-table-column label="性别" width="100" align="center">
        <template #default="scope">
          <DictTag v-model="scope.row.gender" code="gender" />
        </template>
      </el-table-column>
      <el-table-column label="部门" width="120" align="center" prop="deptName" />
      <el-table-column label="角色" align="center" prop="roleNames" min-width="160" />
      <el-table-column label="手机号码" align="center" prop="mobile" width="120" />
      <el-table-column label="邮箱" align="center" prop="email" width="160" />
      <el-table-column label="状态" align="center" prop="status" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.status === CommonStatus.ENABLED ? 'success' : 'info'">
            {{ scope.row.status === CommonStatus.ENABLED ? "正常" : "禁用" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
      <el-table-column label="操作" fixed="right" width="220">
        <template #default="scope">
          <el-button
            v-hasPerm="'sys:user:reset-password'"
            type="primary"
            icon="RefreshLeft"
            size="small"
            link
            @click="handleResetPassword(scope.row)"
          >
            重置密码
          </el-button>
          <el-button
            v-hasPerm="'sys:user:update'"
            type="primary"
            icon="edit"
            link
            size="small"
            @click="handleEdit(scope.row.id)"
          >
            编辑
          </el-button>
          <el-button
            v-hasPerm="'sys:user:delete'"
            type="danger"
            icon="delete"
            link
            size="small"
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
import { CommonStatus } from "@/enums";
import type { UserItem } from "@/types/api";
import { useTableSelection } from "@/composables";

const props = defineProps<{
  loading: boolean;
  data: UserItem[];
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
  (e: "import"): void;
  (e: "export"): void;
  (e: "reset-password", row: UserItem): void;
  (e: "edit", id: string): void;
}>();

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

const { selectedIds, hasSelection, handleSelectionChange } = useTableSelection<UserItem>();

function handleAdd() {
  emit("add");
}

function handleDelete(id?: string) {
  const ids = id || selectedIds.value.join(",");
  if (!ids) {
    ElMessage.warning("请勾选删除项");
    return;
  }
  emit("delete", ids);
}

function handleImport() {
  emit("import");
}

function handleExport() {
  emit("export");
}

function handleResetPassword(row: UserItem) {
  emit("reset-password", row);
}

function handleEdit(id: string) {
  emit("edit", id);
}

function handlePagination() {
  emit("pagination");
}
</script>
