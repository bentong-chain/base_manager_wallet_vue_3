<template>
  <div class="app-container">
    <div class="filter-section">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-suffix=":">
        <el-form-item label="角色名称" prop="roleName">
          <el-input
            v-model="queryParams.roleName"
            placeholder="角色名称"
            clearable
            @keyup.enter="handleQuery()"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="queryParams.status" clearable placeholder="全部" style="width: 100px">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
        </el-form-item>
        <el-form-item class="search-buttons">
          <el-button type="primary" icon="Search" @click="handleQuery()">搜索</el-button>
          <el-button icon="Refresh" @click="handleResetQuery()">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="hover" class="table-section">
      <div class="table-section__toolbar">
        <div class="table-section__toolbar--actions">
          <el-button type="primary" icon="Plus" @click="openDialog()">新增角色</el-button>
          <el-button
            type="danger"
            :disabled="selectIds.length === 0"
            icon="Delete"
            @click="handleBatchDelete()"
          >
            删除
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="pageData"
        highlight-current-row
        class="table-section__content"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column label="角色编码" prop="roleCode" min-width="120" />
        <el-table-column label="角色名称" prop="roleName" min-width="120" />
        <el-table-column label="描述" prop="description" min-width="160" show-overflow-tooltip />
        <el-table-column align="center" label="状态" width="90">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 1" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column align="center" label="排序" prop="sort" width="80" />
        <el-table-column align="center" fixed="right" label="操作" width="180">
          <template #default="scope">
            <el-button type="primary" size="small" link @click="openDialog(scope.row.id)">
              编辑
            </el-button>
            <el-button
              type="primary"
              size="small"
              link
              @click="openAssignPermissionsDialog(scope.row)"
            >
              分配权限
            </el-button>
            <el-button type="danger" size="small" link @click="handleDelete(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="table-section__pagination"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogState.visible"
      :title="dialogState.title"
      width="520px"
      destroy-on-close
      @close="closeDialog"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="角色编码" prop="roleCode">
          <el-input
            v-model="formData.roleCode"
            placeholder="角色编码"
            clearable
            :disabled="!!formData.id"
          />
        </el-form-item>
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="formData.roleName" placeholder="角色名称" clearable />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" type="textarea" placeholder="描述" :rows="2" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="formData.sort"
            :min="0"
            controls-position="right"
            style="width: 120px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog()">取消</el-button>
        <el-button type="primary" @click="handleSubmit()">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配权限弹窗 -->
    <el-dialog
      v-model="assignPermissionsDialog.visible"
      title="分配权限"
      width="480px"
      destroy-on-close
      @close="closeAssignPermissionsDialog"
    >
      <div v-loading="assignPermissionsDialog.loading" class="assign-permissions-tree">
        <el-tree
          ref="permissionTreeRef"
          :data="permissionTreeData"
          show-checkbox
          node-key="id"
          :default-expand-all="true"
          :props="{ label: 'permissionName', children: 'children' }"
        />
      </div>
      <template #footer>
        <el-button @click="closeAssignPermissionsDialog()">取消</el-button>
        <el-button type="primary" @click="handleAssignPermissionsSubmit()">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "SystemRole",
  inheritAttrs: false,
});

import { nextTick } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { TreeInstance } from "element-plus";
import type {
  AdminRoleListItem,
  AdminRoleQueryParams,
  AdminRoleSaveRequest,
  PermissionTreeNode,
} from "@/types/api";
import {
  getAdminRoleList,
  getAdminRoleDetail,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  getAdminRolePermissionIds,
  assignAdminRolePermissions,
} from "@/api/system/role";
import { getPermissionTree } from "@/api/system/permission";

const queryFormRef = ref<FormInstance>();
const formRef = ref<FormInstance>();
const permissionTreeRef = ref<TreeInstance>();

const queryParams = reactive<AdminRoleQueryParams>({
  pageNum: 1,
  pageSize: 10,
});

const pageData = ref<AdminRoleListItem[]>([]);
const total = ref(0);
const loading = ref(false);
const selectIds = ref<(number | string)[]>([]);

const dialogState = reactive({
  title: "",
  visible: false,
});

const formData = reactive<AdminRoleSaveRequest>({
  roleCode: "",
  roleName: "",
  description: "",
  status: 1,
  sort: 0,
});

const formRules: FormRules = {
  roleCode: [{ required: true, message: "请输入角色编码", trigger: "blur" }],
  roleName: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
};

const assignPermissionsDialog = reactive<{
  visible: boolean;
  roleId: number | string | null;
  checkedIds: number[];
  loading: boolean;
}>({
  visible: false,
  roleId: null,
  checkedIds: [],
  loading: false,
});

const permissionTreeData = ref<PermissionTreeNode[]>([]);

