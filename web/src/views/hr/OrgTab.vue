<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ORG_LIST, ORG_TYPES, PERSON_LIST, buildOrgTree, countPersonsByOrg
} from '../../data/orgPersonnel'
import { usePager } from '../../composables/usePager'

// ---- 状态 ----
const keyword = ref('')
const filterType = ref('')
const filterStatus = ref('')
const selectedOrgId = ref('')

const treeData = computed(() => buildOrgTree(ORG_LIST))

// ---- 派生 ----
const orgTypeMap = computed(() => {
  const m = {}
  ORG_LIST.forEach((o) => { m[o.id] = o.name })
  return m
})

const tableData = computed(() => {
  let list = ORG_LIST.slice()
  if (selectedOrgId.value) {
    const ids = collectDescendantIds(selectedOrgId.value)
    list = list.filter((o) => ids.has(o.id))
  }
  if (filterType.value) list = list.filter((o) => o.type === filterType.value)
  if (filterStatus.value) list = list.filter((o) => o.status === filterStatus.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((o) => o.name.includes(k) || o.id.includes(k) || o.leaderName.includes(k))
  }
  return list.sort((a, b) => (a.sort || 0) - (b.sort || 0))
})

function collectDescendantIds(rootId) {
  const ids = new Set([rootId])
  let changed = true
  while (changed) {
    changed = false
    ORG_LIST.forEach((o) => {
      if (o.parentId && ids.has(o.parentId) && !ids.has(o.id)) {
        ids.add(o.id)
        changed = true
      }
    })
  }
  return ids
}

// ---- 树交互 ----
function onTreeClick(node) {
  selectedOrgId.value = selectedOrgId.value === node.id ? '' : node.id
}
function clearOrgFilter() {
  selectedOrgId.value = ''
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())
const submitting = ref(false)

function emptyForm() {
  return {
    id: '', name: '', type: '部门', parentId: '', leaderId: '', phone: '',
    subject: '我方 EPC 项目部', sort: 1, status: '启用', remark: ''
  }
}

const rules = {
  name: [{ required: true, message: '请输入组织名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择组织类型', trigger: 'change' }],
  subject: [{ required: true, message: '请选择所属主体', trigger: 'change' }]
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  if (selectedOrgId.value) form.value.parentId = selectedOrgId.value
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { ...row }
  dialogVisible.value = true
}

function onLeaderChange(leaderId) {
  const p = PERSON_LIST.find((x) => x.id === leaderId)
  form.value.phone = p ? p.phone : ''
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    submitting.value = true
    const leader = PERSON_LIST.find((p) => p.id === form.value.leaderId)
    const payload = { ...form.value, leaderName: leader ? leader.name : '' }
    if (dialogMode.value === 'create') {
      const maxNo = ORG_LIST.reduce((m, o) => Math.max(m, Number(o.id.slice(-4)) || 0), 0)
      payload.id = 'ORG-' + String(maxNo + 1).padStart(4, '0')
      ORG_LIST.push(payload)
      ElMessage.success('组织已新增（原型演示，刷新后还原）')
    } else {
      const idx = ORG_LIST.findIndex((o) => o.id === form.value.id)
      if (idx > -1) ORG_LIST.splice(idx, 1, payload)
      ElMessage.success('组织已更新（原型演示，刷新后还原）')
    }
    submitting.value = false
    dialogVisible.value = false
  })
}

