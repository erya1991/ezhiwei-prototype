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
    meta: { title: '知识资料管理' }
  },
  {
    path: '/knowledge-processing',
    name: 'knowledge-processing',
    component: () => import('../views/KnowledgeProcessingView.vue'),
    meta: { title: '知识加工与治理' }
  },
  {
    path: '/threshold-rules',
    name: 'threshold-rules',
    component: () => import('../views/ThresholdRulesView.vue'),
    meta: { title: '规则与阈值知识库' }
  },
  {
    path: '/reasoning-rules',
    name: 'reasoning-rules',
    component: () => import('../views/ReasoningRulesView.vue'),
    meta: { title: '推理规则配置' }
  },
  {
    path: '/ai-agent',
    name: 'ai-agent',
    component: () => import('../views/AiChatView.vue'),
    meta: { title: '智能问答' }
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
