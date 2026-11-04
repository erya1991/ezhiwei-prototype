<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { workOrderStore as store, initialStorageNotice } from '../../data/workOrder.js'
const props = defineProps({ mobile: Boolean })
const dev = import.meta.env.DEV, expanded = ref(false), selectedAccount = ref('wo-accept-1')
const admin = computed(() => store.currentActor()?.permissions.some(value => ['manage', 'rules'].includes(value)))
function switchActor(id) { const result = store.switchActor(id); if (!result.ok) ElMessage.error(result.error) }
function directory(input) { const result = store.execute('demoDirectory', input, store.context()); result.ok ? ElMessage.success('演示资料已变化，后续动作按最新身份校验') : ElMessage.error(result.error) }
async function reset() {
  try {
    await ElMessageBox.confirm('仅恢复工单模块初始样例；工单演示操作将被替换。设备巡检及其他模块数据保留。', '恢复工单演示数据', { customClass: 'ez-message-box', confirmButtonText: '恢复工单样例', cancelButtonText: '取消', type: 'warning' })
    const result = store.reset(); result.ok ? ElMessage.success('已恢复工单样例') : ElMessage.error(result.error)
  } catch { /* User kept current demo data. */ }
}
</script>
<template>
  <section class="context">
    <div class="context-row"><div><el-tag size="small" effect="plain">Mock 演示</el-tag><span class="note">同一浏览器内共享工单；身份切换模拟具体账号权限。</span></div><el-select :model-value="store.state.actorId" aria-label="工单演示账号" filterable @change="switchActor"><el-option v-for="row in store.state.directory.accounts" :key="row.id" :disabled="!row.active" :label="row.name + ' · ' + store.orgName(row.organizationId)" :value="row.id" /></el-select><el-button v-if="dev && admin" text @click="expanded = !expanded">{{ expanded ? '收起演示工具' : '演示工具' }}</el-button></div>
    <el-alert v-if="initialStorageNotice" :title="initialStorageNotice" type="warning" :closable="false" />
    <div v-if="dev && admin && expanded" class="tools"><p class="note">仅改变本模块演示资料，不代表组织人员管理已联通。</p><el-button @click="store.simulateFailure(); ElMessage.info('下一次工单保存将模拟失败')">下次保存模拟失败</el-button><el-button v-if="store.currentActor()?.permissions.includes('manage')" @click="reset">恢复工单样例</el-button><el-select v-model="selectedAccount" aria-label="演示资料目标账号"><el-option v-for="row in store.state.directory.accounts.filter(row => row.id !== store.state.actorId)" :key="row.id" :value="row.id" :label="row.name + (row.active ? '（有效）' : '（停用）')" /></el-select><el-button @click="directory({ accountId: selectedAccount })">切换账号有效状态</el-button><el-button @click="directory({ accountId: selectedAccount, roleId: 'wo-accept-role' })">加入／退出工程验收组</el-button><el-button @click="directory({ roleStatus: 'wo-accept-role' })">启停工程验收角色</el-button></div>
  </section>
</template>
<style scoped>
.context{border:1px solid var(--ez-border);background:var(--ez-card-bg);padding:12px 16px;border-radius:12px}.context-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.context-row>div:first-child{flex:1;min-width:200px}.context-row>.el-select{width:350px;max-width:100%}.note{font-size:12px;color:var(--ez-text-secondary);line-height:1.8;margin-left:8px}.tools{display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid var(--ez-border);padding-top:12px;margin-top:12px}.tools>.note{width:100%;margin:0}.tools .el-select{width:240px}.tools .el-button{margin:0}@media(max-width:600px){.context{padding:12px}.context-row>.el-select{width:100%}.context-row>div:first-child{min-width:0}.note{display:block;margin-left:0}.tools .el-select{width:100%}}
</style>
