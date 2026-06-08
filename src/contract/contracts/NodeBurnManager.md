# NodeBurnManager 合约调用说明

> 源合约：`contracts/NodeBurnManagerDev.sol`  
> 合约类型：可升级合约（`OwnableUpgradeable` + `PausableUpgradeable` + `ReentrancyGuardUpgradeable`）

## 概述

`NodeBurnManager` 是 HOPE 生态的节点与燃烧管理合约，负责：

- 会员注册与推荐关系绑定
- HOPE 燃烧及分配（销毁、全网分红、推广奖励、市场/公益/NFT 托底）
- 燃烧全网 HOPE/USDT 分红领取（2 倍出局机制）
- LP 节点锁仓 HOPE 释放与领取
- NFT LP 分红领取与 NFT 销毁赎回托底池 BNB

**调用限制说明：**

- 用户入口方法在合约 `pause` 状态下不可调用（`whenNotPaused`）
- `handleBurnDividendUSDT` / `handleNftDividendLP` 仅 `taxProcessor` 可调用
- `onNftTransfer` 仅 `nft` 合约可调用
- `addLockedHope` 仅 `lockHopeAdmins` 中的地址或合约 owner 可调用（`onlyLockHopeAdmin`）

**默认燃烧分配比例（initialize 时，单位 BPS，10000 = 100%）：**

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| burnRate | 5500 | 销毁（55%） |
| hopeDividendRate | 2000 | HOPE 全网分红（20%） |
| referralRate | 1200 | 推广奖励（12%） |
| marketRate | 300 | 市场奖励，兑换 BNB（3%） |
| nftFloorRate | 500 | NFT 托底池，兑换 BNB（5%） |
| charityRate | 500 | 公益基金，兑换 BNB（5%） |

---

## 数据结构

> 合约共定义 22 个 struct。下表按业务类别分组；标注「查询入口」的 struct 可通过公开 getter 或 view 方法读取。

### 配置与初始化

#### BurnRateConfig — 燃烧分配比例

单位 BPS（10000 = 100%）。通过 `burnRateConfig()` 读取。

| 字段 | 类型 | 说明 |
|------|------|------|
| burnRate | uint16 | 转入黑洞地址销毁的比例 |
| hopeDividendRate | uint16 | 进入 HOPE 全网燃烧分红池的比例 |
| referralRate | uint16 | 分配给上级推广奖励的总比例 |
| marketRate | uint16 | 兑换为 BNB 后支付到市场奖励地址的比例 |
| nftFloorRate | uint16 | 兑换为 BNB 后进入 NFT 托底池的比例 |
| charityRate | uint16 | 兑换为 BNB 后支付到公益地址的比例 |

#### InitParams — 合约初始化参数

用于 `initialize()`（Owner 部署时调用，本文档不展开该方法）。

| 字段 | 类型 | 说明 |
|------|------|------|
| hopeAddress | address | HOPE 代币合约地址 |
| usdtAddress | address | USDT 代币合约地址 |
| swapV2RouterAddress | address | PancakeSwap / Uniswap V2 Router 地址 |
| nftAddress | address | HOPE NFT 合约地址 |
| taxProcessorAddress | address | 税费处理合约地址 |
| marketRewardAddress | address | 市场奖励收款地址 |
| charityAddress | address | 公益收款地址 |
| minBurnUsdt | uint256 | 单次燃烧允许的最小 USDT 估值 |

#### CoreAddressConfig — 核心地址配置

用于 Owner 方法 `setCoreAddresses()`（本文档不展开）。

| 字段 | 类型 | 说明 |
|------|------|------|
| hopeAddress | address | HOPE 代币合约地址 |
| usdtAddress | address | USDT 代币合约地址 |
| swapV2RouterAddress | address | PancakeSwap / Uniswap V2 Router 地址 |
| nftAddress | address | HOPE NFT 合约地址 |
| taxProcessorAddress | address | 税费处理合约地址 |

#### LpNodeInitParams — LP 节点初始化参数

用于 Owner 方法 `initLpNode()` / `initLpNodeBatch()`（本文档不展开）。

