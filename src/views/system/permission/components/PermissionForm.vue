<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑权限' : '新增权限'"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px" label-suffix=":">
      <!-- 资源类型 -->
      <el-form-item label="资源类型" prop="resourceType">
        <el-radio-group v-model="formData.resourceType" :disabled="isEdit">
          <el-radio-button value="CATALOG">目录</el-radio-button>
          <el-radio-button value="MENU">菜单</el-radio-button>
          <el-radio-button value="API">接口</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- 权限名称 -->
      <el-form-item label="权限名称" prop="permissionName">
        <el-input
          v-model="formData.permissionName"
          placeholder="请输入权限名称"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <!-- 权限编码 -->
      <el-form-item label="权限编码" prop="permissionCode">
        <template #label>
          <div class="flex-y-center">
            权限编码
            <el-tooltip placement="bottom" effect="light">
              <template #content>
                目录: admin:system:catalog;菜单: admin:system:user:menu; 接口: admin:user:list;
              </template>
              <el-icon class="ml-1 cursor-pointer">
                <QuestionFilled />
              </el-icon>
            </el-tooltip>
          </div>
        </template>
        <el-input
          v-model="formData.permissionCode"
          placeholder="例如：admin:user:catalog"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <!-- 父权限 -->
      <el-form-item label="父权限" prop="parentId">
        <el-tree-select
          v-model="formData.parentId"
          :data="treeData"
          :props="propsOptions"
          check-strictly
          placeholder="请选择父权限"
          style="width: 100%"
          clearable
        />
      </el-form-item>

      <!-- 路由路径（MENU 显示） -->
      <el-form-item v-if="formData.resourceType === 'MENU'" label="路由路径" prop="routePath">
        <template #label>
          <div class="flex-y-center">
            路由路径
            <el-tooltip placement="bottom" effect="light">
              <template #content>
                定义应用中不同页面对应的 URL 路径，目录需以 / 开头，菜单项不用。例如：系统管理目录
                /system，系统管理下的用户管理菜单 user。
              </template>
              <el-icon class="ml-1 cursor-pointer">
                <QuestionFilled />
              </el-icon>
            </el-tooltip>
          </div>
        </template>
        <el-input v-model="formData.routePath" placeholder="例如：/system/user" />
      </el-form-item>

      <!-- 组件路径（MENU 显示） -->
      <el-form-item v-if="formData.resourceType === 'MENU'" label="组件路径" prop="component">
        <!-- <el-input v-model="formData.component" placeholder="例如：system/user/index" /> -->
        <template #label>
          <div class="flex-y-center">
            组件路径
            <el-tooltip placement="bottom" effect="light">
              <template #content>
                组件页面完整路径，相对于 src/views/，如 system/user/index，缺省后缀 .vue
              </template>
              <el-icon class="ml-1 cursor-pointer">
                <QuestionFilled />
              </el-icon>
            </el-tooltip>
          </div>
        </template>

        <el-input v-model="formData.component" placeholder="system/user/index">
          <template #prepend>src/views/</template>
          <template #append>.vue</template>
        </el-input>
      </el-form-item>

      <!-- 接口路径（API 显示） -->
      <el-form-item v-if="formData.resourceType === 'API'" label="接口路径" prop="uri">
        <el-input v-model="formData.uri" placeholder="例如：/api/admin/user" />
      </el-form-item>

      <!-- HTTP 方法（API 显示） -->
      <el-form-item v-if="formData.resourceType === 'API'" label="HTTP 方法" prop="method">
        <el-select v-model="formData.method" placeholder="请选择 HTTP 方法" style="width: 100%">
          <el-option label="GET" value="GET" />
          <el-option label="POST" value="POST" />
          <el-option label="PUT" value="PUT" />
          <el-option label="DELETE" value="DELETE" />
          <el-option label="PATCH" value="PATCH" />
        </el-select>
      </el-form-item>

      <!-- 菜单图标（CATALOG/MENU 显示） -->
      <el-form-item v-if="formData.resourceType !== 'API'" label="菜单图标" prop="icon">
        <icon-select v-model="formData.icon" />
      </el-form-item>

      <!-- 跳转路径 -->
      <el-form-item v-if="formData.resourceType !== 'API'" label="跳转路径" prop="redirect">
        <el-input v-model="formData.redirect" placeholder="例如：/system/user" maxlength="200" />
      </el-form-item>

      <!-- 是否缓存（仅 MENU 类型显示） -->
      <el-form-item v-if="formData.resourceType === 'MENU'" label="是否缓存" prop="cache">
        <el-radio-group v-model="formData.cache">
          <el-radio :value="1">是</el-radio>
          <el-radio :value="0">否</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 排序 -->
      <el-form-item label="排序" prop="sort">
        <el-input-number
          v-model="formData.sort"
          :min="0"
          :max="9999"
          :step="1"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>

      <!-- 状态 -->
      <el-form-item v-if="!isEdit" label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import type { PermissionTreeNode, PermissionForm, ResourceType } from "@/types/api/permission";
import Permission from "@/api/system/permission";

interface Props {
  /** 弹窗是否可见 */
  visible?: boolean;
  /** 是否编辑模式 */
  isEdit?: boolean;
  /** 编辑的权限数据 */
  editData?: PermissionTreeNode | null;
  /** 权限树数据（用于父权限选择） */
  treeData?: PermissionTreeNode[];
  /** 默认父权限 ID */
  defaultParentId?: number;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  isEdit: false,
  editData: null,
  treeData: () => [],
  defaultParentId: 0,
});

const emit = defineEmits<{
  /** 更新 visible 属性 */
  "update:visible": [value: boolean];
  /** 提交成功 */
  success: [];
}>();

