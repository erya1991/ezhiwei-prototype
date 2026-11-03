<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  SUBJECT_LIST, SUBJECT_TYPES, GAS_SYSTEMS, NODE_LIST,
  countNodesBySubject, countPersonsBySubject
} from '../../data/responsibility'
import { usePager } from '../../composables/usePager'

const keyword = ref('')
const filterType = ref('')

const tableData = computed(() => {
  let list = SUBJECT_LIST.slice()
  if (filterType.value) list = list.filter((s) => s.type === filterType.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((s) => s.name.includes(k) || s.id.includes(k) || (s.contact || '').includes(k))
  }
  return list
})

const typeTag = {
  '我方 EPC 项目部': 'primary',
  院方: 'success',
  第三方维保单位: 'warning'
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '', name: '', type: '第三方维保单位', creditCode: '',
    contact: '', phone: '', contractNo: '',
    systems: [], serviceStart: '', serviceEnd: '',
    campusNodeId: '', status: '启用', remark: ''
  }
}

const rules = {
  name: [{ required: true, message: '请输入主体名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择主体类型', trigger: 'change' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入 11 位手机号', trigger: 'blur' }
  ],
  creditCode: [
    {
      validator: (rule, value, cb) => {
        // 院方、第三方必填；我方可空
        const needCredit = form.value.type !== '我方 EPC 项目部'
        if (needCredit && !value) return cb(new Error('该主体类型必须填写统一社会信用代码'))
        if (value && !/^[0-9A-Z]{18}$/.test(value)) return cb(new Error('统一社会信用代码应为 18 位大写字母或数字'))
        cb()
      },
      trigger: 'blur'
    }
  ]
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { ...row, systems: [...(row.systems || [])] }
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    if (dialogMode.value === 'create') {
      const codeMap = { '我方 EPC 项目部': 'EPC', 院方: 'HOS', 第三方维保单位: '3RD' }
      const prefix = `ZT-${codeMap[form.value.type] || 'OTH'}-`
      const maxNo = SUBJECT_LIST
        .filter((s) => s.id.startsWith(prefix))
        .reduce((m, s) => Math.max(m, Number(s.id.slice(-4)) || 0), 0)
      SUBJECT_LIST.push({ ...form.value, id: prefix + String(maxNo + 1).padStart(4, '0') })
      ElMessage.success('责任主体已新增（原型演示，刷新后还原）')
    } else {
      const idx = SUBJECT_LIST.findIndex((s) => s.id === form.value.id)
      if (idx > -1) SUBJECT_LIST.splice(idx, 1, { ...form.value })
      ElMessage.success('责任主体已更新（原型演示，刷新后还原）')
    }
    dialogVisible.value = false
  })
}

