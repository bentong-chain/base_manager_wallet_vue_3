import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import AuthAPI from "@/api/auth-api";
import { useUserStore } from "@/store";
import { AuthStorage } from "@/utils/auth";
import type { FormInstance } from "element-plus";
import type { LoginRequest } from "@/types/api/auth";

/**
 * 登录表单逻辑
 * 封装表单数据、验证码、提交与跳转，供登录页组件使用
 */
export function useLoginForm() {
  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const userStore = useUserStore();

  const loading = ref(false);
  const isCapsLock = ref(false);
  /** 验证码图片 Base64 */
  const captchaImage = ref<string>("");
  const codeLoading = ref(false);

  const rememberMe = AuthStorage.getRememberMe();
  const loginFormData = ref<LoginRequest>({
    username: "admin",
    password: "123456",
    captchaKey: "",
    captchaAnswer: "",
    rememberMe,
  });

  const loginRules = computed(() => ({
    username: [
      {
        required: true,
        trigger: "blur",
        message: t("login.message.username.required"),
      },
    ],
    password: [
      {
        required: true,
        trigger: "blur",
        message: t("login.message.password.required"),
      },
      {
        min: 6,
        message: t("login.message.password.min"),
        trigger: "blur",
      },
    ],
    captchaAnswer: [
      {
        required: true,
        trigger: "blur",
        message: t("login.message.captchaAnswer.required") || "请输入验证码答案",
      },
    ],
  }));

  async function getCaptcha(): Promise<void> {
    codeLoading.value = true;
    try {
      const data = await AuthAPI.getCaptcha();
      loginFormData.value.captchaKey = data.captchaKey;
      captchaImage.value = data.captchaImage;
      loginFormData.value.captchaAnswer = "";
    } catch {
      // 无验证码接口时静默失败
    } finally {
      codeLoading.value = false;
    }
  }

  function checkCapsLock(event: Event | KeyboardEvent): void {
    if (event instanceof KeyboardEvent) {
      isCapsLock.value = event.getModifierState("CapsLock");
    }
  }

  async function handleLoginSubmit(formRef: FormInstance | undefined): Promise<void> {
    const valid = await formRef?.validate().then(
      () => true,
      () => false
    );
    if (!valid) return;

    loading.value = true;
    try {
      // login() 内部已拉取用户信息，成功后直接重定向
      await userStore.login(loginFormData.value);
      const rawRedirect = (route.query.redirect as string) || "/";
      let redirectPath = "/";
      try {
        redirectPath = decodeURIComponent(String(rawRedirect)) || "/";
      } catch {
        redirectPath = "/";
      }
      if (!redirectPath.startsWith("/")) redirectPath = "/";
      await router.replace(redirectPath);
    } catch {
      getCaptcha();
      throw undefined;
    } finally {
      loading.value = false;
    }
  }

  return {
    loginFormData,
    loginRules,
    loading,
    isCapsLock,
    captchaImage,
    codeLoading,
    getCaptcha,
    checkCapsLock,
    handleLoginSubmit,
  };
}
