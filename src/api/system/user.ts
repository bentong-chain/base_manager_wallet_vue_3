import type { Ref } from 'vue';
import request, { type AuthCredentialsOverride, HEADER_AUTH_CREDENTIALS } from '@/utils/request';
import { useUserStoreHook } from '@/store/modules/user';
import type {
  UserInfo,
  UserForm,
  UserQueryParams,
  UserItem,
  UserProfileDetail,
  UserProfileForm,
  PasswordChangeForm,
  PasswordVerifyForm,
  MobileUpdateForm,
  EmailUpdateForm,
  OptionItem,
  PageResult,
  ExcelResult,
} from '@/types/api';
import type {
  AdminUserQueryParams,
  AdminUserListItem,
  AdminUserSaveRequest,
  AdminUserAssignRolesRequest,
} from '@/types/api/admin-user';

const USER_BASE_URL = '/api/v1/users';
/** 管理员认证：获取当前管理员信息（api.json GET /api/v1/admin/auth/info） */
const AUTH_INFO_URL = '/api/v1/admin/auth/info';
/** 管理员用户更新（api.json PUT /api/v1/admin/user/{id}） */
const ADMIN_USER_BASE_URL = '/api/v1/admin/user';

/**
 * 将 auth/info 接口返回的数据映射为个人中心使用的 UserProfileDetail
 * 兼容后端字段：uid/userId/id、realName/nickname、createdAt/createTime、roles/roleNames 数组转字符串
 */
function mapAuthInfoToProfileDetail(raw: Record<string, unknown>): UserProfileDetail {
  const roleNamesArr = raw.roleNames as string[] | undefined;
  const rolesArr = raw.roles as string[] | undefined;
  const roleNamesStr = Array.isArray(roleNamesArr)
    ? roleNamesArr.join(', ')
    : Array.isArray(rolesArr)
      ? rolesArr.join(', ')
      : (raw.roleNames as string | undefined);
  const createdAt = raw.createdAt ?? raw.createTime;
  const createTimeStr =
    typeof createdAt === 'string'
      ? createdAt
      : createdAt != null && typeof (createdAt as Date).toISOString === 'function'
        ? (createdAt as Date).toISOString()
        : undefined;
  return {
    id: String(raw.uid ?? raw.userId ?? raw.id ?? ''),
    username: raw.username as string | undefined,
    nickname: (raw.nickname ?? raw.realName) as string | undefined,
    avatar: raw.avatar as string | undefined,
    gender: raw.gender as number | undefined,
    mobile: raw.mobile as string | undefined,
    email: raw.email as string | undefined,
    roleNames: roleNamesStr,
    createTime: createTimeStr as unknown as Date | undefined,
  };
}

