<script setup>
import { computed, ref, watch } from 'vue'
import { knowledgeStore as store } from '../../data/knowledgeAiMock.js'
import { kbEntries } from '../../data/knowledgeBase.js'
const props = defineProps({ id: String, version: Number, fragments: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'closed'])
const selected = ref(null)
watch(() => [props.id, props.version], () => { selected.value = props.version || store.getDocument(props.id)?.versions.at(-1).number }, { immediate: true })
const doc = computed(() => store.getDocument(props.id))
const item = computed(() => store.versionOf(props.id, selected.value))
const seed = computed(() => item.value?.seed ? kbEntries.find(e => e.id === doc.value?.legacyId) : null)
const cited = computed(() => selected.value === props.version ? props.fragments.filter(f => item.value?.fragments.some(v => v.id === f.fragmentId && v.text === f.text)) : [])
const bodyParts = computed(() => {
  const body = item.value?.body || '', ranges = []
  for (const f of cited.value) { let from = 0, start; while ((start = body.indexOf(f.text, from)) !== -1) { ranges.push({ start, end: start + f.text.length }); from = start + f.text.length } }
  const parts = []; let cursor = 0
  for (const r of ranges.sort((a,b) => a.start-b.start || b.end-a.end)) { if (r.start < cursor) continue; parts.push({ text: body.slice(cursor,r.start), highlight:false }, { text:body.slice(r.start,r.end), highlight:true }); cursor=r.end }
  parts.push({ text:body.slice(cursor), highlight:false }); return parts
})
</script>
<template>
  <el-drawer :model-value="Boolean(id)" title="知识资料详情" size="min(760px, 92vw)" append-to-body @close="emit('close')" @closed="emit('closed')">
    <template v-if="doc && item">
      <h2 class="title">{{ item.title }}</h2>
      <div class="version-row"><el-tag>{{ item.type }}</el-tag><span>{{ doc.id }} · 查看 V{{ item.number }}</span><el-tag :type="item.status === '已发布' ? 'success' : 'info'">{{ item.status }}</el-tag><span>{{ item.domain }} · {{ item.scope }}{{ item.project ? ' / 项目'+item.project : '' }}</span></div>
      <el-alert :closable="false" :title="doc.archived ? '资料已归档，不参与新问答检索' : doc.currentVersion === item.number ? '当前有效版本（演示）' : '非当前有效版本，不参与新问答检索'" type="info" />
      <p v-if="cited.length" class="citation-note">本次引用 V{{ version }} · {{ cited.length }} 个片段，已在原文中突出显示。</p>
      <el-alert v-if="item.rejection" :title="`退回原因：${item.rejection}`" type="warning" :closable="false" />
      <h3>资料正文</h3>
      <div v-if="cited.length" class="body plain"><template v-for="(part,i) in bodyParts" :key="i"><mark v-if="part.highlight">{{ part.text }}</mark><span v-else>{{ part.text }}</span></template></div>
      <!-- HTML is restricted to the immutable repository seed. All user content is text. -->
      <div v-else-if="seed" class="body" v-html="seed.content"></div>
      <div v-else class="body plain">{{ item.body || '暂无正文；附件登记不代表知识提取完成。' }}</div>
      <el-collapse class="detail-sections">
      <el-collapse-item title="基础属性及关联信息" name="metadata">
      <el-descriptions :column="2" border class="metadata">
        <el-descriptions-item label="资料类型">{{ item.type }}</el-descriptions-item><el-descriptions-item label="专业系统">{{ item.domain }}</el-descriptions-item>
        <el-descriptions-item label="知识范围">{{ item.scope }}</el-descriptions-item><el-descriptions-item label="所属项目">{{ item.project ? `项目${item.project}` : '各有权限项目' }}</el-descriptions-item>
        <el-descriptions-item label="资料状态">{{ item.status }}</el-descriptions-item><el-descriptions-item label="加工状态">{{ item.processing }} / {{ item.validation }}</el-descriptions-item>
        <el-descriptions-item label="关联设备">{{ item.device || '未关联' }}</el-descriptions-item><el-descriptions-item label="资料来源">{{ item.source }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ item.creator }}</el-descriptions-item><el-descriptions-item label="更新时间">{{ item.updatedAt }}</el-descriptions-item>
        <el-descriptions-item label="来源说明" :span="2">{{ item.sourceNote || '无' }}</el-descriptions-item>
        <el-descriptions-item label="附件登记" :span="2">{{ item.attachment?.name || '无' }}（未上传、未解析）</el-descriptions-item>
      </el-descriptions>
      </el-collapse-item><el-collapse-item :title="`知识加工片段（${item.fragments.length}）`" name="fragments">
      <div v-for="f in item.fragments" :key="f.id" class="fragment"><el-tag>{{ f.kind }}</el-tag> {{ f.text }}<small>{{ f.origin }}</small></div>
      <p class="note">候选规则仅展示正文摘录，不成为生效阈值或推理规则。</p>
      </el-collapse-item><el-collapse-item title="历史版本及审核记录" name="history">
      <el-select v-model="selected" aria-label="查看资料版本" style="width:260px"><el-option v-for="v in doc.versions" :key="v.number" :value="v.number" :label="`V${v.number} · ${v.status}${doc.currentVersion === v.number ? ' · 当前有效' : ''}`" /></el-select>
      <h3>审核记录（模拟）</h3><el-empty v-if="!item.reviews.length" description="暂无人工审核记录；种子仅为预置演示状态" :image-size="48" />
      <p v-for="(r, i) in item.reviews" :key="i">{{ r.at }} · {{ r.by }} · {{ r.result }} {{ r.reason }}</p>
      </el-collapse-item></el-collapse>
    </template>
    <el-empty v-else-if="id" description="当前会话中不存在该资料或版本；请在登记资料的原标签页查看，并核对会话存储提示。" />
    <template #footer><slot name="footer"/><el-button @click="emit('close')">关闭详情</el-button></template>
  </el-drawer>
</template>
<style scoped>
.title { font-size:var(--ez-font-size-title); overflow-wrap:anywhere; margin-bottom:16px; }
.version-row { display:flex; flex-wrap:wrap; align-items:center; gap:16px; margin-bottom:16px; }
.metadata { margin:16px 0; } h3 { margin:20px 0 12px; }
.detail-sections { margin-top:24px; }.citation-note { padding:10px; color:var(--ez-primary); background:var(--ez-primary-bg); margin-top:12px; }mark { background:var(--ez-primary-bg); color:var(--ez-text); border-bottom:2px solid var(--ez-primary); padding:2px 0; }
.body,.fragment { line-height:1.8; overflow-wrap:anywhere; }.plain { white-space:pre-wrap; }
.fragment { padding:12px; border-bottom:1px solid var(--ez-border); }
small { display:block; color:var(--ez-text-secondary); }.note { color:var(--ez-text-secondary); margin-top:12px; }
</style>
