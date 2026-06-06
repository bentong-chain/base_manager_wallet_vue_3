/**
 * Statistics 统计类型定义
 */

/** 访问趋势查询参数 */
export interface VisitTrendQueryParams {
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
}

/** 访问趋势视图对象 */
export interface VisitTrendDetail {
  /** 日期列表 */
  dates: string[];
  /** 浏览量(PV)列表 */
  pvList: number[];
  /** 访客数(UV)列表 */
  uvList: number[];
  /** IP数列表 */
  ipList: number[];
}

/** 访问量统计视图对象（仪表盘 UV/PV 展示用） */
export interface VisitStatsDetail {
  /** 今日独立访客数(UV) */
  todayUvCount: number;
  /** 累计独立访客数(UV) */
  totalUvCount: number;
  /** 独立访客增长率（小数，如 0.1 表示 10%） */
  uvGrowthRate: number;
  /** 今日页面浏览量(PV) */
  todayPvCount: number;
  /** 累计页面浏览量(PV) */
  totalPvCount: number;
  /** 页面浏览量增长率（小数） */
  pvGrowthRate: number;
}

/** 在线人数与访客统计 API 响应（与 /api/v1/statistics/online-stats 一致） */
export interface OnlineStatsDetail {
  /** 当前在线人数 */
  onlineCount?: number;
  /** 今日 UV */
  todayUv?: number;
  /** 今日 PV */
  todayPv?: number;
  /** 今日登录用户数 */
  todayLoggedIn?: number;
  /** 今日活跃用户数 */
  todayActive?: number;
  /** 总 UV */
  totalUv?: number;
  /** 总 PV */
  totalPv?: number;
  /** 今日 UV 增长率（整数百分比，如 10 表示 10%） */
  todayUvGrowthRate?: number;
  /** 今日 PV 增长率（整数百分比） */
  todayPvGrowthRate?: number;
  /** 统计时间戳 */
  timestamp?: number;
}
