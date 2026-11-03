<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  MEASURE_LINKS, MEASURE_LIST, HAZARD_LIST, RISK_POINT_LIST,
  pointName
} from '../../data/risk'
import { usePager } from '../../composables/usePager'

const keyword = ref('')
const filterLinkType = ref('')
const filterDone = ref('')
const filterHazard = ref('')

const rows = computed(() =>
  MEASURE_LINKS.map((l) => {
    const h = HAZARD_LIST.find((x) => x.id === l.hazardId)
    const m = MEASURE_LIST.find((x) => x.id === l.measureId)
    return {
      ...l,
      hazardDesc: h ? h.desc : '（危险源已删除）',
      hazardLevel: h ? h.level : null,
      hazardColor: h ? h.color : '#6B6B6B',
      pointName: h ? pointName(h.pointId) : '—',
      measureName: m ? m.name : '（措施已删除）',
      measureCategory: m ? m.category : '—',
      measureStatus: m ? m.status : '—'
    }
  })
)

const tableData = computed(() => {
  let list = rows.value.slice()
  if (filterLinkType.value) list = list.filter((r) => r.linkType === filterLinkType.value)
  if (filterDone.value) list = list.filter((r) => r.isDone === filterDone.value)
  if (filterHazard.value) list = list.filter((r) => r.hazardId === filterHazard.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (r) => r.hazardDesc.includes(k) || r.measureName.includes(k) ||
             r.hazardId.includes(k) || r.measureId.includes(k)
    )
  }
  return list
})

const coverage = computed(() => {
  const linked = new Set(MEASURE_LINKS.map((l) => l.hazardId))
  const total = HAZARD_LIST.length
  const covered = HAZARD_LIST.filter((h) => linked.has(h.id)).length
  const uncovered = HAZARD_LIST.filter((h) => !linked.has(h.id))
  return { total, covered, uncovered, rate: total ? Math.round((covered / total) * 100) : 0 }
})

// ---- 新增关联 ----
const dialogVisible = ref(false)
const form = ref({ hazardId: '', measureId: '', linkType: '主要措施', isDone: '否', doneDate: '' })

const selectedHazard = computed(() => HAZARD_LIST.find((h) => h.id === form.value.hazardId))
const selectedMeasure = computed(() => MEASURE_LIST.find((m) => m.id === form.value.measureId))

const hazardOptions = computed(() =>
  HAZARD_LIST.map((h) => ({
    value: h.id,
    label: `${h.id}｜${pointName(h.pointId)}｜${h.desc.slice(0, 24)}`
  }))
)
const measureOptions = computed(() =>
  MEASURE_LIST.map((m) => ({ value: m.id, label: `${m.id}｜${m.name}` }))
)

function openCreate() {
  form.value = { hazardId: '', measureId: '', linkType: '主要措施', isDone: '否', doneDate: '' }
  dialogVisible.value = true
}