| 字段 | 类型 | 说明 |
|------|------|------|
| account | address | 被初始化为 LP 节点的会员地址 |
| initialHopeAmount | uint256 | 初始化时直接转给节点用户的 HOPE 数量 |
| lockedHopeAmount | uint256 | 初始化时记入锁仓账户的 HOPE 数量 |
| initialHopeUsdtValue | uint256 | 初始 HOPE 对应的 USDT 估值，仅事件记录占位 |
| lockedHopeUsdtValue | uint256 | 锁仓 HOPE 对应的 USDT 估值，仅事件记录占位 |

---

### 会员与燃烧

#### MemberInfo — 会员信息

**查询入口：** `members(address)`

| 字段 | 类型 | 说明 |
|------|------|------|
| uid | uint32 | 会员唯一编号，0 表示未注册 |
| directInviteCount | uint32 | 直接邀请人数 |
| indirectInviteCount | uint32 | 间接邀请人数 |
| communityCount30 | uint32 | 30 层社区人数统计 |
| registeredAt | uint40 | 注册时间戳 |
| isNode | bool | 是否为 LP 节点 |
| parent | address | 父级推荐人地址 |
| points | uint256 | 会员积分 |

#### BurnInfo — 会员燃烧信息（原始存储）

**查询入口：** `getBurnInfo(address).info`（`burnInfos` 为 private mapping，无直接 getter）

| 字段 | 类型 | 说明 |
|------|------|------|
| burnOrderCount | uint32 | 用户累计燃烧订单数量 |
| settledHopeDividendId | uint32 | 已结算到的 HOPE 分红记录编号 |
| settledUsdtDividendId | uint32 | 已结算到的 USDT 分红记录编号 |
| isOut | bool | 用户是否已经达到 2 倍出局 |
| burnedHopeTotal | uint256 | 用户累计燃烧 HOPE 数量 |
| burnedUsdtTotal | uint256 | 用户累计燃烧对应的 USDT 估值 |
| activePrincipalUsdt | uint256 | 当前仍参与分红计算的有效本金 USDT 估值 |
| directInviteBurnedHope | uint256 | 直推用户累计燃烧 HOPE 数量 |
| communityBurnedHope30 | uint256 | 30 层社区累计燃烧 HOPE 数量 |
| claimedDividendHope | uint256 | 用户累计已领取的 HOPE 分红数量 |
| claimedDividendHopeUsdt | uint256 | 用户累计已领取 HOPE 分红对应的 USDT 估值 |
| claimedDividendUsdt | uint256 | 用户累计已领取的 USDT 分红数量 |
| lastHopeAccPerPrincipal | uint256 | 用户上次结算时的 HOPE 每本金累计分红值 |
| lastUsdtAccPerPrincipal | uint256 | 用户上次结算时的 USDT 每本金累计分红值 |
| pendingDividendHope | uint256 | 已结算但尚未领取的 HOPE 分红数量 |
| pendingDividendUsdt | uint256 | 已结算但尚未领取的 USDT 分红数量 |
| referralRewardHope | uint256 | 累计产生的推广奖励 HOPE 数量 |
| claimedReferralRewardHope | uint256 | 累计已领取的推广奖励 HOPE 数量 |

> **推广奖励待领取** = `referralRewardHope - claimedReferralRewardHope`

#### BurnInfoView — 会员燃烧展示信息

**查询入口：** `getBurnInfo(address)`

| 字段 | 类型 | 说明 |
|------|------|------|
| info | BurnInfo | 原始会员燃烧信息 |
| totalDividendHope | uint256 | 累计已分红 HOPE 数量，含已领取与当前可领取（受 2 倍上限约束） |
| totalDividendHopeUsdt | uint256 | 累计已分红 HOPE 按 USDT 计价的价值 |
| totalDividendUsdt | uint256 | 累计已分红 USDT 数量，含已领取与当前可领取 |
| claimableDividendHope | uint256 | 当前可领取 HOPE（含未结算增量，受 2 倍上限截断） |
| claimableDividendHopeUsdt | uint256 | 当前可领取 HOPE 按 USDT 计价的价值 |
| claimableDividendUsdt | uint256 | 当前可领取 USDT（含未结算增量，受 2 倍上限截断） |

