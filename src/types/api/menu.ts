/**
 * Menu 菜单类型定义
 */

/** 资源类型 */
export type ResourceType = "CATALOG" | "MENU" | "BUTTON";

/** 权限树节点（与后端 AdminPermissionTreeResponse 对齐） */
export interface PermissionTreeNode {
  /** 权限 ID */
  id: number;
  /** 权限名称 */
  permissionName: string;
  /** 权限编码 */
  permissionCode: string;
  /** 资源类型（CATALOG-目录 MENU-菜单 BUTTON-按钮） */
  resourceType: ResourceType;
  /** URI（按钮权限用） */
  uri?: string | null;
  /** 请求方法（按钮权限用） */
  method?: string | null;
  /** 路由路径 */
  routePath?: string | null;
  /** 组件路径 */
  component?: string | null;
  /** 图标 */
  icon?: string | null;
  /** 是否可见（1-可见 0-隐藏） */
  visible: number;
  /** 是否缓存（1-缓存 0-不缓存） */
  cache: number;
  /** 重定向路径 */
  redirect?: string | null;
  /** 父级 ID */
  parentId: number;
  /** 排序 */
  sort: number;
  /** 状态（1-启用 0-禁用） */
  status: number;
  /** 创建时间 */
  createdAt: string;
  /** 子节点 */
  children: PermissionTreeNode[] | null;
}

/** 菜单查询参数 */
export interface MenuQueryParams {
  /** 搜索关键字 */
  keywords?: string;
}

/** 菜单视图对象 */
export interface MenuItem {
  /** 子菜单 */
  children?: MenuItem[];
  /** 组件路径 */
  component?: string;
  /** ICON */
  icon?: string;
  /** 菜单ID */
  id?: string;
  /** 菜单名称 */
  name?: string;
  /** 父菜单ID */
  parentId?: string;
  /** 路由路径 */
  path?: string;
  /** 按钮权限标识 */
  perm?: string;
  /** 跳转路径 */
  redirect?: string;
  /** 菜单排序(数字越小排名越靠前) */
  sort?: number;
  /** 菜单类型（C-目录 M-菜单 B-按钮） */
  type?: string;
  /** 菜单是否可见(1:显示;0:隐藏) */
  visible?: number;
  /** 菜单范围(1=平台 2=业务) */
  scope?: number;
}

/** 菜单表单对象 */
export interface MenuForm {
  /** 菜单ID */
  id?: string;
  /** 父菜单ID */
  parentId?: string;
  /** 菜单名称 */
  name?: string;
  /** 菜单类型（C-目录 M-菜单 B-按钮） */
  type?: string;
  /** 路由路径 */
  path?: string;
  /** 路由名称（用于前端路由名） */
  routeName?: string;
  /** 路由路径（可用于自定义路由字段） */
  routePath?: string;
  /** 跳转路径 */
  redirect?: string;
  /** 组件路径 */
  component?: string;
  /** ICON */
  icon?: string;
  /** 排序 */
  sort?: number;
  /** 菜单是否可见 */
  visible?: number;
  /** 菜单范围(1=平台 2=业务) */
  scope?: number;
  /** 按钮权限标识 */
  perm?: string;
  /** 路由参数（用于表单编辑 params） */
  params?: { key?: string; value?: string }[];
  /** 是否始终显示（仅对目录生效） */
  alwaysShow?: number | boolean;
  /** 是否缓存（用于 keepAlive） */
  keepAlive?: number | boolean;
}

/** 菜单选项 */
export interface MenuOption {
  key: string;
  value: string;
}

/** 路由对象 */
export interface RouteItem {
  /** 子路由列表 */
  children: RouteItem[];
  /** 组件路径 */
  component?: string;
  /** 路由名称 */
  name?: string;
  /** 路由路径 */
  path?: string;
  /** 路由属性 */
  meta?: Meta;
  /** 跳转链接 */
  redirect?: string;
}

/** 路由属性 */
export interface Meta {
  /** 【目录】只有一个子路由是否始终显示 */
  alwaysShow?: boolean;
  /** 是否隐藏(true-是 false-否) */
  hidden?: boolean;
  /** ICON */
  icon?: string;
  /** 【菜单】是否开启页面缓存 */
  keepAlive?: boolean;
  /** 路由参数 */
  params?: Record<string, any>;
  /** 角色集合 */
  roles?: string[];
  /** 路由title */
  title?: string;
}
