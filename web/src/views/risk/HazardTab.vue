<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  HAZARD_LIST, RISK_POINT_LIST, L_OPTIONS, E_OPTIONS, C_OPTIONS,
  ACCIDENT_TYPES, AUDIT_STATUS, calcD, riskLevelOf, pointName,
  measuresOfHazard, hazardOf, AUDIT_LIST
} from '../../data/risk'

const keyword = ref('')
const filterPoint = ref('')
const filterLevel = ref('')
const filterAudit = ref('')

const tableData = computed(() => {
  let list = HAZARD_LIST.slice()
  if (filterPoint.value) list = list.filter((h) => h.pointId === filterPoint.value)
  if (filterLevel.value) list = list.filter((h) => String(h.level) === filterLevel.value)
  if (filterAudit.value) list = list.filter((h) => h.auditStatus === filterAudit.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((h) => h.desc.includes(k) || h.id.includes(k))
  }
  return list
})

const auditTag = {
  已通过: 'success',
  待审核: 'warning',
  已退回: 'danger',
  草稿: 'info'
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '', pointId: '', seq: 1, desc: '', accidents: [],
    trigger: '', facility: '', existing: '',
    L: null, E: null, C: null,
    method: 'LEC', assessDate: '', assessor: '',
    auditStatus: '草稿', status: '启用'
  }
}

const rules = {
  pointId: [{ required: true, message: '请选择所属风险点', trigger: 'change' }],
  desc: [{ required: true, message: '请输入危险源描述', trigger: 'blur' }],
  accidents: [{ required: true, type: 'array', min: 1, message: '至少选择一种可能事故类型', trigger: 'change' }],
  L: [{ required: true, message: '请选择 L 值', trigger: 'change' }],
  E: [{ required: true, message: '请选择 E 值', trigger: 'change' }],
  C: [{ required: true, message: '请选择 C 值', trigger: 'change' }]
}

/** 实时计算 D 与等级 */
const liveD = computed(() => calcD(form.value.L, form.value.E, form.value.C))
const liveLevel = computed(() => riskLevelOf(liveD.value))
const liveReady = computed(() => !!(form.value.L && form.value.E && form.value.C))

const nextSeq = computed(() => {
  if (!form.value.pointId) return 1
  const list = HAZARD_LIST.filter((h) => h.pointId === form.value.pointId)
  return list.reduce((m, h) => Math.max(m, h.seq || 0), 0) + 1
})

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  if (filterPoint.value) form.value.pointId = filterPoint.value
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { ...row, accidents: [...(row.accidents || [])] }
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    const d = calcD(form.value.L, form.value.E, form.value.C)
    const lv = riskLevelOf(d)
    const payload = {
      ...form.value,
      D: d,
      level: lv.level,
      levelName: lv.name,
      colorName: lv.colorName,
      color: lv.color,
      controlLevel: lv.controlLevel
    }
    if (dialogMode.value === 'create') {
      const pointNo = (form.value.pointId || '').slice(-4)
      payload.seq = nextSeq.value
      payload.id = `WX-${pointNo}-${String(payload.seq).padStart(3, '0')}`
      HAZARD_LIST.push(payload)
      ElMessage.success(`危险源已新增，D=${d}，判定为 ${lv.level} 级（${lv.name}）`)
    } else {
      const idx = HAZARD_LIST.findIndex((h) => h.id === form.value.id)
      if (idx > -1) HAZARD_LIST.splice(idx, 1, payload)
      ElMessage.success(`危险源已更新，D=${d}，判定为 ${lv.level} 级（${lv.name}）`)
    }
    dialogVisible.value = false
  })
}

