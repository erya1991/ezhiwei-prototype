<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { FACTOR_LIST, FACTOR_CATEGORIES, GAS_SYSTEMS } from '../../data/risk'
import { usePager } from '../../composables/usePager'
const keyword = ref('')
const activeCategory = ref('')
const filterEnabled = ref('')

const categoryMeta = {
  人: { label: '人的因素', color: '#2173D8', desc: '资质、行为、状态、防护' },
  机: { label: '机的因素', color: '#7B3FF2', desc: '安全附件、仪表、密封、本体、电气' },
  料: { label: '料的因素', color: '#FF9500', desc: '介质、容器、备件' },
  法: { label: '法的因素', color: '#107C10', desc: '制度、流程、应急' },
  环: { label: '环的因素', color: '#6B6B6B', desc: '空间、气候、照明、标识' }
}

const countByCategory = computed(() => {
  const m = {}
  FACTOR_CATEGORIES.forEach((c) => { m[c] = 0 })
  FACTOR_LIST.forEach((f) => { m[f.category] = (m[f.category] || 0) + 1 })
  return m
})

const tableData = computed(() => {
  let list = FACTOR_LIST.slice()
  if (activeCategory.value) list = list.filter((f) => f.category === activeCategory.value)
  if (filterEnabled.value) list = list.filter((f) => f.enabled === filterEnabled.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((f) => f.name.includes(k) || f.id.includes(k) || f.desc.includes(k))
  }
  return list
})

// ---- 弹窗 ----
const dialogVisible = ref(false)
const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '', name: '', category: '人', sub: '', desc: '',
    systems: [], enabled: '启用'
  }
}

const rules = {
  name: [{ required: true, message: '请输入因素名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择因素分类', trigger: 'change' }]
}

const CAT_CODE = { 人: 'R', 机: 'J', 料: 'L', 法: 'F', 环: 'H' }

function openCreate() {
  form.value = emptyForm()
  if (activeCategory.value) form.value.category = activeCategory.value
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    const prefix = `YS-${CAT_CODE[form.value.category]}-`
    const maxNo = FACTOR_LIST
      .filter((f) => f.id.startsWith(prefix))
      .reduce((m, f) => Math.max(m, Number(f.id.slice(-4)) || 0), 0)
    FACTOR_LIST.push({
      ...form.value,
      id: prefix + String(maxNo + 1).padStart(4, '0'),
      refCount: 0
    })
    ElMessage.success('危害因素已新增（原型演示，刷新后还原）')
    dialogVisible.value = false
  })
}

function toggleEnabled(row) {
  const idx = FACTOR_LIST.findIndex((f) => f.id === row.id)
  if (idx > -1) {
    FACTOR_LIST.splice(idx, 1, {
      ...row,
      enabled: row.enabled === '启用' ? '停用' : '启用'
    })
    ElMessage.success(`已${row.enabled === '启用' ? '停用' : '启用'}（原型演示，刷新后还原）`)
  }
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="tab-body">
    <div class="factor-note">
      危害因素按「人、机、料、法、环」五类维护，是危险源描述的标准化词库。适用专业系统为空的表示全系统通用。
    </div>

    <div class="cat-row">
      <div
        class="cat-chip"
        :class="{ active: !activeCategory }"
        @click="activeCategory = ''"
      >
        <span class="chip-name">全部</span>
        <span class="chip-count">{{ FACTOR_LIST.length }}</span>
      </div>
      <div
        v-for="c in FACTOR_CATEGORIES"
        :key="c"
        class="cat-chip"
        :class="{ active: activeCategory === c }"
        :style="{ '--chip-color': categoryMeta[c].color }"
        @click="activeCategory = activeCategory === c ? '' : c"
      >
        <i :style="{ background: categoryMeta[c].color }"></i>
        <span class="chip-name">{{ categoryMeta[c].label }}</span>
        <span class="chip-count">{{ countByCategory[c] || 0 }}</span>
      </div>
    </div>

    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索因素名称 / 编号 / 描述" clearable style="width: 240px" />
        <el-select v-model="filterEnabled" placeholder="启用状态" clearable style="width: 120px">
          <el-option label="启用" value="启用" />
          <el-option label="停用" value="停用" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增因素</el-button>
    </div>

    <el-table :data="pagedRows" stripe border size="small" style="width: 100%">
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="因素编号" width="115" />
      <el-table-column prop="name" label="因素名称" min-width="150" />
      <el-table-column label="因素分类" width="110" align="center">
        <template #default="{ row }">
          <span class="cat-tag" :style="{
            background: categoryMeta[row.category].color + '1A',
            color: categoryMeta[row.category].color
          }">{{ categoryMeta[row.category].label }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="sub" label="二级分类" width="100" />
      <el-table-column prop="desc" label="典型表现" min-width="260" show-overflow-tooltip />
      <el-table-column label="适用专业系统" min-width="180">
        <template #default="{ row }">
          <span v-if="!row.systems || !row.systems.length" class="muted">通用</span>
          <div v-else class="tag-row">
            <el-tag v-for="s in row.systems" :key="s" size="small" effect="plain" type="primary">{{ s }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="引用次数" width="90" align="center">
        <template #default="{ row }">
          <span class="ref-count">{{ row.refCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.enabled === '启用' ? 'success' : 'info'" size="small" effect="light">
            {{ row.enabled }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="toggleEnabled(row)">
            {{ row.enabled === '启用' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的危害因素" :image-size="80" />
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

    <el-dialog v-model="dialogVisible" title="新增危害因素" width="620px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="因素名称" prop="name">
              <el-input v-model="form.name" maxlength="100" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="因素分类" prop="category">
              <el-select v-model="form.category" style="width: 100%">
                <el-option
                  v-for="c in FACTOR_CATEGORIES"
                  :key="c"
                  :label="categoryMeta[c].label"
                  :value="c"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="二级分类">
              <el-input v-model="form.sub" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="典型表现">
              <el-input v-model="form.desc" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="适用专业系统">
              <el-select v-model="form.systems" multiple style="width: 100%" placeholder="为空表示通用">
                <el-option v-for="s in GAS_SYSTEMS" :key="s" :label="s" :value="s" />
              </el-select>
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

.factor-note {
  padding: 9px 14px;
  background: var(--ez-primary-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.cat-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
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
.cat-chip i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.chip-count {
  font-size: 11px;
  color: var(--ez-text-muted);
  font-variant-numeric: tabular-nums;
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

.cat-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.tag-row { display: flex; gap: 3px; flex-wrap: wrap; }
.ref-count { font-weight: 600; color: var(--ez-primary); font-variant-numeric: tabular-nums; }
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
