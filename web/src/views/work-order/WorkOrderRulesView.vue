<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { workOrderStore as store, PRIORITIES, PROFESSIONS, clone, displayTime, durationError } from '../../data/workOrder.js'
import { DEMO_LIMITS } from '../../data/work-order/seed.js'
import DemoContext from './DemoContext.vue'
const tab = ref('categories'), dialog = ref(false), viewOnly = ref(false), historyOpen = ref(false), kind = ref('category')
const formRef = ref(), error = ref(''), saving = ref(false), search = ref(''), enabledFilter = ref(''), historyId = ref('')
const form = reactive({})
const integerRule = minimum => ({ validator: (_rule, value, callback) => Number.isInteger(value) && value >= minimum ? callback() : callback(new Error(minimum ? '请输入正整数' : '请输入非负整数')), trigger: ['blur', 'change'] })
const limitRules = (priority, key) => [{ validator: (_rule, value, callback) => { const error = durationError({ ...form.limits[priority], [key]: value }, priority, key); error ? callback(new Error(error)) : callback() }, trigger: ['blur', 'change'] }]
let ctx
const refs = computed(() => store.currentCatalog())
const categories = computed(() => store.state.categories.filter(row => (!search.value || (row.code + row.name).includes(search.value)) && (!enabledFilter.value || String(row.enabled) === enabledFilter.value)).slice().sort((a,b) => a.sort - b.sort || a.code.localeCompare(b.code)))
const rules = computed(() => store.state.rules.filter(row => (!search.value || row.name.includes(search.value)) && (!enabledFilter.value || String(row.enabled) === enabledFilter.value)).slice().sort((a,b) => a.sequence - b.sequence))
const logs = computed(() => store.state.configLogs.filter(row => !historyId.value || row.objectId === historyId.value).slice().reverse())
const modes = { initiator: '发起人', person: '指定人员', role: '指定角色' }
const lookup = (ids, rows) => ids.length ? ids.map(id => rows.find(row => row.id === id)?.name || id).join('、') : '全部'
const conditions = row => '院区：示范院区；类别：' + lookup(row.categoryIds, store.state.categories) +
  '；专业：' + (row.professions.join('、') || '全部') + '；楼栋：' + lookup(row.buildingIds, refs.value.spaces) +
  '；来源：' + (row.sources.join('、') || '全部已有来源') + '；优先级：' + (row.priorities.join('、') || '全部')
