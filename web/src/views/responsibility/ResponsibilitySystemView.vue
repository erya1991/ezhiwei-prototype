<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  SYSTEM_LIST, SYSTEM_CATEGORIES, SYSTEM_LEVELS, GAS_SYSTEMS, systemStatus
} from '../../data/responsibility'
import { usePager } from '../../composables/usePager'

// ---- 筛选 ----
const keyword = ref('')
const activeCategory = ref('')
const filterLevel = ref('')
const filterStatus = ref('')

const categoryCount = computed(() => {
  const m = {}
  SYSTEM_CATEGORIES.forEach((c) => { m[c.name] = 0 })
  SYSTEM_LIST.forEach((s) => { m[s.category] = (m[s.category] || 0) + 1 })
  return m
})

const tableData = computed(() => {
  let list = SYSTEM_LIST.slice()
  if (activeCategory.value) list = list.filter((s) => s.category === activeCategory.value)
  if (filterLevel.value) list = list.filter((s) => s.level === filterLevel.value)
  if (filterStatus.value) list = list.filter((s) => systemStatus(s) === filterStatus.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (s) => s.name.includes(k) || s.id.includes(k) || (s.keywords || '').includes(k)
    )
  }
  return list.sort((a, b) => (a.id > b.id ? 1 : -1))
})

const summary = computed(() => {
  const all = SYSTEM_LIST
  return {
    total: all.length,
    active: all.filter((s) => systemStatus(s) === '现行有效').length,
    pending: all.filter((s) => systemStatus(s) === '待生效').length,
    abolished: all.filter((s) => systemStatus(s) === '已废止').length,
    categories: new Set(all.map((s) => s.category)).size
  }
})

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())
const submitting = ref(false)

function emptyForm() {
  return {
    id: '', name: '', category: '安全生产责任制', level: '项目级',
    issuer: '医用气体项目部', version: 'V1.0',
    effectiveDate: '', expireDate: '',
    systems: [], keywords: '', attachments: [], remark: ''
  }
}

const rules = {
  name: [{ required: true, message: '请输入制度名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择制度分类', trigger: 'change' }],
  issuer: [{ required: true, message: '请输入发布单位', trigger: 'blur' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  effectiveDate: [{ required: true, message: '请选择生效日期', trigger: 'change' }]
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = { ...row, systems: [...(row.systems || [])], attachments: [...(row.attachments || [])] }
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    submitting.value = true
    if (dialogMode.value === 'create') {
      const cat = SYSTEM_CATEGORIES.find((c) => c.name === form.value.category)
      const prefix = `ZD-${cat ? cat.code : 'QT'}-`
      const maxNo = SYSTEM_LIST
        .filter((s) => s.id.startsWith(prefix))
        .reduce((m, s) => Math.max(m, Number(s.id.slice(-4)) || 0), 0)
      SYSTEM_LIST.push({ ...form.value, id: prefix + String(maxNo + 1).padStart(4, '0') })
      ElMessage.success('制度已新增（原型演示，刷新后还原）')
    } else {
      const idx = SYSTEM_LIST.findIndex((s) => s.id === form.value.id)
      if (idx > -1) SYSTEM_LIST.splice(idx, 1, { ...form.value })
      ElMessage.success('制度已更新（原型演示，刷新后还原）')
    }
    submitting.value = false
    dialogVisible.value = false
  })
}

