import { http as request } from "@/utils/request";
import { NO_AUTH_HEADER_VALUE, AP_KEY } from "@/api/constants";
import { aesBackendDecrypt } from "@/utils/crypto";
import type { LoginRequest, LoginResponse, CaptchaInfo } from "@/types/api/auth";

/** 管理员认证接口基础路径，对接 http://localhost:8099（api.json） */
const AUTH_BASE_URL = "/api";

const AuthAPI = {
  /** 管理员登录：POST /api/admin/auth/login（不携带 token，使用默认公钥与 salt） */
  async login(data: LoginRequest) {
    const payload: Record<string, unknown> = {
      username: data.username,
      password: data.password,
    };
    if (data.captchaKey != null) payload.captchaKey = data.captchaKey;
    if (data.captchaAnswer != null) payload.captchaAnswer = data.captchaAnswer;
    if (data.device != null) payload.device = data.device;
    if (data.deviceType != null) payload.deviceType = data.deviceType;

    const response = await request<any, LoginResponse>({
      url: `${AUTH_BASE_URL}/v1/admin/auth/login`,
      method: "post",
      data: payload,
      headers: { Authorization: NO_AUTH_HEADER_VALUE },
    });

    console.log("[auth-api] 原始响应:", response);
    const decryptedAccessToken = aesBackendDecrypt(response.accessToken, AP_KEY);
    const decryptedPublicKey = aesBackendDecrypt(response.publicKey, AP_KEY);
    const decryptedSalt = aesBackendDecrypt(response.salt, AP_KEY);
    console.log("[auth-api] 解密后:", { decryptedAccessToken, decryptedPublicKey, decryptedSalt });

    // 解密后端返回的加密字段
    return {
      ...response,
      accessToken: decryptedAccessToken,
      publicKey: decryptedPublicKey,
      salt: decryptedSalt,
    };
  },

  /** 切换租户(平台用户) - 返回新的 token（若后端未提供可保留兼容） */
  switchTenant(tenantId: number) {
    return request<any, LoginResponse>({
      url: "/api/v1/auth/switch-tenant",
      method: "post",
      params: { tenantId },
    });
  },

  /** 刷新 Token：POST /api/admin/auth/token/refresh（不携带 accessToken，使用默认公钥与 salt） */
  refreshToken(refreshToken: string, device?: string) {
    return request<any, LoginResponse>({
      url: `${AUTH_BASE_URL}/v1/admin/auth/token/refresh`,
      method: "post",
      data: { refreshToken, ...(device != null ? { device } : {}) },
      headers: { Authorization: NO_AUTH_HEADER_VALUE },
    });
  },

  /** 管理员登出：POST /api/admin/auth/logout */
  logout() {
    return request({
      url: `${AUTH_BASE_URL}/v1/admin/auth/logout`,
      method: "post",
    });
  },

  /** 获取数学算式验证码：GET /api/admin/auth/captcha（不携带 token，使用默认公钥与 salt） */
  getCaptcha() {
    return request<any, CaptchaInfo>({
      url: `${AUTH_BASE_URL}/public/captcha`,
      method: "get",
      headers: { Authorization: NO_AUTH_HEADER_VALUE },
    });
  },
};

export default AuthAPI;
