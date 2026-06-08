# 系统文档（system）

本目录存放 base_manager_vue_3 与认证、接口、存储相关的系统级说明。

## 文档列表

| 文档 | 说明 |
|------|------|
| [auth-and-api-fusion.md](./auth-and-api-fusion.md) | **认证与接口安全融合方案**：如何将 base_web_vue_3 的登录、Token 管理、请求签名、加密存储方案融合到本管理端，包含步骤、文件映射、双模式兼容等。 |
| [api-and-storage-spec.md](./api-and-storage-spec.md) | **接口调用与加密存储说明**：采用 common-system 认证时的 Header、签名、AES 存储、401 处理等实现要点，便于开发时对照。 |
| [wallet-sign-login-migration-plan.md](./wallet-sign-login-migration-plan.md) | **钱包签名登录改造方案**：根据后端钱包登录新方案，规划管理后台前端从账号密码登录迁移到钱包签名登录的文件级改造、时序、测试和风险。 |

## 参考

- 方案来源：`projects/templates/base_web_vue_3` 的登录、`api/client.ts`、`stores/modules/auth.ts`、`utils/crypto.ts`、`utils/rsa.ts` 及 `docs/system/frontend-api-request-guide.md`。
