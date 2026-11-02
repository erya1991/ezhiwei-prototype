<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  NODE_LIST, NODE_LEVELS, NODE_TYPES, SUBJECT_LIST, GAS_SYSTEMS,
  ASSIGNMENT_LIST, assignmentStatus, countOnDutyByNode, buildNodeTree, LEVEL_CODE
} from '../../data/responsibility'

const keyword = ref('')
const filterLevel = ref('')
const selectedNodeId = ref('')

const treeData = computed(() => buildNodeTree())

const nodeMap = computed(() => {
  const m = {}
  NODE_LIST.forEach((n) => { m[n.id] = n })
  return m
})

/** 收集某节点及其所有下级 id */
function collectSubtreeIds(rootId) {
  const ids = new Set([rootId])
  let changed = true
  while (changed) {
    changed = false
    NODE_LIST.forEach((n) => {
      if (n.parentId && ids.has(n.parentId) && !ids.has(n.id)) {
        ids.add(n.id)
        changed = true
      }
    })
  }
  return ids
}

const tableData = computed(() => {
  let list = NODE_LIST.slice()
  if (selectedNodeId.value) {
    const ids = collectSubtreeIds(selectedNodeId.value)
    list = list.filter((n) => ids.has(n.id))
  }
  if (filterLevel.value) list = list.filter((n) => n.level === filterLevel.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((n) => n.name.includes(k) || n.id.includes(k))
  }
  return list.sort((a, b) => (a.sortNo || 0) - (b.sortNo || 0))
})

/** 汇总：编制 / 在岗 / 缺口 */
const totals = computed(() => {
  const quota = tableData.value.reduce((s, n) => s + (n.quota || 0), 0)
  const onDuty = tableData.value.reduce((s, n) => s + countOnDutyByNode(n.id), 0)
  return { quota, onDuty, gap: quota - onDuty }
})

const levelTag = {
  决策层: 'danger',
  管理层: 'warning',
  执行层: 'primary',
  配合层: 'info'
}
const levelBar = {
  决策层: '#D93025',
  管理层: '#FF9500',
  执行层: '#2173D8',
  配合层: '#9B9B9B'
}

function subjectName(id) {
  const s = SUBJECT_LIST.find((x) => x.id === id)
  return s ? s.name : '—'
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '', name: '', level: '执行层', parentId: '', nodeType: '运行班组',
    subjectId: 'ZT-EPC-0001', systems: [], quota: 0,
    effectiveDate: '', sortNo: 10, status: '启用', remark: ''
  }
}

const rules = {
  name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择节点层级', trigger: 'change' }],
  nodeType: [{ required: true, message: '请选择节点类型', trigger: 'change' }],
  subjectId: [{ required: true, message: '请选择所属主体', trigger: 'change' }],
  effectiveDate: [{ required: true, message: '请选择生效日期', trigger: 'change' }]
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  if (selectedNodeId.value) form.value.parentId = selectedNodeId.value
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { ...row, systems: [...(row.systems || [])] }
  dialogVisible.value = true
}

/** 决策层不能有上级；非决策层必须有上级 */
function validateParent() {
  if (form.value.level === '决策层') {
    if (form.value.parentId) {
      ElMessage.warning('决策层节点不应有上级节点')
      return false
    }
  } else if (!form.value.parentId) {
    ElMessage.warning('非决策层节点必须选择上级节点')
    return false
  }
  return true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    if (!validateParent()) return
    if (dialogMode.value === 'create') {
      const code = LEVEL_CODE[form.value.level] || 'QT'
      const prefix = `ZZ-${code}-`
      const maxNo = NODE_LIST
        .filter((n) => n.id.startsWith(prefix))
        .reduce((m, n) => Math.max(m, Number(n.id.slice(-4)) || 0), 0)
      NODE_LIST.push({ ...form.value, id: prefix + String(maxNo + 1).padStart(4, '0') })
      ElMessage.success('组织节点已新增（原型演示，刷新后还原）')
    } else {
      const idx = NODE_LIST.findIndex((n) => n.id === form.value.id)
      if (idx > -1) NODE_LIST.splice(idx, 1, { ...form.value })
      ElMessage.success('组织节点已更新（原型演示，刷新后还原）')
    }
    dialogVisible.value = false
  })
}

