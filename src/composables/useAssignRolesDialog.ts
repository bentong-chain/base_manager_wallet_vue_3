import { ref, reactive } from "vue";
import { ElMessage } from "element-plus";
import UserAPI from "@/api/system/user";
import Role from "@/api/system/role";
import type { AdminUserListItem, OptionItem } from "@/types/api";

/**
 * 分配角色弹窗 Composable
 * 负责分配角色弹窗状态、角色选项加载与提交逻辑（路径 /{uid}/roles 使用 uid）
 * @param onSuccess - 提交成功后的回调（如刷新列表）
 */
export function useAssignRolesDialog(onSuccess?: () => void) {
  const assignRolesDialog = reactive<{
    visible: boolean;
    userId: number | string | null;
    roleIds: number[];
  }>({
    visible: false,
    userId: null,
    roleIds: [],
  });

  const roleOptions = ref<OptionItem[]>([]);

  async function loadRoleOptions(): Promise<void> {
    if (roleOptions.value.length > 0) return;
    try {
      const res = await Role.getAdminRoleList({ pageNum: 1, pageSize: 500, status: 1 });
      roleOptions.value = (res?.list ?? []).map((item) => ({
        value: item.id ?? 0,
        label: item.roleName ?? String(item.id ?? ""),
      }));
    } catch {
      roleOptions.value = [];
    }
  }

  async function openAssignRolesDialog(row: AdminUserListItem): Promise<void> {
    assignRolesDialog.visible = true;
    assignRolesDialog.userId = row.uid ?? row.id;
    assignRolesDialog.roleIds = Array.isArray(row.roleIds) ? [...row.roleIds] : [];
    await loadRoleOptions();
  }

  function closeAssignRolesDialog(): void {
    assignRolesDialog.visible = false;
    assignRolesDialog.userId = null;
    assignRolesDialog.roleIds = [];
  }

  async function handleAssignRolesSubmit(): Promise<void> {
    const uid = assignRolesDialog.userId;
    if (uid == null) return;
    try {
      await UserAPI.assignRoles(Number(uid), {
        roleIds: assignRolesDialog.roleIds,
      });
      ElMessage.success("分配成功");
      closeAssignRolesDialog();
      onSuccess?.();
    } catch {
      // 错误已由 request 拦截器统一提示
    }
  }

  return {
    assignRolesDialog,
    roleOptions,
    loadRoleOptions,
    openAssignRolesDialog,
    closeAssignRolesDialog,
    handleAssignRolesSubmit,
  };
}
