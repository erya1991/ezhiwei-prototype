import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkOrderStore, createDemoState, STORAGE_KEY, clone, addMinutes, timeFacts } from '../../../data/workOrder.js'
import { createBaseState } from '../../../data/work-order/seed.js'
import { readCatalog, EQUIPMENT_STORAGE_KEY } from '../../../data/work-order/catalog.js'
import { createEquipmentSeed } from '../../../data/equipmentInspectionSeed.js'

const at = '2026-11-02T02:00:00.000Z'
const image = { name: '示意图片.png', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDosAAAAASUVORK5CYII=' }
const input = (extra = {}) => ({
  title: '锅炉房设备维修', description: '现场紧固件松动，请安排维修。', categoryId: 'wo-cat-repair', priority: '普通',
  profession: '暖通', spaceId: 'space-boiler', location: '东侧入口', assetId: 'asset-boiler-1', photos: [], ...extra
})
function fresh(options = {}) {
  let time = at
  const s = createWorkOrderStore(options.seed || createBaseState(at), { demo: true, ...options, clock: () => new Date(time) })
  const act = (actor, action, payload = {}, id) => {
    assert.equal(s.switchActor(actor).ok, true)
    return s.execute(action, id ? { ...payload, orderId: id } : payload, s.context(id ? s.getOrder(id) : null))
  }
  const ok = (...args) => { const result = act(...args); assert.equal(result.ok, true, result.error); return result }
  const create = extra => ok('wo-reporter', 'create', input(extra)).id
  const order = id => s.state.orders.find(row => row.id === id)
  return { s, act, ok, create, order, time: value => { time = value } }
}
test('AC01/06/07: default initiator, person and shared role; equipment and source are stable', () => {
  const f = fresh(), a = f.create(), b = f.create({ categoryId: 'wo-cat-building', assetId: '' }), c = f.create({ categoryId: 'wo-cat-person' })
  assert.deepEqual(clone(f.order(a).acceptance), { type: 'person', targetId: 'wo-reporter' })
  assert.equal(f.order(b).acceptance.targetId, 'wo-accept-role')
  assert.ok(f.s.acceptanceMembers(f.order(b)).length >= 2)
  assert.equal(f.order(c).acceptance.targetId, 'wo-accept-1')
  assert.equal(f.order(a).assetId, 'asset-boiler-1')
  const manual = f.create({ source: '报警', sourceId: 'X' })
  assert.equal(f.order(manual).source, '人工填报'); assert.equal(f.order(manual).sourceId, '')
  assert.equal(f.act('wo-reporter', 'create', input({ assetId: '', spaceId: 'space-f1', location: '' })).ok, false)
  assert.equal(f.act('wo-reporter', 'create', input({ assetId: '', spaceId: 'space-f1', location: '东侧漏水点' })).ok, true)
})
test('AC02/05: category values, duplicate names and adopted versions', () => {
  const f = fresh(), id = f.create()
  f.s.switchActor('wo-rule-admin')
  const category = clone(f.s.state.categories[0])
  for (const value of [0, -1, 1.5]) {
    const bad = clone(category); bad.limits.普通.receiving = value
    assert.equal(f.s.execute('saveCategory', bad, { ...f.s.context(), configVersion: 1 }).ok, false)
  }
  const bad = clone(category); bad.limits.普通.processing = 1
  assert.equal(f.s.execute('saveCategory', bad, { ...f.s.context(), configVersion: 1 }).ok, false)
  category.enabled = false; category.limits.普通.processing = 500
  assert.equal(f.s.execute('saveCategory', category, { ...f.s.context(), configVersion: 1 }).ok, true)
  assert.equal(f.order(id).durations.processing, 240); assert.equal(f.order(id).categorySnapshot.version, 1)
  assert.equal(f.act('wo-reporter', 'create', input()).ok, false)
  assert.equal(f.ok('person-01', 'receive', {}, id).ok, true)
})
test('AC03/04: AND/OR matching, first invalid target never silently uses backup', () => {
  const f = fresh(), id = f.create({ categoryId: 'wo-cat-person' })
  assert.equal(f.order(id).status, '待派发'); assert.match(f.order(id).dispatchError, /失效/)
  assert.equal(f.order(id).lastRuleAttempt.rule.id, 'wo-rule-person')
  f.ok('wo-manager', 'dispatch', { targetId: 'wo-service' }, id)
  assert.equal(f.order(id).handlerId, 'wo-service'); assert.equal(f.order(id).assignments[0].mode, '人工派发')
  const seed = createBaseState(at); seed.rules[0].professions = ['消防', '供配电']
  const g = fresh({ seed }), unmatched = g.create()
  assert.equal(g.order(unmatched).status, '待派发')
  const matched = g.create({ profession: '供配电' })
  assert.equal(g.order(matched).status, '待接单')
})
test('AC03: duplicate enabled rule sequence is rejected with no partial configuration', () => {
  const f = fresh(); f.s.switchActor('wo-rule-admin')
  const rule = clone(f.s.state.rules[1]), before = JSON.stringify(f.s.state)
  rule.sequence = 10
  const result = f.s.execute('saveRule', rule, { ...f.s.context(), configVersion: 1 })
  assert.equal(result.ok, false); assert.match(result.error, /顺序重复/); assert.equal(JSON.stringify(f.s.state), before)
})
test('AC05: stopping a rule affects only subsequent matching and does not retry waiting orders', () => {
  const f = fresh(), id = f.create(); f.s.switchActor('wo-rule-admin')
  const rule = clone(f.s.state.rules[0]); rule.enabled = false
  assert.equal(f.s.execute('saveRule', rule, { ...f.s.context(), configVersion: 1 }).ok, true)
  assert.equal(f.order(id).handlerId, 'person-01')
  const waiting = f.create(); assert.equal(f.order(waiting).status, '待派发')
  rule.enabled = true
  f.s.switchActor('wo-rule-admin')
  assert.equal(f.s.execute('saveRule', rule, { ...f.s.context(), configVersion: 2 }).ok, true)
  assert.equal(f.order(waiting).status, '待派发')
})
test('AC08: only never-dispatched original issues can edit; supplementation is append-only', () => {
  const f = fresh(), id = f.create({ categoryId: 'wo-cat-person' })
  f.ok('wo-reporter', 'edit', { ...input({ categoryId: 'wo-cat-person', title: '首派前修改' }), keptPhotoIds: [] }, id)
  f.ok('wo-manager', 'dispatch', { targetId: 'person-01' }, id)
  f.ok('person-01', 'return', { text: '需重新协调' }, id)
  assert.equal(f.act('wo-reporter', 'edit', input({ title: '不应修改' }), id).ok, false)
  const deadline = f.order(id).processingDeadline
  f.ok('wo-reporter', 'supplement', { text: '追加位置事实', photos: [] }, id)
  assert.equal(f.order(id).title, '首派前修改'); assert.equal(f.order(id).supplements[0].text, '追加位置事实')
  assert.equal(f.order(id).processingDeadline, deadline)
  f.ok('wo-manager', 'dispatchByRule', {}, id)
  assert.equal(f.order(id).status, '待派发')
})
test('AC09: create idempotence and storage failure preserve state, logs, and request retry', () => {
  const map = new Map(), storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) }
  const f = fresh({ storage }); f.s.switchActor('wo-reporter')
  const ctx = f.s.context(), payload = input(), a = f.s.execute('create', payload, ctx), b = f.s.execute('create', payload, ctx)
  assert.equal(a.id, b.id); assert.equal(b.duplicate, true); assert.equal(f.s.state.orders.length, 1)
  const before = JSON.stringify(f.s.state), retry = f.s.context()
  f.s.simulateFailure()
  assert.equal(f.s.execute('create', payload, retry).ok, false); assert.equal(JSON.stringify(f.s.state), before)
  assert.equal(f.s.execute('create', payload, retry).ok, true); assert.equal(f.s.state.orders.length, 2)
})
test('AC10/11/12: responsibility checks, collaborator feedback and cross-organization transfer', () => {
  const f = fresh(), id = f.create()
  assert.equal(f.act('person-02', 'receive', {}, id).ok, false)
  assert.equal(f.act('person-02', 'return', { text: '非本人不得退回' }, id).ok, false)
  f.ok('person-01', 'receive', {}, id)
  f.ok('person-01', 'collaborators', { accountIds: ['wo-builder'] }, id)
  f.ok('wo-builder', 'feedback', { text: '施工协办意见', photos: [image] }, id)
  assert.equal(f.order(id).feedbacks[0].actor.id, 'wo-builder')
  assert.equal(f.act('wo-builder', 'submit', { text: '不能代办', completed: true }, id).ok, false)
  f.ok('wo-manager', 'transfer', { targetId: 'wo-builder', text: '转交施工组，已完成现场隔离，待修补。' }, id)
  assert.equal(f.order(id).status, '待接单'); assert.deepEqual(clone(f.order(id).collaboratorIds), [])
  assert.equal(f.order(id).handlerOrganizationId, 'wo-org-construction')
  assert.equal(f.order(id).feedbacks.length, 1); assert.ok(!f.order(id).collaboratorIds.includes('person-01'))
  f.ok('wo-builder', 'receive', {}, id)
  f.ok('wo-manager', 'transfer', { targetId: 'person-02', text: '交接现场进展' }, id)
  f.ok('person-02', 'receive', {}, id)
  f.ok('wo-manager', 'transfer', { targetId: 'person-01', text: '同组织交接' }, id)
  assert.equal(f.order(id).assignments.length, 4)
})
test('AC12/13: removed collaborators retain history; existing evidence can support a submission', () => {
  const f = fresh(), id = f.create(); f.ok('person-01', 'receive', {}, id)
  f.ok('person-01', 'collaborators', { accountIds: ['wo-builder'] }, id)
  f.ok('wo-builder', 'feedback', { photos: [image] }, id)
  const photoId = f.order(id).feedbacks[0].photoIds[0]
  f.ok('person-01', 'collaborators', { accountIds: [] }, id)
  assert.equal(f.act('wo-builder', 'feedback', { text: '已移除' }, id).ok, false)
  f.ok('person-01', 'submit', { text: '处理完成', completed: true, photos: [{ attachmentId: photoId }] }, id)
  assert.equal(f.order(id).attachments.length, 1); assert.equal(f.order(id).submissions[0].photoIds[0], photoId)
  assert.equal(f.order(id).attachments[0].actor.id, 'wo-builder')
})
test('AC14/15/16: shared review, return, second submission, change object and stale review rejection', () => {
  const f = fresh(), id = f.create({ categoryId: 'wo-cat-building' })
  f.ok('person-02', 'receive', {}, id); f.ok('person-02', 'submit', { text: '首轮完成', completed: true }, id)
  f.s.switchActor('wo-accept-2'); const stale = f.s.context(f.s.getOrder(id))
  f.ok('wo-accept-1', 'review', { conclusion: '不通过', text: '接缝仍渗漏' }, id)
  f.s.switchActor('wo-accept-2')
  assert.equal(f.s.execute('review', { orderId: id, conclusion: '通过' }, stale).ok, false)
  f.ok('person-02', 'submit', { text: '再次完成处理', completed: true }, id)
  const deadline = f.order(id).submissions[1].acceptanceDeadline
  f.ok('wo-reporter', 'changeAcceptance', { acceptance: { type: 'person', targetId: 'wo-accept-2' }, text: '调整现场复核安排' }, id)
  assert.equal(f.order(id).submissions[1].acceptanceDeadline, deadline)
  f.ok('wo-accept-2', 'review', { conclusion: '通过' }, id)
  assert.equal(f.order(id).status, '已关闭'); assert.equal(f.order(id).reviews.length, 2)
  assert.equal(f.order(id).reviews[0].actor.id, 'wo-accept-1')
  assert.equal(f.order(id).reviews[0].acceptance.targetId, 'wo-accept-role')
})
test('AC16: initiator changes acceptance at all four nonterminal states, without default-role restriction', () => {
  const f = fresh(), id = f.create({ categoryId: 'wo-cat-person' })
  f.ok('wo-reporter', 'changeAcceptance', { acceptance: { type: 'person', targetId: 'wo-reporter' } }, id)
  f.ok('wo-manager', 'dispatch', { targetId: 'person-01' }, id)
  for (const [target, state] of [['wo-accept-1', '待接单'], ['wo-accept-2', '处理中'], ['wo-reporter', '待验收']]) {
    if (state === '处理中') f.ok('person-01', 'receive', {}, id)
    if (state === '待验收') f.ok('person-01', 'submit', { text: '完成', completed: true }, id)
    f.ok('wo-reporter', 'changeAcceptance', { acceptance: { type: 'person', targetId: target }, text: '明确更换' }, id)
    assert.equal(f.order(id).status, state)
  }
  f.ok('wo-reporter', 'review', { conclusion: '通过' }, id)
})
test('AC17/18: dynamic members and self-review evaluate the actual submitter', () => {
  const f = fresh(), id = f.create({ categoryId: 'wo-cat-building' })
  f.ok('person-02', 'receive', {}, id); f.ok('person-02', 'submit', { text: '处理完成', completed: true }, id)
  f.ok('wo-manager', 'demoDirectory', { accountId: 'wo-accept-1', roleId: 'wo-accept-role' })
  assert.equal(f.act('wo-accept-1', 'review', { conclusion: '通过' }, id).ok, false)
  f.ok('wo-manager', 'demoDirectory', { roleStatus: 'wo-accept-role' })
  const pending = f.order(id).submissions[0].acceptanceDeadline
  assert.equal(f.order(id).status, '待验收'); assert.equal(f.s.acceptanceMembers(f.order(id)).length, 0)
  assert.equal(f.order(id).submissions[0].acceptanceDeadline, pending)
  f.ok('wo-reporter', 'changeAcceptance', { acceptance: { type: 'person', targetId: 'wo-reporter' }, text: '角色不可用，由发起人验收' }, id)
  f.ok('wo-reporter', 'review', { conclusion: '通过' }, id)
  const g = fresh()
  const blocked = g.ok('person-01', 'create', input()).id
  assert.equal(g.order(blocked).status, '待派发')
  const own = g.ok('person-01', 'create', input({ categoryId: 'wo-cat-self' })).id
  g.ok('person-01', 'receive', {}, own); g.ok('person-01', 'submit', { text: '自验演示', completed: true }, own)
  g.ok('person-01', 'review', { conclusion: '通过' }, own)
})
test('AC18: role pool excludes only submitter when self-review is disabled', () => {
  const f = fresh(), id = f.create({ acceptanceOrigin: 'manual', acceptance: { type: 'role', targetId: 'wo-accept-role' } })
  f.ok('person-01', 'receive', {}, id); f.ok('person-01', 'submit', { text: '提交', completed: true }, id)
  assert.equal(f.s.acceptanceMembers(f.order(id), 'person-01').some(row => row.id === 'person-01'), false)
  assert.ok(f.s.acceptanceMembers(f.order(id), 'person-01').length >= 2)
  assert.equal(f.act('person-01', 'review', { conclusion: '通过' }, id).ok, false)
  f.ok('wo-accept-1', 'review', { conclusion: '通过' }, id)
})
test('AC19: return, redispatch, transfer and failed acceptance preserve processing deadline', () => {
  const f = fresh(), id = f.create(), original = f.order(id).processingDeadline
  f.ok('person-01', 'return', { text: '退回' }, id)
  f.time(addMinutes(at, 20)); f.ok('wo-manager', 'dispatch', { targetId: 'person-01' }, id)
  assert.notEqual(f.order(id).assignments[0].deadline, f.order(id).assignments[1].deadline)
  f.ok('wo-manager', 'transfer', { targetId: 'person-02', text: '交接' }, id)
  f.ok('person-02', 'receive', {}, id); f.ok('person-02', 'submit', { text: '处理', completed: true }, id)
  assert.equal(f.act('wo-manager', 'transfer', { targetId: 'person-01', text: '待验收不可转派' }, id).ok, false)
  f.ok('wo-reporter', 'review', { conclusion: '不通过', text: '继续处理' }, id)
  assert.equal(f.order(id).processingDeadline, original)
})
test('AC20: changing category adopts new constraints; priority-only edit uses adopted version', () => {
  const f = fresh(), id = f.create({ categoryId: 'wo-cat-person', acceptanceOrigin: 'manual', acceptance: { type: 'person', targetId: 'wo-reporter' } })
  f.s.switchActor('wo-rule-admin')
  const latest = clone(f.s.state.categories.find(row => row.id === 'wo-cat-person')); latest.limits.紧急.processing = 999
  assert.equal(f.s.execute('saveCategory', latest, { ...f.s.context(), configVersion: 1 }).ok, true)
  f.ok('wo-reporter', 'edit', input({ categoryId: 'wo-cat-person', priority: '紧急', keptPhotoIds: [] }), id)
  assert.equal(f.order(id).durations.processing, 30); assert.equal(f.order(id).categorySnapshot.version, 1)
  f.ok('wo-reporter', 'edit', input({ categoryId: 'wo-cat-self', priority: '紧急', keptPhotoIds: [] }), id)
  assert.equal(f.order(id).categorySnapshot.allowSelf, true)
  assert.equal(f.order(id).acceptance.targetId, 'wo-reporter'); assert.equal(f.order(id).acceptanceOrigin, 'manual')
})
test('AC21/22: exact deadline is on time; later extension never rewrites a submission', () => {
  const f = fresh(), id = f.create(); f.time(addMinutes(at, 30)); f.ok('person-01', 'receive', {}, id)
  assert.equal(f.order(id).assignments[0].late, false)
  f.time(addMinutes(at, 240)); f.ok('person-01', 'submit', { text: '恰好截止', completed: true }, id)
  assert.equal(f.order(id).submissions[0].late, false)
  assert.equal(timeFacts(f.order(id), addMinutes(at, 361)).acceptanceLate, true)
  f.ok('wo-reporter', 'review', { conclusion: '不通过', text: '继续处理' }, id)
  f.time(addMinutes(at, 241)); f.ok('person-01', 'submit', { text: '逾期的再次提交', completed: true }, id)
  const snapshot = clone(f.order(id).submissions[1])
  f.ok('wo-manager', 'deadline', { deadline: addMinutes(at, 1000), text: '事后延期' }, id)
  assert.deepEqual(clone(f.order(id).submissions[1]), snapshot); assert.equal(snapshot.late, true)
  f.ok('wo-reporter', 'review', { conclusion: '通过' }, id)
  assert.equal(f.order(id).finalSubmissionId, snapshot.id); assert.equal(f.order(id).submissions[1].late, true)
})
test('AC23/26: terminal state, stale handler, outdated actor and repeat result cannot mutate history', () => {
  const f = fresh(), id = f.create(); f.ok('person-01', 'receive', {}, id)
  f.s.switchActor('person-01'); const stale = f.s.context(f.s.getOrder(id))
  f.ok('wo-manager', 'transfer', { targetId: 'person-02', text: '转派' }, id)
  f.s.switchActor('person-01')
  assert.equal(f.s.execute('submit', { orderId: id, text: '旧窗口', completed: true }, stale).ok, false)
  f.ok('wo-manager', 'terminate', { text: '测试终止' }, id)
  assert.equal(f.order(id).reviews.length, 0)
  for (const action of ['supplement', 'changeAcceptance', 'deadline', 'edit', 'dispatch', 'submit']) assert.equal(f.act('wo-manager', action, { text: '不应变更' }, id).ok, false)
})
test('AC24/25: persisted state reload uses the same IDs, attachments, history and anchor', () => {
  const map = new Map(), storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) }
  const f = fresh({ storage }), id = f.create({ photos: [image] })
  const reloaded = createWorkOrderStore(JSON.parse(map.get(STORAGE_KEY)), { storage })
  assert.deepEqual(clone(reloaded.state.orders[0]), clone(f.order(id))); assert.equal(reloaded.state.anchor, at)
  f.s.switchActor('wo-reporter'); const before = JSON.stringify(f.s.state)
  assert.equal(f.s.execute('create', input({ photos: [{ dataUrl: 'bad' }] }), f.s.context()).ok, false)
  assert.equal(JSON.stringify(f.s.state), before)
})
test('AC27/28: source placeholders have no external writes, same organization grants no authority', () => {
  const seed = createDemoState(at), f = fresh({ seed })
  const hazard = f.s.state.orders.find(row => row.sourceId === 'HZ-DEMO-001')
  assert.equal(hazard.source, '隐患转入（占位）')
  assert.equal(f.s.switchActor('wo-unrelated').ok, true); assert.equal(f.s.listOrders().length, 0)
  assert.equal(f.s.getOrder(hazard.id), null); assert.deepEqual(f.s.actions(hazard), [])
  f.s.switchActor('wo-rule-admin'); assert.equal(f.s.listOrders().length, 0); assert.equal(f.s.canConfigure(), true)
  const writes = [], raw = readCatalog(), upstream = JSON.stringify(createEquipmentSeed()), saved = new Map([[EQUIPMENT_STORAGE_KEY, upstream]])
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => { writes.push(key); saved.set(key, value) } }
  readCatalog(storage)
  const g = fresh({ storage, seed }); g.create()
  g.ok('wo-manager', 'dispatch', { targetId: 'person-02' }, hazard.id)
  g.ok('person-02', 'receive', {}, hazard.id)
  g.ok('person-02', 'submit', { text: '仅完成工单本身的处理', completed: true }, hazard.id)
  g.ok('wo-accept-1', 'review', { conclusion: '通过' }, hazard.id)
  assert.equal(g.order(hazard.id).status, '已关闭'); assert.equal(g.order(hazard.id).sourceId, 'HZ-DEMO-001')
  assert.equal(saved.get(EQUIPMENT_STORAGE_KEY), upstream)
  assert.ok(writes.every(key => key === STORAGE_KEY)); assert.ok(!writes.includes(EQUIPMENT_STORAGE_KEY))
  assert.equal(raw.assets.find(row => row.id === 'asset-boiler-1').status, '运行')
})
test('AC20: explicitly restoring adopted defaults replaces manual acceptance without adopting latest configuration', () => {
  const f = fresh(), id = f.create({ categoryId: 'wo-cat-person', acceptanceOrigin: 'manual', acceptance: { type: 'person', targetId: 'wo-reporter' } })
  f.ok('wo-reporter', 'edit', input({ categoryId: 'wo-cat-person', useDefault: true, acceptanceOrigin: 'default', keptPhotoIds: [] }), id)
  assert.equal(f.order(id).acceptance.targetId, 'wo-accept-1'); assert.equal(f.order(id).acceptanceOrigin, 'default')
})
test('AC06: a stopped operating asset still has a valid identity and can be reported for repair', () => {
  const refs = readCatalog(); refs.assets.find(row => row.id === 'asset-boiler-1').status = '停用'
  const f = fresh({ catalog: () => refs }), id = f.create()
  assert.equal(f.order(id).assetId, 'asset-boiler-1')
  assert.equal(refs.assets.find(row => row.id === 'asset-boiler-1').status, '停用')
})
test('AC09: failure simulation applies to business save, not switching the demonstration identity', () => {
  const f = fresh(); f.s.simulateFailure()
  assert.equal(f.s.switchActor('wo-reporter').ok, true)
  assert.equal(f.s.execute('create', input(), f.s.context()).ok, false); assert.equal(f.s.state.orders.length, 0)
})