function removeRow(row) {
  const nodeCount = countNodesBySubject(row.id)
  const personCount = countPersonsBySubject(row.id)
  if (nodeCount > 0 || personCount > 0) {
    ElMessage.warning(
      `该主体下挂 ${nodeCount} 个组织节点、${personCount} 名任职人员，需先解除关联后才能删除`
    )
    return
  }
  ElMessageBox.confirm(`确认删除责任主体「${row.name}」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = SUBJECT_LIST.findIndex((s) => s.id === row.id)
    if (idx > -1) SUBJECT_LIST.splice(idx, 1)
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
const detailNodes = computed(() =>
  detailRow.value ? NODE_LIST.filter((n) => n.subjectId === detailRow.value.id) : []
)

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="tab-body">
    <div class="toolbar">
      <div class="filters">
        <el-input
          v-model="keyword"
          placeholder="搜索主体名称 / 编号 / 联系人"
          clearable
          style="width: 240px"
        />
        <el-select v-model="filterType" placeholder="主体类型" clearable style="width: 160px">
          <el-option v-for="t in SUBJECT_TYPES" :key="t" :label="t" :value="t" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增责任主体</el-button>
    </div>

    <el-table :data="pagedRows" stripe border style="width: 100%">
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="主体编号" width="140" />
      <el-table-column prop="name" label="主体名称" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="主体类型" width="150" align="center">
        <template #default="{ row }">
          <el-tag :type="typeTag[row.type]" size="small" effect="light">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="contact" label="联系人" width="90" />
      <el-table-column prop="phone" label="联系电话" width="120" />
      <el-table-column label="服务范围" min-width="200">
        <template #default="{ row }">
          <span class="system-text">
            {{ row.systems && row.systems.length === GAS_SYSTEMS.length
              ? '全部 8 大气体系统'
              : (row.systems || []).join('、') || '—' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="服务期限" width="190">
        <template #default="{ row }">
          <span class="date-range">{{ row.serviceStart }} ~ {{ row.serviceEnd }}</span>
        </template>
      </el-table-column>
      <el-table-column label="组织节点" width="100" align="center">
        <template #default="{ row }">
          <span class="num">{{ countNodesBySubject(row.id) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="在任人员" width="100" align="center">
        <template #default="{ row }">
          <span class="num">{{ countPersonsBySubject(row.id) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '启用' ? 'success' : 'info'" size="small" effect="light">
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
        <el-empty description="没有匹配的责任主体" :image-size="80" />
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
      :title="dialogMode === 'create' ? '新增责任主体' : '编辑责任主体'"
      width="700px"
      destroy-on-close
      top="7vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="主体名称" prop="name">
              <el-input v-model="form.name" maxlength="100" show-word-limit placeholder="单位全称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主体类型" prop="type">
              <el-select v-model="form.type" style="width: 100%">
                <el-option v-for="t in SUBJECT_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="统一社会信用代码" prop="creditCode">
              <el-input
                v-model="form.creditCode"
                maxlength="18"
                show-word-limit
                :placeholder="form.type === '我方 EPC 项目部' ? '我方可空' : '18 位'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系人" prop="contact">
              <el-input v-model="form.contact" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" maxlength="11" placeholder="11 位手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同编号">
              <el-input v-model="form.contractNo" maxlength="50" placeholder="我方可空" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联院区节点">
              <el-select v-model="form.campusNodeId" style="width: 100%" clearable placeholder="选择组织节点">
                <el-option
                  v-for="n in NODE_LIST"
                  :key="n.id"
                  :label="`${n.name}（${n.level}）`"
                  :value="n.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="服务范围">
              <el-select v-model="form.systems" multiple style="width: 100%" placeholder="选择专业系统">
                <el-option v-for="s in GAS_SYSTEMS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="服务期限起">
              <el-date-picker v-model="form.serviceStart" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="服务期限止">
              <el-date-picker v-model="form.serviceEnd" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="form-tip">
          主体编号按「ZT-{类型代码}-{4位流水}」自动生成；院方与第三方维保单位必须填写统一社会信用代码。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="责任主体详情" size="580px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.name }}</div>
        <div class="detail-sub">
          <el-tag :type="typeTag[detailRow.type]" size="small" effect="light">{{ detailRow.type }}</el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="统一社会信用代码" :span="2">
            {{ detailRow.creditCode || '—（我方主体可不填）' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系人">{{ detailRow.contact }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailRow.phone }}</el-descriptions-item>
          <el-descriptions-item label="合同编号" :span="2">{{ detailRow.contractNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="服务期限起">{{ detailRow.serviceStart || '—' }}</el-descriptions-item>
          <el-descriptions-item label="服务期限止">{{ detailRow.serviceEnd || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detailRow.status }}</el-descriptions-item>
          <el-descriptions-item label="关联院区节点">
            {{ (NODE_LIST.find((n) => n.id === detailRow.campusNodeId) || {}).name || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="服务范围" :span="2">
            <div class="tag-row">
              <el-tag v-for="s in detailRow.systems" :key="s" size="small" type="primary" effect="plain">
                {{ s }}
              </el-tag>
              <span v-if="!detailRow.systems || !detailRow.systems.length" class="muted">未指定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">该主体下的组织节点（{{ detailNodes.length }}）</div>
        <el-table :data="detailNodes" size="small" border>
          <el-table-column prop="name" label="节点名称" min-width="150" />
          <el-table-column prop="level" label="层级" width="80" align="center" />
          <el-table-column prop="nodeType" label="类型" width="110" />
          <template #empty>
            <el-empty description="该主体暂无组织节点" :image-size="60" />
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

.system-text { font-size: 12px; color: var(--ez-text-secondary); }
.date-range { font-size: 12px; color: var(--ez-text-secondary); font-variant-numeric: tabular-nums; }
.num { font-weight: 600; color: var(--ez-primary); font-variant-numeric: tabular-nums; }

.form-tip {
  margin-top: 4px;
  padding: 8px 12px;
  background: var(--ez-primary-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.6;
}

.detail-title { font-size: 17px; font-weight: 600; color: var(--ez-text); line-height: 1.5; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.tag-row { display: flex; gap: 4px; flex-wrap: wrap; }
.muted { font-size: 12px; color: var(--ez-text-muted); }
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
