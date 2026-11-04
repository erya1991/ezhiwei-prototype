import { clone, requireValue, PRIORITIES, PROFESSIONS, TERMINAL, durationError } from './common.js'
export const has = (actor, permission) => Boolean(actor?.permissions.includes(permission))
export const inScope = (actor, order) => Boolean(actor?.active && actor.projectIds.includes(order.projectId) && actor.campusIds.includes(order.campusId))
export const account = (state, id) => state.directory.accounts.find(row => row.id === id)
export const orgName = (state, id) => state.directory.organizations.find(row => row.id === id)?.name || id
export const identity = (state, actor) => ({ id: actor.id, name: actor.name, organizationId: actor.organizationId, organizationName: orgName(state, actor.organizationId) })
export function acceptanceMembers(state, order, submitterId = '') {
  const object = order.acceptance
  if (!object?.targetId) return []
  const role = object.type === 'role' && state.directory.roles.find(row => row.id === object.targetId && row.active)
  return state.directory.accounts.filter(actor => inScope(actor, order) &&
    (object.type === 'person' ? actor.id === object.targetId : role && actor.roles.includes(role.id)) &&
    (order.categorySnapshot.allowSelf || actor.id !== submitterId))
}
export const currentRelation = (state, order, actor) => order.initiatorId === actor.id || order.handlerId === actor.id ||
  order.collaboratorIds.includes(actor.id) || acceptanceMembers(state, order).some(row => row.id === actor.id)
