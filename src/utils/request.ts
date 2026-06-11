import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import qs from 'qs';
import { ApiCodeEnum, SubCode } from '@/enums/api';
import { useUserStoreHook } from '@/store/modules/user';
import { usePermissionStoreHook } from '@/store/modules/permission';
import { useAuthStore } from '@/store/modules/auth';
import { AuthStorage, redirectToLogin } from '@/utils/auth';
import { buildAuthHeaderValues } from '@/api/auth';
import { encryptWithPublicKey } from '@/utils/rsa';
import { aesBackendDecrypt } from '@/utils/crypto';
import { AP_KEY, DEFAULT_PUBLIC_KEY, DEFAULT_SALT, NO_AUTH_HEADER_VALUE } from '@/api/constants';
import type { RefreshTokenResponse } from '@/types/api/auth';
import type { ApiResponse } from '@/types/api/common';
import { store } from '@/store';

const USE_SIGN_AUTH = import.meta.env.VITE_USE_SIGN_AUTH === 'true';
// 开发直连：VITE_APP_API_URL 有值时直接请求后端（不经过 Vite 代理）；否则用 VITE_APP_BASE_API（代理或生产同源）
const BASE_URL =
  (import.meta.env.VITE_APP_API_URL as string)?.trim() || import.meta.env.VITE_APP_BASE_API || '';
const REFRESH_PATH = import.meta.env.VITE_APP_AUTH_REFRESH_PATH ?? '/api/v1/auth/refresh-token';

// 记录已重试的请求，防止无限循环（Bearer 模式）
const retriedConfigs = new WeakSet<InternalAxiosRequestConfig>();

/** 请求时显式传入的认证凭证（用于登录后立即调 info 等场景，避免依赖 store 更新时序） */
export interface AuthCredentialsOverride {
  token: string;
  salt?: string;
  publicKey?: string;
}

/** 通过 header 传递凭证（axios 会过滤 config 自定义字段，用 header 保证拦截器能读到） */
export const HEADER_AUTH_CREDENTIALS = 'X-Internal-Auth-Credentials';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 签名模式：Token 刷新状态与刷新请求
// ─────────────────────────────────────────────────────────────────────────────

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function onRefreshSuccess(newAccessToken: string) {
  pendingRequests.forEach(({ resolve }) => resolve(newAccessToken));
  pendingRequests = [];
}

function onRefreshFailure(error: unknown) {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests = [];
}

/** 解密后端 AES 加密传输的字段（签名模式） */
function decryptField(value: string, isPublicKey = false): string {
  if (!/^[0-9a-fA-F]+$/.test(value)) {
    return value;
  }
  try {
    const decryptedValue = aesBackendDecrypt(value, AP_KEY);
    if (isPublicKey) {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(decryptedValue)) return value;
    }
    return decryptedValue || value;
  } catch {
    return value;
  }
}

/** 签名模式：调用刷新接口，refreshToken 由 Cookie 携带 */
async function doRefreshTokenSignAuth(): Promise<RefreshTokenResponse> {
  const authStore = useAuthStore(store);
  const { data } = await axios.post<{
    code: number;
    data?: RefreshTokenResponse;
    message?: string;
  }>(`${BASE_URL}${REFRESH_PATH}`, { device: authStore.deviceId }, { withCredentials: true });
  if (!data?.data) {
    throw new Error(data?.message ?? '刷新 Token 失败');
  }
  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP 实例
// ─────────────────────────────────────────────────────────────────────────────

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 50000,
  headers: { 'Content-Type': 'application/json;charset=utf-8' },
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
  withCredentials: USE_SIGN_AUTH,
});

// ─────────────────────────────────────────────────────────────────────────────
// 请求拦截器
// ─────────────────────────────────────────────────────────────────────────────

