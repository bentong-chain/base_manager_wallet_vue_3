/**
 * Web3 utility types
 */

export interface ChainInfo {
  chainId: number;
  chainName: string;
  coinName: string;
  coinSymbol: string;
  coinDecimals: number;
  rpcUrl: string;
  blockExplorerUrl: string;
}

export interface ContractInfo {
  abi: any[];
  [key: string]: any; // Allow chain-specific addresses
}

export interface EVMInfo {
  network: any;
  signer: any | null;
  provider: any;
}

export enum Grade {
  V0 = 0,
  V1 = 1,
  V2 = 2,
  V3 = 3,
  V4 = 4,
  V5 = 5,
  V6 = 6,
  V7 = 7,
  V8 = 8,
  V9 = 9,
  V10 = 10,
  V11 = 11,
  V12 = 12,
  V13 = 13,
  V14 = 14,
  V15 = 15,
}

/**
 * 用户信息接口
 * @description 从 YiyouCore 合约获取的用户数据结构
 */
export interface Member {
  /** 用户ID - 系统内部唯一标识每个用户的编号 */
  uid: number;
  /** 直推人数 - 当前用户直接推荐/邀请的下级用户数量 */
  directCount: number;
  /** 团队人数 - 当前用户整个团队的总人数（包括直推和间接下级） */
  teamCount: number;
  /** 注册时间 - 用户注册的时间戳（UNIX 时间，单位秒） */
  registeredAt: number;
  /** 最近登录时间 - 用户最近一次登录的时间戳（UNIX 时间，单位秒） */
  lastSignInAt: number;
  /** 最近领取时间 - 用户最近一次领取奖励/积分的时间戳（UNIX 时间，单位秒） */
  lastClaimAt: number;
  /** 上级地址 - 用户邀请/推荐的上级钱包地址 */
  parent: string;
  /** 设备ID - 用户设备的唯一标识，用于防刷/限制登录 */
  deviceId: string;
  /** 积分余额 - 用户当前持有的积分数量 */
  pointsBalance: bigint;
  /** 累计领取 - 用户累计领取的奖励或代币总额 */
  totalDxsClaimed: bigint;
}

/**
 * 用户信息响应接口
 * @description 与 Member 结构相同，用于 API 响应类型定义
 */
export interface MemberResponse {
  /** 用户ID - 系统内部唯一标识每个用户的编号 */
  uid: number;
  /** 直推人数 - 当前用户直接推荐/邀请的下级用户数量 */
  directCount: number;
  /** 团队人数 - 当前用户整个团队的总人数（包括直推和间接下级） */
  teamCount: number;
  /** 注册时间 - 用户注册的时间戳（UNIX 时间，单位秒） */
  registeredAt: number;
  /** 最近登录时间 - 用户最近一次登录的时间戳（UNIX 时间，单位秒） */
  lastSignInAt: number;
  /** 最近领取时间 - 用户最近一次领取奖励/积分的时间戳（UNIX 时间，单位秒） */
  lastClaimAt: number;
  /** 上级地址 - 用户邀请/推荐的上级钱包地址 */
  parent: string;
  /** 设备ID - 用户设备的唯一标识，用于防刷/限制登录 */
  deviceId: string;
  /** 积分余额 - 用户当前持有的积分数量 */
  pointsBalance: bigint;
  /** 累计领取 - 用户累计领取的奖励或代币总额 */
  totalDxsClaimed: bigint;
}
