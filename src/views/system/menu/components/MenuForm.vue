<template>
  <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
    <el-form-item label="父级菜单" prop="parentId">
      <el-tree-select
        v-model="formData.parentId"
        placeholder="选择上级菜单"
        :data="menuOptions"
        filterable
        check-strictly
        :render-after-expand="false"
      />
    </el-form-item>

    <el-form-item label="菜单名称" prop="name">
      <el-input v-model="formData.name" placeholder="请输入菜单名称" />
    </el-form-item>

    <el-form-item label="菜单类型" prop="type">
      <el-radio-group v-model="formData.type" @change="handleMenuTypeChange">
        <el-radio :value="MenuTypeEnum.CATALOG">目录</el-radio>
        <el-radio :value="MenuTypeEnum.MENU">菜单</el-radio>
        <el-radio :value="MenuTypeEnum.BUTTON">按钮</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item v-if="formData.type == MenuTypeEnum.MENU && !isExternalLink" prop="routeName">
      <template #label>
        <div class="flex-y-center">
          路由名称
          <el-tooltip placement="bottom" effect="light">
            <template #content>
              如果需要开启缓存，需保证页面 defineOptions 中的 name 与此处一致，建议使用驼峰式
            </template>
            <el-icon class="ml-1 cursor-pointer">
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </div>
      </template>
      <el-input v-model="formData.routeName" placeholder="User" />
    </el-form-item>

    <el-form-item
      v-if="formData.type == MenuTypeEnum.CATALOG || formData.type == MenuTypeEnum.MENU"
      prop="routePath"
    >
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
      <el-input
        v-if="formData.type == MenuTypeEnum.CATALOG"
        v-model="formData.routePath"
        placeholder="system"
      />
      <el-input v-else v-model="formData.routePath" placeholder="user 或 https://example.com" />
    </el-form-item>

    <el-form-item v-if="formData.type == MenuTypeEnum.MENU && !isExternalLink" prop="component">
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

      <el-input v-model="formData.component" placeholder="system/user/index" style="width: 95%">
        <template v-if="formData.type == MenuTypeEnum.MENU" #prepend>src/views/</template>
        <template v-if="formData.type == MenuTypeEnum.MENU" #append>.vue</template>
      </el-input>
    </el-form-item>

    <el-form-item v-if="formData.type == MenuTypeEnum.MENU && !isExternalLink">
      <template #label>
        <div class="flex-y-center">
          路由参数
          <el-tooltip placement="bottom" effect="light">
            <template #content>组件页面使用 `useRoute().query.参数名` 获取路由参数值。</template>
            <el-icon class="ml-1 cursor-pointer">
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </div>
      </template>

      <div v-if="!formData.params || formData.params.length === 0">
        <el-button type="success" plain @click="formData.params = [{ key: '', value: '' }]">
          添加路由参数
        </el-button>
      </div>

      <div v-else>
        <div v-for="(item, index) in formData.params" :key="index">
          <el-input v-model="item.key" placeholder="参数名" style="width: 100px" />

          <span class="mx-1">=</span>

          <el-input v-model="item.value" placeholder="参数名" style="width: 100px" />

          <el-icon
            v-if="formData.params.indexOf(item) === formData.params.length - 1"
            class="ml-2 cursor-pointer color-[var(--el-color-success)]"
            style="vertical-align: -0.15em"
            @click="formData.params.push({ key: '', value: '' })"
          >
            <CirclePlusFilled />
          </el-icon>
          <el-icon
            class="ml-2 cursor-pointer color-[var(--el-color-danger)]"
            style="vertical-align: -0.15em"
            @click="formData.params.splice(formData.params.indexOf(item), 1)"
          >
            <DeleteFilled />
          </el-icon>
        </div>
      </div>
    </el-form-item>

    <el-form-item
      v-if="formData.type !== MenuTypeEnum.BUTTON && showMenuScope"
      prop="scope"
      label="菜单范围"
    >
      <el-radio-group v-model="formData.scope">
        <el-radio :value="MenuScopeEnum.PLATFORM">平台菜单</el-radio>
        <el-radio :value="MenuScopeEnum.TENANT">业务菜单</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item v-if="formData.type !== MenuTypeEnum.BUTTON" prop="visible" label="显示状态">
      <el-radio-group v-model="formData.visible">
        <el-radio :value="1">显示</el-radio>
        <el-radio :value="0">隐藏</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item
      v-if="formData.type === MenuTypeEnum.CATALOG || formData.type === MenuTypeEnum.MENU"
    >
      <template #label>
        <div class="flex-y-center">
          始终显示
          <el-tooltip placement="bottom" effect="light">
            <template #content>
              选择"是"，即使目录或菜单下只有一个子节点，也会显示父节点。
              <br />
              选择"否"，如果目录或菜单下只有一个子节点，则只显示该子节点，隐藏父节点。
              <br />
              如果是叶子节点，请选择"否"。
            </template>
            <el-icon class="ml-1 cursor-pointer">
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </div>
      </template>

      <el-radio-group v-model="formData.alwaysShow">
        <el-radio :value="1">是</el-radio>
        <el-radio :value="0">否</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item v-if="formData.type === MenuTypeEnum.MENU && !isExternalLink" label="缓存页面">
      <el-radio-group v-model="formData.keepAlive">
        <el-radio :value="1">开启</el-radio>
        <el-radio :value="0">关闭</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="排序" prop="sort">
      <el-input-number
        v-model="formData.sort"
        style="width: 100px"
        controls-position="right"
        :min="0"
      />
    </el-form-item>

    <el-form-item v-if="formData.type == MenuTypeEnum.BUTTON" label="权限标识" prop="perm">
      <el-input v-model="formData.perm" placeholder="sys:user:create" />
    </el-form-item>

    <el-form-item v-if="formData.type !== MenuTypeEnum.BUTTON" label="图标" prop="icon">
      <icon-select v-model="formData.icon" />
    </el-form-item>

    <el-form-item v-if="formData.type == MenuTypeEnum.CATALOG" label="跳转路由">
      <el-input v-model="formData.redirect" placeholder="跳转路由" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { MenuScopeEnum, MenuTypeEnum } from "@/enums/business";
