import { http as request } from "@/utils/request";
import type { PageResult } from "@/types/api";
import type { OperationLogItem, OperationLogQueryParams } from "@/types/api/operation-log";

/** 与 docs/system/api.json 中操作日志列表路径一致，勿改为 v1/logs 等其它路径 */
const OPERATION_LOG_LIST_URL = "/api/v1/admin/operation-log/list";

/**
 * 操作日志列表（GET /api/v1/admin/operation-log/list）
 * 仅传有值参数，分页为整数，与 api.json 参数一致避免后端参数校验失败
 */
export function getAdminOperationLogList(params: OperationLogQueryParams) {
  const pageNum = Math.max(1, parseInt(String(params?.pageNum ?? 1), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(params?.pageSize ?? 10), 10) || 10);

  const cleaned: Record<string, string | number> = {
    pageNum,
    pageSize,
  };

  const operatorUidRaw =
    params?.operatorUid !== undefined && params?.operatorUid !== null
      ? parseInt(String(params.operatorUid), 10)
      : NaN;
  if (!Number.isNaN(operatorUidRaw) && operatorUidRaw > 0) {
    cleaned.operatorUid = operatorUidRaw;
  }

  const operationType =
    params?.operationType != null && String(params.operationType).trim() !== ""
      ? String(params.operationType).trim()
      : undefined;
  if (operationType !== undefined) {
    cleaned.operationType = operationType;
  }

  const startTime =
    params?.startTime != null && String(params.startTime).trim() !== ""
      ? String(params.startTime).trim()
      : undefined;
  if (startTime !== undefined) {
    cleaned.startTime = startTime;
  }

  const endTime =
    params?.endTime != null && String(params.endTime).trim() !== ""
      ? String(params.endTime).trim()
      : undefined;
  if (endTime !== undefined) {
    cleaned.endTime = endTime;
  }

  return request<any, PageResult<OperationLogItem>>({
    url: OPERATION_LOG_LIST_URL,
    method: "get",
    params: cleaned,
  });
}