http.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const isNoAuthRequest = config.headers?.Authorization === NO_AUTH_HEADER_VALUE;
    if (isNoAuthRequest) {
      delete config.headers.Authorization;
    }
    if (USE_SIGN_AUTH) {
      const authStore = useAuthStore(store);
      // 从 header 读取显式传入的凭证（axios 会过滤 config 自定义字段，用 header 保证能读到）
      let override: AuthCredentialsOverride | null = null;
      const rawCreds = config.headers?.[HEADER_AUTH_CREDENTIALS];
      if (rawCreds && typeof rawCreds === 'string') {
        try {
          override = JSON.parse(rawCreds) as AuthCredentialsOverride;
          delete config.headers[HEADER_AUTH_CREDENTIALS];
        } catch {
          override = null;
        }
      }
      // 最终用于签名和下发到 X-Auth-Token 的 token：
      // 1）no-auth 请求一律空；2）优先使用本次显式传入的 token；
      // 3）否则用 authStore 中登录时写入的 accessToken；4）再退回本地存储的 token（兼容历史逻辑）
      const token = isNoAuthRequest
        ? ''
        : (override?.token ?? authStore.accessToken ?? AuthStorage.getAccessToken() ?? '');
      const salt = isNoAuthRequest ? DEFAULT_SALT : (override?.salt ?? authStore.currentSalt);
      const publicKey = isNoAuthRequest
        ? DEFAULT_PUBLIC_KEY
        : (override?.publicKey ?? authStore.currentPublicKey);
      const method = (config.method ?? 'get').toLowerCase();
      let businessParams: Record<string, unknown> = {};
      if (method === 'get') {
        businessParams =
          config.params && typeof config.params === 'object' ? { ...config.params } : {};
      } else {
        if (typeof config.data === 'object' && config.data !== null) {
          businessParams = { ...config.data };
        } else if (typeof config.data === 'string') {
          try {
            businessParams = JSON.parse(config.data) as Record<string, unknown>;
          } catch {
            businessParams = {};
          }
        }
        // PATCH/DELETE 等可能用 params 传参（如 status），需并入签名与后端验签一致
        if (
          config.params &&
          typeof config.params === 'object' &&
          Object.keys(config.params).length > 0
        ) {
          businessParams = { ...businessParams, ...config.params };
        }
      }
      const headers = await buildAuthHeaderValues(
        {
          token,
          salt,
          device: authStore.deviceId,
          businessParams,
        },
        (plain) => encryptWithPublicKey(plain, publicKey)
      );
      Object.assign(config.headers, headers);
    } else {
      const token = isNoAuthRequest ? '' : AuthStorage.getAccessToken();
      // 始终带上 Authorization 头：有 token 时传 Bearer，登录/验证码等传空字符串
      config.headers.Authorization = token ? `Bearer ${token}` : '';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────────────────────
// 响应拦截器
// ─────────────────────────────────────────────────────────────────────────────

http.interceptors.response.use(
  (response: AxiosResponse<ApiResponse & { subCode?: string }>) => {
    const { responseType } = response.config;
    if (responseType === 'blob' || responseType === 'arraybuffer') {
      return response;
    }
    const { code, data, msg, message } = response.data;
    const success =
      code === ApiCodeEnum.SUCCESS ||
      String(code) === '1' ||
      code === 200 ||
      String(code) === '200';
    if (success) {
      return data;
    }
    const errMsg = msg ?? message ?? '系统出错';
    const subCode = response.data?.subCode;
    const isTokenInvalid =
      code === ApiCodeEnum.ACCESS_TOKEN_INVALID ||
      code === ApiCodeEnum.REFRESH_TOKEN_INVALID ||
      subCode === SubCode.TOKEN_INVALID ||
      subCode === SubCode.REFRESH_TOKEN_INVALID;
    if (isTokenInvalid) {
      if (USE_SIGN_AUTH) {
        useAuthStore(store).clearAuth();
      } else {
        AuthStorage.clearAuth();
      }
      redirectToLogin(errMsg);
      return Promise.reject(new Error(errMsg));
    }
    ElMessage.error(errMsg);
    return Promise.reject(new Error(errMsg));
  },

  async (error: AxiosError<ApiResponse & { subCode?: string }>) => {
    console.log('[Response Error] 错误详情:', error);
    console.log('[Response Error] 响应:', error.response);
    const config = error.config as InternalAxiosRequestConfig | undefined;
    const res = error.response;
    if (!res) {
      ElMessage.error('网络连接失败');
      return Promise.reject(error);
    }

    const responseData = res.data;
    const code = responseData?.code;
    const msg = responseData?.msg ?? responseData?.message;
    const subCode = responseData?.subCode;
    const status = res.status;

    const setHeader = (key: string, value: string) => {
      if (config?.headers) {
        if (typeof config.headers.set === 'function') {
          config.headers.set(key, value);
        } else {
          (config.headers as Record<string, string>)[key] = value;
        }
      }
    };

    // ── 401 处理 ──
    if (status === 401) {
      if (USE_SIGN_AUTH) {
        const authStore = useAuthStore(store);
        const needRefresh =
          subCode === SubCode.TOKEN_EXPIRED ||
          subCode === SubCode.UNAUTHORIZED ||
          code === ApiCodeEnum.ACCESS_TOKEN_INVALID;

        if (needRefresh && config && !config._retry) {
          if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              pendingRequests.push({ resolve, reject });
            }).then((newToken) => {
              setHeader('X-Auth-Token', newToken);
              return config ? http(config) : Promise.reject(error);
            });
          }
          config._retry = true;
          isRefreshing = true;
          try {
            const refreshData = await doRefreshTokenSignAuth();
            const newAccessToken = decryptField(refreshData.accessToken);
            const newPublicKey = decryptField(refreshData.publicKey, true);
            const newSalt = decryptField(refreshData.salt);
            authStore.updateTokens({
              accessToken: newAccessToken,
              publicKey: newPublicKey,
              salt: newSalt,
            });
            onRefreshSuccess(newAccessToken);
            setHeader('X-Auth-Token', newAccessToken);
            return http(config);
          } catch (refreshErr) {
            onRefreshFailure(refreshErr);
            authStore.clearAuth();
            await redirectToLogin('登录已过期，请重新登录');
            return Promise.reject(refreshErr);
          } finally {
            isRefreshing = false;
          }
        }

        authStore.clearAuth();
        if (subCode === SubCode.TOKEN_INVALID) {
          await redirectToLogin('登录已失效（账号在其他设备登录），请重新登录');
        } else if (subCode === SubCode.REFRESH_TOKEN_INVALID) {
          await redirectToLogin('登录已过期，请重新登录');
        } else {
          await redirectToLogin('请先登录');
        }
        return Promise.reject(error);
      }

      // Bearer 模式：Token 过期
      if (code === ApiCodeEnum.ACCESS_TOKEN_INVALID && config) {
        if (retriedConfigs.has(config)) {
          await redirectToLogin('登录已过期，请重新登录');
          return Promise.reject(new Error('Token Invalid'));
        }
        retriedConfigs.add(config);
        try {
          const userStore = useUserStoreHook();
          await userStore.refreshTokenOnce();
          const token = AuthStorage.getAccessToken();
          if (token) {
            setHeader('Authorization', `Bearer ${token}`);
          }
          return http(config);
        } catch {
          await redirectToLogin('登录已过期，请重新登录');
          return Promise.reject(new Error('Token refresh failed'));
        }
      }
      if (code === ApiCodeEnum.REFRESH_TOKEN_INVALID) {
        await redirectToLogin('登录已过期，请重新登录');
        return Promise.reject(new Error(msg || 'Token Invalid'));
      }
    }

    // 兜底：后端仅返回 HTTP 401（无业务 code/subCode），也视为未登录/登录失效，统一跳转登录
    if (status === 401) {
      if (USE_SIGN_AUTH) {
        useAuthStore(store).clearAuth();
      } else {
        AuthStorage.clearAuth();
      }
      await redirectToLogin(msg || '请先登录');
      return Promise.reject(new Error(msg || '请先登录'));
    }

    // 权限不足
    if (code === ApiCodeEnum.PERMISSION_DENIED) {
      const permissionStore = usePermissionStoreHook();
      await permissionStore.reloadPermissionSnapshotOnce();
      ElMessage.error(msg || '权限不足');
      return Promise.reject(new Error(msg || '权限不足'));
    }

    ElMessage.error(msg || '请求失败');
    return Promise.reject(new Error(msg || '请求失败'));
  }
);

export { http };
export default http;
