/**
 * 权限类型定义（与 api.json GET /api/v1/admin/permission/tree 对齐）
 */

/** 权限详情响应（GET /api/v1/admin/permission/{id}） */
export interface AdminPermissionDetailResponse {
  /** 权限 ID */
  id: number;
  /** 权限名称 */
  permissionName: string;
  /** 权限编码 */
  permissionCode: string;
  /** 资源类型：CATALOG/MENU/API */
  resourceType: string;
  /** 接口路径（API 类型） */
  uri?: string | null;
  /** HTTP 方法 */
  method?: string | null;
  /** 前端路由路径 */
  routePath?: string | null;
  /** 前端组件路径 */
  component?: string | null;
  /** 菜单图标 */
  icon?: string | null;
  /** 是否显示：0-隐藏 1-显示 */
  visible?: number;
  /** 是否缓存：0-不缓存 1-缓存 */
  cache?: number;
  /** 跳转路径 */
  redirect?: string | null;
  /** 父权限 ID */
  parentId: number;
  /** 父权限名称 */
  parentName?: string | null;
  /** 排序 */
  sort: number;
  /** 状态：0-禁用 1-启用 */
  status: number;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/** 权限树节点 */
export interface PermissionTreeNode {
  /** 权限ID */
  id: number;
  /** 父级ID */
  parentId?: number;
  /** 权限编码 */
  permissionCode?: string;
  /** 权限名称 */
  permissionName?: string;
  /** 资源类型 */
  resourceType?: string;
  /** URI（API 类型必填） */
  uri?: string | null;
  /** 请求方法（API 类型必填） */
  method?: string | null;
  /** 路由路径（CATALOG/MENU 类型必填） */
  routePath?: string | null;
  /** 组件路径（MENU 类型必填） */
  component?: string | null;
  /** 菜单图标 */
  icon?: string | null;
  /** 是否显示（0-隐藏 1-显示） */
  visible?: number;
  /** 是否缓存（0-不缓存 1-缓存） */
  cache?: number;
  /** 跳转路径 */
  redirect?: string | null;
  /** 状态（0-禁用 1-启用） */
  status?: number;
  /** 排序 */
  sort?: number;
  /** 子节点 */
  children?: PermissionTreeNode[];
  /** 是否已删除 */
  isDeleted?: boolean;
  /** 创建时间 */
  createdAt?: string;
}

/** 资源类型 */
export type ResourceType = 'CATALOG' | 'MENU' | 'API';

/** HTTP 方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** 新增权限请求 */
export interface CreatePermissionRequest {
  /** 权限名称（必填，2-100字符） */
  permissionName: string;
  /** 权限编码（必填，2-100字符） */
  permissionCode: string;
  /** 资源类型：CATALOG/MENU/API */
  resourceType: ResourceType;
  /** 接口路径（API 类型必填） */
  uri?: string;
  /** HTTP 方法（API 类型必填） */
  method?: HttpMethod;
  /** 前端路由路径（CATALOG/MENU 类型必填） */
  routePath?: string;
  /** 前端组件路径（MENU 类型必填） */
  component?: string;
  /** 菜单图标 */
  icon?: string;
  /** 是否显示：0-隐藏 1-显示，默认 1 */
  visible?: number;
  /** 是否缓存：0-不缓存 1-缓存，默认 0 */
  cache?: number;
  /** 跳转路径 */
  redirect?: string;
  /** 父权限 ID，默认 0 */
  parentId?: number;
  /** 排序，默认 0，范围 0-9999 */
  sort?: number;
  /** 状态：0-禁用 1-启用，默认 1 */
  status?: number;
}

/** 更新权限请求 */
export interface UpdatePermissionRequest {
  /** 权限名称（必填，2-100字符） */
  permissionName: string;
  /** 权限编码（必填，2-100字符） */
  permissionCode: string;
  /** 资源类型：CATALOG/MENU/API（不可修改） */
  resourceType: ResourceType;
  /** 接口路径（API 类型必填） */
  uri?: string;
  /** HTTP 方法（API 类型必填） */
  method?: HttpMethod;
  /** 前端路由路径（CATALOG/MENU 类型必填） */
  routePath?: string;
  /** 前端组件路径（MENU 类型必填） */
  component?: string;
  /** 菜单图标 */
  icon?: string;
  /** 是否缓存：0-不缓存 1-缓存（仅 MENU 类型有效） */
  cache?: number;
  /** 跳转路径 */
  redirect?: string;
  /** 父权限 ID（不能设置为自身 ID） */
  parentId: number;
  /** 排序，范围 0-9999 */
  sort: number;
  /** 状态：0-禁用 1-启用 */
  status: number;
}

/** 更新权限状态请求 */
export interface UpdatePermissionStatusRequest {
  /** 状态：0-禁用 1-启用 */
  status: number;
}

/** 权限表单对象（用于前端表单） */
export interface PermissionForm {
  /** 权限 ID（编辑时必填） */
  id?: number;
  /** 权限名称 */
  permissionName: string;
  /** 权限编码 */
  permissionCode: string;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 接口路径 */
  uri?: string;
  /** HTTP 方法 */
  method?: HttpMethod;
  /** 路由路径 */
  routePath?: string;
  /** 组件路径 */
  component?: string;
  /** 菜单图标 */
  icon?: string;
  /** 是否缓存：0-不缓存 1-缓存，默认 0（仅 MENU 类型有效） */
  cache?: number;
  /** 跳转路径 */
  redirect?: string;
  /** 父权限 ID */
  parentId: number;
  /** 排序 */
  sort: number;
  /** 状态：0-禁用 1-启用 */
  status: number;
}
