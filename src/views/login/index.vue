<template>
  <div class="auth-view">
    <div class="auth-view__toolbar">
      <el-tooltip :content="t('login.themeToggle')" placement="bottom">
        <div class="toolbar-item">
          <ThemeSwitch />
        </div>
      </el-tooltip>
      <el-tooltip :content="t('login.languageToggle')" placement="bottom">
        <div class="toolbar-item">
          <LangSelect size="text-20px" />
        </div>
      </el-tooltip>
    </div>

    <div class="auth-view__wrapper">
      <section class="auth-panel">
        <div class="auth-panel__brand">
          <div class="auth-panel__logo-wrap">
            <el-image :src="logo" class="auth-panel__logo" />
          </div>
          <div class="auth-panel__meta">
            <div class="auth-panel__title-row">
              <span class="auth-panel__title">{{ appConfig.title }}</span>
            </div>
            <div v-if="appConfig.version || tenantEnabled" class="auth-panel__version-row">
              <el-text size="small" type="info">VERSION</el-text>
              <el-tag v-if="appConfig.version" size="small" effect="light" round>
                {{ `v${appConfig.version}` }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="wallet-login">


          <div class="wallet-login__status">
            <div class="wallet-login__status-label">当前钱包</div>
            <div class="wallet-login__status-value">
              {{ walletAddress ? shortAddress(walletAddress) : "未连接" }}
            </div>
          </div>

          <el-button
            :loading="loading"
            type="primary"
            size="large"
            class="wallet-login__button"
            @click="handleWalletLogin"
          >
            <el-icon><Connection /></el-icon>
            <span>{{ loadingText }}</span>
          </el-button>

          <div class="wallet-login__providers">
            <el-button :disabled="loading" class="wallet-login__provider" @click="handleWalletLogin">
              MetaMask
            </el-button>
            <el-button :disabled="loading" class="wallet-login__provider" @click="handleWalletLogin">
              TokenPocket
            </el-button>
          </div>
        </div>

        <footer class="auth-panel__footer">
          <el-text size="small">
            Copyright © 2026
            <a href="#" target="_blank">备案号</a>
          </el-text>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Connection } from "@element-plus/icons-vue";
import logo from "@/assets/images/logo.png";
import ThemeSwitch from "@/components/ThemeSwitch/index.vue";
import { appConfig } from "@/settings";
import { useAuthStore } from "@/store/modules/auth";
import { useUserStore } from "@/store/modules/user";

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
};

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();

const tenantEnabled = appConfig.tenantEnabled;
const walletAddress = ref("");
const loading = ref(false);
const loadingText = ref("连接钱包并登录");

const loginSignSubject = import.meta.env.VITE_ADMIN_LOGIN_SIGN_SUBJECT || "TJT Admin";
const loginSignUri = import.meta.env.VITE_ADMIN_LOGIN_SIGN_URI || "http://localhost:9527";
const loginSignTemplate =
  import.meta.env.VITE_ADMIN_LOGIN_SIGN_TEMPLATE ||
  [
    "{loginSubject} wants you to sign in with your account:",
    "{address}",
    "",
    "Sign in with account to the admin console.",
    "",
    "URI: {uri}",
    "Login time: {loginTime}",
  ].join("\n");

function getEthereumProvider(): EthereumProvider {
  const ethereum = window.ethereum as EthereumProvider | undefined;
  if (!ethereum) {
    throw new Error("WALLET_NOT_FOUND");
  }
  return ethereum;
}

function buildAdminLoginSignText(address: string, signTime: number) {
  const loginTime = String(signTime);
  return loginSignTemplate
    .replaceAll("{loginSubject}", loginSignSubject)
    .replaceAll("{address}", address)
    .replaceAll("{uri}", loginSignUri)
    .replaceAll("{loginTime}", loginTime)
    .replaceAll("{signTime}", loginTime);
}

async function connectWallet() {
  loadingText.value = "连接钱包中...";
  const ethereum = getEthereumProvider();
  const accounts = await ethereum.request<string[]>({ method: "eth_requestAccounts" });
  const address = accounts?.[0];
  if (!address) {
    throw new Error("WALLET_ADDRESS_EMPTY");
  }
  walletAddress.value = address;
  return { ethereum, address };
}

async function signLoginMessage(ethereum: EthereumProvider, address: string) {
  loadingText.value = "请在钱包中确认签名";
  const signTime = Date.now();
  const signStr = buildAdminLoginSignText(address, signTime);
  const loginSign = await ethereum.request<string>({
    method: "personal_sign",
    params: [signStr, address],
  });
  return { signTime, loginSign };
}