#### BurnOrder — 燃烧订单

**查询入口：** `getBurnOrderList(address, offset, limit)` · `burnOrders(address, orderId)`

| 字段 | 类型 | 说明 |
|------|------|------|
| orderId | uint32 | 用户维度递增的订单编号 |
| burnedAt | uint40 | 燃烧发生时间戳 |
| hopeAmount | uint256 | 本单燃烧的 HOPE 数量 |
| usdtValue | uint256 | 本单燃烧时对应的 USDT 估值 |

#### DirectInviteInfo — 直推会员聚合信息

**查询入口：** `getDirectInviteInfoList(address, offset, limit)`

| 字段 | 类型 | 说明 |
|------|------|------|
| account | address | 直推会员地址 |
| uid | uint32 | 直推会员 UID |
| registeredAt | uint40 | 直推会员注册时间戳 |
| burnedHopeTotal | uint256 | 直推会员累计燃烧 HOPE 数量 |
| burnedUsdtTotal | uint256 | 直推会员累计燃烧对应的 USDT 估值 |
| communityBurnedHope30 | uint256 | 直推会员 30 层社区累计燃烧 HOPE 数量 |

---

### 分红记录

#### HopeDividendRecord — HOPE 全网分红记录

**查询入口：** `hopeDividendRecords(uint32 id)`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uint32 | HOPE 分红记录编号 |
| createdAt | uint40 | 分红记录创建时间戳 |
| source | bytes32 | 分红来源标识，如 `BURN_20_PERCENT`、`OUT_REDISPATCH` |
| hopeAmount | uint256 | 本次进入分红的 HOPE 总量，包含历史暂存池 |
| perPrincipal | uint256 | 本次每单位有效本金可分配的 HOPE 数量 |
| accPerPrincipal | uint256 | HOPE 每本金累计分红值（全局索引） |

#### UsdtDividendRecord — USDT 全网分红记录

**查询入口：** `usdtDividendRecords(uint32 id)`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uint32 | USDT 分红记录编号 |
| createdAt | uint40 | 分红记录创建时间戳 |
| source | bytes32 | 分红来源标识，如 `TAX_USDT`、`OUT_REDISPATCH` |
| usdtAmount | uint256 | 本次进入分红的 USDT 总量，包含历史暂存池 |
| perPrincipal | uint256 | 本次每单位有效本金可分配的 USDT 数量 |
| accPerPrincipal | uint256 | USDT 每本金累计分红值（全局索引） |

#### NftDividendInfo — 单张 NFT 分红状态

**查询入口：** `nftDividendInfos(uint256 tokenId)`

| 字段 | 类型 | 说明 |
|------|------|------|
| lastSettledDividendId | uint32 | NFT 已结算到的 LP 分红记录编号 |
| lastAccLpPerNft | uint256 | NFT 上次结算时的 LP 每 NFT 累计分红值 |
| claimedLp | uint256 | NFT 累计已领取的 LP 数量 |

#### NftLpDividendRecord — NFT LP 全网分红记录

**查询入口：** `nftLpDividendRecords(uint32 id)`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uint32 | NFT LP 分红记录编号 |
| createdAt | uint40 | 分红记录创建时间戳 |
| lpAmount | uint256 | 本次进入分红的 LP 总量，包含历史暂存池 |
| perNft | uint256 | 本次每个有效 NFT 可分配的 LP 数量 |
| accLpPerNft | uint256 | LP 每 NFT 累计分红值（全局索引） |

---

### 节点与 NFT

#### NodeLockInfo — 节点锁仓信息

**查询入口：** `nodeLockInfos(address)`

| 字段 | 类型 | 说明 |
|------|------|------|
| lockedHopeTotal | uint256 | 节点累计锁仓 HOPE 总量 |
| releasedHope | uint256 | 已释放但未必已领取的 HOPE 总量 |
| claimedHope | uint256 | 已被节点领取的释放 HOPE 总量 |
| burnedHope | uint256 | 因 NFT 转移等原因已销毁的锁仓 HOPE 总量 |

