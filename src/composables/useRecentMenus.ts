import { ref, watch } from 'vue';
import { useUserStore } from '@/store/modules/user';

/**
 * 最近访问菜单项
 */
export interface RecentMenuItem {
  path: string;
  title: string;
  icon?: string;
  visitedAt: number;
}

const STORAGE_KEY_PREFIX = 'recent_menus';
const MAX_COUNT = 8;

// 全局状态（当前登录用户对应的列表）
const recentMenus = ref<RecentMenuItem[]>([]);

/** 当前内存中的列表所属用户 key，用于避免误用其他用户数据 */
let currentUserKey: string | null = null;

/**
 * 获取当前用户的存储 key（未登录返回空，不读写）
 */
function getStorageKey(userKey: string | undefined | null): string {
  if (userKey === undefined || userKey === null || String(userKey).trim() === '') return '';
  return `${STORAGE_KEY_PREFIX}_${userKey}`;
}

/**
 * 从 localStorage 加载指定用户的数据
 */
function loadFromStorage(userKey: string | undefined | null): RecentMenuItem[] {
  const key = getStorageKey(userKey);
  if (!key) return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 保存到 localStorage（按用户）
 */
function saveToStorage(menus: RecentMenuItem[], userKey: string | undefined | null) {
  const key = getStorageKey(userKey);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(menus));
}

/**
 * 获取当前用户唯一标识（id 优先，否则 username）
 */
function getCurrentUserKey(): string | undefined | null {
  const userStore = useUserStore();
  const info = userStore.userInfo as { id?: string; username?: string } | undefined;
  if (!info) return null;
  return info.id != null && info.id !== '' ? String(info.id) : (info.username ?? null);
}

/** 仅初始化一次：监听用户切换并同步最近访问列表 */
let syncWatchInitialized = false;
function ensureSyncWatch() {
  if (syncWatchInitialized) return;
  syncWatchInitialized = true;
  watch(
    () => getCurrentUserKey(),
    (newKey) => {
      currentUserKey = newKey ?? null;
      recentMenus.value = loadFromStorage(newKey);
    },
    { immediate: true }
  );
}

/**
 * 最近访问菜单 composable
 */
export function useRecentMenus() {
  ensureSyncWatch();

  // 每次被调用时（如 Dashboard 展示时）从 storage 再同步一次，避免因时序导致 ref 未更新
  const key = getCurrentUserKey();
  if (key) {
    const list = loadFromStorage(key);
    if (key === currentUserKey) {
      recentMenus.value = list;
    }
  }

  /**
   * 清空当前用户的记录
   */
  function clearRecentMenus() {
    const key = getCurrentUserKey();
    const storageKey = getStorageKey(key);
    if (storageKey) localStorage.removeItem(storageKey);
    if (key === currentUserKey) {
      recentMenus.value = [];
    }
  }

  /**
   * 格式化访问时间
   */
  function formatVisitTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

    const date = new Date(timestamp);
    return `${date.getMonth() + 1}-${date.getDate()}`;
  }

  return {
    recentMenus,
    clearRecentMenus,
    formatVisitTime,
  };
}

/**
 * 添加最近访问记录（全局方法，供路由守卫调用）
 * 按当前登录用户分别存储，切换用户后不会看到其他用户的记录。
 */
export function addRecentMenu(path: string, title: string, icon?: string) {
  if (!path || !title) return;

  const userKey = getCurrentUserKey();
  if (userKey === undefined || userKey === null) return;

  // 过滤掉不需要记录的路径
  const excludePaths = ['/dashboard', '/redirect', '/404', '/401', '/login', '/'];
  if (excludePaths.some((p) => path === p || path.startsWith(p + '/'))) return;

  // 始终从当前用户的存储读取并更新，避免与内存中“上一用户”的数据混用
  const list = loadFromStorage(userKey);
  const filtered = list.filter((item) => item.path !== path);
  const newItem: RecentMenuItem = {
    path,
    title,
    icon,
    visitedAt: Date.now(),
  };
  const next = [newItem, ...filtered].slice(0, MAX_COUNT);
  saveToStorage(next, userKey);

  // 仅当内存中当前就是该用户时更新 ref，避免覆盖“已切换用户”的列表
  if (userKey === currentUserKey) {
    recentMenus.value = next;
  }
}