function removeRow(row) {
  const links = measuresOfHazard(row.id)
  if (links.length > 0) {
    ElMessage.warning(`该危险源已关联 ${links.length} 条管控措施，需先解除关联才能删除`)
    return
  }
  ElMessageBox.confirm(`确认删除危险源「${row.desc.slice(0, 20)}…」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = HAZARD_LIST.findIndex((h) => h.id === row.id)
    if (idx > -1) HAZARD_LIST.splice(idx, 1)
    ElMessage.success('已删除（原型演示，刷新后还原）')
  }).catch(() => {})
}

/** 提交审核 */
function submitAudit(row) {
  if (row.auditStatus === '已通过') {
    ElMessage.info('该危险源评估已通过，如需修改请先发起变更')
    return
  }
  ElMessageBox.confirm(
    `确认提交「${row.id}」进入第一级审核（专业负责人）？`,
    '提交审核',
    { type: 'info', confirmButtonText: '确认提交', cancelButtonText: '取消' }
  ).then(() => {
    const idx = HAZARD_LIST.findIndex((h) => h.id === row.id)
    if (idx > -1) HAZARD_LIST.splice(idx, 1, { ...row, auditStatus: '待审核' })
    // 同步生成审核流水，否则「评估审核」页看不到这条待审任务
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    if (!AUDIT_LIST.some((a) => a.hazardId === row.id && (a.flowStatus === '待第一级' || a.flowStatus === '待第二级'))) {
      AUDIT_LIST.push({
        id: 'SH-' + String(AUDIT_LIST.length + 1).padStart(8, '0'),
        hazardId: row.id,
        hazardDesc: row.desc,
        dSnapshot: row.D,
        levelSnapshot: row.level,
        submitter: row.assessor || '张安',
        submitTime: ts,
        stage: '第一级（专业负责人）',
        auditor: '',
        auditTime: '',
        conclusion: '',
        opinion: '',
        flowStatus: '待第一级'
      })
    }
    ElMessage.success('已提交审核，已推送至「评估审核」待第一级')
  }).catch(() => {})
}

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = hazardOf(row.id) || row
  drawerVisible.value = true
}
const detailMeasures = computed(() =>
  detailRow.value ? measuresOfHazard(detailRow.value.id) : []
)
const detailPoint = computed(() =>
  detailRow.value ? RISK_POINT_LIST.find((p) => p.id === detailRow.value.pointId) : null
)
</script>

<template>
  <div class="tab-body">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索危险源编号 / 描述" clearable style="width: 220px" />
        <el-select v-model="filterPoint" placeholder="所属风险点" clearable style="width: 170px">
          <el-option v-for="p in RISK_POINT_LIST" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-select v-model="filterLevel" placeholder="风险等级" clearable style="width: 130px">
          <el-option label="1 级 · 稍有危险" value="1" />
          <el-option label="2 级 · 一般危险" value="2" />
          <el-option label="3 级 · 显著危险" value="3" />
          <el-option label="4 级 · 高度危险" value="4" />
          <el-option label="5 级 · 极其危险" value="5" />
        </el-select>
        <el-select v-model="filterAudit" placeholder="审核状态" clearable style="width: 120px">
          <el-option v-for="a in AUDIT_STATUS" :key="a" :label="a" :value="a" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增危险源</el-button>
    </div>

    <el-table :data="tableData" stripe border size="small" style="width: 100%">
      <el-table-column prop="id" label="危险源编号" width="118" />
      <el-table-column label="所属风险点" width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ pointName(row.pointId) }}</template>
      </el-table-column>
      <el-table-column prop="desc" label="危险源描述" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.desc }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="可能事故类型" min-width="150">
        <template #default="{ row }">
          <div class="tag-row">
            <el-tag v-for="a in row.accidents" :key="a" size="small" effect="plain" type="info">{{ a }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="L" width="55" align="center">
        <template #default="{ row }">{{ row.L }}</template>
      </el-table-column>
      <el-table-column label="E" width="55" align="center">
        <template #default="{ row }">{{ row.E }}</template>
      </el-table-column>
      <el-table-column label="C" width="55" align="center">
        <template #default="{ row }">{{ row.C }}</template>
      </el-table-column>
      <el-table-column label="D 值" width="80" align="center" sortable :sort-by="(r) => r.D">
        <template #default="{ row }">
          <b class="d-value">{{ row.D }}</b>
        </template>
      </el-table-column>
      <el-table-column label="风险等级" width="130" align="center">
        <template #default="{ row }">
          <span class="level-pill" :style="{
            background: row.color + '1A', color: row.color, borderColor: row.color + '55'
          }">
            <i :style="{ background: row.color }"></i>{{ row.level }} 级 · {{ row.levelName }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="controlLevel" label="管控层级" width="90" align="center" />
      <el-table-column label="审核状态" width="95" align="center">
        <template #default="{ row }">
          <el-tag :type="auditTag[row.auditStatus]" size="small" effect="light">{{ row.auditStatus }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button
            v-if="row.auditStatus !== '已通过'"
            link type="warning" size="small"
            @click="submitAudit(row)"
          >提交审核</el-button>
          <el-button link type="danger" size="small" @click="removeRow(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的危险源" :image-size="80" />
      </template>
    </el-table>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增危险源' : '编辑危险源'"
      width="820px"
      destroy-on-close
      top="5vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="所属风险点" prop="pointId">
              <el-select v-model="form.pointId" style="width: 100%">
                <el-option
                  v-for="p in RISK_POINT_LIST"
                  :key="p.id"
                  :label="`${p.name}（${p.id}）`"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="危险源序号">
              <el-input :model-value="dialogMode === 'create' ? nextSeq : form.seq" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="危险源描述" prop="desc">
              <el-input
                v-model="form.desc"
                type="textarea"
                :rows="2"
                maxlength="300"
                show-word-limit
                placeholder="描述可能导致事故的不安全状态或行为"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="可能事故类型" prop="accidents">
              <el-select v-model="form.accidents" multiple style="width: 100%">
                <el-option v-for="a in ACCIDENT_TYPES" :key="a" :label="a" :value="a" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="触发条件">
              <el-input v-model="form.trigger" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联设备设施">
              <el-input v-model="form.facility" maxlength="100" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="评估方法">
              <el-select v-model="form.method" style="width: 100%">
                <el-option label="LEC 法" value="LEC" />
                <el-option label="LS 法（本期未启用）" value="LS" disabled />
                <el-option label="风险矩阵法（本期未启用）" value="RiskMatrix" disabled />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="现有管控措施">
              <el-input v-model="form.existing" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- LEC 评估区 -->
        <div class="lec-box">
          <div class="lec-title">LEC 评估（D = L × E × C）</div>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="L 可能性" prop="L" label-width="90px">
                <el-select v-model="form.L" style="width: 100%" placeholder="选择">
                  <el-option v-for="o in L_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="E 暴露频率" prop="E" label-width="100px">
                <el-select v-model="form.E" style="width: 100%" placeholder="选择">
                  <el-option v-for="o in E_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="C 后果" prop="C" label-width="80px">
                <el-select v-model="form.C" style="width: 100%" placeholder="选择">
                  <el-option v-for="o in C_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <div class="lec-result" :class="{ empty: !liveReady }">
            <template v-if="liveReady">
              <div class="lec-result-item">
                <span class="lec-result-label">D 值</span>
                <span class="lec-result-value">{{ liveD }}</span>
              </div>
              <div class="lec-result-item">
                <span class="lec-result-label">风险等级</span>
                <span class="level-pill" :style="{
                  background: liveLevel.color + '1A',
                  color: liveLevel.color,
                  borderColor: liveLevel.color + '55'
                }">
                  <i :style="{ background: liveLevel.color }"></i>
                  {{ liveLevel.level }} 级 · {{ liveLevel.name }}
                </span>
              </div>
              <div class="lec-result-item">
                <span class="lec-result-label">管控层级</span>
                <span class="lec-result-value small">{{ liveLevel.controlLevel }}</span>
              </div>
              <div class="lec-result-action">{{ liveLevel.action }}</div>
            </template>
            <span v-else class="lec-placeholder">选择 L / E / C 后自动计算 D 值与风险等级</span>
          </div>
        </div>

        <el-row :gutter="16" style="margin-top: 12px">
          <el-col :span="12">
            <el-form-item label="评估日期">
              <el-date-picker v-model="form.assessDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="评估人">
              <el-input v-model="form.assessor" maxlength="20" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="危险源详情" size="700px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.desc }}</div>
        <div class="detail-sub">
          <span class="level-pill" :style="{
            background: detailRow.color + '1A',
            color: detailRow.color,
            borderColor: detailRow.color + '55'
          }">
            <i :style="{ background: detailRow.color }"></i>
            {{ detailRow.level }} 级 · {{ detailRow.levelName }}
          </span>
          <el-tag :type="auditTag[detailRow.auditStatus]" size="small" effect="light">
            {{ detailRow.auditStatus }}
          </el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <!-- LEC 结果条 -->
        <div class="lec-summary" :style="{ borderColor: detailRow.color }">
          <div class="lec-cell">
            <div class="lec-cell-label">L</div>
            <div class="lec-cell-value">{{ detailRow.L }}</div>
          </div>
          <div class="lec-op">×</div>
          <div class="lec-cell">
            <div class="lec-cell-label">E</div>
            <div class="lec-cell-value">{{ detailRow.E }}</div>
          </div>
          <div class="lec-op">×</div>
          <div class="lec-cell">
            <div class="lec-cell-label">C</div>
            <div class="lec-cell-value">{{ detailRow.C }}</div>
          </div>
          <div class="lec-op">=</div>
          <div class="lec-cell strong">
            <div class="lec-cell-label">D</div>
            <div class="lec-cell-value" :style="{ color: detailRow.color }">{{ detailRow.D }}</div>
          </div>
          <div class="lec-action">{{ riskLevelOf(detailRow.D).action }}</div>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="所属风险点" :span="2">
            {{ pointName(detailRow.pointId) }}（{{ detailRow.pointId }}）
          </el-descriptions-item>
          <el-descriptions-item label="可能事故类型" :span="2">
            <div class="tag-row">
              <el-tag v-for="a in detailRow.accidents" :key="a" size="small" effect="plain" type="info">{{ a }}</el-tag>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="触发条件" :span="2">{{ detailRow.trigger || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关联设备设施" :span="2">{{ detailRow.facility || '—' }}</el-descriptions-item>
          <el-descriptions-item label="现有管控措施" :span="2">{{ detailRow.existing || '—' }}</el-descriptions-item>
          <el-descriptions-item label="评估方法">{{ detailRow.method }}</el-descriptions-item>
          <el-descriptions-item label="管控层级">{{ detailRow.controlLevel }}</el-descriptions-item>
          <el-descriptions-item label="评估日期">{{ detailRow.assessDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="评估人">{{ detailRow.assessor || '—' }}</el-descriptions-item>
          <el-descriptions-item label="所属位置" :span="2">
            {{ detailPoint ? detailPoint.location : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态" :span="2">{{ detailRow.status }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">已关联的管控措施（{{ detailMeasures.length }}）</div>
        <el-table :data="detailMeasures" size="small" border>
          <el-table-column label="措施名称" min-width="220">
            <template #default="{ row }">{{ row.measure ? row.measure.name : '—' }}</template>
          </el-table-column>
          <el-table-column label="措施类别" width="100">
            <template #default="{ row }">{{ row.measure ? row.measure.category : '—' }}</template>
          </el-table-column>
          <el-table-column prop="linkType" label="关联类型" width="90" align="center" />
          <el-table-column prop="isDone" label="落实状态" width="90" align="center" />
          <template #empty>
            <el-empty description="尚未关联管控措施，请前往「风险管控措施制定」补充" :image-size="60" />
          </template>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.tab-body { padding-top: 4px; }
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.tag-row { display: flex; gap: 3px; flex-wrap: wrap; }
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

/* LEC 评估区 */
.lec-box {
  margin-top: 4px;
  padding: 14px 16px 8px;
  background: var(--ez-fill-light);
  border-radius: 8px;
  border: 1px dashed var(--ez-border);
}
.lec-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
  margin-bottom: 12px;
}
.lec-result {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  min-height: 52px;
}
.lec-result.empty { justify-content: center; }
.lec-result-item { display: flex; align-items: center; gap: 8px; }
.lec-result-label { font-size: 12px; color: var(--ez-text-secondary); }
.lec-result-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--ez-text);
  font-variant-numeric: tabular-nums;
}
.lec-result-value.small { font-size: 14px; font-weight: 600; }
.lec-result-action {
  flex: 1 1 100%;
  font-size: 11px;
  color: var(--ez-text-secondary);
  border-top: 1px dashed var(--ez-border);
  padding-top: 8px;
}
.lec-placeholder { font-size: 12px; color: var(--ez-text-muted); }

/* 详情 LEC 结果条 */
.lec-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border: 1px solid;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
}
.lec-cell { text-align: center; min-width: 44px; }
.lec-cell-label { font-size: 11px; color: var(--ez-text-muted); }
.lec-cell-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--ez-text);
  font-variant-numeric: tabular-nums;
}
.lec-cell.strong .lec-cell-value { font-size: 24px; }
.lec-op { font-size: 14px; color: var(--ez-text-muted); }
.lec-action {
  flex: 1 1 100%;
  font-size: 12px;
  color: var(--ez-text-secondary);
  border-top: 1px dashed var(--ez-border);
  padding-top: 8px;
  line-height: 1.6;
}

.detail-title { font-size: 15px; font-weight: 600; color: var(--ez-text); line-height: 1.6; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.drawer-section-title {
  margin: 20px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}
</style>
