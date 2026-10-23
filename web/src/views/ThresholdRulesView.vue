<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { knowledgeStore as store, demoContext, DOMAINS, PROJECTS, ROLES, RULE_TYPES, RULE_OPERATORS, MOCK_RULE_NOTICE } from '../data/knowledgeAiMock.js'
import { conditionSummary, thresholdStatus } from '../data/knowledgeAiPresentation.js'
const route = useRoute()
const filters = reactive({ q:'', domain:'', state:'' }), applied = ref({ ...filters }), page = ref(1)
const editable = computed(() => demoContext.role !== ROLES[2])
const rows = computed(() => store.thresholdRules.map(r => ({ id:r.id, enabled:r.enabled, ...store.currentRule(r) })).filter(v => store.canAccess(v, demoContext.project, demoContext.role) && (!applied.value.q || `${v.id}${v.name}${v.device}${v.metric}`.includes(applied.value.q)) && (!applied.value.domain || v.domain === applied.value.domain) && (!applied.value.state || (v.enabled ? '启用' : '停用') === applied.value.state)))
function query() { applied.value = { ...filters }; page.value = 1 }
function reset() { Object.assign(filters, {q:'',domain:'',state:''}); query() }
watch(() => [demoContext.project, demoContext.role, rows.value.length], () => { page.value = 1 })
const context = () => ({ project:demoContext.project, role:demoContext.role })
const conflicts = id => store.thresholdConflicts(id, context())
const editing = ref(false), editId = ref(''), formRef = ref(), form = reactive({})
const blank = () => ({ name:'', type:'阈值', domain:'', device:'', metric:'', operator:'>', value:0, unit:'', scope:demoContext.project ? '项目专属' : '平台通用', project:demoContext.project, sourceId:'', applicability:'', start:new Date(Date.now()-60000).toISOString(), end:new Date(Date.now()+365*86400000).toISOString() })
const sources = computed(() => store.effectiveKnowledge(form.project, demoContext.role, form.domain).filter(v => v.scope === '平台通用' || (form.scope === '项目专属' && v.project === form.project)))
watch(() => form.scope, scope => { if (scope === '平台通用') form.project = '' })
function open(id = '') { editId.value = id; Object.assign(form, blank(), id ? JSON.parse(JSON.stringify(store.currentRule(store.ruleById('threshold',id)))) : {}); editing.value = true }
function example() { Object.assign(form, { name:'配电柜温升提醒（Mock示例）', type:'阈值', domain:'供配电', device:'配电柜', metric:'柜内温度', operator:'>', value:80, unit:'℃', applicability:'仅用于模拟演示：80℃为人工配置的虚构示例值，并非引用资料中的设备安全标准。' }); ElMessage.info('已填入Mock示例，请选择范围和来源后保存') }
const required = [{required:true,message:'请填写此项',trigger:'blur'}]
const rules = Object.fromEntries(['name','type','domain','device','metric','operator','value','unit','scope','sourceId','applicability','start','end'].map(k => [k,required]))
async function save() {
  if (!(await formRef.value.validate().catch(() => false))) return
  try { const id = store.saveThreshold(form,editId.value,demoContext.role); editing.value = false; reset(); ElMessage.success(`已保存 ${id}；新规则默认停用，修订立即替换当前版本并保留启停状态`) } catch(e) { ElMessage.error(e.message) }
}
function toggle(row) { try { store.setRuleEnabled('threshold',row.id,!row.enabled,demoContext.role); ElMessage.success(row.enabled ? '已停用，新的模拟推理不再引用' : '已启用；实际生效仍取决于项目、设备和有效时间') } catch(e) { ElMessage.error(e.message) } }
const detailId = ref(''), detailNumber = ref(0)
const detailRecord = computed(() => store.ruleById('threshold',detailId.value))
const detail = computed(() => detailRecord.value?.versions.find(v => v.number === detailNumber.value))
function history(id, number) { detailId.value=id; detailNumber.value=Number(number) || store.ruleById('threshold',id)?.currentVersion || 0 }
watch(() => [route.query.rule,route.query.version], ([id,n]) => { if(id) history(String(id),n) }, {immediate:true})
const sourceTitle = v => store.versionOf(v.sourceId,v.sourceVersion)?.title || v.sourceId
</script>
<template>
  <main class="rules-page">
    <div class="heading"><div><h1>规则与阈值知识库</h1><p>维护“什么条件属于异常”，以项目、设备、指标及时间核对生效标准。</p></div><el-button type="primary" :disabled="!editable" @click="open()">新增阈值规则</el-button></div>
    <p class="hint">Mock演示 · 阈值仅供演示，不作为设备安全标准。<el-popover width="340" trigger="click"><template #reference><el-button link type="primary">演示说明</el-button></template>{{ MOCK_RULE_NOTICE }}{{ store.storageState.message }}</el-popover></p>
    <el-alert v-if="store.storageState.error" :title="store.storageState.error" type="error" :closable="false" />
    <el-card class="ez-card" shadow="never">
      <div class="controls"><span>适用上下文</span><el-select v-model="demoContext.project" aria-label="规则项目" style="width:180px"><el-option value="" label="无项目 / 平台通用"/><el-option v-for="p in PROJECTS" :key="p.id" :value="p.id" :label="p.name"/></el-select><el-select v-model="demoContext.role" aria-label="规则演示职责" style="width:180px"><el-option v-for="r in ROLES" :key="r" :value="r"/></el-select></div>
      <div class="controls"><el-input v-model="filters.q" placeholder="规则编号、名称、设备或指标" clearable style="width:260px" @keyup.enter="query"/><el-select v-model="filters.domain" aria-label="规则专业筛选" placeholder="全部专业" clearable style="width:160px"><el-option v-for="d in DOMAINS" :key="d" :value="d"/></el-select><el-select v-model="filters.state" aria-label="规则启停筛选" placeholder="全部启停状态" clearable style="width:150px"><el-option value="启用"/><el-option value="停用"/></el-select><el-button type="primary" @click="query">查询</el-button><el-button @click="reset">重置</el-button></div>
      <p class="hint">同一设备和指标存在不同判断标准时，需由专业人员核实；项目规则不自动覆盖平台通用规则。</p>
      <el-table :data="rows.slice((page-1)*8,page*8)" stripe empty-text="当前范围暂无规则，可新增Mock示例">
        <el-table-column label="规则 / 当前版本" min-width="210"><template #default="{row}"><el-button link type="primary" class="wrap" @click="history(row.id)">{{ row.name }}</el-button><div>{{ row.id }} · V{{ row.number }} · {{ row.type }}</div></template></el-table-column>
        <el-table-column label="专业 / 设备 / 范围" min-width="155"><template #default="{row}">{{ row.domain }} / {{ row.device }}<div>{{ row.scope }} {{ row.project ? '· 项目'+row.project : '' }}</div></template></el-table-column>
        <el-table-column label="异常条件" min-width="185"><template #default="{row}">{{ conditionSummary(row) }}</template></el-table-column>
        <el-table-column label="适用状态 / 冲突" min-width="170"><template #default="{row}"><el-tag :type="thresholdStatus(row)==='当前范围有效'?'success':'info'">{{ thresholdStatus(row) }}</el-tag><el-button v-if="conflicts(row.id).length" link type="danger" @click="history(row.id)">阈值冲突 · {{ conflicts(row.id).length }} 条</el-button></template></el-table-column>
        <el-table-column label="操作" min-width="200"><template #default="{row}"><el-button link type="primary" :disabled="!editable" @click="open(row.id)">编辑</el-button><el-button link :type="row.enabled?'danger':'primary'" :disabled="!editable" @click="toggle(row)">{{ row.enabled?'停用':'启用' }}</el-button><el-button link type="primary" @click="history(row.id)">来源 / 历史</el-button></template></el-table-column>
      </el-table><el-pagination v-model:current-page="page" :total="rows.length" :page-size="8" layout="total, prev, pager, next"/>
    </el-card>
    <el-drawer v-model="editing" :title="editId ? '修订阈值规则（新版本）' : '新增阈值规则'" size="min(760px, 94vw)" append-to-body destroy-on-close>
      <el-alert title="所有阈值均为Mock示例；来源链接不证明数值经过验证。修订不走复杂审批，保存即成为当前版本。" type="warning" :closable="false"/>
      <el-button class="example" @click="example">填入Mock示例</el-button>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="form-grid">
        <el-form-item label="规则名称" prop="name" class="full"><el-input v-model="form.name" aria-label="规则名称" maxlength="100"/></el-form-item>
        <el-form-item label="规则类型" prop="type"><el-select v-model="form.type" aria-label="规则类型"><el-option v-for="v in RULE_TYPES" :key="v" :value="v"/></el-select></el-form-item>
        <el-form-item label="专业系统" prop="domain"><el-select v-model="form.domain" aria-label="阈值专业系统"><el-option v-for="v in DOMAINS" :key="v" :value="v"/></el-select></el-form-item>
        <el-form-item label="设备类别" prop="device"><el-input v-model="form.device" aria-label="阈值设备类别" placeholder="例如：配电柜"/></el-form-item>
        <div class="condition-editor full"><strong class="full">异常条件 · {{ conditionSummary(form) }}</strong>
        <el-form-item label="指标名称" prop="metric"><el-input v-model="form.metric" aria-label="指标名称" placeholder="问答中使用相同指标名称"/></el-form-item>
        <el-form-item label="异常判断条件" prop="operator"><el-select v-model="form.operator" aria-label="判断条件"><el-option v-for="v in RULE_OPERATORS" :key="v" :value="v"/></el-select></el-form-item>
        <el-form-item label="阈值（Mock数值）" prop="value"><el-input-number v-model="form.value" aria-label="阈值数值" :controls="false"/></el-form-item>
        <el-form-item label="单位" prop="unit"><el-input v-model="form.unit" aria-label="阈值单位" placeholder="例如：℃；按原单位输入，不自动换算"/></el-form-item>
        </div>
        <el-form-item label="适用范围" prop="scope"><el-select v-model="form.scope" aria-label="阈值适用范围"><el-option value="平台通用"/><el-option value="项目专属"/></el-select></el-form-item>
        <el-form-item v-if="form.scope==='项目专属'" label="所属项目" :required="true"><el-select v-model="form.project" aria-label="阈值所属项目"><el-option v-for="p in PROJECTS" :key="p.id" :value="p.id" :label="p.name"/></el-select></el-form-item>
        <el-form-item label="来源资料（当前已发布版本）" prop="sourceId" class="full"><el-select v-model="form.sourceId" aria-label="阈值来源资料" filterable placeholder="先选专业及范围"><el-option v-for="v in sources" :key="v.documentId" :value="v.documentId" :label="`${v.title} · V${v.number}`"/></el-select></el-form-item>
        <el-form-item label="适用说明 / 数值来源说明" prop="applicability" class="full"><el-input v-model="form.applicability" aria-label="适用说明" type="textarea" :rows="3"/></el-form-item>
        <el-form-item label="有效开始时间" prop="start"><el-date-picker v-model="form.start" aria-label="有效开始时间" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ"/></el-form-item>
        <el-form-item label="有效结束时间" prop="end"><el-date-picker v-model="form.end" aria-label="有效结束时间" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ"/></el-form-item>
      </el-form><template #footer><el-button @click="editing=false">取消</el-button><el-button type="primary" @click="save">保存规则</el-button></template>
    </el-drawer>
    <el-drawer :model-value="Boolean(detailId)" title="规则来源、适用范围与历史版本" size="min(760px, 94vw)" append-to-body @close="detailId=''">
      <template v-if="detail && store.canAccess(detail,demoContext.project,demoContext.role)">
        <h2>{{ detail.name }}（Mock）</h2><p>{{ detailId }} · 当前版本 V{{ detailRecord.currentVersion }} · {{ detailRecord.enabled?'启用':'停用' }}</p>
        <el-select v-model="detailNumber" aria-label="阈值历史版本"><el-option v-for="v in detailRecord.versions" :key="v.number" :value="v.number" :label="`V${v.number} · ${v.updatedAt}`"/></el-select>
        <p v-if="detailNumber!==detailRecord.currentVersion" class="hint">历史只读版本，不参与当前判断。</p>
        <el-descriptions :column="1" border class="details"><el-descriptions-item label="条件">{{ detail.metric }} {{ detail.operator }} {{ detail.value }} {{ detail.unit }}</el-descriptions-item><el-descriptions-item label="范围">{{ detail.domain }} · {{ detail.device }} · {{ detail.scope }} {{ detail.project ? '项目'+detail.project : '' }}</el-descriptions-item><el-descriptions-item label="有效期">{{ new Date(detail.start).toLocaleString() }} 至 {{ new Date(detail.end).toLocaleString() }}</el-descriptions-item><el-descriptions-item label="适用说明">{{ detail.applicability }}</el-descriptions-item><el-descriptions-item label="保存时来源"><router-link :to="{path:'/knowledge',query:{material:detail.sourceId,version:detail.sourceVersion}}">{{ sourceTitle(detail) }} · V{{ detail.sourceVersion }}</router-link><p>新问答会重新核对来源资料的当前有效版本。</p></el-descriptions-item></el-descriptions>
        <h3>当前项目 / 当前时间冲突检查</h3><p v-if="!conflicts(detailId).length">当前无冲突，或本规则未启用 / 不在有效时间内。</p>
        <el-alert v-else title="存在不同判断标准，需要专业人员核实；不按最大值、最小值或创建时间自动选择。" type="error" :closable="false"/>
        <div v-for="c in conflicts(detailId)" :key="c.id" class="conflict"><strong>{{ c.id }} · {{ c.name }} · V{{ c.number }}</strong><p>{{ c.metric }} {{ c.operator }} {{ c.value }} {{ c.unit }}</p><router-link :to="{path:'/knowledge',query:{material:c.sourceId,version:c.sourceVersion}}">来源：{{ sourceTitle(c) }} · V{{ c.sourceVersion }}</router-link></div>
      </template><el-empty v-else description="规则不存在或当前上下文无访问权限"/>
    </el-drawer>
  </main>
