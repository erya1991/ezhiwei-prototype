<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { AUDIT_LIST, HAZARD_LIST, hazardOf, riskLevelOf } from '../../data/risk'

const keyword = ref('')
const filterFlow = ref('')

const tableData = computed(() => {
  let list = AUDIT_LIST.slice()
  if (filterFlow.value) list = list.filter((a) => a.flowStatus === filterFlow.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (a) => a.hazardId.includes(k) || a.hazardDesc.includes(k) ||
             a.id.includes(k) || (a.submitter || '').includes(k)
    )
  }
  return list.sort((a, b) => (a.submitTime < b.submitTime ? 1 : -1))
})

const summary = computed(() => ({
  pending1: AUDIT_LIST.filter((a) => a.flowStatus === '待第一级').length,
  pending2: AUDIT_LIST.filter((a) => a.flowStatus === '待第二级').length,
  passed: AUDIT_LIST.filter((a) => a.flowStatus === '已通过').length,
  rejected: AUDIT_LIST.filter((a) => a.flowStatus === '已退回').length
}))

const flowTag = {
  待第一级: 'warning',
  待第二级: 'warning',
  已通过: 'success',
  已退回: 'danger'
}

// ---- 审核操作 ----
const dialogVisible = ref(false)
const dialogMode = ref('pass')
const currentRow = ref(null)
const opinion = ref('')

function openAudit(row, mode) {
  if (row.flowStatus === '已通过' || row.flowStatus === '已退回') {
    ElMessage.info('该流程已结束，无法再次审核')
    return
  }
  currentRow.value = row
  dialogMode.value = mode
  opinion.value = ''
  dialogVisible.value = true
}

function confirmAudit() {
  if (!currentRow.value) return
  if (dialogMode.value === 'reject' && !opinion.value.trim()) {
    ElMessage.warning('退回必须填写审核意见')
    return
  }
  const idx = AUDIT_LIST.findIndex((a) => a.id === currentRow.value.id)
  if (idx > -1) {
    const row = AUDIT_LIST[idx]
    let nextStage = row.stage
    let nextFlow = row.flowStatus
    if (dialogMode.value === 'pass') {
      if (row.flowStatus === '待第一级') {
        nextStage = '第二级（安全负责人）'
        nextFlow = '待第二级'
      } else {
        nextStage = row.stage
        nextFlow = '已通过'
      }
    } else {
      nextFlow = '已退回'
    }
    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    AUDIT_LIST.splice(idx, 1, {
      ...row,
      stage: nextStage,
      flowStatus: nextFlow,
      conclusion: dialogMode.value === 'pass' ? '通过' : '退回',
      opinion: opinion.value || (dialogMode.value === 'pass' ? '同意' : ''),
      auditTime: ts,
      auditor: dialogMode.value === 'pass' ? '王海涛' : '王海涛'
    })
    // 回写危险源审核状态，避免「危险源」页与「评估审核」页数据打架
    const hz = HAZARD_LIST.find((h) => h.id === row.hazardId)
    if (hz) {
      hz.auditStatus = nextFlow === '已通过' ? '已通过' : nextFlow === '已退回' ? '已退回' : '待审核'
    }
  }
  ElMessage.success(
    dialogMode.value === 'pass'
      ? (currentRow.value.flowStatus === '待第一级' ? '已通过第一级，流转至第二级审核' : '已通过，评估结果生效')
      : '已退回，需评估人修改后重新提交'
  )
  dialogVisible.value = false
}

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}
const detailHazard = computed(() =>
  detailRow.value ? hazardOf(detailRow.value.hazardId) : null
)
</script>

