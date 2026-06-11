import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import UserAPI from '@/api/system/user';
import type { AdminUserSaveRequest } from '@/types/api';

/**
 * 管理员用户表单弹窗 Composable
 * 负责新增/编辑用户的弹窗状态、表单数据与提交逻辑
 * @param onSuccess - 提交成功后的回调（如刷新列表）
 */
export function useAdminUserFormDialog(onSuccess?: () => void) {
  const formRef = ref<FormInstance>();

  const dialogState = reactive({
    title: '',
    visible: false,
  });

  const formData = reactive<AdminUserSaveRequest & { password?: string }>({
    username: '',
    password: '',
    realName: '',
    mobile: '',
    email: '',
    status: 1,
    remark: '',
  });

  const formRules: FormRules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  };

  async function openDialog(id?: number | string): Promise<void> {
    dialogState.visible = true;
    dialogState.title = id ? '编辑用户' : '新增用户';
    if (id) {
      try {
        const detail = await UserAPI.getAdminDetail(id);
        Object.assign(formData, {
          id: detail.id,
          username: detail.username,
          password: '',
          realName: detail.realName,
          mobile: detail.mobile,
          email: detail.email,
          status: detail.status ?? 1,
          remark: detail.remark ?? '',
        });
      } catch {
        Object.assign(formData, {
          id,
          username: '',
          password: '',
          realName: '',
          mobile: '',
          email: '',
          status: 1,
          remark: '',
        });
      }
    } else {
      Object.assign(formData, {
        id: undefined,
        username: '',
        password: '',
        realName: '',
        mobile: '',
        email: '',
        status: 1,
        remark: '',
      });
    }
  }

  function closeDialog(): void {
    dialogState.visible = false;
    formRef.value?.resetFields();
  }

  function handleSubmit(): void {
    formRef.value?.validate(async (valid) => {
      if (!valid) return;
      const isEdit = !!formData.id;
      const payload: AdminUserSaveRequest = {
        username: formData.username,
        realName: formData.realName,
        mobile: formData.mobile,
        email: formData.email,
        status: formData.status,
        remark: formData.remark,
      };
      if (isEdit) {
        payload.id = formData.id as number;
        if (formData.password) payload.password = formData.password;
      } else {
        if (!formData.password) {
          ElMessage.warning('请输入密码');
          return;
        }
        payload.password = formData.password;
      }
      try {
        if (isEdit) {
          await UserAPI.updateAdmin(formData.id!, payload);
          ElMessage.success('修改成功');
        } else {
          await UserAPI.createAdmin(payload);
          ElMessage.success('新增成功');
        }
        closeDialog();
        onSuccess?.();
      } catch {
        // 错误已由 request 拦截器统一提示
      }
    });
  }

  return {
    formRef,
    dialogState,
    formData,
    formRules,
    openDialog,
    closeDialog,
    handleSubmit,
  };
}
