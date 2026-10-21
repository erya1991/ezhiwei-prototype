<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const statusOptions = [
  { value: 'normal', label: '正常', type: 'success' },
  { value: 'pending', label: '待处理', type: 'warning' },
  { value: 'abnormal', label: '异常', type: 'danger' },
  { value: 'completed', label: '已完成', type: 'success' }
]
const categories = ['表单组件', '列表组件', '反馈组件']
const makeRows = () => Array.from({ length: 24 }, (_, index) => ({
  id: 'UI-' + String(index + 1).padStart(3, '0'),
  name: '组件示例 ' + String(index + 1).padStart(2, '0'),
  category: categories[index % categories.length],
  status: statusOptions[index % statusOptions.length].value,
  date: '2026-10-' + String(index + 1).padStart(2, '0'),
  note: '用于核对统一组件与主题，不关联业务模块。'
}))
const rows = ref(makeRows())
const emptyFilters = () => ({ keyword: '', status: '', dates: null })
const filters = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const currentPage = ref(1)
const pageSize = ref(10)
let nextId = 25

const filteredRows = computed(() => rows.value.filter(row => {
  const keyword = applied.keyword.trim().toLowerCase()
  return (!keyword || (row.id + ' ' + row.name).toLowerCase().includes(keyword)) &&
    (!applied.status || row.status === applied.status) &&
    (!applied.dates?.length || (row.date >= applied.dates[0] && row.date <= applied.dates[1]))
}))
const visibleRows = computed(() => {
  const offset = (currentPage.value - 1) * pageSize.value
  return filteredRows.value.slice(offset, offset + pageSize.value)
})
watch([() => filteredRows.value.length, pageSize], () => {
  const lastPage = Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value))
  currentPage.value = Math.min(currentPage.value, lastPage)
})
function query() {
  Object.assign(applied, {
    keyword: filters.keyword,
    status: filters.status,
    dates: filters.dates ? [...filters.dates] : null
  })
  currentPage.value = 1
}
function resetQuery() {
  Object.assign(filters, emptyFilters())
  Object.assign(applied, emptyFilters())
  currentPage.value = 1
}
function resetDemo() {
  rows.value = makeRows()
  nextId = 25
  resetQuery()
  ElMessage.success('已恢复本页的 24 条演示记录')
}
const getStatus = value => statusOptions.find(item => item.value === value)
const tagStyle = value => value === 'pending'
  ? { '--el-tag-text-color': 'var(--ez-warning-text)' }
  : undefined

const dialogVisible = ref(false)
const formRef = ref()
const emptyForm = () => ({ name: '', category: '', status: 'pending', date: '2026-10-21', note: '' })
const form = reactive(emptyForm())
const rules = {
  name: [
    { required: true, whitespace: true, message: '请输入记录名称', trigger: 'blur' },
    { max: 40, message: '记录名称最多 40 个字符', trigger: 'blur' }
  ],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }]
}
async function openCreate() {
  Object.assign(form, emptyForm())
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}
async function submitForm() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  rows.value.unshift({
    id: 'UI-' + String(nextId++).padStart(3, '0'),
    name: form.name.trim(),
    category: form.category,
    status: form.status,
    date: form.date,
    note: form.note.trim()
  })
  resetQuery()
  dialogVisible.value = false
  ElMessage.success('已添加到当前示例列表，筛选已重置；数据仅在本页临时保存')
}
function showFeedback(type) {
  const messages = {
    success: '成功提示示例：前端操作已完成',
    warning: '警告提示示例：请检查演示输入',
    error: '错误提示示例：这是主动展示的反馈，不是真实服务错误'
  }
  ElMessage({ type, message: messages[type], showClose: true, customClass: type === 'warning' ? 'ez-warning-message' : '' })
}
</script>