function handleQuery(): void {
  queryParams.pageNum = 1;
  fetchData();
}

async function fetchData(): Promise<void> {
  loading.value = true;
  try {
    const res = await getAdminRoleList(queryParams);
    pageData.value = res?.list ?? [];
    total.value = res?.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleResetQuery(): void {
  queryFormRef.value?.resetFields();
  queryParams.pageNum = 1;
  fetchData();
}

function handleSelectionChange(rows: AdminRoleListItem[]): void {
  selectIds.value = rows.map((r) => r.id).filter((v): v is number | string => v != null);
}

async function openDialog(id?: number | string): Promise<void> {
  dialogState.visible = true;
  dialogState.title = id ? "编辑角色" : "新增角色";
  if (id) {
    try {
      const detail = await getAdminRoleDetail(id);
      Object.assign(formData, {
        id: detail?.id != null ? Number(detail.id) : undefined,
        roleCode: detail?.roleCode ?? "",
        roleName: detail?.roleName ?? "",
        description: detail?.description ?? "",
        status: detail?.status ?? 1,
        sort: detail?.sort ?? 0,
      });
    } catch {
      closeDialog();
    }
  } else {
    Object.assign(formData, {
      id: undefined,
      roleCode: "",
      roleName: "",
      description: "",
      status: 1,
      sort: 0,
    });
  }
}

function closeDialog(): void {
  dialogState.visible = false;
  formRef.value?.resetFields();
}

function buildRolePayload(): AdminRoleSaveRequest {
  const payload: AdminRoleSaveRequest = {
    roleCode: formData.roleCode?.trim() ?? "",
    roleName: formData.roleName?.trim() ?? "",
    status: formData.status ?? 1,
    sort: formData.sort ?? 0,
  };
  const desc = formData.description?.trim();
  if (desc !== undefined && desc !== "") {
    payload.description = desc;
  }
  return payload;
}

function handleSubmit(): void {
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    try {
      const payload = buildRolePayload();
      if (formData.id != null) {
        await updateAdminRole(formData.id, payload);
        ElMessage.success("更新成功");
      } else {
        await createAdminRole(payload);
        ElMessage.success("新增成功");
      }
      closeDialog();
      fetchData();
    } catch {
      // 错误已由 request 拦截器统一提示
    }
  });
}

async function openAssignPermissionsDialog(row: AdminRoleListItem): Promise<void> {
  const roleId = row?.id;
  if (roleId == null) return;
  assignPermissionsDialog.visible = true;
  assignPermissionsDialog.roleId = roleId;
  assignPermissionsDialog.checkedIds = [];
  assignPermissionsDialog.loading = true;
  permissionTreeData.value = [];
  try {
    const tree = await getPermissionTree();
    permissionTreeData.value = Array.isArray(tree) ? tree : [];
    const ids = await getAdminRolePermissionIds(roleId);
    await nextTick();
    const idsArr = Array.isArray(ids) ? ids : [];
    idsArr.forEach((menuId) => permissionTreeRef.value!.setChecked(menuId, true, false));
  } finally {
    assignPermissionsDialog.loading = false;
  }
}

function closeAssignPermissionsDialog(): void {
  assignPermissionsDialog.visible = false;
  assignPermissionsDialog.roleId = null;
  assignPermissionsDialog.checkedIds = [];
}

async function handleAssignPermissionsSubmit(): Promise<void> {
  const roleId = assignPermissionsDialog.roleId;
  if (roleId == null) return;
  const halfChecked = permissionTreeRef.value?.getHalfCheckedKeys() ?? [];
  const checked = permissionTreeRef.value?.getCheckedKeys() ?? [];
  const permissionIds = [...(checked as number[]), ...(halfChecked as number[])];
  try {
    await assignAdminRolePermissions(roleId, { permissionIds });
    ElMessage.success("分配权限成功");
    closeAssignPermissionsDialog();
  } catch {
    // 错误已由 request 拦截器统一提示
  }
}

function handleDelete(id: number | string): void {
  ElMessageBox.confirm("确认删除该角色吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      await deleteAdminRole(id);
      ElMessage.success("删除成功");
      fetchData();
    } catch {
      // 错误已由 request 拦截器统一提示
    }
  });
}

function handleBatchDelete(): void {
  if (selectIds.value.length === 0) {
    ElMessage.warning("请选择要删除的项");
    return;
  }
  ElMessageBox.confirm("确认删除所选角色吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      for (const id of selectIds.value) {
        await deleteAdminRole(id);
      }
      ElMessage.success("删除成功");
      fetchData();
    } catch {
      // 错误已由 request 拦截器统一提示
    }
  });
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.table-section__pagination {
  justify-content: flex-end;
  margin-top: 12px;
}

.assign-permissions-tree {
  min-height: 200px;
}
</style>
