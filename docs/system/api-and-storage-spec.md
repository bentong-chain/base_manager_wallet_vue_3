# 接口调用与加密存储说明

本文档为 **base_manager_vue_3** 在采用 common-system 认证方案时的接口调用规范与加密存储实现说明，与 `auth-and-api-fusion.md` 配套使用。内容对齐 base_web_vue_3 的 `frontend-api-request-guide.md`。

---

## 1. 与后端的对接要点

### 1.1 认证参数传递方式

认证相关参数**仅通过 HTTP Header 传递**，不放在 URL 或 Body 中。

| Header 名称           | 说明                     | 示例/格式                    |
|-----------------------|--------------------------|-----------------------------|
| `X-Auth-Token`        | 访问令牌（Access Token） | 登录接口返回的 accessToken（未登录时为空字符串） |
| `X-Auth-Timestamp`    | 时间戳（毫秒）           | `Date.now()`                |
| `X-Auth-Sign`         | 请求签名                 | 见下文「签名生成规则」       |
| `X-Auth-Nonce`        | 随机数密文               | 见下文「Nonce 生成与加密」   |
| `X-Auth-Device`       | 设备标识                 | 如 `web_xxx`                |

### 1.2 内置默认常量

未登录时使用以下常量；登录成功后切换为服务端返回的 `publicKey` 和 `salt`。

```typescript
// 默认 RSA 公钥（未登录时使用）
const DEFAULT_PUBLIC_KEY = '...'  // 与后端一致

// 默认盐（未登录时使用）
const DEFAULT_SALT = '...'

// AES 密钥：1) 解密后端 AES 加密传输的 accessToken/publicKey/salt  2) 加密 sessionStorage 中存储的凭证
const AP_KEY = '...'  // 与后端 AES_PWD_FOR_FRONTEND 一致
```

### 1.3 AES-CBC 加密规则（与 Java 后端一致）

- **密钥**：对 password（即 `AP_KEY`）做 SHA-256，取前 16 位 hex 字符。
- **IV**：固定字符串 `"YhFBD6rmNjqE7CRB"`（16 字节）。
- **模式**：AES-CBC，Padding：PKCS7，输出：hex 字符串。

用于：1）解密后端下发的 accessToken/publicKey/salt；2）加密写入 sessionStorage 的凭证。

### 1.4 请求签名流程（createSign）

每个请求：

1. 生成 32 位十六进制随机字符串作为 `nonceSrc`。
2. 用 RSA 公钥加密 `nonceSrc` → Base64 作为 Header `X-Auth-Nonce`。
3. 组装参数：`timestamp`、`token`、`device` + 所有业务参数（GET 的 query + POST 的 body），排除 `sign`、`nonce`。
4. 参数 key 字典序排序，拼接为 `key1=value1&key2=value2&...`；null/undefined 转为空字符串，数组取第一个元素。
5. 计算签名：`sign = SHA256(paramString + nonceSrc + salt)`。

### 1.5 登录接口返回（双 Token + HttpOnly Cookie）

- **accessToken**、**publicKey**、**salt**：在 JSON 体中，且为 **AES 加密后传输**，前端需用 `AP_KEY` 解密后再使用和存储。
- **refreshToken**：仅通过 `Set-Cookie` 下发为 HttpOnly Cookie，不出现在 JSON 中。

登录成功后前端只存储解密后的 accessToken、salt、publicKey（再经 AES 加密写入 sessionStorage）；不存储 refreshToken。

### 1.6 刷新 Token

- 接口：`POST /api/token/refresh`（或项目实际路径）。
- 请求体：`{ device }`；**refreshToken 由浏览器 Cookie 自动携带**（withCredentials: true）。
- 响应：accessToken、publicKey、salt 仍为 AES 加密，前端解密后更新 store 并重试原请求。

### 1.7 不需要认证但仍需签名的接口

登录、注册、刷新 Token、登出、验证码等接口不需要有效 accessToken，但**仍须带签名**（使用默认公钥与默认盐，token 传空字符串）。

---

## 2. 加密存储实现要点

### 2.1 存储内容与键

- **auth_credentials**：存 `aesEncrypt([accessToken, salt, publicKey].join('|'), AP_KEY)` 的 hex 字符串。
- **auth_device**（可选）：设备标识，可明文存 sessionStorage。

### 2.2 读写流程

- **写入**：登录/刷新成功后，先解密后端返回的 accessToken、publicKey、salt，再拼接后用 `AP_KEY` AES 加密，写入 sessionStorage。
- **读取**：从 sessionStorage 取出 hex，用 `AP_KEY` 解密，按 `|` 拆分为 accessToken、salt、publicKey，供请求拦截器使用。
- **清除**：登出或 401 不可恢复时，删除 `auth_credentials`，并将内存中的公钥/盐回退为默认值。

### 2.3 安全说明

- sessionStorage 仅在当前标签页有效，关闭即清除。
- AES 加密避免开发者工具直接看到明文凭证。
- refreshToken 不落前端存储，由 HttpOnly Cookie 管理，降低 XSS 窃取风险。

---

## 3. 接口调用封装要点

### 3.1 请求拦截器

- 每个请求调用 `buildAuthHeaderValues(token, salt, device, businessParams, encryptNonce)`，得到 X-Auth-* 一组 Header，合并到 `config.headers`。
- `encryptNonce` 内部使用当前公钥（未登录用 DEFAULT_PUBLIC_KEY，登录后用 store 中的 publicKey）对 nonceSrc 做 RSA 加密。

### 3.2 响应拦截器

- **401 + subCode === 'TOKEN_EXPIRED'**：触发刷新；若正在刷新则排队，刷新成功后用新 accessToken 重试原请求。
- **401 + subCode === 'TOKEN_INVALID' | 'REFRESH_TOKEN_INVALID' | 'TOKEN_OR_DEVICE_MISSING'**：清除凭证，跳转登录。
- 业务错误仍按现有 code/msg 提示。

### 3.3 类型与错误码

- 统一响应结构可与后端 `Result` 对齐：`{ code, subCode?, message?, data? }`。
- 子错误码常量：`TOKEN_EXPIRED`、`TOKEN_INVALID`、`REFRESH_TOKEN_INVALID`、`TOKEN_OR_DEVICE_MISSING` 等，用于响应拦截器分支判断。

---

## 4. 依赖与目录建议

**依赖**：axios、js-sha256、jsencrypt、crypto-js（及 @types/crypto-js）。

**目录建议**：

- `api/constants.ts`：DEFAULT_PUBLIC_KEY、DEFAULT_SALT、AP_KEY。
- `api/sign-auth.ts`（或 `auth.ts`）：buildAuthHeaderValues、buildSign、generateNonceSrc。
- `utils/rsa.ts`：encryptWithPublicKey（RSA 公钥加密 Nonce）。
- `utils/crypto.ts`：aesEncrypt、aesDecrypt、aesBackendDecrypt。
- `store/modules/auth.ts`：accessToken、salt、publicKey、deviceId、setAuth、updateTokens、clearAuth、loadFromStorage、saveToStorage。

实现细节可直接参考 base_web_vue_3 的 `src/api/client.ts`、`src/api/auth.ts`、`src/stores/modules/auth.ts`、`src/utils/crypto.ts`、`src/utils/rsa.ts`。