const propsOptions = { label: "permissionName", value: "id", children: "children" };
const formRef = ref<FormInstance>();
const submitLoading = ref(false);

// 表单数据
const formData = reactive<PermissionForm>({
  permissionName: "",
  permissionCode: "",
  resourceType: "MENU" as ResourceType,
  uri: undefined,
  method: undefined,
  routePath: undefined,
  component: undefined,
  icon: undefined,
  redirect: undefined,
  cache: 0,
  parentId: 0,
  sort: 0,
  status: 1,
});

// 表单验证规则
const rules: FormRules = {
  permissionName: [
    { required: true, message: "请输入权限名称", trigger: "blur" },
    { min: 2, max: 100, message: "长度在 2 到 100 个字符", trigger: "blur" },
  ],
  permissionCode: [
    { required: true, message: "请输入权限编码", trigger: "blur" },
    { min: 2, max: 100, message: "长度在 2 到 100 个字符", trigger: "blur" },
  ],
  resourceType: [{ required: true, message: "请选择资源类型", trigger: "change" }],
  parentId: [{ required: true, message: "请选择父权限", trigger: "change" }],
  routePath: [
    {
      required: true,
      trigger: "blur",
      validator: (_rule, value, callback) => {
        // API 类型不需要路由路径
        if (formData.resourceType === "API") {
          callback(new Error("请输入路由路径"));
          return;
        }

        // 检查是否为空
        if (!value || !value.trim()) {
          callback(new Error("请输入路由路径"));
          return;
        }

        // 检查是否以 "/" 开头且有实际内容
        if (!value.startsWith("/")) {
          callback(new Error("路由路径必须以 '/' 开头"));
          return;
        }

        // 检查是否只有 "/"（需要至少一个字符的路径）
        if (value.length < 2 || value === "/") {
          callback(new Error("请输入有效的路由路径，例如 /system"));
          return;
        }

        callback();
      },
    },
  ],
  component: [
    {
      required: true,
      message: "请输入组件路径",
      trigger: "blur",
      validator: (_rule, _value, callback) => {
        if (formData.resourceType === "MENU" && !formData.component) {
          callback(new Error("请输入组件路径"));
        } else {
          callback();
        }
      },
    },
  ],
  uri: [
    {
      required: true,
      message: "请输入接口路径",
      trigger: "blur",
      validator: (_rule, _value, callback) => {
        if (formData.resourceType === "API" && !formData.uri) {
          callback(new Error("请输入接口路径"));
        } else {
          callback();
        }
      },
    },
  ],
  method: [
    {
      required: true,
      message: "请选择 HTTP 方法",
      trigger: "change",
      validator: (_rule, _value, callback) => {
        if (formData.resourceType === "API" && !formData.method) {
          callback(new Error("请选择 HTTP 方法"));
        } else {
          callback();
        }
      },
    },
  ],
  icon: [
    {
      required: true,
      message: "请输入菜单图标",
      trigger: "blur",
      validator: (_rule, _value, callback) => {
        if (formData.resourceType !== "API" && !formData.icon) {
          callback(new Error("请输入菜单图标"));
        } else {
          callback();
        }
      },
    },
  ],
};

// 弹窗可见性双向绑定
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

// 重置表单
function resetForm() {
  formData.permissionName = "";
  formData.permissionCode = "";
  formData.resourceType = "MENU";
  formData.uri = undefined;
  formData.method = undefined;
  formData.routePath = undefined;
  formData.component = undefined;
  formData.icon = undefined;
  formData.redirect = undefined;
  formData.cache = 0;
  formData.parentId = props.defaultParentId;
  formData.sort = 0;
  formData.status = 1;
}

// 初始化表单数据
function initFormData() {
  if (props.isEdit && props.editData) {
    // 编辑模式：填充数据
    formData.id = props.editData.id;
    formData.permissionName = props.editData.permissionName || "";
    formData.permissionCode = props.editData.permissionCode || "";
    formData.resourceType = (props.editData.resourceType as ResourceType) || "MENU";
    formData.uri = props.editData.uri || undefined;
    formData.method = (props.editData.method as any) || undefined;
    formData.routePath = props.editData.routePath || undefined;
    formData.component = props.editData.component || undefined;
    formData.icon = props.editData.icon || undefined;
    formData.redirect = props.editData.redirect || undefined;
    formData.cache = props.editData.cache ?? 0;
    formData.parentId = props.editData.parentId ?? 0;
    formData.sort = props.editData.sort ?? 0;
    formData.status = props.editData.status ?? 1;
  } else {
    // 新增模式：重置表单
    resetForm();
  }
}

// 监听弹窗打开
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      initFormData();
      // 清除验证状态
      nextTick(() => {
        formRef.value?.clearValidate();
      });
    }
  }
);

// 关闭弹窗
function handleClose() {
  dialogVisible.value = false;
}

// 提交表单
async function handleSubmit() {
  if (!formRef.value) return;

  try {
    // 验证表单
    await formRef.value.validate();

    submitLoading.value = true;

    if (props.isEdit && formData.id) {
      // 编辑模式
      await Permission.updatePermission(formData.id, formData);
      ElMessage.success("更新成功");
    } else {
      // 新增模式
      await Permission.createPermission(formData);
      ElMessage.success("新增成功");
    }

    // 关闭弹窗
    handleClose();
    // 通知父组件刷新
    emit("success");
  } catch (error) {
    if (error instanceof Error && error.message !== "Validation failed") {
      ElMessage.error(props.isEdit ? "更新失败" : "新增失败");
    }
  } finally {
    submitLoading.value = false;
  }
}
</script>

<style scoped>
/* 无额外样式 */
</style>
