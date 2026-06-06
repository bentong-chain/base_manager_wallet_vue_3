/**
 * API 相关枚举
 *
 * @description
 * 包含 API 响应码、请求状态等枚举定义
 */

/**
 * API 响应码枚举
 */
export const enum ApiCodeEnum {
  /**
   * 成功
   */
  SUCCESS = "00000",

  /**
   * 访问令牌无效或过期
   */
  ACCESS_TOKEN_INVALID = "A0230",

  /**
   * 刷新令牌无效或过期
   */
  REFRESH_TOKEN_INVALID = "A0231",

  /**
   * 权限不足
   */
  PERMISSION_DENIED = "A0301",

  /**
   * 需要选择租户
   */
  CHOOSE_TENANT = "A0250",
}

/**
 * 认证子错误码（与 common-system 后端 subCode 一致，用于 401 细分处理）
 */
export const SubCode = {
  /** Access Token 过期，可尝试刷新 */
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  /** Token 无效（被踢下线、设备不匹配等），需重新登录 */
  TOKEN_INVALID: "TOKEN_INVALID",
  /** 缺少 Token 或设备标识 */
  TOKEN_OR_DEVICE_MISSING: "TOKEN_OR_DEVICE_MISSING",
  /** Refresh Token 无效或已过期，需重新登录 */
  REFRESH_TOKEN_INVALID: "REFRESH_TOKEN_INVALID",
} as const;
