<script setup>
import { ref, computed, shallowRef } from 'vue'
import OrgTab from './OrgTab.vue'
import PositionTab from './PositionTab.vue'
import PersonTab from './PersonTab.vue'
import WorkTypeTab from './WorkTypeTab.vue'
import RoleTab from './RoleTab.vue'
import {
  ORG_LIST, POSITION_LIST, PERSON_LIST, CERT_LIST, ROLE_LIST,
  personCertStatus
} from '../../data/orgPersonnel'

const activeTab = ref('org')

const tabs = shallowRef([
  { name: 'org', label: '组织架构', comp: OrgTab },
  { name: 'position', label: '岗位设置', comp: PositionTab },
  { name: 'person', label: '人员档案', comp: PersonTab },
  { name: 'worktype', label: '工种维护', comp: WorkTypeTab },
  { name: 'role', label: '角色权限', comp: RoleTab }
])

// ---- 顶部概览 ----
const onDutyCount = computed(() => PERSON_LIST.filter((p) => !p.leaveDate).length)
const certAlertCount = computed(
  () => PERSON_LIST.filter((p) => {
    const s = personCertStatus(p.id)
    return s === '有证件已过期' || s === '有证件即将到期'
  }).length
)
const expiredCertCount = computed(
  () => CERT_LIST.filter((c) => personCertStatus(c.personId) === '有证件已过期').length
)

const stats = computed(() => [
  { key: 'org', label: '组织节点', value: ORG_LIST.length, unit: '个', tone: 'primary' },
  { key: 'position', label: '岗位', value: POSITION_LIST.length, unit: '个', tone: 'primary' },
  { key: 'person', label: '在岗人员', value: onDutyCount.value, unit: '人', tone: 'success' },
  { key: 'cert', label: '持证异常', value: certAlertCount.value, unit: '人', tone: certAlertCount.value > 0 ? 'danger' : 'success', hint: expiredCertCount.value > 0 ? `含 ${expiredCertCount.value} 人证件已过期` : '' },
  { key: 'role', label: '角色', value: ROLE_LIST.length, unit: '个', tone: 'primary' }
])
</script>

<template>
  <div class="page-wrap">
    <!-- 页头 -->
    <div class="page-head">
      <div class="head-left">
        <h1 class="page-title">组织与人员</h1>
        <p class="page-desc">
          人员调度 · 组织架构、岗位、人员档案、持证与角色权限统一维护。本模块是安全责任、风险管控、隐患排查三块的「责任人」数据源。
        </p>
      </div>
    </div>

    <!-- 概览卡片 -->
    <div class="stat-row">
      <div v-for="s in stats" :key="s.key" class="stat-card" :class="'tone-' + s.tone">
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-value">
          {{ s.value }}<span class="stat-unit">{{ s.unit }}</span>
        </div>
        <div v-if="s.hint" class="stat-hint">{{ s.hint }}</div>
      </div>
    </div>

    <!-- Tab 主体 -->
    <div class="tab-card">
      <el-tabs v-model="activeTab" class="ez-tabs">
        <el-tab-pane v-for="t in tabs" :key="t.name" :label="t.label" :name="t.name">
          <component :is="t.comp" />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
/* 与 .main / .placeholder-page 一致：fixed 填满 Topbar + Sidebar 之外的区域，
   不设背景色，让 body 的 bg.png 透出，保持与现有页面同一视觉基底 */
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

/* 页头 */
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.page-title {
  margin: 0 0 6px;
  font-size: var(--ez-font-size-title);
  font-weight: 600;
  color: var(--ez-text);
  line-height: 1.3;
}
.page-desc {
  margin: 0;
  max-width: 880px;
  font-size: var(--ez-font-size-caption);
  color: var(--ez-text-secondary);
  line-height: 1.7;
}

/* 概览卡片 */
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
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}
.tone-primary::before { background: var(--ez-primary); }
.tone-success::before { background: var(--ez-success); }
.tone-danger::before { background: var(--ez-danger); }
.tone-warning::before { background: var(--ez-warning); }

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
.tone-danger .stat-value { color: var(--ez-danger); }
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
}

/* Tab 卡片 */
.tab-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 4px 16px 16px;
}
.ez-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}
.ez-tabs :deep(.el-tabs__item) {
  font-size: 14px;
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
