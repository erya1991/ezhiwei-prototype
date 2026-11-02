<script setup>
import { ref, computed, shallowRef } from 'vue'
import InspectCardTab from './InspectCardTab.vue'
import AcceptCardTab from './AcceptCardTab.vue'
import { INSPECT_LIST, ACCEPT_LIST, HAZARD_LIST, hazardOf } from '../../data/hazard'

const activeTab = ref('inspect')
const tabs = shallowRef([
  { name: 'inspect', label: '排查名片', comp: InspectCardTab },
  { name: 'accept', label: '验收名片', comp: AcceptCardTab }
])

const stats = computed(() => {
  const totalHazards = INSPECT_LIST.reduce((s, i) => s + (i.hazardCount || 0), 0)
  const closed = HAZARD_LIST.filter((h) => h.status === '已关闭').length
  const needAccept = HAZARD_LIST.filter((h) => h.status === '待验收').length
  const qualified = ACCEPT_LIST.filter((a) => a.conclusion === '合格').length
  const unqualified = ACCEPT_LIST.filter((a) => a.conclusion !== '合格').length
  return [
    { label: '排查次数', value: INSPECT_LIST.length, unit: '次', tone: 'primary' },
    { label: '排查发现隐患', value: totalHazards, unit: '条', tone: 'warning' },
    { label: '待验收', value: needAccept, unit: '条', tone: 'warning' },
    { label: '已关闭', value: closed, unit: '条', tone: 'success' },
    { label: '验收合格', value: qualified, unit: '次', tone: 'success' },
    { label: '验收不合格', value: unqualified, unit: '次', tone: 'danger' }
  ]
})
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">隐患排查记录</h1>
        <p class="page-desc">
          排查名片记录「谁、按什么依据、在什么范围、查出了几条隐患」；验收名片记录「谁验收、结论如何、不合格怎么退」。两张名片都挂在隐患台账上，从台账可反查来源排查与验收过程。
        </p>
      </div>
    </div>

    <div class="stat-row">
      <div v-for="s in stats" :key="s.label" class="stat-card" :class="`tone-${s.tone}`">
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-value">{{ s.value }}<span class="unit">{{ s.unit }}</span></div>
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
  grid-template-columns: repeat(6, minmax(0, 1fr));
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
.stat-label { font-size: var(--ez-font-size-caption); color: var(--ez-text-secondary); margin-bottom: 6px; }
.stat-value { font-size: 22px; font-weight: 600; color: var(--ez-text); line-height: 1.1; font-variant-numeric: tabular-nums; }
.unit { font-size: 12px; font-weight: 400; color: var(--ez-text-muted); margin-left: 3px; }

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
