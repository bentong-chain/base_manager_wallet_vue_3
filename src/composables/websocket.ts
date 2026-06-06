/**
 * WebSocket 相关 composables
 * - 在线用户统计：/ws/online-users，实时推送在线人数与访客统计
 * - Stomp / DictSync：占位实现，供通知等模块引用
 */

import { ref, computed, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/modules/auth";

// ─────────────────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────────────────

/** 服务端推送的在线/访客统计数据（与后端 StatisticsData 一致） */
export interface StatisticsData {
  onlineCount: number;
  todayUv: number;
  todayPv: number;
  todayLoggedIn: number;
  todayActive: number;
  totalUv: number;
  totalPv: number;
  todayUvGrowthRate: number;
  todayPvGrowthRate: number;
  timestamp: number;
}

/** WebSocket 消息：统计数据更新 */
export interface StatisticsUpdateMessage {
  type: "statistics_update";
  data: StatisticsData;
  timestamp: number;
}

/** WebSocket 消息：心跳确认 */
export interface HeartbeatAckMessage {
  type: "heartbeat_ack";
  timestamp: number;
}

export type IncomingWsMessage = StatisticsUpdateMessage | HeartbeatAckMessage;

/** 连接状态 */
export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING";

// ─────────────────────────────────────────────────────────────────────────────
// 在线用户 WebSocket 单例状态（跨组件共享）
// ─────────────────────────────────────────────────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30000;
const RECONNECT_INTERVAL_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const WS_PATH = "/ws/online-users";

let ws: WebSocket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let isManualClose = false;

const connectionState = ref<ConnectionState>("DISCONNECTED");
const lastUpdateTime = ref<number | null>(null);
const stats = ref<StatisticsData | null>(null);

/** 当前在线人数（从 stats 派生，便于兼容现有 dashboard） */
const onlineUserCount = computed(() => stats.value?.onlineCount ?? 0);

/** 是否已连接 */
const isConnected = computed(() => connectionState.value === "CONNECTED");

/**
 * 获取 WebSocket 基础 URL（与 request 使用的 API 同源或同 host）
 */
function getWsBaseUrl(): string {
  const apiUrl = (import.meta.env.VITE_APP_API_URL as string)?.trim();
  if (apiUrl) {
    try {
      const u = new URL(apiUrl);
      return `${u.protocol === "https:" ? "wss" : "ws"}://${u.host}`;
    } catch {
      // ignore
    }
  }
  const base = import.meta.env.VITE_APP_BASE_API as string;
  if (base) {
    try {
      const u = new URL(base, window.location.origin);
      return `${u.protocol === "https:" ? "wss" : "ws"}://${u.host}`;
    } catch {
      // ignore
    }
  }
  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
}

function buildWsUrl(token: string, device: string): string {
  const base = getWsBaseUrl();
  const path = base.endsWith("/") ? WS_PATH.slice(1) : WS_PATH;
  const url = `${base}${path}`;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}&device=${encodeURIComponent(device)}`;
}

function clearHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function clearReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function startHeartbeat(socket: WebSocket) {
  clearHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "heartbeat", timestamp: Date.now() }));
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function handleMessage(event: MessageEvent) {
  try {
    const msg = JSON.parse(event.data as string) as IncomingWsMessage;
    if (msg.type === "statistics_update") {
      stats.value = msg.data;
      lastUpdateTime.value = msg.data.timestamp ?? Date.now();
    }
  } catch {
    // 忽略解析错误
  }
}

function connect() {
  const authStore = useAuthStore();
  const token = authStore.accessToken;
  const device = authStore.deviceId;

  if (!token) {
    connectionState.value = "DISCONNECTED";
    return;
  }

  if (ws?.readyState === WebSocket.OPEN) {
    connectionState.value = "CONNECTED";
    return;
  }

  connectionState.value = reconnectAttempts > 0 ? "RECONNECTING" : "CONNECTING";
  const url = buildWsUrl(token, device);

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectAttempts = 0;
      connectionState.value = "CONNECTED";
      startHeartbeat(ws!);
      // 连接成功后请求一次最新统计
      ws!.send(JSON.stringify({ type: "get_online_stats", timestamp: Date.now() }));
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event: CloseEvent) => {
      clearHeartbeat();
      ws = null;
      connectionState.value = "DISCONNECTED";

      if (!isManualClose && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(() => connect(), RECONNECT_INTERVAL_MS);
      }
    };

    ws.onerror = () => {
      // 具体错误在 onclose 中处理
    };
  } catch {
    connectionState.value = "DISCONNECTED";
    ws = null;
  }
}

/**
 * 关闭在线用户 WebSocket 连接（登出等时调用）
 */
function cleanupWebSocket() {
  isManualClose = true;
  clearReconnect();
  clearHeartbeat();
  if (ws) {
    ws.close(1000, "客户端主动关闭");
    ws = null;
  }
  connectionState.value = "DISCONNECTED";
  reconnectAttempts = 0;
}

/**
 * 初始化 WebSocket（可选，用于应用启动时提前建连）
 */
function setupWebSocket() {
  isManualClose = false;
  reconnectAttempts = 0;
  connect();
}

// ─────────────────────────────────────────────────────────────────────────────
// useOnlineCount：供 Dashboard 使用的在线人数与访客统计
// ─────────────────────────────────────────────────────────────────────────────

/** useOnlineCount 返回值类型 */
export interface UseOnlineCountReturn {
  onlineUserCount: typeof onlineUserCount;
  lastUpdateTime: typeof lastUpdateTime;
  isConnected: typeof isConnected;
  connectionState: typeof connectionState;
  stats: typeof stats;
}

/**
 * 在线人数与访客统计（WebSocket 实时数据）
 * 连接 /ws/online-users，接收 statistics_update，暴露在线人数、UV/PV 等
 */
export function useOnlineCount(): UseOnlineCountReturn {
  const authStore = useAuthStore();
  const { accessToken } = storeToRefs(authStore);

  // 登录后自动建连
  if (accessToken.value && connectionState.value === "DISCONNECTED" && !ws) {
    isManualClose = false;
    reconnectAttempts = 0;
    connect();
  }

  onUnmounted(() => {
    // 不在 composable 内关闭连接，由 cleanupWebSocket 统一在登出时关闭
  });

  return {
    onlineUserCount,
    lastUpdateTime,
    isConnected,
    connectionState,
    stats,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useStomp / useDictSync：占位实现（通知等模块依赖）
// ─────────────────────────────────────────────────────────────────────────────

/** Stomp 订阅（占位：当前在线统计走独立 WS，通知可后续接 Stomp） */
export function useStomp() {
  const isConnected = ref(false);

  function subscribe(_destination: string, _callback: (message: { body?: string }) => void) {
    // 占位：可后续对接 Stomp over WebSocket
  }

  function unsubscribe(_destination: string) {
    // 占位
  }

  return {
    subscribe,
    unsubscribe,
    isConnected,
  };
}

/** 字典同步（占位） */
export type DictMessage = Record<string, unknown>;
export type DictChangeMessage = Record<string, unknown>;
export type DictChangeCallback = (payload: DictChangeMessage) => void;

export function useDictSync() {
  function registerDictChange(_callback: DictChangeCallback) {
    // 占位
  }

  function unregisterDictChange(_callback: DictChangeCallback) {
    // 占位
  }

  return {
    registerDictChange,
    unregisterDictChange,
  };
}

export { cleanupWebSocket, setupWebSocket };
