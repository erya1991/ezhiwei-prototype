<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  PERSON_LIST, ORG_LIST, POSITION_LIST, WORK_TYPE_LIST, CERT_LIST,
  PERSON_TYPES, CERT_TYPES,
  personCertStatus, certStatus, daysUntil
} from '../../data/orgPersonnel'
import { usePager } from '../../composables/usePager'

// ---- 筛选 ----
const keyword = ref('')
const filterOrg = ref('')
const filterPosition = ref('')
const filterType = ref('')
const filterDuty = ref('')
const filterCert = ref('')

const tableData = computed(() => {
  let list = PERSON_LIST.slice()
  if (filterOrg.value) list = list.filter((p) => p.orgId === filterOrg.value)
  if (filterPosition.value) list = list.filter((p) => p.positionId === filterPosition.value)
  if (filterType.value) list = list.filter((p) => p.personType === filterType.value)
  if (filterDuty.value) {
    list = list.filter((p) => (filterDuty.value === '在岗' ? !p.leaveDate : !!p.leaveDate))
  }
  if (filterCert.value) list = list.filter((p) => personCertStatus(p.id) === filterCert.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (p) => p.name.includes(k) || p.id.includes(k) || p.empNo.includes(k) || p.phone.includes(k)
    )
  }
  return list
})

const summary = computed(() => {
  const total = tableData.value.length
  const onDuty = tableData.value.filter((p) => !p.leaveDate).length
  const expired = tableData.value.filter((p) => personCertStatus(p.id) === '有证件已过期').length
  const expiring = tableData.value.filter((p) => personCertStatus(p.id) === '有证件即将到期').length
  return { total, onDuty, left: total - onDuty, expired, expiring }
})

// ---- 脱敏 ----
function maskIdCard(id) {
  if (!id || id.length < 10) return id || '—'
  return id.slice(0, 6) + '********' + id.slice(-4)
}

// ---- 在岗状态 ----
function dutyStatus(p) {
  return p.leaveDate ? '已离场' : '在岗'
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())
const submitting = ref(false)

function emptyForm() {
  return {
    id: '', name: '', empNo: '', gender: '男', phone: '', idCard: '',
    orgId: '', positionId: '', subject: '我方 EPC 项目部', personType: '自有员工',
    workTypeId: '', entryDate: '', leaveDate: '',
    emergencyContact: '', emergencyPhone: '', remark: ''
  }
}

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  empNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  orgId: [{ required: true, message: '请选择所属组织', trigger: 'change' }],
  positionId: [{ required: true, message: '请选择岗位', trigger: 'change' }],
  subject: [{ required: true, message: '请选择所属主体', trigger: 'change' }],
  personType: [{ required: true, message: '请选择人员类型', trigger: 'change' }],
  entryDate: [{ required: true, message: '请选择入场日期', trigger: 'change' }]
}

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

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    submitting.value = true
    const org = ORG_LIST.find((o) => o.id === form.value.orgId)
    const pos = POSITION_LIST.find((p) => p.id === form.value.positionId)
    const wt = WORK_TYPE_LIST.find((w) => w.id === form.value.workTypeId)
    const payload = {
      ...form.value,
      orgName: org ? org.name : '',
      positionName: pos ? pos.name : '',
      workTypeName: wt ? wt.name : ''
    }
    if (dialogMode.value === 'create') {
      const maxNo = PERSON_LIST.reduce((m, p) => Math.max(m, Number(p.id.slice(-4)) || 0), 0)
      payload.id = 'RY-' + String(maxNo + 1).padStart(4, '0')
      PERSON_LIST.push(payload)
      ElMessage.success('人员已新增（原型演示，刷新后还原）')
    } else {
      const idx = PERSON_LIST.findIndex((p) => p.id === form.value.id)
      if (idx > -1) PERSON_LIST.splice(idx, 1, payload)
      ElMessage.success('人员已更新（原型演示，刷新后还原）')
    }
    submitting.value = false
    dialogVisible.value = false
  })
}

function removeRow(row) {
  ElMessageBox.confirm(
    `确认删除人员「${row.name}」？该人员作为责任人的风险点、隐患单将失去归属。`,
    '删除确认',
    { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
  ).then(() => {
    const idx = PERSON_LIST.findIndex((p) => p.id === row.id)
    if (idx > -1) PERSON_LIST.splice(idx, 1)
    ElMessage.success('已删除（原型演示，刷新后还原）')
  }).catch(() => {})
}

// ---- 详情 + 持证子表 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
const detailCerts = computed(() =>
  detailRow.value ? CERT_LIST.filter((c) => c.personId === detailRow.value.id) : []
)

function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}

