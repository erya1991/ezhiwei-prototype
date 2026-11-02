<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

// 菜单按功能清单 v2 的模块顺序排列。
// 分组项（含 children）用于承载一个模块下的多个末级菜单。
const items = [
  // ===== A 侧原有 8 项，顺序与图标保持原样 =====
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
    path: '/work-order',
    label: '工单处理',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  },
  // ===== B 侧新增：人员调度（基础数据，模块 4/5/6 的责任人字段都依赖它）=====
  {
    group: '人员调度',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17.5" cy="9" r="2.2"/><path d="M15.5 20c0-2.2 1.4-3.8 3.3-3.8 1.9 0 3.2 1.6 3.2 3.8"/></svg>',
    children: [
      { path: '/personnel/organization', label: '组织与人员' }
    ]
  },

  // ===== B 侧新增：模块 4 安全责任管理体系 =====
  {
    group: '安全责任管理体系',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
    children: [
      { path: '/safety/responsibility-system', label: '安全责任管理制度' },
      { path: '/safety/responsibility-subject', label: '安全责任主体划分' }
    ]
  },

  // ===== B 侧新增：模块 5 安全风险分级管控 =====
  {
    group: '安全风险分级管控',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    children: [
      { path: '/risk/identify', label: '风险识别与评估' },
      { path: '/risk/catalog', label: '风险目录化管理' },
      { path: '/risk/measure', label: '风险管控措施制定' },
      { path: '/risk/plan', label: '风险应急预案' }
    ]
  },

  // ===== B 侧新增：模块 6 隐患排查治理 =====
  {
    group: '隐患排查治理',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    children: [
      { path: '/hazard/report', label: 'AI随手拍' },
      { path: '/hazard/overview', label: '隐患信息总览' },
      { path: '/hazard/dispatch', label: '隐患派单记录' },
      { path: '/hazard/inspect', label: '隐患排查记录' }
    ]
  },

  // ===== A 侧原有：AI节能 / 设备健康 =====
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

  // ===== A 侧原有：系统设置 =====
  {
    path: '/settings',
    label: '系统设置',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  }
]

function isGroupActive(item) {
  return (item.children || []).some((c) => route.path === c.path)
}
</script>

<template>
  <nav class="sidebar">
    <ul class="sidebar-nav">
      <template v-for="item in items" :key="item.path || item.group">
        <li v-if="!item.children">
          <router-link
            :to="item.path"
            class="sidebar-item"
            :class="{ active: route.path === item.path }"
          >
            <span class="nav-icon" v-html="item.icon"></span>
            <span class="item-text">{{ item.label }}</span>
          </router-link>
        </li>
        <li v-else class="nav-group" :class="{ 'group-active': isGroupActive(item) }">
          <div class="sidebar-item group-head">
            <span class="nav-icon" v-html="item.icon"></span>
            <span class="item-text">{{ item.group }}</span>
          </div>
          <ul class="sub-nav">
            <li v-for="c in item.children" :key="c.path">
              <router-link
                :to="c.path"
                class="sub-item"
                :class="{ active: route.path === c.path }"
              >
                <span class="sub-dot"></span>
                <span class="sub-text">{{ c.label }}</span>
              </router-link>
            </li>
          </ul>
        </li>
      </template>
    </ul>
  </nav>
</template>

<style scoped>
/* 菜单条目变多后需要纵向滚动；滚动条隐藏以保持图标栏干净 */
.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.sidebar-nav::-webkit-scrollbar {
  width: 0;
}

.nav-group {
  margin-top: 2px;
}
.group-head {
  cursor: default;
}
.group-active .group-head {
  color: var(--blue);
}
.group-active .group-head::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 2.5px;
  height: 16px;
  background: var(--blue);
  border-radius: 2px;
}

/* 子菜单：侧边栏 hover 展开时才显示文字，收起状态不占位 */
.sub-nav {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--transition);
}
.sidebar:hover .sub-nav {
  max-height: 260px;
}
.sub-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 22px;
  margin: 1px 0;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-sec);
  white-space: nowrap;
  overflow: hidden;
  transition: all var(--transition);
}
.sub-item:hover {
  background: rgba(255, 255, 255, 0.48);
  color: var(--text);
}
.sub-item.active {
  background: rgba(33, 115, 216, 0.12);
  color: var(--blue);
  font-weight: 600;
}
.sub-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
  flex-shrink: 0;
}
.sub-text {
  opacity: 0;
  transition: opacity 120ms var(--transition);
}
.sidebar:hover .sub-text {
  opacity: 1;
}
</style>
