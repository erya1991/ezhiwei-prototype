import { reactive, readonly } from 'vue'
import { readCatalog } from './work-order/catalog.js'
import { createBaseState } from './work-order/seed.js'
import { has, inScope, account, orgName, identity, acceptanceMembers, currentRelation, canRead, allowedActions, defaultAcceptance, dispatchFailure, matchRule, applyBasics, validateCategory, validateRule } from './work-order/policy.js'
import { STORAGE_KEY, STATUSES, PRIORITIES, clone, requireValue, addMinutes, late, timeFacts, newRequestId } from './work-order/common.js'
export * from './work-order/common.js'
export const ACTION_LABELS = {
  edit: '编辑原问题', supplement: '补充问题', dispatch: '人工派发', dispatchByRule: '按规则派发',
  receive: '接单', return: '接单前退回', transfer: '转派', collaborators: '调整协办', feedback: '追加处理反馈',
  submit: '提交验收', review: '验收', changeAcceptance: '修改验收对象', deadline: '调整处理期限', priority: '调整优先级', terminate: '终止工单'
}
function inputFingerprint(value) {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return text.length + ':' + (hash >>> 0).toString(16)
}
export function createWorkOrderStore(initial = createBaseState(), { clock = () => new Date(), storage = null, catalog = () => readCatalog(), demo = false } = {}) {
  const state = reactive(clone(initial)), notice = reactive({ error: '' })
  let failNextSave = false
  const now = () => new Date(clock()).toISOString(), currentActor = () => account(state, state.actorId)
  const nextId = (draft, prefix) => prefix + '-' + (++draft.serial)
  const context = order => ({ actorId: state.actorId, requestId: newRequestId(), expectedRevision: order?.revision, assignmentId: order?.assignmentId, submissionId: order?.submissionId })
  function publish(draft, businessAction = false) {
    if (businessAction && failNextSave) { failNextSave = false; throw new Error('模拟保存失败：输入已保留，请重试') }
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(draft)) }
    catch { throw new Error('浏览器存储不可用或容量不足，未保存本次操作；请保留输入并减少新图片后重试') }
    Object.assign(state, draft); notice.error = ''
  }
  function sync() {
    if (!storage) return
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    requireValue(validState(parsed), '工单本地数据版本不兼容，原数据未覆盖')
    if (parsed.revision > state.revision) Object.assign(state, parsed)
  }
  function switchActor(id) {
    try {
      sync(); requireValue(account(state, id)?.active, '演示账号已停用')
      const draft = clone(state); draft.actorId = id; draft.revision++; publish(draft)
      return { ok: true }
    } catch (error) { notice.error = error.message; return { ok: false, error: error.message } }
  }
  const getName = id => account(state, id)?.name || id || '—'
  const acceptanceLabel = object => !object?.targetId ? '未配置' : object.type === 'role' ?
    state.directory.roles.find(row => row.id === object.targetId)?.name || object.targetId : getName(object.targetId)
  function listOrders({ tab = 'ledger', filters = {} } = {}) {
    const actor = currentActor()
    if (!actor?.active) return []
    return state.orders.filter(order => canRead(state, order, actor))
      .filter(order => tab === 'ledger' || (tab === 'created' ? order.initiatorId === actor.id : tab === 'participated' ?
        order.participantIds.includes(actor.id) || currentRelation(state, order, actor) :
        allowedActions(state, order, actor).some(action => ['dispatch', 'receive', 'submit', 'review'].includes(action))))
      .filter(order => {
        const facts = timeFacts(order, now())
        return (!filters.text || [order.code, order.title, order.description].join(' ').includes(filters.text.trim())) &&
          ['categoryId', 'source', 'status', 'priority', 'handlerId', 'handlerOrganizationId'].every(key => !filters[key] || order[key] === filters[key]) &&
          (!filters.spaceId || order.spaceAncestors.includes(filters.spaceId)) &&
          (!filters.createdRange?.[0] || Date.parse(order.createdAt) >= Date.parse(filters.createdRange[0])) &&
          (!filters.createdRange?.[1] || Date.parse(order.createdAt) <= Date.parse(filters.createdRange[1])) &&
          (!filters.time || facts[filters.time])
      }).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.code.localeCompare(a.code)).map(order => getOrder(order.id))
  }
  function getOrder(id) {
    const order = state.orders.find(row => row.id === id), actor = currentActor()
    if (!order || !canRead(state, order, actor)) return null
    if (has(actor, 'readAll') || currentRelation(state, order, actor)) return order
    const copy = clone(order), ceiling = order.historyAccess[actor.id]
    const until = typeof ceiling === 'string' ? ceiling : ceiling.at
    // Serial ceilings also distinguish actions performed at the same clock instant.
    const readable = row => ceiling.serial == null ? row.at <= until : Number(row.id.split('-').at(-1)) <= ceiling.serial
    for (const key of ['attachments', 'assignments', 'supplements', 'feedbacks', 'submissions', 'reviews', 'deadlineChanges', 'logs']) copy[key] = copy[key].filter(readable)
    copy.lastRuleAttempt = null
    copy.historyScopeAt = until
    return copy
  }
  function log(draft, order, action, actor, at, before, recordId = '', detail = '') {
    const acceptanceSnapshot = object => object ? { ...clone(object), name: object.type === 'role' ? draft.directory.roles.find(row => row.id === object.targetId)?.name || object.targetId : account(draft, object.targetId)?.name || object.targetId } : null
    if (before?.acceptance) before.acceptance = acceptanceSnapshot(before.acceptance)
    order.logs.push({ id: nextId(draft, 'log'), action, actor: identity(draft, actor), at, before,
      after: { status: order.status, handlerId: order.handlerId, acceptance: acceptanceSnapshot(order.acceptance), deadline: order.processingDeadline }, recordId, detail })
    if (!order.participantIds.includes(actor.id)) order.participantIds.push(actor.id)
  }
  function attach(draft, order, photos = [], actor, at, recordId) {
    requireValue(Array.isArray(photos) && photos.length <= 3, '每次最多选择3张图片')
    const ids = []
    for (const photo of photos) {
      if (photo.attachmentId) {
        requireValue(order.attachments.some(row => row.id === photo.attachmentId), '引用图片不存在')
        requireValue(has(actor, 'readAll') || currentRelation(draft, order, actor), '当前账号无权引用此图片')
        ids.push(photo.attachmentId); continue
      }
      requireValue(typeof photo.dataUrl === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.dataUrl), '图片格式无效，仅支持PNG、JPEG、WebP')
      const encoded = photo.dataUrl.split(',')[1], padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0
      requireValue(encoded.length % 4 === 0 && encoded.length * 3 / 4 - padding <= 1024 * 1024, '每张图片不能超过1MB，且编码须完整')
      const id = nextId(draft, 'photo')
      order.attachments.push({ id, name: String(photo.name || '现场图片').slice(0, 100), dataUrl: photo.dataUrl, actor: identity(draft, actor), at, recordId }); ids.push(id)
    }
    return [...new Set(ids)]
  }
  function dispatch(draft, order, targetId, actor, at, mode, reason = '', rule = null) {
    const failure = dispatchFailure(draft, order, targetId); requireValue(!failure, failure)
    const previous = order.assignments.find(row => row.id === order.assignmentId)
    if (previous && !previous.endedAt) { previous.endedAt = at; previous.outcome = '转派（未接单）'; previous.late = late(at, previous.deadline) }
    if (order.handlerId) order.historyAccess[order.handlerId] = { at, serial: draft.serial }
    const target = account(draft, targetId), id = nextId(draft, 'assignment')
    order.assignments.push({ id, target: identity(draft, target), actor: identity(draft, actor), at, deadline: addMinutes(at, order.durations.receiving),
      receivedAt: '', endedAt: '', outcome: '', late: null, mode, reason, rule: rule ? clone(rule) : null })
    order.assignmentId = id; order.handlerId = targetId; order.handlerOrganizationId = target.organizationId
    order.collaboratorIds = order.collaboratorIds.filter(item => item !== targetId)
    if (!order.firstDispatchedAt) { order.firstDispatchedAt = at; order.originalDeadline = addMinutes(at, order.durations.processing); order.processingDeadline = order.originalDeadline }
    order.status = '待接单'; order.dispatchError = ''
    if (!order.participantIds.includes(targetId)) order.participantIds.push(targetId)
    return id
  }
  function tryRule(draft, order, actor, at) {
    const rule = matchRule(draft, order), failure = rule ? dispatchFailure(draft, order, rule.targetId) : '没有符合条件的启用规则，请人工派发'
    order.lastRuleAttempt = { at, actor: identity(draft, actor), rule: rule ? clone(rule) : null, error: failure }
    if (failure) { order.dispatchError = failure; return { dispatched: false, reason: failure } }
    const id = dispatch(draft, order, rule.targetId, actor, at, '规则派发', '', rule)
    log(draft, order, '规则派发', actor, at, { status: '待派发' }, id, rule.name + ' V' + rule.version)
    return { dispatched: true }
  }
  function execute(action, input = {}, ctx = context()) {
    try {
      sync()
      requireValue(ctx.actorId === state.actorId, '演示身份已切换，请以当前账号重新打开操作')
      const actor = account(state, ctx.actorId)
      requireValue(actor?.active && ctx.requestId, '当前账号无效或缺少请求身份')
      const receipt = state.receipts[ctx.requestId]
      if (receipt) {
        requireValue(receipt.action === action && receipt.actorId === actor.id &&
          (receipt.inputFingerprint ? receipt.inputFingerprint === inputFingerprint(input) : receipt.input === JSON.stringify(input)), '请求身份已使用，请重新打开操作')
        return { ...clone(receipt.result), duplicate: true }
      }
      const draft = clone(state), at = now()
      let result = { ok: true }, order, recordId = '', detail = ''
      if (action === 'saveCategory' || action === 'saveRule') {
        requireValue(has(actor, 'rules'), '没有规则管理权限')
        const isCategory = action === 'saveCategory', list = isCategory ? draft.categories : draft.rules
        const row = isCategory ? validateCategory(draft, input) : validateRule(draft, input, catalog()), old = list.find(item => item.id === row.id)
        requireValue(!old || ctx.configVersion === old.version, '配置已被修改，请重新打开；当前输入已保留')
        const meaningful = value => { const copy = clone(value); ['version', 'modifiedAt', 'modifiedBy'].forEach(key => delete copy[key]); return JSON.stringify(copy) }
        if (!old || meaningful(old) !== meaningful(row)) {
          row.id ||= nextId(draft, isCategory ? 'category' : 'rule'); row.version = (old?.version || 0) + 1; row.modifiedAt = at; row.modifiedBy = actor.id
          if (old) list.splice(list.indexOf(old), 1, row); else list.push(row)
          draft[isCategory ? 'categoryHistory' : 'ruleHistory'].push(clone(row))
          draft.configLogs.push({ id: nextId(draft, 'config-log'), at, actor: identity(draft, actor), action, objectId: row.id, before: old ? clone(old) : null, after: clone(row) })
        }
        result.id = row.id
      } else if (action === 'demoDirectory') {
        requireValue(demo && (has(actor, 'manage') || has(actor, 'rules')), '仅开发模式管理演示账号可调整资料样例')
        if (input.roleId) {
          const target = account(draft, input.accountId); requireValue(target && draft.directory.roles.some(role => role.id === input.roleId), '演示账号或角色无效')
          target.roles = target.roles.includes(input.roleId) ? target.roles.filter(id => id !== input.roleId) : [...target.roles, input.roleId]
        } else if (input.roleStatus) {
          const role = draft.directory.roles.find(row => row.id === input.roleStatus); requireValue(role, '角色不存在'); role.active = !role.active
        } else {
          const target = account(draft, input.accountId); requireValue(target && target.id !== actor.id, '不能停用当前演示账号'); target.active = !target.active
        }
        draft.configLogs.push({ id: nextId(draft, 'demo-log'), at, actor: identity(draft, actor), action: '演示身份资料变化', after: clone(input) })
      } else if (action === 'create') {
        requireValue(has(actor, 'create'), '没有人工填报权限')
        order = { id: nextId(draft, 'wo'), code: 'WO-' + draft.serial, revision: 1, projectId: 'project-demo', campusId: 'space-campus',
          initiatorId: actor.id, initiator: identity(draft, actor), createdAt: at, status: '待派发', source: '人工填报', sourceId: '',
          acceptanceOrigin: 'default', acceptance: { type: 'person', targetId: actor.id }, firstDispatchedAt: '', originalDeadline: '', processingDeadline: '',
          assignmentId: '', submissionId: '', handlerId: '', handlerOrganizationId: '', collaboratorIds: [], participantIds: [actor.id], historyAccess: {},
          assignments: [], supplements: [], feedbacks: [], submissions: [], reviews: [], deadlineChanges: [], logs: [], attachments: [], originalPhotoIds: [],
          dispatchError: '', endedAt: '', endReason: '' }
        requireValue(inScope(actor, order), '当前账号无本院区填报权限')
        applyBasics(draft, order, input, catalog(), true)
        order.originalPhotoIds = attach(draft, order, input.photos, actor, at, order.id)
        log(draft, order, '人工创建', actor, at, {}, order.id); draft.orders.push(order)
        result = { ok: true, id: order.id, created: true, ...tryRule(draft, order, actor, at) }
      } else {
        order = draft.orders.find(row => row.id === input.orderId)
        requireValue(order && canRead(draft, order, actor), '工单不存在或当前账号无权访问，请刷新并核对当前权限')
        requireValue(ctx.expectedRevision === order.revision && ctx.assignmentId === order.assignmentId && ctx.submissionId === order.submissionId, '工单责任、状态或提交已变化，请刷新后重新操作；当前输入已保留')
        requireValue(allowedActions(draft, order, actor).includes(action), '当前状态、责任对象或权限不允许此操作')
        const before = { status: order.status, handlerId: order.handlerId, acceptance: clone(order.acceptance), deadline: order.processingDeadline }
        const text = String(input.text || '').trim()
        requireValue(text.length <= 2000, '说明最多2000字')
        const assignment = order.assignments.find(row => row.id === order.assignmentId), submission = order.submissions.find(row => row.id === order.submissionId)
        if (action === 'edit') {
          const previousCategory = order.categoryName, previousPriority = order.priority
          applyBasics(draft, order, input, catalog())
          detail = '类别：' + previousCategory + ' → ' + order.categoryName + '；优先级：' + previousPriority + ' → ' + order.priority
          const kept = input.keptPhotoIds || []
          requireValue(kept.every(id => order.originalPhotoIds.includes(id)), '原始图片引用无效')
          order.originalPhotoIds = [...kept, ...attach(draft, order, input.photos, actor, at, order.id)]
          requireValue(order.originalPhotoIds.length <= 3, '原始问题最多3张图片')
        } else if (action === 'supplement' || action === 'feedback') {
          requireValue(text || input.photos?.length, '请填写说明或选择图片')
          recordId = nextId(draft, action)
          const photoIds = attach(draft, order, input.photos, actor, at, recordId)
          order[action === 'supplement' ? 'supplements' : 'feedbacks'].push({ id: recordId, at, actor: identity(draft, actor), text, photoIds, collaborator: order.collaboratorIds.includes(actor.id) })
        } else if (action === 'dispatch' || action === 'transfer') {
          if (action === 'transfer') { requireValue(text, '转派原因及交接说明必填'); requireValue(input.targetId !== order.handlerId, '转派目标不能仍为原处理人') }
          recordId = dispatch(draft, order, input.targetId, actor, at, action === 'transfer' ? '转派' : '人工派发', text)
        } else if (action === 'dispatchByRule') {
          const attempt = tryRule(draft, order, actor, at); result = { ok: true, ...attempt }; detail = attempt.reason || '按规则派发成功'
        } else if (action === 'receive' || action === 'return') {
          requireValue(assignment && !assignment.endedAt, '当前派发已结束')
          assignment.endedAt = at; assignment.late = late(at, assignment.deadline); recordId = assignment.id
          if (action === 'receive') { assignment.receivedAt = at; assignment.outcome = '已接单'; order.status = '处理中' }
          else {
            requireValue(text, '接单前退回原因必填'); assignment.outcome = '接单前退回'; assignment.reason = text
            order.historyAccess[order.handlerId] = { at, serial: draft.serial }; order.handlerId = ''; order.handlerOrganizationId = ''; order.assignmentId = ''
            order.status = '待派发'; order.dispatchError = '接单前退回，请调度人员明确重新派发'
          }
        } else if (action === 'collaborators') {
          const ids = [...new Set(input.accountIds || [])]
          requireValue(ids.length === (input.accountIds || []).length, '协办人员不能重复')
          requireValue(ids.every(id => id !== order.handlerId && inScope(account(draft, id), order) && has(account(draft, id), 'handle')), '协办账号无效、超范围或与主处理人重复')
          order.collaboratorIds.filter(id => !ids.includes(id)).forEach(id => { order.historyAccess[id] = { at, serial: draft.serial } })
          order.collaboratorIds = ids; ids.forEach(id => { if (!order.participantIds.includes(id)) order.participantIds.push(id) })
          detail = '当前协办：' + ids.map(id => account(draft, id).name).join('、')
        } else if (action === 'submit') {
          requireValue(text && input.completed === true, '请填写处理结果并确认本次处理目标已完成')
          requireValue(acceptanceMembers(draft, order, actor.id).length, '当前验收对象无符合条件成员，请发起人或管理人员调整')
          recordId = nextId(draft, 'submission')
          const photoIds = attach(draft, order, input.photos, actor, at, recordId)
          order.submissions.push({ id: recordId, at, actor: identity(draft, actor), text, photoIds, processingDeadline: order.processingDeadline,
            late: late(at, order.processingDeadline), acceptanceDeadline: addMinutes(at, order.durations.acceptance), acceptanceAtSubmit: clone(order.acceptance), reviewId: '', endedAt: '', outcome: '' })
          order.submissionId = recordId; order.status = '待验收'
        } else if (action === 'review') {
          requireValue(submission && !submission.reviewId, '本次验收已结束或处理提交已变化')
          requireValue(['通过', '不通过'].includes(input.conclusion), '请选择验收结论')
          requireValue(input.conclusion === '通过' || text, '验收不通过必须填写说明及继续处理要求')
          recordId = nextId(draft, 'review')
          const photoIds = attach(draft, order, input.photos, actor, at, recordId)
          order.reviews.push({ id: recordId, at, actor: identity(draft, actor), submissionId: submission.id, acceptance: { ...clone(order.acceptance), name: acceptanceLabel(order.acceptance) },
            conclusion: input.conclusion, text, photoIds, deadline: submission.acceptanceDeadline, late: late(at, submission.acceptanceDeadline) })
          submission.reviewId = recordId; submission.endedAt = at; submission.outcome = input.conclusion
          order.status = input.conclusion === '通过' ? '已关闭' : '处理中'
          if (input.conclusion === '通过') { order.endedAt = at; order.endReason = '验收通过'; order.finalSubmissionId = submission.id }
        } else if (action === 'changeAcceptance') {
          requireValue(!order.firstDispatchedAt || text, '首次派发后修改验收对象必须填写原因')
          requireValue(['person', 'role'].includes(input.acceptance?.type) && input.acceptance?.targetId, '请选择验收人员或角色')
          const object = { type: input.acceptance.type, targetId: input.acceptance.targetId }
          requireValue(JSON.stringify(object) !== JSON.stringify(order.acceptance), '新验收对象与当前对象相同')
          order.acceptance = object
          requireValue(acceptanceMembers(draft, order, order.status === '待验收' ? submission?.actor.id : order.handlerId).length, '新验收对象无符合范围和自验条件的有效候选')
          order.acceptanceOrigin = 'manual'; detail = text
        } else if (action === 'deadline') {
          requireValue(text, '期限调整原因必填')
          requireValue(input.deadline && Number.isFinite(Date.parse(input.deadline)), '请选择合法的新处理截止')
          const deadline = new Date(input.deadline).toISOString()
          requireValue(deadline !== order.processingDeadline && Date.parse(deadline) >= Date.parse(order.firstDispatchedAt), '新截止须与原值不同且不早于首次派发')
          recordId = nextId(draft, 'deadline')
          order.deadlineChanges.push({ id: recordId, at, actor: identity(draft, actor), before: order.processingDeadline, after: deadline, wasLate: late(at, order.processingDeadline), reason: text })
          order.processingDeadline = deadline
        } else if (action === 'priority') {
          requireValue(PRIORITIES.includes(input.priority) && input.priority !== order.priority && text, '请选择不同的优先级并填写原因')
          detail = order.priority + ' → ' + input.priority + '；' + text; order.priority = input.priority
        } else if (action === 'terminate') {
          requireValue(text, '终止原因必填')
          if (assignment && !assignment.endedAt) { assignment.endedAt = at; assignment.outcome = '终止（未接单）'; assignment.late = late(at, assignment.deadline) }
          if (submission && !submission.endedAt && order.status === '待验收') { submission.endedAt = at; submission.outcome = '终止（未验收）'; submission.acceptanceLate = late(at, submission.acceptanceDeadline) }
          order.status = '已终止'; order.endedAt = at; order.endReason = text
        }
        order.revision++; log(draft, order, ACTION_LABELS[action], actor, at, before, recordId, detail || text); result.id = order.id
      }
      draft.revision++; draft.receipts[ctx.requestId] = { action, actorId: actor.id, inputFingerprint: inputFingerprint(input), result: clone(result) }
      publish(draft, true); return result
    } catch (error) { notice.error = error.message; return { ok: false, error: error.message } }
  }
  function reset() {
    try {
      requireValue(demo && has(currentActor(), 'manage'), '仅开发模式管理演示账号可恢复样例')
      const draft = createDemoState(now()); draft.revision = state.revision + 1; publish(draft, true); return { ok: true }
    } catch (error) { return { ok: false, error: error.message } }
  }
  return {
    state: readonly(state), notice: readonly(notice), now, currentActor, currentCatalog: catalog, context, execute, sync, switchActor, getOrder, listOrders,
    actions: order => order ? allowedActions(state, order, currentActor()) : [], getName, orgName: id => orgName(state, id), acceptanceLabel, defaultAcceptance,
    handlers: order => state.directory.accounts.filter(actor => inScope(actor, order) && has(actor, 'handle')),
    acceptanceMembers: (order, excluded = '') => acceptanceMembers(state, order, excluded),
    rulePreview: order => { const rule = matchRule(state, order); return { rule, error: rule ? dispatchFailure(state, order, rule.targetId) : '没有符合条件的启用规则，请人工派发' } },
    canConfigure: () => has(currentActor(), 'rules'), canCreate: () => has(currentActor(), 'create') && inScope(currentActor(), { projectId: 'project-demo', campusId: 'space-campus' }),
    reset, simulateFailure: () => { requireValue(demo, '仅开发模式可模拟失败'); failNextSave = true }
  }
}

