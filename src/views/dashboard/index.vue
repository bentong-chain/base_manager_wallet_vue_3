<template>
  <div class="relative p-6">
    <el-card shadow="never" class="mt-2">
      <div class="flex flex-wrap">
        <div class="flex-1 flex items-start">
          <div style="width: 80px; height: 80px; overflow: hidden; border-radius: 50%">
            <img
              :src="avatarUrl"
              class="w80px h80px rounded-full"
              style="width: 100%; height: 100%; object-fit: cover; object-position: center"
            />
          </div>
          <div class="ml-5">
            <p class="text-base font-semibold text-[--el-text-color-primary] leading-tight">
              {{ userStore.userInfo?.username ?? "用户" }}
            </p>
            <p class="text-sm text-gray">{{ greetings }} {{ currentTimeStr }}</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 数据统计 -->
    <el-row :gutter="10" class="mt-5">
      <!-- 在线用户数量 -->
      <el-col :span="8" :xs="24" class="mb-xs-3">
        <el-card
          shadow="never"
          class="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <template #header>
            <div class="flex-x-between">
              <span class="text-xs font-medium text-[--el-text-color-secondary]">在线用户</span>
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs leading-5 rounded-full border select-none"
                  :class="wsStatusClass"
                >
                  <el-icon class="text-sm">
                    <Loading
                      v-if="
                        !isConnected &&
                        (connectionState === 'CONNECTING' || connectionState === 'RECONNECTING')
                      "
                    />
                    <CircleCheck v-else-if="isConnected" />
                    <CircleClose v-else />
                  </el-icon>
                  <span class="text-[--el-text-color-secondary]">WebSocket</span>
                  <span class="font-medium">{{ wsStatusText }}</span>
                </span>
              </div>
            </div>
          </template>

          <div class="mt-2 flex-1 flex items-end">
            <div class="flex items-baseline gap-1.5">
              <span class="text-xl font-semibold tracking-wide">{{ onlineUserCount }}</span>
              <span class="text-xs text-[--el-text-color-secondary]">人</span>
            </div>
          </div>

          <div v-if="wsStats" class="mt-2 flex gap-4 text-xs text-[--el-text-color-secondary]">
            <span>今日登录 {{ wsStats?.todayLoggedIn ?? 0 }} 人</span>
            <span>今日活跃 {{ wsStats?.todayActive ?? 0 }} 人</span>
          </div>

          <div class="mt-2 flex justify-between items-center">
            <span class="text-sm text-gray">更新时间</span>
            <span class="text-sm">{{ formattedTime }}</span>
          </div>
        </el-card>
      </el-col>

      <!-- 访客量UV) -->
      <el-col :span="8" :xs="24" class="mb-xs-3">
        <el-skeleton :loading="visitStatsLoading" :rows="5" animated>
          <template #template>
            <el-card>
              <template #header>
                <div>
                  <el-skeleton-item variant="h3" style="width: 40%" />
                  <el-skeleton-item variant="rect" style="float: right; width: 1em; height: 1em" />
                </div>
              </template>

              <div class="flex-x-between">
                <el-skeleton-item variant="text" style="width: 30%" />
                <el-skeleton-item variant="circle" style="width: 2em; height: 2em" />
              </div>
              <div class="mt-5 flex-x-between">
                <el-skeleton-item variant="text" style="width: 50%" />
                <el-skeleton-item variant="text" style="width: 1em" />
              </div>
            </el-card>
          </template>
          <template v-if="!visitStatsLoading">
            <el-card
              shadow="never"
              class="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <template #header>
                <div class="flex-x-between">
                  <span class="text-xs font-medium text-[--el-text-color-secondary]">
                    访客数 UV
                  </span>
                  <el-tag type="success" size="small">日</el-tag>
                </div>
              </template>

              <div class="mt-2 flex-1 flex items-end">
                <div class="flex items-baseline gap-1.5">
                  <span class="text-xl font-semibold tracking-wide">
                    {{ displayTransitionUvCount }}
                  </span>
                  <span
                    v-if="uvGrowthText !== null"
                    :class="['text-xs', computeGrowthRateClass(visitStatsData.uvGrowthRate)]"
                  >
                    <el-icon
                      v-if="
                        visitStatsData.uvGrowthRate !== undefined &&
                        visitStatsData.uvGrowthRate !== null
                      "
                    >
                      <Top v-if="visitStatsData.uvGrowthRate > 0" />
                      <Bottom v-else-if="visitStatsData.uvGrowthRate < 0" />
                    </el-icon>
                    {{ uvGrowthText }}
                  </span>
                </div>
              </div>

              <div class="mt-2 flex justify-between items-center">
                <span class="text-sm text-gray">总访客数</span>
                <span class="text-sm">{{ displayTransitionTotalUvCount }}</span>
              </div>
            </el-card>
          </template>
        </el-skeleton>
      </el-col>

      <!-- 浏览量(PV) -->
      <el-col :span="8" :xs="24">
        <el-skeleton :loading="visitStatsLoading" :rows="5" animated>
          <template #template>
            <el-card>
              <template #header>
                <div>
                  <el-skeleton-item variant="h3" style="width: 40%" />
                  <el-skeleton-item variant="rect" style="float: right; width: 1em; height: 1em" />
                </div>
              </template>

              <div class="flex-x-between">
                <el-skeleton-item variant="text" style="width: 30%" />
                <el-skeleton-item variant="circle" style="width: 2em; height: 2em" />
              </div>
              <div class="mt-5 flex-x-between">
                <el-skeleton-item variant="text" style="width: 50%" />
                <el-skeleton-item variant="text" style="width: 1em" />
              </div>
            </el-card>
          </template>
          <template v-if="!visitStatsLoading">
            <el-card
              shadow="never"
              class="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <template #header>
                <div class="flex-x-between">
                  <span class="text-xs font-medium text-[--el-text-color-secondary]">
                    浏览量 PV
                  </span>
                  <el-tag type="primary" size="small">日</el-tag>
                </div>
              </template>

              <div class="mt-2 flex-1 flex items-end">
                <div class="flex items-baseline gap-1.5">
                  <span class="text-xl font-semibold tracking-wide">
                    {{ displayTransitionPvCount }}
                  </span>
                  <span
                    v-if="pvGrowthText !== null"
                    :class="['text-xs', computeGrowthRateClass(visitStatsData.pvGrowthRate)]"
                  >
                    <el-icon
                      v-if="
                        visitStatsData.pvGrowthRate !== undefined &&
                        visitStatsData.pvGrowthRate !== null
                      "
                    >
                      <Top v-if="visitStatsData.pvGrowthRate > 0" />
                      <Bottom v-else-if="visitStatsData.pvGrowthRate < 0" />
                    </el-icon>
                    {{ pvGrowthText }}
                  </span>
                </div>
              </div>

              <div class="mt-2 flex justify-between items-center">
                <span class="text-sm text-gray">总浏览量</span>
                <span class="text-sm">{{ displayTransitionTotalPvCount }}</span>
              </div>
            </el-card>
          </template>
        </el-skeleton>
      </el-col>
    </el-row>

    <el-row :gutter="10" class="mt-5">
      <!-- 访问趋势统计图-->
      <el-col :xs="24" :span="16">
        <el-card>
          <template #header>
            <div class="flex-x-between">
              <span>访问趋势</span>
              <el-radio-group v-model="visitTrendDateRange" size="small">
                <el-radio-button :label="7">近7天</el-radio-button>
                <el-radio-button :label="30">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <el-skeleton :loading="visitTrendLoading" :rows="8" animated>
            <template #template>
              <div class="h-[400px] flex items-center justify-center">
                <el-icon class="is-loading" :size="32">
                  <Loading />
                </el-icon>
              </div>
            </template>
            <template v-if="!visitTrendLoading">
              <div
                v-if="visitTrendError"
                class="h-[400px] flex flex-col items-center justify-center text-[--el-text-color-secondary]"
              >
                <el-icon :size="48" class="mb-2"><CircleClose /></el-icon>
                <p class="text-sm">{{ visitTrendError }}</p>
                <el-button
                  type="primary"
                  link
                  size="small"
                  class="mt-2"
                  @click="fetchVisitTrendData"
                >
                  重试
                </el-button>
              </div>
              <ECharts v-else :options="visitTrendChartOptions" height="400px" />
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
      <!-- 最近访问 -->
      <el-col :xs="24" :span="8">
        <el-card>
          <template #header>
            <div class="flex-x-between">
              <span class="font-semibold">最近访问</span>
              <el-button
                v-if="recentMenus.length > 0"
                type="primary"
                link
                size="small"
                @click="clearRecentMenus"
              >
                清空
              </el-button>
            </div>
          </template>

          <div class="min-h-[400px] flex flex-col">
            <!-- 宫格显示 -->
            <div v-if="recentMenus.length > 0" class="grid grid-cols-2 gap-3">
              <div
                v-for="item in recentMenus"
                :key="item.path"
                class="group flex items-center gap-2 px-3 py-2.5 bg-[--el-fill-color-lighter] rounded-lg cursor-pointer transition-all duration-200 hover:bg-[--el-color-primary-light-8]"
                @click="router.push(item.path)"
              >
                <!-- 图标 -->
                <div class="shrink-0 w-8 h-8 flex items-center justify-center">
                  <el-icon
                    v-if="item.icon?.startsWith('el-icon-')"
                    class="text-lg text-[--el-color-primary]"
                  >
                    <component :is="item.icon.replace('el-icon-', '')" />
                  </el-icon>
                  <div
                    v-else-if="item.icon"
                    :class="`i-svg:${item.icon} text-lg text-[--el-color-primary]`"
                  />
                  <el-icon v-else class="text-lg text-[--el-color-primary]"><Menu /></el-icon>
                </div>
                <!-- 标题 -->
                <span class="text-sm truncate flex-1 leading-tight">
                  {{ item.title }}
                </span>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="flex flex-col items-center justify-center flex-1 py-16">
              <el-icon :size="48" class="text-[--el-text-color-placeholder] mb-4">
                <Clock />
              </el-icon>
              <p class="text-sm text-[--el-text-color-secondary] mb-2">暂无访问记录</p>
              <p class="text-xs text-[--el-text-color-placeholder]">访问的页面会自动记录在这里</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "Dashboard",
  inheritAttrs: false,
});