> **锁仓待领取 HOPE** = `releasedHope - claimedHope`

#### UserNftInfo — 用户 NFT 列表展示信息

**查询入口：** `getUserNftList(address, offset, limit)`

| 字段 | 类型 | 说明 |
|------|------|------|
| tokenId | uint256 | NFT 编号 |
| tokenURI | string | NFT 元数据 URI |
| claimedLp | uint256 | 该 NFT 累计已领取的 LP 分红数量 |
| pendingLp | uint256 | 该 NFT 当前待领取的 LP 分红数量 |

#### PlatformNftStats — 平台 NFT 统计

**查询入口：** `getPlatformNftStats()` · `platformNftStats()`（部分字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| activeNftSupply | uint256 | 当前可参与 LP 分红的 NFT 数量（实时读取 NFT 合约） |
| distributedLpTotal | uint256 | 平台累计进入 NFT LP 分红的 LP 总量 |
| claimedLpTotal | uint256 | 平台累计已领取 NFT LP 分红的 LP 总量 |
| nftFloorPoolBnb | uint256 | NFT 托底池 BNB 余额 |

---

### 平台统计

#### PlatformMemberStats — 平台会员统计

**查询入口：** `platformMemberStats()`

| 字段 | 类型 | 说明 |
|------|------|------|
| totalMembers | uint256 | 平台累计注册会员数量 |

#### PlatformBurnStats — 平台燃烧统计

**查询入口：** `platformBurnStats()`

| 字段 | 类型 | 说明 |
|------|------|------|
| burnedHopeTotal | uint256 | 平台累计燃烧 HOPE 数量 |
| burnedUsdtTotal | uint256 | 平台累计燃烧对应的 USDT 估值 |
| activePrincipalUsdtTotal | uint256 | 平台当前有效分红本金 USDT 估值总量（全网分红分母） |
| distributedHopeTotal | uint256 | 平台累计进入 HOPE 全网分红的数量 |
| distributedUsdtTotal | uint256 | 平台累计进入 USDT 全网分红的数量 |

#### PlatformLockStats — 平台锁仓统计

**查询入口：** `platformLockStats()`

| 字段 | 类型 | 说明 |
|------|------|------|
| lockedHopeTotal | uint256 | 平台累计锁仓 HOPE 总量 |
| releasedHopeTotal | uint256 | 平台累计已释放锁仓 HOPE 总量 |
| burnedHopeTotal | uint256 | 平台累计已销毁锁仓 HOPE 总量 |
| claimedHopeTotal | uint256 | 平台累计已领取锁仓 HOPE 总量 |

---

## 用户写入方法

### receive

接收 BNB（plain transfer）。

```solidity
receive() external payable
```

**业务逻辑：** 无额外处理，仅接收 BNB 至合约余额

---

### register

注册并绑定上级。

```solidity
function register(address parent) external
```

| 参数 | 类型 | 说明 |
|------|------|------|
| parent | address | 上级会员地址，不可为零地址 |

**前置条件：**

- 合约未暂停
- 调用者尚未注册
- 上级已注册且不为自身

**业务逻辑：**

- 分配 UID，记录推荐关系
- 注册奖励 50 积分；直推上级 +10 积分，间推 +6 积分，第三层 +2 积分
- 向上累计 30 层社区人数

**事件：** `MemberRegistered` · `PointsAdded`

**可能 revert：** `Bound` · `ZeroAddress` · `ParentUnbound` · `IdenticalAddress`

---

### burnHope

燃烧 HOPE 进入生态。

```solidity
function burnHope(uint256 hopeAmount, uint256 minUsdtValue) external
```

| 参数 | 类型 | 说明 |
|------|------|------|
| hopeAmount | uint256 | 燃烧 HOPE 数量 |
| minUsdtValue | uint256 | 用户允许的最小 USDT 估值（滑点保护） |

**前置条件：**

