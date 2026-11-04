import { clone } from './common.js'

const scope = ['space-campus']
const account = (id, name, organizationId, permissions, roles = [], extra = {}) => ({
  id, name, organizationId, active: true, projectIds: ['project-demo'], campusIds: scope,
  permissions, roles, ...extra
})
export function createDirectory() {
  return {
    organizations: [
      { id: 'org-hospital', name: '示范院区（模拟）' }, { id: 'org-maintenance', name: '工程运维组（模拟）' },
      { id: 'wo-org-construction', name: '建设施工协作组（模拟）' }, { id: 'wo-org-service', name: '专业维保组（模拟）' }
    ],
    accounts: [
      account('wo-manager', '周调度（管理演示）', 'org-hospital', ['readAll', 'create', 'dispatch', 'transfer', 'manage']),
      account('wo-rule-admin', '林配置（规则演示）', 'org-hospital', ['rules']),
      account('wo-reporter', '陈报修（院方演示）', 'org-hospital', ['create']),
      account('person-01', '巡检员甲（演示）', 'org-maintenance', ['create', 'handle'], ['wo-accept-role']),
      account('person-02', '巡检员乙（演示）', 'org-maintenance', ['create', 'handle']),
      account('wo-builder', '许施工（协作演示）', 'wo-org-construction', ['handle']),
      account('wo-service', '何维保（协作演示）', 'wo-org-service', ['handle']),
      account('wo-accept-1', '赵验收甲（演示）', 'org-hospital', [], ['wo-accept-role']),
      account('wo-accept-2', '钱验收乙（演示）', 'org-hospital', [], ['wo-accept-role']),
      account('wo-unrelated', '同组织访客（演示）', 'org-maintenance', []),
      account('wo-outside', '范围外账号（演示）', 'org-hospital', ['create', 'handle'], [], { campusIds: [] }),
      account('wo-inactive', '停用处理账号（演示）', 'org-maintenance', ['handle'], [], { active: false })
    ],
    roles: [{ id: 'wo-accept-role', name: '工程验收组（演示）', active: true }, { id: 'wo-empty-role', name: '暂无成员验收组（演示）', active: true }]
  }
}
export const DEMO_LIMITS = {
  普通: { receiving: 30, processing: 240, acceptance: 120 },
  较急: { receiving: 10, processing: 60, acceptance: 30 },
  紧急: { receiving: 5, processing: 30, acceptance: 10 }
}
export function createBaseState(anchor = new Date().toISOString()) {
  const category = (id, code, name, mode, targetId, allowSelf = false) => ({
    id, projectId: 'project-demo', code, name, description: '仅用于前端演示，请按医院正式规则配置。',
    sort: 1, enabled: true, defaultPriority: '普通', acceptanceMode: mode, acceptanceTargetId: targetId,
    allowSelf, limits: clone(DEMO_LIMITS), version: 1, modifiedAt: anchor, modifiedBy: 'wo-rule-admin'
  })
  const categories = [
    category('wo-cat-repair', 'REPAIR', '设备维修', 'initiator', ''),
    category('wo-cat-building', 'BUILDING', '建筑设施整改', 'role', 'wo-accept-role'),
    category('wo-cat-person', 'REVIEW', '专项复核维修', 'person', 'wo-accept-1'),
    category('wo-cat-self', 'MINOR', '现场小修（自验演示）', 'initiator', '', true)
  ]
  const rule = (id, name, sequence, categoryIds, targetId) => ({
    id, projectId: 'project-demo', campusId: 'space-campus', name, sequence, categoryIds,
    professions: [], buildingIds: [], sources: ['人工填报'], priorities: [], targetId, enabled: true,
    description: '仅为演示派单条件', version: 1, modifiedAt: anchor, modifiedBy: 'wo-rule-admin'
  })
  return {
    schema: 1, serial: 100, revision: 0, anchor, actorId: 'wo-manager', directory: createDirectory(),
    categories, categoryHistory: clone(categories),
    rules: [
      rule('wo-rule-repair', '设备维修派给巡检员甲', 10, ['wo-cat-repair'], 'person-01'),
      rule('wo-rule-building', '建筑整改派给巡检员乙', 20, ['wo-cat-building'], 'person-02'),
      rule('wo-rule-person', '专项维修首条目标已失效', 30, ['wo-cat-person'], 'wo-inactive'),
      rule('wo-rule-backup', '专项维修后备规则（不会静默命中）', 40, ['wo-cat-person'], 'wo-service'),
      rule('wo-rule-self', '小修由发起人承接的演示规则', 50, ['wo-cat-self'], 'person-01')
    ],
    ruleHistory: [], orders: [], configLogs: [], receipts: {}
  }
}
