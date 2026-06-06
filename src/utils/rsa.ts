/**
 * RSA 加密工具模块
 * 用于加密 Nonce，与后端 RSA.decryptByPrivateKey 对应
 * @module utils/rsa
 */

import JSEncrypt from "jsencrypt";

/**
 * 使用 RSA 公钥（Base64）加密明文，返回 Base64 密文
 * @param plainText - 待加密的明文
 * @param publicKeyBase64 - RSA 公钥（Base64 格式）
 * @returns Promise<string> Base64 密文
 */
export function encryptWithPublicKey(plainText: string, publicKeyBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(
      `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`
    );
    const encrypted = encrypt.encrypt(plainText);
    if (encrypted) {
      resolve(encrypted);
    } else {
      reject(new Error("RSA encrypt failed"));
    }
  });
}
