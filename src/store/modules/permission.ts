import type { RouteRecordRaw } from 'vue-router';
import { constantRoutes } from '@/router';
import { store } from '@/store';
import router from '@/router';
import { useUserStoreHook } from '@/store/modules/user';

import MenuAPI from '@/api/system/menu';
import type { PermissionTreeNode } from '@/types/api/menu';

const modules = import.meta.glob('../../views/**/**.vue');

/**
 * 解析视图组件
 * @param componentPath 组件路径，如 "@/views/dashboard/index.vue"
 */
function resolveViewComponent(componentPath: string) {
  const normalized = componentPath
    .trim()
    .replace(/^@\/views\//, '')
    .replace(/\.vue$/i, '');

  return (
    modules[`../../views/${normalized}.vue`] ||
    modules[`../../views/${normalized}/index.vue`] ||
    modules[`../../views/error/404.vue`]
  );
}

/** permissionCode 无 routePath 时生成相对 path（如 admin:user:menu -> user, admin:system:catalog -> system） */
function pathFromPermissionCode(code: string | null | undefined): string {
  if (!code) return 'unknown';
  const parts = code.split(':').filter(Boolean);
  const last = parts[parts.length - 1];
  if ((last === 'menu' || last === 'catalog') && parts.length > 1) {
    return parts[parts.length - 2];
  }
  return last;
}

/** permissionCode 推断组件路径（如 admin:user:menu -> system/user/index） */
function componentFromPermissionCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const parts = code.split(':').filter(Boolean);

  // 过滤掉最后的 menu/catalog/button
  const filteredParts = parts.filter((p) => !['menu', 'catalog', 'button'].includes(p));

  if (filteredParts.length === 0) return null;

  // 拼接路径：admin:user -> system/user/index
  // 假设第一个部分是模块名，需要映射到实际目录
  const moduleMap: Record<string, string> = {
    admin: 'system',
    dashboard: 'dashboard',
  };

  const moduleDir = moduleMap[filteredParts[0]] || filteredParts[0];

  if (filteredParts.length === 1) {
    // admin:menu -> system/index
    return `${moduleDir}/index`;
  }

  // admin:user:menu -> system/user/index
  return `${moduleDir}/${filteredParts.slice(1).join('/')}/index`;
}

/**
 * 路由构建中间接口
 * 解决 RouteRecordRaw 联合类型的属性访问限制问题
 */
interface RouteBuilder {
  path: string;
  name: string;
  redirect?: string;
  component?: unknown;
  children?: any[];
  meta: Record<string, unknown>;
}

/**
 * 将后端权限树节点转换为 Vue Router 路由配置
 * @param node 权限树节点
 * @param _isTopLevel 是否为顶层路由（保留用于扩展）
 */
function transformRouteNode(node: PermissionTreeNode, _isTopLevel: boolean = true): RouteRecordRaw {
  // 使用 RouteBuilder 中间类型构建路由配置
  // 避免直接使用 RouteRecordRaw 联合类型导致的属性访问限制
  const route: RouteBuilder = {
    path: node.routePath ?? pathFromPermissionCode(node.permissionCode),
    name: node.permissionCode || `route_${node.id}`,
    meta: {
      title: node.permissionName,
      icon: node.icon || undefined,
      hidden: node.visible !== 1,
      keepAlive: node.cache === 1,
      alwaysShow: node.resourceType === 'CATALOG',
    },
  };

  // 处理重定向（仅当值有效且非空时设置）
  if (node.redirect) {
    route.redirect = node.redirect;
  }

  // 防止报错
  if (!route.path.startsWith('/')) {
    route.path = '/' + route.path;
  }

  // 处理组件
  if (node.component) {
    if (node.component === 'Layout') {
      // route.component = Layout;
      route.component = undefined;
    } else {
      const viewComponent = resolveViewComponent(node.component);
      route.component = viewComponent || modules[`../../views/error/404.vue`];
    }
  } else if (!node.children || node.children.length === 0) {
    // 没有子节点且没有 component，通过 permissionCode 推断组件路径
    const inferredComponent = componentFromPermissionCode(node.permissionCode);
    if (inferredComponent) {
      const viewComponent = resolveViewComponent(`@/views/${inferredComponent}.vue`);
      route.component = viewComponent || modules[`../../views/error/404.vue`];
    } else {
      // 无法推断，使用 404 组件
      route.component = modules[`../../views/error/404.vue`];
    }
  } else {
    route.component = undefined;
  }

  // 递归处理子节点
  if (node.children && node.children.length > 0) {
    route.children = node.children
      .filter((child) => child.status === 1) // 只包含启用状态的节点
      .map((child) => transformRouteNode(child, false));
  }
  // 返回时转换为 RouteRecordRaw 类型
  return route as unknown as RouteRecordRaw;
}