- 合约未暂停
- 调用者已注册
- `hopeAmount > 0`
- 燃烧 USDT 估值 ≥ 合约 `minBurnUsdt` 且 ≥ `minUsdtValue`
- 调用前需对合约 `approve` 足够 HOPE

**业务逻辑：**

1. 结算待领取燃烧分红
2. 从调用者转入 HOPE
3. 按 `burnRateConfig` 分配：部分销毁、部分进入 HOPE 全网分红、部分给上级推广奖励、部分兑换 BNB 分配至市场/NFT 托底/公益
4. 更新燃烧业绩，释放锁仓 HOPE（燃烧量的 25%）：若燃烧者自身为 LP 节点则优先释放自身锁仓，否则向上查找最近 LP 节点释放

**事件：** `HopeBurned` · `HopeDividendAdded` · `ReferralRewardAdded` · `NodeLockReleased` · `MarketRewardPaid` · `NftFloorPoolAdded` · `CharityPaid`

**可能 revert：** `ZeroAmount` · `MemberNotRegistered` · `SlippageExceeded` · `InsufficientOutputAmount`

---

### claimBurnDividends

领取燃烧全网 HOPE 和 USDT 分红。

```solidity
function claimBurnDividends(uint256 minHopeUsdtValue) external
```

| 参数 | 类型 | 说明 |
|------|------|------|
| minHopeUsdtValue | uint256 | 用户允许的最小 HOPE 折算 USDT 价值（滑点保护） |

**前置条件：**

- 合约未暂停
- 有待领取 HOPE 或 USDT 分红
- HOPE 折算 USDT 价值 ≥ `minHopeUsdtValue`

**业务逻辑：**

- 领取上限为累计燃烧 USDT 估值的 2 倍（出局机制）
- 超出上限部分重新进入全网分红池
- 达到 2 倍上限时标记出局，有效本金清零

**事件：** `BurnDividendClaimed` · `OutExcessRedistributed`（有超额时）

**可能 revert：** `NothingToClaim` · `SlippageExceeded`

---

### claimReferralReward

领取推广奖励 HOPE。

```solidity
function claimReferralReward() external
```

**前置条件：**

- 合约未暂停
- 有可领取推广奖励（直推上级 9/12，间推上级 3/12）

**事件：** `ReferralRewardClaimed`

**可能 revert：** `NothingToClaim`

---

### claimReleasedLockedHope

领取已释放的锁仓 HOPE（LP 节点专用）。

```solidity
function claimReleasedLockedHope() external
```

**前置条件：**

- 合约未暂停
- 有可领取的已释放锁仓 HOPE（`releasedHope - claimedHope > 0`）

**事件：** `LockedHopeClaimed`

**可能 revert：** `NothingToClaim`

---

### claimNftDividend

领取指定 NFT 的 LP 分红。

```solidity
function claimNftDividend(uint256 tokenId) external
```

| 参数 | 类型 | 说明 |
|------|------|------|
| tokenId | uint256 | NFT 编号 |

**前置条件：**

- 合约未暂停
- 调用者必须为 NFT 拥有者

**事件：** `NftDividendClaimed`

**可能 revert：** `NoPermission`

---

### claimAndBurnNft

销毁 NFT，赎回托底池 BNB。若该 NFT 仍有未领取 LP 分红，需先调用 `claimNftDividend` 领取后再销毁。

```solidity
function claimAndBurnNft(uint256 tokenId) external
```

| 参数 | 类型 | 说明 |
|------|------|------|
| tokenId | uint256 | NFT 编号 |

**前置条件：**

- 合约未暂停
- 调用者必须为 NFT 拥有者
- 当前活跃 NFT 供应量 > 0
- 该 NFT 没有未领取 LP 分红

**业务逻辑：**

1. 检查该 NFT 是否仍有未领取 LP 分红；若有则回退
2. 按 `nftFloorPoolBnb / activeSupply` 计算赎回 BNB
3. 销毁 NFT，BNB 转给 NFT 拥有者

**事件：** `NftBurnedAndRedeemed`

