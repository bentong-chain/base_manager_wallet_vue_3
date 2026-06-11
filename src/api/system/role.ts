import { http as request } from '@/utils/request';
import type { PageResult } from '@/types/api';
import type {
  AdminRoleQueryParams,
  AdminRoleListItem,
  AdminRoleSaveRequest,
  AdminRoleAssignPermissionsRequest,
} from '@/types/api/role';

const ADMIN_ROLE_BASE_URL = '/api/v1/admin/role';

/**
 * 角色 API
 */
const Role = {
  /**
   * 获取管理员角色列表（GET /api/v1/admin/role/list）
   * 仅传有值参数且使用明确基本类型，避免 reactive/undefined 导致后端参数校验或签名失败
   */
  getAdminRoleList(params: AdminRoleQueryParams) {
    const pageNum = Math.max(1, Number(params?.pageNum) || 1);
    const pageSize = Math.max(1, Number(params?.pageSize) || 10);
    const cleaned: Record<string, string | number> = {
      pageNum,
      pageSize,
    };
    const roleName =
      params?.roleName != null && String(params.roleName).trim() !== ''
        ? String(params.roleName).trim()
        : undefined;
    if (roleName !== undefined) {
      cleaned.roleName = roleName;
    }
    const status =
      params?.status !== undefined &&
      params?.status !== null &&
      (params.status === 0 || params.status === 1)
        ? params.status
        : undefined;
    if (status !== undefined) {
      cleaned.status = status;
    }
    return request<any, PageResult<AdminRoleListItem>>({
      url: `${ADMIN_ROLE_BASE_URL}/list`,
      method: 'get',
      params: cleaned,
    });
  },

  /**
   * 获取角色详情（GET /api/v1/admin/role/{id}）
   */
  getAdminRoleDetail(id: number | string) {
    return request<any, AdminRoleListItem>({
      url: `${ADMIN_ROLE_BASE_URL}/${id}`,
      method: 'get',
    });
  },

  /**
   * 创建角色（POST /api/v1/admin/role）
   * @returns 新角色 ID（ResultLong.data）
   */
  createAdminRole(data: AdminRoleSaveRequest) {
    return request<any, number>({
      url: ADMIN_ROLE_BASE_URL,
      method: 'post',
      data,
    });
  },

  /**
   * 更新角色（PUT /api/v1/admin/role/{id}）
   */
  updateAdminRole(id: number | string, data: AdminRoleSaveRequest) {
    return request({
      url: `${ADMIN_ROLE_BASE_URL}/${id}`,
      method: 'put',
      data,
    });
  },

  /**
   * 删除角色（DELETE /api/v1/admin/role/{id}）
   */
  deleteAdminRole(id: number | string) {
    return request({
      url: `${ADMIN_ROLE_BASE_URL}/${id}`,
      method: 'delete',
    });
  },

  /**
   * 获取角色权限 ID 列表（GET /api/v1/admin/role/{id}/permission-ids）
   */
  getAdminRolePermissionIds(id: number | string) {
    return request<any, number[]>({
      url: `${ADMIN_ROLE_BASE_URL}/${id}/permission-ids`,
      method: 'get',
    });
  },

  /**
   * 为角色分配权限（PUT /api/v1/admin/role/{id}/permissions）
   */
  assignAdminRolePermissions(id: number | string, data: AdminRoleAssignPermissionsRequest) {
    return request({
      url: `${ADMIN_ROLE_BASE_URL}/${id}/permissions`,
      method: 'put',
      data,
    });
  },
};

export default Role;
