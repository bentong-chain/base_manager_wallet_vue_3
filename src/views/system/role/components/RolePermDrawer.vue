<template>
  <el-drawer
    v-model="visible"
    :title="'【' + checkedRole.name + '】权限分配'"
    :size="drawerSize"
    @close="closeDrawer"
  >
    <div class="flex-x-between">
      <el-input v-model="permKeywords" clearable class="w-[150px]" placeholder="菜单权限名称">
        <template #prefix>
          <Search />
        </template>
      </el-input>

      <div class="flex-center ml-5">
        <el-button type="primary" size="small" plain @click="togglePermTree">
          <template #icon>
            <Switch />
          </template>
          {{ isExpanded ? "收缩" : "展开" }}
        </el-button>
        <el-checkbox
          v-model="parentChildLinked"
          class="ml-5"
          @change="handleParentChildLinkedChange"
        >
          父子联动
        </el-checkbox>

        <el-tooltip placement="bottom">
          <template #content>
            如果只需勾选菜单权限，不需要勾选子菜单或者按钮权限，请关闭父子联动
          </template>
          <el-icon class="ml-1 color-[--el-color-primary] inline-block cursor-pointer">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
      </div>
    </div>

    <el-tree
      ref="permTreeRef"
      node-key="value"
      show-checkbox
      :data="menuPermOptions"
      :filter-node-method="handlePermFilter"
      :default-expand-all="true"
      :check-strictly="!parentChildLinked"
      class="mt-5"
    >
      <template #default="{ data }">
        {{ data.label }}
      </template>
    </el-tree>
    <template #footer>
      <div class="dialog-footer">
        <el-button v-hasPerm="'sys:role:assign'" type="primary" @click="handleSubmit">
          确定
        </el-button>
        <el-button @click="closeDrawer">取消</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { useAppStore } from "@/store/modules/app";
import { DeviceEnum } from "@/enums/settings";
import RoleAPI from "@/api/system/role";
import MenuAPI from "@/api/system/menu";
import type { RoleItem, OptionItem } from "@/types/api";
import type { ElTree } from "element-plus";

const emit = defineEmits<{
  (e: "success"): void;
}>();

const appStore = useAppStore();
const drawerSize = computed(() => (appStore.device === DeviceEnum.DESKTOP ? "600px" : "90%"));

const visible = ref(false);
const checkedRole = ref<{ id?: string; name?: string }>({});
const permKeywords = ref("");
const isExpanded = ref(true);
const parentChildLinked = ref(true);
const menuPermOptions = ref<OptionItem[]>([]);
const permTreeRef = ref<InstanceType<typeof ElTree>>();

async function open(row: RoleItem) {
  const roleId = row.id;
  if (roleId) {
    visible.value = true;
    checkedRole.value = { id: roleId, name: row.name };

    // 获取所有的菜单
    menuPermOptions.value = await MenuAPI.getOptions();

    // 回显角色已拥有的菜单
    RoleAPI.getRoleMenuIds(roleId).then((data) => {
      const checkedMenuIds = data;
      checkedMenuIds.forEach((menuId) => permTreeRef.value!.setChecked(menuId, true, false));
    });
  }
}

function closeDrawer() {
  visible.value = false;
  permKeywords.value = "";
  isExpanded.value = true;
  parentChildLinked.value = true;
}

function handleSubmit() {
  const roleId = checkedRole.value.id;
  if (roleId) {
    const checkedMenuIds: number[] = permTreeRef
      .value!.getCheckedNodes(false, true)
      .map((node: any) => node.value);

    RoleAPI.updateRoleMenus(roleId, checkedMenuIds).then(() => {
      ElMessage.success("分配权限成功");
      closeDrawer();
      emit("success");
    });
  }
}

function togglePermTree() {
  isExpanded.value = !isExpanded.value;
  if (permTreeRef.value) {
    Object.values(permTreeRef.value.store.nodesMap).forEach((node: any) => {
      if (isExpanded.value) {
        node.expand();
      } else {
        node.collapse();
      }
    });
  }
}

watch(permKeywords, (val) => {
  permTreeRef.value!.filter(val);
});

function handlePermFilter(value: string, data: any) {
  if (!value) return true;
  return data.label.includes(value);
}

function handleParentChildLinkedChange(val: any) {
  parentChildLinked.value = val;
}

defineExpose({ open });
</script>