<template>
  <main class="ui-baseline" data-ui-baseline>
    <header class="ui-page-header">
      <div>
        <div class="ui-page-eyebrow">公共 UI · 开发预览</div>
        <h1>统一组件示例</h1>
        <p>筛选、分页、表单与反馈的参考用法。数据仅保存在当前页面。</p>
      </div>
      <div class="ui-actions">
        <el-tooltip content="只恢复本页临时数据，不影响任何业务模块" effect="light" placement="bottom">
          <el-button @click="resetDemo">恢复演示数据</el-button>
        </el-tooltip>
        <el-button type="primary" @click="openCreate">新增示例记录</el-button>
      </div>
    </header>

    <section class="ui-card" aria-labelledby="ui-filter-title">
      <h2 id="ui-filter-title">查询筛选</h2>
      <form class="ui-filters" @submit.prevent="query">
        <div class="ui-filter-field">
          <label for="ui-keyword">关键字</label>
          <el-input id="ui-keyword" v-model="filters.keyword" placeholder="按编号或名称查询" clearable />
        </div>
        <div class="ui-filter-field">
          <label for="ui-status">状态</label>
          <el-select id="ui-status" v-model="filters.status" placeholder="全部状态" clearable>
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="ui-filter-field">
          <label>示例日期</label>
          <el-date-picker
            v-model="filters.dates"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            range-separator="至"
          />
        </div>
        <div class="ui-actions ui-query-actions">
          <el-button type="primary" native-type="submit">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </div>
      </form>
    </section>

    <section class="ui-card ui-list-card" aria-labelledby="ui-list-title">
      <div class="ui-list-header">
        <div>
          <h2 id="ui-list-title">示例记录</h2>
          <p class="ui-list-summary" aria-live="polite">共 {{ rows.length }} 条，当前匹配 {{ filteredRows.length }} 条</p>
        </div>
        <el-dropdown trigger="click" @command="showFeedback">
          <el-button>反馈示例</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="success">成功提示</el-dropdown-item>
              <el-dropdown-item command="warning">警告提示</el-dropdown-item>
              <el-dropdown-item command="error">错误提示</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-table :data="visibleRows" row-key="id" border stripe max-height="420" empty-text="暂无匹配记录，请调整筛选条件">
        <el-table-column prop="id" label="编号" width="110" />
        <el-table-column prop="name" label="记录名称" min-width="200" />
        <el-table-column prop="category" label="类别" min-width="130" />
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <el-tag :type="getStatus(row.status).type" :style="tagStyle(row.status)">{{ getStatus(row.status).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="示例日期" min-width="130" />
        <el-table-column prop="note" label="说明" min-width="260" show-overflow-tooltip />
      </el-table>
      <div class="ui-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20]"
          :total="filteredRows.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="currentPage = 1"
        />
      </div>
    </section>

    <el-dialog
      class="ez-dialog"
      v-model="dialogVisible"
      title="新增示例记录"
      width="min(560px, calc(100vw - 32px))"
      align-center
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      @closed="Object.assign(form, emptyForm())"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="ui-record-form" @submit.prevent="submitForm">
        <el-form-item label="记录名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入示例名称" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="类别" prop="category">
          <el-select v-model="form.category" placeholder="请选择类别">
            <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="示例日期" prop="date">
          <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" placeholder="请选择示例日期" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" type="textarea" :rows="2" placeholder="可填写本条演示记录的说明" maxlength="120" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">提交演示数据</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.ui-baseline {
  position: fixed;
  inset: var(--topbar-h) 0 0 var(--sidebar-w);
  min-width: 0;
  overflow: auto;
  padding: var(--ez-page-padding);
  display: flex;
  flex-direction: column;
  gap: var(--ez-card-gap);
  background: var(--ez-page-bg);
  color: var(--ez-text);
  font-family: var(--ez-font-family);
  font-size: var(--ez-font-size-body);
}
.ui-page-header, .ui-list-header, .ui-actions {
  display: flex;
  align-items: center;
  gap: var(--ez-space-8);
}
.ui-page-header, .ui-list-header { justify-content: space-between; flex-wrap: wrap; gap: var(--ez-space-16); }
.ui-page-eyebrow { margin-bottom: var(--ez-space-8); color: var(--ez-primary); font-size: var(--ez-font-size-caption); }
h1 { font-size: var(--ez-font-size-title); font-weight: 600; line-height: 1.4; }
h2 { font-size: var(--ez-font-size-card-title); font-weight: 600; line-height: 1.5; }
.ui-page-header p, .ui-list-summary { margin-top: var(--ez-space-8); color: var(--ez-text-secondary); line-height: 1.6; }
.ui-card {
  min-width: 0;
  flex-shrink: 0;
  padding: var(--ez-space-24);
  border: 1px solid var(--ez-border);
  border-radius: var(--ez-card-radius);
  background: var(--ez-card-bg);
  box-shadow: var(--ez-card-shadow);
}
.ui-card > h2, .ui-list-header { margin-bottom: var(--ez-space-16); }
.ui-filters { display: grid; grid-template-columns: minmax(180px, 1.3fr) minmax(150px, .8fr) minmax(280px, 1.4fr) auto; gap: var(--ez-space-16); align-items: end; }
.ui-filter-field { min-width: 0; }
.ui-filter-field label { display: block; margin-bottom: var(--ez-space-8); color: var(--ez-text-secondary); }
.ui-filter-field :deep(.el-select), .ui-filter-field :deep(.el-date-editor), .ui-record-form :deep(.el-select), .ui-record-form :deep(.el-date-editor) { width: 100%; }
.ui-actions { flex-wrap: wrap; }
.ui-actions :deep(.el-button + .el-button) { margin-left: 0; }
.ui-pagination { display: flex; justify-content: flex-end; margin-top: var(--ez-space-16); overflow-x: auto; }
.ui-record-form { max-width: 100%; }
@media (max-width: 1100px) {
  .ui-filters { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .ui-query-actions { align-self: end; }
}
@media (max-width: 640px) {
  .ui-filters { grid-template-columns: minmax(0, 1fr); }
  .ui-card { padding: var(--ez-space-16); }
  .ui-pagination { justify-content: flex-start; }
}
</style>
