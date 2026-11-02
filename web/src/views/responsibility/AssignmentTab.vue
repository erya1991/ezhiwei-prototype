<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ASSIGNMENT_LIST, DUTY_TAGS, GAS_SYSTEMS, NODE_LIST, SUBJECT_LIST,
  PERSON_LIST, POSITION_LIST, assignmentStatus, personCertStatus
} from '../../data/responsibility'

const keyword = ref('')
const filterNode = ref('')
const filterDuty = ref('')
const filterStatus = ref('')

/** 是否持证：人员档案中无过期证件即视为持证 */
function hasCertOf(personId) {
  const s = personCertStatus(personId)
  return s === '有证件已过期' || s === '无证' ? '否' : '是'
}

function nodeName(id) {
  const n = NODE_LIST.find((x) => x.id === id)
  return n ? n.name : '—'
}
function subjectName(id) {
  const s = SUBJECT_LIST.find((x) => x.id === id)
  return s ? s.name : '—'
}

const tableData = computed(() => {
  let list = ASSIGNMENT_LIST.slice()
  if (filterNode.value) list = list.filter((a) => a.nodeId === filterNode.value)
  if (filterDuty.value) list = list.filter((a) => a.dutyTag === filterDuty.value)
  if (filterStatus.value) list = list.filter((a) => assignmentStatus(a) === filterStatus.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (a) => a.personName.includes(k) || a.empNo.includes(k) || a.id.includes(k) ||
             (a.positionName || '').includes(k)
    )
  }
  return list
})

const summary = computed(() => {
  const onDuty = ASSIGNMENT_LIST.filter((a) => assignmentStatus(a) === '在任')
  return {
    onDuty: onDuty.length,
    left: ASSIGNMENT_LIST.length - onDuty.length,
    first: onDuty.filter((a) => a.dutyTag === '第一责任人').length,
    noCert: onDuty.filter((a) => hasCertOf(a.personId) === '否').length
  }
})

const dutyTagType = {
  第一责任人: 'danger',
  专业负责人: 'warning',
  系统分包负责人: 'primary',
  普通责任人: 'info'
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '', personId: '', personName: '', empNo: '',
    subjectId: '', positionId: '', positionName: '',
    nodeId: '', dutyTag: '普通责任人',
    systems: [], areas: [],
    startDate: '', endDate: '', remark: ''
  }
}

const rules = {
  personId: [{ required: true, message: '请选择人员', trigger: 'change' }],
  positionId: [{ required: true, message: '请选择岗位', trigger: 'change' }],
  nodeId: [{ required: true, message: '请选择组织节点', trigger: 'change' }],
  dutyTag: [{ required: true, message: '请选择责任人标识', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择任职起', trigger: 'change' }]
}

/** 选中人员后带出工号、所属主体、岗位候选 */
function onPersonChange(personId) {
  const p = PERSON_LIST.find((x) => x.id === personId)
  if (!p) return
  form.value.personName = p.name
  form.value.empNo = p.empNo
  // 所属主体：自有/分包人员归我方项目部，院方人员归院方，第三方归第三方
  const map = {
    自有员工: 'ZT-EPC-0001',
    分包人员: 'ZT-EPC-0001',
    院方人员: 'ZT-HOS-0001',
    第三方维保: 'ZT-3RD-0001'
  }
  form.value.subjectId = map[p.personType] || 'ZT-EPC-0001'
  if (p.positionId) {
    form.value.positionId = p.positionId
    form.value.positionName = p.positionName
  }
}

function onPositionChange(pid) {
  const pos = POSITION_LIST.find((x) => x.id === pid)
  form.value.positionName = pos ? pos.name : ''
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = {
    ...row,
    systems: [...(row.systems || [])],
    areas: [...(row.areas || [])]
  }
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    // 同一节点仅允许一个在任第一责任人
    if (form.value.dutyTag === '第一责任人') {
      const exist = ASSIGNMENT_LIST.find(
        (a) =>
          a.nodeId === form.value.nodeId &&
          a.dutyTag === '第一责任人' &&
          assignmentStatus(a) === '在任' &&
          a.id !== form.value.id
      )
      if (exist) {
        ElMessage.warning(
          `节点「${nodeName(form.value.nodeId)}」已有在任第一责任人「${exist.personName}」，同一节点仅允许一个`
        )
        return
      }
    }
    if (form.value.endDate && form.value.startDate && form.value.endDate < form.value.startDate) {
      ElMessage.warning('任职止不能早于任职起')
      return
    }
    if (dialogMode.value === 'create') {
      const maxNo = ASSIGNMENT_LIST.reduce(
        (m, a) => Math.max(m, Number(a.id.slice(-4)) || 0), 0
      )
      ASSIGNMENT_LIST.push({
        ...form.value,
        id: 'RZ-' + String(maxNo + 1).padStart(4, '0')
      })
      ElMessage.success('任职记录已新增（原型演示，刷新后还原）')
    } else {
      const idx = ASSIGNMENT_LIST.findIndex((a) => a.id === form.value.id)
      if (idx > -1) ASSIGNMENT_LIST.splice(idx, 1, { ...form.value })
      ElMessage.success('任职记录已更新（原型演示，刷新后还原）')
    }
    dialogVisible.value = false
  })
}

