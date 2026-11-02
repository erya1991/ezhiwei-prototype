<script setup>
defineProps({ expansion:{type:Object,required:true} })
</script>
<template>
  <div class="expansion-preview">
    <p v-if="expansion.rule" class="muted">采用规则：{{ expansion.rule.name }} · V{{ expansion.rule.version }}</p>
    <p v-if="expansion.roots?.length" class="muted">实际范围：{{ expansion.roots.map(root=>`${root.name}（${root.code}）`).join('、') }}</p>
    <div class="counts"><span><strong>{{ expansion.points.length }}</strong> 个检查点</span><span><strong>{{ expansion.objectCount }}</strong> 个实际对象</span><span><strong>{{ expansion.itemCount }}</strong> 条检查项</span></div>
    <div v-if="expansion.issues.length" class="issues" role="alert"><strong>待补充 / 不适用，不能启用</strong><ul><li v-for="issue in expansion.issues" :key="issue">{{ issue }}</li></ul></div>
    <article v-for="(point,index) in expansion.points" :key="point.id" class="point"><h3>{{ index+1 }}. {{ point.space.name }}</h3><p class="muted">{{ point.space.spacePath }} · {{ point.space.location || '按空间位置到达' }}</p><div v-for="group in point.groups" :key="`${group.id}-${group.object.id}`" class="object"><strong>{{ group.object.name }}</strong> <el-tag size="small" type="info">{{ group.object.code }} · {{ group.object.type }}</el-tag><p class="muted">稳定对象ID：{{ group.object.id }}<span v-if="group.matchPaths?.length"> · 匹配路径：{{ group.matchPaths.join('、') }}</span></p><p class="muted">{{ group.name }}：{{ group.items.map(item=>`${item.name}${item.unit?`（${item.unit}）`:''}`).join('、') }}</p></div></article>
    <div v-if="expansion.duplicates?.length" class="excluded"><strong>重复匹配已去重（保留不同分组 / 不同位置）</strong><p v-for="row in expansion.duplicates" :key="`${row.pointId}-${row.groupId}-${row.objectId}`">{{ row.pointName }} / {{ row.groupName }} / {{ row.objectName }}：{{ row.paths.join(' ＋ ') }}，合并 {{ row.removedItems }} 项重复匹配。</p></div>
    <el-empty v-if="!expansion.points.length" description="尚无可执行检查内容" :image-size="60" />
    <div v-if="expansion.excluded.length" class="excluded"><strong>明确排除 / 待补充清单</strong><p v-for="(row,index) in expansion.excluded" :key="index">{{ row.reason }}</p></div>
  </div>
</template>
<style scoped>
.expansion-preview{font-size:14px;line-height:1.7}.counts{display:flex;flex-wrap:wrap;gap:20px;padding:14px;background:var(--ez-primary-bg);border-radius:8px;color:var(--ez-primary)}.counts strong{font-size:20px}.issues{background:var(--el-color-danger-light-9);color:var(--ez-danger);padding:14px;border-radius:8px;margin:14px 0}.issues ul{padding-left:20px}.point{border:1px solid var(--ez-border);border-radius:12px;padding:16px;margin:16px 0}.point h3{font-size:16px}.muted{color:var(--ez-text-secondary)}.object{border-top:1px solid var(--ez-border);margin-top:10px;padding-top:10px}.excluded{background:var(--ez-fill-light);padding:14px;border-radius:8px}.excluded p{margin-top:6px;color:var(--ez-text-secondary)}
</style>
