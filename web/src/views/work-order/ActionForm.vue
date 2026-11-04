<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { workOrderStore as store, ACTION_LABELS, PRIORITIES, clone, displayTime } from '../../data/workOrder.js'
import AcceptancePicker from './AcceptancePicker.vue'
import AttachmentPicker from './AttachmentPicker.vue'
const props = defineProps({ order: { type: Object, required: true }, action: { type: String, required: true } })
const emit = defineEmits(['done', 'cancel'])
let ctx = store.context(props.order)
const form = reactive({ text: '', targetId: '', accountIds: clone(props.order.collaboratorIds), acceptance: clone(props.order.acceptance),
  deadline: props.order.processingDeadline, priority: props.order.priority, photos: [], completed: false, conclusion: '通过' })
const error = ref(''), saving = ref(false), reading = ref(false), formRef = ref()
const handlers = computed(() => store.handlers(props.order).filter(row => props.action !== 'transfer' || row.id !== props.order.handlerId))
const preview = computed(() => store.rulePreview(props.order))
const textRequired = computed(() => ['return', 'transfer', 'deadline', 'priority', 'terminate', 'submit'].includes(props.action) ||
  (props.action === 'changeAcceptance' && Boolean(props.order.firstDispatchedAt)) || (props.action === 'review' && form.conclusion === '不通过'))
