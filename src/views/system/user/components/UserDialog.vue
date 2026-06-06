<template>
  <el-drawer
    v-model="visible"
    :title="title"
    append-to-body
    :size="drawerSize"
    @close="closeDialog"
  >
    <el-form ref="userFormRef" :model="formData" :rules="rules" label-width="80px">
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="formData.username"
          :readonly="!!formData.id"
          placeholder="请输入用户名"
        />
      </el-form-item>

      <el-form-item label="用户昵称" prop="nickname">
        <el-input v-model="formData.nickname" placeholder="请输入用户昵称" />
      </el-form-item>

      <el-form-item label="所属部门" prop="deptId">
        <el-tree-select
          v-model="formData.deptId"
          placeholder="请选择所属部门"
          :data="deptOptions"
          filterable
          check-strictly
          :render-after-expand="false"
        />
      </el-form-item>

      <el-form-item label="性别" prop="gender">
        <DictSelect v-model="formData.gender" code="gender" />
      </el-form-item>

      <el-form-item label="角色" prop="roleIds">
        <el-select v-model="formData.roleIds" multiple placeholder="请选择">
          <el-option
            v-for="item in roleOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="手机号码" prop="mobile">
        <el-input v-model="formData.mobile" placeholder="请输入手机号码" maxlength="11" />
      </el-form-item>

      <el-form-item label="邮箱" prop="email">
        <el-input v-model="formData.email" placeholder="请输入邮箱" maxlength="50" />
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-switch
          v-model="formData.status"
          inline-prompt
          active-text="正常"
          inactive-text="禁用"
          :active-value="CommonStatus.ENABLED"
          :inactive-value="CommonStatus.DISABLED"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="handleSubmit">确 定</el-button>
        <el-button @click="closeDialog">取 消</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { useAppStore } from "@/store";
import { DeviceEnum, DialogMode, CommonStatus } from "@/enums";
import type { FormInstance, FormRules } from "element-plus";
import type { UserForm, OptionItem } from "@/types/api";
import UserAPI from "@/api/system/user";
import DeptAPI from "@/api/system/dept";
import RoleAPI from "@/api/system/role";
import { useDebounceFn } from "@vueuse/core";

const emit = defineEmits<{
  (e: "success"): void;
}>();

const appStore = useAppStore();
const drawerSize = computed(() => (appStore.device === DeviceEnum.DESKTOP ? "600px" : "90%"));

const visible = ref(false);
const title = ref("新增用户");
const mode = ref(DialogMode.CREATE);
const userFormRef = ref<FormInstance>();
const deptOptions = ref<OptionItem[]>([]);
const roleOptions = ref<OptionItem[]>([]);

const initialFormData: UserForm = {
  status: CommonStatus.ENABLED,
};

const formData = reactive<UserForm>({ ...initialFormData });

const rules: FormRules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  nickname: [{ required: true, message: "请输入用户昵称", trigger: "blur" }],
  deptId: [{ required: true, message: "请选择所属部门", trigger: "change" }],
  roleIds: [{ required: true, message: "请选择用户角色", trigger: "change" }],
  email: [{ type: "email", message: "请输入正确的邮箱地址", trigger: "blur" }],
  mobile: [{ pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号码", trigger: "blur" }],
};

async function loadFormOptions() {
  if (deptOptions.value.length === 0 || roleOptions.value.length === 0) {
    const [roles, depts] = await Promise.all([RoleAPI.getOptions(), DeptAPI.getOptions()]);
    roleOptions.value = roles;
    deptOptions.value = depts;
  }
}

async function open(id?: string) {
  await loadFormOptions();
  visible.value = true;
  if (id) {
    title.value = "修改用户";
    mode.value = DialogMode.EDIT;
    const data = await UserAPI.getFormData(id);
    Object.assign(formData, data);
  } else {
    title.value = "新增用户";
    mode.value = DialogMode.CREATE;
    // Reset to initial
    resetForm();
  }
}

function closeDialog() {
  visible.value = false;
  resetForm();
}

function resetForm() {
  userFormRef.value?.resetFields();
  userFormRef.value?.clearValidate();
  Object.assign(formData, initialFormData);
}

const handleSubmit = useDebounceFn(async () => {
  const valid = await userFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

  try {
    if (formData.id) {
      await UserAPI.update(formData.id, formData);
      ElMessage.success("修改用户成功");
    } else {
      await UserAPI.create(formData);
      ElMessage.success("新增用户成功");
    }
    closeDialog();
    emit("success");
  } catch {
    // Error handled by request interceptor usually
  }
}, 300);

defineExpose({ open });
</script>
