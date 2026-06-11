/**
 * AES 加密解密工具模块
 * 用于凭证存储和后端字段解密
 * @module utils/crypto
 */

import { sha256 } from 'js-sha256';
import CryptoJS from 'crypto-js';

/** AES 加密 IV（用于本地存储加密，CBC模式） */
const AES_IV = 'YhFBD6rmNjqE7CRB';

/**
 * 从密码派生 AES 密钥 (CBC 模式)
 * 对 password 做 SHA-256，取前 16 位 hex 字符
 * @param password - 密码字符串
 * @returns 16 位 hex 字符串
 */
function deriveAesKey(password: string): string {
  return sha256(password).substring(0, 16);
}

/**
 * AES-CBC 加密 (用于本地存储)
 * @param plainText - 待加密的明文
 * @param password - 密码（用于派生密钥）
 * @returns hex 字符串密文
 */
export function aesEncrypt(plainText: string, password: string): string {
  const key = CryptoJS.enc.Utf8.parse(deriveAesKey(password));
  const iv = CryptoJS.enc.Utf8.parse(AES_IV);
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
}

/**
 * AES-CBC 解密 (用于本地存储)
 * @param hexCipherText - hex 字符串密文
 * @param password - 密码（用于派生密钥）
 * @returns 解密后的明文
 */
export function aesDecrypt(hexCipherText: string, password: string): string {
  const key = CryptoJS.enc.Utf8.parse(deriveAesKey(password));
  const iv = CryptoJS.enc.Utf8.parse(AES_IV);
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(hexCipherText),
  });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * AES-CBC 解密 (与后端 Java 代码兼容)
 * 后端使用 SHA256(password).substring(0, 16) 作为密钥，固定 IV 为 "YhFBD6rmNjqE7CRB"
 * @param hexCipherText - hex 字符串密文
 * @param password - 密码（用于派生密钥）
 * @returns 解密后的明文
 */
export function aesBackendDecrypt(hexCipherText: string, password: string): string {
  const keyStr = deriveAesKey(password);
  const key = CryptoJS.enc.Utf8.parse(keyStr);
  const iv = CryptoJS.enc.Utf8.parse('YhFBD6rmNjqE7CRB');
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(hexCipherText),
  });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}
