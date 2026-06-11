/**
 * 认证凭证管理 Store
 * 管理 accessToken、publicKey、salt、deviceId
 * 凭证使用 AES 加密后存储在 sessionStorage
 * @module store/modules/auth
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { aesEncrypt, aesDecrypt } from '@/utils/crypto';
import { AP_KEY, DEFAULT_SALT, DEFAULT_PUBLIC_KEY } from '@/api/constants';
import type { UserInfo } from '@/types/api';

const CREDENTIALS_KEY = 'auth_credentials';
const DEVICE_KEY = 'auth_device';

export const useAuthStore = defineStore('auth', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────

  /** Access Token */
  const accessToken = ref('');

  /** RSA 公钥（登录后为服务端返回值，否则为默认值） */
  const publicKey = ref(DEFAULT_PUBLIC_KEY);

  /** 盐值（登录后为服务端返回值，否则为默认值） */
  const salt = ref(DEFAULT_SALT);

  /** 设备标识 */
  const deviceId = ref(
    sessionStorage.getItem(DEVICE_KEY) ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  /** 用户信息 */
  const userInfo = ref<UserInfo | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────────────────────

  /** 是否已登录 */
  const isLoggedIn = computed(() => !!accessToken.value);

  /** 验证公钥是否有效 */
  function isValidPublicKey(key: string): boolean {
    if (!key) return false;
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(key);
  }

  /** 当前使用的公钥 */
  const currentPublicKey = computed(() =>
    isValidPublicKey(publicKey.value) ? publicKey.value : DEFAULT_PUBLIC_KEY
  );

  /** 当前使用的盐值 */
  const currentSalt = computed(() => salt.value || DEFAULT_SALT);

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 从 sessionStorage 加载并解密凭证
   * 页面刷新时调用
   */
  function loadFromStorage() {
    const encrypted = sessionStorage.getItem(CREDENTIALS_KEY);
    if (encrypted) {
      try {
        const raw = aesDecrypt(encrypted, AP_KEY);
        const parts = raw.split('|');
        if (parts.length === 3) {
          accessToken.value = parts[0];
          salt.value = parts[1];
          publicKey.value = parts[2];
        }
      } catch {
        sessionStorage.removeItem(CREDENTIALS_KEY);
      }
    }
  }

  /**
   * 将当前凭证加密后写入 sessionStorage
   * 不含 refreshToken，它由 Cookie 管理
   */
  function saveToStorage() {
    const raw = [accessToken.value, salt.value, publicKey.value].join('|');
    const encrypted = aesEncrypt(raw, AP_KEY);
    sessionStorage.setItem(CREDENTIALS_KEY, encrypted);
  }

  /**
   * 登录成功后保存凭证
   * 后端返回的字段已经过 AES 解密后传入
   * refreshToken 由 Set-Cookie 自动写入浏览器 Cookie，前端不存储
   */
  function setAuth(params: { accessToken: string; publicKey: string; salt: string }) {
    accessToken.value = params.accessToken;
    publicKey.value = params.publicKey;
    salt.value = params.salt;
    saveToStorage();
  }

  /**
   * 刷新 Token 成功后更新凭证
   * 后端返回的字段已经过 AES 解密后传入
   * 新 refreshToken 由 Set-Cookie 自动更新浏览器 Cookie，前端不处理
   */
  function updateTokens(params: { accessToken: string; publicKey?: string; salt?: string }) {
    accessToken.value = params.accessToken;
    if (params.publicKey != null) publicKey.value = params.publicKey;
    if (params.salt != null) salt.value = params.salt;
    saveToStorage();
  }

  /**
   * 登出或认证失败时清除所有本地凭证
   * refreshToken Cookie 由服务端 Set-Cookie: Max-Age=0 清除
   */
  function clearAuth() {
    accessToken.value = '';
    publicKey.value = DEFAULT_PUBLIC_KEY;
    salt.value = DEFAULT_SALT;
    sessionStorage.removeItem(CREDENTIALS_KEY);
  }

  /**
   * 设置设备标识
   */
  function setDeviceId(id: string) {
    deviceId.value = id;
    sessionStorage.setItem(DEVICE_KEY, id);
  }

  /**
   * 设置用户信息
   */
  function setUserInfo(info: UserInfo) {
    userInfo.value = info;
  }

  /**
   * 清除用户信息
   */
  function clearUserInfo() {
    userInfo.value = null;
  }

  // 初始化时从 sessionStorage 加载
  loadFromStorage();
  sessionStorage.setItem(DEVICE_KEY, deviceId.value);

  return {
    // State
    accessToken,
    publicKey,
    salt,
    deviceId,
    userInfo,
    // Getters
    isLoggedIn,
    currentPublicKey,
    currentSalt,
    // Actions
    setAuth,
    updateTokens,
    clearAuth,
    setDeviceId,
    setUserInfo,
    clearUserInfo,
    loadFromStorage,
  };
});
