<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knowledgeStore as store, demoContext, MATERIAL_TYPES, DOMAINS, PROJECTS, ROLES } from '../../data/knowledgeAiMock.js'
import { kbExperts } from '../../data/knowledgeBase.js'
import MaterialDetail from './MaterialDetail.vue'
const route = useRoute(), router = useRouter()
const filters = reactive({ q: '', type: '', domain: '', scope: '', project: '', status: '' })
const applied = ref({ ...filters }), page = ref(1)
const advanced = ref(false)
const rows = computed(() => store.documents.map(d => ({ id: d.id, currentVersion: d.currentVersion, archived: d.archived, ...store.latest(d) })).filter(v => {
  const f = applied.value
  return (!f.q || `${v.id} ${v.title} ${v.body}`.toLowerCase().includes(f.q.toLowerCase())) && ['type','domain','scope','project','status'].every(k => !f[k] || v[k] === f[k])
}))
const visibleRows = computed(() => rows.value.slice((page.value - 1) * 8, page.value * 8))
watch(() => rows.value.length, () => { page.value = Math.min(page.value, Math.max(1, Math.ceil(rows.value.length / 8))) })
function query() { applied.value = { ...filters }; page.value = 1 }
function reset() { Object.keys(filters).forEach(k => { filters[k] = '' }); query() }
const detailId = ref(''), detailVersion = ref(0)
function preview(id, number) { detailId.value = id; detailVersion.value = number || store.latest(store.getDocument(id))?.number }
watch(() => [route.query.material, route.query.version, route.query.review], ([id, number, review]) => { if (id) { detailId.value = String(id); detailVersion.value = Number(number) || store.latest(store.getDocument(id))?.number; if(review) { reset(); filters.q=String(id); query() } } }, { immediate: true })
function closePreview() { detailId.value = ''; if (route.query.material) router.replace({ path: route.path, query: {} }) }
const editing = ref(false), editId = ref(''), formRef = ref(), form = reactive({})
const blank = () => ({ title: '', type: MATERIAL_TYPES[0], domain: '', scope: '平台通用', project: '', device: '', source: '人工录入', sourceNote: '', body: '', attachment: null, expert: '', desc: '' })
function openCreate() { editId.value = ''; Object.assign(form, blank()); editing.value = true }
function edit(id) { const d = store.getDocument(id); editId.value = id; Object.assign(form, blank(), JSON.parse(JSON.stringify(store.latest(d)))); editing.value = true }
defineExpose({ openCreate, edit, preview })
const required = [{ required: true, message: '请填写此项', trigger: 'blur' }]
const rules = { title: required, type: required, domain: required, source: required, project: [{ validator: (_, value, cb) => cb(form.scope === '项目专属' && !value ? new Error('请选择所属项目') : undefined), trigger: 'change' }] }
async function save() {
  if (!(await formRef.value.validate().catch(() => false))) return
  try { store.save(form, editId.value, demoContext.role); editing.value = false; reset(); ElMessage.success('草稿已保存；内容变更后须重新加工、校验和审核') } catch (e) { ElMessage.error(e.message) }
}
function attachment(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 20 * 1024 * 1024) { ElMessage.error('附件登记限制为20MB'); event.target.value = ''; return }
  form.attachment = { name: file.name, size: file.size }; ElMessage.info('仅登记文件名称和大小，未上传、未解析')
}
async function action(kind, id) {
  try {
    if (kind === 'submit') store.submit(id, demoContext.role)
    if (kind === 'publish') store.review(id, true, '', demoContext.role)
    if (kind === 'reject') {
      const { value } = await ElMessageBox.prompt('填写退回原因，资料将返回草稿', '模拟审核退回', { inputValidator: v => Boolean(v?.trim()) || '退回原因必填', customClass: 'ez-message-box' })
      store.review(id, false, value, demoContext.role)
    }
    if (kind === 'archive') {
      await ElMessageBox.confirm('归档后全部版本停止参与新的问答检索。历史对话引用保留为历史记录。', '确认模拟归档', { customClass: 'ez-message-box', type: 'warning' })
      store.archive(id, demoContext.role)
    }
    ElMessage.success({ submit: '已提交，等待专业人员审核', publish: '模拟发布成功，已更新当前有效版本', reject: '已退回草稿并保留原因', archive: '资料已归档' }[kind])
  } catch (e) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e.message || String(e)) }
}
</script>
<template>
  <section class="materials">
    <div class="heading"><div><h2>知识资料管理</h2><p>登记资料，完成校验后提交专业审核。</p></div><div class="heading-actions"><span class="note">演示职责</span><el-select v-model="demoContext.role" aria-label="演示职责" style="width:160px"><el-option v-for="r in ROLES" :key="r" :value="r" /></el-select><el-popover width="340" trigger="click"><template #reference><el-button link type="primary">Mock说明</el-button></template>{{ store.storageState.message }}预置资料未经真实专业审核，附件仅登记；演示职责不改变平台登录。</el-popover><el-button type="primary" :disabled="demoContext.role !== ROLES[0]" @click="openCreate">新增资料</el-button></div></div>
    <el-alert v-if="store.storageState.error" :title="store.storageState.error" type="error" :closable="false" />
    <el-form inline class="filters" @submit.prevent="query">
      <el-form-item label="关键词"><el-input v-model="filters.q" placeholder="资料ID / 标题 / 正文" clearable @keyup.enter="query" /></el-form-item>
      <el-form-item label="专业系统"><el-select v-model="filters.domain" clearable placeholder="全部专业"><el-option v-for="t in DOMAINS" :key="t" :value="t" /></el-select></el-form-item>
      <el-form-item label="资料状态"><el-select v-model="filters.status" clearable placeholder="全部状态"><el-option v-for="s in ['草稿','待审核','已发布','已归档']" :key="s" :value="s" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" @click="query">查询</el-button><el-button @click="reset">重置</el-button><el-button link type="primary" :aria-expanded="advanced" @click="advanced=!advanced">{{ advanced ? '收起高级筛选' : '高级筛选' }}{{ [filters.type,filters.scope,filters.project].filter(Boolean).length ? '（已设置）' : '' }}</el-button></el-form-item>
      <div v-show="advanced" class="advanced-filters"><el-form-item label="资料类型"><el-select v-model="filters.type" clearable placeholder="全部类型"><el-option v-for="t in MATERIAL_TYPES" :key="t" :value="t" /></el-select></el-form-item><el-form-item label="知识范围"><el-select v-model="filters.scope" clearable placeholder="全部范围"><el-option value="平台通用" /><el-option value="项目专属" /></el-select></el-form-item><el-form-item label="所属项目"><el-select v-model="filters.project" clearable placeholder="全部项目"><el-option v-for="p in PROJECTS" :key="p.id" :value="p.id" :label="p.name" /></el-select></el-form-item></div>
    </el-form>
    <el-table :data="visibleRows" row-key="id" stripe style="width:100%" empty-text="暂无符合条件的资料">
      <el-table-column label="资料 / 最新维护版本" min-width="230"><template #default="{ row }"><el-button link type="primary" class="title-link" @click="preview(row.id, row.number)">{{ row.title }}</el-button><div class="note">{{ row.id }} · V{{ row.number }} · {{ row.type }}</div><div class="note">当前有效：{{ row.currentVersion ? `V${row.currentVersion}` : '无' }}</div></template></el-table-column>
      <el-table-column label="专业 / 范围" min-width="145"><template #default="{ row }">{{ row.domain }}<div class="note">{{ row.scope }}{{ row.project ? ` · 项目${row.project}` : '' }}</div></template></el-table-column>
      <el-table-column label="资料 / 加工状态" min-width="140"><template #default="{ row }"><el-tag :type="row.status === '已发布' ? 'success' : 'info'">{{ row.status }}</el-tag><div>{{ row.processing }}</div><el-tooltip v-if="row.rejection" :content="row.rejection"><span class="rejected">已退回：{{ row.rejection }}</span></el-tooltip></template></el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" min-width="155" />
      <el-table-column label="操作" min-width="210"><template #default="{ row }"><div class="actions">
        <el-button link type="primary" @click="preview(row.id, row.number)">预览</el-button>
        <el-button v-if="demoContext.role === ROLES[0] && !row.archived" link type="primary" :disabled="row.status === '待审核' || row.processing === '加工中'" @click="edit(row.id)">{{ row.status === '已发布' ? '修订新版' : '编辑' }}</el-button>
        <el-button v-if="row.status === '草稿' && demoContext.role === ROLES[0]" link type="primary" @click="router.push({path:'/knowledge-processing', query:{material:row.id}})">去加工</el-button>
        <el-button v-if="row.status === '草稿' && demoContext.role === ROLES[0]" link type="primary" :disabled="row.processing !== '可检索'" @click="action('submit', row.id)">提交审核</el-button>
        <template v-if="row.status === '待审核' && demoContext.role === ROLES[1]"><el-button link type="success" @click="action('publish',row.id)">确认发布</el-button><el-button link type="danger" @click="action('reject',row.id)">退回</el-button></template>
        <el-button v-if="row.currentVersion && demoContext.role === ROLES[1]" link type="danger" @click="action('archive',row.id)">归档</el-button>
      </div></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="8" :total="rows.length" layout="total, prev, pager, next" class="pagination" />
    <el-dialog v-model="editing" :title="editId ? '编辑资料 / 已发布资料将生成新版本' : '新增知识资料'" width="min(780px, 94vw)" top="5vh" class="ez-dialog" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="editor" @submit.prevent>
        <el-form-item label="资料标题" prop="title"><el-input v-model="form.title" maxlength="120" /></el-form-item>
        <div class="form-grid"><el-form-item label="资料类型" prop="type"><el-select v-model="form.type"><el-option v-for="t in MATERIAL_TYPES" :key="t" :value="t" /></el-select></el-form-item><el-form-item label="专业系统分类" prop="domain"><el-select v-model="form.domain"><el-option v-for="t in DOMAINS" :key="t" :value="t" /></el-select></el-form-item>
        <el-form-item label="知识范围"><el-select v-model="form.scope"><el-option value="平台通用" /><el-option value="项目专属" /></el-select></el-form-item><el-form-item label="所属项目" prop="project"><el-select v-model="form.project" :disabled="form.scope !== '项目专属'" clearable><el-option v-for="p in PROJECTS" :key="p.id" :value="p.id" :label="p.name" /></el-select></el-form-item>
        <el-form-item label="关联设备类别或设备（可选）"><el-input v-model="form.device" /></el-form-item><el-form-item label="关联专家（可选）"><el-select v-model="form.expert" clearable><el-option v-for="e in kbExperts" :key="e.id" :value="e.name" /></el-select></el-form-item></div>
        <el-form-item label="资料来源" prop="source"><el-input v-model="form.source" /></el-form-item><el-form-item label="来源说明"><el-input v-model="form.sourceNote" /></el-form-item><el-form-item label="内容摘要"><el-input v-model="form.desc" /></el-form-item>
        <el-form-item label="可加工正文（纯文本）"><el-input v-model="form.body" type="textarea" :rows="6" placeholder="加工仅截取这里的正文；附件名称不代表已提取知识" /></el-form-item>
        <el-form-item label="附件登记（可选，≤20MB，不上传）"><input type="file" aria-label="选择登记附件" @change="attachment"><span v-if="form.attachment">{{ form.attachment.name }} <el-button link @click="form.attachment = null">取消登记</el-button></span></el-form-item>
      </el-form><template #footer><el-button @click="editing = false">取消</el-button><el-button type="primary" @click="save">保存草稿</el-button></template>
    </el-dialog>
    <MaterialDetail :id="detailId" :version="detailVersion" @close="closePreview"><template #footer><el-button v-if="demoContext.role===ROLES[0] && store.latest(store.getDocument(detailId))?.status==='草稿' && store.latest(store.getDocument(detailId))?.processing==='可检索' && store.latest(store.getDocument(detailId))?.number===detailVersion" type="primary" @click="action('submit',detailId)">提交审核</el-button></template></MaterialDetail>
  </section>
</template>
<style scoped>
.materials { min-width:0; padding-bottom:20px; }.heading { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px; } h2 { font-size:var(--ez-font-size-title); } p { color:var(--ez-text-secondary); margin-top:8px; }
.role-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:16px 0; }.note { font-size:12px; color:var(--ez-text-secondary); line-height:1.8; }
.heading-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }.heading { flex-wrap:wrap; }.advanced-filters { padding:12px 0 0; border-top:1px solid var(--ez-border); }.filters { margin-top:16px; }
.filters :deep(.el-select),.filters :deep(.el-input) { width:180px; }.filters :deep(.el-form-item) { margin-right:16px; margin-bottom:12px; }.title-link { white-space:normal; text-align:left; height:auto; overflow-wrap:anywhere; }
.actions { display:flex; gap:8px; flex-wrap:wrap; }.actions :deep(.el-button + .el-button) { margin-left:0; }.pagination { margin-top:16px; }.rejected { display:block; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--ez-danger); }
.editor { max-height:65vh; overflow:auto; padding:0 12px 0 0; }.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 16px; } @media(max-width:700px) { .form-grid { grid-template-columns:1fr; } }
</style>