import type { MenuForm, OptionItem } from "@/types/api";
import { isTenantEnabled } from "@/utils/tenant";
import type { FormInstance, FormRules } from "element-plus";

const props = defineProps<{
  modelValue: MenuForm;
  menuOptions: OptionItem[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: MenuForm): void;
  (e: "type-change"): void;
}>();

const formRef = ref<FormInstance>();
const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const showMenuScope = computed(() => isTenantEnabled());

const isExternalLink = computed(
  () =>
    formData.value.type === MenuTypeEnum.MENU &&
    !!formData.value.routePath &&
    /^https?:\/\//.test(formData.value.routePath)
);

const validateRouteName = (_: unknown, value: string, callback: (error?: Error) => void) => {
  if (formData.value.type === MenuTypeEnum.MENU && !isExternalLink.value && !value) {
    callback(new Error("请输入路由名称"));
    return;
  }
  callback();
};

const validateComponent = (_: unknown, value: string, callback: (error?: Error) => void) => {
  if (formData.value.type === MenuTypeEnum.MENU && !isExternalLink.value && !value) {
    callback(new Error("请输入组件路径"));
    return;
  }
  callback();
};

const rules: FormRules = {
  parentId: [{ required: true, message: "请选择父级菜单", trigger: "blur" }],
  name: [{ required: true, message: "请输入菜单名称", trigger: "blur" }],
  type: [{ required: true, message: "请选择菜单类型", trigger: "blur" }],
  routeName: [{ validator: validateRouteName, trigger: "blur" }],
  routePath: [{ required: true, message: "请输入路由路径", trigger: "blur" }],
  component: [{ validator: validateComponent, trigger: "blur" }],
  visible: [{ required: true, message: "请选择显示状态", trigger: "change" }],
};

function handleMenuTypeChange() {
  emit("type-change");
}

defineExpose({
  validate: (callback: (isValid: boolean) => void) => formRef.value?.validate(callback),
  resetFields: () => formRef.value?.resetFields(),
  clearValidate: () => formRef.value?.clearValidate(),
});
</script>