function removeRow(row) {
  if (assignmentStatus(row) === '在任') {
    ElMessageBox.confirm(
      '该任职仍在任，删除后该节点在岗人数将同步减少。确认删除？',
      '删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    ).then(() => doRemove(row)).catch(() => {})
  } else {
    doRemove(row)
  }
}

function doRemove(row) {
  const idx = ASSIGNMENT_LIST.findIndex((a) => a.id === row.id)
  if (idx > -1) ASSIGNMENT_LIST.splice(idx, 1)
  ElMessage.success('已删除（原型演示，刷新后还原）')
}

/** 离任：回填任职止为今天 */
function leave(row) {
  ElMessageBox.confirm(
    `确认将「${row.personName}」标记为离任？任职止将置为今天。`,
    '离任确认',
    { type: 'warning', confirmButtonText: '确认离任', cancelButtonText: '取消' }
  ).then(() => {
    const idx = ASSIGNMENT_LIST.findIndex((a) => a.id === row.id)
    if (idx > -1) {
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, '0')
      const d = String(today.getDate()).padStart(2, '0')
      ASSIGNMENT_LIST.splice(idx, 1, { ...row, endDate: `${y}-${m}-${d}` })
    }
    ElMessage.success('已标记离任（原型演示，刷新后还原）')
  }).catch(() => {})
}

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}
</script>

