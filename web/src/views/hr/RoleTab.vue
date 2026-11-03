<script setup>
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ROLE_LIST, ROLE_TYPES, DATA_SCOPES,
  PERMISSION_MODULES, PERMISSION_ACTIONS
} from '../../data/orgPersonnel'
import { usePager } from '../../composables/usePager'

// 角色 → 关联人员数（Mock，实际应由人员-角色关联表统计）
const ROLE_MEMBER_COUNT = {
  'JS-0001': 1,
  'JS-0002': 3,
  'JS-0003': 5,
  'JS-0004': 8,
  'JS-0005': 12,
  'JS-0006': 4
}

const keyword = ref('')
const filterType = ref('')
const filterScope = ref('')

const tableData = computed(() => {
  let list = ROLE_LIST.slice()
  if (filterType.value) list = list.filter((r) => r.type === filterType.value)
  if (filterScope.value) list = list.filter((r) => r.scope === filterScope.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((r) => r.name.includes(k) || r.id.includes(k))
  }
  return list
})

const memberCount = (id) => ROLE_MEMBER_COUNT[id] || 0

// ---- 权限矩阵状态 ----
const permState = reactive({})

function resetPermState(permissions = []) {
  Object.keys(permState).forEach((k) => delete permState[k])
  PERMISSION_MODULES.forEach((m) => {
    m.menus.forEach((menu) => {
      permState[menu] = []
    })
  })
  permissions.forEach((p) => {
    const idx = p.lastIndexOf('-')
    if (idx === -1) return
    const menu = p.slice(0, idx)
    const action = p.slice(idx + 1)
    if (permState[menu] && !permState[menu].includes(action)) {
      permState[menu].push(action)
    }
  })
}

// 首次渲染前初始化，避免 el-checkbox-group 拿到 undefined
resetPermState([])

function collectPermissions() {
  const out = []
  Object.keys(permState).forEach((menu) => {
    permState[menu].forEach((a) => out.push(`${menu}-${a}`))
  })
  return out
}

// 快捷勾选：整模块全选 / 清空
function toggleModule(m, checked) {
  m.menus.forEach((menu) => {
    permState[menu] = checked ? [...PERMISSION_ACTIONS] : []
  })
}
function isModuleAllChecked(m) {
  return m.menus.every((menu) => (permState[menu] || []).length === PERMISSION_ACTIONS.length)
}
function moduleCheckedCount(m) {
  let n = 0
  m.menus.forEach((menu) => { n += (permState[menu] || []).length })
  return n
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())
const submitting = ref(false)

function emptyForm() {
  return { id: '', name: '', type: '业务角色', scope: '本组织', status: '启用', remark: '' }
}

const rules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择角色类型', trigger: 'change' }],
  scope: [{ required: true, message: '请选择数据范围', trigger: 'change' }]
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  resetPermState([])
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { ...row }
  resetPermState(row.permissions || [])
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    const perms = collectPermissions()
    if (!perms.length) {
      ElMessage.warning('请至少勾选一项功能权限')
      return
    }
    submitting.value = true
    const payload = { ...form.value, permissions: perms }
    if (dialogMode.value === 'create') {
      const maxNo = ROLE_LIST.reduce((m, r) => Math.max(m, Number(r.id.slice(-4)) || 0), 0)
      payload.id = 'JS-' + String(maxNo + 1).padStart(4, '0')
      ROLE_LIST.push(payload)
      ElMessage.success('角色已新增（原型演示，刷新后还原）')
    } else {
      const idx = ROLE_LIST.findIndex((r) => r.id === form.value.id)
      if (idx > -1) ROLE_LIST.splice(idx, 1, payload)
      ElMessage.success('角色已更新（原型演示，刷新后还原）')
    }
    submitting.value = false
    dialogVisible.value = false
  })
}

