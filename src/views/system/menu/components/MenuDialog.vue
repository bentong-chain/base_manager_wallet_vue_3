<template>
  <el-drawer v-model="visible" :title="title" :size="drawerSize" @close="closeDialog">
    <MenuForm
      ref="menuFormRef"
      v-model="formData"
      :menu-options="menuOptions"
      @type-change="handleMenuTypeChange"
    />

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="handleSubmit">确定</el-button>
        <el-button @click="closeDialog">取消</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { useAppStore } from "@/store/modules/app";
import { DeviceEnum } from "@/enums/settings";
import MenuAPI from "@/api/system/menu";
import type { MenuForm as MenuFormType, OptionItem } from "@/types/api";
import { MenuScopeEnum, MenuTypeEnum } from "@/enums/business";
import MenuForm from "./MenuForm.vue";

const emit = defineEmits<{
  (e: "success"): void;
}>();

const appStore = useAppStore();
const drawerSize = computed(() => (appStore.device === DeviceEnum.DESKTOP ? "600px" : "90%"));

const visible = ref(false);
const title = ref("新增菜单");
const menuOptions = ref<OptionItem[]>([]);
const menuFormRef = ref<InstanceType<typeof MenuForm>>();

const defaultFormData: MenuFormType = {
  id: undefined,
  parentId: "0",
  visible: 1,
  scope: MenuScopeEnum.TENANT,
  sort: 1,
  type: MenuTypeEnum.MENU,
  alwaysShow: 0,
  keepAlive: 1,
  params: [],
};

// State to track the initial data loaded from API or default, used for type switching logic
const initialFormData = ref<MenuFormType>({ ...defaultFormData });
const formData = ref<MenuFormType>({ ...defaultFormData });

async function open(parentId?: string, menuId?: string) {
  const data = await MenuAPI.getOptions(true);
  menuOptions.value = [{ value: "0", label: "顶级菜单", children: data }];

  if (menuId) {
    title.value = "编辑菜单";
    const detail = await MenuAPI.getFormData(menuId);
    initialFormData.value = { ...detail };
    formData.value = detail;
  } else {
    title.value = "新增菜单";
    // Reset to default
    const newData = { ...defaultFormData, parentId: parentId?.toString() ?? "0" };
    initialFormData.value = { ...newData };
    formData.value = newData;
  }
  visible.value = true;
}

function closeDialog() {
  visible.value = false;
  menuFormRef.value?.resetFields();
  menuFormRef.value?.clearValidate();
  formData.value = { ...defaultFormData };
}

function handleMenuTypeChange() {
  if (formData.value.type !== initialFormData.value.type) {
    if (formData.value.type === MenuTypeEnum.MENU) {
      if (initialFormData.value.type === MenuTypeEnum.CATALOG) {
        formData.value.component = "";
      } else {
        formData.value.routePath = initialFormData.value.routePath;
        formData.value.component = initialFormData.value.component;
      }
    }
  }
}

function handleSubmit() {
  menuFormRef.value?.validate((isValid: boolean) => {
    if (isValid) {
      const menuId = formData.value.id;
      if (menuId) {
        if (formData.value.parentId == menuId) {
          ElMessage.error("父级菜单不能为当前菜单");
          return;
        }
        MenuAPI.update(menuId, formData.value).then(() => {
          ElMessage.success("修改成功");
          closeDialog();
          emit("success");
        });
      } else {
        MenuAPI.create(formData.value).then(() => {
          ElMessage.success("新增成功");
          closeDialog();
          emit("success");
        });
      }
    }
  });
}

defineExpose({ open });
</script>
