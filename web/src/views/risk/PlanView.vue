<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  PLAN_LIST, PLAN_CATEGORIES, PLAN_STATUS, RISK_POINT_LIST,
  ACCIDENT_TYPES
} from '../../data/risk'
import { POSITION_LIST } from '../../data/orgPersonnel'

const keyword = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const filterPoint = ref('')

const tableData = computed(() => {
  let list = PLAN_LIST.slice()
  if (filterCategory.value) list = list.filter((p) => p.category === filterCategory.value)
  if (filterStatus.value) list = list.filter((p) => p.status === filterStatus.value)
  if (filterPoint.value) list = list.filter((p) => (p.points || []).includes(filterPoint.value))
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter((p) => p.name.includes(k) || p.id.includes(k) || p.drafter.includes(k))
  }
  return list
})

const stats = computed(() => {
  const published = PLAN_LIST.filter((p) => p.status === '已发布').length
  const draft = PLAN_LIST.filter((p) => p.status === '草稿').length
  const abolished = PLAN_LIST.filter((p) => p.status === '已废止').length
  const coveredPoints = new Set()
  PLAN_LIST.filter((p) => p.status === '已发布').forEach((p) => (p.points || []).forEach((x) => coveredPoints.add(x)))
  return { published, draft, abolished, covered: coveredPoints.size, total: RISK_POINT_LIST.length }
})

const statusTag = {
  草稿: 'info',
  已发布: 'success',
  已废止: 'danger'
}

const catColor = {
  综合应急预案: '#2173D8',
  专项应急预案: '#7B3FF2',
  现场处置方案: '#FF9500'
}

// ---- 弹窗 ----
const dialogVisible = ref(false)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: '', name: '', category: '专项应急预案', points: [], accidents: [], positions: [],
    drafter: '', drafterName: '', draftDate: '', version: 'V1.0',
    org: '', flow: '', resourceCount: 0, status: '草稿', publishDate: '', files: []
  }
}

