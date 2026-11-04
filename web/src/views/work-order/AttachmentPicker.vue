<script setup>
import { computed, ref } from 'vue'
const props = defineProps({ modelValue: { type: Array, default: () => [] }, existing: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue', 'busy'])
const error = ref(''), reading = ref(false)
const pictures = computed(() => props.modelValue.map(photo => photo.attachmentId ? { ...props.existing.find(row => row.id === photo.attachmentId), reference: true } : photo))
const urls = computed(() => pictures.value.map(row => row.dataUrl).filter(Boolean))
function remove(index) { emit('update:modelValue', props.modelValue.filter((_, i) => i !== index)) }
function reference(ids) {
  const fresh = props.modelValue.filter(row => !row.attachmentId)
  if (ids.length + fresh.length > 3) { error.value = '每次最多选择3张图片'; return }
  emit('update:modelValue', [...fresh, ...ids.map(attachmentId => ({ attachmentId }))]); error.value = ''
}
async function choose(file) {
  const raw = file.raw
  if (reading.value) return
  if (!raw || !['image/png', 'image/jpeg', 'image/webp'].includes(raw.type) || raw.size > 1024 * 1024) { error.value = '仅支持PNG、JPEG、WebP，每张不超过1MB'; return }
  if (props.modelValue.length >= 3) { error.value = '每次最多选择3张图片'; return }
  reading.value = true; emit('busy', true)
  try {
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(raw) })
    const preview = new Image()
    preview.src = dataUrl
    await preview.decode()
    emit('update:modelValue', [...props.modelValue, { name: raw.name, dataUrl }]); error.value = ''
  } catch { error.value = '图片读取失败，文字已保留，请重新选择' }
  finally { reading.value = false; emit('busy', false) }
}
</script>
<template>
  <div class="attachment-picker">
    <el-upload :auto-upload="false" :show-file-list="false" accept="image/png,image/jpeg,image/webp" :on-change="choose" :disabled="reading || modelValue.length >= 3"><el-button :loading="reading">选择现场图片</el-button></el-upload>
    <p class="hint">图片仅保存在当前浏览器；每次最多3张，每张≤1MB。</p>
    <el-select v-if="existing.length" :model-value="modelValue.filter(row => row.attachmentId).map(row => row.attachmentId)" multiple clearable placeholder="引用本单已有图片，无需重新上传" @change="reference">
      <el-option v-for="row in existing" :key="row.id" :label="row.name + ' · ' + row.actor.name" :value="row.id" />
    </el-select>
    <div class="photos">
      <figure v-for="(photo,index) in pictures" :key="photo.id || index"><el-image :src="photo.dataUrl" :preview-src-list="urls" preview-teleported fit="cover" :alt="photo.name" /><figcaption>{{ photo.name }}{{ photo.reference ? '（引用）' : '' }}</figcaption><el-button link type="danger" @click="remove(index)">移除未提交图片</el-button></figure>
    </div>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
  </div>
</template>
<style scoped>
.attachment-picker{width:100%;display:grid;gap:10px}.hint{font-size:12px;line-height:1.6;color:var(--ez-text-secondary)}.photos{display:flex;gap:12px;flex-wrap:wrap}.photos figure{width:115px;margin:0}.el-image{width:110px;height:84px;border-radius:8px;border:1px solid var(--ez-border)}figcaption{font-size:12px;overflow-wrap:anywhere}.error{color:var(--ez-danger);font-size:13px}
</style>
