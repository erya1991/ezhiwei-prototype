<script setup>
import { GROUP_ROLES } from '../../data/equipmentInspectionSeed.js'
import { jointStore as store, referenceText } from '../../data/equipmentInspectionMock.js'
defineProps({ rule: { type:Object, required:true } })
</script>
<template>
  <section class="rule-preview">
    <h2>{{ rule.name }} · V{{ rule.version || 1 }}</h2><p class="muted">{{ rule.code }} · {{ rule.scene }} · {{ rule.status }}</p>
    <dl class="meta"><dt>适用对象</dt><dd>{{ rule.rootType }} / {{ rule.roomUsage || store.byId(store.state.categories,rule.categoryId)?.name || '按分组条件' }}</dd><dt>型号 / 工况</dt><dd>{{ rule.models?.join('、') || '未限定型号' }} / {{ rule.states?.join('、') || '未限定工况' }}</dd><dt>依据来源</dt><dd>{{ rule.basis || '未登记；无有效条件不判定正常' }}</dd><dt>使用说明</dt><dd>{{ rule.notes || '—' }}</dd></dl>
    <p class="notice">规则只定义适用类型与检查要求，不绑定真实锅炉或机房。所有示例参考值均为模拟演示值，不得作为真实安全标准。</p>
    <article v-for="(group,index) in rule.groups" :key="group.id || index" class="group">
      <h3>{{ index+1 }}. {{ group.name }} <el-tag size="small" :type="group.required?'primary':'info'">{{ group.required?'必需组':'可选组' }}</el-tag></h3><p class="muted">作用对象：{{ group.targetType || '继承根对象类型' }} · {{ store.byId(store.state.categories,group.categoryId)?.name || '不限分类' }}</p><p class="muted">匹配方式：{{ [group.role,...(group.extraRoles || [])].map(value=>GROUP_ROLES.find(role=>role.value===store.normalizedRole(value,rule.rootType))?.label || value).join(' ＋ ') }}{{ group.includeSystemFacilities?'（含关联专业系统设施）':'' }}</p><p v-if="group.models?.length || group.states?.length" class="muted">本组适用条件：{{ group.models?.join(' / ') || '不限型号' }} · {{ group.states?.join(' / ') || '不限工况' }}；检查项继承本组条件。</p>
      <div v-for="(item,itemIndex) in group.items" :key="item.id || itemIndex" class="item"><div class="between"><strong>{{ item.name }}</strong><el-tag size="small" type="info">{{ item.type }} · {{ item.required?'必检':'选填' }}</el-tag></div><p>{{ item.method || '按现场实际情况填写' }}</p><p class="reference">{{ referenceText(item) }}</p><p v-if="item.type==='状态'" class="muted">选项：{{ item.options.join(' / ') }}（执行时不预选）</p><p v-if="item.models?.length || item.states?.length" class="muted">项目适用：{{ item.models.join(' / ') || '不限型号' }} · {{ item.states.join(' / ') || '不限工况' }}</p><p v-if="item.exceptionNote || item.exceptionPhoto" class="muted">异常时必须补充{{ item.exceptionNote?'说明':'' }}{{ item.exceptionPhoto?'及照片':'' }}；真实异常读数允许保存。</p><p class="muted">{{ item.guidance }}</p></div>
      <el-empty v-if="!group.items.length" description="尚无检查项，必需组不能启用" :image-size="50" />
    </article>
  </section>
</template>
<style scoped>
.rule-preview{font-size:14px;line-height:1.7;color:var(--ez-text)}h2{font-size:18px}h3{font-size:15px}.muted{color:var(--ez-text-secondary)}.meta{display:grid;grid-template-columns:100px 1fr;gap:10px;margin:20px 0}.meta dt{color:var(--ez-text-secondary)}.notice{padding:12px;background:var(--ez-primary-bg);color:var(--ez-primary);border-radius:8px;font-size:12px}.group{padding:16px;border:1px solid var(--ez-border);border-radius:12px;margin:16px 0}.item{border-top:1px solid var(--ez-border);padding-top:12px;margin-top:12px}.between{display:flex;justify-content:space-between;gap:12px}.reference{color:var(--ez-warning-text);font-size:12px;margin:8px 0}
</style>