const UserAPI = {
  /**
   * 获取当前登录管理员信息（GET /api/v1/admin/auth/info）
   * @param credentials 可选，登录后立即调用时传入本次登录的 token/公钥/salt，保证请求头带 token
   * @returns 当前管理员基本信息和权限
   */
  getInfo(credentials?: AuthCredentialsOverride) {
    return request<any, UserInfo>({
      url: AUTH_INFO_URL,
      method: 'get',
      ...(credentials && {
        headers: { [HEADER_AUTH_CREDENTIALS]: JSON.stringify(credentials) },
      }),
    });
  },

  /**
   * 获取用户分页列表
   *
   * @param queryParams 查询参数
   */
  getPage(queryParams: UserQueryParams) {
    return request<any, PageResult<UserItem>>({
      url: `${USER_BASE_URL}`,
      method: 'get',
      params: queryParams,
    });
  },

  /**
   * 获取用户表单详情
   *
   * @param userId 用户ID
   * @returns 用户表单详情
   */
  getFormData(userId: string) {
    return request<any, UserForm>({
      url: `${USER_BASE_URL}/${userId}/form`,
      method: 'get',
    });
  },

  /**
   * 添加用户
   *
   * @param data 用户表单数据
   */
  create(data: UserForm) {
    return request({
      url: `${USER_BASE_URL}`,
      method: 'post',
      data,
    });
  },

  /**
   * 修改用户
   *
   * @param id 用户ID
   * @param data 用户表单数据
   */
  update(id: string, data: UserForm) {
    return request({
      url: `${USER_BASE_URL}/${id}`,
      method: 'put',
      data,
    });
  },

  /**
   * 修改用户密码
   *
   * @param id 用户ID
   * @param password 新密码
   */
  resetPassword(id: string, password: string) {
    return request({
      url: `${USER_BASE_URL}/${id}/password/reset`,
      method: 'put',
      params: { password },
    });
  },

  /**
   * 批量删除用户，多个以英文逗号(,)分割
   *
   * @param ids 用户ID字符串，多个以英文逗号(,)分割
   */
  deleteByIds(ids: string) {
    return request({
      url: `${USER_BASE_URL}/${ids}`,
      method: 'delete',
    });
  },

  /** 下载用户导入模板 */
  downloadTemplate() {
    return request({
      url: `${USER_BASE_URL}/template`,
      method: 'get',
      responseType: 'blob',
    });
  },

  /**
   * 导出用户
   *
   * @param queryParams 查询参数
   */
  export(queryParams: UserQueryParams) {
    return request({
      url: `${USER_BASE_URL}/export`,
      method: 'get',
      params: queryParams,
      responseType: 'blob',
    });
  },

  /**
   * 导入用户
   *
   * @param file 导入文件
   */
  import(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return request<any, ExcelResult>({
      url: `${USER_BASE_URL}/import`,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 获取个人中心用户信息（对接 api.json GET /api/v1/admin/auth/info）
   * 返回数据已映射为 UserProfileDetail；并同步 avatar/nickname 到当前用户 store 供页面展示
   */
  async getProfile(): Promise<UserProfileDetail> {
    const data = await request<Record<string, unknown>, Record<string, unknown>>({
      url: AUTH_INFO_URL,
      method: 'get',
    });
    const raw = (data ?? {}) as Record<string, unknown>;
    const profile = mapAuthInfoToProfileDetail(raw);
    const userStore = useUserStoreHook();
    const userInfoRef = userStore.userInfo as unknown as Ref<UserInfo>;
    if (userInfoRef?.value && (profile.avatar !== undefined || profile.nickname !== undefined)) {
      if (profile.avatar !== undefined) userInfoRef.value.avatar = profile.avatar;
      if (profile.nickname !== undefined) userInfoRef.value.nickname = profile.nickname;
    }
    return profile;
  },

  /**
   * 修改个人中心用户信息（对接 api.json PUT /api/v1/admin/user/{id}）
   * 请求体按 AdminUserSaveRequest 传 realName；id 未传时从当前登录用户 store 取
   */
  updateProfile(data: UserProfileForm) {
    const id =
      (data as UserProfileForm & { id?: string }).id ?? useUserStoreHook().userInfo?.userId;
    if (!id) {
      return Promise.reject(new Error('更新个人资料需要用户 id，请先加载个人资料'));
    }
    const body: Record<string, unknown> = {
      realName: data.nickname,
    };
    return request({
      url: `${ADMIN_USER_BASE_URL}/${id}`,
      method: 'put',
      data: body,
    });
  },

  /** 修改个人中心用户密码 */
  changePassword(data: PasswordChangeForm) {
    return request({
      url: `${USER_BASE_URL}/password`,
      method: 'put',
      data,
    });
  },

  /** 发送短信验证码（绑定或更换手机号）*/
  sendMobileCode(mobile: string) {
    return request({
      url: `${USER_BASE_URL}/mobile/code`,
      method: 'post',
      params: { mobile },
    });
  },

  /** 绑定或更换手机号 */
  bindOrChangeMobile(data: MobileUpdateForm) {
    return request({
      url: `${USER_BASE_URL}/mobile`,
      method: 'put',
      data,
    });
  },

  /** 解绑手机号 */
  unbindMobile(data: PasswordVerifyForm) {
    return request({
      url: `${USER_BASE_URL}/mobile`,
      method: 'delete',
      data,
    });
  },

  /** 发送邮箱验证码（绑定或更换邮箱）*/
  sendEmailCode(email: string) {
    return request({
      url: `${USER_BASE_URL}/email/code`,
      method: 'post',
      params: { email },
    });
  },

  /** 绑定或更换邮箱 */
  bindOrChangeEmail(data: EmailUpdateForm) {
    return request({
      url: `${USER_BASE_URL}/email`,
      method: 'put',
      data,
    });
  },

  /** 解绑邮箱 */
  unbindEmail(data: PasswordVerifyForm) {
    return request({
      url: `${USER_BASE_URL}/email`,
      method: 'delete',
      data,
    });
  },

  /**
   *  获取用户下拉列表
   */
  getOptions() {
    return request<any, OptionItem[]>({
      url: `${USER_BASE_URL}/options`,
      method: 'get',
    });
  },

  // ─── 管理员用户管理（api.json 管理员用户管理） ─────────────────────────────

  /**
   * 管理员用户分页列表（GET /api/v1/admin/user/list）
   * 仅传有值参数，避免 undefined/null 被序列化导致后端签名校验失败
   */
  getAdminList(params: AdminUserQueryParams) {
    const cleaned: Record<string, unknown> = {
      pageNum: params.pageNum,
      pageSize: params.pageSize,
    };
    if (params.username != null && String(params.username).trim() !== '') {
      cleaned.username = params.username.trim();
    }
    if (
      params.status !== undefined &&
      params.status !== null &&
      (params.status === 0 || params.status === 1 || params.status === 2)
    ) {
      cleaned.status = params.status;
    }
    if (params.roleId != null && Number(params.roleId) > 0) {
      cleaned.roleId = Number(params.roleId);
    }
    return request<any, PageResult<AdminUserListItem>>({
      url: `${ADMIN_USER_BASE_URL}/list`,
      method: 'get',
      params: cleaned,
    });
  },

  /**
   * 管理员用户详情（GET /api/v1/admin/user/{id}）
   */
  getAdminDetail(id: number | string) {
    return request<any, AdminUserListItem>({
      url: `${ADMIN_USER_BASE_URL}/${id}`,
      method: 'get',
    });
  },

  /**
   * 创建管理员用户（POST /api/v1/admin/user）
   */
  createAdmin(data: AdminUserSaveRequest) {
    return request({
      url: ADMIN_USER_BASE_URL,
      method: 'post',
      data,
    });
  },

  /**
   * 更新管理员用户（PUT /api/v1/admin/user/{id}）
   */
  updateAdmin(id: number | string, data: AdminUserSaveRequest) {
    return request({
      url: `${ADMIN_USER_BASE_URL}/${id}`,
      method: 'put',
      data,
    });
  },

  /**
   * 删除管理员用户（DELETE /api/v1/admin/user/{id}）软删除
   */
  deleteAdmin(id: number | string) {
    return request({
      url: `${ADMIN_USER_BASE_URL}/${id}`,
      method: 'delete',
    });
  },

  /**
   * 彻底删除管理员用户（DELETE /api/v1/admin/user/{id}/permanent）物理删除，不可恢复
   */
  removePermanently(id: number | string) {
    return request({
      url: `${ADMIN_USER_BASE_URL}/${id}/permanent`,
      method: 'delete',
    });
  },

  /**
   * 为管理员用户分配角色（PUT /api/v1/admin/user/{uid}/roles）
   */
  assignRoles(uid: number, data: AdminUserAssignRolesRequest) {
    return request({
      url: `${ADMIN_USER_BASE_URL}/${uid}/roles`,
      method: 'put',
      data,
    });
  },

  /**
   * 更新管理员用户状态（PATCH /api/v1/admin/user/{uid}/status）
   */
  updateAdminStatus(uid: number, status: number) {
    return request({
      url: `${ADMIN_USER_BASE_URL}/${uid}/status`,
      method: 'patch',
      params: { status },
    });
  },
};

export default UserAPI;