function removeOrg(row) {
  ElMessageBox.confirm(
    `确认删除组织「${row.name}」？删除后其下级组织将失去归属。`,
    '删除确认',
    { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
  ).then(() => {
    const idx = ORG_LIST.findIndex((o) => o.id === row.id)
    if (idx > -1) ORG_LIST.splice(idx, 1)
    ElMessage.success('已删除（原型演示，刷新后还原）')
  }).catch(() => {})
}

// ---- 详情抽屉 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}

const typeTagMap = {
  公司: 'danger',
  项目部: 'warning',
  部门: 'primary',
  班组: 'info'
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="org-tab">
    <!-- 左侧组织树 -->
    <aside class="tree-panel">
      <div class="tree-head">
        <span class="tree-title">组织架构</span>
        <el-button v-if="selectedOrgId" link type="primary" size="small" @click="clearOrgFilter">
          清除筛选
        </el-button>
      </div>
      <div class="tree-body">
        <el-tree
          :data="treeData"
          node-key="id"
          :props="{ label: 'name', children: 'children' }"
          :current-node-key="selectedOrgId"
          highlight-current
          default-expand-all
          :expand-on-click-node="false"
          @node-click="onTreeClick"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <span class="tree-node-name">{{ data.name }}</span>
              <span class="tree-node-count">{{ countPersonsByOrg(data.id, false) }}人</span>
            </span>
          </template>
        </el-tree>
      </div>
    </aside>

    <!-- 右侧列表 -->
    <section class="table-panel">
      <div class="toolbar">
        <div class="filters">
          <el-input
            v-model="keyword"
            placeholder="搜索组织名称 / 编号 / 负责人"
            clearable
            style="width: 240px"
          />
          <el-select v-model="filterType" placeholder="组织类型" clearable style="width: 130px">
            <el-option v-for="t in ORG_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 110px">
            <el-option label="启用" value="启用" />
            <el-option label="停用" value="停用" />
          </el-select>
          <el-tag v-if="selectedOrgId" closable type="primary" @close="clearOrgFilter">
            当前：{{ orgTypeMap[selectedOrgId] }}
          </el-tag>
        </div>
        <el-button type="primary" @click="openCreate">+ 新增组织</el-button>
      </div>

      <el-table :data="pagedRows" stripe border style="width: 100%" size="default">
        <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
        <el-table-column prop="id" label="组织编号" width="110" />
        <el-table-column prop="name" label="组织名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="组织类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeTagMap[row.type]" size="small" effect="light">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上级组织" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.parentId ? orgTypeMap[row.parentId] : '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="leaderName" label="负责人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="subject" label="所属主体" min-width="140" show-overflow-tooltip />
        <el-table-column label="人员数量" width="100" align="center">
          <template #default="{ row }">
            <span class="num-cell">{{ countPersonsByOrg(row.id, true) }}</span>
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
            <el-button link type="danger" size="small" @click="removeOrg(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有匹配的组织" :image-size="80" />
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

      <div class="table-foot">
        共 {{ tableData.length }} 个组织节点
      </div>
    </section>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增组织' : '编辑组织'"
      width="620px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="组织名称" prop="name">
              <el-input v-model="form.name" placeholder="如「液氧站运行班」" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组织类型" prop="type">
              <el-select v-model="form.type" style="width: 100%">
                <el-option v-for="t in ORG_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上级组织">
              <el-select v-model="form.parentId" clearable placeholder="公司为空" style="width: 100%">
                <el-option
                  v-for="o in ORG_LIST.filter((x) => x.id !== form.id)"
                  :key="o.id"
                  :label="o.name"
                  :value="o.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人">
              <el-select
                v-model="form.leaderId"
                clearable
                filterable
                placeholder="选择人员"
                style="width: 100%"
                @change="onLeaderChange"
              >
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
            <el-form-item label="联系电话">
              <el-input v-model="form.phone" placeholder="选择负责人后自动带出" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属主体" prop="subject">
              <el-select v-model="form.subject" style="width: 100%">
                <el-option label="我方 EPC 项目部" value="我方 EPC 项目部" />
                <el-option label="院方" value="院方" />
                <el-option label="第三方维保" value="第三方维保" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序号">
              <el-input-number v-model="form.sort" :min="1" :max="99" style="width: 100%" />
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
          提示：组织编号、人员数量由系统生成，不可手工填写。组织类型决定其在责任主体划分中的层级归属。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="组织详情" size="480px">
      <template v-if="detailRow">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="组织编号">{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="组织名称">{{ detailRow.name }}</el-descriptions-item>
          <el-descriptions-item label="组织类型">{{ detailRow.type }}</el-descriptions-item>
          <el-descriptions-item label="上级组织">
            {{ detailRow.parentId ? orgTypeMap[detailRow.parentId] : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="负责人">{{ detailRow.leaderName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailRow.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="所属主体">{{ detailRow.subject }}</el-descriptions-item>
          <el-descriptions-item label="人员数量">
            {{ countPersonsByOrg(detailRow.id, true) }} 人（含下级）
          </el-descriptions-item>
          <el-descriptions-item label="排序号">{{ detailRow.sort }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detailRow.status }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">本组织在岗人员</div>
        <el-table
          :data="PERSON_LIST.filter((p) => p.orgId === detailRow.id && !p.leaveDate)"
          size="small"
          border
        >
          <el-table-column prop="name" label="姓名" width="80" />
          <el-table-column prop="positionName" label="岗位" show-overflow-tooltip />
          <el-table-column prop="phone" label="手机号" width="120" />
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.org-tab {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* 左侧树 */
.tree-panel {
  width: 260px;
  flex: 0 0 260px;
  border: 1px solid var(--ez-border);
  border-radius: 8px;
  background: var(--ez-fill-light);
  overflow: hidden;
}
.tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ez-border);
  background: var(--ez-card-bg);
}
.tree-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}
.tree-body {
  padding: 8px;
  max-height: 640px;
  overflow: auto;
}
.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  font-size: 13px;
}
.tree-node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-node-count {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--ez-text-muted);
}

/* 右侧表格 */
.table-panel {
  flex: 1;
  min-width: 0;
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
.num-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--ez-primary);
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