// 证件新增弹窗
const certDialogVisible = ref(false)
const certFormRef = ref(null)
const certForm = ref(emptyCertForm())
const certRules = {
  certType: [{ required: true, message: '请选择证件类型', trigger: 'change' }],
  certNo: [{ required: true, message: '请输入证件编号', trigger: 'blur' }],
  expireDate: [{ required: true, message: '请选择有效期至', trigger: 'change' }]
}

function emptyCertForm() {
  return {
    certType: '', certNo: '', issuer: '', issueDate: '', expireDate: '', remark: ''
  }
}

function openAddCert() {
  certForm.value = emptyCertForm()
  certDialogVisible.value = true
}

async function submitCert() {
  if (!certFormRef.value) return
  await certFormRef.value.validate((valid) => {
    if (!valid) return
    const maxNo = CERT_LIST.reduce((m, c) => Math.max(m, Number(c.id.slice(-8)) || 0), 0)
    CERT_LIST.push({
      ...certForm.value,
      id: 'ZZ-' + String(maxNo + 1).padStart(8, '0'),
      personId: detailRow.value.id,
      personName: detailRow.value.name
    })
    certDialogVisible.value = false
    ElMessage.success('证件已登记（原型演示，刷新后还原）')
  })
}

const certTagType = (d) => {
  const s = certStatus(d)
  if (s === '已过期') return 'danger'
  if (s === '即将到期') return 'warning'
  return 'success'
}

