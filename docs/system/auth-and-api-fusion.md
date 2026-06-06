# 认证与接口安全融合方案

本文档说明如何将 **base_web_vue_3** 的登录、Token 管理、接口调用（签名 + 双 Token）、以及加密存储方案融合到 **base_manager_vue_3** 中，使管理后台与后端 common-system 的认证与签名机制一致。

---

## 1. 概述与目标

### 1.1 来源方案（base_web_vue_3）

| 能力 | 说明 |
|------|------|
| **登录** | 登录/注册/登出接口，**每个请求**均带签名 Header（未登录用默认公钥/盐） |
| **双 Token** | Access Token + Refresh Token；Refresh Token 通过 **HttpOnly Cookie** 下发，前端不存储 |
| **请求签名** | 所有请求携带 `X-Auth-Token`、`X-Auth-Timestamp`、`X-Auth-Sign`、`X-Auth-Nonce`、`X-Auth-Device`，签名算法与后端 `ApiCheckUtil` 一致 |
| **加密存储** | accessToken、salt、publicKey 用 **AES-CBC** 加密后存 **sessionStorage**；后端返回的敏感字段经 AES 加密传输，前端用内置密钥解密 |
| **Token 刷新** | 401 + subCode=TOKEN_EXPIRED 时自动调用刷新接口（Cookie 携带 refreshToken），并发请求共用一个刷新、重试原请求 |

### 1.2 当前管理端（base_manager_vue_3）

| 能力 | 说明 |
|------|------|
| **登录** | `AuthAPI.login` → 返回 `accessToken`、`refreshToken`（JSON 体） |
| **Token 存储** | 明文存 localStorage（记住我）/ sessionStorage，键为 `vea:auth:access_token`、`vea:auth:refresh_token` |
| **请求认证** | `Authorization: Bearer ${accessToken}`，无签名、无 Nonce |
| **Token 刷新** | 401 且 code=A0230 时，用 `refreshToken` 调 `AuthAPI.refreshToken(refreshToken)`，重试一次 |

### 1.3 融合目标

- 管理端与 common-system 后端对接时：采用 **签名 + 双 Token（Refresh 走 HttpOnly Cookie）+ 加密存储**。
- 保留管理端现有能力：验证码、记住我、租户、权限、登出清理等，仅替换「认证方式、存储方式、请求头与刷新逻辑」。

---

## 2. base_web_vue_3 方案摘要

### 2.1 认证与签名

- **Header**：`X-Auth-Token`、`X-Auth-Timestamp`、`X-Auth-Sign`、`X-Auth-Nonce`、`X-Auth-Device`。
- **签名**：`sign = SHA256(paramString + nonceSrc + salt)`，其中 paramString 为 `token`、`timestamp`、`device` 与业务参数按 key 字典序拼接；nonce 为 32 位 hex 随机数经 RSA 公钥加密后的 Base64。
- **未登录**：使用内置 `DEFAULT_PUBLIC_KEY`、`DEFAULT_SALT`，token 传空字符串。
- **登录后**：使用后端返回的 `publicKey`、`salt`（均为 AES 加密传输，前端解密后使用）。

### 2.2 登录与双 Token

- 登录成功响应：`accessToken`、`accessExpiresIn`、`publicKey`、`salt`、`uid`、`username` 等；**refreshToken 仅通过 Set-Cookie 下发**，不出现在 JSON 中。
- 前端只存：accessToken、salt、publicKey（解密后经 AES 再加密写入 sessionStorage）。
- 刷新：`POST /api/token/refresh`，body 仅需 `device`，refreshToken 由浏览器 Cookie 自动携带；响应中 accessToken/publicKey/salt 仍为 AES 加密，前端解密后更新存储并重试原请求。

### 2.3 加密与存储

- **传输**：后端对 accessToken、publicKey、salt 用 AES 加密后下发，前端用内置 `AP_KEY` 解密。
- **本地**：将 accessToken、salt、publicKey 用 `|` 拼接，再用 `AP_KEY` 做 AES-CBC 加密，hex 存入 sessionStorage 的单一键（如 `auth_credentials`）。
- **算法**：密钥 = SHA256(AP_KEY).substring(0,16)，IV 固定 `YhFBD6rmNjqE7CRB`，CBC + PKCS7。

### 2.4 401 与刷新策略

- `TOKEN_EXPIRED`：自动刷新，刷新成功后用新 accessToken 重试原请求；多个 401 共用一个刷新，其余请求排队。
- `TOKEN_INVALID` / `REFRESH_TOKEN_INVALID` / `TOKEN_OR_DEVICE_MISSING`：清除本地凭证，跳转登录。

---

## 3. 融合到 base_manager_vue_3 的步骤

### 3.1 新增依赖

与 base_web_vue_3 一致：

