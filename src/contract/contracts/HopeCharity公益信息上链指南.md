# HopeCharity 公益信息上链指南

版本：v1.0  
日期：2026-06-08  
依据文件：

- `contracts/HopeCharityDev.sol`
- `docs/business/HopeCharity开发文档.md`
- `hope-docs/01-prototype/html/charity.html`
- `docs/abi/HopeCharity.md`

---

## 1. 文档目标

本文档说明 **如何将一期公益行动的信息写入 `HopeCharity` 合约**，供运营后台、DApp 联调与社区核查使用。

**核心结论：** `HopeCharity` 是纯数据登记合约，不持有、不接收、不划转任何资产。公益资金由 `NodeBurnManager` 分配至 `charityAddress` 运营钱包，实际支出在链下完成后，由 **operator 或 owner** 调用 `publishPhase` 将公示数据上链存档。

---

## 2. 整体链路

```
用户 burnHope
  └─ NodeBurnManager：5% HOPE 兑换 BNB → charityAddress（运营钱包）
       └─ emit CharityPaid

运营钱包完成公益支出（链上转账）
  └─ 记录 payoutTxHash

上传图文至 IPFS
  └─ 得到 metadataUri + metadataHash

operator / owner 调用 HopeCharity.publishPhase
  └─ emit CharityPhasePublished

DApp 公益页（charity.html）
  └─ 读链上记录 + 拉取 IPFS JSON → 渲染页头统计与公益留影
```

**审计链路示意：**

```
HopeBurned → CharityPaid（资金进入运营钱包）
                  ↓ 链下支出
            实际转账 tx（payoutTxHash）
                  ↓ 管理员登记
       CharityPhasePublished（公示存档）
```

---

## 3. 原型页面与数据来源

依据 `charity.html` 公益页结构，各展示字段来源如下：

| 页面元素 | 示例 | 数据来源 |
|----------|------|----------|
| 已完成期数 | `3` 期 | `getPlatformStats().completedPhaseCount` |
| 累计支出 | `26,300` USDT | `getPlatformStats().totalUsdtSpent`（按 USDT decimals 格式化） |
| 期数 | 第 3 期 | 链上 `phaseId`（自增，从 1 开始） |
| 日期 | 2026-05-10 | 链上 `executedAt`（Unix 时间戳，前端格式化） |
| 支出金额 | 12,500 USDT | 链上 `usdtAmount`（运营填写，最小单位） |
| 文字介绍 | 向偏远山区小学捐赠… | 链下 IPFS JSON 的 `description` |
| 图片 + 说明 | 物资发放现场、链上转账凭证 | 链下 IPFS JSON 的 `photos[]` |
| 链上凭证 | 区块浏览器跳转 | 链上 `payoutTxHash` |

**存储分工：**

- **链上**：期数、日期、金额、元数据 URI、元数据哈希、支出 tx 哈希、登记人与登记时间
- **链下（IPFS）**：标题、长文案、图片 URL 与 caption

---

## 4. 链上写入方法

### 4.1 唯一写入口：`publishPhase`

```solidity
function publishPhase(
    uint64  executedAt,
    uint256 usdtAmount,
    string  calldata metadataUri,
    bytes32 metadataHash,
    bytes32 payoutTxHash
) external returns (uint256 phaseId);
```

| 参数 | 类型 | 说明 |
|------|------|------|
| executedAt | uint64 | 公益行动日期（Unix 时间戳，必须 > 0） |
| usdtAmount | uint256 | 本期支出 USDT（最小单位，必须 > 0） |
| metadataUri | string | IPFS / HTTPS JSON 地址（非空，最长 256 字节） |
| metadataHash | bytes32 | 元数据 JSON 内容的 `keccak256` 哈希 |
| payoutTxHash | bytes32 | 实际支出交易哈希 |

**调用权限：** `operators[caller] == true` 或 `caller == owner()`。

**合约自动处理：**

