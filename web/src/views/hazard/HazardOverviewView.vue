<script setup>
import { ref, computed, shallowRef } from 'vue'
import HazardLedgerTab from './HazardLedgerTab.vue'
import HazardTypeTab from './HazardTypeTab.vue'
import HazardGradeTab from './HazardGradeTab.vue'
import { HAZARD_LIST, HAZARD_STATUS, TYPE_LIST, overdueList } from '../../data/hazard'

const activeTab = ref('ledger')
const tabs = shallowRef([
  { name: 'ledger', label: '隐患台账', comp: HazardLedgerTab },
  { name: 'type', label: '隐患类型库', comp: HazardTypeTab },
  { name: 'grade', label: '隐患分级标准', comp: HazardGradeTab }
])

const stats = computed(() => {
  const pending = HAZARD_LIST.filter((h) => h.status === '待受理').length
  const dispatching = HAZARD_LIST.filter((h) => h.status === '待派单').length
  const fixing = HAZARD_LIST.filter((h) => h.status === '整改中').length
  const accepting = HAZARD_LIST.filter((h) => h.status === '待验收').length
  const closed = HAZARD_LIST.filter((h) => h.status === '已关闭').length
  const overdue = overdueList().length
  const major = HAZARD_LIST.filter((h) => h.level === '重大' && h.status !== '已关闭').length
  return [
    { key: 'pending', label: '待受理', value: pending, tone: pending ? 'warning' : 'success' },
    { key: 'dispatch', label: '待派单', value: dispatching, tone: dispatching ? 'warning' : 'success' },
    { key: 'fixing', label: '整改中', value: fixing, tone: 'primary' },
    { key: 'accept', label: '待验收', value: accepting, tone: 'primary' },
    { key: 'overdue', label: '已逾期', value: overdue, tone: overdue ? 'danger' : 'success', hint: overdue ? '须优先催办' : '' },
    { key: 'major', label: '未闭环重大隐患', value: major, tone: major ? 'danger' : 'success' },
    { key: 'closed', label: '已关闭', value: closed, tone: 'success' },
    { key: 'type', label: '隐患类型', value: TYPE_LIST.length, tone: 'primary' }
  ]
})
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">隐患信息总览</h1>
        <p class="page-desc">
          隐患全生命周期台账：上报 → 受理 → 派单 → 整改 → 验收 → 关闭。整改期限按隐患等级自动计算（重大 1 天 / 较大 7 天 / 一般 15 天），逾期天数由系统实时算出。
        </p>
      </div>
    </div>

    <div class="stat-row">
      <div v-for="s in stats" :key="s.key" class="stat-card" :class="`tone-${s.tone}`">
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-value">{{ s.value }}</div>
        <div v-if="s.hint" class="stat-hint">{{ s.hint }}</div>
      </div>
    </div>

    <div class="tab-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane v-for="t in tabs" :key="t.name" :label="t.label" :name="t.name">
          <component :is="t.comp" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  position: fixed;
  top: var(--topbar-h);
  left: var(--sidebar-w);
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 18px 20px 20px;
  box-sizing: border-box;
  transition: left var(--transition);
}
.page-head { margin-bottom: 16px; }
.page-title {
  margin: 0 0 6px;
  font-size: var(--ez-font-size-title);
  font-weight: 600;
  color: var(--ez-text);
}
.page-desc {
  margin: 0;
  max-width: 900px;
  font-size: var(--ez-font-size-caption);
  color: var(--ez-text-secondary);
  line-height: 1.7;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.stat-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 12px 14px;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
}
.tone-primary::before { background: var(--ez-primary); }
.tone-success::before { background: var(--ez-success); }
.tone-warning::before { background: var(--ez-warning); }
.tone-danger::before { background: var(--ez-danger); }
.stat-label {
  font-size: 11px;
  color: var(--ez-text-secondary);
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--ez-text);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.stat-hint { margin-top: 3px; font-size: 10px; color: var(--ez-danger); }

.tab-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 8px 16px 16px;
}

@media (max-width: 1500px) {
  .stat-row { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
/* ===== 页面骨架：主卡片撑满可视区 ===== */
.page-head,
.stat-row {
  flex: none;
}
.tab-card {
  flex: 1 0 auto;
  min-height: 300px;
}
</style>