import { dayjs } from "element-plus";
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import type { EChartsOption } from "echarts";
import StatisticsAPI from "@/api/system/statistics";
import type { VisitStatsDetail, VisitTrendDetail } from "@/types/api";
import { useUserStore } from "@/store/modules/user";
import { formatGrowthRate } from "@/utils";
import { useTransition } from "@vueuse/core";
import { CircleCheck, CircleClose, Loading, Clock, Menu } from "@element-plus/icons-vue";
import { useOnlineCount } from "@/composables/websocket";
import { useRecentMenus } from "@/composables";

const router = useRouter();

// 在线用户与访客统计（WebSocket 实时）
const {
  onlineUserCount,
  lastUpdateTime,
  isConnected,
  connectionState,
  stats: wsStats,
} = useOnlineCount();

// 最近访问菜单
const { recentMenus, clearRecentMenus } = useRecentMenus();

// 格式化时间戳（lastUpdateTime 为毫秒时间戳，可能为 null）
const formattedTime = computed(() => {
  const t = lastUpdateTime.value;
  if (t == null) return "--";
  return dayjs(t).format("HH:mm:ss");
});

const wsStatusText = computed(() => {
  if (!isConnected.value) {
    return connectionState.value === "CONNECTING" || connectionState.value === "RECONNECTING"
      ? "连接中"
      : "未连接";
  }
  return "已连接";
});

