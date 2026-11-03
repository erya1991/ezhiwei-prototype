<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  POSITION_LIST, ORG_LIST, PERSON_LIST,
  POSITION_CATEGORIES, CERT_TYPES, ASSESS_DIMENSIONS,
  countPersonsByPosition
} from '../../data/orgPersonnel'
import { usePager } from '../../composables/usePager'

// ---- 筛选 ----
const keyword = ref('')
const filterOrg = ref('')
const filterCategory = ref('')
const filterCert = ref('')

const tableData = computed(() => {
  let list = POSITION_LIST.slice()
  if (filterOrg.value) list = list.filter((p) => p.orgId === filterOrg.value)
  if (filterCategory.value) list = list.filter((p) => p.category === filterCategory.value)
  if (filterCert.value) list = list.filter((p) => p.needCert === filterCert.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((p) => p.name.includes(k) || p.id.includes(k))
  }
  return list.sort((a, b) => (a.sort || 0) - (b.sort || 0))
})

const summary = computed(() => {
  const quota = tableData.value.reduce((s, p) => s + (p.quota || 0), 0)
  const onDuty = tableData.value.reduce((s, p) => s + countPersonsByPosition(p.id), 0)
  const needCert = tableData.value.filter((p) => p.needCert === '是').length
  return { quota, onDuty, needCert, gap: quota - onDuty }
})

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())
const submitting = ref(false)

function emptyForm() {
  return {
    id: '', name: '', orgId: '', category: '操作岗', duty: '',
    quota: 1, needCert: '否', certTypes: [], assess: [], sort: 1, status: '启用', remark: ''
  }
}

const rules = {
  name: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
  orgId: [{ required: true, message: '请选择所属组织', trigger: 'change' }],
  category: [{ required: true, message: '请选择岗位类别', trigger: 'change' }],
  duty: [{ required: true, message: '请填写岗位职责', trigger: 'blur' }],
  needCert: [{ required: true, message: '请选择是否需持证', trigger: 'change' }]
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { ...row, certTypes: [...(row.certTypes || [])], assess: [...(row.assess || [])] }
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    submitting.value = true
    const org = ORG_LIST.find((o) => o.id === form.value.orgId)
    const payload = { ...form.value, orgName: org ? org.name : '' }
    if (dialogMode.value === 'create') {
      const maxNo = POSITION_LIST.reduce((m, p) => Math.max(m, Number(p.id.slice(-4)) || 0), 0)
      payload.id = 'GW-' + String(maxNo + 1).padStart(4, '0')
      POSITION_LIST.push(payload)
      ElMessage.success('岗位已新增（原型演示，刷新后还原）')
    } else {
      const idx = POSITION_LIST.findIndex((p) => p.id === form.value.id)
      if (idx > -1) POSITION_LIST.splice(idx, 1, payload)
      ElMessage.success('岗位已更新（原型演示，刷新后还原）')
    }
    submitting.value = false
    dialogVisible.value = false
  })
}

