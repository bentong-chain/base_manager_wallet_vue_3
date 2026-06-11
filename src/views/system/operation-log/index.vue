<template>
  <div class="app-container">
    <div class="filter-section">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-suffix=":">
        <el-form-item label="操作人" prop="operatorUid">
          <el-input
            v-model.number="queryParams.operatorUid"
            placeholder="操作人ID"
            clearable
            style="width: 120px"
            @keyup.enter="handleQuery()"
          />
        </el-form-item>
        <el-form-item label="操作类型" prop="operationType">
          <el-input
            v-model="queryParams.operationType"
            placeholder="操作类型"
            clearable
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item label="时间范围" prop="timeRange">
          <el-date-picker
            v-model="timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            :shortcuts="shortcuts"
            style="width: 360px"
          />
        </el-form-item>
        <el-form-item class="search-buttons">
          <el-button type="primary" icon="Search" @click="handleQuery()">搜索</el-button>
          <el-button icon="Refresh" @click="handleResetQuery()">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="hover" class="table-section">
      <el-table
        v-loading="loading"
        :data="pageData"
        highlight-current-row
        class="table-section__content"
      >
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column label="操作人" min-width="100">
          <template #default="scope">
            {{ scope.row.operatorName || scope.row.operatorUid || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作类型" prop="operationType" width="120" />
        <el-table-column label="请求路径" prop="requestUri" min-width="180" show-overflow-tooltip />
        <el-table-column label="请求方法" prop="method" width="90" />
        <el-table-column label="IP" prop="ip" width="120" />
        <el-table-column label="操作时间" prop="createTime" width="170" />
        <el-table-column align="center" fixed="right" label="操作" width="100">
          <template #default="scope">
            <el-button type="primary" size="small" link @click="openDetailDialog(scope.row)">
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        class="table-section__pagination"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailDialog.visible"
      title="操作日志详情"
      width="560px"
      destroy-on-close
      @close="detailDialog.visible = false"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="操作人">
          {{ currentLog?.operatorName || currentLog?.operatorUid || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="操作类型">
          {{ currentLog?.operationType || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="请求路径">
          {{ currentLog?.requestUri || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="请求方法">
          {{ currentLog?.method || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="IP">
          {{ currentLog?.ip || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="操作时间">
          {{ currentLog?.createTime || '-' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog?.content" label="内容">
          {{ currentLog?.content }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SystemOperationLog',
  inheritAttrs: false,
});

import type { FormInstance } from 'element-plus';
import type { OperationLogItem, OperationLogQueryParams } from '@/types/api/operation-log';
import OperationLogAPI from '@/api/system/operation-log';

const queryFormRef = ref<FormInstance>();

const queryParams = reactive<OperationLogQueryParams>({
  pageNum: 1,
  pageSize: 10,
});

const timeRange = ref<[string, string] | null>(null);

const shortcuts = [
  {
    text: '今天',
    value: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      return [start, end];
    },
  },
  {
    text: '最近一周',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
      return [start, end];
    },
  },
  {
    text: '最近一月',
    value: () => {
      const end = new Date();
      const start = new Date();
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
      return [start, end];
    },
  },
];

const pageData = ref<OperationLogItem[]>([]);
const total = ref(0);
const loading = ref(false);

const detailDialog = reactive({ visible: false });
const currentLog = ref<OperationLogItem | null>(null);

function handleQuery(): void {
  if (timeRange.value && timeRange.value.length === 2) {
    queryParams.startTime = timeRange.value[0];
    queryParams.endTime = timeRange.value[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
  queryParams.pageNum = 1;
  fetchData();
}

async function fetchData(): Promise<void> {
  loading.value = true;
  try {
    const res = await OperationLogAPI.getAdminOperationLogList(queryParams);
    pageData.value = res?.list ?? [];
    total.value = res?.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleResetQuery(): void {
  queryFormRef.value?.resetFields();
  timeRange.value = null;
  queryParams.pageNum = 1;
  queryParams.operatorUid = undefined;
  queryParams.operationType = undefined;
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  fetchData();
}

function openDetailDialog(row: OperationLogItem): void {
  currentLog.value = { ...row };
  detailDialog.visible = true;
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.table-section__pagination {
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
