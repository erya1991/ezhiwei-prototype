<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  MEASURE_LIST, MEASURE_CATEGORIES, CONTROL_LEVELS, MEASURE_STATUS,
  VALIDITY_STATUS, measuresOfHazard, linksOfMeasure, HAZARD_LIST
} from '../../data/risk'
import { POSITION_LIST, PERSON_LIST } from '../../data/orgPersonnel'

const keyword = ref('')
const filterCategory = ref('')
const filterControl = ref('')
const filterStatus = ref('')
const filterValidity = ref('')

const tableData = computed(() => {
  let list = MEASURE_LIST.slice()
  if (filterCategory.value) list = list.filter((m) => m.category === filterCategory.value)
  if (filterControl.value) list = list.filter((m) => m.controlLevel === filterControl.value)
  if (filterStatus.value) list = list.filter((m) => displayStatus(m) === filterStatus.value)
  if (filterValidity.value) list = list.filter((m) => m.validity === filterValidity.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((m) => m.name.includes(k) || m.id.includes(k) || m.owner.includes(k))
  }
  return list
})

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 落实状态实时判定：未完成且已过计划完成时间 → 已逾期（不写回存储，避免日期推进后失真） */
function displayStatus(row) {
  if (row.status === '已完成') return '已完成'
  if (row.planDate && row.planDate < todayStr()) return '已逾期'
  return row.status
}

const statusTag = {
  未开始: 'info',
  进行中: 'warning',
  已完成: 'success',
  已逾期: 'danger'
}

const validityTag = {
  未验证: 'info',
  有效: 'success',
  部分有效: 'warning',
  无效: 'danger'
}

const catColor = {
  工程技术: '#2173D8',
  管理: '#7B3FF2',
  培训教育: '#107C10',
  个体防护: '#FF9500',
  应急处置: '#D93025'
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '', name: '', category: '工程技术', desc: '', require: '', accept: '',
    controlLevel: '岗位级', owner: '', position: '', planDate: '',
    status: '未开始', validity: '未验证', verifyDate: '', verifier: '',
    fromLib: '否'
  }
}

const rules = {
  name: [{ required: true, message: '请输入措施名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择措施类别', trigger: 'change' }],
  desc: [{ required: true, message: '请输入措施描述', trigger: 'blur' }],
  controlLevel: [{ required: true, message: '请选择管控层级', trigger: 'change' }],
  owner: [{ required: true, message: '请选择责任人', trigger: 'change' }],
  status: [{ required: true, message: '请选择落实状态', trigger: 'change' }]
}

const CAT_CODE = {
  工程技术: 'GC', 管理: 'GL', 培训教育: 'PX', 个体防护: 'FH', 应急处置: 'YJ'
}

const personOptions = computed(() =>
  PERSON_LIST.filter((p) => !p.leaveDate).map((p) => ({
    label: `${p.name}（${p.empNo}）`,
    value: p.name,
    positionName: p.positionName
  }))
)

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { ...row }
  dialogVisible.value = true
}

function onOwnerChange(name) {
  const p = personOptions.value.find((o) => o.value === name)
  if (p) form.value.position = p.positionName
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    if (dialogMode.value === 'create') {
      const code = CAT_CODE[form.value.category] || 'QT'
      const prefix = `CS-${code}-`
      const maxNo = MEASURE_LIST
        .filter((m) => m.id.startsWith(prefix))
        .reduce((mx, m) => Math.max(mx, Number(m.id.slice(-4)) || 0), 0)
      MEASURE_LIST.push({
        ...form.value,
        id: prefix + String(maxNo + 1).padStart(4, '0'),
        hazardCount: 0
      })
      ElMessage.success('管控措施已新增（原型演示，刷新后还原）')
    } else {
      const idx = MEASURE_LIST.findIndex((m) => m.id === form.value.id)
      if (idx > -1) MEASURE_LIST.splice(idx, 1, { ...form.value })
      ElMessage.success('管控措施已更新（原型演示，刷新后还原）')
    }
    dialogVisible.value = false
  })
}