function removeRow(row) {
  const used = countPersonsByPosition(row.id)
  if (used > 0) {
    ElMessage.warning(`该岗位下有 ${used} 名在岗人员，需先调整人员岗位后才能删除`)
    return
  }
  ElMessageBox.confirm(`确认删除岗位「${row.name}」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = POSITION_LIST.findIndex((p) => p.id === row.id)
    if (idx > -1) POSITION_LIST.splice(idx, 1)
    ElMessage.success('已删除（原型演示，刷新后还原）')
  }).catch(() => {})
}

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}
const detailPersons = computed(() =>
  detailRow.value
    ? PERSON_LIST.filter((p) => p.positionId === detailRow.value.id && !p.leaveDate)
    : []
)

const categoryTagMap = {
  管理岗: 'danger',
  技术岗: 'warning',
  操作岗: 'primary',
  服务岗: 'info'
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="position-tab">
    <!-- 汇总条 -->
    <div class="summary-bar">
      <div class="sum-item">
        <span class="sum-label">岗位总数</span>
        <span class="sum-value">{{ tableData.length }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">核定编制</span>
        <span class="sum-value">{{ summary.quota }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">实际在岗</span>
        <span class="sum-value">{{ summary.onDuty }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">编制缺口</span>
        <span class="sum-value" :class="{ 'is-warn': summary.gap > 0 }">
          {{ summary.gap > 0 ? summary.gap : '已满编' }}
        </span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">需持证岗位</span>
        <span class="sum-value">{{ summary.needCert }}</span>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索岗位名称 / 编号" clearable style="width: 200px" />
        <el-select v-model="filterOrg" placeholder="所属组织" clearable style="width: 170px">
          <el-option v-for="o in ORG_LIST" :key="o.id" :label="o.name" :value="o.id" />
        </el-select>
        <el-select v-model="filterCategory" placeholder="岗位类别" clearable style="width: 130px">
          <el-option v-for="c in POSITION_CATEGORIES" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filterCert" placeholder="是否需持证" clearable style="width: 130px">
          <el-option label="需持证" value="是" />
          <el-option label="不需持证" value="否" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增岗位</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="pagedRows" stripe border style="width: 100%">
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="岗位编号" width="100" />
      <el-table-column prop="name" label="岗位名称" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="orgName" label="所属组织" min-width="150" show-overflow-tooltip />
      <el-table-column prop="category" label="岗位类别" width="100">
        <template #default="{ row }">
          <el-tag :type="categoryTagMap[row.category]" size="small" effect="light">{{ row.category }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="quota" label="编制人数" width="90" align="center" />
      <el-table-column label="在岗人数" width="90" align="center">
        <template #default="{ row }">
          <span :class="countPersonsByPosition(row.id) < row.quota ? 'num-warn' : 'num-ok'">
            {{ countPersonsByPosition(row.id) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="是否需持证" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.needCert === '是' ? 'danger' : 'info'" size="small" effect="plain">
            {{ row.needCert === '是' ? '需持证' : '不需' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '启用' ? 'success' : 'info'" size="small" effect="plain">
            {{ row.status }}
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
        <el-empty description="没有匹配的岗位" :image-size="80" />
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

    <div class="table-foot">共 {{ tableData.length }} 个岗位</div>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增岗位' : '编辑岗位'"
      width="680px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="岗位名称" prop="name">
              <el-input v-model="form.name" placeholder="如「气体管理员」" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属组织" prop="orgId">
              <el-select v-model="form.orgId" style="width: 100%">
                <el-option v-for="o in ORG_LIST" :key="o.id" :label="o.name" :value="o.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位类别" prop="category">
              <el-select v-model="form.category" style="width: 100%">
                <el-option v-for="c in POSITION_CATEGORIES" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编制人数">
              <el-input-number v-model="form.quota" :min="1" :max="999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="岗位职责" prop="duty">
              <el-input
                v-model="form.duty"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-word-limit
                placeholder="逐条列明职责，如「1. 建立并维护气体设备台账；2. ...」"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否需持证" prop="needCert">
              <el-radio-group v-model="form.needCert">
                <el-radio value="是">是</el-radio>
                <el-radio value="否">否</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序号">
              <el-input-number v-model="form.sort" :min="1" :max="99" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="所需证件类型">
              <el-select
                v-model="form.certTypes"
                multiple
                filterable
                allow-create
                placeholder="是否需持证为「是」时必填"
                style="width: 100%"
                :disabled="form.needCert === '否'"
              >
                <el-option v-for="c in CERT_TYPES" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="考核维度">
              <el-checkbox-group v-model="form.assess">
                <el-checkbox v-for="d in ASSESS_DIMENSIONS" :key="d" :value="d">{{ d }}</el-checkbox>
              </el-checkbox-group>
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
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="form-tip">
          「是否需持证」是一票否决的判据：设为「是」的岗位，其人员证件过期即视为无证上岗，直接判定不合格。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="岗位详情" size="520px">
      <template v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="岗位编号">{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="岗位名称">{{ detailRow.name }}</el-descriptions-item>
          <el-descriptions-item label="所属组织">{{ detailRow.orgName }}</el-descriptions-item>
          <el-descriptions-item label="岗位类别">{{ detailRow.category }}</el-descriptions-item>
          <el-descriptions-item label="编制人数">{{ detailRow.quota }}</el-descriptions-item>
          <el-descriptions-item label="在岗人数">{{ countPersonsByPosition(detailRow.id) }}</el-descriptions-item>
          <el-descriptions-item label="是否需持证">{{ detailRow.needCert }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detailRow.status }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">岗位职责</div>
        <div class="duty-box">{{ detailRow.duty || '—' }}</div>

        <div class="drawer-section-title">所需证件类型</div>
        <div class="tag-row">
          <el-tag
            v-for="c in detailRow.certTypes"
            :key="c"
            type="warning"
            size="small"
            effect="light"
          >{{ c }}</el-tag>
          <span v-if="!detailRow.certTypes || !detailRow.certTypes.length" class="muted">无</span>
        </div>

        <div class="drawer-section-title">考核维度</div>
        <div class="tag-row">
          <el-tag v-for="a in detailRow.assess" :key="a" size="small" effect="plain">{{ a }}</el-tag>
          <span v-if="!detailRow.assess || !detailRow.assess.length" class="muted">未配置</span>
        </div>

        <div class="drawer-section-title">在岗人员（{{ detailPersons.length }}）</div>
        <el-table :data="detailPersons" size="small" border>
          <el-table-column prop="name" label="姓名" width="80" />
          <el-table-column prop="phone" label="手机号" width="130" />
          <el-table-column prop="personType" label="人员类型" />
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.summary-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  margin-bottom: 14px;
  background: var(--ez-fill-light);
  border-radius: 8px;
  flex-wrap: wrap;
}
.sum-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.sum-label {
  font-size: 12px;
  color: var(--ez-text-secondary);
}
.sum-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--ez-text);
  font-variant-numeric: tabular-nums;
}
.sum-value.is-warn { color: var(--ez-warning); }
.sum-divider {
  width: 1px;
  height: 18px;
  background: var(--ez-border);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.table-foot {
  margin-top: 10px;
  font-size: 12px;
  color: var(--ez-text-muted);
  text-align: right;
}
.num-ok { color: var(--ez-success); font-weight: 600; }
.num-warn { color: var(--ez-warning); font-weight: 600; }

.form-tip {
  margin-top: 4px;
  padding: 8px 12px;
  background: var(--ez-primary-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.6;
}
.drawer-section-title {
  margin: 18px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}
.duty-box {
  padding: 10px 12px;
  background: var(--ez-fill-light);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--ez-text-secondary);
  white-space: pre-line;
}
.tag-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.muted { font-size: 12px; color: var(--ez-text-muted); }
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