const textLabel = computed(() => ({ supplement: '问题补充说明', feedback: '处理过程说明', submit: '本次处理结果', transfer: '转派原因与现场交接', return: '接单前退回原因', review: '验收说明', terminate: '终止原因', deadline: '期限调整原因', changeAcceptance: '修改验收对象原因', priority: '优先级调整原因', dispatch: '派发说明' }[props.action] || '说明'))
const photosAllowed = computed(() => ['supplement', 'feedback', 'submit', 'review'].includes(props.action))
function refresh() { const latest = store.getOrder(props.order.id); if (latest) { ctx = store.context(latest); error.value = '已读取最新版本，请核对当前状态与责任后重新提交。' } }
async function save() {
  error.value = ''
  if (!(await formRef.value.validate().catch(() => false))) { error.value = '请补齐标红的必填项'; return }
  saving.value = true
  const payload = { ...clone(form), orderId: props.order.id }
  const result = store.execute(props.action, payload, ctx); saving.value = false
  if (!result.ok) { error.value = result.error; return }
  if (result.dispatched === false) ElMessage.warning('仍为待派发：' + result.reason)
  else ElMessage.success(ACTION_LABELS[props.action] + '成功')
  emit('done')
}
</script>
<template>
  <el-form ref="formRef" :model="form" label-position="top" scroll-to-error class="action-form" @submit.prevent="save">
    <p class="hint">{{ order.code }} · {{ order.title }}<br>操作账号：{{ store.currentActor()?.name }}</p>
    <el-alert v-if="action === 'receive'" title="确认由当前账号接单，处理期限沿用首次派发确定的截止。" type="info" :closable="false" />
    <el-alert v-if="action === 'terminate'" title="终止后业务内容只读，不产生验收通过事实。" type="warning" :closable="false" />
    <template v-if="action === 'dispatchByRule'"><el-alert :title="preview.error || '规则目标有效，可以明确派发'" :type="preview.error ? 'warning' : 'success'" :closable="false" /><dl v-if="preview.rule"><dt>首条命中</dt><dd>{{ preview.rule.name }} · V{{ preview.rule.version }} · 顺序 {{ preview.rule.sequence }}</dd><dt>目标</dt><dd>{{ store.getName(preview.rule.targetId) }} · {{ store.orgName(store.state.directory.accounts.find(row => row.id === preview.rule.targetId)?.organizationId) }}</dd></dl><p class="hint">条件同时满足，按院区唯一顺序取首条；首条目标失效时保留待派发。</p></template>
    <el-form-item v-if="['dispatch','transfer'].includes(action)" label="目标处理人" prop="targetId" :rules="[{ required: true, message: '请选择目标处理人' }]"><el-select v-model="form.targetId" filterable placeholder="选择账号，同时核对其组织"><el-option v-for="row in handlers" :key="row.id" :value="row.id" :label="row.name + ' · ' + store.orgName(row.organizationId)" /></el-select></el-form-item>
    <el-form-item v-if="action === 'collaborators'" label="当前协办人员"><el-select v-model="form.accountIds" multiple clearable filterable><el-option v-for="row in handlers.filter(row => row.id !== order.handlerId)" :key="row.id" :value="row.id" :label="row.name + ' · ' + store.orgName(row.organizationId)" /></el-select><p class="hint">移除保留既有反馈；协办不能替主处理人提交验收。</p></el-form-item>
    <el-form-item v-if="action === 'changeAcceptance'" label="新验收对象"><AcceptancePicker v-model="form.acceptance" /><p class="hint">当前：{{ store.acceptanceLabel(order.acceptance) }}。更换不重置本次验收截止。</p></el-form-item>
    <el-form-item v-if="action === 'deadline'" label="新处理截止" prop="deadline" :rules="[{ required: true, message: '请选择新处理截止' }]"><el-date-picker v-model="form.deadline" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" format="YYYY-MM-DD HH:mm" placeholder="北京时间" /><p class="hint">当前：{{ displayTime(order.processingDeadline) }}；已提交结果的截止快照与逾期结论保持原样。</p></el-form-item>
    <el-form-item v-if="action === 'priority'" label="新优先级"><el-select v-model="form.priority"><el-option v-for="p in PRIORITIES" :key="p" :value="p" :label="p" /></el-select><p class="hint">流转后调整优先级不自动重算时长与截止。</p></el-form-item>
    <el-form-item v-if="action === 'review'" label="验收结论"><el-radio-group v-model="form.conclusion"><el-radio-button value="通过">通过</el-radio-button><el-radio-button value="不通过">不通过，退回处理</el-radio-button></el-radio-group></el-form-item>
    <el-form-item v-if="!['receive','dispatchByRule','collaborators'].includes(action)" :label="textLabel" prop="text" :rules="textRequired ? [{ required: true, whitespace: true, message: '请填写' + textLabel, trigger: 'blur' }] : []"><el-input v-model="form.text" type="textarea" :rows="4" maxlength="2000" show-word-limit /></el-form-item>
    <el-form-item v-if="photosAllowed" label="本次图片与证据"><AttachmentPicker v-model="form.photos" :existing="order.attachments" @busy="value => reading = value" /></el-form-item>
    <el-form-item v-if="action === 'submit'" prop="completed" :rules="[{ validator: (_r,value,callback) => value ? callback() : callback(new Error('请确认处理目标已完成')), trigger: 'change' }]"><el-checkbox v-model="form.completed">本次处理目标已完成，提交验收</el-checkbox></el-form-item>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon role="alert" />
    <el-button v-if="error.includes('变化') || error.includes('切换')" link type="primary" @click="refresh">读取最新工单并保留输入</el-button>
    <div class="footer"><el-button @click="emit('cancel')">取消</el-button><el-button native-type="submit" :type="action === 'terminate' ? 'danger' : 'primary'" :loading="saving" :disabled="reading">确认{{ ACTION_LABELS[action] }}</el-button></div>
  </el-form>
</template>
<style scoped>
.action-form{display:grid;gap:14px}.hint{font-size:12px;color:var(--ez-text-secondary);line-height:1.8}.el-select,.el-date-editor{width:100%}dt{font-size:12px;color:var(--ez-text-secondary)}dd{margin:6px 0 12px;line-height:1.8}.footer{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--ez-border);padding-top:14px}.el-form-item{margin-bottom:6px}@media(max-width:600px){.footer{position:sticky;bottom:0;background:var(--ez-card-bg);padding:12px 0;z-index:1}.footer .el-button{flex:1}}
</style>
