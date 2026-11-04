<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { workOrderStore as store, clone, STATUSES, PRIORITIES, displayTime, statusTone, timeFacts } from '../../data/workOrder.js'
import DemoContext from './DemoContext.vue'
import WorkOrderForm from './WorkOrderForm.vue'
import WorkOrderDetail from './WorkOrderDetail.vue'
const props = defineProps({ mine: Boolean, mobile: Boolean })
const route = useRoute(), router = useRouter(), tab = ref('todo'), page = ref(1), advanced = ref(false), filterError = ref('')
const emptyFilters = () => ({ text: '', categoryId: '', source: '', status: '', priority: '', handlerId: '', handlerOrganizationId: '', spaceId: '', createdRange: [], time: '' })
const filters = ref(emptyFilters()), applied = ref(emptyFilters()), formOpen = ref(false), editing = ref(null), detailId = ref(String(route.query.id || ''))
const catalog = computed(() => store.currentCatalog()), rows = computed(() => store.listOrders({ tab: props.mine ? tab.value : 'ledger', filters: applied.value }))
const visibleRows = computed(() => rows.value.slice((page.value - 1) * 10, page.value * 10))
const title = computed(() => props.mine ? '我的工单' : '工单台账')
watch(() => store.state.actorId, () => { page.value = 1 })
watch(() => route.query.id, id => { detailId.value = String(id || '') })
watch(() => rows.value.length, length => { if ((page.value - 1) * 10 >= length) page.value = 1 })
function query() {
  if (filters.value.createdRange?.length && Date.parse(filters.value.createdRange[1]) < Date.parse(filters.value.createdRange[0])) { filterError.value = '结束时间不得早于开始时间'; return }
  filterError.value = ''; applied.value = clone(filters.value); page.value = 1
}
function reset() { filters.value = emptyFilters(); query() }
function open(id) { detailId.value = id; router.replace({ query: { ...route.query, id } }) }
function close() { detailId.value = ''; const query = { ...route.query }; delete query.id; router.replace({ query }) }
function create() { editing.value = null; formOpen.value = true }
function edit(order) { editing.value = clone(order); formOpen.value = true }
function saved(id) { formOpen.value = false; open(id) }
const times = row => timeFacts(row, store.now())
</script>
<template>
  <main class="work-order-page" :class="{ mobile }">
    <header class="page-header"><div><p class="eyebrow">工单处理</p><h1>{{ title }}</h1><p class="subtitle">{{ mine ? '按当前账号归集责任与参与记录' : '统一查询、人工填报与完整历史追溯' }}</p></div><div class="header-actions"><template v-if="mobile"><router-link to="/work-order/mobile/ledger"><el-button :type="!mine ? 'primary' : 'default'">台账</el-button></router-link><router-link to="/work-order/mobile/mine"><el-button :type="mine ? 'primary' : 'default'">我的工单</el-button></router-link><router-link :to="mine ? '/work-order/mine' : '/work-order/ledger'"><el-button text>PC</el-button></router-link></template><router-link v-else :to="mine ? '/work-order/mobile/mine' : '/work-order/mobile/ledger'"><el-button>移动端演示</el-button></router-link><el-button v-if="store.canCreate()" type="primary" @click="create">人工报修</el-button></div></header>
    <DemoContext :mobile="mobile" />
    <section class="panel">
      <el-tabs v-if="mine" v-model="tab" @tab-change="page = 1"><el-tab-pane label="我的待办" name="todo" /><el-tab-pane label="我发起的" name="created" /><el-tab-pane label="我参与的" name="participated" /></el-tabs>
      <el-form :model="filters" class="filters" label-position="top" @submit.prevent="query">
        <el-form-item label="关键词"><el-input v-model="filters.text" clearable placeholder="编号、标题、问题" @keyup.enter="query" /></el-form-item>
        <el-form-item label="类别"><el-select v-model="filters.categoryId" clearable placeholder="全部类别"><el-option v-for="row in store.state.categories" :key="row.id" :value="row.id" :label="row.name" /></el-select></el-form-item>
        <el-form-item label="状态"><el-select v-model="filters.status" clearable placeholder="全部状态"><el-option v-for="status in STATUSES" :key="status" :value="status" :label="status" /></el-select></el-form-item>
        <el-form-item v-if="!mobile" label="优先级"><el-select v-model="filters.priority" clearable placeholder="全部优先级"><el-option v-for="p in PRIORITIES" :key="p" :value="p" :label="p" /></el-select></el-form-item>
        <template v-if="advanced"><el-form-item label="来源"><el-select v-model="filters.source" clearable placeholder="全部来源"><el-option v-for="source in ['人工填报','隐患转入（占位）']" :key="source" :value="source" :label="source" /></el-select></el-form-item><el-form-item label="所在空间"><el-select v-model="filters.spaceId" clearable filterable placeholder="按位置查询"><el-option v-for="row in catalog.spaces" :key="row.id" :value="row.id" :label="row.label" /></el-select></el-form-item><el-form-item label="处理组织"><el-select v-model="filters.handlerOrganizationId" clearable><el-option v-for="row in store.state.directory.organizations" :key="row.id" :value="row.id" :label="row.name" /></el-select></el-form-item><el-form-item label="处理人"><el-select v-model="filters.handlerId" clearable filterable><el-option v-for="row in store.state.directory.accounts.filter(row => !filters.handlerOrganizationId || row.organizationId === filters.handlerOrganizationId)" :key="row.id" :value="row.id" :label="row.name" /></el-select></el-form-item><el-form-item label="时间表现"><el-select v-model="filters.time" clearable><el-option label="接单超时" value="receivingLate" /><el-option label="处理超时" value="processingLate" /><el-option label="验收超时" value="acceptanceLate" /></el-select></el-form-item><el-form-item label="创建时间范围" class="range"><el-date-picker v-model="filters.createdRange" type="datetimerange" value-format="YYYY-MM-DDTHH:mm:ssZ" start-placeholder="开始" end-placeholder="结束" format="MM-DD HH:mm" /></el-form-item></template>
        <div class="filter-actions"><el-button type="primary" native-type="submit">查询</el-button><el-button @click="reset">重置</el-button><el-button text @click="advanced = !advanced">{{ advanced ? '收起筛选' : '更多筛选' }}</el-button></div>
      </el-form>
      <p v-if="filterError" role="alert" class="error">{{ filterError }}</p>
      <p class="result-note">当前账号可访问 {{ rows.length }} 张{{ mine && tab === 'todo' ? '待办' : '' }}工单 · 待派发异常不会从管理视图隐藏</p>
      <div v-if="mobile" class="cards"><article v-for="row in visibleRows" :key="row.id" class="order-card" @click="open(row.id)"><div class="between"><span class="code">{{ row.code }}</span><el-tag :type="statusTone(row.status)" size="small">{{ row.status }}</el-tag></div><h2><el-button link type="primary" @click.stop="open(row.id)">{{ row.title }}</el-button></h2><p>{{ row.spaceLabel }} · {{ row.location }}</p><div class="between"><el-tag size="small" effect="plain">{{ row.priority }}</el-tag><span>{{ store.getName(row.handlerId) }}</span></div><p>处理截止：{{ displayTime(row.processingDeadline) }}</p><p v-if="row.status === '待验收'">提交{{ times(row).submissionLate ? '逾期' : '按时' }} · 验收{{ times(row).acceptanceLate ? '已超时' : '计时中' }}</p><p v-if="row.status === '待派发'" class="warning">{{ row.dispatchError }}</p><el-button link type="primary" @click.stop="open(row.id)">查看详情与可操作事项</el-button></article><el-empty v-if="!rows.length" description="当前账号或筛选条件下没有工单" /></div>
      <el-table v-else :data="visibleRows" stripe empty-text="当前账号或筛选条件下没有工单" class="orders-table"><el-table-column label="工单／来源" min-width="220"><template #default="{row}"><el-button link type="primary" class="title-button" @click="open(row.id)">{{ row.title }}</el-button><div class="code">{{ row.code }} · {{ row.source }}</div></template></el-table-column><el-table-column label="类别／位置" min-width="170"><template #default="{row}">{{ row.categoryName }}<div class="muted">{{ row.spaceLabel }}</div></template></el-table-column><el-table-column label="状态／优先级" min-width="140"><template #default="{row}"><el-tag :type="statusTone(row.status)">{{ row.status }}</el-tag><div>{{ row.priority }}</div><div v-if="times(row).receivingLate || times(row).processingLate || times(row).acceptanceLate" class="warning">{{ times(row).acceptanceLate ? '验收超时' : times(row).receivingLate ? '接单超时' : '处理超时' }}</div></template></el-table-column><el-table-column label="处理责任" min-width="155"><template #default="{row}">{{ store.getName(row.handlerId) }}<div class="muted">{{ row.handlerOrganizationId ? store.orgName(row.handlerOrganizationId) : '待明确派发' }}</div></template></el-table-column><el-table-column label="验收对象" min-width="155"><template #default="{row}">{{ store.acceptanceLabel(row.acceptance) }}<div v-if="!store.acceptanceMembers(row, row.status === '待验收' ? times(row).submission?.actor.id : row.handlerId).length" class="warning">需调整对象</div></template></el-table-column><el-table-column label="处理截止／发起时间" min-width="180"><template #default="{row}">{{ displayTime(row.processingDeadline) }}<div v-if="row.status === '待验收'" class="muted">处理提交{{ times(row).submissionLate ? '逾期' : '按时' }}</div><div class="muted">{{ displayTime(row.createdAt) }}</div></template></el-table-column><el-table-column label="操作" width="80" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open(row.id)">详情</el-button></template></el-table-column></el-table>
      <el-pagination v-model:current-page="page" :page-size="10" :total="rows.length" :layout="mobile ? 'prev, pager, next' : 'total, prev, pager, next'" class="pagination" />
    </section>
    <el-drawer :model-value="Boolean(detailId)" :title="title + ' · 共用详情'" :size="mobile ? '100%' : 'min(960px,96vw)'" append-to-body destroy-on-close @close="close"><WorkOrderDetail v-if="detailId" :order-id="detailId" :mobile="mobile" @close="close" @edit="edit" /></el-drawer>
    <el-dialog v-model="formOpen" :title="editing ? '首次派发前编辑' : '人工报修'" :width="mobile ? '98vw' : 'min(760px,96vw)'" :fullscreen="mobile" class="ez-dialog" append-to-body destroy-on-close :close-on-click-modal="false"><WorkOrderForm v-if="formOpen" :order="editing" :mobile="mobile" @cancel="formOpen = false" @saved="saved" /></el-dialog>
  </main>
</template>
<style scoped src="./work-order.css"></style>