const wsStatusClass = computed(() => {
  if (isConnected.value)
    return "text-[--el-color-success] bg-[--el-color-success-light-9] border-[--el-color-success-light-7]";
  return connectionState.value === "CONNECTING" || connectionState.value === "RECONNECTING"
    ? "text-[--el-color-warning] bg-[--el-color-warning-light-9] border-[--el-color-warning-light-7]"
    : "text-[--el-color-danger] bg-[--el-color-danger-light-9] border-[--el-color-danger-light-7]";
});

const userStore = useUserStore();

// 默认头像（当 avatar 为空时使用）：灰色圆形 + 人形图标
const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='40' fill='%23e5e7eb'/%3E%3Ccircle cx='40' cy='32' r='12' fill='%239ca3af'/%3E%3Cellipse cx='40' cy='68' rx='18' ry='14' fill='%239ca3af'/%3E%3C/svg%3E";

const avatarUrl = computed(() => {
  const avatar = userStore.userInfo?.avatar?.trim();
  if (avatar) {
    return avatar.includes("?") ? avatar : `${avatar}?imageView2/1/w/80/h/80`;
  }
  return DEFAULT_AVATAR;
});

// 当前时间（用于计算问候语）
const currentDate = new Date();

// 问候语：根据当前小时返回不同问候语（不包含用户名）
const greetings = computed(() => {
  const hours = currentDate.getHours();
  if (hours >= 6 && hours < 8) {
    return "晨起披衣出草堂，轩窗已自喜微凉🌅！";
  } else if (hours >= 8 && hours < 12) {
    return "上午好！";
  } else if (hours >= 12 && hours < 18) {
    return "下午好！";
  } else if (hours >= 18 && hours < 24) {
    return "晚上好！";
  } else {
    return "偷偷向银河要了一把碎星，只等你闭上眼睛撒入你的梦中，晚安🌛！";
  }
});

