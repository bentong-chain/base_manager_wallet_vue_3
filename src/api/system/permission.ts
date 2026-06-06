import request from "@/utils/request";
import type {
  PermissionTreeNode,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  UpdatePermissionStatusRequest,
  AdminPermissionDetailResponse,
} from "@/types/api/permission";

const ADMIN_PERMISSION_BASE_URL = "/api/v1/admin/permission";

/**
 * 权限树（GET /api/v1/admin/permission/tree）
 * @param params 可选 status：状态筛选
 */
export function getPermissionTree(params?: { status?: number }) {
  return request<any, PermissionTreeNode[]>({
    url: `${ADMIN_PERMISSION_BASE_URL}/tree`,
    method: "get",
    params: params ?? {},
  });
}

/**
 * 权限详情（GET /api/v1/admin/permission/{id}）
 * @param id 权限 ID
 * @returns 权限详情数据
 */
export function getPermissionDetail(id: number) {
  return request<any, AdminPermissionDetailResponse>({
    url: `${ADMIN_PERMISSION_BASE_URL}/${id}`,
    method: "get",
  });
}

/**
 * 新增权限（POST /api/v1/admin/permission）
 * @param data 新增权限请求数据
 * @returns 返回新创建的权限 ID
 */
export function createPermission(data: CreatePermissionRequest) {
  return request<any, number>({
    url: ADMIN_PERMISSION_BASE_URL,
    method: "post",
    data,
  });
}

/**
 * 更新权限（PUT /api/v1/admin/permission/{id}）
 * @param id 权限 ID
 * @param data 更新权限请求数据
 */
export function updatePermission(id: number, data: UpdatePermissionRequest) {
  return request<any, void>({
    url: `${ADMIN_PERMISSION_BASE_URL}/${id}`,
    method: "put",
    data,
  });
}

/**
 * 更新权限状态（PATCH /api/v1/admin/permission/status/{id}）
 * @param id 权限 ID
 * @param data 更新状态请求数据
 */
export function updatePermissionStatus(id: number, data: UpdatePermissionStatusRequest) {
  return request<any, void>({
    url: `${ADMIN_PERMISSION_BASE_URL}/status/${id}`,
    method: "patch",
    data,
  });
}

/**
 * 删除权限（DELETE /api/v1/admin/permission/{id}）
 * @description 首次软删除，二次物理删除
 * @param id 权限 ID
 */
export function deletePermission(id: number) {
  return request<any, void>({
    url: `${ADMIN_PERMISSION_BASE_URL}/${id}`,
    method: "delete",
  });
}
