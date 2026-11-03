<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  RISK_POINT_LIST, RISK_POINT_TYPES, GAS_SYSTEMS, PERSON_LIST,
  hazardsOfPoint, maxLevelOfPoint, auditStatusOfPoint, pointOf,
  HAZARD_LIST, ACCIDENT_TYPES, L_OPTIONS, E_OPTIONS, C_OPTIONS,
  calcD, riskLevelOf
} from '../../data/risk'
import { usePager } from '../../composables/usePager'

const keyword = ref('')
const filterType = ref('')
const filterSystem = ref('')
const filterLevel = ref('')

const tableData = computed(() => {
  let list = RISK_POINT_LIST.slice()
  if (filterType.value) list = list.filter((p) => p.type === filterType.value)
  if (filterSystem.value) list = list.filter((p) => p.system === filterSystem.value)
  if (filterLevel.value) {
    list = list.filter((p) => {
      const m = maxLevelOfPoint(p.id)
      return m && String(m.level) === filterLevel.value
    })
  }
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (p) => p.name.includes(k) || p.id.includes(k) || p.location.includes(k)
    )
  }
  return list
})

const auditTag = {
  已通过: 'success',
  待审核: 'warning',
  已退回: 'danger',
  草稿: 'info'
}

/** 等级色标点 */
function levelOfPoint(id) {
  return maxLevelOfPoint(id)
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '', name: '', type: '医用气体', facility: '', location: '',
    system: '中心供氧系统', area: '', subjectId: 'ZT-EPC-0001',
    ownerName: '', ownerId: '', status: '启用', createDate: '',
    hazards: []
  }
}

const rules = {
  name: [{ required: true, message: '请输入风险点名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择风险点类型', trigger: 'change' }],
  facility: [{ required: true, message: '请输入作业步骤 / 设备设施', trigger: 'blur' }],
  location: [{ required: true, message: '请输入所在位置', trigger: 'blur' }],
  system: [{ required: true, message: '请选择所属专业系统', trigger: 'change' }],
  ownerId: [{ required: true, message: '请选择责任人', trigger: 'change' }]
}

const TYPE_CODE = { 医用气体: 'QT', 建筑结构: 'JZ', 机电设备: 'JD', 其他: 'OTH' }

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = {
    ...row,
    hazards: hazardsOfPoint(row.id).map((h) => ({
      ...h,
      accidents: [...(h.accidents || [])]
    }))
  }
  dialogVisible.value = true
}

/* ===== 危险源与 LEC 评估子表 ===== */
function newHazard() {
  return {
    id: '', seq: 0, desc: '', accidents: [], trigger: '', facility: '', existing: '',
    L: 3, E: 6, C: 7, method: 'LEC', assessDate: '', assessor: '',
    auditStatus: '草稿', status: '启用'
  }
}

function addHazard() {
  form.value.hazards.push(newHazard())
}

function removeHazard(i) {
  form.value.hazards.splice(i, 1)
}

/** D = L × E × C，实时计算 */
function dOf(h) {
  return calcD(Number(h.L) || 0, Number(h.E) || 0, Number(h.C) || 0)
}

function levelOfH(h) {
  return riskLevelOf(dOf(h))
}

function hzLevelText(h) {
  const lv = levelOfH(h)
  return `${lv.level} 级 · ${lv.name}`
}

function hzLevelStyle(h) {
  const lv = levelOfH(h)
  return { color: lv.color, background: `${lv.color}1f`, borderColor: `${lv.color}66` }
}

/**
 * 危险源编号前缀：沿用该点已有危险源的前缀（WX-{点位序号}-），
 * 新点则取「风险点顺序号」与「现有最大序号 + 1」中的较大值，避免撞号。
 */
function wxPrefix(pointId) {
  const existing = HAZARD_LIST.find((h) => h.pointId === pointId)
  if (existing) return `${existing.id.slice(0, 8)}-`
  const idx = RISK_POINT_LIST.findIndex((p) => p.id === pointId) + 1
  const maxIdx = HAZARD_LIST.reduce((m, h) => Math.max(m, Number(h.id.slice(3, 7)) || 0), 0)
  const no = Math.max(idx, maxIdx + 1)
  return `WX-${String(no).padStart(4, '0')}-`
}

