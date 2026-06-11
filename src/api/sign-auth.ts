/**
 * 认证与签名模块
 * 所有请求都需要通过此模块生成签名 Header
 * @module api/sign-auth
 */

import { sha256 } from 'js-sha256';

// 认证 Header 名称
const HEADER_X_AUTH_TOKEN = 'X-Auth-Token';
const HEADER_X_AUTH_TIMESTAMP = 'X-Auth-Timestamp';
const HEADER_X_AUTH_SIGN = 'X-Auth-Sign';
const HEADER_X_AUTH_NONCE = 'X-Auth-Nonce';
const HEADER_X_AUTH_DEVICE = 'X-Auth-Device';

/**
 * 将业务参数（含 token、timestamp、device）转为用于签名的 key=value 对象
 * - 数组取第一个元素
 * - null/undefined 转为空字符串
 * - 排除 sign 和 nonce 字段
 */
function toSignParams(
  token: string,
  timestamp: string,
  device: string,
  params: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {
    token,
    timestamp,
    device,
  };
  const exclude = new Set(['sign', 'nonce']);
  for (const [key, value] of Object.entries(params)) {
    if (exclude.has(key)) continue;
    if (value === null || value === undefined) {
      result[key] = '';
    } else if (Array.isArray(value)) {
      result[key] = value.length ? String(value[0]) : '';
    } else if (typeof value === 'object') {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * 生成参数字符串
 * 按 key 字典序排序，拼接为 key=value&...
 */
function buildParamString(params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  return keys.map((k) => `${k}=${params[k]}`).join('&');
}

/**
 * 计算签名
 * sign = SHA256(paramString + nonceSrc + salt)
 */
export function buildSign(paramString: string, nonceSrc: string, salt: string): string {
  return sha256(paramString + nonceSrc + salt);
}

/**
 * 生成 32 位十六进制随机数（16 字节）
 */
export function generateNonceSrc(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 构建 Auth Header 的输入参数 */
export interface AuthHeadersInput {
  /** Access Token，未登录时传空字符串 */
  token: string;
  /** 盐值，未登录时传 DEFAULT_SALT */
  salt: string;
  /** 设备标识 */
  device: string;
  /** GET 为 query 对象，POST 等为 body 对象 */
  businessParams: Record<string, unknown>;
}

/** 构建 Auth Header 的返回结果 */
export interface AuthHeadersResult {
  [HEADER_X_AUTH_TOKEN]: string;
  [HEADER_X_AUTH_TIMESTAMP]: string;
  [HEADER_X_AUTH_SIGN]: string;
  [HEADER_X_AUTH_NONCE]: string;
  [HEADER_X_AUTH_DEVICE]: string;
}

/**
 * 为请求构建全部认证/签名 Header（每个请求都需要调用）
 * 未登录时 token 传空字符串、salt 使用 DEFAULT_SALT、publicKey 使用 DEFAULT_PUBLIC_KEY
 * @param input - 认证参数
 * @param encryptNonce - Nonce 加密函数（使用 RSA 公钥加密）
 * @returns Promise<AuthHeadersResult> 认证 Header 对象
 */
export function buildAuthHeaderValues(
  input: AuthHeadersInput,
  encryptNonce: (plain: string) => Promise<string>
): Promise<AuthHeadersResult> {
  const timestamp = String(Date.now());
  const nonceSrc = generateNonceSrc();

  const signParams = toSignParams(input.token, timestamp, input.device, input.businessParams);
  const paramString = buildParamString(signParams);
  const sign = buildSign(paramString, nonceSrc, input.salt);

  return encryptNonce(nonceSrc).then((nonceEncrypted) => ({
    [HEADER_X_AUTH_TOKEN]: input.token,
    [HEADER_X_AUTH_TIMESTAMP]: timestamp,
    [HEADER_X_AUTH_SIGN]: sign,
    [HEADER_X_AUTH_NONCE]: nonceEncrypted,
    [HEADER_X_AUTH_DEVICE]: input.device,
  }));
}

/** Header 名称常量导出 */
export const AuthHeaderNames = {
  TOKEN: HEADER_X_AUTH_TOKEN,
  TIMESTAMP: HEADER_X_AUTH_TIMESTAMP,
  SIGN: HEADER_X_AUTH_SIGN,
  NONCE: HEADER_X_AUTH_NONCE,
  DEVICE: HEADER_X_AUTH_DEVICE,
} as const;
