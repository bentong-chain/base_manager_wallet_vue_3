/**
 * 钱包管理 Store
 * 管理钱包账户、登录状态
 * @module stores/modules/wallet
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { BrowserProvider } from 'ethers';
import { end, start } from '@/api/loading';
import { useAppKitProvider } from '@reown/appkit/vue';
import { useUserStore } from '@/store';
import { useAuthStore } from '@/store/modules/auth';
import { store } from '@/store';

export const useWalletStore = defineStore('wallet', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────

  /** 钱包账户地址 */
  const walletAccount = ref<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────────────────────

  /** 是否已连接钱包 */
  const isWalletConnected = computed(() => !!walletAccount.value);

  /** 获取钱包账户地址 */
  const getWalletAccount = computed(() => walletAccount.value);

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 清空钱包数据
   */
  function clearData() {
    walletAccount.value = null;
  }

  /**
   * 设置钱包账户地址
   */
  function setWalletAccount(account: string) {
    walletAccount.value = account;
  }

  /**
   * 钱包登录
   * @param account 钱包账户地址
   * @returns Promise<boolean> 登录是否成功
   */
  async function login(account: string): Promise<boolean> {
    const userStore = useUserStore();
    const authStore = useAuthStore(store);

    try {
      const signTime = Date.now();
      const signInfoName = import.meta.env.VITE_APP_SIGN_INFO_NAME;
      const baseURL = import.meta.env.VITE_APP_SIGN_INFO_URL;
      console.log(baseURL);
      const signStr =
        signInfoName +
        ' wants you to sign in with your account:\n' +
        account +
        '\n\nSign in with account to the admin console.\n\nURI: ' +
        baseURL +
        '\nLogin time: ' +
        signTime.toString();

      start();

      // 获取钱包提供者
      const { walletProvider } = useAppKitProvider('eip155');
      const ethersProvider = new BrowserProvider(walletProvider as any);
      const signer = await ethersProvider.getSigner();

      // 签名消息
      const signature = await signer.signMessage(signStr);

      // 调用 userStore.walletLogin，内部已处理认证状态同步和用户信息获取
      await userStore.login({
        address: account,
        signTime,
        loginSign: signature,
        device: authStore.deviceId,
        deviceType: 'web',
      });

      end();

      // 登录成功，设置钱包地址
      setWalletAccount(account);

      return true;
    } catch (error) {
      console.error('钱包登录失败:', error);
      end();
      return false;
    }
  }

  return {
    // State
    walletAccount,
    // Getters
    isWalletConnected,
    getWalletAccount,
    // Actions
    clearData,
    setWalletAccount,
    login,
  };
});