function open(type, row = null, readonly = false) {
  kind.value = type; viewOnly.value = readonly; error.value = ''
  Object.keys(form).forEach(key => delete form[key])
  Object.assign(form, row ? clone(row) : type === 'category' ? {
    id: '', projectId: 'project-demo', code: '', name: '', description: '', sort: 1, enabled: true, defaultPriority: '普通',
    acceptanceMode: 'initiator', acceptanceTargetId: '', allowSelf: false, limits: clone(DEMO_LIMITS)
  } : { id: '', name: '', projectId: 'project-demo', campusId: 'space-campus', sequence: 60, categoryIds: [], professions: [], buildingIds: [], sources: [], priorities: [], targetId: '', enabled: false, description: '' })
  ctx = { ...store.context(), configVersion: row?.version }; dialog.value = true
}
async function save() {
  error.value = ''
  if (!(await formRef.value.validate().catch(fields => { const key = Object.keys(fields)[0]; if (key) formRef.value.scrollToField(key); return false }))) { error.value = '请补齐或修正标红字段'; return }
  saving.value = true
  const result = store.execute(kind.value === 'category' ? 'saveCategory' : 'saveRule', clone(form), ctx)
  saving.value = false
  if (!result.ok) { error.value = result.error; return }
  ElMessage.success('配置已保存，新版本仅影响后续默认值或匹配'); dialog.value = false
}
function toggle(type, row) {
  const result = store.execute(type === 'category' ? 'saveCategory' : 'saveRule', { ...clone(row), enabled: !row.enabled }, { ...store.context(), configVersion: row.version })
  result.ok ? ElMessage.success('启停已保存，既有工单保持原样') : ElMessage.error(result.error)
}
function history(id = '') { historyId.value = id; historyOpen.value = true }
</script>
<template>
  <main class="work-order-page">
    <header class="page-header"><div><p class="eyebrow">工单处理</p><h1>工单规则配置</h1><p class="subtitle">分类提供默认验收与时限，派单规则只决定处理目标</p></div></header>
    <DemoContext />
    <el-empty v-if="!store.canConfigure()" description="当前演示账号没有规则管理权限；请切换林配置账号" />
    <section v-else class="panel">
      <el-alert title="所有时长均为演示自然分钟；配置改变不静默更新在途工单，不代表短信、微信或后台调度已接入。" type="info" :closable="false" />
      <el-tabs v-model="tab"><el-tab-pane label="分类与默认值" name="categories" /><el-tab-pane label="派单规则" name="rules" /></el-tabs>
      <div class="toolbar"><el-input v-model="search" clearable placeholder="按名称／编码筛选" /><el-select v-model="enabledFilter" clearable placeholder="全部启用状态"><el-option label="启用" value="true" /><el-option label="停用" value="false" /></el-select><el-button type="primary" @click="open(tab === 'categories' ? 'category' : 'rule')">{{ tab === 'categories' ? '新增类别' : '新增派单规则' }}</el-button><el-button @click="history()">修改记录</el-button></div>
      <el-table v-if="tab === 'categories'" :data="categories" stripe empty-text="没有符合条件的类别"><el-table-column label="类别编码／名称" min-width="200"><template #default="{row}"><el-button link type="primary" @click="open('category', row, true)">{{ row.name }}</el-button><div class="muted">{{ row.code }}</div></template></el-table-column><el-table-column label="默认优先级" prop="defaultPriority" width="120" /><el-table-column label="默认验收" min-width="200"><template #default="{row}">{{ modes[row.acceptanceMode] }}<div class="muted">{{ row.acceptanceMode === 'initiator' ? '本单发起账号' : store.acceptanceLabel({ type: row.acceptanceMode, targetId: row.acceptanceTargetId }) }}</div><div class="muted">{{ row.allowSelf ? '允许' : '禁止' }}结果提交人自验</div></template></el-table-column><el-table-column label="状态／版本" min-width="130"><template #default="{row}"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag> · V{{ row.version }}</template></el-table-column><el-table-column label="修改时间" min-width="175"><template #default="{row}">{{ displayTime(row.modifiedAt) }}</template></el-table-column><el-table-column label="操作" width="180" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open('category',row)">编辑</el-button><el-button link @click="toggle('category',row)">{{ row.enabled ? '停用' : '启用' }}</el-button><el-button link @click="history(row.id)">记录</el-button></template></el-table-column></el-table>
      <el-table v-else :data="rules" stripe empty-text="没有符合条件的派单规则"><el-table-column prop="sequence" label="顺序" width="70" /><el-table-column label="名称／匹配条件" min-width="350"><template #default="{row}"><el-button link type="primary" @click="open('rule',row,true)">{{ row.name }}</el-button><p class="muted">{{ conditions(row) }}</p></template></el-table-column><el-table-column label="目标账号／组织" min-width="190"><template #default="{row}">{{ store.getName(row.targetId) }}<div class="muted">{{ store.orgName(store.state.directory.accounts.find(person => person.id === row.targetId)?.organizationId) }}</div><el-tag v-if="!store.state.directory.accounts.find(person => person.id === row.targetId)?.active" type="warning" size="small">当前目标已失效</el-tag></template></el-table-column><el-table-column label="状态／版本" min-width="120"><template #default="{row}"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag> · V{{ row.version }}</template></el-table-column><el-table-column label="修改时间" min-width="175"><template #default="{row}">{{ displayTime(row.modifiedAt) }}</template></el-table-column><el-table-column label="操作" width="180" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open('rule',row)">编辑</el-button><el-button link @click="toggle('rule',row)">{{ row.enabled ? '停用' : '启用' }}</el-button><el-button link @click="history(row.id)">记录</el-button></template></el-table-column></el-table>
      <el-collapse class="fixed-rules"><el-collapse-item title="来源能力与固定流转约束"><p>人工入口固定人工填报。来源条件“全部”仅匹配已经存在的工单；隐患样例显示“隐患转入（占位）”，自动转单仍待联合设计。</p><p>条件间同时满足，同一条件多值满足其一，同院区取唯一顺序的首条。首条目标失效保持待派发，派单人员可人工兜底。</p><p>处理必须提交验收；不通过回到处理中；待验收先退回处理后才能转派。终态只读，换人不重置处理与验收截止。</p></el-collapse-item></el-collapse>
    </section>
    <el-dialog v-model="dialog" :title="(viewOnly ? '查看' : form.id ? '编辑' : '新增') + (kind === 'category' ? '分类与默认值' : '派单规则')" width="min(820px,96vw)" class="ez-dialog" append-to-body destroy-on-close :close-on-click-modal="false">
      <el-form v-if="dialog" ref="formRef" :model="form" label-position="top" :disabled="viewOnly" class="config-form" @submit.prevent="save">
        <p class="muted">所属项目：{{ refs.project.name }}<template v-if="form.version"> · 当前版本 V{{ form.version }}</template></p>
        <el-form-item label="名称" prop="name" :rules="[{ required: true, whitespace: true, message: '请输入名称' }]"><el-input v-model="form.name" :maxlength="kind === 'category' ? 60 : 100" /></el-form-item>
        <template v-if="kind === 'category'">
          <div class="two"><el-form-item label="类别编码" prop="code" :rules="[{ required: true, message: '请输入类别编码' }]"><el-input v-model="form.code" maxlength="40" :disabled="Boolean(form.id && store.state.orders.some(row => row.categoryId === form.id))" /></el-form-item><el-form-item label="显示顺序" prop="sort" :rules="[integerRule(0)]"><el-input-number v-model="form.sort" /></el-form-item></div>
          <el-form-item label="默认优先级"><el-select v-model="form.defaultPriority"><el-option v-for="p in PRIORITIES" :key="p" :label="p" :value="p" /></el-select></el-form-item>
          <el-form-item label="默认验收方式"><el-radio-group v-model="form.acceptanceMode" @change="form.acceptanceTargetId = ''"><el-radio-button value="initiator">发起人</el-radio-button><el-radio-button value="person">指定人员</el-radio-button><el-radio-button value="role">指定角色</el-radio-button></el-radio-group></el-form-item>
          <el-form-item v-if="form.acceptanceMode !== 'initiator'" :label="form.acceptanceMode === 'role' ? '默认验收角色' : '默认验收人员'" prop="acceptanceTargetId" :rules="[{ required: true, message: '请选择默认验收对象' }]"><el-select v-model="form.acceptanceTargetId" filterable><template v-if="form.acceptanceMode === 'person'"><el-option v-for="row in store.state.directory.accounts.filter(row => row.active && row.campusIds.includes('space-campus'))" :key="row.id" :label="row.name + ' · ' + store.orgName(row.organizationId)" :value="row.id" /></template><template v-else><el-option v-for="row in store.state.directory.roles.filter(row => row.active)" :key="row.id" :label="row.name" :value="row.id" /></template></el-select></el-form-item>
          <el-form-item label="自验约束"><el-checkbox v-model="form.allowSelf">允许本次处理结果提交人自行验收</el-checkbox></el-form-item>
          <h3>优先级时限（演示自然分钟）</h3>
          <div class="limits">
            <strong>优先级</strong><strong>接单</strong><strong>处理</strong><strong>验收</strong>
            <template v-for="p in PRIORITIES" :key="p">
              <span>{{ p }}</span>
              <el-form-item v-for="key in ['receiving','processing','acceptance']" :key="key" :prop="'limits.' + p + '.' + key" :rules="limitRules(p,key)">
                <el-input-number v-model="form.limits[p][key]" controls-position="right" :aria-label="p + ({receiving:'接单',processing:'处理',acceptance:'验收'}[key]) + '时限'" />
              </el-form-item>
            </template>
          </div><p class="muted">请输入正整数，零、负数、小数会明确提示。处理时限包含接单等待，不能短于接单时限；未配置工作日历或暂停计时。</p>
        </template>
        <template v-else>
          <div class="two"><el-form-item label="适用院区"><el-select v-model="form.campusId"><el-option label="示范院区" value="space-campus" /></el-select></el-form-item><el-form-item label="匹配顺序" prop="sequence" :rules="[integerRule(1)]"><el-input-number v-model="form.sequence" /></el-form-item></div>
          <el-form-item label="工单类别（不选表示全部）"><el-select v-model="form.categoryIds" multiple clearable><el-option v-for="row in store.state.categories" :key="row.id" :label="row.name" :value="row.id" /></el-select></el-form-item>
          <el-form-item label="专业条件（不选表示全部）"><el-select v-model="form.professions" multiple clearable><el-option v-for="p in PROFESSIONS" :key="p" :label="p" :value="p" /></el-select></el-form-item>
          <el-form-item label="必要楼栋（不选表示全部）"><el-select v-model="form.buildingIds" multiple clearable><el-option v-for="row in refs.spaces.filter(row => row.type === '楼栋')" :key="row.id" :label="row.label" :value="row.id" /></el-select></el-form-item>
          <el-form-item label="来源条件"><el-radio-group :model-value="form.sources.length ? 'manual' : 'all'" @change="value => form.sources = value === 'manual' ? ['人工填报'] : []"><el-radio-button value="all">全部已有来源</el-radio-button><el-radio-button value="manual">人工填报</el-radio-button></el-radio-group></el-form-item>
          <el-form-item label="优先级条件（不选表示全部）"><el-select v-model="form.priorities" multiple clearable><el-option v-for="p in PRIORITIES" :key="p" :label="p" :value="p" /></el-select></el-form-item>
          <el-form-item label="目标处理人及组织" prop="targetId" :rules="[{ required: true, message: '请选择目标处理人' }]"><el-select v-model="form.targetId" filterable><el-option v-for="row in store.state.directory.accounts.filter(row => row.permissions.includes('handle'))" :key="row.id" :label="row.name + ' · ' + store.orgName(row.organizationId) + (row.active ? '' : '（已停用）')" :value="row.id" :disabled="!row.active" /></el-select></el-form-item>
          <p class="muted">验收安排与三类时限统一来自类别配置，派单规则不重复维护。</p>
        </template>
        <el-form-item label="适用说明"><el-input v-model="form.description" type="textarea" :rows="2" maxlength="500" /></el-form-item><el-form-item label="启用状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        <el-alert v-if="error" :title="error" type="error" :closable="false" role="alert" /><div v-if="!viewOnly" class="footer"><el-button @click="dialog = false">取消</el-button><el-button type="primary" native-type="submit" :loading="saving">保存配置</el-button></div>
      </el-form><template v-if="viewOnly" #footer><el-button @click="dialog = false">关闭</el-button></template>
    </el-dialog>
    <el-drawer v-model="historyOpen" title="配置修改记录" size="min(700px,96vw)" append-to-body><el-empty v-if="!logs.length" description="尚无本轮配置修改；初始版本保存在版本快照中" /><article v-for="row in logs" :key="row.id" class="history-record"><strong>{{ row.after?.name || row.action }}</strong><p>{{ displayTime(row.at) }} · {{ row.actor.name }}</p><template v-if="row.objectId"><p>版本 V{{ row.before?.version || 0 }} → V{{ row.after.version }} · {{ row.after.enabled ? '启用' : '停用' }}</p><el-button link type="primary" @click="open(row.action === 'saveCategory' ? 'category' : 'rule', row.after, true)">查看该版本快照</el-button></template></article></el-drawer>
  </main>
</template>
<style scoped src="./work-order.css"></style>
<style scoped>
.toolbar{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.toolbar>.el-input{width:260px}.toolbar>.el-select{width:160px}.toolbar .el-button{margin:0}.fixed-rules{margin-top:24px}.fixed-rules p{line-height:1.8;color:var(--ez-text-secondary)}.config-form{display:grid;gap:12px}.config-form .el-form-item{margin-bottom:6px}.config-form .el-select{width:100%}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.limits{display:grid;grid-template-columns:75px repeat(3,minmax(0,1fr));gap:12px;align-items:center;overflow:auto}.limits .el-input-number{width:100%}.limits strong{font-size:13px}.footer{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--ez-border);padding-top:14px}.history-record{border:1px solid var(--ez-border);padding:16px;border-radius:12px;margin-bottom:14px;line-height:1.8}@media(max-width:600px){.two{grid-template-columns:1fr}.limits{grid-template-columns:50px repeat(3,minmax(85px,1fr))}}
</style>
