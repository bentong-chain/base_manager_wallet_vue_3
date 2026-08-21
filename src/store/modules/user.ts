import { store } from '@/store';

import AuthAPI from '@/api/auth-api';
import UserAPI from '@/api/system/user';
import type { LoginRequest, UserInfo, AdminWalletLoginRequest } from '@/types/api';
import type { AuthCredentialsOverride } from '@/utils/request';
import { AuthStorage } from '@/utils/auth';
import { useAuthStore } from '@/store/modules/auth';
import { usePermissionStoreHook } from '@/store/modules/permission';
import { useDictStoreHook } from '@/store/modules/dict';
import { useTagsViewStore } from '@/store';
import { cleanupWebSocket } from '@/composables';
import { DEFAULT_PUBLIC_KEY, DEFAULT_SALT } from '@/api/constants';
import { useDisconnect } from '@reown/appkit/vue';
import { useWalletStore } from '@/store/modules/wallet';

const USE_SIGN_AUTH = import.meta.env.VITE_USE_SIGN_AUTH === 'true';

export const useUserStore = defineStore('user', () => {
  // 用户信息
  const userInfo = ref<UserInfo>({} as UserInfo);
  // 记住我状态
  const rememberMe = ref(AuthStorage.getRememberMe());

  /**
   * 登录
   * 签名模式且后端返回 publicKey/salt 时，解密后写入 authStore；否则走原有 AuthStorage
   * 对接 api.json：AdminLoginRequest 含 username, password, device?, deviceType?
   */
  async function login(loginRequest: LoginRequest): Promise<void> {
    const authStore = useAuthStore(store);
    const payload: LoginRequest = {
      ...loginRequest,
      device: loginRequest.device ?? authStore.deviceId,
      deviceType: loginRequest.deviceType ?? 'web',
    };
    const res = await AuthAPI.login(payload);
    rememberMe.value = loginRequest.rememberMe ?? false;

    if (USE_SIGN_AUTH) {
      const { accessToken, publicKey, salt } = res;
      // 同步到 authStore，确保请求拦截器能获取到 token
      useAuthStore(store).setAuth({
        accessToken,
        publicKey: publicKey || DEFAULT_PUBLIC_KEY,
        salt: salt || DEFAULT_SALT,
      });
      // 登录成功后立即调 info，显式传入本次凭证，避免拦截器未读到 store 导致 header 无 token
      await getUserInfo({
        token: accessToken,
        salt: salt || DEFAULT_SALT,
        publicKey: publicKey || DEFAULT_PUBLIC_KEY,
      });
    } else {
      // Bearer 模式：token 写入 AuthStorage，直接拉取用户信息
      AuthStorage.setTokens(res.accessToken, res.refreshToken ?? '', rememberMe.value);
      await getUserInfo();
    }
  }

  /**
   * 钱包登录
   * 签名模式且后端返回 publicKey/salt 时，解密后写入 authStore；否则走原有 AuthStorage
   */
  async function walletLogin(loginRequest: AdminWalletLoginRequest): Promise<void> {
    console.log('walletLogin');
    const authStore = useAuthStore(store);
    const payload: AdminWalletLoginRequest = {
      ...loginRequest,
      device: loginRequest.device ?? authStore.deviceId,
      deviceType: loginRequest.deviceType ?? 'web',
    };
    const res = await AuthAPI.walletLogin(payload);

    if (USE_SIGN_AUTH) {
      const { accessToken, publicKey, salt } = res;
      // 同步到 authStore，确保请求拦截器能获取到 token
      useAuthStore(store).setAuth({
        accessToken,
        publicKey: publicKey || DEFAULT_PUBLIC_KEY,
        salt: salt || DEFAULT_SALT,
      });
      // 登录成功后立即调 info，显式传入本次凭证，避免拦截器未读到 store 导致 header 无 token
      await getUserInfo({
        token: accessToken,
        salt: salt || DEFAULT_SALT,
        publicKey: publicKey || DEFAULT_PUBLIC_KEY,
      });
    } else {
      // Bearer 模式：token 写入 AuthStorage，直接拉取用户信息
      // 钱包登录接口不返回 refreshToken，使用空字符串
      AuthStorage.setTokens(res.accessToken, '', false);
      await getUserInfo();
    }
  }

  let refreshPromise: Promise<void> | null = null;

  /**
   * 刷新 token（单飞模式）
   *
   * 多个并发请求遇到 token 过期时，共享同一次 refresh 请求。
   */
  function refreshTokenOnce(): Promise<void> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = doRefreshToken().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  }

  /**
   * 获取用户信息
   * @param credentials 可选，登录后立即调用时传入 token（及 salt/publicKey），保证请求头带 token
   */
  async function getUserInfo(credentials?: AuthCredentialsOverride): Promise<UserInfo> {
    const data = await UserAPI.getInfo(credentials);
    if (!data) {
      throw new Error('Verification failed, please Login again.');
    }
    Object.assign(userInfo.value, data);
    return data;
  }

  /**
   * 登出
   */
  async function logout(): Promise<void> {
    const { disconnect } = useDisconnect();
    const walletStore = useWalletStore();

    await AuthAPI.logout();
    // 断开连接
    await disconnect();
    // 清空一下本地缓存登录信息
    walletStore.clearData();
    resetAllState();
  }

  /**
   * 重置所有系统状态
   *
   * 统一处理所有清理工作，包括用户凭证、路由、缓存等
   */
  async function resetAllState(): Promise<void> {
    const { disconnect } = useDisconnect();
    // 1. 重置用户状态
    resetUserState();

    // 2. 重置其他模块状态
    usePermissionStoreHook().resetRouter();
    useDictStoreHook().clearDictCache();
    useTagsViewStore().delAllViews();

    // 3. 清理 WebSocket 连接
    cleanupWebSocket();

    // 断开连接
    await disconnect();
  }

  /**
   * 重置用户状态
   *
   * 仅处理用户模块内的状态
   */
  function resetUserState(): void {
    AuthStorage.clearAuth();
    useAuthStore(store).clearAuth();
    userInfo.value = {} as UserInfo;
  }

  /**
   * 刷新 token
   */
  async function doRefreshToken(): Promise<void> {
    const currentRefreshToken = AuthStorage.getRefreshToken();

    if (!currentRefreshToken) {
      throw new Error('没有有效的刷新令牌');
    }

    const { accessToken, refreshToken: newRefreshToken } = await AuthAPI.refreshToken(
      currentRefreshToken,
      useAuthStore(store).deviceId
    );
    AuthStorage.setTokens(accessToken, newRefreshToken ?? '', AuthStorage.getRememberMe());
  }

  return {
    userInfo,
    rememberMe,
    isLoggedIn: () =>
      USE_SIGN_AUTH ? useAuthStore(store).isLoggedIn : !!AuthStorage.getAccessToken(),
    login,
    walletLogin,
    logout,
    getUserInfo,
    resetAllState,
    resetUserState,
    refreshToken: doRefreshToken,
    refreshTokenOnce,
  };
});

/**
 * 在组件外部使用 UserStore 的钩子函数
 *
 * @see https://pinia.vuejs.org/core-concepts/outside-component-usage.html
 */
export function useUserStoreHook() {
  return useUserStore(store);
}
