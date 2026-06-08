/**
 * 认证相关类型定义
 */

export interface LoginRequest {
  /** 管理员钱包地址 */
  address?: string;
  /** 签名时间戳，毫秒 */
  signTime?: number;
  /** 钱包签名结果 */
  loginSign?: string;
  /** 设备标识 */
  device?: string;
  /** 设备类型 */
  deviceType?: string;
  /** 历史账号密码登录字段，仅保留以兼容未使用的旧组件类型 */
  username?: string;
  password?: string;
  captchaKey?: string;
  captchaAnswer?: string;
  captchaCode?: string;
  captchaId?: string;
  rememberMe?: boolean;
  tenantId?: number;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌（签名模式时由 HttpOnly Cookie 下发，可不返回） */
  refreshToken?: string;
  /** 令牌类型 */
  tokenType?: string;
  /** 过期时间(单位:秒) */
  expiresIn?: number;
  /** 签名模式：RSA 公钥（可能 AES 加密传输，需解密） */
  publicKey?: string;
  /** 签名模式：盐值（可能 AES 加密传输，需解密） */
  salt?: string;
  /** 签名模式：Access Token 过期秒数 */
  accessExpiresIn?: number;
  uid?: number;
  username?: string;
}

/**
 * 刷新 Token 响应（签名模式，refreshToken 由 Cookie 携带）
 * accessToken、publicKey、salt 可能为 AES 加密，前端需解密
 */
export interface RefreshTokenResponse {
  accessToken: string;
  accessExpiresIn?: number;
  publicKey: string;
  salt: string;
}

export interface CaptchaInfo {
  /** 验证码唯一标识，格式 captcha:{uuid} */
  captchaKey: string;
  /** 验证码图片（Base64 编码，含 data:image/png;base64, 前缀） */
  captchaImage: string;
  /** 有效期（秒） */
  expiresIn: number;
}
