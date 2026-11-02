<script setup>
import { computed, ref } from 'vue'
import { jointStore as store, displayTime } from '../../data/equipmentInspectionMock.js'
import TaskResults from '../inspection/TaskResults.vue'
const props=defineProps({asset:{type:Object,required:true}})
const dateRange=ref([]),decision=ref(''),includeChildren=ref(false),applied=ref({from:'',to:'',decision:''}),error=ref(''),page=ref(1),sourceId=ref('')
const records=computed(()=>store.assetRecords(props.asset.id,{...applied.value,includeChildren:includeChildren.value}))
const visits=computed(()=>{
  const grouped=new Map()
  for(const row of records.value){if(!grouped.has(row.taskId))grouped.set(row.taskId,{taskId:row.taskId,taskCode:row.taskCode,ruleName:row.ruleName,ruleVersion:row.ruleVersion,checkedAt:row.checkedAt,rows:[]});grouped.get(row.taskId).rows.push(row)}
  return [...grouped.values()]
})
const source=computed(()=>store.state.tasks.find(task=>task.id===sourceId.value && task.status==='已完成'))
const tone=value=>value==='异常'?'danger':value==='正常'?'success':'info'
const summary=rows=>rows.some(row=>row.decision==='异常')?'存在异常':rows.some(row=>row.decision==='未自动判定')?'未自动判定':'未见异常'
function query(){
  const range=dateRange.value || []
  if(range.length && (range.length!==2 || range[1]<range[0])){error.value='请选择完整、有效的日期范围，结束日期不能早于开始日期';return}
  error.value='';applied.value={from:range[0] || '',to:range[1] || '',decision:decision.value};page.value=1
}
function reset(){dateRange.value=[];decision.value='';includeChildren.value=false;query()}
</script>
<template>
  <section class="equipment-history">
    <p class="notice">历史只读，直接查询已提交任务的同一份原始结果；数值、单位、说明、照片和规则均保留当次快照。</p>
    <div class="history-filters">
      <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" aria-label="设备巡检日期范围" unlink-panels />
      <el-select v-model="decision" aria-label="设备巡检结果筛选" clearable placeholder="全部检查结论"><el-option v-for="value in ['正常','异常','未自动判定']" :key="value" :value="value" /></el-select>
      <el-button type="primary" @click="query">查询巡检记录</el-button><el-button @click="reset">重置记录筛选</el-button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="asset.type==='组合设备'" class="children-option"><el-checkbox v-model="includeChildren" @change="page=1">包含子设备记录</el-checkbox><p class="muted">按当次任务快照中的组成关系查询，当前关系调整不回写历史；子设备编号、读数及检查位置仍独立展示。早期任务仅展示快照中可追溯的组成关系，不推测未保存的多级祖先。</p></div>
    <p class="muted">{{ visits.length }} 次巡检任务 / {{ records.length }} 项原始结果 · 按实际检查日期筛选，内置历史样例为2026-10-28。</p>
    <article v-for="visit in visits.slice((page-1)*5,page*5)" :key="visit.taskId" class="visit">
      <header class="between"><h3>{{ visit.taskCode }}</h3><el-button link type="primary" :aria-label="`查看${visit.taskCode}原始任务与完整结果`" @click="sourceId=visit.taskId">查看原始任务与完整结果</el-button></header>
      <p class="muted">{{ visit.ruleName }} V{{ visit.ruleVersion }} · 最近填写 {{ displayTime(visit.checkedAt) }}</p>
      <p class="muted">当前筛选明细：<el-tag :type="summary(visit.rows)==='存在异常'?'danger':'info'" size="small">{{ summary(visit.rows) }}</el-tag> · {{ visit.rows.some(row=>row.decision==='异常')?'有异常记录':'未发现异常记录（以每项结论为准）' }}</p>
      <el-table :data="visit.rows" stripe size="small" row-key="id">
        <el-table-column label="实际对象 / 检查位置" min-width="180"><template #default="{row}"><strong>{{ row.object.name }}</strong><p class="muted">{{ row.object.code }} · {{ row.object.id }}</p><p class="muted">{{ row.point.name }}</p></template></el-table-column>
        <el-table-column label="检查项 / 分组" min-width="145"><template #default="{row}">{{ row.item.name }}<p class="muted">{{ row.groupName }}</p></template></el-table-column>
        <el-table-column label="实际读数 / 结果" min-width="125"><template #default="{row}"><strong>{{ row.item.type==='照片'?`${row.photos?.length || 0}张本地照片`:row.value }}</strong> {{ row.unit }}<p><el-tag size="small" :type="tone(row.decision)">{{ row.decision }}</el-tag></p></template></el-table-column>
        <el-table-column label="异常说明 / 现场照片" min-width="210"><template #default="{row}"><p>{{ row.note || '未提供说明' }}</p><div v-if="row.photos?.length" class="photos"><el-image v-for="(photo,index) in row.photos" :key="index" :src="photo.dataUrl" :alt="photo.name" :preview-src-list="row.photos.map(file=>file.dataUrl)" preview-teleported fit="cover" /></div><small v-if="row.photos?.length" class="muted">本地演示附件，未上传服务端</small></template></el-table-column>
        <el-table-column label="检查人 / 实际时间" min-width="175"><template #default="{row}">{{ row.checkedByName }}<p class="muted">{{ displayTime(row.checkedAt) }}</p></template></el-table-column>
      </el-table>
    </article>
    <el-empty v-if="!visits.length" description="当前对象没有符合筛选条件的已提交巡检记录" :image-size="65" />
    <el-pagination v-if="visits.length" v-model:current-page="page" :total="visits.length" :page-size="5" layout="total, prev, pager, next" class="pagination" />
    <router-link :to="{path:'/inspection/records',query:{object:asset.id}}"><el-button plain type="primary">在巡检记录模块查看本对象</el-button></router-link>
    <el-drawer :model-value="Boolean(source)" title="设备关联的原始巡检任务（只读）" size="min(980px,94vw)" append-to-body @close="sourceId=''">
      <template v-if="source"><h2>{{ source.code }} · {{ source.planName }}</h2><p class="muted">{{ source.rule.name }} V{{ source.rule.version }} · {{ source.personName }} · 实际提交 {{ displayTime(source.submittedAt) }}</p><p class="notice">{{ source.status }} / {{ store.taskSummary(source) }} / {{ store.timeStatus(source) }}。下方是整张原任务的全部对象和结果。</p><TaskResults :task="source" /><router-link :to="{path:'/inspection/tasks',query:{task:source.id}}"><el-button type="primary" plain>前往原始任务页面</el-button></router-link></template>
    </el-drawer>
  </section>
</template>
<style scoped>
.equipment-history{font-size:14px;line-height:1.7;min-width:0}.notice{padding:12px 14px;background:var(--ez-primary-bg);color:var(--ez-primary);border-radius:8px;font-size:12px;margin-bottom:16px}.muted{font-size:12px;color:var(--ez-text-secondary);overflow-wrap:anywhere}.history-filters{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px}.history-filters :deep(.el-date-editor){width:330px;flex-grow:0;max-width:100%}.history-filters :deep(.el-select){width:160px}.history-filters :deep(.el-button + .el-button){margin-left:0}.children-option{padding:10px 14px;background:var(--ez-fill-light);border-radius:8px;margin:12px 0}.visit{padding:16px;border:1px solid var(--ez-border);border-radius:12px;margin:16px 0}.visit :deep(.el-table){margin-top:12px}.visit :deep(.cell){overflow-wrap:anywhere}.between{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}h3{font-size:16px}h2{font-size:18px}.photos{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.photos :deep(.el-image){width:76px;height:58px;border-radius:6px}.pagination{justify-content:flex-end;margin:16px 0;overflow:auto}.error{padding:10px;color:var(--ez-danger);background:var(--el-color-danger-light-9);border-radius:6px}
</style>
