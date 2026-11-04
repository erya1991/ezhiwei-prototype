import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '../composables/useAuth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '综合态势驾驶舱' }
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    component: () => import('../views/KnowledgeBaseView.vue'),
    meta: { title: '专家知识库' }
  },
  {
    path: '/ai-agent',
    name: 'ai-agent',
    component: () => import('../views/AiChatView.vue'),
    meta: { title: 'AI智能体' }
  },
  {
    path: '/work-order',
    name: 'work-order',
    redirect: '/work-order/ledger'
  },
  {
    path: '/work-order/ledger',
    name: 'work-order-ledger',
    component: () => import('../views/WorkOrderView.vue'),
    meta: { title: '工单台账' }
  },
  {
    path: '/work-order/mine',
    name: 'work-order-mine',
    component: () => import('../views/work-order/MyOrdersView.vue'),
    meta: { title: '我的工单' }
  },
  {
    path: '/work-order/rules',
    name: 'work-order-rules',
    component: () => import('../views/work-order/WorkOrderRulesView.vue'),
    meta: { title: '工单规则配置' }
  },
  {
    path: '/work-order/mobile/ledger',
    name: 'work-order-mobile-ledger',
    component: () => import('../views/work-order/MobileOrdersView.vue'),
    meta: { title: '移动工单台账', layout: 'work-order-mobile' }
  },
  {
    path: '/work-order/mobile/mine',
    name: 'work-order-mobile-mine',
    component: () => import('../views/work-order/MobileOrdersView.vue'),
    meta: { title: '移动我的工单', layout: 'work-order-mobile' }
  },
  {
    path: '/snapshot',
    name: 'snapshot',
    component: () => import('../views/SnapshotView.vue'),
    meta: { title: 'AI随手拍' }
  },
  {
    path: '/energy',
    name: 'energy',
    component: () => import('../views/EnergyView.vue'),
    meta: { title: 'AI节能优化中心' }
  },
  {
    path: '/predict',
    name: 'predict',
    component: () => import('../views/PredictMaintenanceView.vue'),
    meta: { title: '设备健康与预测性维护AI中心' }
  },
  {
    path: '/equipment/categories',
    name: 'equipment-categories',
    component: () => import('../views/equipment/EquipmentCategoriesView.vue'),
    meta: { title: '设备分类管理' }
  },
  {
    path: '/equipment/ledger',
    name: 'equipment-ledger',
    component: () => import('../views/equipment/EquipmentLedgerView.vue'),
    meta: { title: '设备台账' }
  },
  {
    path: '/equipment/spaces',
    name: 'equipment-spaces',
    component: () => import('../views/equipment/EquipmentSpacesView.vue'),
    meta: { title: '院区空间与建筑档案' }
  },
  {
    path: '/inspection/rules',
    name: 'inspection-rules',
    component: () => import('../views/inspection/InspectionRulesView.vue'),
    meta: { title: '巡检规则' }
  },
  {
    path: '/inspection/plans',
    name: 'inspection-plans',
    component: () => import('../views/inspection/InspectionPlansView.vue'),
    meta: { title: '巡检计划与路线' }
  },
  {
    path: '/inspection/tasks',
    name: 'inspection-tasks',
    component: () => import('../views/inspection/InspectionTasksView.vue'),
    meta: { title: '巡检任务' }
  },
  {
    path: '/inspection/records',
    name: 'inspection-records',
    component: () => import('../views/inspection/InspectionRecordsView.vue'),
    meta: { title: '巡检记录' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: '系统设置' }
  }
]

// Public UI reference is available only in development and uses the same login guard.
if (import.meta.env.DEV) {
  routes.push({
    path: '/__ui-baseline',
    name: 'ui-baseline',
    component: () => import('../views/__dev/UiBaselineView.vue'),
    meta: { title: '公共 UI 示例' }
  })
}

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 登录鉴权：未登录访问平台页面重定向到登录页；已登录访问登录页重定向到驾驶舱。
router.beforeEach((to) => {
  if (!to.meta.public && !isAuthenticated.value) return { name: 'login' }
  if (to.name === 'login' && isAuthenticated.value) return { name: 'dashboard' }
})

export default router
