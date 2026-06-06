/**
 * 管理员用户类型定义（与 api.json 管理员用户管理接口对齐）
 */

import type { BaseQueryParams } from "./common";

/** 管理员用户列表项 */
export interface AdminUserListItem {
  /** 用户ID（表主键等） */
  id: number | string;
  /** 用户唯一标识，接口路径 /{uid}/roles、/{uid}/status 使用 */
  uid?: number | string;
  /** 用户名 */
  username?: string;
  /** 真实姓名 */
  realName?: string;
  /** 手机号 */
  mobile?: string;
  /** 邮箱 */
  email?: string;
  /** 角色名称，多个逗号分隔 */
  roleNames?: string;
  /** 角色ID列表 */
  roleIds?: number[];
  /** 状态 1:启用 0:禁用 */
  status?: number;
  /** 备注 */
  remark?: string;
  /** 创建时间（前端展示用，可由 createdAt 归一化） */
  createTime?: string;
  /** 创建时间（后端返回字段名） */
  createdAt?: string;
}

/** 管理员用户分页查询参数 */
export interface AdminUserQueryParams extends BaseQueryParams {
  /** 用户名 */
  username?: string;
  /** 状态 */
  status?: number;
  /** 角色ID，按角色筛选用户 */
  roleId?: number;
}

/** 管理员用户保存请求（create/update） */
export interface AdminUserSaveRequest {
  /** 用户ID（更新时） */
  id?: number;
  /** 用户名 */
  username?: string;
  /** 密码（新增必填，编辑留空表示不改） */
  password?: string;
  /** 真实姓名 */
  realName?: string;
  /** 手机号 */
  mobile?: string;
  /** 邮箱 */
  email?: string;
  /** 状态 */
  status?: number;
  /** 备注 */
  remark?: string;
}

/** 分配角色请求 */
export interface AdminUserAssignRolesRequest {
  /** 角色ID列表 */
  roleIds: number[];
}
