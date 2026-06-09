/**
 * Log 日志类型定义
 */

import type { BaseQueryParams } from "./common";

/** 日志分页查询参数 */
export interface LogQueryParams extends BaseQueryParams {
  /** 搜索关键字 */
  keywords?: string;
  /** 操作时间 */
  createTime?: [string, string];
}

/** 日志分页对象 */
export interface LogItem {
  /** 日志ID */
  id: string;
  /** 日志模块 */
  module: string;
  /** 日志内容 */
  content: string;
  /** 请求路径 */
  requestUri?: string;
  /** 请求方法 */
  method?: string;
  /** IP地址 */
  ip: string;
  /** 地区 */
  region: string;
  /** 浏览器 */
  browser: string;
  /** 终端系统 */
  os: string;
  /** 执行时间(毫秒) */
  executionTime: number;
  /** 创建人ID */
  createBy?: string;
  /** 操作时间 */
  createTime?: string;
  /** 操作人 */
  operator: string;
}

/** 操作日志分页查询参数（api.json operation-log/list） */
export interface OperationLogQueryParams extends BaseQueryParams {
  /** 操作人UID */
  operatorUid?: number;
  /** 操作类型 */
  operationType?: string;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
}

/** 操作日志列表项 */
export interface OperationLogItem {
  /** 日志ID */
  id: number | string;
  /** 操作人UID */
  operatorUid?: number;
  /** 操作人姓名 */
  operatorName?: string;
  /** 操作类型 */
  operationType?: string;
  /** 请求路径 */
  requestUri?: string;
  /** 请求方法 */
  method?: string;
  /** IP */
  ip?: string;
  /** 操作时间 */
  createTime?: string;
  /** 备注/内容 */
  content?: string;
}