<template>
  <div class="tab-body">
    <div class="summary-bar">
      <span>任职记录 <b>{{ ASSIGNMENT_LIST.length }}</b> 条</span>
      <span class="sep">·</span>
      <span>在任 <b>{{ summary.onDuty }}</b> 人</span>
      <span class="sep">·</span>
      <span>已离任 <b>{{ summary.left }}</b> 人</span>
      <span class="sep">·</span>
      <span>第一责任人 <b>{{ summary.first }}</b> 人</span>
      <span class="sep">·</span>
      <span :class="{ 'gap-warn': summary.noCert > 0 }">无证在任 <b>{{ summary.noCert }}</b> 人</span>
    </div>

    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索姓名 / 工号 / 岗位" clearable style="width: 200px" />
        <el-select v-model="filterNode" placeholder="组织节点" clearable style="width: 160px">
          <el-option v-for="n in NODE_LIST" :key="n.id" :label="n.name" :value="n.id" />
        </el-select>
        <el-select v-model="filterDuty" placeholder="责任人标识" clearable style="width: 150px">
          <el-option v-for="d in DUTY_TAGS" :key="d" :label="d" :value="d" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="任职状态" clearable style="width: 110px">
          <el-option label="在任" value="在任" />
          <el-option label="已离任" value="已离任" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增任职</el-button>
    </div>

    <el-table :data="tableData" stripe border size="small" style="width: 100%">
      <el-table-column prop="id" label="任职编号" width="100" />
      <el-table-column prop="personName" label="姓名" width="80">
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.personName }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="empNo" label="工号" width="80" />
      <el-table-column label="岗位" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.positionName }}</template>
      </el-table-column>
      <el-table-column label="组织节点" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ nodeName(row.nodeId) }}</template>
      </el-table-column>
      <el-table-column label="所属主体" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ subjectName(row.subjectId) }}</template>
      </el-table-column>
      <el-table-column prop="dutyTag" label="责任人标识" width="130" align="center">
        <template #default="{ row }">
          <el-tag :type="dutyTagType[row.dutyTag]" size="small" effect="light">{{ row.dutyTag }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="是否持证" width="85" align="center">
        <template #default="{ row }">
          <el-tag
            :type="hasCertOf(row.personId) === '是' ? 'success' : 'danger'"
            size="small"
            effect="light"
          >{{ hasCertOf(row.personId) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="任职期" width="185">
        <template #default="{ row }">
          <span class="date-range">
            {{ row.startDate }} ~ {{ row.endDate || '至今' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag
            :type="assignmentStatus(row) === '在任' ? 'success' : 'info'"
            size="small"
            effect="light"
          >{{ assignmentStatus(row) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button
            v-if="assignmentStatus(row) === '在任'"
            link
            type="warning"
            size="small"
            @click="leave(row)"
          >离任</el-button>
          <el-button link type="danger" size="small" @click="removeRow(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的任职记录" :image-size="80" />
      </template>
    </el-table>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增人员任职' : '编辑人员任职'"
      width="700px"
      destroy-on-close
      top="6vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="人员" prop="personId">
              <el-select
                v-model="form.personId"
                filterable
                style="width: 100%"
                placeholder="搜索姓名 / 工号"
                @change="onPersonChange"
              >
                <el-option
                  v-for="p in PERSON_LIST"
                  :key="p.id"
                  :label="`${p.name}（${p.empNo}）`"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工号">
              <el-input v-model="form.empNo" disabled placeholder="选择人员后自动带出" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属主体">
              <el-input :model-value="subjectName(form.subjectId)" disabled placeholder="选择人员后自动带出" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位" prop="positionId">
              <el-select v-model="form.positionId" style="width: 100%" @change="onPositionChange">
                <el-option v-for="p in POSITION_LIST" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组织节点" prop="nodeId">
              <el-select v-model="form.nodeId" style="width: 100%">
                <el-option
                  v-for="n in NODE_LIST"
                  :key="n.id"
                  :label="`${n.name}（${n.level}）`"
                  :value="n.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="责任人标识" prop="dutyTag">
              <el-select v-model="form.dutyTag" style="width: 100%">
                <el-option v-for="d in DUTY_TAGS" :key="d" :label="d" :value="d" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="责任范围">
              <el-select v-model="form.systems" multiple style="width: 100%" placeholder="选择专业系统">
                <el-option label="全部" value="全部" />
                <el-option v-for="s in GAS_SYSTEMS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="责任区域">
              <el-select
                v-model="form.areas"
                multiple
                filterable
                allow-create
                default-first-option
                style="width: 100%"
                placeholder="选择或输入区域，如「住院楼 3F」"
              >
                <el-option label="全部院区" value="全部院区" />
                <el-option label="门诊楼" value="门诊楼" />
                <el-option label="住院楼" value="住院楼" />
                <el-option label="感染楼" value="感染楼" />
                <el-option label="医技楼" value="医技楼" />
                <el-option label="液氧储罐区" value="液氧储罐区" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任职起" prop="startDate">
              <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任职止">
              <el-date-picker
                v-model="form.endDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="为空表示在任"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="form-tip">
          同一组织节点仅允许一个在任「第一责任人」；状态由任职止与当前日期自动判定，不可手工填写。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="任职详情" size="540px">
      <template v-if="detailRow">
        <div class="detail-title">
          {{ detailRow.personName }}
          <span class="detail-title-sub">{{ detailRow.empNo }}</span>
        </div>
        <div class="detail-sub">
          <el-tag :type="dutyTagType[detailRow.dutyTag]" size="small" effect="light">
            {{ detailRow.dutyTag }}
          </el-tag>
          <el-tag
            :type="assignmentStatus(detailRow) === '在任' ? 'success' : 'info'"
            size="small"
            effect="light"
          >{{ assignmentStatus(detailRow) }}</el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="岗位" :span="2">{{ detailRow.positionName }}</el-descriptions-item>
          <el-descriptions-item label="组织节点" :span="2">{{ nodeName(detailRow.nodeId) }}</el-descriptions-item>
          <el-descriptions-item label="所属主体" :span="2">{{ subjectName(detailRow.subjectId) }}</el-descriptions-item>
          <el-descriptions-item label="是否持证">
            <el-tag
              :type="hasCertOf(detailRow.personId) === '是' ? 'success' : 'danger'"
              size="small"
              effect="light"
            >{{ hasCertOf(detailRow.personId) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="持证状态">{{ personCertStatus(detailRow.personId) }}</el-descriptions-item>
          <el-descriptions-item label="任职起">{{ detailRow.startDate }}</el-descriptions-item>
          <el-descriptions-item label="任职止">{{ detailRow.endDate || '至今' }}</el-descriptions-item>
          <el-descriptions-item label="责任范围" :span="2">
            <div class="tag-row">
              <el-tag v-for="s in detailRow.systems" :key="s" size="small" type="primary" effect="plain">{{ s }}</el-tag>
              <span v-if="!detailRow.systems || !detailRow.systems.length" class="muted">未指定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="责任区域" :span="2">
            <div class="tag-row">
              <el-tag v-for="a in detailRow.areas" :key="a" size="small" effect="plain">{{ a }}</el-tag>
              <span v-if="!detailRow.areas || !detailRow.areas.length" class="muted">未指定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="hasCertOf(detailRow.personId) === '否'" class="alert-box danger">
          该人员无有效证件，按一票否决第①条判定为无证上岗，不得安排其承担需持证的作业任务。
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.tab-body { padding-top: 4px; }

.summary-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--ez-fill-light);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  margin-bottom: 12px;
}
.summary-bar b { color: var(--ez-text); font-variant-numeric: tabular-nums; }
.summary-bar .sep { color: var(--ez-text-muted); }
.gap-warn { color: var(--ez-danger); font-weight: 600; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.date-range { font-size: 12px; color: var(--ez-text-secondary); font-variant-numeric: tabular-nums; }

.form-tip {
  margin-top: 4px;
  padding: 8px 12px;
  background: var(--ez-primary-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.6;
}

.detail-title { font-size: 17px; font-weight: 600; color: var(--ez-text); }
.detail-title-sub {
  font-size: 12px;
  font-weight: 400;
  color: var(--ez-text-muted);
  margin-left: 6px;
}
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.tag-row { display: flex; gap: 4px; flex-wrap: wrap; }
.muted { font-size: 12px; color: var(--ez-text-muted); }

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
</style>
