<template>
  <el-card shadow="hover" class="table-section">
    <div class="table-section__toolbar">
      <div class="table-section__toolbar--actions">
        <el-button
          v-hasPerm="['sys:menu:create']"
          type="success"
          icon="plus"
          @click="handleAdd('0')"
        >
          新增
        </el-button>
      </div>
    </div>

    <el-table
      ref="dataTableRef"
      v-loading="loading"
      row-key="id"
      :data="data"
      :tree-props="{
        children: 'children',
        hasChildren: 'hasChildren',
      }"
      class="table-section__content"
      @row-click="handleRowClick"
    >
      <el-table-column label="菜单名称" min-width="200">
        <template #default="scope">
          <div class="menu-name-cell">
            <span class="menu-name-cell__icon">
              <template v-if="scope.row.icon && scope.row.icon.startsWith('el-icon')">
                <el-icon style="vertical-align: -0.15em">
                  <component :is="scope.row.icon.replace('el-icon-', '')" />
                </el-icon>
              </template>
              <template v-else-if="scope.row.icon">
                <span :class="`i-svg:${scope.row.icon}`" />
              </template>
            </span>
            <span class="menu-name-cell__text">{{ scope.row.name }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="类型" align="center" width="80">
        <template #default="scope">
          <el-tag v-if="scope.row.type === MenuTypeEnum.CATALOG" type="warning">目录</el-tag>
          <el-tag v-if="scope.row.type === MenuTypeEnum.MENU" type="success">菜单</el-tag>
          <el-tag v-if="scope.row.type === MenuTypeEnum.BUTTON" type="danger">按钮</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="路由名称" align="left" width="150" prop="routeName" />
      <el-table-column label="路由路径" align="left" width="150" prop="routePath" />
      <el-table-column label="组件路径" align="left" width="250" prop="component" />
      <el-table-column label="权限标识" align="center" width="200" prop="perm" />
      <el-table-column v-if="showMenuScope" label="范围" align="center" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.scope === MenuScopeEnum.PLATFORM" type="danger">平台</el-tag>
          <el-tag v-else type="success">业务</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="状态" align="center" width="80">
        <template #default="scope">
          <el-tag v-if="scope.row.visible === 1" type="success">显示</el-tag>
          <el-tag v-else type="info">隐藏</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序" align="center" width="80" prop="sort" />
      <el-table-column fixed="right" align="center" label="操作" width="220">
        <template #default="scope">
          <el-button
            v-if="scope.row.type == MenuTypeEnum.CATALOG || scope.row.type == MenuTypeEnum.MENU"
            v-hasPerm="['sys:menu:create']"
            type="primary"
            link
            size="small"
            icon="plus"
            @click.stop="handleAdd(scope.row.id)"
          >
            新增
          </el-button>

          <el-button
            v-hasPerm="['sys:menu:update']"
            type="primary"
            link
            size="small"
            icon="edit"
            @click.stop="handleEdit(scope.row.id)"
          >
            编辑
          </el-button>
          <el-button
            v-hasPerm="['sys:menu:delete']"
            type="danger"
            link
            size="small"
            icon="delete"
            @click.stop="handleDelete(scope.row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { MenuScopeEnum, MenuTypeEnum } from "@/enums/business";
import type { MenuItem } from "@/types/api";
import { isTenantEnabled } from "@/utils/tenant";

defineProps<{
  loading: boolean;
  data: MenuItem[];
}>();

const emit = defineEmits<{
  (e: "row-click", row: MenuItem): void;
  (e: "add", parentId: string): void;
  (e: "edit", id: string): void;
  (e: "delete", id: string): void;
}>();

const showMenuScope = computed(() => isTenantEnabled());

function handleRowClick(row: MenuItem) {
  emit("row-click", row);
}

function handleAdd(parentId: string) {
  emit("add", parentId);
}

function handleEdit(id: string) {
  emit("edit", id);
}

function handleDelete(id: string) {
  emit("delete", id);
}
</script>

<style scoped>
.menu-name-cell {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.menu-name-cell__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  min-width: 18px;
  margin-right: 6px;
}

.menu-name-cell__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
