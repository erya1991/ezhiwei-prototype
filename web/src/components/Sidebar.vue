<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const expandedGroup = ref('')

// 一级模块统一使用 path / label / icon，可选 children 承载二级菜单。
const items = [
  {
    path: '/',
    label: '综合态势驾驶舱',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
  },
  {
    path: '/knowledge',
    label: '专家知识库',
    children: [
      {
        path: '/knowledge',
        label: '知识资料管理'
      },
      {
        path: '/knowledge-processing',
        label: '知识加工与治理'
      },
      {
        path: '/threshold-rules',
        label: '规则与阈值知识库'
      }
    ],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="10" r="2"/><circle cx="15" cy="10" r="2"/><path d="M8 14c0 0 1.5 2 4 2s4-2 4-2"/><line x1="9" y1="17" x2="15" y2="17"/></svg>'
  },
  {
    path: '/ai-agent',
    label: 'AI智能体',
    children: [
      {
        path: '/ai-agent',
        label: '智能问答'
      },
      {
        path: '/reasoning-rules',
        label: '推理规则配置'
      }
    ],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><path d="M8 14c0 0 1.5 2.5 4 2.5s4-2.5 4-2.5"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/></svg>'
  },
  {
    path: '/equipment/categories',
    label: '设备管理',
    children: [
      {
        path: '/equipment/categories',
        label: '设备分类管理'
      },
      {
        path: '/equipment/ledger',
        label: '设备台账'
      },
      {
        path: '/equipment/spaces',
        label: '院区空间与建筑档案'
      }
    ],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 4v16M8 10h13M13 14h4M13 17h4"/></svg>'
  },
  {
    path: '/inspection/rules',
    label: '巡检管理',
    children: [
      {
        path: '/inspection/rules',
        label: '巡检规则'
      },
      {
        path: '/inspection/plans',
        label: '巡检计划与路线'
      },
      {
        path: '/inspection/tasks',
        label: '巡检任务'
      },
      {
        path: '/inspection/records',
        label: '巡检记录'
      }
    ],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 2h6v4H9zM8 12l2 2 5-5M8 18h8"/></svg>'
  },
  {
    path: '/work-order',
    label: '工单处理',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  },
  {
    path: '/snapshot',
    label: 'AI随手拍（历史）',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
  },
  {
    path: '/personnel/organization',
    label: '人员调度',
    children: [
      {
        path: '/personnel/organization',
        label: '组织与人员'
      }
    ],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17.5" cy="9" r="2.2"/><path d="M15.5 20c0-2.2 1.4-3.8 3.3-3.8 1.9 0 3.2 1.6 3.2 3.8"/></svg>'
  },
  {
    path: '/safety/responsibility-system',
    label: '安全责任管理体系',
    children: [
      {
        path: '/safety/responsibility-system',
        label: '安全责任管理制度'
      },
      {
        path: '/safety/responsibility-subject',
        label: '安全责任主体划分'
      }
    ],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>'
  },
  {
    path: '/risk/identify',
    label: '安全风险分级管控',
    children: [
      {
        path: '/risk/identify',
        label: '风险识别与评估'
      },
      {
        path: '/risk/catalog',
        label: '风险目录化管理'
      },
      {
        path: '/risk/measure',
        label: '风险管控措施制定'
      },
      {
        path: '/risk/plan',
        label: '风险应急预案'
      }
    ],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  },
  {
    path: '/hazard/report',
    label: '隐患排查治理',
    children: [
      {
        path: '/hazard/report',
        label: 'AI随手拍'
      },
      {
        path: '/hazard/overview',
        label: '隐患信息总览'
      },
      {
        path: '/hazard/dispatch',
        label: '隐患派单记录'
      },
      {
        path: '/hazard/inspect',
        label: '隐患排查记录'
      }
    ],
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>'
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

function isActive(item) {
  return item.children
    ? item.children.some(child => child.path === route.path)
    : item.path === route.path
}

function toggleGroup(path) {
  expandedGroup.value = expandedGroup.value === path ? '' : path
}

// 直接访问、刷新及前进/后退时展开当前子菜单所属模块。
watch(() => route.path, () => {
  expandedGroup.value = items.find(item => item.children && isActive(item))?.path || ''
}, { immediate: true })
</script>

<template>
  <nav class="sidebar" aria-label="主导航">
    <ul class="sidebar-nav">
      <li v-for="(item, index) in items" :key="item.path">
        <button
          v-if="item.children"
          type="button"
          class="sidebar-item group-toggle"
          :class="{ active: isActive(item) }"
          :title="item.label"
          :aria-expanded="expandedGroup === item.path"
          :aria-controls="`submenu-${index}`"
          @click="toggleGroup(item.path)"
        >
          <span class="nav-icon" v-html="item.icon"></span>
          <span class="item-text">{{ item.label }}</span>
          <svg class="group-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" :class="{ expanded: expandedGroup === item.path }" aria-hidden="true"><path d="m5 3 5 5-5 5" /></svg>
        </button>
        <router-link
          v-else
          :to="item.path"
          class="sidebar-item"
          :class="{ active: isActive(item) }"
          :title="item.label"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          <span class="nav-icon" v-html="item.icon"></span>
          <span class="item-text">{{ item.label }}</span>
        </router-link>
        <ul v-if="item.children" v-show="expandedGroup === item.path" :id="`submenu-${index}`" class="module-children">
          <li v-for="child in item.children" :key="child.path">
            <router-link :to="child.path" :class="{ selected: route.path === child.path }" :aria-current="route.path === child.path ? 'page' : undefined">{{ child.label }}</router-link>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.sidebar-nav { overflow-y: auto; overflow-x: hidden; min-height: 0; flex: 1; scrollbar-width: thin; }
.group-toggle { width: 100%; border: 0; background: transparent; text-align: left; font-family: inherit; }
.group-toggle:focus-visible, .module-children a:focus-visible { outline: 2px solid var(--ez-primary); outline-offset: -2px; }
.nav-icon { display: flex; flex-shrink: 0; }
.item-text { overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.group-toggle .item-text { flex-shrink: 1; }
.sidebar-item .group-arrow { width: 14px; height: 14px; margin-left: auto; opacity: 0; transition: transform 160ms; }
.group-arrow.expanded { transform: rotate(90deg); }
.module-children { list-style: none; margin: 2px 0 6px 30px; padding: 0; display: none; }
.sidebar:hover .module-children, .sidebar:focus-within .module-children { display: block; }
.sidebar:hover .group-arrow, .sidebar:focus-within .group-arrow { opacity: 1; }
.sidebar:focus-within { width: var(--sidebar-expand-w); }
.sidebar:focus-within .item-text { opacity: 1; }
.module-children a { display: block; padding: 8px; white-space: normal; color: var(--ez-text-secondary); text-decoration: none; border-radius: var(--ez-control-radius); font-size: 12px; }
.module-children a:hover { color: var(--ez-primary); background: var(--ez-primary-bg); }
.module-children a.selected { color: var(--ez-primary); background: var(--ez-primary-bg); font-weight: 600; }
</style>