export function createDemoState(anchor = new Date().toISOString()) {
  // Every seeded transition uses the same action validation as a user action.
  let tick = new Date(Date.parse(anchor) - 8 * 3600000)
  const base = createBaseState(addMinutes(anchor, -1440))
  base.anchor = anchor
  const store = createWorkOrderStore(base, { clock: () => tick, demo: true })
  function as(actorId, action, input = {}, orderId) {
    store.switchActor(actorId)
    const result = store.execute(action, orderId ? { ...input, orderId } : input, store.context(orderId ? store.getOrder(orderId) : null))
    requireValue(result.ok, result.error)
    tick = new Date(tick.getTime() + 60000)
    return result.id
  }
  function create(title, categoryId = 'wo-cat-repair', extra = {}, actorId = 'wo-reporter') {
    return as(actorId, 'create', { title, categoryId, priority: '普通', description: '前端演示样例：请核对现场情况，时限不代表医院服务承诺。',
      spaceId: 'space-boiler', location: '锅炉房入口东侧', assetId: 'asset-boiler-1', profession: '暖通', photos: [], ...extra })
  }
  create('1号锅炉现场设备维修 · 待接单')
  const leaking = create('保障楼渗漏 · 跨组织协作', 'wo-cat-building', { assetId: '', spaceId: 'space-f1', location: '1层东侧走廊吊顶接缝', profession: '建筑设施' })
  as('person-02', 'receive', {}, leaking)
  as('person-02', 'collaborators', { accountIds: ['wo-builder'] }, leaking)
  as('wo-builder', 'feedback', { text: '已查看接缝，需主处理人汇总结果。', photos: [] }, leaking)
  const role = create('角色池验收 · 处理按时但验收超时', 'wo-cat-building', { assetId: '', spaceId: 'space-f1', location: '1层走廊渗漏点', profession: '建筑设施' })
  as('person-02', 'receive', {}, role)
  as('person-02', 'submit', { text: '密封修复完成，提交复核。', completed: true, photos: [] }, role)
  create('首条规则人员失效 · 待人工兜底', 'wo-cat-person')
  const closed = create('已关闭 · 保留全部处理验收历史')
  as('person-01', 'receive', {}, closed)
  as('person-01', 'submit', { text: '完成紧固和现场检查。', completed: true, photos: [] }, closed)
  as('wo-reporter', 'review', { conclusion: '通过', text: '现场复核通过。', photos: [] }, closed)
  const terminated = create('重复报修 · 已终止', 'wo-cat-person')
  as('wo-manager', 'terminate', { text: '模拟重复报修，保留原单历史。' }, terminated)
  const returned = create('接单前已退回 · 原问题保持锁定')
  as('person-01', 'return', { text: '专业交接待调度确认。' }, returned)
  const overdue = create('逾期提交 · 延期不能回写历史')
  as('person-01', 'receive', {}, overdue)
  tick = new Date(Date.parse(anchor) - 30 * 60000)
  as('person-01', 'submit', { text: '逾期完成的演示结果，请复核。', completed: true, photos: [] }, overdue)
  as('wo-manager', 'deadline', { text: '演示事后延期，原提交结论保留。', deadline: addMinutes(anchor, 120) }, overdue)
  create('允许自验 · 巡检员甲发起并处理', 'wo-cat-self', {}, 'person-01')
  create('自验关闭 · 同一账号导致派发阻断', 'wo-cat-repair', {}, 'person-01')
  create('角色暂无成员 · 待派发异常可见', 'wo-cat-building', {
    assetId: '', profession: '建筑设施', acceptanceOrigin: 'manual', acceptance: { type: 'role', targetId: 'wo-empty-role' }
  })
  const hazard = create('隐患转入占位 · 仅演示既有工单处理', 'wo-cat-building', { assetId: '', profession: '建筑设施' })
  const draft = clone(store.state), hazardOrder = draft.orders.find(row => row.id === hazard)
  hazardOrder.source = '隐患转入（占位）'; hazardOrder.sourceId = 'HZ-DEMO-001'
  hazardOrder.status = '待派发'; hazardOrder.assignments = []; hazardOrder.assignmentId = ''
  hazardOrder.handlerId = ''; hazardOrder.handlerOrganizationId = ''; hazardOrder.firstDispatchedAt = ''
  hazardOrder.originalDeadline = ''; hazardOrder.processingDeadline = ''; hazardOrder.lastRuleAttempt = null
  hazardOrder.dispatchError = '既有来源占位样例，等待授权人员人工派发'
  hazardOrder.logs = hazardOrder.logs.slice(0, 1)
  hazardOrder.logs[0].action = '既有来源占位样例初始化'
  hazardOrder.participantIds = [hazardOrder.initiatorId]
  draft.actorId = 'wo-manager'; draft.receipts = {}; draft.ruleHistory = clone(draft.rules)
  draft.orders.forEach(order => { order.seeded = true })
  return draft
}

