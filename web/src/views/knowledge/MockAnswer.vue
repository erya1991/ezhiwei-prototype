<script setup>
import { onMounted } from 'vue'
import RuleResult from './RuleResult.vue'
import KnowledgeSources from './KnowledgeSources.vue'
import { adviceExcerpts } from '../../data/knowledgeAiPresentation.js'
defineProps({ message: { type: Object, required: true } })
const emit = defineEmits(['open-source', 'ready'])
onMounted(() => emit('ready'))
</script>
<template>
  <section class="mock-answer">
    <p class="context">{{ message.context }}<span v-if="message.knowledge.devices.length"> · {{ message.knowledge.devices.join('、') }}</span></p>
    <h3>当前判断与待核实信息</h3><p>{{ message.text }}</p>
    <RuleResult v-if="message.ruleResult.configs.length" :result="message.ruleResult" compact @open-source="$emit('open-source',$event)"/>
    <p v-else class="note">未匹配到适用的推理规则，暂不能进行阈值判断；可补充设备型号、具体异常及实测值。</p>
    <template v-if="adviceExcerpts(message.knowledge.direct).length"><h3>排查及处置建议</h3><p class="note">以下摘取直接相关资料中的核查要点，须结合现场情况由专业人员确认。</p><ol><li v-for="(item,i) in adviceExcerpts(message.knowledge.direct)" :key="i">{{ item.text }}</li></ol></template>
    <template v-if="message.ruleResult.configs.length"><div v-for="config in message.ruleResult.configs" :key="config.id" class="configured-advice"><p><strong>规则配置建议：</strong>{{ config.advice }}</p><details><summary>查看需核实的条件</summary><p class="multiline">{{ config.steps }}</p></details></div></template>
    <template v-if="message.knowledge.direct.length"><h3>知识依据</h3><KnowledgeSources :groups="message.knowledge.direct" @open="$emit('open-source',$event)"/></template>
    <details v-if="message.knowledge.related.length" class="related"><summary>相关资料参考（{{ message.knowledge.related.length }} 份，非当前设备诊断依据）</summary><KnowledgeSources :groups="message.knowledge.related" reference @open="$emit('open-source',$event)"/></details>
    <div class="safety"><strong>必要安全提示</strong><template v-if="message.ruleResult.configs.length"><p v-for="config in message.ruleResult.configs" :key="config.id">{{ config.safety }}</p></template><p v-else>Mock演示，不作为设备安全标准或操作指令；涉及设备操作请交由专业人员按现场制度确认。</p></div>
  </section>
</template>
<style scoped>
.mock-answer { font-size:14px; line-height:1.8; }.mock-answer h3 { font-size:16px; margin:14px 0 8px; }.mock-answer p { margin:6px 0; }.context,.note { font-size:12px; color:var(--ez-text-secondary); }.mock-answer ol { padding-left:22px; }.mock-answer li { margin:8px 0; }.related,.safety { margin-top:16px; }.safety { padding:10px 12px; background:var(--ez-primary-bg); border-radius:var(--ez-control-radius); font-size:12px; }.multiline { white-space:pre-wrap; }summary { cursor:pointer; color:var(--ez-primary); }.configured-advice { margin:12px 0; }
</style>
