<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  WORK_TYPE_LIST, POSITION_LIST, WORK_TYPE_CATEGORIES, CERT_TYPES
} from '../../data/orgPersonnel'
import { usePager } from '../../composables/usePager'

const keyword = ref('')
const filterCategory = ref('')
const filterSpecial = ref('')

const tableData = computed(() => {
  let list = WORK_TYPE_LIST.slice()
  if (filterCategory.value) list = list.filter((w) => w.category === filterCategory.value)
  if (filterSpecial.value) list = list.filter((w) => w.isSpecial === filterSpecial.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((w) => w.name.includes(k) || w.id.includes(k))
  }
  return list
})

const specialCount = computed(() => WORK_TYPE_LIST.filter((w) => w.isSpecial === '是').length)

const positionName = (id) => {
  const p = POSITION_LIST.find((x) => x.id === id)
  return p ? p.name : id
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())
const submitting = ref(false)

function emptyForm() {
  return {
    id: '', name: '', category: '电气', isSpecial: '否',
    certTypes: [], positionIds: [], status: '启用', remark: ''
  }
}

const rules = {
  name: [{ required: true, message: '请输入工种名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择工种分类', trigger: 'change' }],
  isSpecial: [{ required: true, message: '请选择是否特种作业', trigger: 'change' }]
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
    certTypes: [...(row.certTypes || [])],
    positionIds: [...(row.positionIds || [])]
  }
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    submitting.value = true
    const payload = { ...form.value }
    if (dialogMode.value === 'create') {
      const maxNo = WORK_TYPE_LIST.reduce((m, w) => Math.max(m, Number(w.id.slice(-4)) || 0), 0)
      payload.id = 'GZ-' + String(maxNo + 1).padStart(4, '0')
      WORK_TYPE_LIST.push(payload)
      ElMessage.success('工种已新增（原型演示，刷新后还原）')
    } else {
      const idx = WORK_TYPE_LIST.findIndex((w) => w.id === form.value.id)
      if (idx > -1) WORK_TYPE_LIST.splice(idx, 1, payload)
      ElMessage.success('工种已更新（原型演示，刷新后还原）')
    }
    submitting.value = false
    dialogVisible.value = false
  })
}

function removeRow(row) {
  ElMessageBox.confirm(`确认删除工种「${row.name}」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = WORK_TYPE_LIST.findIndex((w) => w.id === row.id)
    if (idx > -1) WORK_TYPE_LIST.splice(idx, 1)
    ElMessage.success('已删除（原型演示，刷新后还原）')
  }).catch(() => {})
}

const categoryTagMap = {
  电气: 'warning',
  机械: 'primary',
  管道: 'success',
  焊接: 'danger',
  起重: 'info',
  其他: 'info'
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="worktype-tab">
    <div class="summary-bar">
      <div class="sum-item">
        <span class="sum-label">工种总数</span>
        <span class="sum-value">{{ WORK_TYPE_LIST.length }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">特种作业工种</span>
        <span class="sum-value is-danger">{{ specialCount }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="hint-text">
        工种决定「人做什么活」，岗位决定「人在哪个位置」。特种作业工种必须持证上岗。
      </div>
    </div>

    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索工种名称 / 编号" clearable style="width: 200px" />
        <el-select v-model="filterCategory" placeholder="工种分类" clearable style="width: 130px">
          <el-option v-for="c in WORK_TYPE_CATEGORIES" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filterSpecial" placeholder="是否特种作业" clearable style="width: 150px">
          <el-option label="特种作业" value="是" />
          <el-option label="非特种作业" value="否" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增工种</el-button>
    </div>

    <el-table :data="pagedRows" stripe border style="width: 100%">
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="工种编号" width="100" />
      <el-table-column prop="name" label="工种名称" min-width="150" />
      <el-table-column prop="category" label="工种分类" width="100">
        <template #default="{ row }">
          <el-tag :type="categoryTagMap[row.category]" size="small" effect="light">
            {{ row.category }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="是否特种作业" width="130" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isSpecial === '是' ? 'danger' : 'info'" size="small" effect="plain">
            {{ row.isSpecial === '是' ? '特种作业' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="所需证件类型" min-width="200">
        <template #default="{ row }">
          <div class="tag-row">
            <el-tag
              v-for="c in row.certTypes"
              :key="c"
              type="warning"
              size="small"
              effect="light"
            >{{ c }}</el-tag>
            <span v-if="!row.certTypes || !row.certTypes.length" class="muted">—</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="适用岗位" min-width="180">
        <template #default="{ row }">
          <div class="tag-row">
            <el-tag
              v-for="pid in row.positionIds"
              :key="pid"
              size="small"
              effect="plain"
            >{{ positionName(pid) }}</el-tag>
            <span v-if="!row.positionIds || !row.positionIds.length" class="muted">—</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '启用' ? 'success' : 'info'" size="small" effect="plain">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="removeRow(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的工种" :image-size="80" />
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

    <div class="table-foot">共 {{ tableData.length }} 个工种</div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增工种' : '编辑工种'"
      width="620px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="112px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="工种名称" prop="name">
              <el-input v-model="form.name" placeholder="如「维修电工」" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工种分类" prop="category">
              <el-select v-model="form.category" style="width: 100%">
                <el-option v-for="c in WORK_TYPE_CATEGORIES" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否特种作业" prop="isSpecial">
              <el-radio-group v-model="form.isSpecial">
                <el-radio value="是">是</el-radio>
                <el-radio value="否">否</el-radio>
              </el-radio-group>
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
            <el-form-item label="所需证件类型">
              <el-select
                v-model="form.certTypes"
                multiple
                filterable
                allow-create
                placeholder="特种作业为「是」时必填"
                style="width: 100%"
                :disabled="form.isSpecial === '否'"
              >
                <el-option v-for="c in CERT_TYPES" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="适用岗位">
              <el-select v-model="form.positionIds" multiple style="width: 100%">
                <el-option v-for="p in POSITION_LIST" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
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
.sum-value.is-danger { color: var(--ez-danger); }
.sum-divider { width: 1px; height: 18px; background: var(--ez-border); }
.hint-text {
  font-size: 12px;
  color: var(--ez-text-secondary);
  flex: 1;
  min-width: 240px;
}

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
.tag-row { display: flex; gap: 4px; flex-wrap: wrap; }
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
