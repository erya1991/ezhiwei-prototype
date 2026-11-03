<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  TYPE_LIST, TYPE_CATEGORIES, HAZARD_SYSTEMS, HAZARD_LEVELS, gradeOf, HAZARD_LIST
} from '../../data/hazard'
import { usePager } from '../../composables/usePager'

const keyword = ref('')
const activeCategory = ref('')
const filterEnabled = ref('')

const catColor = {
  建筑结构: '#6B6B6B',
  机电设备: '#2173D8',
  消防: '#D93025',
  环境: '#107C10',
  其他: '#7B3FF2'
}

const countByCategory = computed(() => {
  const m = {}
  TYPE_CATEGORIES.forEach((c) => { m[c] = 0 })
  TYPE_LIST.forEach((t) => { m[t.category] = (m[t.category] || 0) + 1 })
  return m
})

/** 各类型被隐患引用的次数 */
const usageOf = (typeId) => HAZARD_LIST.filter((h) => h.typeId === typeId).length

const tableData = computed(() => {
  let list = TYPE_LIST.slice()
  if (activeCategory.value) list = list.filter((t) => t.category === activeCategory.value)
  if (filterEnabled.value) list = list.filter((t) => t.enabled === filterEnabled.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((t) => t.name.includes(k) || t.id.includes(k) || (t.rule || '').includes(k))
  }
  return list.sort((a, b) => (a.sort || 0) - (b.sort || 0))
})

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '', name: '', category: '机电设备', systems: [], defaultLevel: '一般',
    rule: '', keywords: [], enabled: '启用', sort: TYPE_LIST.length + 1, remark: ''
  }
}

const rules = {
  name: [{ required: true, message: '请输入类型名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择类型分类', trigger: 'change' }],
  defaultLevel: [{ required: true, message: '请选择默认隐患等级', trigger: 'change' }]
}

const CAT_CODE = { 建筑结构: 'JZ', 机电设备: 'JD', 消防: 'XF', 环境: 'HJ', 其他: 'QT' }

/** 关键词输入（逗号分隔） */
const keywordText = ref('')
const keywordTags = ref([])

function addKeyword() {
  const k = keywordText.value.trim()
  if (!k) return
  if (!keywordTags.value.includes(k)) keywordTags.value.push(k)
  keywordText.value = ''
}
function removeKeyword(k) {
  keywordTags.value = keywordTags.value.filter((x) => x !== k)
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  keywordTags.value = []
  keywordText.value = ''
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { ...row, systems: [...(row.systems || [])] }
  keywordTags.value = [...(row.keywords || [])]
  keywordText.value = ''
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    if (keywordText.value.trim()) addKeyword()
    const payload = { ...form.value, keywords: [...keywordTags.value] }
    if (dialogMode.value === 'create') {
      const code = CAT_CODE[payload.category] || 'QT'
      const prefix = `LX-${code}-`
      const maxNo = TYPE_LIST
        .filter((t) => t.id.startsWith(prefix))
        .reduce((m, t) => Math.max(m, Number(t.id.slice(-4)) || 0), 0)
      payload.id = prefix + String(maxNo + 1).padStart(4, '0')
      TYPE_LIST.push(payload)
      ElMessage.success('隐患类型已新增（原型演示，刷新后还原）')
    } else {
      const idx = TYPE_LIST.findIndex((t) => t.id === payload.id)
      if (idx > -1) TYPE_LIST.splice(idx, 1, payload)
      ElMessage.success('隐患类型已更新（原型演示，刷新后还原）')
    }
    dialogVisible.value = false
  })
}