async function handleWalletLogin() {
  loading.value = true;
  loadingText.value = "连接钱包并登录";
  try {
    const { ethereum, address } = await connectWallet();
    const { signTime, loginSign } = await signLoginMessage(ethereum, address);

    loadingText.value = "登录中...";
    await userStore.login({
      address,
      signTime,
      loginSign,
      device: authStore.deviceId,
      deviceType: "web",
    });

    const redirect = safeRedirect((route.query.redirect as string) || "/");
    await router.replace(redirect);
  } catch (error) {
    handleLoginError(error);
  } finally {
    loading.value = false;
    loadingText.value = "连接钱包并登录";
  }
}

function safeRedirect(raw: string) {
  let redirect = "/";
  try {
    redirect = decodeURIComponent(String(raw)) || "/";
  } catch {
    redirect = "/";
  }
  return redirect.startsWith("/") ? redirect : "/";
}

function shortAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function handleLoginError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (message === "WALLET_NOT_FOUND") {
    ElMessage.error("未检测到钱包插件，请安装 MetaMask 或 TokenPocket");
    return;
  }
  if (message === "WALLET_ADDRESS_EMPTY") {
    ElMessage.error("未获取到钱包地址");
    return;
  }
  if (/user rejected|User denied|rejected|4001/i.test(message)) {
    ElMessage.warning("已取消钱包连接或签名");
    return;
  }
  if (message) {
    ElMessage.error(message);
  }
}
</script>

<style lang="scss" scoped>
.auth-view {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  padding: clamp(1rem, 3vw, 2rem);
  overflow: hidden;
  background-color: #f5f7ff;

  &::before {
    position: fixed;
    inset: 0;
    z-index: -2;
    content: "";
    background: url("@/assets/images/login-bg.svg") center/cover no-repeat;
  }

  &::after {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    content: "";
    background: linear-gradient(120deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
  }
}

.auth-view__toolbar {
  display: inline-flex;
  gap: 0.75rem;
  align-self: flex-end;
  padding: 0.5rem 0.75rem;
  background-color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(22, 93, 255, 0.15);
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(22, 93, 255, 0.12);

  .toolbar-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: var(--el-fill-color);
    }
  }
}

.auth-view__wrapper {
  display: grid;
  flex: 1;
  align-items: center;
  justify-items: center;
  padding: clamp(1.5rem, 2vw, 2.5rem);
}

.auth-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: min(420px, 100%);
  padding: clamp(1.5rem, 3vw, 2rem);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(22, 93, 255, 0.1);
  border-radius: 16px;
  box-shadow:
    0 16px 48px rgba(22, 93, 255, 0.12),
    0 4px 16px rgba(22, 93, 255, 0.08);
  backdrop-filter: blur(20px);
}

.auth-panel__brand {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.875rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid rgba(22, 93, 255, 0.06);
}

.auth-panel__logo-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: radial-gradient(circle at 30% 20%, #ffffff, #e6efff);
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(22, 93, 255, 0.16);
}

.auth-panel__logo {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

.auth-panel__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.auth-panel__title-row {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
}

.auth-panel__title {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.2rem;
  font-weight: 650;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.auth-panel__version-row {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.78rem;
}

.wallet-login {
  display: grid;
  gap: 1rem;
}

.wallet-login__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 650;
  text-align: center;
}

.wallet-login__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.875rem;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.wallet-login__status-label {
  color: var(--el-text-color-secondary);
}

.wallet-login__status-value {
  max-width: 180px;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-login__button {
  width: 100%;
  min-height: 44px;

  span {
    margin-left: 0.35rem;
  }
}

.wallet-login__providers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  .wallet-login__provider {
    margin: 0;
  }
}

.auth-panel__footer {
  padding-top: 0.875rem;
  font-size: 0.875rem;
  text-align: center;
  border-top: 1px solid rgba(22, 93, 255, 0.06);

  a {
    margin-left: 0.25rem;
    color: rgba(22, 93, 255, 0.85);
    text-decoration: none;
  }
}

.dark {
  .auth-view__toolbar,
  .auth-panel {
    background-color: rgba(24, 28, 43, 0.9);
    border-color: rgba(64, 128, 255, 0.35);
  }
}

@media (max-width: 640px) {
  .auth-view {
    padding: 1rem;
  }

  .auth-view__toolbar {
    position: fixed;
    top: 12px;
    right: 16px;
    z-index: 20;
  }

  .auth-view__wrapper {
    padding: 4rem 0 1.5rem;
  }

  .wallet-login__providers {
    grid-template-columns: 1fr;
  }
}
</style>