const dutyTagType = {
  在岗: 'success',
  已离场: 'info'
}
const certStatusTagType = {
  全部证件有效: 'success',
  有证件即将到期: 'warning',
  有证件已过期: 'danger',
  无证: 'info'
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="person-tab">
    <!-- 汇总 -->
    <div class="summary-bar">
      <div class="sum-item">
        <span class="sum-label">筛选结果</span>
        <span class="sum-value">{{ summary.total }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">在岗</span>
        <span class="sum-value is-ok">{{ summary.onDuty }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">已离场</span>
        <span class="sum-value is-muted">{{ summary.left }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">证件即将到期</span>
        <span class="sum-value is-warn">{{ summary.expiring }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">证件已过期</span>
        <span class="sum-value is-danger">{{ summary.expired }}</span>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索姓名 / 编号 / 工号 / 手机号" clearable style="width: 230px" />
        <el-select v-model="filterOrg" placeholder="所属组织" clearable style="width: 160px">
          <el-option v-for="o in ORG_LIST" :key="o.id" :label="o.name" :value="o.id" />
        </el-select>
        <el-select v-model="filterPosition" placeholder="岗位" clearable style="width: 170px">
          <el-option v-for="p in POSITION_LIST" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-select v-model="filterType" placeholder="人员类型" clearable style="width: 140px">
          <el-option v-for="t in PERSON_TYPES" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="filterDuty" placeholder="在岗状态" clearable style="width: 120px">
          <el-option label="在岗" value="在岗" />
          <el-option label="已离场" value="已离场" />
        </el-select>
        <el-select v-model="filterCert" placeholder="持证情况" clearable style="width: 160px">
          <el-option label="全部证件有效" value="全部证件有效" />
          <el-option label="有证件即将到期" value="有证件即将到期" />
          <el-option label="有证件已过期" value="有证件已过期" />
          <el-option label="无证" value="无证" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增人员</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="pagedRows" stripe border style="width: 100%">
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="人员编号" width="100" />
      <el-table-column prop="name" label="姓名" width="90" fixed="left">
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="empNo" label="工号" width="80" />
      <el-table-column prop="gender" label="性别" width="60" align="center" />
      <el-table-column prop="phone" label="手机号" width="120" />
      <el-table-column prop="orgName" label="所属组织" min-width="140" show-overflow-tooltip />
      <el-table-column prop="positionName" label="岗位" min-width="170" show-overflow-tooltip />
      <el-table-column prop="personType" label="人员类型" width="110" />
      <el-table-column prop="workTypeName" label="工种" width="120">
        <template #default="{ row }">{{ row.workTypeName || '—' }}</template>
      </el-table-column>
      <el-table-column label="持证情况" width="140">
        <template #default="{ row }">
          <el-tag
            :type="certStatusTagType[personCertStatus(row.id)]"
            size="small"
            effect="light"
          >{{ personCertStatus(row.id) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="entryDate" label="入场日期" width="110" />
      <el-table-column label="在岗状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="dutyTagType[dutyStatus(row)]" size="small" effect="plain">
            {{ dutyStatus(row) }}
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
        <el-empty description="没有匹配的人员" :image-size="80" />
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

    <div class="table-foot">共 {{ tableData.length }} 人</div>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增人员' : '编辑人员'"
      width="760px"
      destroy-on-close
      top="6vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <div class="form-section">基本信息</div>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="工号" prop="empNo">
              <el-input v-model="form.empNo" maxlength="20" placeholder="内部唯一工号" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="性别">
              <el-radio-group v-model="form.gender">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" maxlength="11" placeholder="用于接收派单通知" />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="身份证号">
              <el-input
                v-model="form.idCard"
                maxlength="18"
                placeholder="18 位，仅管理员可见全量"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section">组织与岗位</div>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="所属组织" prop="orgId">
              <el-select v-model="form.orgId" style="width: 100%">
                <el-option v-for="o in ORG_LIST" :key="o.id" :label="o.name" :value="o.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="岗位" prop="positionId">
              <el-select v-model="form.positionId" style="width: 100%">
                <el-option v-for="p in POSITION_LIST" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="工种">
              <el-select v-model="form.workTypeId" clearable style="width: 100%">
                <el-option v-for="w in WORK_TYPE_LIST" :key="w.id" :label="w.name" :value="w.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="所属主体" prop="subject">
              <el-select v-model="form.subject" style="width: 100%">
                <el-option label="我方 EPC 项目部" value="我方 EPC 项目部" />
                <el-option label="院方" value="院方" />
                <el-option label="第三方维保" value="第三方维保" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="人员类型" prop="personType">
              <el-select v-model="form.personType" style="width: 100%">
                <el-option v-for="t in PERSON_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section">入离场</div>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="入场日期" prop="entryDate">
              <el-date-picker
                v-model="form.entryDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="离场日期">
              <el-date-picker
                v-model="form.leaveDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="为空表示在职"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="在岗状态">
              <el-input :model-value="form.leaveDate ? '已离场' : '在岗'" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section">应急联系</div>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="紧急联系人">
              <el-input v-model="form.emergencyContact" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="紧急联系电话">
              <el-input v-model="form.emergencyPhone" maxlength="20" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>

        <div class="form-tip">
          人员编号、持证情况、在岗状态由系统生成；持证情况需在「人员详情 → 持证信息」中登记证件后自动计算。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 人员详情 -->
    <el-drawer v-model="drawerVisible" title="人员详情" size="640px">
      <template v-if="detailRow">
        <div class="detail-head">
          <div class="avatar">{{ detailRow.name.slice(0, 1) }}</div>
          <div class="head-info">
            <div class="head-name">
              {{ detailRow.name }}
              <el-tag :type="dutyTagType[dutyStatus(detailRow)]" size="small" effect="plain">
                {{ dutyStatus(detailRow) }}
              </el-tag>
            </div>
            <div class="head-sub">{{ detailRow.positionName }} · {{ detailRow.orgName }}</div>
          </div>
        </div>

        <el-descriptions :column="2" border size="small" class="detail-desc">
          <el-descriptions-item label="人员编号">{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="工号">{{ detailRow.empNo }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ detailRow.gender }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detailRow.phone }}</el-descriptions-item>
          <el-descriptions-item label="身份证号" :span="2">
            {{ maskIdCard(detailRow.idCard) }}
            <el-tag size="small" type="info" effect="plain" style="margin-left: 6px">脱敏</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="所属组织">{{ detailRow.orgName }}</el-descriptions-item>
          <el-descriptions-item label="岗位">{{ detailRow.positionName }}</el-descriptions-item>
          <el-descriptions-item label="所属主体">{{ detailRow.subject }}</el-descriptions-item>
          <el-descriptions-item label="人员类型">{{ detailRow.personType }}</el-descriptions-item>
          <el-descriptions-item label="工种">{{ detailRow.workTypeName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="持证情况">
            <el-tag
              :type="certStatusTagType[personCertStatus(detailRow.id)]"
              size="small"
              effect="light"
            >{{ personCertStatus(detailRow.id) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="入场日期">{{ detailRow.entryDate }}</el-descriptions-item>
          <el-descriptions-item label="离场日期">{{ detailRow.leaveDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="紧急联系人">{{ detailRow.emergencyContact || '—' }}</el-descriptions-item>
          <el-descriptions-item label="紧急联系电话">{{ detailRow.emergencyPhone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 持证信息子表 -->
        <div class="drawer-section-head">
          <span class="drawer-section-title">持证信息（{{ detailCerts.length }}）</span>
          <el-button type="primary" size="small" plain @click="openAddCert">+ 登记证件</el-button>
        </div>
        <el-table :data="detailCerts" size="small" border>
          <el-table-column prop="certType" label="证件类型" min-width="160" show-overflow-tooltip />
          <el-table-column prop="certNo" label="证件编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="expireDate" label="有效期至" width="110" />
          <el-table-column label="剩余天数" width="90" align="center">
            <template #default="{ row }">
              <span :class="daysUntil(row.expireDate) < 0 ? 'is-danger' : (daysUntil(row.expireDate) <= 30 ? 'is-warn' : '')">
                {{ daysUntil(row.expireDate) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="certTagType(row.expireDate)" size="small" effect="light">
                {{ certStatus(row.expireDate) }}
              </el-tag>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="尚未登记证件" :image-size="60" />
          </template>
        </el-table>
        <div v-if="personCertStatus(detailRow.id) === '有证件已过期'" class="alert-box danger">
          该人员存在已过期证件，若其岗位为「需持证」，按一票否决第①条判定为无证上岗，禁止安排作业。
        </div>
        <div v-else-if="personCertStatus(detailRow.id) === '有证件即将到期'" class="alert-box warning">
          该人员有证件 30 天内到期，请及时安排复审换证。
        </div>
      </template>
    </el-drawer>

    <!-- 登记证件 -->
    <el-dialog v-model="certDialogVisible" title="登记证件" width="520px" destroy-on-close>
      <el-form ref="certFormRef" :model="certForm" :rules="certRules" label-width="96px">
        <el-form-item label="证件类型" prop="certType">
          <el-select v-model="certForm.certType" style="width: 100%">
            <el-option v-for="c in CERT_TYPES" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="证件编号" prop="certNo">
          <el-input v-model="certForm.certNo" maxlength="50" />
        </el-form-item>
        <el-form-item label="发证机关">
          <el-input v-model="certForm.issuer" maxlength="100" />
        </el-form-item>
        <el-form-item label="发证日期">
          <el-date-picker
            v-model="certForm.issueDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="有效期至" prop="expireDate">
          <el-date-picker
            v-model="certForm.expireDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="certForm.remark" type="textarea" :rows="2" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="certDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCert">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.summary-bar {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 12px 16px;
  margin-bottom: 14px;
  background: var(--ez-fill-light);
  border-radius: 8px;
  flex-wrap: wrap;
}
.sum-item { display: flex; align-items: baseline; gap: 8px; }
.sum-label { font-size: 12px; color: var(--ez-text-secondary); }
.sum-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--ez-text);
  font-variant-numeric: tabular-nums;
}
.sum-value.is-ok { color: var(--ez-success); }
.sum-value.is-warn { color: var(--ez-warning); }
.sum-value.is-danger { color: var(--ez-danger); }
.sum-value.is-muted { color: var(--ez-text-muted); }
.sum-divider { width: 1px; height: 18px; background: var(--ez-border); }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.table-foot {
  margin-top: 10px;
  font-size: 12px;
  color: var(--ez-text-muted);
  text-align: right;
}

.form-section {
  margin: 4px 0 14px;
  padding-left: 8px;
  border-left: 3px solid var(--ez-primary);
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}
.form-tip {
  margin-top: 4px;
  padding: 8px 12px;
  background: var(--ez-primary-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.6;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 0 16px;
  border-bottom: 1px solid var(--ez-border);
  margin-bottom: 16px;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--ez-primary-bg);
  color: var(--ez-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
}
.head-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--ez-text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.head-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ez-text-secondary);
}
.detail-desc { margin-bottom: 8px; }

.drawer-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 10px;
}
.drawer-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}

.is-danger { color: var(--ez-danger); font-weight: 600; }
.is-warn { color: var(--ez-warning); font-weight: 600; }

.alert-box {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.7;
}
.alert-box.danger {
  background: rgba(217, 48, 37, 0.08);
  color: var(--ez-danger);
  border-left: 3px solid var(--ez-danger);
}
.alert-box.warning {
  background: rgba(255, 149, 0, 0.1);
  color: var(--ez-warning-text);
  border-left: 3px solid var(--ez-warning);
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
