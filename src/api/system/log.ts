import { getAdminOperationLogList } from "@/api/system/operation-log";
import type { PageResult } from "@/types/api";
import type { OperationLogItem, OperationLogQueryParams } from "@/types/api";

/** 与 api.json 一致：操作日志列表使用 admin/operation-log/list */
const LogAPI = {
  /** 获取操作日志分页列表（GET /api/v1/admin/operation-log/list） */
  getPage(params: OperationLogQueryParams) {
    return getAdminOperationLogList(params) as Promise<PageResult<OperationLogItem>>;
  },
};

export default LogAPI;
