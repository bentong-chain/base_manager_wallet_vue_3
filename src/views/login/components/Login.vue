<template>
  <div class="auth-panel-form">
    <h3 class="auth-panel-form__title">{{ $t("login.login") }}</h3>
    <el-form
      ref="loginFormRef"
      :model="loginFormData"
      :rules="loginRules"
      size="large"
      :validate-on-rule-change="false"
    >
      <el-form-item prop="username">
        <el-input v-model.trim="loginFormData.username" :placeholder="$t('login.username')">
          <template #prefix>
            <el-icon><User /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-tooltip :visible="isCapsLock" :content="$t('login.capsLock')" placement="right">
        <el-form-item prop="password">
          <el-input
            v-model.trim="loginFormData.password"
            :placeholder="$t('login.password')"
            type="password"
            show-password
            @keyup="checkCapsLock"
            @keyup.enter="onLoginSubmit"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-tooltip>

      <el-form-item prop="captchaAnswer">
        <div class="auth-panel-form__captcha-row">
          <el-input
            v-model.trim="loginFormData.captchaAnswer"
            :placeholder="$t('login.captchaAnswer')"
            clearable
            class="auth-panel-form__captcha-input"
            @keyup.enter="onLoginSubmit"
          >
            <template #prefix>
              <el-icon><Key /></el-icon>
            </template>
          </el-input>
          <div class="auth-panel-form__captcha-image-wrap" @click="getCaptcha">
            <el-image
              v-if="captchaImage"
              :src="captchaImage"
              fit="contain"
              class="auth-panel-form__captcha-image"
              :loading="codeLoading ? 'lazy' : 'eager'"
            />
            <el-icon v-else class="auth-panel-form__captcha-placeholder">
              <RefreshRight />
            </el-icon>
          </div>
        </div>
      </el-form-item>

      <div class="auth-panel-form__options">
        <el-checkbox v-model="loginFormData.rememberMe">
          {{ $t("login.rememberMe") }}
        </el-checkbox>
        <el-link type="primary" underline="never" @click="toOtherForm('resetPwd')">
          {{ $t("login.forgetPassword") }}
        </el-link>
      </div>

      <el-form-item>
        <el-button
          :loading="loading"
          type="primary"
          class="auth-panel-form__submit"
          @click="onLoginSubmit"
        >
          {{ $t("login.login") }}
        </el-button>
      </el-form-item>
    </el-form>

    <div v-if="showRegisterEntry" class="auth-panel-form__footer">
      <el-text size="default">{{ $t("login.noAccount") }}</el-text>
      <el-link type="primary" underline="never" @click="toOtherForm('register')">
        {{ $t("login.reg") }}
      </el-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// 1. 导入
import { ref, onMounted } from "vue";
import type { FormInstance } from "element-plus";
import { useLoginForm } from "@/composables/useLoginForm";

// 2. Emits 定义
const emit = defineEmits<{
  "update:modelValue": [value: "register" | "resetPwd"];
}>();

// 3. 响应式数据（仅组件持有的 ref）
const loginFormRef = ref<FormInstance>();
/** 是否显示「您没有账号？注册」入口，设为 true 可恢复显示 */
const showRegisterEntry = ref(false);

// 4. Composables（表单逻辑与状态）
const {
  loginFormData,
  loginRules,
  loading,
  isCapsLock,
  captchaImage,
  codeLoading,
  getCaptcha,
  checkCapsLock,
  handleLoginSubmit,
} = useLoginForm();

// 5. 生命周期钩子
onMounted(() => {
  getCaptcha();
});

// 6. 方法
function onLoginSubmit(): void {
  handleLoginSubmit(loginFormRef.value);
}

function toOtherForm(type: "register" | "resetPwd"): void {
  emit("update:modelValue", type);
}
</script>

<style lang="scss" scoped>
.auth-panel-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.auth-panel-form__title {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  text-align: center;
}

.auth-panel-form__captcha-row {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.auth-panel-form__captcha-input {
  flex: 1;
}

.auth-panel-form__captcha-image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 40px;
  cursor: pointer;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
  }
}

.auth-panel-form__captcha-image {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.auth-panel-form__captcha-placeholder {
  font-size: 24px;
  color: var(--el-text-color-placeholder);
}

.auth-panel-form__options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.auth-panel-form__submit {
  width: 100%;
}

.auth-panel-form__footer {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
}
</style>
