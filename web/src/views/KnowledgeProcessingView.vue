<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { knowledgeStore as store, demoContext, ROLES, ELEMENT_KINDS } from '../data/knowledgeAiMock.js'
const route = useRoute(), router = useRouter()
const demoTools = ref(false)
const selectedId = ref(String(route.query.material || '')), search = ref(''), filter = ref('')
const candidates = computed(() => store.documents.filter(d => !d.archived && store.latest(d).status === '草稿'))
const rows = computed(() => store.documents.flatMap(d => d.versions.map(v => ({ id:d.id, ...v }))).filter(v => (!search.value || v.title.includes(search.value) || v.id.includes(search.value)) && (!filter.value || v.processing === filter.value)))
const page = ref(1)
watch([search, filter], () => { page.value = 1 })
const selectedNumber = ref(0), drawerId = ref(''), fragments = ref([])
const current = computed(() => store.versionOf(drawerId.value, selectedNumber.value))
const canEdit = computed(() => current.value?.status === '草稿' && current.value?.processing === '待校验' && demoContext.role === ROLES[0])
const busy = computed(() => store.documents.some(d => store.latest(d).processing === '加工中'))
function open(id, number) {
  drawerId.value = id; selectedNumber.value = number
  fragments.value = JSON.parse(JSON.stringify(store.versionOf(id, number).fragments))
}
function processRow(row) { selectedId.value=row.id; process(false) }
function rowAction(row) { return row.status==='草稿' && ['未加工','加工失败'].includes(row.processing) && demoContext.role===ROLES[0] ? '开始加工' : row.status==='草稿' && row.processing==='待校验' ? '校验结果' : '查看结果' }
function nextReview() { router.push({path:'/knowledge',query:{material:drawerId.value,version:selectedNumber.value,review:'1'}}) }
async function process(fail = false) {
  if (!selectedId.value) { ElMessage.warning('请选择待加工资料'); return }
  const d = candidates.value.find(d => d.id === selectedId.value)
  if (!d) { ElMessage.warning('请选择仍可加工的草稿资料'); return }
  const number = store.latest(d).number
  try {
    const ok = await store.process(d.id, number, demoContext.role, fail)
    open(d.id, number)
    if (ok) ElMessage.success('模拟加工完成，请逐条校验并确认')
    else ElMessage.error(store.versionOf(d.id, number).error)
  } catch (e) { ElMessage.error(e.message) }
}
function confirm() {
  try {
    store.confirm(drawerId.value, selectedNumber.value, fragments.value, demoContext.role)
    fragments.value = JSON.parse(JSON.stringify(current.value.fragments))
    ElMessage.success('人工校验完成；发布前仍不能被AI引用')
  } catch (e) { ElMessage.error(e.message) }
}
</script>
<template>
  <main class="processing-page">
    <div class="heading"><div><h1>知识加工与治理</h1><p>按资料版本加工，逐条核对正文依据。候选规则不自动生效。</p></div><router-link to="/knowledge"><el-button>返回资料管理</el-button></router-link></div>
    <p class="note">Mock演示 · 从正文提取片段，校验完成后回到资料提交审核。已发布版本只读。</p>
    <el-card class="ez-card process-controls" shadow="never">
      <div class="controls"><span>演示职责</span><el-select v-model="demoContext.role" aria-label="演示职责" style="width:180px"><el-option v-for="r in ROLES" :key="r" :value="r" /></el-select>
      <el-select v-model="selectedId" aria-label="待加工资料" placeholder="选择待加工草稿" filterable style="width:340px"><el-option v-for="d in candidates" :key="d.id" :value="d.id" :label="`${store.latest(d).title} · V${store.latest(d).number}`" /></el-select>
      <el-button type="primary" :loading="busy" :disabled="!selectedId || demoContext.role !== ROLES[0]" @click="process(false)">开始加工</el-button><el-button link @click="demoTools=!demoTools">演示操作</el-button></div>
      <div v-if="demoTools" class="controls note">仅用于演示异常处理<el-button :disabled="!selectedId || busy || demoContext.role !== ROLES[0]" @click="process(true)">模拟失败</el-button></div>
    </el-card>
    <el-card class="ez-card records" shadow="never">
      <div class="controls"><el-input v-model="search" placeholder="搜索资料标题或ID" clearable style="width:260px" /><el-select v-model="filter" aria-label="加工状态筛选" placeholder="全部加工状态" clearable style="width:180px"><el-option v-for="s in ['未加工','加工中','加工失败','待校验','可检索']" :key="s" :value="s" /></el-select></div>
      <el-table :data="rows.slice((page - 1) * 10, page * 10)" stripe empty-text="暂无加工记录">
        <el-table-column label="关联资料 / 版本" min-width="230"><template #default="{row}"><el-button link type="primary" class="title-link" @click="open(row.id,row.number)">{{ row.title }}</el-button><div>{{ row.id }} · V{{ row.number }} · {{ row.status }}</div></template></el-table-column>
        <el-table-column prop="type" label="资料类型" min-width="150" /><el-table-column prop="domain" label="专业系统" min-width="100" />
        <el-table-column prop="processing" label="加工状态" min-width="100" /><el-table-column prop="processedAt" label="加工时间" min-width="160" />
        <el-table-column label="片段数" width="80"><template #default="{row}">{{ row.fragments.length }}</template></el-table-column>
        <el-table-column prop="validation" label="人工校验" min-width="150" /><el-table-column label="操作" width="110"><template #default="{row}"><el-button link type="primary" :disabled="row.processing==='加工中'" @click="rowAction(row)==='开始加工' ? processRow(row) : open(row.id,row.number)">{{ rowAction(row) }}</el-button></template></el-table-column>
      </el-table><el-pagination v-model:current-page="page" :total="rows.length" :page-size="10" layout="total, prev, pager, next" class="pagination" />
    </el-card>
    <el-drawer :model-value="Boolean(drawerId)" title="加工结果与人工校验" size="min(820px, 94vw)" append-to-body @close="drawerId = ''">
      <template v-if="current"><h2>{{ current.title }} · V{{ current.number }}</h2><p>{{ current.processing }} / {{ current.validation }}</p>
        <el-alert v-if="current.error" :title="current.error" type="error" :closable="false" />
        <el-collapse><el-collapse-item title="展开对应版本原始正文"><pre class="source">{{ current.body || '无正文，不具备加工条件' }}</pre></el-collapse-item></el-collapse>
        <el-alert title="可校正分类、从正文重新截取或补充片段。每段必须可在正文核对；如需补充新知识，请先编辑资料正文后重新加工。" type="info" :closable="false" />
        <div v-for="(f, i) in fragments" :key="i" class="fragment">
          <div class="controls"><strong>片段 {{ i + 1 }}</strong><el-select v-model="f.kind" :aria-label="`片段${i+1}知识要素`" :disabled="!canEdit" style="width:140px"><el-option v-for="k in ELEMENT_KINDS" :key="k" :value="k" /></el-select><el-button v-if="canEdit" link type="danger" @click="fragments.splice(i,1)">移除此片段</el-button></div>
          <el-input v-model="f.text" :aria-label="`片段${i+1}内容`" type="textarea" :rows="3" :readonly="!canEdit" /><small>{{ f.origin || '待校验的正文补充摘录' }}</small>
          <p v-if="f.kind === '候选规则'" class="note">仅为候选，不写入阈值库，不参与规则推理。</p>
        </div>
        <el-empty v-if="!fragments.length" description="暂无知识片段" :image-size="60" />
        <el-button v-if="canEdit" @click="fragments.push({kind:'事实', text:''})">补充正文摘录</el-button>
      </template><template #footer><el-button @click="drawerId = ''">关闭</el-button><el-button v-if="canEdit" type="primary" @click="confirm">确认校验</el-button><el-button v-if="current?.status==='草稿' && current?.processing==='可检索' && demoContext.role===ROLES[0]" type="primary" @click="nextReview">返回资料并提交审核</el-button></template>
    </el-drawer>
  </main>
</template>
<style scoped>
.processing-page { position:fixed; top:var(--topbar-h); left:var(--sidebar-w); right:0; bottom:0; overflow:auto; padding:var(--ez-page-padding); color:var(--ez-text); background:var(--ez-page-bg); }
.heading { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px; } h1,h2 { font-size:var(--ez-font-size-title); overflow-wrap:anywhere; } p { margin:10px 0; color:var(--ez-text-secondary); }
.process-controls,.records { margin-top:16px; min-width:0; }.controls { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:12px; }.title-link { white-space:normal; text-align:left; height:auto; }.pagination { margin-top:16px; }
.fragment { padding:16px 0; border-bottom:1px solid var(--ez-border); }.source { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.8; } small,.note { color:var(--ez-text-secondary); font-size:12px; }
</style>