1. 分配 `phaseId = nextPhaseId`，并自增
2. 写入 `phases[phaseId]`，追加至 `phaseIds`
3. 记录 `publishedBy = msg.sender`、`publishedAt = block.timestamp`
4. 累加 `completedPhaseCount`、`totalUsdtSpent`
5. 发出 `CharityPhasePublished` 事件

**约束：**

- 合约 `pause` 时不可调用
- 数据一经写入**不可修改**；登记错误需后续发新期说明，或等合约升级支持作废（当前版本不支持）

### 4.2 权限角色

| 角色 | 来源 | 能力 |
|------|------|------|
| owner（admin） | `initialize` 时 `admin` 参数；为 `address(0)` 则部署者为 owner | `setOperator`、`pause` / `unpause`，也可直接 `publishPhase` |
| operator | `initialize` 时 `operator` 参数，或 owner 调用 `setOperator` | 仅 `publishPhase` |

---

## 5. 运营上链 SOP

### 步骤 1：确认公益支出已完成

1. 燃烧 HOPE 时，`NodeBurnManager` 已将 5% 对应 HOPE 兑换为 BNB 转入 `charityAddress`（见 `CharityPaid` 事件）。
2. 运营钱包（`charityAddress`）已完成向受助方的实际转账。
3. 在区块浏览器复制**本次支出交易哈希**，作为 `payoutTxHash`。

> **注意：** `charityAddress` 是收 BNB 的运营钱包，**不要**改为 `HopeCharity` 合约地址。合约不参与资金流转。

### 步骤 2：准备并上传 IPFS 元数据

按以下 JSON 格式组装一期公益的完整图文资料：

```json
{
  "version": 1,
  "phaseId": 3,
  "title": "偏远山区小学捐赠",
  "description": "HOPE 社区向偏远山区小学捐赠学习物资，包括书本、文具及体育用品。本次公益支出 12,500 USDT，由公益基金池链上划拨，全程公开透明。",
  "photos": [
    { "caption": "物资发放现场", "url": "ipfs://..." },
    { "caption": "学生领取文具", "url": "ipfs://..." },
    { "caption": "链上转账凭证", "url": "ipfs://..." }
  ],
  "locale": "zh-Hans"
}
```

上传至 IPFS（或 HTTPS 静态托管）后得到：

- **metadataUri**：如 `ipfs://bafybeig.../phase-3.json`
- **metadataHash**：对 JSON 字符串（UTF-8）计算 `keccak256`

**metadataHash 计算示例（ethers v6）：**

```typescript
const jsonString = JSON.stringify(metadataObject); // 建议固定 key 顺序，避免哈希漂移
const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(jsonString));
```

### 步骤 3：多签 / 运营确认

上链前人工核对：

- [ ] 公益行动已在链下真实完成
- [ ] `usdtAmount` 与本期实际支出一致
- [ ] `payoutTxHash` 可在浏览器查到且指向正确转账
- [ ] IPFS JSON 内容与 `metadataHash` 匹配
- [ ] `executedAt` 为正确的公益行动日期

> 合约**不校验**登记金额是否与 `payoutTxHash` 实际金额一致，真实性依赖运营 SOP 与社区通过 tx 哈希公开核查。

### 步骤 4：调用 `publishPhase` 上链

**ethers v6 示例：**

```typescript
import { ethers } from "ethers";

const executedAt = Math.floor(new Date("2026-05-10T00:00:00Z").getTime() / 1000);
const usdtAmount = ethers.parseUnits("12500", 18);
const metadataUri = "ipfs://bafybeig.../phase-3.json";
const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(jsonString));
const payoutTxHash = "0x..."; // 实际支出 tx 哈希（32 字节）

const tx = await hopeCharity.connect(operatorSigner).publishPhase(
    executedAt,
    usdtAmount,
    metadataUri,
    metadataHash,
    payoutTxHash
);
const receipt = await tx.wait();
console.log("phaseId:", receipt.logs /* 或解析 CharityPhasePublished 事件 */);
```

