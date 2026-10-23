<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { knowledgeStore as store, demoContext, DOMAINS, PROJECTS, ROLES, MOCK_RULE_NOTICE } from '../data/knowledgeAiMock.js'
import RuleResult from './knowledge/RuleResult.vue'
import { deviceOptions, conditionSummary } from '../data/knowledgeAiPresentation.js'
const route = useRoute()
const q = ref(''), domain = ref(''), applied = ref({q:'',domain:''}), page = ref(1)
const editable = computed(() => demoContext.role !== ROLES[2])
const rows = computed(() => store.reasoningRules.map(r => ({id:r.id,enabled:r.enabled,...store.currentRule(r)})).filter(v => store.canAccess(v,demoContext.project,demoContext.role) && (!applied.value.q || `${v.id}${v.name}${v.scenario}${v.keywords.join(' ')}`.includes(applied.value.q)) && (!applied.value.domain || v.domain===applied.value.domain)))
function query() { applied.value={q:q.value,domain:domain.value}; page.value=1 }
function reset() { q.value='';domain.value='';query() }
const editing=ref(false), editId=ref(''), formRef=ref(), form=reactive({})
const blank=() => ({name:'',domain:'',device:'',scenario:'',keywords:'',scope:demoContext.project?'项目专属':'平台通用',project:demoContext.project,thresholdIds:[],knowledgeIds:[],steps:'',advice:'',safety:''})
function open(id='') { const v=id && store.currentRule(store.ruleById('reasoning',id)); editId.value=id;Object.assign(form,blank(),v?JSON.parse(JSON.stringify(v)):{}); if(v) form.keywords=v.keywords.join('，'); editing.value=true }
watch(() => form.scope, scope => { if(scope==='平台通用') form.project='' })
const compatible=v => v.scope==='平台通用' || (form.scope==='项目专属' && v.project===form.project)
const devices = computed(() => deviceOptions(form.domain, store.thresholdRules.map(store.currentRule).filter(v => store.canAccess(v,form.project,demoContext.role) && compatible(v)).concat(store.effectiveKnowledge(form.project,demoContext.role,form.domain).filter(compatible)), form.device))
const thresholds=computed(() => form.domain && form.device ? store.eligibleThresholds({domain:form.domain,device:form.device,project:form.project,role:demoContext.role}).filter(compatible):[])
const thresholdHint = computed(() => !form.domain || !form.device ? '请先选择专业和设备类别，再按项目范围选择规则。' : '当前专业、设备和项目下没有已启用且在有效期内的规则，请到阈值知识库核对设备类别、启停及有效期。')
const knowledge=computed(() => store.effectiveKnowledge(form.project,demoContext.role,form.domain).filter(compatible))
const invalidLinks=computed(() => (form.thresholdIds||[]).filter(id => !thresholds.value.some(v=>v.id===id)).concat((form.knowledgeIds||[]).filter(id=>!knowledge.value.some(v=>v.documentId===id))))
function example() { Object.assign(form,{name:'配电柜巡检辅助复核（Mock示例）',domain:'供配电',device:'配电柜',scenario:'配电柜巡检时核对柜内温度读数',keywords:'巡检，温升，温度',steps:'核对设备编号、读数单位与测量时间。\n检查运行指示与交接班记录，交由值班负责人复核。',advice:'先复核读数与记录，再由专业人员结合设备说明确认处置；不据此自动操作设备。',safety:'Mock示例不构成设备安全标准；不得根据演示结果带电操作或调整设备保护值。'});ElMessage.info('已填入Mock配置，请选择当前有效阈值和知识资料') }
const required=[{required:true,message:'请填写此项',trigger:'blur'}]
const rules=Object.fromEntries(['name','domain','device','scenario','keywords','scope','thresholdIds','knowledgeIds','steps','advice','safety'].map(k=>[k,required]))
async function save() {
  if(!(await formRef.value.validate().catch(()=>false)))return
  try {store.saveReasoning(form,editId.value,demoContext.role);editing.value=false;reset();ElMessage.success('配置已保存；新规则需启用后参与问答')}catch(e){ElMessage.error(e.message)}
}
function toggle(row) {try{store.setRuleEnabled('reasoning',row.id,!row.enabled,demoContext.role);ElMessage.success(row.enabled?'推理配置已停用':'推理配置已启用')}catch(e){ElMessage.error(e.message)}}
const detailId=ref(''), detailNumber=ref(0), testQuestion=ref(''), testResult=ref(null)
const detailTab=ref('details')
const detailRecord=computed(()=>store.ruleById('reasoning',detailId.value))
const detail=computed(()=>detailRecord.value?.versions.find(v=>v.number===detailNumber.value))
function linkedThreshold(id) { const v=store.currentRule(store.ruleById('threshold',id)); return v ? `${v.name} · V${v.number} · ${conditionSummary(v)}` : `${id} · 当前不可用` }
function inspect(id,number,tab='details') {detailId.value=id;detailNumber.value=Number(number)||store.ruleById('reasoning',id)?.currentVersion||0;detailTab.value=tab;testResult.value=null;testQuestion.value=''}
watch(()=>[route.query.rule,route.query.version],([id,n])=>{if(id)inspect(String(id),n)},{immediate:true})
watch(()=>[demoContext.project,demoContext.role],()=>{page.value=1;testResult.value=null})
function testRule(){if(!testQuestion.value.trim()){ElMessage.warning('请填写测试问题和实际提供的示例读数');return}testResult.value=store.runRules(testQuestion.value,{domain:detail.value.domain,device:detail.value.device,project:demoContext.project,role:demoContext.role,reasoningId:detailId.value});ElMessage.success('已执行本地Mock规则匹配，未调用AI服务')}
function fillTest(){const t=store.currentRule(store.ruleById('threshold',detail.value.thresholdIds[0]));testQuestion.value=`${detail.value.device}${detail.value.keywords[0]}，${t?.metric||'指标'} 实测85${t?.unit||'单位'}，如何复核？`;testResult.value=null}
</script>
<template>
  <main class="rules-page">
    <div class="heading"><div><h1>推理规则配置</h1><p>为运维场景配置适用依据、核实步骤和输出建议。</p></div><el-button type="primary" :disabled="!editable" @click="open()">新增推理规则</el-button></div>
    <p class="hint">Mock演示 · 配置用于辅助复核，不构成专业诊断。<el-popover width="340" trigger="click"><template #reference><el-button link type="primary">演示说明</el-button></template>{{ MOCK_RULE_NOTICE }}{{ store.storageState.message }}</el-popover></p><el-alert v-if="store.storageState.error" :title="store.storageState.error" type="error" :closable="false"/>
    <el-card class="ez-card" shadow="never">
      <div class="controls"><span>适用上下文</span><el-select v-model="demoContext.project" aria-label="推理项目" style="width:180px"><el-option value="" label="无项目 / 平台通用"/><el-option v-for="p in PROJECTS" :key="p.id" :value="p.id" :label="p.name"/></el-select><el-select v-model="demoContext.role" aria-label="推理演示职责" style="width:180px"><el-option v-for="r in ROLES" :key="r" :value="r"/></el-select></div>
      <div class="controls"><el-input v-model="q" placeholder="搜索规则、场景或关键词" clearable style="width:260px" @keyup.enter="query"/><el-select v-model="domain" aria-label="推理专业筛选" clearable placeholder="全部专业" style="width:160px"><el-option v-for="d in DOMAINS" :key="d" :value="d"/></el-select><el-button type="primary" @click="query">查询</el-button><el-button @click="reset">重置</el-button></div>
      <el-table :data="rows.slice((page-1)*8,page*8)" stripe empty-text="当前范围暂无推理配置，请先建立并启用阈值规则">
        <el-table-column label="规则 / 版本" min-width="215"><template #default="{row}"><el-button link type="primary" class="wrap" @click="inspect(row.id)">{{ row.name }}</el-button><div>{{ row.id }} · V{{ row.number }}</div></template></el-table-column>
        <el-table-column label="专业 / 设备 / 范围" min-width="170"><template #default="{row}">{{ row.domain }} / {{ row.device }}<div>{{ row.scope }} {{ row.project?'· 项目'+row.project:'' }}</div></template></el-table-column>
        <el-table-column label="场景 / 关键词" min-width="200"><template #default="{row}">{{ row.scenario }}<div>{{ row.keywords.join('、') }}</div></template></el-table-column>
        <el-table-column label="关联" min-width="100"><template #default="{row}">{{ row.thresholdIds.length }} 条规则 / {{ row.knowledgeIds.length }} 份知识</template></el-table-column>
        <el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="row.enabled?'success':'info'">{{ row.enabled?'启用':'停用' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" min-width="220"><template #default="{row}"><el-button link type="primary" :disabled="!editable" @click="open(row.id)">编辑</el-button><el-button link :type="row.enabled?'danger':'primary'" :disabled="!editable" @click="toggle(row)">{{ row.enabled?'停用':'启用' }}</el-button><el-button link type="primary" @click="inspect(row.id)">详情</el-button><el-button link type="primary" @click="inspect(row.id,0,'test')">模拟测试</el-button></template></el-table-column>
      </el-table><el-pagination v-model:current-page="page" :total="rows.length" :page-size="8" layout="total, prev, pager, next"/>
      <p class="hint">关联规则停用或知识归档后，将不再作为新问答的有效依据。</p>
    </el-card>
    <el-drawer v-model="editing" :title="editId?'编辑推理配置（新版本）':'新增推理配置'" size="min(800px, 94vw)" append-to-body destroy-on-close>
      <p class="hint">关联当前有效规则和已发布知识。修订保存后立即生效，旧版仍可查看。</p><el-button class="example" @click="example">填入Mock配置示例</el-button>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="form-grid">
        <h3 class="full form-section">1. 适用场景</h3>
        <el-form-item label="推理规则名称" prop="name" class="full"><el-input v-model="form.name" aria-label="推理规则名称"/></el-form-item>
        <el-form-item label="专业系统" prop="domain"><el-select v-model="form.domain" aria-label="推理专业系统"><el-option v-for="d in DOMAINS" :key="d" :value="d"/></el-select></el-form-item>
        <el-form-item label="设备类别" prop="device"><el-select v-model="form.device" aria-label="推理设备类别" filterable allow-create default-first-option placeholder="优先选择已有设备类别"><el-option v-for="device in devices" :key="device" :value="device"/></el-select><span class="hint">可搜索已有类别；历史自定义名称仍可使用。</span></el-form-item>
        <el-form-item label="适用范围" prop="scope"><el-select v-model="form.scope" aria-label="推理适用范围"><el-option value="平台通用"/><el-option value="项目专属"/></el-select></el-form-item>
        <el-form-item v-if="form.scope==='项目专属'" label="所属项目" :required="true"><el-select v-model="form.project" aria-label="推理所属项目"><el-option v-for="p in PROJECTS" :key="p.id" :value="p.id" :label="p.name"/></el-select></el-form-item>
        <el-form-item label="问题场景" prop="scenario" class="full"><el-input v-model="form.scenario" aria-label="问题场景"/></el-form-item>
        <el-form-item label="触发关键词（逗号或换行分隔，任一命中）" prop="keywords" class="full"><el-input v-model="form.keywords" aria-label="触发关键词"/></el-form-item>
        <h3 class="full form-section">2. 关联知识与规则</h3>
        <el-form-item label="关联有效阈值规则" prop="thresholdIds" class="full"><el-select v-model="form.thresholdIds" aria-label="关联阈值规则" multiple filterable placeholder="选择当前有效规则"><el-option v-for="v in thresholds" :key="v.id" :value="v.id" :label="`${v.name} · V${v.number} · ${conditionSummary(v)}`"/></el-select><p v-if="!thresholds.length" class="hint">{{ thresholdHint }}</p><div v-for="v in thresholds.filter(v=>form.thresholdIds.includes(v.id))" :key="v.id" class="selected-rule"><strong>{{ conditionSummary(v) }}</strong><span> {{ v.scope }}{{ v.project ? ' / 项目'+v.project : '' }} · 只读引用，数值在阈值知识库维护</span></div></el-form-item>
        <el-form-item label="关联已发布知识" prop="knowledgeIds" class="full"><el-select v-model="form.knowledgeIds" aria-label="关联知识资料" multiple filterable><el-option v-for="v in knowledge" :key="v.documentId" :value="v.documentId" :label="`${v.documentId} · ${v.title} · V${v.number}`"/></el-select></el-form-item>
        <el-alert v-if="invalidLinks.length" class="full" type="warning" :closable="false" :title="`以下关联已失效或范围不符，请移除并重新选择：${invalidLinks.join('、')}`"/>
        <h3 class="full form-section">3. 输出内容</h3>
        <el-form-item label="判断步骤 / 需要核实的条件" prop="steps" class="full"><el-input v-model="form.steps" aria-label="核实步骤" type="textarea" :rows="3"/></el-form-item>
        <el-form-item label="输出建议" prop="advice" class="full"><el-input v-model="form.advice" aria-label="输出建议" type="textarea" :rows="3"/></el-form-item>
        <el-form-item label="安全提示" prop="safety" class="full"><el-input v-model="form.safety" aria-label="安全提示" type="textarea" :rows="2"/></el-form-item>
      </el-form><template #footer><el-button @click="editing=false">取消</el-button><el-button type="primary" @click="save">保存推理配置</el-button></template>
    </el-drawer>
    <el-drawer :model-value="Boolean(detailId)" title="推理配置详情与模拟测试" size="min(840px, 94vw)" append-to-body @close="detailId=''">
      <template v-if="detail && store.canAccess(detail,demoContext.project,demoContext.role)">
        <h2>{{ detail.name }}</h2><p>{{ detailId }} · {{ detailRecord.enabled?'启用':'停用' }} · {{ detail.domain }} / {{ detail.device }} / {{ detail.scope }} {{ detail.project?'项目'+detail.project:'' }}</p>
        <el-select v-model="detailNumber" aria-label="推理历史版本" @change="testResult=null"><el-option v-for="v in detailRecord.versions" :key="v.number" :value="v.number" :label="`V${v.number} · ${v.updatedAt}`"/></el-select>
        <el-tabs v-model="detailTab" class="detail-tabs"><el-tab-pane label="配置详情" name="details">
        <p>场景：{{ detail.scenario }}；关键词：{{ detail.keywords.join('、') }}</p>
        <p class="multiline">核实步骤：{{ detail.steps }}</p><p class="multiline">输出建议：{{ detail.advice }}</p><p class="multiline">安全提示：{{ detail.safety }}</p>
        <h3>关联规则与知识</h3><div class="links"><router-link v-for="id in detail.thresholdIds" :key="id" :to="{path:'/threshold-rules',query:{rule:id}}">{{ linkedThreshold(id) }}</router-link><router-link v-for="id in detail.knowledgeIds" :key="id" :to="{path:'/knowledge',query:{material:id,version:store.getDocument(id)?.currentVersion||0}}">{{ store.versionOf(id,store.getDocument(id)?.currentVersion)?.title||id }} · 当前发布版本</router-link></div>
        </el-tab-pane><el-tab-pane label="模拟测试" name="test">
        <template v-if="detailNumber===detailRecord.currentVersion"><h3>规则测试（当前项目 {{ demoContext.project||'无' }}）</h3><p>填写设备、场景及“指标名称 实测数值 单位”。未提供读数时仅提示补充信息。</p><el-input v-model="testQuestion" aria-label="规则测试问题" type="textarea" :rows="3"/><div class="controls test-controls"><el-button @click="fillTest">填入Mock读数示例（85，仅演示）</el-button><el-button type="primary" @click="testRule">执行模拟测试</el-button></div><RuleResult v-if="testResult" :result="testResult"/></template>
        <el-alert v-else title="历史配置只读，不执行旧版测试；请切换到当前版本。" type="info" :closable="false"/>
        </el-tab-pane></el-tabs>
      </template><el-empty v-else description="规则不存在或当前上下文无访问权限"/>
    </el-drawer>
  </main>
</template>
<style scoped>
.form-section { padding:10px 12px; background:var(--ez-primary-bg); border-radius:var(--ez-control-radius); }.selected-rule { width:100%; margin-top:8px; padding:8px 12px; background:var(--ez-primary-bg); font-size:12px; }.detail-tabs { margin-top:16px; }
.rules-page { position:fixed; top:var(--topbar-h); left:var(--sidebar-w); right:0; bottom:0; overflow:auto; padding:var(--ez-page-padding); background:var(--ez-page-bg); color:var(--ez-text); }.heading,.controls { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }.heading { justify-content:space-between; margin-bottom:16px; }h1,h2 { font-size:var(--ez-font-size-title); }h3 { margin:20px 0 12px; font-size:var(--ez-font-size-card-title); }p { margin:10px 0; line-height:1.7; overflow-wrap:anywhere; }.ez-card { margin-top:16px; min-width:0; }.controls { margin-bottom:12px; }.hint { color:var(--ez-text-secondary); font-size:12px; }.wrap { height:auto; white-space:normal; text-align:left; }.el-pagination { margin-top:16px; }.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 16px; }.full { grid-column:1/-1; }.example,.test-controls { margin:16px 0; }.multiline { white-space:pre-wrap; }.links { display:flex; flex-direction:column; gap:10px; }a { color:var(--ez-primary); }@media(max-width:600px){.form-grid { grid-template-columns:1fr; }}
</style>
