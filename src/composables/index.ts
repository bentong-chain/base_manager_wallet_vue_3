// WebSocket 服务
export { setupWebSocket, cleanupWebSocket } from './websocket';
export { useStomp, useDictSync, useOnlineCount } from './websocket';
export type {
  DictMessage,
  DictChangeMessage,
  DictChangeCallback,
  StatisticsData,
  ConnectionState,
  UseOnlineCountReturn,
} from './websocket';

// 表格相关
export { useTableSelection } from './useTableSelection';

// 最近访问菜单
export { useRecentMenus } from './useRecentMenus';
export type { RecentMenuItem } from './useRecentMenus';

// 系统管理 - 管理员用户
export { useAdminUserList } from './useAdminUserList';
export { useAdminUserFormDialog } from './useAdminUserFormDialog';
export { useAssignRolesDialog } from './useAssignRolesDialog';