/** 把表单里的危险源列表同步进 HAZARD_LIST（新增生成编号、已有就地更新、移除的删除） */
function syncHazards(pointId, rows) {
  const pre = wxPrefix(pointId)
  const keepIds = new Set(rows.filter((r) => r.id).map((r) => r.id))

  for (let i = HAZARD_LIST.length - 1; i >= 0; i--) {
    const h = HAZARD_LIST[i]
    if (h.pointId === pointId && !keepIds.has(h.id)) HAZARD_LIST.splice(i, 1)
  }

  let maxSeq = HAZARD_LIST
    .filter((h) => h.pointId === pointId)
    .reduce((m, h) => Math.max(m, Number(h.seq) || 0), 0)

  rows.forEach((r) => {
    const d = dOf(r)
    const lv = riskLevelOf(d)
    const payload = {
      ...r,
      pointId,
      accidents: [...(r.accidents || [])],
      L: Number(r.L),
      E: Number(r.E),
      C: Number(r.C),
      D: d,
      level: lv.level,
      levelName: lv.name,
      colorName: lv.colorName,
      color: lv.color,
      controlLevel: lv.controlLevel
    }
    if (r.id) {
      const idx = HAZARD_LIST.findIndex((h) => h.id === r.id)
      if (idx > -1) HAZARD_LIST.splice(idx, 1, { ...HAZARD_LIST[idx], ...payload })
    } else {
      maxSeq += 1
      payload.id = pre + String(maxSeq).padStart(3, '0')
      payload.seq = maxSeq
      HAZARD_LIST.push(payload)
    }
  })
}

function onOwnerChange(pid) {
  const p = PERSON_LIST.find((x) => x.id === pid)
  form.value.ownerName = p ? p.name : ''
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    const blank = form.value.hazards.findIndex((h) => !String(h.desc || '').trim())
    if (blank > -1) {
      ElMessage.warning(`第 ${blank + 1} 条危险源缺少描述，请补充或移除`)
      return
    }
    const { hazards, ...pointData } = form.value
    if (dialogMode.value === 'create') {
      const prefix = `FX-${TYPE_CODE[form.value.type] || 'OTH'}-`
      const maxNo = RISK_POINT_LIST
        .filter((p) => p.id.startsWith(prefix))
        .reduce((m, p) => Math.max(m, Number(p.id.slice(-4)) || 0), 0)
      const newId = prefix + String(maxNo + 1).padStart(4, '0')
      RISK_POINT_LIST.push({ ...pointData, id: newId })
      syncHazards(newId, hazards)
      ElMessage.success(`风险点已新增，同步 ${hazards.length} 条危险源（原型演示，刷新后还原）`)
    } else {
      const idx = RISK_POINT_LIST.findIndex((p) => p.id === form.value.id)
      if (idx > -1) RISK_POINT_LIST.splice(idx, 1, { ...pointData })
      syncHazards(form.value.id, hazards)
      ElMessage.success(`风险点已更新，同步 ${hazards.length} 条危险源（原型演示，刷新后还原）`)
    }
    dialogVisible.value = false
  })
}