test('AC12/28: historical participants cannot read later records or attachments, even at the same clock instant', () => {
  const f = fresh(), id = f.create({ photos: [image] })
  f.ok('person-01', 'receive', {}, id)
  f.ok('person-01', 'collaborators', { accountIds: ['wo-builder'] }, id)
  f.ok('wo-builder', 'feedback', { text: '移除前的反馈', photos: [image] }, id)
  f.ok('person-01', 'collaborators', { accountIds: [] }, id)
  f.ok('wo-manager', 'transfer', { targetId: 'person-02', text: '后续承接人' }, id)
  f.ok('wo-manager', 'deadline', { deadline: addMinutes(at, 500), text: '移除后的延期' }, id)
  f.ok('person-02', 'receive', {}, id)
  f.ok('person-02', 'feedback', { text: '后续反馈', photos: [image] }, id)
  for (const actor of ['wo-builder', 'person-01']) {
    f.s.switchActor(actor)
    const view = f.s.getOrder(id), listed = f.s.listOrders({ tab: 'participated' }).find(row => row.id === id)
    assert.equal(view.historyScopeAt, at)
    assert.equal(view.assignments.length, 1); assert.equal(view.deadlineChanges.length, 0)
    assert.equal(view.feedbacks.length, 1); assert.equal(view.attachments.length, 2)
    assert.equal(listed.attachments.length, 2); assert.equal(listed.feedbacks.length, 1)
    assert.deepEqual(f.s.actions(view), [])
    assert.ok(!view.logs.some(row => row.action === '调整处理期限'))
  }
  f.s.switchActor('person-02'); assert.equal(f.s.getOrder(id).attachments.length, 3)
  f.s.switchActor('wo-manager'); assert.equal(f.s.getOrder(id).deadlineChanges.length, 1)
})

