<template>
  <el-dialog v-model="visible" :title="title" width="600px" @close="closeDialog">
    <el-form ref="roleFormRef" :model="formData" :rules="rules" label-width="100px">
      <el-form-item label="角色名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入角色名称" />
      </el-form-item>

      <el-form-item label="角色编码" prop="code">
        <el-input v-model="formData.code" placeholder="请输入角色编码" />
      </el-form-item>

      <el-form-item label="数据权限" prop="dataScope">
        <el-select v-model="formData.dataScope" placeholder="请选择数据权限" style="width: 100%">
          <el-option :key="1" label="全部数据" :value="1" />
          <el-option :key="2" label="部门及子部门数据" :value="2" />
          <el-option :key="3" label="本部门数据" :value="3" />
          <el-option :key="4" label="本人数据" :value="4" />
          <el-option :key="5" label="自定义部门数据" :value="5" />
        </el-select>
      </el-form-item>

      <!-- 自定义部门选择 -->
      <el-form-item v-if="formData.dataScope === 5" label="选择部门" prop="deptIds">
        <el-tree-select
          v-model="formData.deptIds"
          :data="deptOptions"
          multiple
          :render-after-expand="false"
          check-strictly
          placeholder="请选择部门"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio :value="1">正常</el-radio>
          <el-radio :value="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="排序" prop="sort">
        <el-input-number
          v-model="formData.sort"
          controls-position="right"
          :min="0"
          style="width: 100px"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="handleSubmit">确定</el-button>
        <el-button @click="closeDialog">取消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import RoleAPI from "@/api/system/role";
import DeptAPI from "@/api/system/dept";
import type { RoleForm, OptionItem } from "@/types/api";
import type { FormInstance, FormRules } from "element-plus";

const emit = defineEmits<{
  (e: "success"): void;
}>();

const visible = ref(false);
const title = ref("");
const roleFormRef = ref<FormInstance>();
const deptOptions = ref<OptionItem[]>([]);

const formData = reactive<RoleForm>({
  sort: 1,
  status: 1,
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入角色编码", trigger: "blur" }],
  dataScope: [{ required: true, message: "请选择数据权限", trigger: "blur" }],
  deptIds: [{ required: true, message: "请选择部门", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "blur" }],
});

async function open(id?: string) {
  visible.value = true;
  if (deptOptions.value.length === 0) {
    deptOptions.value = await DeptAPI.getOptions();
  }

  if (id) {
    title.value = "修改角色";
    const data = await RoleAPI.getFormData(id);
    Object.assign(formData, data);
  } else {
    title.value = "新增角色";
    resetForm();
  }
}

function closeDialog() {
  visible.value = false;
  resetForm();
}

function resetForm() {
  roleFormRef.value?.resetFields();
  roleFormRef.value?.clearValidate();

  formData.id = undefined;
  formData.sort = 1;
  formData.status = 1;
  formData.dataScope = undefined;
  formData.deptIds = undefined;
}

async function handleSubmit() {
  const valid = await roleFormRef.value?.validate().then(
    () => true,
    () => false
  );
  if (!valid) return;

  const submitData = { ...formData };
  if (submitData.dataScope !== 5) {
    submitData.deptIds = undefined;
  }

  try {
    const roleId = formData.id;
    if (roleId) {
      await RoleAPI.update(roleId, submitData);
      ElMessage.success("修改成功");
    } else {
      await RoleAPI.create(submitData);
      ElMessage.success("新增成功");
    }
    closeDialog();
    emit("success");
  } catch {
    // console.error(error);
  }
}

defineExpose({ open });
</script>