function removeRow(row) {
  ElMessageBox.confirm(`确认删除制度「${row.name}」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = SYSTEM_LIST.findIndex((s) => s.id === row.id)
    if (idx > -1) SYSTEM_LIST.splice(idx, 1)
    ElMessage.success('已删除（原型演示，刷新后还原）')
  }).catch(() => {})
}

// ---- 批量导入 ----
const importVisible = ref(false)
const importFields = [
  '制度名称*', '制度分类*', '制度层级', '发布单位*', '版本号*',
  '生效日期*', '失效日期', '适用范围', '关键词', '备注'
]

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}

const statusTagType = {
  现行有效: 'success',
  待生效: 'warning',
  已废止: 'info'
}
const levelTagType = {
  公司级: 'danger',
  项目级: 'primary',
  班组级: 'info'
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">安全责任管理制度</h1>
        <p class="page-desc">
          十项管理制度按分类归档，状态由生效/失效日期自动判定。制度是责任体系、风险管控、隐患排查全部工作的依据来源。
        </p>
      </div>
      <div class="head-actions">
        <el-button @click="importVisible = true">批量导入</el-button>
        <el-button type="primary" @click="openCreate">+ 新增制度</el-button>
      </div>
    </div>

    <!-- 概览 -->
    <div class="stat-row">
      <div class="stat-card tone-primary">
        <div class="stat-label">制度总数</div>
        <div class="stat-value">{{ summary.total }}<span class="stat-unit">项</span></div>
      </div>
      <div class="stat-card tone-success">
        <div class="stat-label">现行有效</div>
        <div class="stat-value">{{ summary.active }}<span class="stat-unit">项</span></div>
      </div>
      <div class="stat-card tone-warning">
        <div class="stat-label">待生效</div>
        <div class="stat-value">{{ summary.pending }}<span class="stat-unit">项</span></div>
      </div>
      <div class="stat-card tone-muted">
        <div class="stat-label">已废止</div>
        <div class="stat-value">{{ summary.abolished }}<span class="stat-unit">项</span></div>
      </div>
      <div class="stat-card tone-primary">
        <div class="stat-label">已覆盖分类</div>
        <div class="stat-value">{{ summary.categories }}<span class="stat-unit">/ 10 类</span></div>
      </div>
    </div>

    <div class="content-row">
      <!-- 左侧分类 -->
      <aside class="cat-panel">
        <div class="cat-head">制度分类（十项）</div>
        <div class="cat-list">
          <div
            class="cat-item"
            :class="{ active: !activeCategory }"
            @click="activeCategory = ''"
          >
            <span class="cat-name">全部制度</span>
            <span class="cat-count">{{ SYSTEM_LIST.length }}</span>
          </div>
          <div
            v-for="c in SYSTEM_CATEGORIES"
            :key="c.name"
            class="cat-item"
            :class="{ active: activeCategory === c.name }"
            @click="activeCategory = activeCategory === c.name ? '' : c.name"
          >
            <span class="cat-name">{{ c.name }}</span>
            <span class="cat-count">{{ categoryCount[c.name] || 0 }}</span>
          </div>
        </div>
      </aside>

      <!-- 右侧列表 -->
      <section class="table-panel">
        <div class="toolbar">
          <div class="filters">
            <el-input
              v-model="keyword"
              placeholder="搜索制度名称 / 编号 / 关键词"
              clearable
              style="width: 250px"
            />
            <el-select v-model="filterLevel" placeholder="制度层级" clearable style="width: 130px">
              <el-option v-for="l in SYSTEM_LEVELS" :key="l" :label="l" :value="l" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 120px">
              <el-option label="现行有效" value="现行有效" />
              <el-option label="待生效" value="待生效" />
              <el-option label="已废止" value="已废止" />
            </el-select>
            <el-tag v-if="activeCategory" closable type="primary" @close="activeCategory = ''">
              {{ activeCategory }}
            </el-tag>
          </div>
          <span class="toolbar-count">{{ tableData.length }} 项</span>
        </div>

        <el-table :data="pagedRows" stripe border style="width: 100%">
          <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
          <el-table-column prop="id" label="制度编号" width="140" />
          <el-table-column prop="name" label="制度名称" min-width="230" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="制度分类" width="130" />
          <el-table-column prop="level" label="制度层级" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="levelTagType[row.level]" size="small" effect="light">{{ row.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="issuer" label="发布单位" min-width="140" show-overflow-tooltip />
          <el-table-column prop="version" label="版本号" width="90" align="center" />
          <el-table-column prop="effectiveDate" label="生效日期" width="110" />
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTagType[systemStatus(row)]" size="small" effect="light">
                {{ systemStatus(row) }}
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
            <el-empty description="没有匹配的制度" :image-size="80" />
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
      </section>
    </div>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增制度' : '编辑制度'"
      width="720px"
      destroy-on-close
      top="6vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="制度名称" prop="name">
              <el-input v-model="form.name" placeholder="如《医用气体安全管理制度》" maxlength="100" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="制度分类" prop="category">
              <el-select v-model="form.category" style="width: 100%">
                <el-option v-for="c in SYSTEM_CATEGORIES" :key="c.name" :label="c.name" :value="c.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="制度层级">
              <el-select v-model="form.level" style="width: 100%">
                <el-option v-for="l in SYSTEM_LEVELS" :key="l" :label="l" :value="l" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发布单位" prop="issuer">
              <el-input v-model="form.issuer" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版本号" prop="version">
              <el-input v-model="form.version" placeholder="如 V1.0 / 2026版" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生效日期" prop="effectiveDate">
              <el-date-picker
                v-model="form.effectiveDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="失效日期">
              <el-date-picker
                v-model="form.expireDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="为空表示现行有效"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="适用范围">
              <el-select v-model="form.systems" multiple style="width: 100%" placeholder="全系统适用可勾「全部」">
                <el-option label="全部" value="全部" />
                <el-option v-for="s in GAS_SYSTEMS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="制度正文">
              <el-upload
                action="#"
                :auto-upload="false"
                multiple
                :file-list="[]"
              >
                <el-button size="small" plain>选择文件（PDF / Word / 扫描件）</el-button>
                <template #tip>
                  <div class="upload-tip">原型阶段不实际上传，仅演示交互。</div>
                </template>
              </el-upload>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="关键词">
              <el-input v-model="form.keywords" placeholder="逗号分隔，供检索用" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="form-tip">
          制度编号按「ZD-{分类代码}-{4位流水}」自动生成；状态由生效/失效日期自动计算，不可手工修改。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入 -->
    <el-dialog v-model="importVisible" title="批量导入制度" width="560px">
      <div class="import-block">
        <div class="import-step">1. 下载模板</div>
        <el-button size="small" plain>下载《制度导入模板.xlsx》</el-button>
      </div>
      <div class="import-block">
        <div class="import-step">2. 按模板填写，带 * 为必填</div>
        <div class="field-tags">
          <el-tag
            v-for="f in importFields"
            :key="f"
            size="small"
            :type="f.endsWith('*') ? 'danger' : 'info'"
            effect="plain"
          >{{ f }}</el-tag>
        </div>
      </div>
      <div class="import-block">
        <div class="import-step">3. 上传并校验</div>
        <el-upload action="#" :auto-upload="false" :file-list="[]">
          <el-button size="small" plain>选择 Excel 文件</el-button>
        </el-upload>
        <div class="upload-tip">
          校验规则：制度分类必须在十类之内；生效日期格式为 YYYY-MM-DD；重复制度编号将被跳过并列入失败清单。
        </div>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">关闭</el-button>
        <el-button type="primary" @click="importVisible = false">开始导入（演示）</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="制度详情" size="600px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.name }}</div>
        <div class="detail-sub">
          <el-tag :type="statusTagType[systemStatus(detailRow)]" size="small" effect="light">
            {{ systemStatus(detailRow) }}
          </el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small" class="detail-desc">
          <el-descriptions-item label="制度分类">{{ detailRow.category }}</el-descriptions-item>
          <el-descriptions-item label="制度层级">{{ detailRow.level }}</el-descriptions-item>
          <el-descriptions-item label="发布单位">{{ detailRow.issuer }}</el-descriptions-item>
          <el-descriptions-item label="版本号">{{ detailRow.version }}</el-descriptions-item>
          <el-descriptions-item label="生效日期">{{ detailRow.effectiveDate }}</el-descriptions-item>
          <el-descriptions-item label="失效日期">{{ detailRow.expireDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="适用范围" :span="2">
            <div class="tag-row">
              <el-tag
                v-for="s in detailRow.systems"
                :key="s"
                size="small"
                type="primary"
                effect="plain"
              >{{ s }}</el-tag>
              <span v-if="!detailRow.systems || !detailRow.systems.length" class="muted">未指定</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="关键词" :span="2">
            {{ detailRow.keywords || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">制度正文附件</div>
        <div v-if="detailRow.attachments && detailRow.attachments.length" class="file-list">
          <div v-for="f in detailRow.attachments" :key="f" class="file-item">
            <span class="file-icon">📄</span>
            <span class="file-name">{{ f }}</span>
            <el-button link type="primary" size="small">下载</el-button>
          </div>
        </div>
        <el-empty v-else description="尚未上传正文" :image-size="60" />
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.page-wrap {
  position: fixed;
  top: var(--topbar-h);
  left: var(--sidebar-w);
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 18px 20px 20px;
  box-sizing: border-box;
  transition: left var(--transition);
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.page-title {
  margin: 0 0 6px;
  font-size: var(--ez-font-size-title);
  font-weight: 600;
  color: var(--ez-text);
}
.page-desc {
  margin: 0;
  max-width: 780px;
  font-size: var(--ez-font-size-caption);
  color: var(--ez-text-secondary);
  line-height: 1.7;
}
.head-actions {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}
.tone-primary::before { background: var(--ez-primary); }
.tone-success::before { background: var(--ez-success); }
.tone-warning::before { background: var(--ez-warning); }
.tone-muted::before { background: var(--ez-info); }
.stat-label {
  font-size: var(--ez-font-size-caption);
  color: var(--ez-text-secondary);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--ez-text);
  line-height: 1.1;
}
.stat-unit {
  font-size: 12px;
  font-weight: 400;
  color: var(--ez-text-muted);
  margin-left: 3px;
}

.content-row {
  display: flex;
  gap: 16px;
  align-items: stretch;
}

/* 左侧分类 */
.cat-panel {
  width: 190px;
  flex: 0 0 190px;
  min-height: 0;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  overflow: hidden;
}
.cat-head {
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
  border-bottom: 1px solid var(--ez-border);
}
.cat-list {
  padding: 6px;
  max-height: 660px;
  overflow: auto;
}
.cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--ez-text-secondary);
  transition: all 0.15s;
}
.cat-item:hover { background: rgba(33, 115, 216, 0.06); }
.cat-item.active {
  background: var(--ez-primary-bg);
  color: var(--ez-primary);
  font-weight: 600;
}
.cat-count {
  font-size: 11px;
  color: var(--ez-text-muted);
  font-variant-numeric: tabular-nums;
}
.cat-item.active .cat-count { color: var(--ez-primary); }

/* 右侧列表 */
.table-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 14px 16px 16px;
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
.toolbar-count {
  font-size: 12px;
  color: var(--ez-text-muted);
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
.upload-tip {
  font-size: 11px;
  color: var(--ez-text-muted);
  line-height: 1.6;
  margin-top: 4px;
}

.import-block { margin-bottom: 18px; }
.import-step {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
  margin-bottom: 8px;
}
.field-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 10px 12px;
  background: var(--ez-fill-light);
  border-radius: 6px;
}

.detail-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--ez-text);
  line-height: 1.5;
}
.detail-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 16px;
}
.detail-code {
  font-size: 12px;
  color: var(--ez-text-muted);
}
.detail-desc { margin-bottom: 8px; }
.tag-row { display: flex; gap: 4px; flex-wrap: wrap; }
.muted { font-size: 12px; color: var(--ez-text-muted); }

.drawer-section-title {
  margin: 20px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}
.file-list {
  border: 1px solid var(--ez-border);
  border-radius: 6px;
  overflow: hidden;
}
.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ez-border-light);
  font-size: 13px;
}
.file-item:last-child { border-bottom: none; }
.file-icon { font-size: 16px; }
.file-name { flex: 1; color: var(--ez-text); }

@media (max-width: 1280px) {
  .stat-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
/* ===== 页面骨架：主卡片撑满可视区 ===== */
.page-head,
.stat-row {
  flex: none;
}
.content-row {
  flex: 1 0 auto;
  min-height: 300px;
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