/**
 * 过滤并转换权限树为路由配置
 * @param nodes 权限树节点数组
 * @param isTopLevel 是否为顶层
 */
function transformRoutes(
  nodes: PermissionTreeNode[],
  isTopLevel: boolean = true
): RouteRecordRaw[] {
  return nodes
    .filter((node) => node.status === 1 && node.visible === 1) // 只包含启用且可见的节点
    .map((node) => transformRouteNode(node, isTopLevel));
}

export const usePermissionStore = defineStore('permission', () => {
  // 所有路由（静态路由 + 动态路由）
  const routes = ref<RouteRecordRaw[]>([]);
  // 混合布局的左侧菜单路由
  const mixLayoutSideMenus = ref<RouteRecordRaw[]>([]);
  // 动态路由是否已生成
  const isRouteGenerated = ref(false);

  /** 生成动态路由 */
  async function generateRoutes(): Promise<RouteRecordRaw[]> {
    try {
      const data = await MenuAPI.getRoutes(); // 获取当前登录人的菜单路由
      const dynamicRoutes = transformRoutes(data);

      routes.value = [...constantRoutes, ...dynamicRoutes];
      isRouteGenerated.value = true;
      return dynamicRoutes;
    } catch (error) {
      // 路由生成失败，重置状态
      isRouteGenerated.value = false;
      throw error;
    }
  }

  /** 设置混合布局左侧菜单 */
  const setMixLayoutSideMenus = (parentPath: string) => {
    const parentMenu = routes.value.find((item: RouteRecordRaw) => item.path === parentPath);
    mixLayoutSideMenus.value = parentMenu?.children || [];
  };

  /** 重置路由状态 */
  const resetRouter = () => {
    // 移除动态添加的路由
    const constantRouteNames = new Set(constantRoutes.map((route) => route.name).filter(Boolean));
    routes.value.forEach((route: RouteRecordRaw) => {
      if (route.name && !constantRouteNames.has(route.name)) {
        router.removeRoute(route.name);
      }
    });

    // 重置所有状态
    routes.value = [...constantRoutes];
    mixLayoutSideMenus.value = [];
    isRouteGenerated.value = false;
  };

  let reloadPromise: Promise<RouteRecordRaw[]> | null = null;

  /**
   * 重新加载动态路由（单飞）。
   *
   * 典型场景：后端权限变更导致接口返回权限不足（A0301），前端需要刷新路由和菜单以同步最新权限。
   *
   * - 会先清理已注册的动态路由（resetRouter）
   * - 重新从后端拉取路由（generateRoutes）
   * - 将动态路由注册到 vue-router（router.addRoute）
   */
  async function reloadDynamicRoutesOnce(): Promise<RouteRecordRaw[]> {
    if (reloadPromise) return reloadPromise;

    reloadPromise = (async () => {
      try {
        resetRouter();
        const dynamicRoutes = await generateRoutes();
        dynamicRoutes.forEach((route: RouteRecordRaw) => {
          router.addRoute(route);
        });
        return dynamicRoutes;
      } finally {
        reloadPromise = null;
      }
    })();

    return reloadPromise;
  }

  let snapshotPromise: Promise<void> | null = null;

  /**
   * 刷新权限快照（单飞）。
   *
   * - 刷新用户信息（包含 perms/roles 等）
   * - 重新加载动态路由
   */
  async function reloadPermissionSnapshotOnce(): Promise<void> {
    if (snapshotPromise) return snapshotPromise;

    snapshotPromise = (async () => {
      try {
        const userStore = useUserStoreHook();
        await userStore.getUserInfo();
        await reloadDynamicRoutesOnce();
      } finally {
        snapshotPromise = null;
      }
    })();

    return snapshotPromise;
  }

  return {
    routes,
    mixLayoutSideMenus,
    isRouteGenerated,
    generateRoutes,
    setMixLayoutSideMenus,
    resetRouter,
    reloadDynamicRoutesOnce,
    reloadPermissionSnapshotOnce,
  };
});

/** 非组件环境使用权限store */
export function usePermissionStoreHook() {
  return usePermissionStore(store);
}