function submitForm() {
  if (!form.value.hazardId) { ElMessage.warning('请选择危险源'); return }
  if (!form.value.measureId) { ElMessage.warning('请选择管控措施'); return }
  const dup = MEASURE_LINKS.find(
    (l) => l.hazardId === form.value.hazardId && l.measureId === form.value.measureId
  )
  if (dup) { ElMessage.warning('该危险源与此措施已存在关联，不能重复添加'); return }

  const maxNo = MEASURE_LINKS.reduce((m, l) => Math.max(m, Number(l.id.slice(-8)) || 0), 0)
  const isDone = form.value.isDone
  MEASURE_LINKS.push({
    id: 'GL-' + String(maxNo + 1).padStart(8, '0'),
    hazardId: form.value.hazardId,
    measureId: form.value.measureId,
    linkType: form.value.linkType,
    isDone,
    doneDate: isDone === '已完成' ? (form.value.doneDate || today()) : ''
  })
  // 同步措施的关联危险源数
  const m = MEASURE_LIST.find((x) => x.id === form.value.measureId)
  if (m) m.hazardCount = MEASURE_LINKS.filter((l) => l.measureId === m.id).length
  ElMessage.success('关联已建立（原型演示，刷新后还原）')
  dialogVisible.value = false
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function removeRow(row) {
  ElMessageBox.confirm(
    `确认解除「${row.hazardId}」与「${row.measureName}」的关联？`,
    '解除关联',
    { type: 'warning', confirmButtonText: '确认解除', cancelButtonText: '取消' }
  ).then(() => {
    const idx = MEASURE_LINKS.findIndex((l) => l.id === row.id)
    if (idx > -1) MEASURE_LINKS.splice(idx, 1)
    const m = MEASURE_LIST.find((x) => x.id === row.measureId)
    if (m) m.hazardCount = MEASURE_LINKS.filter((l) => l.measureId === m.id).length
    ElMessage.success('已解除（原型演示，刷新后还原）')
  }).catch(() => {})
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="tab-body">
    <!-- 覆盖率提示 -->
    <div class="cover-card">
      <div class="cover-left">
        <div class="cover-rate" :class="{ warn: coverage.rate < 100 }">{{ coverage.rate }}<span>%</span></div>
        <div class="cover-label">危险源措施覆盖率</div>
      </div>
      <div class="cover-bar-wrap">
        <div class="cover-bar">
          <div class="cover-bar-inner" :class="{ warn: coverage.rate < 100 }" :style="{ width: coverage.rate + '%' }"></div>
        </div>
        <div class="cover-meta">
          已覆盖 {{ coverage.covered }} / {{ coverage.total }} 个危险源，
          共 {{ MEASURE_LINKS.length }} 条关联
          <span v-if="coverage.uncovered.length" class="cover-warn">
            ｜ {{ coverage.uncovered.length }} 个危险源尚未制定措施
          </span>
        </div>
      </div>
      <el-button type="primary" @click="openCreate">+ 建立关联</el-button>
    </div>

    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索危险源 / 措施" clearable style="width: 220px" />
        <el-select v-model="filterHazard" placeholder="筛选危险源" clearable filterable style="width: 220px">
          <el-option v-for="h in hazardOptions" :key="h.value" :label="h.label" :value="h.value" />
        </el-select>
        <el-select v-model="filterLinkType" placeholder="关联类型" clearable style="width: 115px">
          <el-option label="主要措施" value="主要措施" />
          <el-option label="辅助措施" value="辅助措施" />
        </el-select>
        <el-select v-model="filterDone" placeholder="落实状态" clearable style="width: 115px">
          <el-option label="已完成" value="已完成" />
          <el-option label="未完成" value="未完成" />
        </el-select>
      </div>
      <span class="count-text">{{ tableData.length }} 条关联</span>
    </div>

    <el-table :data="pagedRows" stripe border size="small" style="width: 100%">
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="关联编号" width="120" />
      <el-table-column prop="hazardId" label="危险源" width="115" />
      <el-table-column prop="hazardDesc" label="危险源描述" min-width="220" show-overflow-tooltip />
      <el-table-column label="风险等级" width="100" align="center">
        <template #default="{ row }">
          <span v-if="row.hazardLevel" class="level-pill" :style="{
            background: row.hazardColor + '1A',
            color: row.hazardColor,
            borderColor: row.hazardColor + '55'
          }">
            <i :style="{ background: row.hazardColor }"></i>{{ row.hazardLevel }} 级
          </span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="measureName" label="管控措施" min-width="200" show-overflow-tooltip />
      <el-table-column prop="measureCategory" label="措施类别" width="95" align="center" />
      <el-table-column label="关联类型" width="95" align="center">
        <template #default="{ row }">
          <el-tag :type="row.linkType === '主要措施' ? 'primary' : 'info'" size="small" effect="plain">
            {{ row.linkType }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="是否落实" width="95" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isDone === '已完成' ? 'success' : 'warning'" size="small" effect="light">
            {{ row.isDone }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="落实日期" width="105">
        <template #default="{ row }">{{ row.doneDate || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" size="small" @click="removeRow(row)">解除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的关联记录" :image-size="80" />
      </template>
    </el-table>

    <div v-if="total" class="table-pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <!-- 建立关联 -->
    <el-dialog v-model="dialogVisible" title="建立措施与危险源关联" width="680px" destroy-on-close>
      <el-form :model="form" label-width="110px">
        <el-form-item label="危险源" required>
          <el-select v-model="form.hazardId" filterable style="width: 100%" placeholder="选择危险源">
            <el-option v-for="h in hazardOptions" :key="h.value" :label="h.label" :value="h.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedHazard" label="危险源描述">
          <div class="readonly-box">
            <div>{{ selectedHazard.desc }}</div>
            <div class="readonly-meta">
              所属风险点：{{ pointName(selectedHazard.pointId) }}｜
              D 值 {{ selectedHazard.D }}｜
              <span :style="{ color: selectedHazard.color, fontWeight: 600 }">
                {{ selectedHazard.level }} 级 {{ selectedHazard.levelName }}
              </span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="管控措施" required>
          <el-select v-model="form.measureId" filterable style="width: 100%" placeholder="选择管控措施">
            <el-option v-for="m in measureOptions" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedMeasure" label="措施类别">
          <el-input :model-value="selectedMeasure.category" disabled />
        </el-form-item>
        <el-form-item label="关联类型" required>
          <el-radio-group v-model="form.linkType">
            <el-radio value="主要措施">主要措施</el-radio>
            <el-radio value="辅助措施">辅助措施</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否已落实">
          <el-radio-group v-model="form.isDone">
            <el-radio value="已完成">已完成</el-radio>
            <el-radio value="未完成">未完成</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.isDone === '已完成'" label="落实日期">
          <el-date-picker v-model="form.doneDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">建立关联</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tab-body { padding-top: 4px; }

.cover-card {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--ez-fill-light);
  border-radius: 8px;
  margin-bottom: 12px;
}
.cover-left { text-align: center; flex: 0 0 auto; }
.cover-rate {
  font-size: 26px;
  font-weight: 700;
  color: var(--ez-success);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.cover-rate.warn { color: var(--ez-warning); }
.cover-rate span { font-size: 14px; }
.cover-label { font-size: 11px; color: var(--ez-text-secondary); margin-top: 2px; }
.cover-bar-wrap { flex: 1 1 300px; }
.cover-bar {
  height: 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.cover-bar-inner {
  height: 100%;
  border-radius: 4px;
  background: var(--ez-success);
  transition: width 0.3s;
}
.cover-bar-inner.warn { background: var(--ez-warning); }
.cover-meta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
}
.cover-warn { color: var(--ez-warning); font-weight: 600; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.count-text { font-size: 12px; color: var(--ez-text-muted); }

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
.level-pill i { width: 5px; height: 5px; border-radius: 50%; }
.muted { color: var(--ez-text-muted); font-size: 12px; }

.readonly-box {
  width: 100%;
  padding: 8px 12px;
  background: var(--ez-fill-light);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text);
  line-height: 1.7;
}
.readonly-meta {
  margin-top: 4px;
  font-size: 11px;
  color: var(--ez-text-secondary);
}
/* ===== 固定操作列不透明，避免横向滚动时下方列透出 ===== */
:deep(.el-table .el-table-fixed-column--right),
:deep(.el-table .el-table__fixed-right .el-table__cell) {
  background-color: #fff !important;
}
:deep(.el-table th.el-table-fixed-column--right),
:deep(.el-table__fixed-right .el-table__header .el-table__cell) {
  background-color: var(--ez-fill-light) !important;
}
:deep(.el-table__body tr:hover > td.el-table-fixed-column--right) {
  background-color: #f2f7ff !important;
}

/* ===== 统一分页栏 ===== */
.table-pager {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: right;
  padding: 14px 4px 2px;
}
.table-pager :deep(.el-pagination) {
  display: inline-flex;
  vertical-align: middle;
}
</style>
