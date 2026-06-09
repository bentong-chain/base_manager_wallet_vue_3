<template>
  <div class="app-container">
    <div class="filter-section">
      <el-form :inline="true" label-suffix=":">
        <el-form-item label="状态">
          <el-select v-model="filterStatus" clearable placeholder="全部" style="width: 120px">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="loadTree">查询</el-button>
          <el-button
            icon="Refresh"
            @click="
              filterStatus = undefined;
              loadTree();
            "
          >
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-card v-loading="loading" shadow="hover" class="table-section">
      <div class="table-section__toolbar">
        <span class="table-section__toolbar--title">权限树</span>
        <el-button type="primary" icon="Plus" @click="handleAdd">新增</el-button>
      </div>
      <el-tree
        :data="permissionTreeData"
        :props="{ label: 'permissionName', children: 'children' }"
        node-key="id"
        default-expand-all
        class="permission-tree"
      >
        <template #default="{ data }">
          <div class="permission-tree-node">
            <div class="permission-tree-node-info">
              <div>{{ data.permissionName || data.permissionCode || "-" }}</div>
              <div class="permission-tree-node-meta">
                <el-tag
                  v-if="data.permissionCode && data.resourceType === 'CATALOG'"
                  type="primary"
                >
                  {{ data.permissionCode }}
                </el-tag>
                <el-tag v-if="data.permissionCode && data.resourceType === 'MENU'" type="success">
                  {{ data.permissionCode }}
                </el-tag>
                <el-tag v-if="data.permissionCode && data.resourceType === 'API'" type="warning">
                  {{ data.permissionCode }}
                </el-tag>
                <el-tag
                  v-if="data.status !== undefined && !data.isDeleted"
                  :type="data.status === 1 ? 'success' : 'danger'"
                >
                  {{ data.status === 1 ? "启用" : "禁用" }}
                </el-tag>
                <el-tag v-if="data.isDeleted" size="small" type="danger">已删除</el-tag>
                <span v-if="data.sort !== undefined" class="sort">排序: {{ data.sort }}</span>
              </div>
            </div>
            <div class="permission-tree-node-operation">
              <el-button
                :disabled="data.isDeleted === 1"
                type="primary"
                text
                @click.stop="onEdit(data)"
              >
                编辑
              </el-button>
              <el-button
                :disabled="data.isDeleted === 1"
                :type="data.status === 1 ? 'danger' : 'success'"
                text
                @click.stop="onUpdateStatus(data)"
              >
                {{ data.status === 1 ? "禁用" : "启用" }}
              </el-button>
              <el-button v-show="!data.isDeleted" type="danger" text @click.stop="onDelete(data)">
                删除
              </el-button>
              <el-button v-show="data.isDeleted" type="danger" text @click.stop="onDelete(data)">
                彻底删除
              </el-button>
            </div>
          </div>
        </template>
      </el-tree>
    </el-card>

    <!-- 权限表单弹窗 -->
    <PermissionForm
      v-model:visible="formVisible"
      :is-edit="isEdit"
      :edit-data="editData"
      :tree-data="permissionTreeData"
      :default-parent-id="defaultParentId"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "SystemPermission",
  inheritAttrs: false,
});

import type { PermissionTreeNode } from "@/types/api/permission";
import Permission from "@/api/system/permission";
import PermissionForm from "./components/PermissionForm.vue";

const filterStatus = ref<number | undefined>(undefined);

const permissionTreeData = ref<PermissionTreeNode[]>([]);

const loading = ref<boolean>(false);

// 弹窗相关状态
const formVisible = ref(false);
const isEdit = ref(false);
const editData = ref<PermissionTreeNode | null>(null);
const defaultParentId = ref(0);

async function loadTree(): Promise<void> {
  const params: { status?: number } = {};
  if (filterStatus.value != undefined) {
    params.status = filterStatus.value;
  }
  const tree = await Permission.getPermissionTree(params);
  permissionTreeData.value = Array.isArray(tree) ? tree : [];
}

// 新增权限
function handleAdd() {
  isEdit.value = false;
  editData.value = null;
  defaultParentId.value = 0;
  formVisible.value = true;
}

// 编辑权限（先获取详情再打开弹窗）
async function onEdit(data: PermissionTreeNode) {
  try {
    loading.value = true;
    const detail = await Permission.getPermissionDetail(data.id);
    editData.value = detail;
    isEdit.value = true;
    loading.value = false;
    defaultParentId.value = detail.parentId ?? 0;
    formVisible.value = true;
  } catch {
    loading.value = false;
    ElMessage.error("获取权限详情失败");
  }
}

// 修改权限状态
async function onUpdateStatus(data: PermissionTreeNode) {
  const newStatus = data.status === 1 ? 0 : 1;
  const action = newStatus === 1 ? "启用" : "禁用";

  await ElMessageBox.confirm(`确定要${action}权限"${data.permissionName}"吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    // 调用更新状态 API
    try {
      loading.value = true;
      await Permission.updatePermissionStatus(data.id, { status: newStatus });
      ElMessage.success(`${action}成功`);
      await loadTree();
    } catch {
      ElMessage.error("更新权限状态失败");
    } finally {
      loading.value = false;
    }
  });
}

// 删除权限
async function onDelete(data: PermissionTreeNode) {
  const confirmMsg = data.isDeleted
    ? `确定要彻底删除权限"${data.permissionName}"吗？此操作不可恢复！`
    : `确定要删除权限"${data.permissionName}"吗？`;

  await ElMessageBox.confirm(confirmMsg, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    // 调用删除 API
    try {
      loading.value = true;
      await Permission.deletePermission(data.id);
      ElMessage.success("删除成功");
      await loadTree();
    } catch {
      ElMessage.error("删除权限失败");
    } finally {
      loading.value = false;
    }
  });
}

// 表单提交成功回调
function handleFormSuccess() {
  loadTree();
}

onMounted(() => {
  loadTree();
});
</script>

<style scoped>
.table-section__toolbar {
  gap: 16px;
  align-items: center;
  justify-content: flex-start;
}
.table-section__toolbar--title {
  font-weight: 500;
}
.permission-tree {
  max-width: 900px;
  margin-top: 8px;
}
.permission-tree-node {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
}
.permission-tree-node-info {
  display: flex;
  gap: 16px;
}
.permission-tree-node-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.permission-tree-node-meta .sort {
  margin-left: 4px;
}
.permission-tree-node-operation {
  display: flex;
  gap: 16px;
  justify-content: flex-start;
  width: 220px;
}
.permission-tree-node-operation .el-button {
  margin: 0;
}
</style>