// 当前时间显示（yyyy-MM-dd HH:mm:ss），每秒更新
const currentTimeStr = ref(dayjs().format("YYYY-MM-DD HH:mm:ss"));
let currentTimeTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  currentTimeTimer = setInterval(() => {
    currentTimeStr.value = dayjs().format("YYYY-MM-DD HH:mm:ss");
  }, 1000);
});
onUnmounted(() => {
  if (currentTimeTimer) clearInterval(currentTimeTimer);
});

// 访客统计数据加载状态（WebSocket 有数据或 HTTP 拉取完成后置为 false）
const visitStatsLoading = ref(true);
// 访客统计数据：优先来自 WebSocket stats，未连接时由 HTTP 接口兜底
const visitStatsData = ref<VisitStatsDetail>({
  todayUvCount: 0,
  uvGrowthRate: 0,
  totalUvCount: 0,
  todayPvCount: 0,
  pvGrowthRate: 0,
  totalPvCount: 0,
});

// 将 WebSocket 统计数据同步到 visitStatsData（后端环比为整数百分比，formatGrowthRate 需要小数）
watch(
  wsStats,
  (s) => {
    if (!s) return;
    visitStatsData.value = {
      todayUvCount: s.todayUv ?? 0,
      uvGrowthRate: ((s.todayUvGrowthRate ?? 0) as number) / 100,
      totalUvCount: s.totalUv ?? 0,
      todayPvCount: s.todayPv ?? 0,
      pvGrowthRate: ((s.todayPvGrowthRate ?? 0) as number) / 100,
      totalPvCount: s.totalPv ?? 0,
    };
    visitStatsLoading.value = false;
  },
  { immediate: true }
);

const uvGrowthText = computed(() => {
  if (
    visitStatsData.value.uvGrowthRate === undefined ||
    visitStatsData.value.uvGrowthRate === null
  ) {
    return "--";
  }
  return formatGrowthRate(visitStatsData.value.uvGrowthRate);
});

const pvGrowthText = computed(() => {
  if (
    visitStatsData.value.pvGrowthRate === undefined ||
    visitStatsData.value.pvGrowthRate === null
  ) {
    return "--";
  }
  return formatGrowthRate(visitStatsData.value.pvGrowthRate);
});

// 数字过渡动画
const transitionUvCount = useTransition(
  computed(() => visitStatsData.value.todayUvCount),
  {
    duration: 1000,
    transition: [0.25, 0.1, 0.25, 1.0], // CSS cubic-bezier
  }
);

const transitionTotalUvCount = useTransition(
  computed(() => visitStatsData.value.totalUvCount),
  {
    duration: 1200,
    transition: [0.25, 0.1, 0.25, 1.0],
  }
);

const transitionPvCount = useTransition(
  computed(() => visitStatsData.value.todayPvCount),
  {
    duration: 1000,
    transition: [0.25, 0.1, 0.25, 1.0],
  }
);

const transitionTotalPvCount = useTransition(
  computed(() => visitStatsData.value.totalPvCount),
  {
    duration: 1200,
    transition: [0.25, 0.1, 0.25, 1.0],
  }
);

// 过渡结果可能是 Ref<number>，为模板中使用做类型和格式处理（避免 TS 报错）
const displayTransitionUvCount = computed(() =>
  Math.round(Number((transitionUvCount as any)?.value ?? transitionUvCount))
);
const displayTransitionTotalUvCount = computed(() =>
  Math.round(Number((transitionTotalUvCount as any)?.value ?? transitionTotalUvCount))
);
const displayTransitionPvCount = computed(() =>
  Math.round(Number((transitionPvCount as any)?.value ?? transitionPvCount))
);
const displayTransitionTotalPvCount = computed(() =>
  Math.round(Number((transitionTotalPvCount as any)?.value ?? transitionTotalPvCount))
);

