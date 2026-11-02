<script setup>
import { ref, computed, shallowRef } from 'vue'
import SubjectTab from './SubjectTab.vue'
import NodeTab from './NodeTab.vue'
import AssignmentTab from './AssignmentTab.vue'
import {
  SUBJECT_LIST, NODE_LIST, ASSIGNMENT_LIST, assignmentStatus
} from '../../data/responsibility'

const activeTab = ref('subject')
const tabs = shallowRef([
  { name: 'subject', label: '责任主体', comp: SubjectTab },
  { name: 'node', label: '组织节点', comp: NodeTab },
  { name: 'assignment', label: '人员任职', comp: AssignmentTab }
])

const onDutyAssignments = computed(
  () => ASSIGNMENT_LIST.filter((a) => assignmentStatus(a) === '在任').length
)
const firstDutyCount = computed(
  () => ASSIGNMENT_LIST.filter(
    (a) => a.dutyTag === '第一责任人' && assignmentStatus(a) === '在任'
  ).length
)
const noCertCount = computed(
  () => ASSIGNMENT_LIST.filter(
    (a) => assignmentStatus(a) === '在任' && a.hasCert === '否'
  ).length
)

const stats = computed(() => [
  { key: 'subject', label: '责任主体', value: SUBJECT_LIST.length, unit: '家', tone: 'primary' },
  { key: 'node', label: '组织节点', value: NODE_LIST.length, unit: '个', tone: 'primary' },
  { key: 'assignment', label: '在任任职', value: onDutyAssignments.value, unit: '条', tone: 'success' },
  { key: 'first', label: '第一责任人', value: firstDutyCount.value, unit: '人', tone: 'primary' },
  {
    key: 'nocert', label: '无证在任', value: noCertCount.value, unit: '人',
    tone: noCertCount.value > 0 ? 'danger' : 'success',
    hint: noCertCount.value > 0 ? '按一票否决条款禁止安排作业' : ''
  }
])
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">安全责任主体划分</h1>
        <p class="page-desc">
          先划清「谁负责」——三方责任主体、四级组织节点、人员任职与责任人标识。后面所有风险点的责任人、隐患的派单对象，都从这里取数。
        </p>
      </div>
    </div>

    <div class="stat-row">
      <div v-for="s in stats" :key="s.key" class="stat-card" :class="`tone-${s.tone}`">
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-value">
          {{ s.value }}<span class="stat-unit">{{ s.unit }}</span>
        </div>
        <div v-if="s.hint" class="stat-hint">{{ s.hint }}</div>
      </div>
    </div>

    <div class="tab-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane
          v-for="t in tabs"
          :key="t.name"
          :label="t.label"
          :name="t.name"
        >
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
  max-width: 880px;
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
