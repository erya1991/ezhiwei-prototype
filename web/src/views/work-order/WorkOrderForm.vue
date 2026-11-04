<script setup>
import { computed, ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { workOrderStore as store, clone, PRIORITIES, PROFESSIONS } from '../../data/workOrder.js'
import AcceptancePicker from './AcceptancePicker.vue'
import AttachmentPicker from './AttachmentPicker.vue'
const props = defineProps({ order: { type: Object, default: null }, mobile: Boolean })
const emit = defineEmits(['saved', 'cancel'])
const initial = props.order ? clone(props.order) : null, refs = store.currentCatalog(), ctx = store.context(initial)
const firstCategory = store.state.categories.find(row => row.enabled), formRef = ref(), error = ref(''), saving = ref(false), reading = ref(false)
let priorityChosen = Boolean(initial)
const form = reactive(initial ? {
  title: initial.title, description: initial.description, categoryId: initial.categoryId, priority: initial.priority, profession: initial.profession,
  spaceId: initial.spaceId, location: initial.location, assetId: initial.assetId, acceptance: clone(initial.acceptance), acceptanceOrigin: initial.acceptanceOrigin,
  photos: initial.originalPhotoIds.map(attachmentId => ({ attachmentId })), useDefault: false
} : {
  title: '', description: '', categoryId: firstCategory?.id || '', priority: firstCategory?.defaultPriority || '普通', profession: '', spaceId: '', location: '', assetId: '',
  acceptance: firstCategory ? store.defaultAcceptance(firstCategory, store.state.actorId) : { type: 'person', targetId: '' }, acceptanceOrigin: 'default', photos: [], useDefault: false
})
const adopted = computed(() => initial && form.categoryId === initial.categoryId ? initial.categorySnapshot : store.state.categories.find(row => row.id === form.categoryId))
const categories = computed(() => store.state.categories.filter(row => row.enabled || row.id === initial?.categoryId))
const rules = { title: [{ required: true, message: '请输入工单标题', trigger: 'blur' }], description: [{ required: true, message: '请输入问题描述', trigger: 'blur' }], categoryId: [{ required: true, message: '请选择类别' }], spaceId: [{ required: true, message: '请选择位置' }] }
function priorityChanged() { priorityChosen = true }
function categoryChanged() {
  if (!priorityChosen) form.priority = adopted.value?.defaultPriority || '普通'
  if (form.acceptanceOrigin === 'default') form.acceptance = store.defaultAcceptance(adopted.value, initial?.initiatorId || store.state.actorId)
}
function assetChanged(id) {
  const asset = refs.assets.find(row => row.id === id)
  if (asset) { form.spaceId = asset.spaceId; form.profession = asset.profession || form.profession; form.location = asset.location || '' }
}
function manualAcceptance(value) { form.acceptance = value; form.acceptanceOrigin = 'manual'; form.useDefault = false }
function useDefault() { form.acceptance = store.defaultAcceptance(adopted.value, initial?.initiatorId || store.state.actorId); form.acceptanceOrigin = 'default'; form.useDefault = true }
async function save() {
  error.value = ''
  if (!(await formRef.value.validate().catch(() => false))) { error.value = '请补齐标红的必填项'; formRef.value.scrollToField(Object.keys(rules).find(key => !form[key])); return }
  saving.value = true
  const payload = clone(form)
  if (initial) {
    payload.orderId = initial.id; payload.keptPhotoIds = payload.photos.filter(row => row.attachmentId).map(row => row.attachmentId)
    payload.photos = payload.photos.filter(row => !row.attachmentId)
  }
  const result = store.execute(initial ? 'edit' : 'create', payload, ctx)
  saving.value = false
  if (!result.ok) {
    error.value = result.error
    const key = result.error.includes('位置') || result.error.includes('空间') ? 'spaceId' : result.error.includes('标题') ? 'title' : result.error.includes('描述') ? 'description' : 'categoryId'
    formRef.value.scrollToField(key); return
  }
  if (result.created && !result.dispatched) ElMessage.warning('建单成功，保持待派发：' + result.reason)
  else ElMessage.success(initial ? '原问题已保存' : '建单成功，已按规则派发')
  emit('saved', result.id)
}
</script>
<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="order-form" @submit.prevent="save">
    <el-alert v-if="refs.notice" :title="refs.notice" type="warning" :closable="false" />
    <p class="hint">人工填报 · {{ refs.project.name }} · 来源、发起人、编号和时间由系统记录。</p>
    <h3>问题信息</h3>
    <el-form-item label="工单标题" prop="title"><el-input v-model="form.title" maxlength="100" show-word-limit placeholder="简要说明问题" /></el-form-item>
    <div class="two"><el-form-item label="工单类别" prop="categoryId"><el-select v-model="form.categoryId" @change="categoryChanged"><el-option v-for="row in categories" :key="row.id" :label="row.name" :value="row.id" /></el-select></el-form-item><el-form-item label="优先级"><el-select v-model="form.priority" @change="priorityChanged"><el-option v-for="p in PRIORITIES" :key="p" :label="p" :value="p" /></el-select></el-form-item></div>
    <el-form-item label="问题描述" prop="description"><el-input v-model="form.description" type="textarea" :rows="4" maxlength="2000" show-word-limit placeholder="现象、影响及已知情况；照片不能替代文字" /></el-form-item>
    <h3>位置与对象</h3>
    <el-form-item label="关联设备／设施（可为空）"><el-select v-model="form.assetId" clearable filterable placeholder="选择设备带出已有位置与专业" @change="assetChanged"><el-option v-for="row in refs.assets" :key="row.id" :label="row.name + ' · ' + row.code" :value="row.id" /></el-select></el-form-item>
    <el-form-item label="所在空间" prop="spaceId"><el-select v-model="form.spaceId" filterable placeholder="选择已有空间，无需新建完整房间树"><el-option v-for="row in refs.spaces.filter(row => row.status !== '暂不使用')" :key="row.id" :label="row.label" :value="row.id" /></el-select></el-form-item>
    <el-form-item label="具体位置说明"><el-input v-model="form.location" maxlength="500" placeholder="选择楼栋／楼层时需补充可定位的现场位置" /></el-form-item>
    <el-form-item label="专业分类"><el-select v-model="form.profession" clearable placeholder="创建时可暂缺，正式派发前必须明确"><el-option v-for="p in PROFESSIONS" :key="p" :label="p" :value="p" /></el-select></el-form-item>
    <el-form-item label="问题图片"><AttachmentPicker v-model="form.photos" :existing="initial?.attachments || []" @busy="value => reading = value" /></el-form-item>
    <h3>验收安排</h3>
    <p class="hint">采用类别 V{{ adopted?.version }}，{{ adopted?.allowSelf ? '允许' : '不允许' }}处理结果提交人自验。{{ form.acceptanceOrigin === 'manual' ? '本单已手动指定' : '当前来自类别默认' }}。</p>
    <el-form-item label="本单验收对象"><AcceptancePicker :model-value="form.acceptance" @update:model-value="manualAcceptance" /></el-form-item>
    <el-button link type="primary" @click="useDefault">重新采用本单类别默认验收</el-button>
    <p class="hint">演示时长（自然分钟）：接单 {{ adopted?.limits[form.priority]?.receiving }} / 处理 {{ adopted?.limits[form.priority]?.processing }} / 验收 {{ adopted?.limits[form.priority]?.acceptance }}。默认对象失效时仍可建单，正式派发前须调整。</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon role="alert" />
    <div class="footer"><el-button @click="emit('cancel')">取消</el-button><el-button type="primary" native-type="submit" :loading="saving" :disabled="reading">{{ initial ? '保存修改' : '提交人工报修' }}</el-button></div>
  </el-form>
</template>
<style scoped>
.order-form{display:grid;gap:12px}.order-form h3{font-size:16px;margin:8px 0}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.el-select{width:100%}.hint{font-size:12px;line-height:1.8;color:var(--ez-text-secondary)}.footer{display:flex;justify-content:flex-end;gap:10px;padding-top:16px;border-top:1px solid var(--ez-border)}.el-form-item{margin-bottom:8px}@media(max-width:600px){.two{grid-template-columns:1fr;gap:8px}.footer{position:sticky;bottom:0;background:var(--ez-card-bg);padding:12px 0;z-index:1}.footer .el-button{flex:1}}
</style>
