import request from '@/utils/request';
import type { PermissionTreeNode, MenuQueryParams, MenuItem, MenuForm } from '@/types/api/menu';

/** 菜单管理 API（与 docs/system/api.json 对齐：仅包含 GET /api/v1/admin/menu/routes） */
const MENU_BASE_URL = '/api/v1/admin/menu';

const MenuAPI = {
  /** 获取当前用户可访问的菜单路由（动态路由） */
  getRoutes() {
    return request<any, PermissionTreeNode[]>({ url: `${MENU_BASE_URL}/routes`, method: 'get' });
  },
  /** 获取菜单树形列表 */
  getList(queryParams: MenuQueryParams) {
    return request<unknown, MenuItem[]>({
      url: `${MENU_BASE_URL}`,
      method: 'get',
      params: queryParams,
    });
  },
  /** 获取菜单下拉数据源 */
  getOptions(onlyParent?: boolean, scope?: number) {
    return request<unknown, OptionItem[]>({
      url: `${MENU_BASE_URL}/options`,
      method: 'get',
      params: { onlyParent, scope },
    });
  },
  /** 获取菜单表单数据 */
  getFormData(id: string) {
    return request<unknown, MenuForm>({ url: `${MENU_BASE_URL}/${id}/form`, method: 'get' });
  },
  /** 新增菜单 */
  create(data: MenuForm) {
    return request({ url: `${MENU_BASE_URL}`, method: 'post', data });
  },
  /** 修改菜单 */
  update(id: string, data: MenuForm) {
    return request({ url: `${MENU_BASE_URL}/${id}`, method: 'put', data });
  },
  /** 删除菜单 */
  deleteById(id: string) {
    return request({ url: `${MENU_BASE_URL}/${id}`, method: 'delete' });
  },
};

export default MenuAPI;