**可能 revert：** `NoPermission` · `NftDividendUnclaimed` · `EmptyNftSupply`

---

## 锁仓管理方法

### addLockedHope

为指定 LP 节点增加锁仓 HOPE 数量。

```solidity
function addLockedHope(address account, uint256 hopeAmount) external
```

| 参数 | 类型 | 说明 |
|------|------|------|
| account | address | LP 节点地址 |
| hopeAmount | uint256 | 增加的锁仓 HOPE 数量 |

**调用者：** 仅 `lockHopeAdmins` 中的地址或合约 owner

**前置条件：**

- `account` 已注册为会员
- `hopeAmount > 0`
- 若目标地址尚未标记为节点，会自动设置 `isNode = true`

**业务逻辑：**

- 累加 `nodeLockInfos[account].lockedHopeTotal`
- 累加 `platformLockStats.lockedHopeTotal`

**事件：** `AdminLockedHopeAdded`

**可能 revert：** `NoPermission` · `ZeroAddress` · `ZeroAmount` · `MemberNotRegistered`

---

## 系统集成方法

### handleBurnDividendUSDT

税费处理合约转入 USDT，追加至燃烧全网 USDT 分红池。

```solidity
function handleBurnDividendUSDT(uint256 usdtAmount) external
```

| 参数 | 类型 | 说明 |
|------|------|------|
| usdtAmount | uint256 | 本次 USDT 分红金额 |

**调用者：** 仅 `taxProcessor`

**前置条件：**

- 合约未暂停
- `usdtAmount > 0`
- 调用前需将 USDT 转入本合约

**事件：** `UsdtDividendAdded`

**可能 revert：** `OnlyTaxProcessor` · `ZeroAmount`

---

### handleNftDividendLP

税费处理合约转入 LP Token，追加至 NFT LP 分红池。

```solidity
function handleNftDividendLP(uint256 lpAmount) external
```

| 参数 | 类型 | 说明 |
|------|------|------|
| lpAmount | uint256 | 本次 LP 分红数量 |

**调用者：** 仅 `taxProcessor`

**前置条件：**

- 合约未暂停
- `lpAmount > 0`
- 调用前需将 LP Token 转入本合约

**事件：** `NftLpDividendAdded`

**可能 revert：** `OnlyTaxProcessor` · `ZeroAmount` · `ZeroAddress`

---

### onNftTransfer

NFT 普通转账后的回调入口，处理节点锁仓 HOPE 销毁。

```solidity
function onNftTransfer(address from, address to, uint256 tokenId) external
```

| 参数 | 类型 | 说明 |
|------|------|------|
| from | address | NFT 转出地址 |
| to | address | NFT 转入地址 |
| tokenId | uint256 | NFT 编号 |

**调用者：** 仅 `nft` 合约

**业务逻辑：** 若 `from` 有未释放且未销毁的锁仓 HOPE（`lockedHopeTotal - releasedHope - burnedHope`），将全部转入黑洞地址销毁

**事件：** `LockedHopeBurnedByNftTransfer`

**可能 revert：** `OnlyNftContract`

---

## 查询方法

### getBurnInfo

获取指定会员的燃烧信息（含 2 倍出局截断后的可领取金额）。

```solidity
function getBurnInfo(address account) external view returns (BurnInfoView memory viewInfo)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| account | address | 会员地址 |

**返回值：** `BurnInfoView` 结构体，字段说明见上文「BurnInfoView」。`claimableDividend*` 字段已包含未结算增量并按 2 倍本金上限截断。

---

### getBurnOrderList

分页查询指定地址的燃烧订单列表。

```solidity
function getBurnOrderList(
    address account,
    uint256 offset,
    uint256 limit
) external view returns (BurnOrder[] memory orders, uint256 total)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| account | address | 查询地址 |
| offset | uint256 | 起始下标 |
| limit | uint256 | 查询数量 |

| 返回值 | 类型 | 说明 |
|--------|------|------|
| orders | BurnOrder[] | 燃烧订单列表 |
| total | uint256 | 燃烧订单总数 |

---

### pendingNftDividend

查询 NFT 待领取 LP 分红。

