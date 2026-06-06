import request from "@/utils/request";
import type { PermissionTreeNode } from "@/types/api/menu";

/** 菜单管理 API（与 docs/system/api.json 对齐：仅包含 GET /api/v1/admin/menu/routes） */
const MENU_BASE_URL = "/api/v1/admin/menu";

const MenuAPI = {
  /** 获取当前用户可访问的菜单路由（动态路由） */
  getRoutes() {
    return request<any, PermissionTreeNode[]>({ url: `${MENU_BASE_URL}/routes`, method: "get" });
  },
};

export default MenuAPI;