```bash
pnpm add js-sha256 jsencrypt crypto-js
pnpm add -D @types/crypto-js
```

### 3.2 目录与文件映射

| 能力 | base_web_vue_3 | base_manager_vue_3 融合后 |
|------|----------------|---------------------------|
| 签名与 Header | `src/api/auth.ts` | 新增 `src/api/sign-auth.ts` 或合并进请求层 |
| 常量 | `src/api/constants.ts` | 新增 `src/api/constants.ts`（默认公钥、盐、AP_KEY） |
| RSA 加密 Nonce | `src/utils/rsa.ts` | 新增 `src/utils/rsa.ts` |
| AES 加解密 | `src/utils/crypto.ts` | 新增 `src/utils/crypto.ts`（aesEncrypt/aesDecrypt/aesBackendDecrypt） |
| 凭证 Store | `src/stores/modules/auth.ts` | 新增 `src/store/modules/auth.ts` 或改造 `store/modules/user.ts` |
| HTTP 客户端 | `src/api/client.ts` | 改造 `src/utils/request.ts`：请求拦截器加签名、响应拦截器按 subCode 处理 |
| 登录 API | `src/api/modules/auth.ts` | 改造 `src/api/auth.ts`：登录/登出/刷新与后端路径、响应解密一致 |
| 类型与错误码 | `src/api/types/common/api.ts` | 在 `src/types/api` 或 `src/enums/api.ts` 中增加 ApiResult、SubCode |

### 3.3 核心改造点

1. **认证存储（utils/auth.ts / store）**
   - 不再使用 `AuthStorage.getAccessToken()/getRefreshToken()` 的 localStorage/sessionStorage 明文键。
   - 改为使用「auth store」：从 sessionStorage 读 `auth_credentials`，用 AP_KEY 解密得到 accessToken、salt、publicKey；写入时先拼接再 AES 加密后写入。
   - refreshToken 不存前端；若后端采用 HttpOnly Cookie 方案，则 withCredentials: true，刷新时由浏览器带 Cookie。

2. **请求拦截器（utils/request.ts）**
   - 每个请求先根据当前「auth store」的 token、salt、publicKey、deviceId 以及本次请求的 params/body 计算签名。
   - 生成 nonceSrc → RSA 公钥加密 → 得到 Header 中的 X-Auth-Nonce；再计算 X-Auth-Sign，并设置 X-Auth-Token、X-Auth-Timestamp、X-Auth-Device。
   - 若后端尚未提供签名接口，可先做「双模式」：根据配置或环境变量决定是否走签名分支（见第 6 节）。

3. **响应拦截器（utils/request.ts）**
   - 401 时根据 **subCode** 分支：
     - `TOKEN_EXPIRED`：若未重试过，则调用刷新接口（withCredentials，不传 refreshToken），解密新 accessToken/publicKey/salt 后更新 auth store，再重试原请求；并发时只发一次刷新，其余排队等新 token 后重试。
     - `TOKEN_INVALID`、`REFRESH_TOKEN_INVALID`、`TOKEN_OR_DEVICE_MISSING`：清除 auth store，跳转登录页。
   - 成功响应仍按现有逻辑解析 code/data/msg（可与 ApiResult 结构对齐）。

4. **登录页与登录 API**
   - 登录请求仍由「请求拦截器」统一加签名（未登录用默认公钥/盐）。
   - 登录响应：若后端返回 AES 加密的 accessToken、publicKey、salt，则前端先解密再调用 auth store 的 setAuth；若后端使用 HttpOnly Cookie 下发 refreshToken，则前端不处理 refreshToken。
   - 登出：调用后端登出（后端 Set-Cookie 清 refreshToken），前端 clearAuth 并跳转登录。

5. **刷新接口**
   - 若后端为 HttpOnly Cookie：`POST /api/token/refresh`，body 仅 `{ device }`，不传 refreshToken；axios 配置 withCredentials: true。
   - 若后端仍为 JSON 双 Token：可暂时保留现有 refreshToken 入参方式，但存储建议仍改为加密存 accessToken/salt/publicKey，refreshToken 仅内存或短期 sessionStorage（不推荐长期明文 localStorage）。

---

## 4. 接口调用层改造要点

### 4.1 统一使用「带签名的 client」

- 所有通过 `request` 发出的请求，都应经过「签名 + 认证 Header」的拦截器。
- 未登录（登录、验证码、刷新、登出等）同样带签名，只是 token 为空、使用默认公钥与盐。

### 4.2 与现有 API 的兼容

- 现有 `AuthAPI.login`、`AuthAPI.refreshToken`、`AuthAPI.logout` 等保持封装，内部改为：
  - 使用改造后的 `request`（带签名）；
  - 登录/刷新返回的数据按「是否 AES 加密」分支处理，并写入 auth store（加密存储）。