// 访问趋势日期范围（单位：天，7 或 30）
const visitTrendDateRange = ref(7);
// 访问趋势图表配置（ECharts option 对象）
const visitTrendChartOptions = ref<EChartsOption>({});
// 访问趋势加载状态与错误信息
const visitTrendLoading = ref(true);
const visitTrendError = ref<string | null>(null);

/**
 * 获取访客统计数据（调用 /api/v1/statistics/online-stats，与 WebSocket 推送结构一致）
 */
const fetchVisitStatsData = () => {
  StatisticsAPI.getOnlineStats()
    .then((data) => {
      visitStatsData.value = {
        todayUvCount: data.todayUv ?? 0,
        uvGrowthRate: ((data.todayUvGrowthRate ?? 0) as number) / 100,
        totalUvCount: data.totalUv ?? 0,
        todayPvCount: data.todayPv ?? 0,
        pvGrowthRate: ((data.todayPvGrowthRate ?? 0) as number) / 100,
        totalPvCount: data.totalPv ?? 0,
      };
    })
    .finally(() => {
      visitStatsLoading.value = false;
    });
};

/**
 * 获取访问趋势数据，并更新图表配置
 */
const fetchVisitTrendData = () => {
  visitTrendError.value = null;
  visitTrendLoading.value = true;

  const startDate = dayjs()
    .subtract(visitTrendDateRange.value - 1, "day")
    .toDate();
  const endDate = new Date();

  StatisticsAPI.getVisitTrend({
    startDate: dayjs(startDate).format("YYYY-MM-DD"),
    endDate: dayjs(endDate).format("YYYY-MM-DD"),
  })
    .then((data) => {
      updateVisitTrendChartOptions(data);
    })
    .catch(() => {
      visitTrendError.value = "加载访问趋势失败，请稍后重试";
    })
    .finally(() => {
      visitTrendLoading.value = false;
    });
};

/**
 * 更新访问趋势图表的配置项
 *
 * @param data - 访问趋势数据
 */
const updateVisitTrendChartOptions = (data: VisitTrendDetail) => {
  const dates = data?.dates ?? [];
  const pvList = data?.pvList ?? [];
  const uvList = data?.ipList ?? data?.uvList ?? [];

  visitTrendChartOptions.value = {
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: ["浏览量(PV)", "访客量(UV)"],
      bottom: 0,
    },
    grid: {
      left: "1%",
      right: "5%",
      bottom: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dates,
    },
    yAxis: {
      type: "value",
      splitLine: {
        show: true,
        lineStyle: {
          type: "dashed",
        },
      },
    },
    series: [
      {
        name: "浏览量(PV)",
        type: "line",
        data: pvList,
        areaStyle: {
          color: "rgba(64, 158, 255, 0.1)",
        },
        smooth: true,
        itemStyle: {
          color: "#4080FF",
        },
        lineStyle: {
          color: "#4080FF",
        },
      },
      {
        name: "访客量(UV)",
        type: "line",
        data: uvList,
        areaStyle: {
          color: "rgba(103, 194, 58, 0.1)",
        },
        smooth: true,
        itemStyle: {
          color: "#67C23A",
        },
        lineStyle: {
          color: "#67C23A",
        },
      },
    ],
  };
};

/**
 * 根据增长率计算对应的 CSS 类名
 *
 * @param growthRate - 增长率数值
 */
const computeGrowthRateClass = (growthRate?: number): string => {
  if (!growthRate) {
    return "text-[--el-color-info]";
  }
  if (growthRate > 0) {
    return "text-[--el-color-danger]";
  } else if (growthRate < 0) {
    return "text-[--el-color-success]";
  } else {
    return "text-[--el-color-info]";
  }
};

// 监听访问趋势日期范围的变化，重新获取趋势数据
watch(
  () => visitTrendDateRange.value,
  () => {
    fetchVisitTrendData();
  },
  { immediate: true }
);

// 组件挂载后：WebSocket 有数据时会通过 watch 同步；未连接时用 HTTP 兜底
onMounted(() => {
  if (!isConnected.value) {
    fetchVisitStatsData();
  }
});
</script>

<style lang="scss" scoped>
// 暂无自定义样式
</style>