**Hardhat 脚本测试（本项目）：**

```bash
npx hardhat test test/hope-charity.ts --grep "运营地址登记"
```

### 步骤 5：DApp 自动展示

交易确认后，公益页读取链上数据并拉取 IPFS：

| 页面区域 | 调用方法 |
|----------|----------|
| 页头「已完成期数」「累计支出」 | `getPlatformStats()` |
| 公益留影列表 | `getPhaseList(0, N)`，前端按 `executedAt` 降序 |
| 单期详情 | `getPhase(phaseId)` + `fetch(metadataUri)` |
| 防篡改校验（可选） | `keccak256(json) === metadataHash` |
| 链上凭证链接 | `payoutTxHash` → 区块浏览器 |

---

## 6. 链上数据结构

```solidity
struct CharityPhase {
    uint64  executedAt;     // 公益行动日期
    uint64  publishedAt;    // 链上登记时间
    address publishedBy;    // 登记操作者
    uint256 phaseId;        // 期数 ID
    uint256 usdtAmount;     // 本期 USDT 支出（最小单位）
    bytes32 metadataHash;   // 元数据内容哈希
    bytes32 payoutTxHash;   // 支出交易哈希
    string  metadataUri;    // IPFS / HTTPS JSON 地址
}
```

---

## 7. 部署地址与权限（当前项目）

来源：`deployments/project-addresses.ts`

### BSC 测试网（chainId 97）

| 项目 | 地址 |
|------|------|
| HopeCharity（Proxy） | `0xBD954169f99304b4A53393e70d08b4602eC10aca` |
| charityAddress（operator） | `0xF06cD965Ee5B9396973AF81578aCDb54E1e892b1` |
| 部署者 / owner | `0xBEA0baDaeF70E31A0a7d10eB899b811bd483dF71` |

部署脚本初始化参数：

- `admin = address(0)` → 部署者为 owner
- `operator = charityAddress` → 公益运营钱包可登记

### 授予 / 撤销运营权限

仅 owner 可调用：

```solidity
setOperator(address operator, bool state);
```

---

## 8. 常见错误与处理

| 错误 | 原因 | 处理 |
|------|------|------|
| `NoPermission()` | 调用者非 operator 且非 owner | 使用 operator 钱包或 owner 调用 |
| `ZeroAmount()` | `usdtAmount == 0` | 填写正确 USDT 最小单位金额 |
| `InvalidExecutedAt()` | `executedAt == 0` | 填写有效 Unix 时间戳 |
| `EmptyMetadataUri()` | URI 为空 | 先上传 IPFS 再填入 URI |
| `ExceedLimit()` | URI 超过 256 字节 | 缩短 URI 或使用更短网关 |
| 合约 paused | owner 已暂停 | owner 调用 `unpause()` 后重试 |

---

## 9. 与资金模块的关系（避免误解）

| 项目 | 说明 |
|------|------|
| `NodeBurnManager.charityAddress` | 收 BNB 的运营钱包，**无需**改为 `HopeCharity` 地址 |
| `HopeCharity` | 仅公示存档，**不持有任何代币或 BNB** |
| 金额真实性 | 合约不链上校验；靠 `payoutTxHash` 公开可查 + 运营流程 |
| 交叉验证（可选） | DApp 可对比 `CharityPaid` 累计入账 vs `HopeCharity.totalUsdtSpent` |

---

## 10. 相关文档与脚本

| 文件 | 用途 |
|------|------|
| `docs/business/HopeCharity开发文档.md` | 合约设计与架构 |
| `docs/abi/HopeCharity.md` | 外部方法调用说明 |
| `scripts/hope-charity.ts` | 合约部署脚本 |
| `test/hope-charity.ts` | 核心功能测试 |

---

## 11. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-06-08 | 初版：公益信息上链 SOP、原型字段映射、运营示例 |
