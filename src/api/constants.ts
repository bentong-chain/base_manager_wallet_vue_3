/**
 * API 常量定义模块
 * 集中管理默认公钥、默认盐值和加密密钥
 * @module api/constants
 */

/** 请求头中用于标记「无需认证」的值，传此值时 Header 传空 token，且使用默认公钥与 salt */
export const NO_AUTH_HEADER_VALUE = 'no-auth';

/** 默认 RSA 公钥（未登录/无需验证 token 的接口使用） */
export const DEFAULT_PUBLIC_KEY =
  'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKAaODFcqle92ory/gmxaC8PHBSm1FnQr6TuD2sG5CAZ7kV9Ye/kKCxKal8YQyKzLhd/+o5boIJFbsnf8ud5GzsCAwEAAQ==';

/** 默认盐（未登录时使用） */
export const DEFAULT_SALT = '2qBhsEn7JZ8ud6K8';

/**
 * AES 加密密钥，双重用途：
 * 1. 解密后端传输的 AES 加密字段（accessToken、publicKey、salt）— 与后端 AES_PWD_FOR_FRONTEND 一致
 * 2. 加密 sessionStorage 中存储的凭证
 */
export const AP_KEY = 'j2P9u5fbMHP2ytY8J2kNPGt2XVRT2xxqyrUV4LtQE8VvwNmfdHRmWtr4LLYzWZuX';