</template>
<style scoped>
.condition-editor { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 16px; padding:16px; margin-bottom:18px; border:1px solid var(--ez-border); border-radius:var(--ez-control-radius); background:var(--ez-primary-bg); }.condition-editor .el-form-item { margin-bottom:0; }
.rules-page { position:fixed; top:var(--topbar-h); left:var(--sidebar-w); right:0; bottom:0; overflow:auto; padding:var(--ez-page-padding); background:var(--ez-page-bg); color:var(--ez-text); }.heading,.controls { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }.heading { justify-content:space-between; margin-bottom:16px; }h1,h2 { font-size:var(--ez-font-size-title); }p { margin:10px 0; line-height:1.7; overflow-wrap:anywhere; }.ez-card { margin-top:16px; min-width:0; }.controls { margin-bottom:12px; }.hint { color:var(--ez-text-secondary); font-size:12px; }.wrap { height:auto; white-space:normal; text-align:left; }.el-pagination,.details { margin-top:16px; }.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 16px; }.full { grid-column:1/-1; }.form-grid :deep(.el-select),.form-grid :deep(.el-date-editor),.form-grid :deep(.el-input-number) { width:100%; }.example { margin:16px 0; }.conflict { margin-top:12px; padding:12px; border:1px solid var(--ez-border); border-radius:var(--ez-control-radius); }a { color:var(--ez-primary); }@media(max-width:600px){.form-grid { grid-template-columns:1fr; }}
</style>
