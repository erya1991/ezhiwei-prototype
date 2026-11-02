<script setup>
import { ref, computed, shallowRef } from 'vue'
import RiskPointTab from './RiskPointTab.vue'
import HazardTab from './HazardTab.vue'
import FactorTab from './FactorTab.vue'
import GradeStandardTab from './GradeStandardTab.vue'
import AuditTab from './AuditTab.vue'
import {
  RISK_POINT_LIST, HAZARD_LIST, AUDIT_LIST, GRADE_STANDARDS
} from '../../data/risk'

const activeTab = ref('point')
const tabs = shallowRef([
  { name: 'point', label: '风险点', comp: RiskPointTab },
  { name: 'hazard', label: '危险源与 LEC 评估', comp: HazardTab },
  { name: 'factor', label: '危害因素库', comp: FactorTab },
  { name: 'standard', label: '分级标准', comp: GradeStandardTab },
  { name: 'audit', label: '评估审核', comp: AuditTab }
])

const stats = computed(() => {
  const high = HAZARD_LIST.filter((h) => h.level >= 4).length
  const lv5 = HAZARD_LIST.filter((h) => h.level === 5).length
  const pending = AUDIT_LIST.filter(
    (a) => a.flowStatus === '待第一级' || a.flowStatus === '待第二级'
  ).length
  return [
    { key: 'point', label: '风险点', value: RISK_POINT_LIST.length, unit: '个', tone: 'primary' },
    { key: 'hazard', label: '危险源', value: HAZARD_LIST.length, unit: '项', tone: 'primary' },
    {
      key: 'high', label: '高危（4-5 级）', value: high, unit: '项',
      tone: high > 0 ? 'danger' : 'success',
      hint: lv5 > 0 ? `含 ${lv5} 项 5 级，须停止作业整改` : ''
    },
    { key: 'standard', label: '分级标准', value: GRADE_STANDARDS.length, unit: '级', tone: 'primary' },
    {
      key: 'audit', label: '待审核', value: pending, unit: '条',
      tone: pending > 0 ? 'warning' : 'success'
    }
  ]
})
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">风险识别与评估</h1>
        <p class="page-desc">
          按「风险点 → 危险源 → LEC 评估 → 分级 → 审核」链路逐层收敛。D = L × E × C 自动计算，风险等级按分级标准自动判定，评估结果经两级审核后方可用于目录化与措施制定。
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
  max-width: 920px;
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
