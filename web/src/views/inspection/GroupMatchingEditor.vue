<script setup>
import { computed, ref, watch } from 'vue'
import { jointStore as store, ASSET_TYPES } from '../../data/equipmentInspectionMock.js'
import { GROUP_ROLES } from '../../data/equipmentInspectionSeed.js'
const props=defineProps({group:{type:Object,required:true},rootType:{type:String,required:true}})
const roles=computed(()=>store.matchingRoles(props.rootType))
const advanced=ref(Boolean(props.group.models?.length || props.group.states?.length || props.group.extraRoles?.length))
const models=computed(()=>[...new Set(store.state.assets.map(row=>row.model).filter(Boolean))])
const targetTypes=['空间',...ASSET_TYPES]
const compatible=computed(()=>roles.value.some(role=>role.value===props.group.role))
const categories=computed(()=>store.state.categories.filter(row=>row.enabled))
const facilityMode=computed(()=>[props.group.role,...(props.group.extraRoles || [])].includes('linkedFacility'))
watch(()=>props.rootType,(value,oldValue)=>{
  props.group.role=store.normalizedRole(props.group.role,props.rootType)
  const defaults={设备:'单台设备',空间:'空间',组合:'组合设备',系统:'专业系统',设施:'设施'}
  if (props.group.role==='self' && (!props.group.targetType || props.group.targetType===defaults[oldValue])) {
    props.group.targetType=defaults[value]
    if(oldValue && value!==oldValue){if(value==='空间')props.group.categoryId='';props.group.models=[];props.group.states=[]}
  }
},{immediate:true})
function changeRole(){
  const group=props.group
  group.models=[];group.states=[]
  group.targetType=group.role==='self'?({设备:'单台设备',空间:'空间',组合:'组合设备',系统:'专业系统',设施:'设施'})[props.rootType]:group.role==='linkedFacility'?'设施':'单台设备'
  if(group.targetType==='空间')group.categoryId=''
  group.extraRoles=(group.extraRoles || []).filter(role=>role!==group.role)
  if(group.role==='linkedFacility' && group.includeSystemFacilities===undefined)group.includeSystemFacilities=true
}
</script>
<template>
  <section class="matching-editor">
    <h3>本组检查对象自动匹配</h3>
    <p class="hint">只定义类型、分类与结构化关系，不选择具体设备。分类独立匹配其下属类别，作用对象类型按实际台账类型精确匹配；下面的检查项继承本组条件。</p>
    <p v-if="rootType==='设施' || group.targetType==='建筑构件'" class="hint">“设施”范围可选择设施或建筑构件；本组选择“设施”时只检查一般设施，选择“建筑构件”时只检查符合分类条件的建筑构件。</p>
    <el-form label-position="top" class="matching-grid">
      <el-form-item label="分组名称" required><el-input v-model="group.name" maxlength="80" /></el-form-item>
      <el-form-item label="作用对象类型" required><el-select v-model="group.targetType" :aria-label="`${group.name || '未命名分组'}作用对象类型`" @change="value=>{if(value==='空间')group.categoryId='';group.models=[];group.states=[]}"><el-option v-for="type in targetTypes" :key="type" :value="type" /></el-select></el-form-item>
      <el-form-item label="对象匹配方式" required><el-select v-model="group.role" :aria-label="`${group.name || '未命名分组'}对象匹配方式`" @change="changeRole"><el-option v-if="!compatible" :value="group.role" :label="`${GROUP_ROLES.find(row=>row.value===group.role)?.label || group.role}（请调整）`" disabled /><el-option v-for="role in roles" :key="role.value" :value="role.value" :label="role.label" /></el-select></el-form-item>
      <el-form-item v-if="group.targetType!=='空间'" label="适用分类（可选）"><el-select v-model="group.categoryId" :aria-label="`${group.name || '未命名分组'}适用分类`" filterable clearable placeholder="包含所选分类及其全部下属类别"><el-option v-for="row in categories" :key="row.id" :value="row.id" :label="store.categoryPath(row.id)" /></el-select></el-form-item>
      <el-form-item label="没有匹配对象时" class="wide"><el-switch v-model="group.required" active-text="必需组，阻止启用计划" inactive-text="可选组，明确排除" /></el-form-item>
      <div v-if="facilityMode" class="wide facility-help"><el-checkbox v-model="group.includeSystemFacilities">同时匹配关联专业系统的设施</el-checkbox><p class="hint">使用空间/对象的明确设施关联，以及已登记专业系统的设施关系或成员关系；不按名称推断。明确关联到空间的设施按该检查空间保存；仅通过系统找到的设施仍按自身安装空间分点。</p></div>
    </el-form>
    <el-alert v-if="!compatible" title="当前匹配方式与新选择的范围类型不兼容，请调整后保存。" type="warning" :closable="false" />
    <el-button link type="primary" :aria-expanded="advanced" @click="advanced=!advanced">{{ advanced?'收起':'展开' }}必要适用条件 / 补充匹配路径</el-button>
    <div v-if="advanced" class="optional">
      <el-form label-position="top" class="matching-grid">
        <el-form-item v-if="group.targetType!=='空间'" label="本组适用型号（可选）"><el-select v-model="group.models" multiple filterable allow-create default-first-option placeholder="不填表示不限型号"><el-option v-for="model in models" :key="model" :value="model" /></el-select></el-form-item>
        <el-form-item label="本组适用工况（可选）"><el-select v-model="group.states" multiple clearable placeholder="不填表示不限工况"><el-option v-for="status in group.targetType==='空间'?['使用中','暂不使用']:['运行','备用','停用']" :key="status" :value="status" /></el-select></el-form-item>
        <el-form-item label="补充匹配路径（可选）" class="wide"><el-checkbox-group v-model="group.extraRoles"><el-checkbox v-for="role in roles.filter(row=>row.value!=='self' && row.value!==group.role)" :key="role.value" :value="role.value">{{ role.label }}</el-checkbox></el-checkbox-group></el-form-item>
      </el-form>
      <p class="hint">多条路径在同组、同实际对象、同检查位置按检查项身份去重。不同分组或不同检查位置分别保留；空间中的系统/组合按已建关系查找，成员按自身安装位置分点。</p>
    </div>
  </section>
</template>
<style scoped>
.matching-editor{margin:16px 0;line-height:1.7}.matching-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;margin-top:12px}.wide{grid-column:1/-1}.matching-grid :deep(.el-select){width:100%}.hint{font-size:12px;color:var(--ez-text-secondary);margin:6px 0;overflow-wrap:anywhere}.optional,.facility-help{padding:12px;border-radius:8px;background:var(--ez-primary-bg)}.optional{margin-top:12px}.optional :deep(.el-checkbox-group){display:flex;flex-wrap:wrap;gap:8px 16px}.optional :deep(.el-checkbox){margin-right:0}@media(max-width:700px){.matching-grid{grid-template-columns:1fr}}
</style>