function removeRow(row) {
  const children = NODE_LIST.filter((n) => n.parentId === row.id)
  if (children.length > 0) {
    ElMessage.warning(`该节点下有 ${children.length} 个下级节点，需先处理下级后才能删除`)
    return
  }
  const persons = ASSIGNMENT_LIST.filter(
    (a) => a.nodeId === row.id && assignmentStatus(a) === '在任'
  )
  if (persons.length > 0) {
    ElMessage.warning(`该节点下有 ${persons.length} 条在任任职，需先调整任职后才能删除`)
    return
  }
  ElMessageBox.confirm(`确认删除组织节点「${row.name}」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = NODE_LIST.findIndex((n) => n.id === row.id)
    if (idx > -1) NODE_LIST.splice(idx, 1)
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
const detailAssignments = computed(() =>
  detailRow.value
    ? ASSIGNMENT_LIST.filter(
        (a) => a.nodeId === detailRow.value.id && assignmentStatus(a) === '在任'
      )
    : []
)
const detailChildren = computed(() =>
  detailRow.value ? NODE_LIST.filter((n) => n.parentId === detailRow.value.id) : []
)

function resetFilter() {
  selectedNodeId.value = ''
  filterLevel.value = ''
  keyword.value = ''
}
</script>

<template>
  <div class="tab-body">
    <div class="split-row">
      <!-- 左树 -->
      <aside class="tree-panel">
        <div class="tree-head">
          <span>组织节点树</span>
          <el-button link type="primary" size="small" @click="resetFilter">重置</el-button>
        </div>
        <div class="tree-body">
          <el-tree
            :data="treeData"
            node-key="id"
            :props="{ label: 'name', children: 'children' }"
            default-expand-all
            highlight-current
            :expand-on-click-node="false"
            @node-click="(data) => (selectedNodeId = selectedNodeId === data.id ? '' : data.id)"
          >
            <template #default="{ data }">
              <div class="tree-node">
                <span class="tree-node-dot" :style="{ background: levelBar[data.level] }"></span>
                <span class="tree-node-name">{{ data.name }}</span>
                <span class="tree-node-count">
                  {{ countOnDutyByNode(data.id) }}/{{ data.quota }}
                </span>
              </div>
            </template>
          </el-tree>
        </div>
        <div class="tree-legend">
          <span v-for="(c, l) in levelBar" :key="l" class="legend-item">
            <i :style="{ background: c }"></i>{{ l }}
          </span>
        </div>
      </aside>

      <!-- 右表 -->
      <section class="table-area">
        <div class="toolbar">
          <div class="filters">
            <el-input v-model="keyword" placeholder="搜索节点名称 / 编号" clearable style="width: 200px" />
            <el-select v-model="filterLevel" placeholder="节点层级" clearable style="width: 120px">
              <el-option v-for="l in NODE_LEVELS" :key="l" :label="l" :value="l" />
            </el-select>
            <el-tag v-if="selectedNodeId" closable type="primary" @close="selectedNodeId = ''">
              {{ (nodeMap[selectedNodeId] || {}).name }}
            </el-tag>
          </div>
          <el-button type="primary" @click="openCreate">+ 新增节点</el-button>
        </div>

        <div class="summary-bar">
          <span>当前范围 <b>{{ tableData.length }}</b> 个节点</span>
          <span class="sep">·</span>
          <span>核定编制 <b>{{ totals.quota }}</b> 人</span>
          <span class="sep">·</span>
          <span>实际在岗 <b>{{ totals.onDuty }}</b> 人</span>
          <span class="sep">·</span>
          <span :class="{ 'gap-warn': totals.gap > 0 }">
            编制缺口 <b>{{ totals.gap > 0 ? totals.gap : 0 }}</b> 人
          </span>
        </div>

        <el-table :data="tableData" stripe border style="width: 100%" size="small">
          <el-table-column prop="id" label="节点编号" width="120" />
          <el-table-column prop="name" label="节点名称" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="level" label="层级" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="levelTag[row.level]" size="small" effect="light">{{ row.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="nodeType" label="节点类型" width="110" />
          <el-table-column label="上级节点" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.parentId ? (nodeMap[row.parentId] || {}).name : '—（最高层）' }}
            </template>
          </el-table-column>
          <el-table-column label="所属主体" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ subjectName(row.subjectId) }}</template>
          </el-table-column>
          <el-table-column label="编制/在岗" width="110" align="center">
            <template #default="{ row }">
              <span
                class="quota-cell"
                :class="{ over: countOnDutyByNode(row.id) > row.quota, lack: countOnDutyByNode(row.id) < row.quota }"
              >
                {{ countOnDutyByNode(row.id) }} / {{ row.quota }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="effectiveDate" label="生效日期" width="110" />
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
            <el-empty description="没有匹配的组织节点" :image-size="80" />
          </template>
        </el-table>
      </section>
    </div>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增组织节点' : '编辑组织节点'"
      width="680px"
      destroy-on-close
      top="7vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="节点名称" prop="name">
              <el-input v-model="form.name" maxlength="50" show-word-limit placeholder="如：液氧站运行班" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="节点层级" prop="level">
              <el-select v-model="form.level" style="width: 100%">
                <el-option v-for="l in NODE_LEVELS" :key="l" :label="l" :value="l" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="节点类型" prop="nodeType">
              <el-select v-model="form.nodeType" style="width: 100%">
                <el-option v-for="t in NODE_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上级节点">
              <el-select
                v-model="form.parentId"
                style="width: 100%"
                clearable
                :disabled="form.level === '决策层'"
                :placeholder="form.level === '决策层' ? '决策层无上级' : '选择上级节点'"
              >
                <el-option
                  v-for="n in NODE_LIST.filter((x) => x.id !== form.id)"
                  :key="n.id"
                  :label="`${n.name}（${n.level}）`"
                  :value="n.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属主体" prop="subjectId">
              <el-select v-model="form.subjectId" style="width: 100%">
                <el-option
                  v-for="s in SUBJECT_LIST"
                  :key="s.id"
                  :label="s.name"
                  :value="s.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="关联专业系统">
              <el-select v-model="form.systems" multiple style="width: 100%" placeholder="可多选">
                <el-option v-for="s in GAS_SYSTEMS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="编制人数">
              <el-input-number v-model="form.quota" :min="0" :max="99" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序号">
              <el-input-number v-model="form.sortNo" :min="1" :max="999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="生效日期" prop="effectiveDate">
              <el-date-picker v-model="form.effectiveDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="form-tip">
          节点编号按「ZZ-{层级代码}-{4位流水}」自动生成；在岗人数由人员任职实时统计，不可手工填写。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="组织节点详情" size="600px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.name }}</div>
        <div class="detail-sub">
          <el-tag :type="levelTag[detailRow.level]" size="small" effect="light">{{ detailRow.level }}</el-tag>
          <el-tag size="small" effect="plain">{{ detailRow.nodeType }}</el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="所属主体" :span="2">{{ subjectName(detailRow.subjectId) }}</el-descriptions-item>
          <el-descriptions-item label="上级节点">
            {{ detailRow.parentId ? (nodeMap[detailRow.parentId] || {}).name : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">{{ detailRow.status }}</el-descriptions-item>
          <el-descriptions-item label="编制人数">{{ detailRow.quota }}</el-descriptions-item>
          <el-descriptions-item label="在岗人数">
            <b :class="{ 'gap-warn': countOnDutyByNode(detailRow.id) < detailRow.quota }">
              {{ countOnDutyByNode(detailRow.id) }}
            </b>
          </el-descriptions-item>
          <el-descriptions-item label="生效日期">{{ detailRow.effectiveDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="排序号">{{ detailRow.sortNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关联专业系统" :span="2">
            <div class="tag-row">
              <el-tag v-for="s in detailRow.systems" :key="s" size="small" type="primary" effect="plain">{{ s }}</el-tag>
              <span v-if="!detailRow.systems || !detailRow.systems.length" class="muted">未指定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">在任人员（{{ detailAssignments.length }}）</div>
        <el-table :data="detailAssignments" size="small" border>
          <el-table-column prop="personName" label="姓名" width="90" />
          <el-table-column prop="positionName" label="岗位" min-width="120" />
          <el-table-column prop="dutyTag" label="责任人标识" width="130" />
          <el-table-column label="持证" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.hasCert === '是' ? 'success' : 'danger'" size="small" effect="light">
                {{ row.hasCert }}
              </el-tag>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="该节点暂无在任人员" :image-size="60" />
          </template>
        </el-table>

        <div class="drawer-section-title">下级节点（{{ detailChildren.length }}）</div>
        <el-table :data="detailChildren" size="small" border>
          <el-table-column prop="name" label="节点名称" min-width="150" />
          <el-table-column prop="level" label="层级" width="80" align="center" />
          <el-table-column label="编制/在岗" width="100" align="center">
            <template #default="{ row }">{{ countOnDutyByNode(row.id) }} / {{ row.quota }}</template>
          </el-table-column>
          <template #empty>
            <el-empty description="无下级节点" :image-size="60" />
          </template>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.tab-body { padding-top: 4px; }
.split-row { display: flex; gap: 14px; align-items: flex-start; }

.tree-panel {
  width: 270px;
  flex: 0 0 270px;
  border: 1px solid var(--ez-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--ez-fill-light);
}
.tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
  background: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid var(--ez-border);
}
.tree-body {
  padding: 8px 6px;
  max-height: 560px;
  overflow: auto;
}
.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  width: 100%;
  padding-right: 6px;
}
.tree-node-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: 0 0 6px;
}
.tree-node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-node-count {
  font-size: 11px;
  color: var(--ez-text-muted);
  font-variant-numeric: tabular-nums;
}
.tree-legend {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border-top: 1px solid var(--ez-border);
  background: rgba(255, 255, 255, 0.7);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ez-text-secondary);
}
.legend-item i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.table-area { flex: 1; min-width: 0; }
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

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
  margin-bottom: 10px;
}
.summary-bar b { color: var(--ez-text); font-variant-numeric: tabular-nums; }
.summary-bar .sep { color: var(--ez-text-muted); }
.gap-warn { color: var(--ez-danger); font-weight: 600; }

.quota-cell { font-variant-numeric: tabular-nums; }
.quota-cell.over { color: var(--ez-warning); font-weight: 600; }
.quota-cell.lack { color: var(--ez-danger); font-weight: 600; }

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
</style>
