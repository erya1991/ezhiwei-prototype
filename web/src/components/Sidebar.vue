<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// One expanded group at a time; collapsed groups do not occupy sidebar height.
const expandedGroup = ref('')
function toggleGroup(path) { expandedGroup.value = expandedGroup.value === path ? '' : path }

const items = [
  {
    path: '/',
    label: '综合态势驾驶舱',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
  },
  {
    path: '/knowledge',
    label: '专家知识库',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="10" r="2"/><circle cx="15" cy="10" r="2"/><path d="M8 14c0 0 1.5 2 4 2s4-2 4-2"/><line x1="9" y1="17" x2="15" y2="17"/></svg>'
  },
  {
    path: '/ai-agent',
    label: 'AI智能体',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><path d="M8 14c0 0 1.5 2.5 4 2.5s4-2.5 4-2.5"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/></svg>'
  },
  {
    path: '/equipment/categories',
    label: '设备管理',
    children: [{ path: '/equipment/categories', label: '设备分类管理' }, { path: '/equipment/ledger', label: '设备台账' }, { path: '/equipment/spaces', label: '院区空间与建筑档案' }],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 4v16M8 10h13M13 14h4M13 17h4"/></svg>'
  },
  {
    path: '/inspection/rules',
    label: '巡检管理',
    children: [{ path: '/inspection/rules', label: '巡检规则' }, { path: '/inspection/plans', label: '巡检计划与路线' }, { path: '/inspection/tasks', label: '巡检任务' }, { path: '/inspection/records', label: '巡检记录' }],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 2h6v4H9zM8 12l2 2 5-5M8 18h8"/></svg>'
  },
  {
    path: '/work-order/ledger',
    label: '工单处理',
    children: [{ path: '/work-order/ledger', label: '工单台账' }, { path: '/work-order/mine', label: '我的工单' }, { path: '/work-order/rules', label: '工单规则配置' }],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  },
  {
    path: '/snapshot',
    label: 'AI随手拍',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
  },
  {
    path: '/energy',
    label: 'AI节能优化中心',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
  },
  {
    path: '/predict',
    label: '设备健康与预测性维护AI中心',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>'
  },
  {
    path: '/settings',
    label: '系统设置',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  }
]
</script>

<template>
  <nav class="sidebar" @mouseleave="expandedGroup = ''">
    <ul class="sidebar-nav">
      <li v-for="item in items" :key="item.path">
        <div class="sidebar-entry">
        <router-link
          :to="item.path"
          class="sidebar-item"
          :class="{ active: route.path === item.path || item.children?.some(child => child.path === route.path), 'has-children': Boolean(item.children) }"
          @click="item.children && (expandedGroup = item.path)"
        >
          <span class="nav-icon" v-html="item.icon"></span>
          <span class="item-text">{{ item.label }}</span>
        </router-link>
        <button v-if="item.children" type="button" class="group-toggle" :aria-label="`${expandedGroup === item.path ? '收起' : '展开'}${item.label}`" :aria-expanded="expandedGroup === item.path" @click="toggleGroup(item.path)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" :class="{ expanded: expandedGroup === item.path }"><path d="m5 3 5 5-5 5" /></svg>
        </button>
        </div>
        <ul v-if="item.children && expandedGroup === item.path" class="module-children">
          <li v-for="child in item.children" :key="child.path"><router-link :to="child.path" :class="{ selected: route.path === child.path }">{{ child.label }}</router-link></li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.sidebar-nav { overflow-y:auto; overflow-x:hidden; min-height:0; flex:1; scrollbar-width:thin; }
.sidebar-entry { position:relative; }
.sidebar-item.has-children { padding-right:34px; }
.group-toggle { position:absolute; left:calc(var(--sidebar-expand-w) - 40px); top:8px; width:26px; height:26px; padding:5px; border:0; border-radius:6px; background:transparent; color:var(--ez-text-secondary); cursor:pointer; display:none; }
.group-toggle:hover { color:var(--ez-primary); background:var(--ez-primary-bg); }
.group-toggle:focus-visible { outline:2px solid var(--ez-primary); }
.group-toggle svg { width:14px; height:14px; transition:transform 160ms; }
.group-toggle svg.expanded { transform:rotate(90deg); }
.module-children { list-style:none; margin:2px 8px 6px 36px; padding:0; display:none; overflow:hidden; }
.sidebar:hover .module-children,.sidebar:focus-within .module-children { display:block; }
.sidebar:hover .group-toggle,.sidebar:focus-within .group-toggle { display:block; }
.sidebar:focus-within { width:var(--sidebar-expand-w); }
.sidebar:focus-within .item-text { opacity:1; }
.module-children a { display:block; padding:8px; white-space:nowrap; color:var(--ez-text-secondary); text-decoration:none; border-radius:var(--ez-control-radius); font-size:12px; }
.module-children a.selected { color:var(--ez-primary); background:var(--ez-primary-bg); }
</style>
