import { ref, reactive } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { dayjs } from "element-plus";
import type { FormInstance } from "element-plus";
import UserAPI from "@/api/system/user";
import type { AdminUserListItem, AdminUserQueryParams } from "@/types/api";

/**
 * 管理员用户列表 Composable
 * 负责列表查询、分页、多选、删除、启用/禁用等逻辑
 */
export function useAdminUserList() {
  const queryParams = reactive<AdminUserQueryParams>({
    pageNum: 1,
    pageSize: 10,
    username: "",
    status: undefined,
    roleId: undefined,
  });

  const pageData = ref<AdminUserListItem[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const selectIds = ref<(number | string)[]>([]);

  function normalizeUserItem(row: AdminUserListItem & { createdAt?: string }): AdminUserListItem {
    return {
      ...row,
      createTime:
        row.createTime ??
        (row.createdAt ? dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss") : undefined),
    };
  }

  function formatRoleNames(row: AdminUserListItem): string {
    if (row.roleNames) return row.roleNames;
    if (Array.isArray(row.roleIds) && row.roleIds.length > 0) {
      return row.roleIds.join(", ");
    }
    return "-";
  }

  function formatCreateTime(row: AdminUserListItem & { createdAt?: string }): string {
    const t = row.createTime ?? row.createdAt;
    if (!t) return "-";
    return dayjs(t).format("YYYY-MM-DD HH:mm:ss");
  }

  function buildListParams(): AdminUserQueryParams {
    const { pageNum, pageSize, username, status, roleId } = queryParams;
    const params: AdminUserQueryParams = { pageNum, pageSize };
    if (username != null && String(username).trim() !== "") {
      params.username = username.trim();
    }
    if (status !== undefined && status !== null && (status === 0 || status === 1 || status === 2)) {
      params.status = status;
    }
    if (roleId != null && Number(roleId) > 0) {
      params.roleId = Number(roleId);
    }
    return params;
  }

  async function fetchData(): Promise<void> {
    loading.value = true;
    try {
      const res = await UserAPI.getAdminList(buildListParams());
      const list = res?.list ?? [];
      pageData.value = list.map((item) =>
        normalizeUserItem(item as AdminUserListItem & { createdAt?: string })
      );
      total.value = res?.total ?? 0;
    } catch {
      pageData.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function handleQuery(): void {
    queryParams.pageNum = 1;
    fetchData();
  }

  function handleResetQuery(queryFormRef?: FormInstance | null): void {
    queryFormRef?.resetFields();
    queryParams.pageNum = 1;
    fetchData();
  }

  function handleSelectionChange(rows: AdminUserListItem[]): void {
    selectIds.value = rows.map((r) => r.id).filter((v): v is number | string => v != null);
  }

  function handleDelete(id: number | string): void {
    ElMessageBox.confirm("确认删除该用户吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }).then(async () => {
      try {
        await UserAPI.deleteAdmin(id);
        ElMessage.success("删除成功");
        fetchData();
      } catch {
        // 错误已由 request 拦截器统一提示
      }
    });
  }

  function handleRemovePermanently(id: number | string): void {
    ElMessageBox.confirm("彻底删除后不可恢复，确认吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }).then(async () => {
      try {
        await UserAPI.removePermanently(id);
        ElMessage.success("彻底删除成功");
        fetchData();
      } catch {
        // 错误已由 request 拦截器统一提示
      }
    });
  }

  function handleBatchDelete(): void {
    if (selectIds.value.length === 0) {
      ElMessage.warning("请选择要删除的项");
      return;
    }
    ElMessageBox.confirm("确认删除所选用户吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }).then(async () => {
      try {
        for (const id of selectIds.value) {
          await UserAPI.deleteAdmin(id);
        }
        ElMessage.success("删除成功");
        fetchData();
      } catch {
        // 错误已由 request 拦截器统一提示
      }
    });
  }

  async function handleToggleStatus(row: AdminUserListItem): Promise<void> {
    const uid = row.uid ?? row.id;
    if (uid == null) return;
    const newStatus = row.status === 1 ? 0 : 1;
    try {
      await UserAPI.updateAdminStatus(Number(uid), newStatus);
      ElMessage.success(newStatus === 1 ? "已启用" : "已禁用");
      fetchData();
    } catch {
      // 错误已由 request 拦截器统一提示
    }
  }

  return {
    queryParams,
    pageData,
    total,
    loading,
    selectIds,
    fetchData,
    handleQuery,
    handleResetQuery,
    handleSelectionChange,
    handleDelete,
    handleRemovePermanently,
    handleBatchDelete,
    handleToggleStatus,
    formatRoleNames,
    formatCreateTime,
  };
}