- 业务 API（如 `UserAPI.getInfo`）无需改调用方式，仅依赖新的 request 拦截器。

### 4.3 错误码对齐

- 将后端 common-system 的 subCode（TOKEN_EXPIRED、TOKEN_INVALID、REFRESH_TOKEN_INVALID、TOKEN_OR_DEVICE_MISSING）与前端响应拦截器、提示文案对应；若当前后端仍用业务 code（如 A0230），可在融合时做一层映射或同时支持两种格式。

---

## 5. 加密存储与凭证管理

### 5.1 存储内容

- **只存**：accessToken、salt、publicKey（以及可选 deviceId 的单独键）。
- **不存**：refreshToken（由 HttpOnly Cookie 管理时）。

### 5.2 存储方式

- 键：如 `auth_credentials`（或沿用项目前缀 `vea:auth:credentials`）。
- 值：`aesEncrypt([accessToken, salt, publicKey].join('|'), AP_KEY)` 的 hex 字符串。
- 介质：sessionStorage（关闭标签页即失效）；若需「记住我」延长 accessToken 有效期，由后端通过 refresh 与 Cookie Max-Age 实现，前端仍可不持久化 refreshToken。

### 5.3 与「记住我」的兼容

- 当前 base_manager 的「记住我」决定 accessToken/refreshToken 存 localStorage 还是 sessionStorage。
- 融合后：
  - 若后端仅支持 sessionStorage + Cookie 方案，可保留「记住我」仅用于 UI 状态或其它偏好，凭证仍只放 sessionStorage。
  - 若后端支持长期 refreshToken（Cookie Max-Age 较大），「记住我」可对应后端策略，前端仍不存 refreshToken 明文。

### 5.4 常量与安全

- `DEFAULT_PUBLIC_KEY`、`DEFAULT_SALT`、`AP_KEY` 需与后端一致，通常放在 `api/constants.ts`，不提交到公开仓库或通过构建时注入。

---

## 6. 可选：双模式兼容（后端未升级时）

若管理端需同时对接「未改造成 common-system 的旧后端」和「已改造的新后端」：

- 在环境变量或配置中增加一项，例如 `VITE_USE_SIGN_AUTH=true/false`。
- `request` 拦截器：
  - `VITE_USE_SIGN_AUTH=true`：按本文档走签名 + X-Auth-* Header + 401 按 subCode 刷新/跳转。
  - `false`：保持现有 `Authorization: Bearer ${token}`，401 按现有 code（如 A0230）刷新或跳转。
- auth 存储也可双模式：签名模式下用加密 sessionStorage；非签名模式保留现有 Storage 键与明文。

这样可先完成管理端改造与联调，待后端全部升级后统一切到签名模式。

---

## 7. 参考文档与代码位置

| 内容 | 参考 |
|------|------|
| 签名算法、Header、双 Token、加密存储、刷新流程 | base_web_vue_3：`docs/system/frontend-api-request-guide.md` |
| 请求拦截器、响应拦截器、并发刷新 | base_web_vue_3：`src/api/client.ts` |
| 签名逻辑、buildAuthHeaderValues | base_web_vue_3：`src/api/auth.ts` |
| 凭证 Store、加密读写 | base_web_vue_3：`src/stores/modules/auth.ts` |
| AES/RSA 工具 | base_web_vue_3：`src/utils/crypto.ts`、`src/utils/rsa.ts` |
| 常量 | base_web_vue_3：`src/api/constants.ts` |

按本文档融合后，base_manager_vue_3 的登录、Token 管理、接口调用与加密存储将与 base_web_vue_3 的方案一致，并可与 common-system 后端安全对接；现有验证码、租户、权限、登出等逻辑可保留并接入新认证层。

---

## 8. 第四步：环境与配置 / 启用签名模式

前端已实现**双模式**，默认不启用签名，与现有 Bearer 后端兼容。

**环境变量**（已在 `.env.development` / `.env.production` 中预留）：

- `VITE_USE_SIGN_AUTH`：`true` 启用签名 + 双 Token；未设置或 `false` 保持 Bearer 模式。
- `VITE_APP_AUTH_REFRESH_PATH`：签名模式下刷新接口路径（与 `VITE_APP_BASE_API` 拼接），默认 `/api/v1/auth/refresh-token`，可按后端修改。

启用签名后，登录接口需返回 `accessToken`、`publicKey`、`salt`（可为 AES 加密），前端会解密并写入 auth store；刷新时请求体仅传 `device`，refreshToken 由浏览器 Cookie 携带。

**常量与后端一致**：启用签名前请确认 `src/api/constants.ts` 中 `DEFAULT_PUBLIC_KEY`、`DEFAULT_SALT`、`AP_KEY` 与后端（含 `AES_PWD_FOR_FRONTEND`）一致。