test('AC12/28: handling permission is checked again for feedback and collaborator management', () => {
  const f = fresh(), id = f.create()
  f.ok('person-01', 'receive', {}, id)
  f.ok('person-01', 'collaborators', { accountIds: ['wo-builder'] }, id)
  const seed = clone(f.s.state)
  for (const actor of seed.directory.accounts.filter(row => ['person-01', 'wo-builder'].includes(row.id))) actor.permissions = []
  const g = fresh({ seed })
  assert.equal(g.act('person-01', 'feedback', { text: '已失去处理权限' }, id).ok, false)
  assert.equal(g.act('person-01', 'collaborators', { accountIds: [] }, id).ok, false)
  assert.equal(g.act('wo-builder', 'feedback', { text: '已失去处理权限' }, id).ok, false)
  assert.equal(g.order(id).feedbacks.length, 0)
})

test('AC09/26: actual storage read and write failures leave the staged business action unchanged', () => {
  const map = new Map(); let failRead = false, failWrite = false
  const storage = {
    getItem: key => { if (failRead) throw new Error('read blocked'); return map.get(key) },
    setItem: (key, value) => { if (failWrite) throw new Error('quota'); map.set(key, value) }
  }
  const f = fresh({ storage }), id = f.create()
  f.s.switchActor('person-01')
  const ctx = f.s.context(f.s.getOrder(id)), payload = { orderId: id }, before = JSON.stringify(f.s.state), saved = map.get(STORAGE_KEY)
  failWrite = true
  assert.equal(f.s.execute('receive', payload, ctx).ok, false)
  assert.equal(JSON.stringify(f.s.state), before); assert.equal(map.get(STORAGE_KEY), saved)
  failWrite = false; failRead = true
  assert.equal(f.s.execute('receive', payload, ctx).ok, false)
  assert.equal(JSON.stringify(f.s.state), before)
  failRead = false
  assert.equal(f.s.execute('receive', payload, ctx).ok, true)
  assert.equal(f.order(id).status, '处理中')
  assert.equal(f.s.execute('receive', payload, ctx).duplicate, true)
})

test('AC16/26/28: changing acceptance revokes the old person, including an already-open review', () => {
  const f = fresh(), id = f.create({ categoryId: 'wo-cat-person' })
  f.ok('wo-manager', 'dispatch', { targetId: 'person-01' }, id)
  f.ok('person-01', 'receive', {}, id)
  f.ok('person-01', 'submit', { text: '处理完毕', completed: true }, id)
  f.s.switchActor('wo-accept-1'); const old = f.s.context(f.s.getOrder(id))
  f.ok('wo-reporter', 'changeAcceptance', { acceptance: { type: 'person', targetId: 'wo-accept-2' }, text: '改由其他现场人员复核' }, id)
  f.s.switchActor('wo-accept-1')
  const rejected = f.s.execute('review', { orderId: id, conclusion: '通过' }, old)
  assert.equal(rejected.ok, false); assert.match(rejected.error, /刷新/)
  assert.equal(f.s.getOrder(id), null); assert.equal(f.order(id).reviews.length, 0)
  f.ok('wo-accept-2', 'review', { conclusion: '通过' }, id)
  f.s.switchActor('wo-outside'); assert.equal(f.s.listOrders().length, 0); assert.equal(f.s.canCreate(), false)
})