```solidity
function pendingNftDividend(uint256 tokenId) external view returns (uint256 lpAmount)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| tokenId | uint256 | NFT 编号 |

**返回值：** 待领取 LP 数量（`(nftAccLpPerNft - lastAccLpPerNft) / ACC_PRECISION`）

---

### getUserNftList

分页查询指定地址的 NFT 列表及 LP 分红信息。

```solidity
function getUserNftList(
    address account,
    uint256 offset,
    uint256 limit
) external view returns (UserNftInfo[] memory list, uint256 total)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| account | address | NFT 持有人地址 |
| offset | uint256 | 起始下标 |
| limit | uint256 | 查询数量 |

| 返回值 | 类型 | 说明 |
|--------|------|------|
| list | UserNftInfo[] | NFT 列表展示信息 |
| total | uint256 | 持有 NFT 总数 |

---

### getPlatformNftStats

查询平台 NFT 统计。

```solidity
function getPlatformNftStats() external view returns (PlatformNftStats memory)
```

**返回值：** `PlatformNftStats` 结构体（含实时 `activeNftSupply` 和 `nftFloorPoolBnb`）

---

### quoteHopeToUsdt

查询 HOPE 数量对应的 USDT 价值（通过 V2 路由 `getAmountsOut`）。

```solidity
function quoteHopeToUsdt(uint256 hopeAmount) public view returns (uint256 usdtValue)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| hopeAmount | uint256 | HOPE 数量 |

**返回值：** USDT 估值（路径：HOPE → WBNB → USDT）；`hopeAmount = 0` 时返回 0

---

### getDirectInviteInfoList

分页查询指定地址的直推会员明细列表。

```solidity
function getDirectInviteInfoList(
    address account,
    uint256 offset,
    uint256 limit
) external view returns (DirectInviteInfo[] memory list, uint256 total)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| account | address | 查询地址 |
| offset | uint256 | 起始下标 |
| limit | uint256 | 查询数量 |

| 返回值 | 类型 | 说明 |
|--------|------|------|
| list | DirectInviteInfo[] | 直推会员明细列表（含地址、UID、燃烧业绩等） |
| total | uint256 | 直推总数 |

---

## 公开状态变量（自动生成 getter）

### 常量

| 方法 | 返回值 | 说明 |
|------|--------|------|
| DEAD() | address | 黑洞地址 `0x...dEaD` |
| BPS() | uint16 | 比例分母 `10000` |
| ACC_PRECISION() | uint256 | 累计分红精度 `1e24` |
| MAX_UPLINE_DEPTH() | uint8 | 最多向上查找层数 `30` |

### 核心地址与配置

| 方法 | 返回值 | 说明 |
|------|--------|------|
| hope() | address | HOPE 代币合约 |
| usdt() | address | USDT 代币合约 |
| swapV2RouterAddress() | address | Uniswap V2 路由地址 |
| swapV2Router() | address | Uniswap V2 路由合约 |
| wBNB() | address | WBNB 地址 |
| lpToken() | address | HOPE-WBNB LP 合约地址 |
| nft() | address | HOPE NFT 合约地址 |
| taxProcessor() | address | 税费处理合约地址 |
| marketRewardAddress() | address | 市场奖励地址 |
| charityAddress() | address | 公益基金地址 |
| minBurnUsdt() | uint256 | 最小燃烧 USDT 价值 |
| burnRateConfig() | BurnRateConfig | 燃烧分配比例 |

### 分红累计与暂存池

| 方法 | 返回值 | 说明 |
|------|--------|------|
| hopeAccPerPrincipal() | uint256 | HOPE 全网累计每单位本金分红 |
| usdtAccPerPrincipal() | uint256 | USDT 全网累计每单位本金分红 |
| nftAccLpPerNft() | uint256 | NFT 累计每张 LP 分红 |
| pendingHopeDividendPool() | uint256 | 暂存 HOPE 分红池 |
| pendingUsdtDividendPool() | uint256 | 暂存 USDT 分红池 |
| pendingNftLpDividendPool() | uint256 | 暂存 NFT LP 分红池 |
| nftFloorPoolBnb() | uint256 | NFT 托底池 BNB 余额 |