<template>
  <div class="tab-body">
    <div class="flow-bar">
      <div class="flow-step">
        <span class="flow-dot warning"></span>
        <span>待第一级（专业负责人）</span>
        <b>{{ summary.pending1 }}</b>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step">
        <span class="flow-dot warning"></span>
        <span>待第二级（安全负责人）</span>
        <b>{{ summary.pending2 }}</b>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step">
        <span class="flow-dot success"></span>
        <span>已通过</span>
        <b>{{ summary.passed }}</b>
      </div>
      <span class="flow-arrow">·</span>
      <div class="flow-step">
        <span class="flow-dot danger"></span>
        <span>已退回</span>
        <b>{{ summary.rejected }}</b>
      </div>
    </div>

    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索危险源编号 / 描述 / 提交人" clearable style="width: 250px" />
        <el-select v-model="filterFlow" placeholder="流程状态" clearable style="width: 140px">
          <el-option label="待第一级" value="待第一级" />
          <el-option label="待第二级" value="待第二级" />
          <el-option label="已通过" value="已通过" />
          <el-option label="已退回" value="已退回" />
        </el-select>
      </div>
      <span class="toolbar-count">{{ tableData.length }} 条</span>
    </div>

    <el-table :data="tableData" stripe border size="small" style="width: 100%">
      <el-table-column prop="id" label="审核编号" width="120" />
      <el-table-column prop="hazardId" label="危险源" width="115" />
      <el-table-column prop="hazardDesc" label="危险源描述" min-width="230" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.hazardDesc }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="D 值快照" width="90" align="center">
        <template #default="{ row }">
          <b class="d-value">{{ row.dSnapshot }}</b>
        </template>
      </el-table-column>
      <el-table-column label="等级快照" width="130" align="center">
        <template #default="{ row }">
          <span class="level-pill" :style="{
            background: riskLevelOf(row.dSnapshot).color + '1A',
            color: riskLevelOf(row.dSnapshot).color,
            borderColor: riskLevelOf(row.dSnapshot).color + '55'
          }">
            <i :style="{ background: riskLevelOf(row.dSnapshot).color }"></i>
            {{ row.levelSnapshot }} 级
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="submitter" label="提交人" width="85" />
      <el-table-column prop="submitTime" label="提交时间" width="140" />
      <el-table-column prop="stage" label="审核环节" width="150" show-overflow-tooltip />
      <el-table-column label="审核人" width="85">
        <template #default="{ row }">{{ row.auditor || '—' }}</template>
      </el-table-column>
      <el-table-column label="流程状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="flowTag[row.flowStatus]" size="small" effect="light">{{ row.flowStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
          <template v-if="row.flowStatus === '待第一级' || row.flowStatus === '待第二级'">
            <el-button link type="success" size="small" @click="openAudit(row, 'pass')">通过</el-button>
            <el-button link type="danger" size="small" @click="openAudit(row, 'reject')">退回</el-button>
          </template>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的审核记录" :image-size="80" />
      </template>
    </el-table>

    <!-- 审核弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'pass' ? '审核通过' : '审核退回'"
      width="560px"
      destroy-on-close
    >
      <div v-if="currentRow" class="audit-info">
        <div class="audit-row">
          <span class="audit-label">危险源</span>
          <span>{{ currentRow.hazardId }}</span>
        </div>
        <div class="audit-row">
          <span class="audit-label">描述</span>
          <span>{{ currentRow.hazardDesc }}</span>
        </div>
        <div class="audit-row">
          <span class="audit-label">D 值 / 等级</span>
          <span>{{ currentRow.dSnapshot }} / {{ currentRow.levelSnapshot }} 级</span>
        </div>
        <div class="audit-row">
          <span class="audit-label">当前环节</span>
          <span>{{ currentRow.stage }}</span>
        </div>
      </div>
      <el-input
        v-model="opinion"
        type="textarea"
        :rows="3"
        maxlength="300"
        show-word-limit
        :placeholder="dialogMode === 'reject' ? '退回必须填写意见（必填）' : '审核意见（选填）'"
      />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button :type="dialogMode === 'pass' ? 'primary' : 'danger'" @click="confirmAudit">
          {{ dialogMode === 'pass' ? '确认通过' : '确认退回' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="评估审核详情" size="560px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.hazardDesc }}</div>
        <div class="detail-sub">
          <el-tag :type="flowTag[detailRow.flowStatus]" size="small" effect="light">
            {{ detailRow.flowStatus }}
          </el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="关联危险源">{{ detailRow.hazardId }}</el-descriptions-item>
          <el-descriptions-item label="D 值快照">{{ detailRow.dSnapshot }}</el-descriptions-item>
          <el-descriptions-item label="风险等级快照">{{ detailRow.levelSnapshot }} 级</el-descriptions-item>
          <el-descriptions-item label="评估方法">{{ detailHazard ? detailHazard.method : '—' }}</el-descriptions-item>
          <el-descriptions-item label="提交人">{{ detailRow.submitter }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ detailRow.submitTime }}</el-descriptions-item>
          <el-descriptions-item label="审核环节">{{ detailRow.stage }}</el-descriptions-item>
          <el-descriptions-item label="审核人">{{ detailRow.auditor || '—' }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ detailRow.auditTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="审核结论">{{ detailRow.conclusion || '—' }}</el-descriptions-item>
          <el-descriptions-item label="审核意见" :span="2">{{ detailRow.opinion || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="detailRow.flowStatus === '已退回'" class="alert-box danger">
          本次评估被退回，危险源状态需由评估人修改后重新提交审核。退回意见见上方「审核意见」。
        </div>
        <div v-else-if="detailRow.flowStatus === '已通过'" class="alert-box success">
          评估已通过两级审核，D 值与风险等级作为该危险源的正式结论，可用于目录化管理与措施制定。
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.tab-body { padding-top: 4px; }

.flow-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: var(--ez-fill-light);
  border-radius: 8px;
  margin-bottom: 12px;
}
.flow-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
}
.flow-step b { color: var(--ez-text); font-variant-numeric: tabular-nums; }
.flow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.flow-dot.warning { background: var(--ez-warning); }
.flow-dot.success { background: var(--ez-success); }
.flow-dot.danger { background: var(--ez-danger); }
.flow-arrow { color: var(--ez-text-muted); font-size: 12px; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.toolbar-count { font-size: 12px; color: var(--ez-text-muted); }

.d-value { font-variant-numeric: tabular-nums; color: var(--ez-text); }
.level-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.level-pill i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex: 0 0 5px;
}

.audit-info {
  padding: 12px 14px;
  background: var(--ez-fill-light);
  border-radius: 6px;
  margin-bottom: 12px;
}
.audit-row {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--ez-text);
  line-height: 1.9;
}
.audit-label {
  flex: 0 0 80px;
  color: var(--ez-text-secondary);
}

.detail-title { font-size: 15px; font-weight: 600; color: var(--ez-text); line-height: 1.6; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }

.alert-box {
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.7;
}
.alert-box.danger {
  background: rgba(217, 48, 37, 0.08);
  border-left: 3px solid var(--ez-danger);
  color: var(--ez-danger);
}
.alert-box.success {
  background: rgba(16, 124, 16, 0.08);
  border-left: 3px solid var(--ez-success);
  color: var(--ez-success);
}
</style>
