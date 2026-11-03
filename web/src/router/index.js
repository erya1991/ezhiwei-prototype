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
    component: () => import('../views/WorkOrderView.vue'),
    meta: { title: '工单处理' }
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
  // ===== B 侧新增：人员调度 / 组织与人员 =====
  // 原型阶段临时挂载，仅用于本地预览；正式菜单项与路由归并请 A 在集成时统一处理。
  {
    path: '/personnel/organization',
    name: 'personnel-organization',
    component: () => import('../views/hr/OrgPersonnelView.vue'),
    meta: { title: '组织与人员' }
  },
  {
    path: '/safety/responsibility-system',
    name: 'responsibility-system',
    component: () => import('../views/responsibility/ResponsibilitySystemView.vue'),
    meta: { title: '安全责任管理制度' }
  },
  {
    path: '/safety/responsibility-subject',
    name: 'responsibility-subject',
    component: () => import('../views/responsibility/SubjectDivisionView.vue'),
    meta: { title: '安全责任主体划分' }
  },
  {
    path: '/risk/identify',
    name: 'risk-identify',
    component: () => import('../views/risk/RiskIdentifyView.vue'),
    meta: { title: '风险识别与评估' }
  },
  {
    path: '/risk/catalog',
    name: 'risk-catalog',
    component: () => import('../views/risk/RiskCatalogView.vue'),
    meta: { title: '风险目录化管理' }
  },
  {
    path: '/risk/measure',
    name: 'risk-measure',
    component: () => import('../views/risk/MeasureView.vue'),
    meta: { title: '风险管控措施制定' }
  },
  {
    path: '/risk/plan',
    name: 'risk-plan',
    component: () => import('../views/risk/PlanView.vue'),
    meta: { title: '风险应急预案' }
  },
  {
    path: '/hazard/report',
    name: 'hazard-report',
    component: () => import('../views/hazard/ReportEntryView.vue'),
    meta: { title: 'AI随手拍' }
  },
  {
    path: '/hazard/report/manual',
    name: 'hazard-report-manual',
    component: () => import('../views/hazard/ReportView.vue'),
    meta: { title: '手动上报' }
  },
  {
    path: '/hazard/overview',
    name: 'hazard-overview',
    component: () => import('../views/hazard/HazardOverviewView.vue'),
    meta: { title: '隐患信息总览' }
  },
  {
    path: '/hazard/dispatch',
    name: 'hazard-dispatch',
    component: () => import('../views/hazard/DispatchView.vue'),
    meta: { title: '隐患派单记录' }
  },
  {
    path: '/hazard/inspect',
    name: 'hazard-inspect',
    component: () => import('../views/hazard/InspectView.vue'),
    meta: { title: '隐患排查记录' }
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