function toggleEnabled(row) {
  const used = usageOf(row.id)
  if (row.enabled === '启用' && used > 0) {
    ElMessage.warning(`该类型已被 ${used} 条隐患引用，停用后不影响历史数据，但新上报将不可选`)
  }
  const idx = TYPE_LIST.findIndex((t) => t.id === row.id)
  if (idx > -1) {
    TYPE_LIST.splice(idx, 1, { ...row, enabled: row.enabled === '启用' ? '停用' : '启用' })
    ElMessage.success(`已${row.enabled === '启用' ? '停用' : '启用'}（原型演示，刷新后还原）`)
  }
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="tab-body">
    <div class="type-note">
      类型库按建筑结构 / 机电设备 / 消防 / 环境 / 其他五类建。识别规则与匹配关键词用于 AI 识别（本期未启用）与手工上报时的类型推荐；一期可先只维护类型，规则字段可留空。
    </div>

    <div class="cat-row">
      <div class="cat-chip" :class="{ active: !activeCategory }" @click="activeCategory = ''">
        <span>全部</span><span class="chip-count">{{ TYPE_LIST.length }}</span>
      </div>
      <div
        v-for="c in TYPE_CATEGORIES"
        :key="c"
        class="cat-chip"
        :class="{ active: activeCategory === c }"
        @click="activeCategory = activeCategory === c ? '' : c"
      >
        <i :style="{ background: catColor[c] }"></i>
        <span>{{ c }}</span>
        <span class="chip-count">{{ countByCategory[c] || 0 }}</span>
      </div>
    </div>

    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索类型名称 / 编号 / 规则" clearable style="width: 240px" />
        <el-select v-model="filterEnabled" placeholder="启用状态" clearable style="width: 120px">
          <el-option label="启用" value="启用" />
          <el-option label="停用" value="停用" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增类型</el-button>
    </div>

    <el-table :data="pagedRows" stripe border size="small" style="width: 100%">
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="类型编号" width="115" />
      <el-table-column prop="name" label="类型名称" width="130" />
      <el-table-column label="类型分类" width="100" align="center">
        <template #default="{ row }">
          <span class="cat-tag" :style="{
            background: (catColor[row.category] || '#6B6B6B') + '1A',
            color: catColor[row.category] || '#6B6B6B'
          }">{{ row.category }}</span>
        </template>
      </el-table-column>
      <el-table-column label="适用专业系统" width="170">
        <template #default="{ row }">
          <span v-if="!row.systems || !row.systems.length" class="muted">通用</span>
          <div v-else class="tag-row">
            <el-tag v-for="s in row.systems" :key="s" size="small" effect="plain" type="primary">{{ s }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="默认等级" width="95" align="center">
        <template #default="{ row }">
          <span class="level-pill" :style="{
            background: gradeOf(row.defaultLevel).color + '1A',
            color: gradeOf(row.defaultLevel).color,
            borderColor: gradeOf(row.defaultLevel).color + '55'
          }">
            <i :style="{ background: gradeOf(row.defaultLevel).color }"></i>{{ row.defaultLevel }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="rule" label="识别规则描述" min-width="240" show-overflow-tooltip />
      <el-table-column label="匹配关键词" width="170">
        <template #default="{ row }">
          <div class="tag-row">
            <el-tag v-for="k in row.keywords" :key="k" size="small" effect="plain" type="info">{{ k }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="引用" width="70" align="center">
        <template #default="{ row }">
          <span class="use-count">{{ usageOf(row.id) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.enabled === '启用' ? 'success' : 'info'" size="small" effect="light">
            {{ row.enabled }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" size="small" @click="toggleEnabled(row)">
            {{ row.enabled === '启用' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的隐患类型" :image-size="80" />
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增隐患类型' : '编辑隐患类型'"
      width="700px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类型名称" prop="name">
              <el-input v-model="form.name" maxlength="100" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型分类" prop="category">
              <el-select v-model="form.category" style="width: 100%">
                <el-option v-for="c in TYPE_CATEGORIES" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认隐患等级" prop="defaultLevel">
              <el-select v-model="form.defaultLevel" style="width: 100%">
                <el-option v-for="l in HAZARD_LEVELS" :key="l" :label="l" :value="l" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序号">
              <el-input-number v-model="form.sort" :min="1" :max="999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="适用专业系统">
              <el-select v-model="form.systems" multiple style="width: 100%" placeholder="为空表示通用">
                <el-option v-for="s in HAZARD_SYSTEMS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="识别规则描述">
              <el-input
                v-model="form.rule"
                type="textarea"
                :rows="2"
                maxlength="300"
                show-word-limit
                placeholder="什么特征算这类隐患，如「管道接口有气泡、有嘶声」"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="匹配关键词">
              <div class="kw-box">
                <div class="kw-tags">
                  <el-tag
                    v-for="k in keywordTags"
                    :key="k"
                    closable
                    size="small"
                    @close="removeKeyword(k)"
                  >{{ k }}</el-tag>
                </div>
                <div class="kw-input">
                  <el-input
                    v-model="keywordText"
                    size="small"
                    placeholder="输入后回车添加"
                    style="width: 180px"
                    @keyup.enter="addKeyword"
                  />
                  <el-button size="small" @click="addKeyword">添加</el-button>
                </div>
              </div>
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
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tab-body { padding-top: 4px; }

.type-note {
  padding: 9px 14px;
  background: var(--ez-primary-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.cat-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.cat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--ez-border);
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  color: var(--ez-text-secondary);
  background: rgba(255, 255, 255, 0.6);
  transition: all 0.15s;
}
.cat-chip:hover { border-color: var(--ez-primary); }
.cat-chip.active {
  border-color: var(--ez-primary);
  background: var(--ez-primary-bg);
  color: var(--ez-primary);
  font-weight: 600;
}
.cat-chip i { width: 6px; height: 6px; border-radius: 50%; }
.chip-count { font-size: 11px; color: var(--ez-text-muted); font-variant-numeric: tabular-nums; }

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
  white-space: nowrap;
}
.tag-row { display: flex; gap: 3px; flex-wrap: wrap; }
.muted { color: var(--ez-text-muted); font-size: 12px; }
.use-count { font-weight: 600; color: var(--ez-primary); font-variant-numeric: tabular-nums; }

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

.kw-box { width: 100%; }
.kw-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; min-height: 22px; }
.kw-input { display: flex; gap: 8px; }
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
