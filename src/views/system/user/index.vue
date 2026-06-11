<template>
  <div class="app-container">
    <div class="filter-section">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-suffix=":">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="queryParams.username"
            placeholder="用户名"
            clearable
            @keyup.enter="handleQuery()"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="queryParams.status" clearable placeholder="全部" style="width: 100px">
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
            <el-option :value="2" label="已删除" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="queryParams.roleId" clearable placeholder="全部" style="width: 140px">
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item class="search-buttons">
          <el-button type="primary" icon="Search" @click="handleQuery()">搜索</el-button>
          <el-button icon="Refresh" @click="handleResetQuery(queryFormRef)">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="hover" class="table-section">
      <div class="table-section__toolbar">
        <div class="table-section__toolbar--actions">
          <el-button type="primary" icon="Plus" @click="openDialog()">新增用户</el-button>
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
        <el-table-column label="UID" prop="uid" width="100" />
        <el-table-column label="用户名" prop="username" min-width="120" />
        <el-table-column label="真实姓名" prop="realName" min-width="100" />
        <el-table-column label="手机号" prop="mobile" width="120" />
        <el-table-column label="邮箱" prop="email" min-width="160" />
        <el-table-column label="角色" prop="roleNames" min-width="120">
          <template #default="scope">
            {{ formatRoleNames(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column align="center" label="状态" width="90">
          <template #default="scope">
            <el-tag v-if="Number(scope.row.status) === 1" type="success">启用</el-tag>
            <el-tag v-else-if="Number(scope.row.status) === 2" type="danger">已删除</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="scope">
            {{ formatCreateTime(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column align="center" fixed="right" label="操作" width="260">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              link
              :disabled="Number(scope.row.status) === 2"
              @click="openDialog(scope.row.id)"
            >
              编辑
            </el-button>
            <el-button
              type="primary"
              size="small"
              link
              :disabled="Number(scope.row.status) === 2"
              @click="openAssignRolesDialog(scope.row)"
            >
              分配角色
            </el-button>
            <el-button
              type="primary"
              size="small"
              link
              :disabled="Number(scope.row.status) === 2"
              @click="handleToggleStatus(scope.row)"
            >
              {{ Number(scope.row.status) === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button
              v-if="Number(scope.row.status) === 2"
              type="danger"
              size="small"
              link
              @click="handleRemovePermanently(scope.row.id)"
            >
              彻底删除
            </el-button>
            <el-button v-else type="danger" size="small" link @click="handleDelete(scope.row.id)">
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
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="用户名"
            clearable
            :disabled="!!formData.id"
          />
        </el-form-item>
        <el-form-item v-if="!formData.id" label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="密码"
            show-password
            clearable
          />
        </el-form-item>
        <el-form-item v-else label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="留空表示不修改"
            show-password
            clearable
          />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="formData.realName" placeholder="真实姓名" clearable />
        </el-form-item>
        <el-form-item label="手机号" prop="mobile">
          <el-input v-model="formData.mobile" placeholder="手机号" clearable />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="邮箱" clearable />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" placeholder="备注" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog()">取消</el-button>
        <el-button type="primary" @click="handleSubmit()">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配角色弹窗 -->
    <el-dialog
      v-model="assignRolesDialog.visible"
      title="分配角色"
      width="400px"
      destroy-on-close
      @close="closeAssignRolesDialog"
    >
      <el-select
        v-model="assignRolesDialog.roleIds"
        multiple
        placeholder="请选择角色"
        style="width: 100%"
      >
        <el-option
          v-for="item in roleOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <template #footer>
        <el-button @click="closeAssignRolesDialog()">取消</el-button>
        <el-button type="primary" @click="handleAssignRolesSubmit()">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 系统管理 - 管理员用户
 * 用户列表、新增/编辑、分配角色、启用/禁用、删除
 */
defineOptions({
  name: 'SystemUser',
  inheritAttrs: false,
});

// 1. 导入
import type { FormInstance } from 'element-plus';
import { useAdminUserList } from '@/composables/useAdminUserList';
import { useAdminUserFormDialog } from '@/composables/useAdminUserFormDialog';
import { useAssignRolesDialog } from '@/composables/useAssignRolesDialog';

// 2. 响应式数据（来自 composables）
const queryFormRef = ref<FormInstance>();

const list = useAdminUserList();
const {
  queryParams,
  pageData,
  total,
  loading,
  selectIds,
  fetchData,
  handleQuery,
  handleResetQuery,
  handleSelectionChange,
  handleDelete,
  handleRemovePermanently,
  handleBatchDelete,
  handleToggleStatus,
  formatRoleNames,
  formatCreateTime,
} = list;

const formDialog = useAdminUserFormDialog(fetchData);
const { formRef, dialogState, formData, formRules, openDialog, closeDialog, handleSubmit } =
  formDialog;

const assignDialog = useAssignRolesDialog(fetchData);
const {
  assignRolesDialog,
  roleOptions,
  loadRoleOptions,
  openAssignRolesDialog,
  closeAssignRolesDialog,
  handleAssignRolesSubmit,
} = assignDialog;

// 3. 生命周期钩子
onMounted(() => {
  loadRoleOptions();
  fetchData();
});
</script>

<style scoped>
.table-section__pagination {
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