function removeRow(row) {
  const hs = hazardsOfPoint(row.id)
  if (hs.length > 0) {
    ElMessage.warning(`该风险点下挂 ${hs.length} 个危险源，需先删除危险源后才能删除风险点`)
    return
  }
  ElMessageBox.confirm(`确认删除风险点「${row.name}」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = RISK_POINT_LIST.findIndex((p) => p.id === row.id)
    if (idx > -1) RISK_POINT_LIST.splice(idx, 1)
    ElMessage.success('已删除（原型演示，刷新后还原）')
  }).catch(() => {})
}

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = pointOf(row.id) || row
  drawerVisible.value = true
}
const detailHazards = computed(() =>
  detailRow.value ? hazardsOfPoint(detailRow.value.id) : []
)

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="tab-body">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索名称 / 编号 / 位置" clearable style="width: 210px" />
        <el-select v-model="filterType" placeholder="风险点类型" clearable style="width: 130px">
          <el-option v-for="t in RISK_POINT_TYPES" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="filterSystem" placeholder="专业系统" clearable style="width: 150px">
          <el-option v-for="s in GAS_SYSTEMS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filterLevel" placeholder="最高等级" clearable style="width: 120px">
          <el-option label="1 级 · 稍有危险" value="1" />
          <el-option label="2 级 · 一般危险" value="2" />
          <el-option label="3 级 · 显著危险" value="3" />
          <el-option label="4 级 · 高度危险" value="4" />
          <el-option label="5 级 · 极其危险" value="5" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增风险点</el-button>
    </div>

    <el-table :data="pagedRows" stripe border size="small" style="width: 100%">
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="风险点编号" width="120" />
      <el-table-column prop="name" label="风险点名称" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="95" align="center" />
      <el-table-column prop="facility" label="作业步骤 / 设备设施" min-width="200" show-overflow-tooltip />
      <el-table-column prop="location" label="所在位置" min-width="150" show-overflow-tooltip />
      <el-table-column prop="system" label="所属专业系统" width="140" />
      <el-table-column label="危险源" width="80" align="center">
        <template #default="{ row }">
          <span class="num">{{ hazardsOfPoint(row.id).length }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最高风险等级" width="150" align="center">
        <template #default="{ row }">
          <span v-if="levelOfPoint(row.id)" class="level-pill" :style="{
            background: levelOfPoint(row.id).color + '1A',
            color: levelOfPoint(row.id).color,
            borderColor: levelOfPoint(row.id).color + '55'
          }">
            <i :style="{ background: levelOfPoint(row.id).color }"></i>
            {{ levelOfPoint(row.id).level }} 级 · {{ levelOfPoint(row.id).name }}
          </span>
          <span v-else class="muted">未评估</span>
        </template>
      </el-table-column>
      <el-table-column prop="ownerName" label="责任人" width="90" />
      <el-table-column label="审核状态" width="95" align="center">
        <template #default="{ row }">
          <el-tag :type="auditTag[auditStatusOfPoint(row.id)]" size="small" effect="light">
            {{ auditStatusOfPoint(row.id) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="removeRow(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的风险点" :image-size="80" />
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

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增风险点' : '编辑风险点'"
      width="880px"
      destroy-on-close
      top="6vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="风险点名称" prop="name">
              <el-input v-model="form.name" maxlength="100" show-word-limit placeholder="如：液氧储罐区" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="风险点类型" prop="type">
              <el-select v-model="form.type" style="width: 100%">
                <el-option v-for="t in RISK_POINT_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属专业系统" prop="system">
              <el-select v-model="form.system" style="width: 100%">
                <el-option v-for="s in GAS_SYSTEMS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="作业步骤 / 设备设施" prop="facility">
              <el-input v-model="form.facility" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="所在位置" prop="location">
              <el-input v-model="form.location" maxlength="100" placeholder="楼栋-楼层-房间，如「住院楼 B1 液氧站」" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属区域">
              <el-input v-model="form.area" maxlength="50" placeholder="如「液氧储罐区」" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="责任人" prop="ownerId">
              <el-select v-model="form.ownerId" filterable style="width: 100%" @change="onOwnerChange">
                <el-option
                  v-for="p in PERSON_LIST"
                  :key="p.id"
                  :label="`${p.name}（${p.positionName}）`"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="启用" value="启用" />
                <el-option label="停用" value="停用" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="建立日期">
              <el-date-picker v-model="form.createDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 危险源与 LEC 评估 -->
        <div class="hz-section">
          <div class="hz-section-head">
            <span class="hz-section-title">危险源与 LEC 评估</span>
            <span class="hz-section-hint">{{ form.hazards.length }} 项</span>
            <el-button link type="primary" size="small" class="hz-add" @click="addHazard">
              + 添加危险源
            </el-button>
          </div>

          <div v-if="!form.hazards.length" class="hz-empty">
            尚未录入危险源。可先保存风险点，稍后在此补充，或在「危险源与 LEC 评估」页签中批量维护。
          </div>

          <div v-for="(h, i) in form.hazards" :key="i" class="hz-item">
            <div class="hz-item-top">
              <span class="hz-seq">{{ i + 1 }}</span>
              <el-input
                v-model="h.desc"
                maxlength="200"
                placeholder="危险源描述，如「液氧储罐超压导致罐体破裂」"
              />
              <el-button link type="danger" @click="removeHazard(i)">移除</el-button>
            </div>

            <div class="hz-field">
              <span class="hz-label">可能事故类型</span>
              <el-select
                v-model="h.accidents"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="可多选，如「爆炸」「泄漏」"
                style="width: 100%"
              >
                <el-option v-for="a in ACCIDENT_TYPES" :key="a" :label="a" :value="a" />
              </el-select>
            </div>

            <div class="hz-lec">
              <div class="hz-field">
                <span class="hz-label compact">L</span>
                <el-select v-model="h.L" placeholder="可能性" style="width: 100%">
                  <el-option v-for="o in L_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </div>
              <div class="hz-field">
                <span class="hz-label compact">E</span>
                <el-select v-model="h.E" placeholder="暴露频率" style="width: 100%">
                  <el-option v-for="o in E_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </div>
              <div class="hz-field">
                <span class="hz-label compact">C</span>
                <el-select v-model="h.C" placeholder="后果" style="width: 100%">
                  <el-option v-for="o in C_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </div>
            </div>

            <div class="hz-item-result">
              <span class="hz-d">D = L × E × C = {{ dOf(h) }}</span>
              <span class="hz-lv" :style="hzLevelStyle(h)">{{ hzLevelText(h) }}</span>
            </div>

            <el-collapse class="hz-more">
              <el-collapse-item title="触发条件 / 关联设备设施 / 现有管控措施">
                <div class="hz-more-item">
                  <span class="hz-label">触发条件</span>
                  <el-input
                    v-model="h.trigger"
                    type="textarea"
                    :rows="2"
                    placeholder="如：安全阀卡涩、压力表失真、充装过量、罐体超期未检"
                  />
                </div>
                <div class="hz-more-item">
                  <span class="hz-label">关联设备设施</span>
                  <el-input
                    v-model="h.facility"
                    type="textarea"
                    :rows="2"
                    placeholder="如：液氧储罐、安全阀、压力表"
                  />
                </div>
                <div class="hz-more-item">
                  <span class="hz-label">现有管控措施</span>
                  <el-input
                    v-model="h.existing"
                    type="textarea"
                    :rows="2"
                    placeholder="如：每日两次巡检记录罐压与液位；安全阀每半年校验"
                  />
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>

        <div class="form-tip">
          风险点编号按「FX-{类型代码}-{4位流水}」自动生成，危险源编号按「WX-{点位后4位}-{3位流水}」自动生成；D 值与风险等级由 L×E×C 实时计算，不可手工填写。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="风险点详情" size="680px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.name }}</div>
        <div class="detail-sub">
          <el-tag size="small" effect="plain">{{ detailRow.type }}</el-tag>
          <el-tag :type="auditTag[auditStatusOfPoint(detailRow.id)]" size="small" effect="light">
            审核{{ auditStatusOfPoint(detailRow.id) }}
          </el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="作业步骤 / 设备设施" :span="2">{{ detailRow.facility }}</el-descriptions-item>
          <el-descriptions-item label="所在位置" :span="2">{{ detailRow.location }}</el-descriptions-item>
          <el-descriptions-item label="所属专业系统">{{ detailRow.system }}</el-descriptions-item>
          <el-descriptions-item label="所属区域">{{ detailRow.area || '—' }}</el-descriptions-item>
          <el-descriptions-item label="责任人">{{ detailRow.ownerName }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detailRow.status }}</el-descriptions-item>
          <el-descriptions-item label="危险源数量">{{ detailHazards.length }}</el-descriptions-item>
          <el-descriptions-item label="最高风险等级">
            <span v-if="levelOfPoint(detailRow.id)" :style="{ color: levelOfPoint(detailRow.id).color, fontWeight: 600 }">
              {{ levelOfPoint(detailRow.id).level }} 级 · {{ levelOfPoint(detailRow.id).name }}
            </span>
            <span v-else class="muted">未评估</span>
          </el-descriptions-item>
          <el-descriptions-item label="建立日期">{{ detailRow.createDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="管控层级">
            {{ levelOfPoint(detailRow.id) ? levelOfPoint(detailRow.id).controlLevel : '—' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">危险源清单（{{ detailHazards.length }}）</div>
        <el-table :data="detailHazards" size="small" border>
          <el-table-column prop="id" label="危险源编号" width="115" />
          <el-table-column prop="desc" label="危险源描述" min-width="240" show-overflow-tooltip />
          <el-table-column label="L×E×C" width="95" align="center">
            <template #default="{ row }">{{ row.L }}×{{ row.E }}×{{ row.C }}</template>
          </el-table-column>
          <el-table-column label="D 值" width="75" align="center">
            <template #default="{ row }">
              <b class="d-value">{{ row.D }}</b>
            </template>
          </el-table-column>
          <el-table-column label="风险等级" width="130" align="center">
            <template #default="{ row }">
              <span class="level-pill small" :style="{
                background: row.color + '1A', color: row.color, borderColor: row.color + '55'
              }">
                <i :style="{ background: row.color }"></i>{{ row.level }} 级
              </span>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无危险源" :image-size="60" />
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

.num { font-weight: 600; color: var(--ez-primary); font-variant-numeric: tabular-nums; }
.muted { font-size: 12px; color: var(--ez-text-muted); }

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
.level-pill.small { font-size: 10px; padding: 1px 6px; }
.level-pill i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex: 0 0 5px;
}
.d-value { font-variant-numeric: tabular-nums; color: var(--ez-text); }

.form-tip {
  margin-top: 4px;
  padding: 8px 12px;
  background: var(--ez-primary-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.6;
}

/* ===== 危险源与 LEC 评估子表 ===== */
.hz-section {
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px dashed var(--ez-border);
}
.hz-section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.hz-section-title { font-size: 13px; font-weight: 600; color: var(--ez-text); }
.hz-section-hint { font-size: 12px; color: var(--ez-text-muted); }
.hz-add { margin-left: auto; }
.hz-empty {
  font-size: 12px;
  color: var(--ez-text-muted);
  line-height: 1.7;
  padding: 10px 12px;
  background: var(--ez-fill-light);
  border-radius: 6px;
}
.hz-item {
  border: 1px solid var(--ez-border);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.7);
}
.hz-item-top { display: flex; align-items: center; gap: 8px; }
.hz-seq {
  flex: none;
  width: 18px; height: 18px; line-height: 18px;
  text-align: center; font-size: 11px; border-radius: 50%;
  background: var(--ez-fill-light); color: var(--ez-text-secondary);
}
/* 字段行：标签在左，控件撑满剩余宽度 */
.hz-field { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.hz-label {
  flex: none;
  width: 84px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  text-align: right;
  line-height: 1.5;
}
.hz-label.compact { width: 16px; text-align: center; }
.hz-field > :deep(.el-select) { flex: 1; min-width: 0; }
/* L / E / C 三列等宽 */
.hz-lec { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.hz-item-result { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.hz-d { font-size: 12px; color: var(--ez-text-secondary); font-variant-numeric: tabular-nums; }
.hz-lv {
  font-size: 12px;
  font-weight: 600;
  padding: 1px 8px;
  border: 1px solid transparent;
  border-radius: 10px;
}
.hz-more { margin-top: 8px; }
.hz-more :deep(.el-collapse-item__header) { font-size: 12px; color: var(--ez-text-muted); height: 30px; }
.hz-more :deep(.el-collapse-item__content) { padding-bottom: 4px; }
/* 折叠区三个字段各占一行 */
.hz-more-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; }
.hz-more-item .hz-label { padding-top: 7px; }
.hz-more-item > :deep(.el-textarea) { flex: 1; min-width: 0; }

.detail-title { font-size: 17px; font-weight: 600; color: var(--ez-text); line-height: 1.5; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.drawer-section-title {
  margin: 20px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
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
