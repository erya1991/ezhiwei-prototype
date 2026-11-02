<script setup>
import { computed } from 'vue'
import { jointStore as store } from '../../data/equipmentInspectionMock.js'
const props=defineProps({asset:{type:Object,required:true},compositionIds:{type:Array,required:true},systemMemberIds:{type:Array,required:true},facilityIds:{type:Array,required:true}})
const emit=defineEmits(['update:compositionIds','update:systemMemberIds','update:facilityIds'])
const candidates=computed(()=>store.state.assets.filter(row=>row.id!==props.asset.id && row.projectId===props.asset.projectId))
const descendants=computed(()=>new Set(store.assetMembers(props.asset.id,'parentId',true).map(row=>row.id)))
const parentOptions=computed(()=>candidates.value.filter(row=>row.type==='组合设备' && !descendants.value.has(row.id)))
const systems=computed(()=>{const descendants=new Set(store.assetMembers(props.asset.id,'systemId',true).map(row=>row.id));return candidates.value.filter(row=>row.type==='专业系统' && !descendants.has(row.id))})
const compositionOptions=computed(()=>candidates.value.filter(row=>row.type!=='专业系统' || props.compositionIds.includes(row.id)))
const systemOptions=computed(()=>candidates.value.filter(row=>row.type!=='专业系统' || props.systemMemberIds.includes(row.id)))
const selectedMembers=computed(()=>(props.asset.type==='组合设备'?props.compositionIds:props.systemMemberIds).map(id=>store.object(id)).filter(Boolean))
const moveWarnings=computed(()=>selectedMembers.value.filter(row=>{const field=props.asset.type==='组合设备'?'parentId':'systemId';return row[field] && row[field]!==props.asset.id}).map(row=>{const field=props.asset.type==='组合设备'?'parentId':'systemId';return `${row.name}当前归属${store.object(row[field])?.name || row[field]}；保存后调整到当前${props.asset.type==='组合设备'?'组合':'系统'}，不新建设备。`}))
const coverage=computed(()=>[...new Set([props.asset.spaceId,...selectedMembers.value.map(row=>row.spaceId)].filter(Boolean))])
const label=row=>`${row.code} · ${row.name}`
</script>
<template>
  <section class="relations-editor">
    <p class="notice">组成、专业系统、空间位置是三个独立维度。下方只引用已建档对象的稳定ID，不复制设备或共用设施；普通独立设备可不设置父设备。</p>
    <div class="relation-grid">
      <section v-if="asset.type!=='专业系统' || asset.parentId" class="relation-block">
        <h3>组成关系 · 父设备（可选）</h3><p class="hint">属于哪一套组合设备；成员仍保留自己的编号、型号和位置。</p>
        <el-form label-position="top"><el-form-item label="上级组合（可选）"><el-select v-model="asset.parentId" clearable filterable placeholder="独立设备可留空"><el-option v-for="row in parentOptions" :key="row.id" :value="row.id" :label="label(row)" /></el-select></el-form-item></el-form>
      </section>
      <section v-if="asset.type!=='专业系统' || asset.systemId" class="relation-block">
        <h3>专业系统关系（可选）</h3><p class="hint">引用实际专业系统；系统成员不等于父子设备。</p>
        <el-form label-position="top"><el-form-item :label="asset.type==='专业系统'?'所属上级系统（已有关系可维护）':'所属专业系统'"><el-select v-model="asset.systemId" clearable filterable placeholder="选择已建档的实际系统"><el-option v-for="row in systems" :key="row.id" :value="row.id" :label="label(row)" /></el-select></el-form-item></el-form>
      </section>
    </div>
    <section v-if="asset.type==='组合设备' || asset.type==='专业系统'" class="relation-block">
      <h3>{{ asset.type==='组合设备'?'组成关系 · 子设备':'专业系统 · 系统成员' }}</h3>
      <p class="hint">{{ asset.type==='组合设备'?'从既有台账选择多个子设备，可跨空间；不会创建重复设备。':'从既有台账选择设备、组合或共用设施。选择同一专业系统，不会自动设置父设备。' }}</p>
      <el-form label-position="top"><el-form-item :label="asset.type==='组合设备'?'选择已建档子设备':'选择已建档系统成员'">
        <el-select v-if="asset.type==='组合设备'" :model-value="compositionIds" multiple filterable collapse-tags collapse-tags-tooltip @update:model-value="emit('update:compositionIds',$event)"><el-option v-for="row in compositionOptions" :key="row.id" :value="row.id" :label="label(row)" /></el-select>
        <el-select v-else :model-value="systemMemberIds" multiple filterable collapse-tags collapse-tags-tooltip @update:model-value="emit('update:systemMemberIds',$event)"><el-option v-for="row in systemOptions" :key="row.id" :value="row.id" :label="label(row)" /></el-select>
      </el-form-item></el-form>
      <el-alert v-for="warning in moveWarnings" :key="warning" :title="warning" type="warning" :closable="false" class="move-warning" />
      <div v-for="row in selectedMembers" :key="row.id" class="member"><strong>{{ row.name }}</strong><span>{{ row.code }} · {{ row.id }} · {{ store.spacePath(row.spaceId) }} · {{ row.status }}</span></div>
      <p v-if="!selectedMembers.length" class="hint">尚未选择成员；保存空列表会解除原有成员归属，设备档案和历史巡检结果保留。</p>
    </section>
    <section class="relation-block">
      <h3>明确关联的共用设施（可选）</h3><p class="hint">例如一段共用蒸汽管路可供多处引用，但实际档案只保留一份。关联不会把设施变成当前对象的子设备。</p>
      <el-form label-position="top"><el-form-item label="明确关联设施"><el-select :model-value="facilityIds" multiple filterable placeholder="选择既有设施档案" @update:model-value="emit('update:facilityIds',$event)"><el-option v-for="row in candidates.filter(row=>row.type==='设施')" :key="row.id" :value="row.id" :label="label(row)" /></el-select></el-form-item></el-form>
    </section>
    <section class="relation-block">
      <h3>空间位置 · 独立维护</h3><p>当前安装 / 管理空间：{{ store.spacePath(asset.spaceId) || '请在基本信息选择安装空间' }}</p>
      <p v-if="asset.type==='组合设备' || asset.type==='专业系统'" class="hint">当前对象与所选成员涉及：{{ coverage.map(id=>store.spacePath(id)).join('；') || '尚未配置' }}。成员按自己的安装空间巡检，不自动继承父设备或系统的位置。</p>
    </section>
  </section>
</template>
<style scoped>
.relations-editor{font-size:14px;line-height:1.7}.notice{padding:12px 14px;background:var(--ez-primary-bg);color:var(--ez-primary);border-radius:8px;margin-bottom:16px;font-size:12px}.relation-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.relation-block{padding:16px;border:1px solid var(--ez-border);border-radius:12px;margin-bottom:16px;min-width:0}.relation-block :deep(.el-select){width:100%}.relation-block :deep(.el-form){margin-top:12px}h3{font-size:15px;font-weight:600}.hint{font-size:12px;color:var(--ez-text-secondary);margin:6px 0;overflow-wrap:anywhere}.member{padding:8px 0;border-top:1px solid var(--ez-border);display:flex;gap:8px;flex-direction:column}.member span{font-size:12px;color:var(--ez-text-secondary);overflow-wrap:anywhere}.move-warning{margin:10px 0}@media(max-width:700px){.relation-grid{grid-template-columns:1fr}}
</style>