function removeRow(row) {
  const links = linksOfMeasure(row.id)
  if (links.length > 0) {
    ElMessage.warning(`该措施已关联 ${links.length} 个危险源，需先在「措施与危险源关联」中解除`)
    return
  }
  ElMessageBox.confirm(`确认删除措施「${row.name}」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = MEASURE_LIST.findIndex((m) => m.id === row.id)
    if (idx > -1) MEASURE_LIST.splice(idx, 1)
    ElMessage.success('已删除（原型演示，刷新后还原）')
  }).catch(() => {})
}

function startRow(row) {
  if (row.status !== '未开始' && row.status !== '已逾期') {
    ElMessage.info('只有「未开始」或「已逾期」的措施可以启动整改')
    return
  }
  const idx = MEASURE_LIST.findIndex((m) => m.id === row.id)
  if (idx > -1) MEASURE_LIST.splice(idx, 1, { ...row, status: '进行中' })
  ElMessage.success('已启动整改，状态流转为「进行中」')
}

// ---- 验证有效性（已完成 → 有效 / 部分有效 / 无效）----
const verifyDialog = ref(false)
const verifyRow = ref(null)
const verifyForm = ref({ validity: '有效', verifier: '', verifyDate: '', note: '' })

function openVerify(row) {
  if (row.status !== '已完成') {
    ElMessage.info('只有「已完成」的措施才能验证有效性')
    return
  }
  verifyRow.value = row
  const d = new Date()
  verifyForm.value = {
    validity: '有效',
    verifier: '王海涛',
    verifyDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    note: ''
  }
  verifyDialog.value = true
}

function confirmVerify() {
  const f = verifyForm.value
  if (!f.verifier || !f.verifyDate) {
    ElMessage.warning('请填写验证人与验证日期')
    return
  }
  if (f.validity === '无效' && (f.note || '').trim().length < 5) {
    ElMessage.warning('判定无效时须说明原因（不少于 5 个字）')
    return
  }
  const idx = MEASURE_LIST.findIndex((m) => m.id === verifyRow.value.id)
  if (idx > -1) {
    MEASURE_LIST.splice(idx, 1, {
      ...MEASURE_LIST[idx],
      validity: f.validity,
      verifier: f.verifier,
      verifyDate: f.verifyDate,
      remark: f.note ? f.note.trim() : MEASURE_LIST[idx].remark
    })
  }
  verifyDialog.value = false
  ElMessage.success(`已记录有效性判定为「${f.validity}」`)
}

function markDone(row) {
  if (row.status === '已完成') {
    ElMessage.info('该措施已标记为已完成')
    return
  }
  const today = new Date()
  const ts = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const idx = MEASURE_LIST.findIndex((m) => m.id === row.id)
  if (idx > -1) {
    MEASURE_LIST.splice(idx, 1, { ...row, status: '已完成', doneDate: ts })
  }
  ElMessage.success('已标记完成，待验证有效性')
}

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}
const detailHazards = computed(() => {
  if (!detailRow.value) return []
  return linksOfMeasure(detailRow.value.id).map((l) => ({
    ...l,
    hazard: HAZARD_LIST.find((h) => h.id === l.hazardId)
  }))
})
</script>

<template>
  <div class="tab-body">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索措施名称 / 编号 / 责任人" clearable style="width: 230px" />
        <el-select v-model="filterCategory" placeholder="措施类别" clearable style="width: 125px">
          <el-option v-for="c in MEASURE_CATEGORIES" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filterControl" placeholder="管控层级" clearable style="width: 120px">
          <el-option v-for="c in CONTROL_LEVELS" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="落实状态" clearable style="width: 115px">
          <el-option v-for="s in MEASURE_STATUS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filterValidity" placeholder="有效性" clearable style="width: 115px">
          <el-option v-for="v in VALIDITY_STATUS" :key="v" :label="v" :value="v" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增措施</el-button>
    </div>

    <el-table :data="tableData" stripe border size="small" style="width: 100%">
      <el-table-column prop="id" label="措施编号" width="118" />
      <el-table-column prop="name" label="措施名称" min-width="210" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="措施类别" width="100" align="center">
        <template #default="{ row }">
          <span class="cat-tag" :style="{
            background: (catColor[row.category] || '#6B6B6B') + '1A',
            color: catColor[row.category] || '#6B6B6B'
          }">{{ row.category }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="controlLevel" label="管控层级" width="90" align="center" />
      <el-table-column prop="owner" label="责任人" width="85" />
      <el-table-column prop="position" label="责任岗位" width="120" show-overflow-tooltip />
      <el-table-column prop="planDate" label="计划完成" width="105" />
      <el-table-column label="落实状态" width="95" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTag[displayStatus(row)]" size="small" effect="light">{{ displayStatus(row) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="有效性" width="95" align="center">
        <template #default="{ row }">
          <el-tag :type="validityTag[row.validity]" size="small" effect="light">{{ row.validity }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="关联危险源" width="100" align="center">
        <template #default="{ row }">
          <span class="link-count" :class="{ zero: !row.hazardCount }">{{ row.hazardCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button
            v-if="row.status === '未开始' || row.status === '已逾期'"
            link type="primary" size="small"
            @click="startRow(row)"
          >启动</el-button>
          <el-button
            v-if="displayStatus(row) === '进行中' || displayStatus(row) === '已逾期'"
            link type="success" size="small"
            @click="markDone(row)"
          >完成</el-button>
          <el-button
            v-if="row.status === '已完成'"
            link type="warning" size="small"
            @click="openVerify(row)"
          >验证</el-button>
          <el-button link type="danger" size="small" @click="removeRow(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的管控措施" :image-size="80" />
      </template>
    </el-table>

    <!-- 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增管控措施' : '编辑管控措施'"
      width="820px"
      destroy-on-close
      top="6vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="措施名称" prop="name">
              <el-input v-model="form.name" maxlength="100" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="措施类别" prop="category">
              <el-select v-model="form.category" style="width: 100%">
                <el-option v-for="c in MEASURE_CATEGORIES" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="管控层级" prop="controlLevel">
              <el-select v-model="form.controlLevel" style="width: 100%">
                <el-option v-for="c in CONTROL_LEVELS" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="措施描述" prop="desc">
              <el-input v-model="form.desc" type="textarea" :rows="2" maxlength="300" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="实施要求">
              <el-input v-model="form.require" type="textarea" :rows="2" maxlength="300" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="验收标准">
              <el-input v-model="form.accept" type="textarea" :rows="2" maxlength="300" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="责任人" prop="owner">
              <el-select
                v-model="form.owner"
                filterable
                style="width: 100%"
                @change="onOwnerChange"
              >
                <el-option v-for="p in personOptions" :key="p.value" :label="p.label" :value="p.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="责任岗位">
              <el-input v-model="form.position" placeholder="选择责任人后自动带出" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划完成时间">
              <el-date-picker
                v-model="form.planDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="落实状态" prop="status">
              <el-select v-model="form.status" style="width: 100%">
                <el-option v-for="s in MEASURE_STATUS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效性判定">
              <el-select v-model="form.validity" style="width: 100%">
                <el-option v-for="v in VALIDITY_STATUS" :key="v" :label="v" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否引用措施库">
              <el-radio-group v-model="form.fromLib">
                <el-radio value="是">是</el-radio>
                <el-radio value="否">否</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="验证日期">
              <el-date-picker
                v-model="form.verifyDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="验证人">
              <el-input v-model="form.verifier" maxlength="20" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 有效性验证弹窗 -->
    <el-dialog v-model="verifyDialog" title="措施有效性验证" width="540px">
      <div class="dialog-hint" v-if="verifyRow">
        {{ verifyRow.id }} · {{ verifyRow.name }}
      </div>
      <el-form :model="verifyForm" label-width="100px">
        <el-form-item label="验证结论" required>
          <el-radio-group v-model="verifyForm.validity">
            <el-radio v-for="v in VALIDITY_STATUS.filter((x) => x !== '未验证')" :key="v" :value="v">{{ v }}</el-radio>
          </el-radio-group>
          <div class="field-hint">判定「无效」时该措施需重新制定，关联危险源的风险等级不变</div>
        </el-form-item>
        <el-form-item label="验证人" required>
          <el-input v-model="verifyForm.verifier" placeholder="验证人姓名" />
        </el-form-item>
        <el-form-item label="验证日期" required>
          <el-date-picker v-model="verifyForm.verifyDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="验证说明">
          <el-input
            v-model="verifyForm.note"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            :placeholder="verifyForm.validity === '无效' ? '判定无效时必填，说明未达到验收标准的原因（不少于 5 个字）' : '可选，记录抽查方式与结果'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmVerify">提交验证</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="管控措施详情" size="680px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.name }}</div>
        <div class="detail-sub">
          <span class="cat-tag" :style="{
            background: (catColor[detailRow.category] || '#6B6B6B') + '1A',
            color: catColor[detailRow.category] || '#6B6B6B'
          }">{{ detailRow.category }}</span>
          <el-tag :type="statusTag[displayStatus(detailRow)]" size="small" effect="light">{{ displayStatus(detailRow) }}</el-tag>
          <el-tag :type="validityTag[detailRow.validity]" size="small" effect="light">
            有效性：{{ detailRow.validity }}
          </el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="措施描述" :span="2">{{ detailRow.desc }}</el-descriptions-item>
          <el-descriptions-item label="实施要求" :span="2">{{ detailRow.require || '—' }}</el-descriptions-item>
          <el-descriptions-item label="验收标准" :span="2">{{ detailRow.accept || '—' }}</el-descriptions-item>
          <el-descriptions-item label="管控层级">{{ detailRow.controlLevel }}</el-descriptions-item>
          <el-descriptions-item label="责任人">{{ detailRow.owner }}</el-descriptions-item>
          <el-descriptions-item label="责任岗位">{{ detailRow.position }}</el-descriptions-item>
          <el-descriptions-item label="计划完成">{{ detailRow.planDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="实际完成">{{ detailRow.doneDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="是否引用措施库">{{ detailRow.fromLib }}</el-descriptions-item>
          <el-descriptions-item label="验证日期">{{ detailRow.verifyDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="验证人">{{ detailRow.verifier || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">关联危险源（{{ detailHazards.length }}）</div>
        <el-table :data="detailHazards" size="small" border>
          <el-table-column prop="hazardId" label="危险源" width="115" />
          <el-table-column label="描述" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.hazard ? row.hazard.desc : '—' }}</template>
          </el-table-column>
          <el-table-column label="风险等级" width="105" align="center">
            <template #default="{ row }">
              <span v-if="row.hazard" class="level-pill" :style="{
                background: row.hazard.color + '1A',
                color: row.hazard.color,
                borderColor: row.hazard.color + '55'
              }">
                <i :style="{ background: row.hazard.color }"></i>{{ row.hazard.level }} 级
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="linkType" label="关联类型" width="90" align="center" />
          <template #empty>
            <el-empty description="尚未关联危险源" :image-size="60" />
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

.cat-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.link-count { font-weight: 700; color: var(--ez-primary); font-variant-numeric: tabular-nums; }
.link-count.zero { color: var(--ez-danger); }

.detail-title { font-size: 15px; font-weight: 600; color: var(--ez-text); line-height: 1.6; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; flex-wrap: wrap; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.drawer-section-title {
  margin: 20px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}
.level-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 600;
}
.level-pill i { width: 5px; height: 5px; border-radius: 50%; }
</style>
