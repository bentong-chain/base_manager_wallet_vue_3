import { http as request } from '@/utils/request';
import type { VisitTrendQueryParams, VisitTrendDetail, OnlineStatsDetail } from '@/types/api';

const STATISTICS_BASE_URL = '/api/v1/statistics';

const StatisticsAPI = {
  /** 获取访问趋势统计 */
  getVisitTrend(queryParams: VisitTrendQueryParams) {
    return request<any, VisitTrendDetail>({
      url: `${STATISTICS_BASE_URL}/visits/trend`,
      method: 'get',
      params: queryParams,
    });
  },
  /** 获取在线人数与访客统计（与 WebSocket 推送结构一致，替代原 visits/overview） */
  getOnlineStats() {
    return request<any, OnlineStatsDetail>({
      url: `${STATISTICS_BASE_URL}/online-stats`,
      method: 'get',
    });
  },
};

export default StatisticsAPI;