function removeRow(row) {
  if (row.type === '系统角色') {
    ElMessage.warning('系统角色不允许删除')
    return
  }
  ElMessageBox.confirm(`确认删除角色「${row.name}」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = ROLE_LIST.findIndex((r) => r.id === row.id)
    if (idx > -1) ROLE_LIST.splice(idx, 1)
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

const scopeDesc = {
  全部数据: '可查看系统内全部组织的数据',
  本主体: '仅可查看所属责任主体范围内的数据',
  本组织及下级: '可查看本组织及所有下级组织的数据',
  本组织: '仅可查看本组织的数据',
  本人: '仅可查看与本人相关的数据'
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="role-tab">
    <div class="summary-bar">
      <div class="sum-item">
        <span class="sum-label">角色总数</span>
        <span class="sum-value">{{ ROLE_LIST.length }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">系统角色</span>
        <span class="sum-value">{{ ROLE_LIST.filter((r) => r.type === '系统角色').length }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="sum-item">
        <span class="sum-label">业务角色</span>
        <span class="sum-value">{{ ROLE_LIST.filter((r) => r.type === '业务角色').length }}</span>
      </div>
      <div class="sum-divider"></div>
      <div class="hint-text">
        数据范围决定可见的组织/系统数据，是权限隔离的关键；一期按最小角色集建。
      </div>
    </div>

    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索角色名称 / 编号" clearable style="width: 200px" />
        <el-select v-model="filterType" placeholder="角色类型" clearable style="width: 130px">
          <el-option v-for="t in ROLE_TYPES" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="filterScope" placeholder="数据范围" clearable style="width: 150px">
          <el-option v-for="s in DATA_SCOPES" :key="s" :label="s" :value="s" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增角色</el-button>
    </div>

    <el-table :data="pagedRows" stripe border style="width: 100%">
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="角色编号" width="100" />
      <el-table-column prop="name" label="角色名称" min-width="150">
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="角色类型" width="110">
        <template #default="{ row }">
          <el-tag :type="row.type === '系统角色' ? 'danger' : 'primary'" size="small" effect="light">
            {{ row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="scope" label="数据范围" width="140" />
      <el-table-column label="功能权限" min-width="200">
        <template #default="{ row }">
          <span class="perm-count">{{ (row.permissions || []).length }} 项</span>
        </template>
      </el-table-column>
      <el-table-column label="关联人员数" width="110" align="center">
        <template #default="{ row }">
          <span class="member-count">{{ memberCount(row.id) }}</span>
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
          <el-button
            link
            type="danger"
            size="small"
            :disabled="row.type === '系统角色'"
            @click="removeRow(row)"
          >删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的角色" :image-size="80" />
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

    <div class="table-foot">共 {{ tableData.length }} 个角色</div>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增角色' : '编辑角色'"
      width="820px"
      destroy-on-close
      top="5vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="角色名称" prop="name">
              <el-input v-model="form.name" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="角色类型" prop="type">
              <el-select v-model="form.type" style="width: 100%">
                <el-option v-for="t in ROLE_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="数据范围" prop="scope">
              <el-select v-model="form.scope" style="width: 100%">
                <el-option v-for="s in DATA_SCOPES" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="功能权限">
          <div class="perm-matrix">
            <div v-for="m in PERMISSION_MODULES" :key="m.module" class="perm-module">
              <div class="perm-module-head">
                <span class="perm-module-name">{{ m.module }}</span>
                <span class="perm-module-count">{{ moduleCheckedCount(m) }} 项已勾选</span>
                <el-button link type="primary" size="small" @click="toggleModule(m, true)">全选</el-button>
                <el-button link size="small" @click="toggleModule(m, false)">清空</el-button>
              </div>
              <div v-for="menu in m.menus" :key="menu" class="perm-menu-row">
                <span class="perm-menu-name">{{ menu }}</span>
                <el-checkbox-group v-model="permState[menu]" size="small">
                  <el-checkbox v-for="a in PERMISSION_ACTIONS" :key="a" :value="a">{{ a }}</el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="启用" value="启用" />
                <el-option label="停用" value="停用" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="备注">
              <el-input v-model="form.remark" maxlength="100" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-tip">
          数据范围与功能权限共同决定可见数据：「功能权限」控制能进哪些菜单、能做什么动作；「数据范围」控制进入后能看到哪些组织的数据。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="角色详情" size="560px">
      <template v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="角色编号">{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="角色名称">{{ detailRow.name }}</el-descriptions-item>
          <el-descriptions-item label="角色类型">{{ detailRow.type }}</el-descriptions-item>
          <el-descriptions-item label="数据范围">{{ detailRow.scope }}</el-descriptions-item>
          <el-descriptions-item label="关联人员数">{{ memberCount(detailRow.id) }} 人</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detailRow.status }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-tip">{{ scopeDesc[detailRow.scope] }}</div>

        <div class="drawer-section-title">功能权限明细</div>
        <div v-for="m in PERMISSION_MODULES" :key="m.module" class="detail-perm-module">
          <div class="detail-perm-title">{{ m.module }}</div>
          <div v-for="menu in m.menus" :key="menu" class="detail-perm-row">
            <span class="detail-perm-menu">{{ menu }}</span>
            <span class="detail-perm-actions">
              <el-tag
                v-for="a in PERMISSION_ACTIONS"
                :key="a"
                size="small"
                :type="(detailRow.permissions || []).includes(`${menu}-${a}`) ? 'primary' : 'info'"
                :effect="(detailRow.permissions || []).includes(`${menu}-${a}`) ? 'light' : 'plain'"
                class="perm-tag"
              >{{ a }}</el-tag>
            </span>
          </div>
        </div>
      </template>
    </el-drawer>
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
.perm-count {
  font-size: 12px;
  color: var(--ez-text-secondary);
}
.member-count {
  font-weight: 600;
  color: var(--ez-primary);
  font-variant-numeric: tabular-nums;
}

/* 权限矩阵 */
.perm-matrix {
  width: 100%;
  max-height: 380px;
  overflow: auto;
  border: 1px solid var(--ez-border);
  border-radius: 6px;
  padding: 8px 12px;
  background: var(--ez-fill-light);
}
.perm-module { margin-bottom: 10px; }
.perm-module-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--ez-border);
  margin-bottom: 4px;
}
.perm-module-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}
.perm-module-count {
  font-size: 11px;
  color: var(--ez-text-muted);
  margin-right: auto;
}
.perm-menu-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 3px 0 3px 8px;
}
.perm-menu-name {
  width: 150px;
  flex: 0 0 150px;
  font-size: 12px;
  color: var(--ez-text-secondary);
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

.drawer-tip {
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--ez-primary-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
}
.drawer-section-title {
  margin: 18px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}
.detail-perm-module { margin-bottom: 12px; }
.detail-perm-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ez-text);
  margin-bottom: 6px;
  padding-left: 6px;
  border-left: 3px solid var(--ez-primary);
}
.detail-perm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0 3px 10px;
}
.detail-perm-menu {
  width: 150px;
  flex: 0 0 150px;
  font-size: 12px;
  color: var(--ez-text-secondary);
}
.detail-perm-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.perm-tag { min-width: 40px; justify-content: center; }
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
