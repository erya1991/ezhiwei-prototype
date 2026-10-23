<script setup>
import { computed, ref } from 'vue'
import { groupSources, conditionSummary } from '../../data/knowledgeAiPresentation.js'
import KnowledgeSources from './KnowledgeSources.vue'
import MaterialDetail from './MaterialDetail.vue'
const props = defineProps({ result: { type: Object, required: true }, compact: Boolean })
const emit = defineEmits(['open-source'])
const detail = ref(null)
const groups = computed(() => groupSources(props.result.knowledge))
const statusText = { conflict: '阈值冲突', insufficient: '依据不足', missing: '需补充读数', triggered: '触发Mock条件', 'not-triggered': '未触发Mock条件' }
const statusType = { conflict: 'danger', insufficient: 'warning', missing: 'info', triggered: 'warning', 'not-triggered': 'success' }
function openSource(source) {
  const group = source.fragments ? source : groupSources([source])[0] || { ...source, fragments: [] }
  if (!group) return
  if (props.compact) emit('open-source', group)
  else detail.value = group
}
</script>
<template>
  <section class="rule-result">
    <template v-if="!compact"><h3>当前判断与待核实信息</h3><p>{{ result.project ? '项目' + result.project : '平台通用' }} · {{ result.domain || '专业待确认' }} · {{ result.device || '设备待确认' }}</p><p>{{ result.summary }}</p></template>
    <p v-for="gap in result.gaps" :key="gap" class="gap">{{ gap }}</p>
    <article v-for="decision in result.decisions" :key="decision.metric" class="decision">
      <el-tag :type="statusType[decision.status]">{{ statusText[decision.status] }}</el-tag> <strong>{{ decision.metric }}</strong><p>{{ decision.message }}</p>
    </article>
    <template v-if="!compact && result.configs.length"><h3>排查及处置建议</h3><div v-for="config in result.configs" :key="config.id"><p class="multiline">{{ config.steps }}</p><p>{{ config.advice }}</p></div></template>
    <el-collapse v-if="result.configs.length" class="rule-basis"><el-collapse-item title="查看匹配规则与适用依据" name="rules">
      <div v-for="config in result.configs" :key="config.id" class="basis"><router-link :to="{path:'/reasoning-rules',query:{rule:config.id,version:config.number}}">{{ config.name }} · V{{ config.number }}</router-link><p>适用场景：{{ config.scenario }}</p></div>
      <div v-for="decision in result.decisions" :key="decision.metric"><div v-for="rule in decision.rules" :key="rule.id" class="basis">
        <router-link :to="{path:'/threshold-rules',query:{rule:rule.id,version:rule.number}}">{{ rule.name }} · V{{ rule.number }}</router-link>
        <p>{{ conditionSummary(rule) }} · {{ rule.scope }}{{ rule.project ? ' / 项目' + rule.project : '' }}</p><p>{{ rule.applicability }}</p>
        <el-button v-if="rule.source" link type="primary" class="source-link" @click="openSource(rule.source)">查看来源：{{ rule.source.title }} · V{{ rule.source.version }}</el-button><p v-else class="gap">来源资料当前不可引用，需专业人员核实。</p>
      </div></div>
    </el-collapse-item></el-collapse>
    <template v-if="!compact"><h3 v-if="groups.length">知识依据</h3><KnowledgeSources :groups="groups" @open="openSource"/><p v-if="result.configs.length && !groups.length" class="gap">暂无有效知识依据，不能形成确定结论。</p><h3 v-if="result.configs.length">必要安全提示</h3><p v-for="config in result.configs" :key="config.id">{{ config.safety }}</p><p class="note">Mock演示，仅辅助复核，不作为设备安全标准或实际操作指令。</p><MaterialDetail :id="detail?.documentId || ''" :version="detail?.version" :fragments="detail?.fragments || []" @close="detail=null"/></template>
  </section>
</template>
<style scoped>
.rule-result { min-width:0; overflow-wrap:anywhere; line-height:1.7; color:var(--ez-text); }.rule-result h3 { margin:16px 0 8px; font-size:var(--ez-font-size-card-title); }.rule-result p { margin:8px 0; }.rule-result a { color:var(--ez-primary); }.gap { color:var(--ez-warning-text); }.decision { padding:12px; border:1px solid var(--ez-border); border-radius:var(--ez-control-radius); margin:10px 0; }.basis { padding:10px 0; border-bottom:1px solid var(--ez-border); }.multiline { white-space:pre-wrap; }.note { font-size:12px; color:var(--ez-text-secondary); }.source-link { height:auto; white-space:normal; text-align:left; }.rule-basis :deep(.el-collapse-item__header),.rule-basis :deep(.el-collapse-item__wrap) { background:transparent; }
</style>