### 计数器

| 方法 | 返回值 | 说明 |
|------|--------|------|
| latestUid() | uint32 | 最新会员 UID |
| latestHopeDividendId() | uint32 | 最新 HOPE 分红记录 ID |
| latestUsdtDividendId() | uint32 | 最新 USDT 分红记录 ID |
| latestNftDividendId() | uint32 | 最新 NFT LP 分红记录 ID |

### Mapping getter

| 方法 | 说明 |
|------|------|
| members(address) | 查询会员信息 |
| burnOrders(address, uint32) | 查询会员燃烧订单 |
| hopeDividendRecords(uint32) | 查询 HOPE 分红记录 |
| usdtDividendRecords(uint32) | 查询 USDT 分红记录 |
| nodeLockInfos(address) | 查询节点锁仓信息 |
| nftDividendInfos(uint256) | 查询 NFT 分红信息 |
| nftLpDividendRecords(uint32) | 查询 NFT LP 分红记录 |
| lockHopeAdmins(address) | 查询地址是否为锁仓 HOPE 管理员 |

### 平台统计

| 方法 | 返回值 | 说明 |
|------|--------|------|
| platformMemberStats() | PlatformMemberStats | 平台会员统计 |
| platformBurnStats() | PlatformBurnStats | 平台燃烧统计 |
| platformLockStats() | PlatformLockStats | 平台锁仓统计 |
| platformNftStats() | PlatformNftStats | 平台 NFT 统计（部分字段） |

---

## 主要事件

| 事件 | 说明 |
|------|------|
| MemberRegistered | 会员注册 |
| PointsAdded | 积分增加 |
| HopeBurned | HOPE 燃烧 |
| HopeDividendAdded | HOPE 全网分红增加 |
| UsdtDividendAdded | USDT 全网分红增加 |
| BurnDividendSettled | 燃烧分红结算 |
| BurnDividendClaimed | 燃烧分红领取 |
| OutExcessRedistributed | 出局超额重新分配 |
| ReferralRewardAdded | 推广奖励增加 |
| ReferralRewardClaimed | 推广奖励领取 |
| NodeInitialized | LP 节点初始化 |
| NodeLockReleased | 节点锁仓释放 |
| LockedHopeClaimed | 锁仓 HOPE 领取 |
| LockedHopeBurnedByNftTransfer | NFT 转出导致锁仓 HOPE 销毁 |
| AdminLockedHopeAdded | 管理员增加节点锁仓 HOPE |
| NftLpDividendAdded | NFT LP 分红增加 |
| NftDividendClaimed | NFT LP 分红领取 |
| NftBurnedAndRedeemed | NFT 销毁并赎回托底 BNB |
| NftFloorPoolAdded | NFT 托底池 BNB 增加 |
| MarketRewardPaid | 市场奖励 BNB 支付 |
| CharityPaid | 公益基金 BNB 支付 |

---

## 常见错误

| 错误 | 说明 |
|------|------|
| ZeroAddress() | 地址为零 |
| ZeroAmount() | 数量为零 |
| NoPermission() | 无权限（含 NFT 非拥有者、非锁仓管理员） |
| Bound(address) | 已注册，不可重复绑定 |
| ParentUnbound(address) | 上级未注册 |
| IdenticalAddress() | 地址相同 |
| MemberNotRegistered(address) | 未注册会员 |
| NothingToClaim() | 无可领取金额 |
| SlippageExceeded(uint256, uint256) | 实际值低于用户允许最小值 |
| OnlyTaxProcessor(address) | 非税费处理合约调用 |
| OnlyNftContract(address) | 非 NFT 合约调用 |
| NftDividendUnclaimed(uint256, uint256) | NFT 仍有未领取 LP 分红，不能销毁 |
| EmptyNftSupply() | NFT 供应量为空 |
| InsufficientOutputAmount() | 兑换输出不足 |
| InsufficientBalance(uint256, uint256) | 余额不足 |