const rules = {
  name: [{ required: true, message: '请输入预案名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择预案分类', trigger: 'change' }],
  points: [{ required: true, type: 'array', min: 1, message: '至少选择一个适用风险点', trigger: 'change' }],
  drafterName: [{ required: true, message: '请输入编制人', trigger: 'blur' }],
  draftDate: [{ required: true, message: '请选择编制日期', trigger: 'change' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const CAT_CODE = { 综合应急预案: 'ZH', 专项应急预案: 'ZX', 现场处置方案: 'XC' }

function openCreate() {
  dialogMode.value = 'create'
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = {
    ...row,
    points: [...(row.points || [])],
    accidents: [...(row.accidents || [])],
    positions: [...(row.positions || [])],
    files: [...(row.files || [])]
  }
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    const payload = { ...form.value }
    if (payload.status === '已发布' && !payload.publishDate) {
      const d = new Date()
      payload.publishDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    if (dialogMode.value === 'create') {
      const code = CAT_CODE[payload.category] || 'QT'
      const prefix = `YA-${code}-`
      const maxNo = PLAN_LIST
        .filter((p) => p.id.startsWith(prefix))
        .reduce((m, p) => Math.max(m, Number(p.id.slice(-4)) || 0), 0)
      payload.id = prefix + String(maxNo + 1).padStart(4, '0')
      PLAN_LIST.push(payload)
      ElMessage.success('应急预案已新增（原型演示，刷新后还原）')
    } else {
      const idx = PLAN_LIST.findIndex((p) => p.id === payload.id)
      if (idx > -1) PLAN_LIST.splice(idx, 1, payload)
      ElMessage.success('应急预案已更新（原型演示，刷新后还原）')
    }
    dialogVisible.value = false
  })
}

function revoke(row) {
  if (row.status !== '已发布') {
    ElMessage.info('只有「已发布」的预案可以废止')
    return
  }
  ElMessageBox.prompt('请填写废止原因（必填，不少于 5 个字）', '废止预案', {
    type: 'warning',
    confirmButtonText: '确认废止',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputValidator: (v) => (v && v.trim().length >= 5 ? true : '废止原因不少于 5 个字')
  }).then(({ value }) => {
    const idx = PLAN_LIST.findIndex((p) => p.id === row.id)
    if (idx > -1) {
      PLAN_LIST.splice(idx, 1, {
        ...PLAN_LIST[idx],
        status: '已废止',
        remark: (PLAN_LIST[idx].remark ? PLAN_LIST[idx].remark + '；' : '') + '废止原因：' + value.trim()
      })
    }
    ElMessage.success('已废止，该预案不再参与应急调阅')
  }).catch(() => {})
}

function publish(row) {
  if (row.status === '已发布') {
    ElMessage.info('该预案已发布')
    return
  }
  ElMessageBox.confirm(`确认发布「${row.name}」？发布后发布日期自动记录。`, '发布确认', {
    type: 'info', confirmButtonText: '确认发布', cancelButtonText: '取消'
  }).then(() => {
    const d = new Date()
    const ts = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const idx = PLAN_LIST.findIndex((p) => p.id === row.id)
    if (idx > -1) PLAN_LIST.splice(idx, 1, { ...row, status: '已发布', publishDate: ts })
    ElMessage.success('已发布（原型演示，刷新后还原）')
  }).catch(() => {})
}

function removeRow(row) {
  ElMessageBox.confirm(`确认删除预案「${row.name}」？`, '删除确认', {
    type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消'
  }).then(() => {
    const idx = PLAN_LIST.findIndex((p) => p.id === row.id)
    if (idx > -1) PLAN_LIST.splice(idx, 1)
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
const flowSteps = computed(() => {
  if (!detailRow.value || !detailRow.value.flow) return []
  return detailRow.value.flow.split(/→|->/).map((s) => s.trim()).filter(Boolean)
})
const pointNames = (ids) =>
  (ids || []).map((id) => {
    const p = RISK_POINT_LIST.find((x) => x.id === id)
    return p ? p.name : id
  })

function mockUpload() {
  ElMessage.info('原型阶段演示：实际环境支持上传 PDF / Word，单文件不超过 20MB')
}
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">风险应急预案</h1>
        <p class="page-desc">
          按综合应急预案、专项应急预案、现场处置方案三级编制。预案正文以附件形式上传，一期不做在线编辑；应急组织与响应流程以文本留档，便于演练与检查时快速查阅。
        </p>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat-card tone-primary">
        <div class="stat-label">预案总数</div>
        <div class="stat-value">{{ PLAN_LIST.length }}<span class="stat-unit">份</span></div>
      </div>
      <div class="stat-card tone-success">
        <div class="stat-label">已发布</div>
        <div class="stat-value">{{ stats.published }}<span class="stat-unit">份</span></div>
      </div>
      <div class="stat-card tone-warning">
        <div class="stat-label">草稿</div>
        <div class="stat-value">{{ stats.draft }}<span class="stat-unit">份</span></div>
      </div>
      <div class="stat-card tone-danger">
        <div class="stat-label">已废止</div>
        <div class="stat-value">{{ stats.abolished }}<span class="stat-unit">份</span></div>
      </div>
      <div class="stat-card tone-primary">
        <div class="stat-label">风险点预案覆盖</div>
        <div class="stat-value">
          {{ stats.covered }}<span class="stat-unit">/ {{ stats.total }}</span>
        </div>
        <div v-if="stats.covered < stats.total" class="stat-hint">
          {{ stats.total - stats.covered }} 个风险点尚无已发布预案
        </div>
      </div>
    </div>

    <div class="tab-card">
      <div class="toolbar">
        <div class="filters">
          <el-input v-model="keyword" placeholder="搜索预案名称 / 编号 / 编制人" clearable style="width: 230px" />
          <el-select v-model="filterCategory" placeholder="预案分类" clearable style="width: 145px">
            <el-option v-for="c in PLAN_CATEGORIES" :key="c" :label="c" :value="c" />
          </el-select>
          <el-select v-model="filterPoint" placeholder="适用风险点" clearable style="width: 165px">
            <el-option v-for="p in RISK_POINT_LIST" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 110px">
            <el-option v-for="s in PLAN_STATUS" :key="s" :label="s" :value="s" />
          </el-select>
        </div>
        <el-button type="primary" @click="openCreate">+ 新增预案</el-button>
      </div>

      <el-table :data="tableData" stripe border size="small" style="width: 100%">
        <el-table-column prop="id" label="预案编号" width="118" />
        <el-table-column prop="name" label="预案名称" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="预案分类" width="135" align="center">
          <template #default="{ row }">
            <span class="cat-tag" :style="{
              background: (catColor[row.category] || '#6B6B6B') + '1A',
              color: catColor[row.category] || '#6B6B6B'
            }">{{ row.category }}</span>
          </template>
        </el-table-column>
        <el-table-column label="适用风险点" min-width="180">
          <template #default="{ row }">
            <div class="tag-row">
              <el-tag
                v-for="n in pointNames(row.points)"
                :key="n"
                size="small"
                effect="plain"
                type="primary"
              >{{ n }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="适用事故类型" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ (row.accidents || []).join('、') || '—' }}</template>
        </el-table-column>
        <el-table-column prop="drafterName" label="编制人" width="80" />
        <el-table-column prop="draftDate" label="编制日期" width="105" />
        <el-table-column prop="version" label="版本" width="70" align="center" />
        <el-table-column label="正文附件" width="95" align="center">
          <template #default="{ row }">
            <span class="file-count" :class="{ zero: !(row.files || []).length }">
              {{ (row.files || []).length }} 个
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag[row.status]" size="small" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布日期" width="105">
          <template #default="{ row }">{{ row.publishDate || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="215" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status === '草稿'"
              link type="success" size="small"
              @click="publish(row)"
            >发布</el-button>
            <el-button
              v-if="row.status === '已发布'"
              link type="warning" size="small"
              @click="revoke(row)"
            >废止</el-button>
            <el-button link type="danger" size="small" @click="removeRow(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有匹配的应急预案" :image-size="80" />
        </template>
      </el-table>
    </div>

    <!-- 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增应急预案' : '编辑应急预案'"
      width="860px"
      destroy-on-close
      top="5vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="预案名称" prop="name">
              <el-input v-model="form.name" maxlength="100" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预案分类" prop="category">
              <el-select v-model="form.category" style="width: 100%">
                <el-option v-for="c in PLAN_CATEGORIES" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版本号" prop="version">
              <el-input v-model="form.version" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="适用风险点" prop="points">
              <el-select v-model="form.points" multiple filterable style="width: 100%">
                <el-option
                  v-for="p in RISK_POINT_LIST"
                  :key="p.id"
                  :label="`${p.name}（${p.id}）`"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="适用事故类型">
              <el-select v-model="form.accidents" multiple style="width: 100%">
                <el-option v-for="a in ACCIDENT_TYPES" :key="a" :label="a" :value="a" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="适用岗位">
              <el-select v-model="form.positions" multiple style="width: 100%">
                <el-option v-for="p in POSITION_LIST" :key="p.id" :label="p.name" :value="p.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编制单位">
              <el-input v-model="form.drafter" maxlength="100" placeholder="如：医用气体项目部" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编制人" prop="drafterName">
              <el-input v-model="form.drafterName" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编制日期" prop="draftDate">
              <el-date-picker v-model="form.draftDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="form.status" style="width: 100%">
                <el-option v-for="s in PLAN_STATUS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="应急组织">
              <el-input
                v-model="form.org"
                type="textarea"
                :rows="2"
                maxlength="300"
                show-word-limit
                placeholder="如：指挥组（李国强）、抢险组（刘志刚）、疏散组（吴晓丽）"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="响应流程">
              <el-input
                v-model="form.flow"
                type="textarea"
                :rows="2"
                maxlength="300"
                show-word-limit
                placeholder="用 → 分隔各环节，如：发现→报告→启动→处置→恢复→总结"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="预案正文">
              <div class="upload-box">
                <el-button size="small" @click="mockUpload">+ 上传附件</el-button>
                <span class="upload-tip">
                  支持 PDF / Word，可多附件。一期不做在线编辑。
                  <template v-if="(form.files || []).length">
                    已上传 {{ form.files.length }} 个：{{ form.files.join('、') }}
                  </template>
                </span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="应急预案详情" size="700px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.name }}</div>
        <div class="detail-sub">
          <span class="cat-tag" :style="{
            background: (catColor[detailRow.category] || '#6B6B6B') + '1A',
            color: catColor[detailRow.category] || '#6B6B6B'
          }">{{ detailRow.category }}</span>
          <el-tag :type="statusTag[detailRow.status]" size="small" effect="light">{{ detailRow.status }}</el-tag>
          <span class="detail-code">{{ detailRow.id }} · {{ detailRow.version }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="适用风险点" :span="2">
            <div class="tag-row">
              <el-tag
                v-for="n in pointNames(detailRow.points)"
                :key="n"
                size="small"
                effect="plain"
                type="primary"
              >{{ n }}</el-tag>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="适用事故类型" :span="2">
            {{ (detailRow.accidents || []).join('、') || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="适用岗位" :span="2">
            {{ (detailRow.positions || []).join('、') || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="编制单位">{{ detailRow.drafter || '—' }}</el-descriptions-item>
          <el-descriptions-item label="编制人">{{ detailRow.drafterName }}</el-descriptions-item>
          <el-descriptions-item label="编制日期">{{ detailRow.draftDate }}</el-descriptions-item>
          <el-descriptions-item label="发布日期">{{ detailRow.publishDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关联应急资源">{{ detailRow.resourceCount || 0 }} 项</el-descriptions-item>
          <el-descriptions-item label="版本号">{{ detailRow.version }}</el-descriptions-item>
          <el-descriptions-item label="应急组织" :span="2">{{ detailRow.org || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">响应流程</div>
        <div v-if="flowSteps.length" class="flow-track">
          <div v-for="(s, i) in flowSteps" :key="i" class="flow-node">
            <div class="flow-node-idx">{{ i + 1 }}</div>
            <div class="flow-node-text">{{ s }}</div>
            <div v-if="i < flowSteps.length - 1" class="flow-node-line"></div>
          </div>
        </div>
        <div v-else class="muted-text">未填写响应流程</div>

        <div class="drawer-section-title">预案正文附件（{{ (detailRow.files || []).length }}）</div>
        <div v-if="(detailRow.files || []).length" class="file-list">
          <div v-for="f in detailRow.files" :key="f" class="file-item">
            <span class="file-icon">PDF</span>
            <span class="file-name">{{ f }}</span>
            <el-button link type="primary" size="small" @click="mockUpload">下载</el-button>
          </div>
        </div>
        <el-empty v-else description="尚未上传预案正文" :image-size="60" />
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
.page-head { margin-bottom: 16px; }
.page-title {
  margin: 0 0 6px;
  font-size: var(--ez-font-size-title);
  font-weight: 600;
  color: var(--ez-text);
}
.page-desc {
  margin: 0;
  max-width: 900px;
  font-size: var(--ez-font-size-caption);
  color: var(--ez-text-secondary);
  line-height: 1.7;
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
  left: 0; top: 0; bottom: 0;
  width: 3px;
}
.tone-primary::before { background: var(--ez-primary); }
.tone-success::before { background: var(--ez-success); }
.tone-warning::before { background: var(--ez-warning); }
.tone-danger::before { background: var(--ez-danger); }
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
.stat-hint {
  margin-top: 4px;
  font-size: 11px;
  color: var(--ez-warning);
  line-height: 1.4;
}

.tab-card {
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
.file-count { font-weight: 600; color: var(--ez-primary); }
.file-count.zero { color: var(--ez-danger); }

.upload-box { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.upload-tip { font-size: 11px; color: var(--ez-text-muted); }

.detail-title { font-size: 15px; font-weight: 600; color: var(--ez-text); line-height: 1.6; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; flex-wrap: wrap; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.drawer-section-title {
  margin: 20px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}

.flow-track { display: flex; flex-direction: column; gap: 0; }
.flow-node {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  padding-bottom: 18px;
}
.flow-node-idx {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--ez-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
  z-index: 1;
}
.flow-node-text { font-size: 13px; color: var(--ez-text); }
.flow-node-line {
  position: absolute;
  left: 10px;
  top: 22px;
  bottom: 0;
  width: 2px;
  background: var(--ez-primary-bg);
}

.file-list { display: flex; flex-direction: column; gap: 8px; }
.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--ez-fill-light);
  border-radius: 6px;
}
.file-icon {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--ez-danger);
  border-radius: 3px;
  padding: 2px 5px;
}
.file-name { flex: 1; font-size: 12px; color: var(--ez-text); }
.muted-text { font-size: 12px; color: var(--ez-text-muted); }

@media (max-width: 1280px) {
  .stat-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
/* ===== 页面骨架：主卡片撑满可视区 ===== */
.page-head,
.stat-row {
  flex: none;
}
.tab-card {
  flex: 1 0 auto;
  min-height: 300px;
}
</style>
