/**
 * 认证相关类型定义
 */

/**
 * 登录请求参数（兼容 api.json AdminLoginRequest：username, password, device?, deviceType?）
 * 数学算式验证码：captchaKey + captchaAnswer（见 captcha-usage.md）
 */
export interface LoginRequest {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 验证码 key（数学算式验证码，从 getCaptcha 返回） */
  captchaKey?: string;
  /** 验证码答案（用户输入的算式结果） */
  captchaAnswer?: string;
  /** 记住我 */
  rememberMe?: boolean;
  /** 租户ID */
  tenantId?: number;
  /** 设备标识（api.json AdminLoginRequest） */
  device?: string;
  /** 设备类型（api.json AdminLoginRequest） */
  deviceType?: string;
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

/**
 * 数学算式验证码响应（见 captcha-usage.md）
 */
export interface CaptchaInfo {
  /** 验证码唯一标识，格式 captcha:{uuid} */
  captchaKey: string;
  /** 验证码图片（Base64 编码，含 data:image/png;base64, 前缀） */
  captchaImage: string;
  /** 有效期（秒） */
  expiresIn: number;
}