export function canRead(state, order, actor) {
  return inScope(actor, order) && (has(actor, 'readAll') || currentRelation(state, order, actor) ||
    (has(actor, 'handle') && Object.hasOwn(order.historyAccess, actor.id)))
}
export function allowedActions(state, order, actor) {
  if (!canRead(state, order, actor) || TERMINAL.includes(order.status)) return []
  const result = [], manage = has(actor, 'manage')
  if (manage || order.initiatorId === actor.id) {
    result.push('supplement', 'changeAcceptance')
    if (!order.firstDispatchedAt) result.push('edit')
  }
  if (order.status === '待派发' && has(actor, 'dispatch')) result.push('dispatch', 'dispatchByRule')
  if (order.status === '待接单' && order.handlerId === actor.id && has(actor, 'handle')) result.push('receive', 'return')
  if (['待接单', '处理中'].includes(order.status) && has(actor, 'transfer')) result.push('transfer')
  if (order.status === '处理中') {
    if (has(actor, 'handle') && (order.handlerId === actor.id || order.collaboratorIds.includes(actor.id))) result.push('feedback')
    if (order.handlerId === actor.id && has(actor, 'handle')) result.push('submit')
    if ((order.handlerId === actor.id && has(actor, 'handle')) || manage) result.push('collaborators')
  }
  const submission = order.submissions.find(row => row.id === order.submissionId)
  if (order.status === '待验收' && submission && !submission.reviewId &&
    acceptanceMembers(state, order, submission.actor.id).some(row => row.id === actor.id)) result.push('review')
  if (manage) { result.push('terminate'); if (order.firstDispatchedAt) result.push('deadline', 'priority') }
  return result
}
export const defaultAcceptance = (category, initiatorId) => ({
  type: category.acceptanceMode === 'role' ? 'role' : 'person',
  targetId: category.acceptanceMode === 'initiator' ? initiatorId : category.acceptanceTargetId
})
export function dispatchFailure(state, order, targetId) {
  if (!inScope(account(state, targetId), order) || !has(account(state, targetId), 'handle')) return '目标处理账号失效、无承接权限或不在本单范围'
  if (!PROFESSIONS.includes(order.profession)) return '缺少有效专业，请补齐后派发'
  if (!Object.values(order.durations).every(value => Number.isInteger(value) && value > 0)) return '本单时长配置无效'
  if (!acceptanceMembers(state, order, targetId).length) return '当前验收对象无有效候选，或自验约束与拟处理人冲突'
  return ''
}
export function matchRule(state, order) {
  return state.rules.filter(rule => rule.enabled && rule.projectId === order.projectId && rule.campusId === order.campusId &&
    [['categoryIds', order.categoryId], ['professions', order.profession], ['buildingIds', order.buildingId], ['sources', order.source], ['priorities', order.priority]]
      .every(([key, value]) => !rule[key].length || rule[key].includes(value))).sort((a, b) => a.sequence - b.sequence)[0]
}
export function applyBasics(state, order, input, refs, creating = false) {
  const category = state.categories.find(row => row.id === input.categoryId)
  requireValue(category && (category.enabled || (!creating && category.id === order.categoryId)), '请选择有效且启用的工单类别')
  const title = String(input.title || '').trim(), description = String(input.description || '').trim()
  requireValue(title && title.length <= 100, '工单标题必填，最多100字')
  requireValue(description && description.length <= 2000, '问题描述必填，最多2000字')
  requireValue(PRIORITIES.includes(input.priority), '请选择有效优先级')
  requireValue(!refs.notice, refs.notice)
  const space = refs.spaces.find(row => row.id === input.spaceId && row.status !== '暂不使用')
  requireValue(space && space.projectId === order.projectId, '请选择同项目内可用空间')
  let row = space
  const ancestors = [], seen = new Set()
  while (row && !seen.has(row.id)) { seen.add(row.id); ancestors.unshift(row.id); row = refs.spaces.find(item => item.id === row.parentId) }
  requireValue(ancestors.includes(order.campusId), '所选位置不属于本院区')
  const location = String(input.location || '').trim()
  requireValue(location.length <= 500 && (['机房', '房间', '公共区域'].includes(space.type) || location), '请补充可定位的位置说明，最多500字')
  // Running/standby/stopped describe operation, not whether an asset identity is valid.
  const asset = input.assetId ? refs.assets.find(item => item.id === input.assetId && item.projectId === order.projectId) : null
  requireValue(!input.assetId || asset, '关联设备身份不存在或不在本项目')
  requireValue(!input.profession || PROFESSIONS.includes(input.profession), '专业分类无效')
  const changed = creating || category.id !== order.categoryId
  if (changed) order.categorySnapshot = clone(category)
  Object.assign(order, {
    title, description, categoryId: category.id, categoryName: category.name, priority: input.priority, profession: input.profession || '',
    spaceId: space.id, spaceLabel: space.label, spaceAncestors: ancestors, location, assetId: asset?.id || '', assetName: asset?.name || '',
    buildingId: ancestors.find(id => refs.spaces.find(item => item.id === id)?.type === '楼栋') || '',
    durations: clone(order.categorySnapshot.limits[input.priority])
  })
  if ((changed || input.useDefault) && (input.useDefault || order.acceptanceOrigin !== 'manual')) {
    order.acceptance = defaultAcceptance(order.categorySnapshot, order.initiatorId); order.acceptanceOrigin = 'default'
  }
  if (input.acceptanceOrigin === 'manual' && !input.useDefault) {
    requireValue(['person', 'role'].includes(input.acceptance?.type) && input.acceptance.targetId, '请选择验收人员或角色')
    order.acceptance = { type: input.acceptance.type, targetId: input.acceptance.targetId }; order.acceptanceOrigin = 'manual'
  }
}
export function validateCategory(state, input) {
  const row = clone(input), old = state.categories.find(item => item.id === row.id)
  row.projectId = 'project-demo'; row.name = String(row.name || '').trim(); row.code = String(row.code || '').trim()
  requireValue(row.name && row.name.length <= 60 && row.code && row.code.length <= 40, '类别编码、名称必填，编码最多40字、名称最多60字')
  requireValue(!state.categories.some(item => item.id !== row.id && item.projectId === row.projectId && (item.code.toLowerCase() === row.code.toLowerCase() || item.name === row.name)), '项目内类别编码或名称重复')
  if (old && state.orders.some(order => order.categoryId === old.id)) requireValue(old.code === row.code, '类别已引用，编码不可修改')
  requireValue(Number.isInteger(row.sort) && row.sort >= 0 && PRIORITIES.includes(row.defaultPriority), '排序须为非负整数，默认优先级须有效')
  requireValue(['initiator', 'person', 'role'].includes(row.acceptanceMode), '默认验收方式无效')
  if (row.acceptanceMode === 'person') requireValue(inScope(account(state, row.acceptanceTargetId), { projectId: row.projectId, campusId: 'space-campus' }), '默认验收人员无效或超范围')
  if (row.acceptanceMode === 'role') requireValue(state.directory.roles.some(role => role.id === row.acceptanceTargetId && role.active), '默认验收角色无效')
  if (row.acceptanceMode === 'initiator') row.acceptanceTargetId = ''
  for (const priority of PRIORITIES) {
    const limits = row.limits?.[priority]
    for (const key of ['receiving', 'processing', 'acceptance']) {
      const error = durationError(limits, priority, key)
      requireValue(!error, error)
    }
  }
  row.allowSelf = Boolean(row.allowSelf); row.enabled = Boolean(row.enabled)
  return row
}
export function validateRule(state, input, refs) {
  const row = clone(input), actor = account(state, state.actorId)
  row.projectId = 'project-demo'; row.name = String(row.name || '').trim()
  requireValue(row.name && row.name.length <= 100 && actor.campusIds.includes(row.campusId), '规则名称必填，适用院区须在授权范围')
  requireValue(!state.rules.some(item => item.id !== row.id && item.campusId === row.campusId && item.name === row.name), '同院区规则名称重复')
  requireValue(Number.isInteger(row.sequence) && row.sequence > 0, '匹配顺序必须为正整数')
  for (const key of ['categoryIds', 'professions', 'buildingIds', 'sources', 'priorities']) requireValue(Array.isArray(row[key]), '规则条件格式无效')
  requireValue(row.categoryIds.every(id => state.categories.some(cat => cat.id === id && cat.projectId === row.projectId)), '规则引用类别无效')
  requireValue(row.professions.every(value => PROFESSIONS.includes(value)) && row.priorities.every(value => PRIORITIES.includes(value)), '专业或优先级条件无效')
  requireValue(row.sources.every(value => value === '人工填报'), '本轮来源仅支持人工填报或全部已有来源')
  requireValue(row.buildingIds.every(id => refs.spaces.some(space => space.id === id && space.type === '楼栋' && space.parentId === row.campusId)), '楼栋须属于适用院区')
  requireValue(row.targetId, '请选择目标处理人')
  if (row.enabled) {
    requireValue(!state.rules.some(item => item.id !== row.id && item.enabled && item.campusId === row.campusId && item.sequence === row.sequence), '同院区启用规则匹配顺序重复')
    requireValue(inScope(account(state, row.targetId), { projectId: row.projectId, campusId: row.campusId }) && has(account(state, row.targetId), 'handle'), '目标处理人失效或无承接权限')
  }
  row.enabled = Boolean(row.enabled)
  return row
}
