<script setup>
defineProps({ groups: { type: Array, default: () => [] }, reference: Boolean })
defineEmits(['open'])
</script>
<template>
  <article v-for="group in groups" :key="group.key" class="source-card">
    <div class="source-heading"><strong>{{ group.title }}</strong><el-button link type="primary" @click="$emit('open', group)">查看资料</el-button></div>
    <p class="meta">{{ group.type }} · V{{ group.version }} · {{ group.fragments.length }} 个片段<span v-if="group.scope"> · {{ group.scope }}{{ group.project ? ' / 项目' + group.project : '' }}</span></p>
    <p v-if="reference" class="reference-note">{{ group.relation || '相关资料参考' }}，不作为当前设备的诊断依据。</p>
    <el-collapse><el-collapse-item :title="`展开引用原文（${group.fragments.length}）`" :name="group.key"><blockquote v-for="f in group.fragments" :key="f.fragmentId">{{ f.text }}</blockquote></el-collapse-item></el-collapse>
  </article>
</template>
<style scoped>
.source-card { padding:12px; margin:10px 0; border:1px solid var(--ez-border); border-radius:var(--ez-control-radius); background:var(--ez-card-bg); }
.source-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }.source-heading strong { line-height:1.7; overflow-wrap:anywhere; }.source-heading .el-button { flex-shrink:0; }
.meta,.reference-note { font-size:12px; color:var(--ez-text-secondary); margin:6px 0; } blockquote { margin:8px 0; padding-left:12px; border-left:3px solid var(--ez-primary); line-height:1.8; }
.source-card :deep(.el-collapse) { border:0; }.source-card :deep(.el-collapse-item__header) { background:transparent; height:34px; font-size:12px; }.source-card :deep(.el-collapse-item__wrap) { border:0; }
</style>
