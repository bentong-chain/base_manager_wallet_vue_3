<template>
  <div class="app-container">
    <div class="filter-section">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true" label-width="auto">
        <el-form-item prop="operationType" label="操作类型">
          <el-input
            v-model="queryParams.operationType"
            placeholder="操作类型"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item prop="createTime" label="操作时间">
          <el-date-picker
            v-model="createTimeRange"
            :editable="false"
            type="daterange"
            range-separator="~"
            start-placeholder="开始时间"
            end-placeholder="截止时间"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>

        <el-form-item class="search-buttons">
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="handleResetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="hover" class="data-table">
      <el-table
        v-loading="loading"
        :data="pageData"
        highlight-current-row
        border
        class="data-table__content"
      >
        <el-table-column label="操作时间" prop="createdAt" width="180">
          <template #default="scope">
            {{
              scope.row.createdAt ? dayjs(scope.row.createdAt).format("YYYY-MM-DD HH:mm:ss") : "-"
            }}
          </template>
        </el-table-column>
        <el-table-column label="操作人" prop="operatorName" width="120" />
        <el-table-column label="操作人 UID" prop="operatorUid" width="120" />
        <el-table-column label="操作类型" prop="operationType" width="100" />
        <el-table-column label="请求路径" prop="requestUri" min-width="200" show-overflow-tooltip />
        <el-table-column label="请求方法" prop="requestMethod" width="100" />
        <el-table-column label="IP 地址" prop="ip" width="130" />
        <el-table-column label="状态码" prop="status" width="90" />
        <el-table-column
          v-if="hasErrorMsg"
          label="错误信息"
          prop="errorMsg"
          min-width="160"
          show-overflow-tooltip
        />
      </el-table>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "Log",
  inheritAttrs: false,
});

import { dayjs } from "element-plus";
import LogAPI from "@/api/system/log";
import type { OperationLogItem, OperationLogQueryParams } from "@/types/api/operation-log";
import type { FormInstance } from "element-plus";

const queryFormRef = ref<FormInstance>();

const queryParams = reactive<OperationLogQueryParams>({
  pageNum: 1,
  pageSize: 10,
  operationType: undefined,
  startTime: undefined,
  endTime: undefined,
});

const createTimeRange = ref<[string, string] | null>(null);

const pageData = ref<OperationLogItem[]>([]);
const total = ref(0);
const loading = ref(false);

const hasErrorMsg = computed(
  () =>
    pageData.value?.some((row) => !!(row as OperationLogItem & { errorMsg?: string }).errorMsg) ??
    false
);

function buildQueryParams(): OperationLogQueryParams {
  const params: OperationLogQueryParams = {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
  };
  if (queryParams.operationType != null && String(queryParams.operationType).trim() !== "") {
    params.operationType = String(queryParams.operationType).trim();
  }
  if (createTimeRange.value && createTimeRange.value.length === 2) {
    params.startTime = `${createTimeRange.value[0]} 00:00:00`;
    params.endTime = `${createTimeRange.value[1]} 23:59:59`;
  }
  return params;
}

function fetchData(): void {
  loading.value = true;
  LogAPI.getPage(buildQueryParams())
    .then((data) => {
      pageData.value = data?.list ?? [];
      total.value = data?.total ?? 0;
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleQuery(): void {
  queryParams.pageNum = 1;
  fetchData();
}

function handleResetQuery(): void {
  queryFormRef.value?.resetFields();
  createTimeRange.value = null;
  queryParams.pageNum = 1;
  queryParams.operationType = undefined;
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  fetchData();
}

onMounted(() => {
  fetchData();
});
</script>
