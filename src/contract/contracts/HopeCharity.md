# HopeCharity 合约调用说明

> 源合约：`contracts/HopeCharityDev.sol`  
> 合约类型：可升级合约（`OwnableUpgradeable` + `PausableUpgradeable`）

## 概述

`HopeCharity` 是公益公示登记合约，负责：

- 将已完成的公益行动数据写入链上，供 DApp 公益页展示
- 记录每期支出 USDT 金额、元数据 URI、元数据哈希与支出交易哈希
- 汇总平台已完成期数与累计登记支出

**合约定位：** 纯数据登记合约，不持有、不接收、不划转任何资产。

**调用限制说明：**

- `publishPhase` 仅 `operators` 中的运营地址或合约 owner 可调用（`onlyOperator`）
- `publishPhase` 在合约 `pause` 状态下不可调用（`whenNotPaused`）
- 期数 ID 从 `1` 开始自增，由 `nextPhaseId` 维护

**常量：**

| 配置项 | 值 | 说明 |
|--------|-----|------|
| MAX_METADATA_URI_LEN | 256 | 元数据 URI 最大字节长度 |
| MAX_PHASES_PER_PAGE | 50 | 分页查询单页最大返回期数 |

---

## 数据结构

### CharityPhase — 公益期数记录

**查询入口：** `getPhase(phaseId)` · `getPhaseList(offset, limit)` · `phases(phaseId)`

| 字段 | 类型 | 说明 |
|------|------|------|
| executedAt | uint64 | 公益行动日期（Unix 时间戳） |
| publishedAt | uint64 | 链上登记时间戳 |
| publishedBy | address | 登记操作者地址 |
| phaseId | uint256 | 期数 ID |
| usdtAmount | uint256 | 本期支出 USDT（最小单位，6 位小数） |
| metadataHash | bytes32 | 元数据内容哈希，供 DApp 校验防篡改 |
| payoutTxHash | bytes32 | 实际支出交易哈希 |
| metadataUri | string | IPFS / HTTPS JSON 元数据地址 |

### PlatformStats — 平台统计

**查询入口：** `getPlatformStats()`

| 字段 | 类型 | 说明 |
|------|------|------|
| completedPhaseCount | uint256 | 已完成登记期数 |
| totalUsdtSpent | uint256 | 累计登记支出 USDT（最小单位） |

---

## 写入方法

### publishPhase

登记一期公益行动数据。

```solidity
function publishPhase(
    uint64 executedAt,
    uint256 usdtAmount,
    string calldata metadataUri,
    bytes32 metadataHash,
    bytes32 payoutTxHash
) external returns (uint256 phaseId)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| executedAt | uint64 | 公益行动日期（Unix 时间戳） |
| usdtAmount | uint256 | 本期支出 USDT（最小单位） |
| metadataUri | string | IPFS / HTTPS JSON 元数据地址 |
| metadataHash | bytes32 | 元数据内容哈希 |
| payoutTxHash | bytes32 | 实际支出交易哈希 |

**调用者：** 仅运营地址（`operators`）或合约 owner

**前置条件：**

- 合约未暂停
- `usdtAmount > 0`
- `executedAt > 0`
- `metadataUri` 非空且长度 ≤ `MAX_METADATA_URI_LEN`

**返回值：** 本次登记的 `phaseId`

**业务逻辑：**

1. 分配当前 `nextPhaseId` 作为本期 ID，并自增
2. 写入 `phases` 映射，追加至 `phaseIds` 列表
3. 累加 `totalUsdtSpent` 与 `completedPhaseCount`

**事件：** `CharityPhasePublished`

**可能 revert：** `NoPermission` · `ZeroAmount` · `InvalidExecutedAt()` · `EmptyMetadataUri()` · `ExceedLimit()`

---

## 查询方法

### getPlatformStats

获取平台统计。

```solidity
function getPlatformStats() external view returns (PlatformStats memory stats)
```

**返回值：** `PlatformStats` 结构体，含已完成期数与累计登记支出

---

### getPhase

获取单期公益记录。

```solidity
function getPhase(uint256 phaseId) external view returns (CharityPhase memory phase)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| phaseId | uint256 | 期数 ID |

**前置条件：** `phaseId > 0` 且 `phaseId < nextPhaseId`

**返回值：** `CharityPhase` 结构体

**可能 revert：** `PhaseNotFound(uint256 phaseId)`

---

### getPhaseList

分页获取公益期数列表（按登记顺序）。

```solidity
function getPhaseList(uint256 offset, uint256 limit)
    external
    view
    returns (CharityPhase[] memory list, uint256 total)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| offset | uint256 | 起始下标（基于 `phaseIds` 数组） |
| limit | uint256 | 查询数量，最大 `MAX_PHASES_PER_PAGE` |

| 返回值 | 类型 | 说明 |
|--------|------|------|
| list | CharityPhase[] | 期数记录列表 |
| total | uint256 | 已登记总期数（`phaseIds.length`） |

**说明：**

- `limit > MAX_PHASES_PER_PAGE` 时 revert
- `offset >= total` 或 `limit == 0` 时返回空列表，不 revert

**可能 revert：** `ExceedLimit()`

---

### getPhaseCount

获取已登记总期数。

```solidity
function getPhaseCount() external view returns (uint256 total)
```

**返回值：** 已完成登记期数（与 `completedPhaseCount` 一致）

---

## 公开状态变量（自动生成 getter）

### 常量

| 方法 | 返回值 | 说明 |
|------|--------|------|
| MAX_METADATA_URI_LEN() | uint256 | 元数据 URI 最大长度 |
| MAX_PHASES_PER_PAGE() | uint256 | 单页最大返回期数 |

### 计数器

| 方法 | 返回值 | 说明 |
|------|--------|------|
| nextPhaseId() | uint256 | 下一期 ID（当前最大已用 ID + 1） |
| totalUsdtSpent() | uint256 | 累计登记支出 USDT |
| completedPhaseCount() | uint256 | 已完成登记期数 |

### Mapping / Array getter

| 方法 | 说明 |
|------|------|
| phases(uint256 phaseId) | 查询指定期数的原始记录 |
| phaseIds(uint256 index) | 按登记顺序查询期数 ID |
| operators(address) | 查询地址是否为运营地址 |

---

## 主要事件

| 事件 | 说明 |
|------|------|
| CharityPhasePublished | 公益期数登记完成 |
| OperatorUpdated | 运营地址权限更新 |

### CharityPhasePublished 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| phaseId | uint256 (indexed) | 期数 ID |
| executedAt | uint64 | 公益行动日期 |
| usdtAmount | uint256 | 本期支出 USDT |
| metadataUri | string | 元数据 URI |
| metadataHash | bytes32 | 元数据内容哈希 |
| payoutTxHash | bytes32 | 支出交易哈希 |
| publishedBy | address (indexed) | 登记操作者 |
| publishedAt | uint64 | 链上登记时间 |

---

## 常见错误

| 错误 | 说明 |
|------|------|
| NoPermission() | 非运营地址或 owner 调用 `publishPhase` |
| ZeroAmount() | USDT 金额为零 |
| InvalidExecutedAt() | 公益行动日期无效（为零） |
| EmptyMetadataUri() | 元数据 URI 为空 |
| ExceedLimit() | 元数据 URI 超长或分页 `limit` 超限 |
| PhaseNotFound(uint256) | 期数 ID 不存在 |
