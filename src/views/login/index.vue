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
              {{ walletAddress ? walletAddress : "未连接" }}
            </div>
          </div>

          <el-button
            type="primary"
            size="large"
            class="wallet-login__button"
            @click="connectWallet"
          >
            <el-icon><Connection /></el-icon>
            <span>{{ loadingText }}</span>
          </el-button>

          <div class="wallet-login__providers">
            <el-button class="wallet-login__provider" @click="connectWallet">MetaMask</el-button>
            <el-button class="wallet-login__provider" @click="connectWallet">TokenPocket</el-button>
          </div>
        </div>

        <footer class="auth-panel__footer">
          <el-text size="small">
            Copyright © 2026
            <!-- <a href="#" target="_blank">备案号</a> -->
          </el-text>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAppKit, useAppKitAccount, useDisconnect } from "@reown/appkit/vue";
import { Connection } from "@element-plus/icons-vue";
import logo from "@/assets/images/logo.png";
import ThemeSwitch from "@/components/ThemeSwitch/index.vue";
import { appConfig } from "@/settings";
import { useWalletStore } from "@/store/modules/wallet";
import { useUserStore } from "@/store";

const { t } = useI18n();
const router = useRouter();
const walletStore = useWalletStore();
const userStore = useUserStore();

const { open } = useAppKit();
const accountData = useAppKitAccount();
const { disconnect } = useDisconnect();

const tenantEnabled = appConfig.tenantEnabled;
const loadingText = ref("连接钱包并登录");

const walletAddress = computed(() => {
  return walletStore.walletAccount && walletStore.walletAccount.length >= 10
    ? walletStore.walletAccount.slice(0, 6) + "..." + walletStore.walletAccount.slice(-4)
    : "";
});

const connectWallet = async () => {
  await open();
};

// 监听连接的钱包地址变化
watch(
  () => accountData.value?.address,
  async (newAddr, oldAddr) => {
    // 当oldAddr有值且与newAddr不同时，表示地址发生了改变，才需要清除登录信息
    if (oldAddr && newAddr !== oldAddr) {
      console.log("退出", newAddr, oldAddr);

      // 清空一下本地缓存登录信息
      walletStore.clearData();
      userStore.resetAllState();
    }

    // 钱包已经连接，且新地址与原地址不相同，表示地址发生了改变
    if (newAddr && newAddr !== oldAddr) {
      console.log("登录", newAddr, oldAddr);
      if (walletStore.walletAccount === newAddr) {
        console.log("地址相同，无需初始化");
        return;
      }

      // 登录钱包
      await walletStore
        .login(newAddr)
        .then(async (result) => {
          console.log(result);
          if (!result) {
            console.log("登录失败");

            // 断开连接
            await disconnect();
            // 清空一下本地缓存登录信息
            walletStore.clearData();
            userStore.resetAllState();

            return;
          }
          console.log("登录成功");
          setTimeout(() => {
            router.push("/notice");
          }, 500);
        })
        .catch(async (err) => {
          console.log("登录失败", err);

          // 断开连接
          await disconnect();
          // 清空一下本地缓存登录信息
          walletStore.clearData();
          userStore.resetAllState();
        });
    }
  },
  { immediate: true } // 立即执行
);
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
