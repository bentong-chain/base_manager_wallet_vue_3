import request from '@/utils/request';
import type { PageResult } from '@/types/api';
import type { OperationLogItem, OperationLogQueryParams } from '@/types/api/operation-log';

const OPERATION_LOG_BASE_URL = '/api/v1/admin/operation-log';

const OperationLogAPI = {
  /**
   * 获取操作日志分页数据
   * 仅传有值参数，分页为整数，与 api.json 参数一致避免后端参数校验失败
   */
  getAdminOperationLogList(queryParams?: OperationLogQueryParams) {
    const pageNum = Math.max(1, parseInt(String(queryParams?.pageNum ?? 1), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(queryParams?.pageSize ?? 10), 10) || 10);

    const cleaned: Record<string, string | number> = {
      pageNum,
      pageSize,
    };

    const operatorUidRaw =
      queryParams?.operatorUid !== undefined && queryParams?.operatorUid !== null
        ? parseInt(String(queryParams.operatorUid), 10)
        : NaN;
    if (!Number.isNaN(operatorUidRaw) && operatorUidRaw > 0) {
      cleaned.operatorUid = operatorUidRaw;
    }

    const operationType =
      queryParams?.operationType != null && String(queryParams.operationType).trim() !== ''
        ? String(queryParams.operationType).trim()
        : undefined;
    if (operationType !== undefined) {
      cleaned.operationType = operationType;
    }

    const startTime =
      queryParams?.startTime != null && String(queryParams.startTime).trim() !== ''
        ? String(queryParams.startTime).trim()
        : undefined;
    if (startTime !== undefined) {
      cleaned.startTime = startTime;
    }

    const endTime =
      queryParams?.endTime != null && String(queryParams.endTime).trim() !== ''
        ? String(queryParams.endTime).trim()
        : undefined;
    if (endTime !== undefined) {
      cleaned.endTime = endTime;
    }

    return request<any, PageResult<OperationLogItem>>({
      url: `${OPERATION_LOG_BASE_URL}/list`,
      method: 'get',
      params: cleaned,
    });
  },
};

export default OperationLogAPI;
