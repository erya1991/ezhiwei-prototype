<script setup>
import { ref, computed, shallowRef } from 'vue'
import MeasureListTab from './MeasureListTab.vue'
import MeasureLinkTab from './MeasureLinkTab.vue'
import { MEASURE_LIST, MEASURE_LINKS } from '../../data/risk'

const activeTab = ref('measure')
const tabs = shallowRef([
  { name: 'measure', label: '管控措施清单', comp: MeasureListTab },
  { name: 'link', label: '措施与危险源关联', comp: MeasureLinkTab }
])

const stats = computed(() => {
  const done = MEASURE_LIST.filter((m) => m.status === '已完成').length
  const doing = MEASURE_LIST.filter((m) => m.status === '进行中').length
  // 与措施清单口径一致：未完成且已过计划完成时间即视为逾期
  const today = new Date()
  const ts = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const overdue = MEASURE_LIST.filter(
    (m) => m.status !== '已完成' && m.planDate && m.planDate < ts
  ).length
  const valid = MEASURE_LIST.filter((m) => m.validity === '有效').length
  return [
    { key: 'total', label: '措施总数', value: MEASURE_LIST.length, unit: '条', tone: 'primary' },
    { key: 'done', label: '已完成', value: done, unit: '条', tone: 'success' },
    { key: 'doing', label: '进行中', value: doing, unit: '条', tone: 'warning' },
    {
      key: 'overdue', label: '已逾期', value: overdue, unit: '条',
      tone: overdue > 0 ? 'danger' : 'success',
      hint: overdue > 0 ? '逾期措施须重新排期并追责' : ''
    },
    { key: 'valid', label: '有效性已验证', value: valid, unit: '条', tone: 'primary' }
  ]
})
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">风险管控措施制定</h1>
        <p class="page-desc">
          针对每个危险源制定工程技术、管理、培训教育、个体防护、应急处置五类措施，明确管控层级、责任人与验收标准。措施与危险源是多对多关联，一条措施可覆盖多个危险源。
        </p>
      </div>
    </div>

    <div class="stat-row">
      <div v-for="s in stats" :key="s.key" class="stat-card" :class="`tone-${s.tone}`">
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-value">{{ s.value }}<span class="stat-unit">{{ s.unit }}</span></div>
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
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 14px 16px;
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
  font-size: var(--ez-font-size-caption);
  color: var(--ez-text-secondary);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--ez-text);
  line-height: 1.1;
}
.stat-unit {
  font-size: 12px;
  font-weight: 400;
  color: var(--ez-text-muted);
  margin-left: 3px;
}
.stat-hint {
  margin-top: 4px;
  font-size: 11px;
  color: var(--ez-danger);
  line-height: 1.4;
}

.tab-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 8px 16px 16px;
}

@media (max-width: 1280px) {
  .stat-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
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