let browserStorage = null, restored = null, restoreError = ''
try {
  if (typeof window !== 'undefined') {
    browserStorage = window.localStorage
    const raw = browserStorage.getItem(STORAGE_KEY)
    if (raw) { const parsed = JSON.parse(raw); requireValue(validState(parsed), '工单本地数据版本不兼容'); restored = parsed }
  }
} catch { restoreError = '工单本地数据无法读取，原存储未覆盖，请先核对浏览器资料。' }
const brokenStorage = { getItem: () => { throw new Error(restoreError) }, setItem: () => { throw new Error(restoreError) } }
export const workOrderStore = createWorkOrderStore(restored || createDemoState(), {
  storage: restoreError ? brokenStorage : browserStorage, catalog: () => readCatalog(browserStorage), demo: Boolean(import.meta.env?.DEV)
})
if (!restored && !restoreError && browserStorage) {
  try { browserStorage.setItem(STORAGE_KEY, JSON.stringify(workOrderStore.state)) }
  catch { restoreError = '浏览器无法保存初始样例，后续操作会提示存储失败。' }
}
export const initialStorageNotice = restoreError
export function validState(value) {
  return value?.schema === 1 && Number.isInteger(value.revision) && Number.isInteger(value.serial) &&
    ['orders', 'categories', 'categoryHistory', 'rules', 'ruleHistory', 'configLogs'].every(key => Array.isArray(value[key])) &&
    Array.isArray(value.directory?.accounts) && Array.isArray(value.directory?.roles) && value.receipts && value.actorId &&
    value.orders.every(order => order.id && STATUSES.includes(order.status) && ['assignments', 'feedbacks', 'submissions', 'reviews', 'attachments', 'logs', 'supplements', 'participantIds', 'collaboratorIds', 'deadlineChanges'].every(key => Array.isArray(order[key])) && order.historyAccess && order.categorySnapshot && order.acceptance)
}
