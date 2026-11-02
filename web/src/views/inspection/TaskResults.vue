<script setup>
import { jointStore as store, evaluateItem, resultKey, referenceText, isResultFilled, displayTime, PEOPLE } from '../../data/equipmentInspectionMock.js'
defineProps({ task:{type:Object,required:true} })
const tone=decision=>decision==='异常'?'danger':decision==='正常'?'success':'info'
const actorName=id=>PEOPLE.find(person=>person.id===id)?.name || '未填写'
</script>
<template>
  <section class="task-results">
    <article v-for="(point,pi) in task.points" :key="point.id" class="point">
      <div class="between"><h3>{{ pi+1 }}. {{ point.space.name }}</h3><el-tag :type="store.progress(task,task.results,point.id).complete?'success':'info'">必检 {{ store.progress(task,task.results,point.id).requiredFilled }} / {{ store.progress(task,task.results,point.id).requiredTotal }}</el-tag></div><p class="muted">{{ point.space.spacePath }}</p>
      <div v-for="group in point.groups" :key="`${group.id}-${group.object.id}`" class="object"><strong>{{ group.object.name }} · {{ group.object.code }}</strong><p class="muted">{{ group.name }} · {{ group.object.type }}</p>
        <div v-for="item in group.items" :key="item.id" class="result"><div class="between"><span>{{ item.name }} <small>{{ item.required?'必检':'选填' }}</small></span><el-tag size="small" :type="tone(task.results[resultKey(group,item)]?.decision || evaluateItem(item,task.results[resultKey(group,item)]))">{{ task.results[resultKey(group,item)]?.decision || evaluateItem(item,task.results[resultKey(group,item)]) }}</el-tag></div>
          <p class="value">{{ isResultFilled(item,task.results[resultKey(group,item)])?(item.type==='照片'?`本地照片 ${task.results[resultKey(group,item)].photos.length} 张`:task.results[resultKey(group,item)].value):'未填写' }} <span v-if="isResultFilled(item,task.results[resultKey(group,item)])">{{ item.unit }}</span></p>
          <p class="reference">{{ referenceText(item) }}</p><p class="muted">检查方法：{{ item.method || '按实际情况填写' }}</p>
          <p v-if="task.results[resultKey(group,item)]?.note" class="note"><strong>异常 / 现场说明：</strong>{{ task.results[resultKey(group,item)].note }}</p>
          <div v-if="task.results[resultKey(group,item)]?.photos?.length" class="photos"><el-image v-for="(photo,index) in task.results[resultKey(group,item)].photos" :key="index" :src="photo.dataUrl" :preview-src-list="task.results[resultKey(group,item)].photos.map(file=>file.dataUrl)" preview-teleported fit="cover" :alt="photo.name" /><span class="muted">本地浏览器演示附件，未上传服务端</span></div>
          <p class="audit">{{ actorName(task.results[resultKey(group,item)]?.checkedBy) }} · {{ displayTime(task.results[resultKey(group,item)]?.checkedAt) }}</p>
        </div>
      </div>
    </article>
  </section>
</template>
<style scoped>
.task-results{font-size:14px;line-height:1.7;color:var(--ez-text)}.point{margin:20px 0;padding:16px;border:1px solid var(--ez-border);border-radius:12px}.between{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}h3{font-size:16px}.muted,.audit,small{color:var(--ez-text-secondary);font-size:12px}.object{margin-top:16px;padding-top:16px;border-top:1px solid var(--ez-border)}.result{padding:14px 0;border-bottom:1px solid var(--ez-border-light)}.result:last-child{border-bottom:0}.value{font-size:18px;font-weight:600;margin-top:6px;overflow-wrap:anywhere}.value span{font-size:13px;font-weight:400}.reference{color:var(--ez-warning-text);font-size:12px;margin:6px 0}.note{background:var(--el-color-warning-light-9);padding:10px;border-radius:6px;margin-top:8px;overflow-wrap:anywhere}.audit{margin-top:8px}.photos{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.photos :deep(.el-image){width:80px;height:60px;border-radius:6px}
</style>
