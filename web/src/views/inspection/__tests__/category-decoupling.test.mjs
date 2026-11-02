import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { computed, effectScope, nextTick, ref, watch } from 'vue'
import { parse, compileScript } from '@vue/compiler-sfc'
import { baseParse } from '@vue/compiler-dom'
import { createJointStore, createDemoState, migrateDemoState, clone } from '../../../data/equipmentInspectionMock.js'
import { ASSET_TYPES, createEquipmentSeed } from '../../../data/equipmentInspectionSeed.js'

const fresh = (state = createEquipmentSeed()) => createJointStore(state, { clock: () => new Date('2026-11-02T03:00:00Z') })
function newAsset(store, code, type = '单台设备', categoryId = 'cat-boiler') {
  return { ...clone(store.object('asset-boiler-1')), id: '', code, name: code, type, categoryId, parentId: '', systemId: '', meters: [] }
}
function inspectionRule(store, { rootType = '设施', targetType = '建筑构件', categoryId = 'cat-door', role = 'self' } = {}) {
  const rule = clone(store.byId(store.state.rules, 'rule-boiler-room-daily'))
  Object.assign(rule, { id: '', code: 'DECOUPLED-RULE', name: '分类解耦巡检', rootType, categoryId: rootType === '空间' ? '' : categoryId, roomUsage: '', models: [], states: [] })
  rule.groups = [{ ...rule.groups[0], targetType, categoryId, role, models: [], states: [], extraRoles: [], items: [rule.groups[0].items[0]] }]
  return rule
}
function componentSetup(relativeFile, store, props = {}) {
  const source = fs.readFileSync(new URL(relativeFile, import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const compiled = compileScript(descriptor, { id: 'category-decoupling-test' }).content
    .replace(/^import .*$/gm, '').replace('export default', 'const component =')
  const component = vm.runInNewContext(compiled + '\n;component', {
    computed, nextTick, ref, watch, store, clone, ASSET_TYPES,
    PROJECT: { id: 'project-demo' }, ORGANIZATIONS: [],
    useRoute: () => ({ query: {} }), ElMessage: { success() {}, error() {} },
    AssetRelationsEditor: {}, EquipmentInspectionHistory: {}, GROUP_ROLES: [],
  })
  const scope = effectScope()
  const bindings = scope.run(() => component.setup(props, { expose() {} }))
  return { source, bindings, stop: () => scope.stop() }
}
function modelChangeExpression(source, model) {
  let found
  const visit = node => {
    if (node.type === 1 && node.props.some(prop => prop.type === 7 && prop.name === 'model' && prop.exp?.content === model)) found = node
    for (const child of node.children || []) visit(child)
  }
  visit(baseParse(parse(source).descriptor.template.content))
  assert.ok(found, `Missing real model binding: ${model}`)
  return found.props.find(prop => prop.type === 7 && prop.name === 'on' && prop.arg?.content === 'change')?.exp?.content
}

test('T01: one third-level category accepts all five actual object types independently', () => {
  const s = fresh()
  const saved = ASSET_TYPES.map((type, index) => s.saveAsset(newAsset(s, `DECOUPLED-${index}`, type)))
  assert.deepEqual(saved.map(row => row.type), ASSET_TYPES)
  assert.ok(saved.every(row => row.categoryId === 'cat-boiler'))
  assert.equal(new Set(saved.map(row => row.id)).size, ASSET_TYPES.length)
  assert.ok(s.state.categories.every(row => !Object.hasOwn(row, 'objectType')))
})

test('T02: the real ledger setup and type-change binding retain the chosen valid category', () => {
  const s = fresh(), view = componentSetup('../../equipment/EquipmentLedgerView.vue', s)
  try {
    const { open, draft, categories } = view.bindings
    open(); draft.value.categoryId = 'cat-boiler'
    const before = Array.from(categories.value, row => row.id).sort()
    draft.value.type = '组合设备'
    const handler = modelChangeExpression(view.source, 'draft.type')
    if (handler) vm.runInNewContext(handler, { draft: draft.value, $event: '组合设备' })
    assert.equal(draft.value.categoryId, 'cat-boiler')
    assert.deepEqual(Array.from(categories.value, row => row.id).sort(), before)
    assert.ok(before.includes('cat-boiler') && before.includes('cat-door') && before.includes('cat-heat-system'))
    assert.ok(!before.includes('cat-support') && !before.includes('cat-heat'))
    s.byId(s.state.categories, 'cat-steam').enabled = false
    assert.ok(!categories.value.some(row => row.id === 'cat-steam'))
  } finally { view.stop() }
})

test('T02: group classification options include ancestors and do not depend on legacy objectType', () => {
  const s = fresh(), group = { name: '设备检查', role: 'spaceEquipment', targetType: '单台设备', categoryId: 'cat-boiler', models: [], states: [], extraRoles: [] }
  s.byId(s.state.categories, 'cat-door').objectType = '建筑构件'
  const view = componentSetup('../GroupMatchingEditor.vue', s, { group, rootType: '空间' })
  try {
    const ids = Array.from(view.bindings.categories.value, row => row.id)
    assert.ok(ids.includes('cat-support') && ids.includes('cat-heat') && ids.includes('cat-door'))
    group.targetType = '组合设备'
    const handler = modelChangeExpression(view.source, 'group.targetType')
    if (handler) vm.runInNewContext(`(${handler})($event)`, { group, $event: '组合设备' })
    assert.equal(group.categoryId, 'cat-boiler')
    assert.deepEqual(Array.from(view.bindings.categories.value, row => row.id), ids)
  } finally { view.stop() }
})

test('T02: the real category editor creates categories without purpose or object-type configuration', () => {
  const s = fresh(), view = componentSetup('../../equipment/EquipmentCategoriesView.vue', s)
  try {
    const { open, draft, save } = view.bindings
    open(null, 'cat-heat')
    assert.equal(Object.hasOwn(draft.value, 'objectType'), false)
    assert.equal(Object.hasOwn(view.bindings, 'purpose'), false)
    Object.assign(draft.value, { code: 'EDITOR-CAT', name: '编辑器创建的分类' })
    save()
    const saved = s.state.categories.find(row => row.code === 'EDITOR-CAT')
    assert.ok(saved && s.isAssetCategory(saved.id))
    assert.equal(Object.hasOwn(saved, 'objectType'), false)
    const labels = []
    const visit = node => {
      if (node.type === 1) for (const prop of node.props) if (prop.type === 6 && prop.name === 'label') labels.push(prop.value?.content)
      for (const child of node.children || []) visit(child)
    }
    visit(baseParse(parse(view.source).descriptor.template.content))
    assert.ok(!labels.includes('分类用途') && !labels.includes('管理对象类型'))
  } finally { view.stop() }
})

test('T03: registration requires exactly a third-level leaf regardless of legacy purpose metadata', () => {
  const s = fresh()
  const earlyLeaf = s.saveCategory({ code: 'EARLY', name: '一级末端', parentId: '', objectType: '单台设备', enabled: true })
  assert.throws(() => s.saveAsset(newAsset(s, 'BAD-LEVEL-1', '单台设备', earlyLeaf.id)), /三级末级/)
  assert.throws(() => s.saveAsset(newAsset(s, 'BAD-LEVEL-2', '单台设备', 'cat-heat')), /三级末级/)
  const third = s.saveCategory({ code: 'THIRD', name: '无类型字段的三级分类', parentId: 'cat-heat', enabled: true })
  assert.equal(s.saveAsset(newAsset(s, 'GOOD-LEVEL-3', '组合设备', third.id)).categoryId, third.id)
  assert.throws(() => s.saveCategory({ code: 'FOURTH', name: '四级分类', parentId: third.id, enabled: true }), /最多三级/)
  assert.throws(() => s.saveCategory({ code: 'third', name: '重复编码', parentId: 'cat-air', enabled: true }), /编码已存在/)
  assert.throws(() => s.saveCategory({ code: 'THIRD-TWIN', name: third.name, parentId: 'cat-heat', enabled: true }), /名称不能重复/)
})

test('T03: a legacy asset-referenced category cannot gain children or move silently', () => {
  const state = createEquipmentSeed()
  state.assets.push({ ...clone(state.assets[1]), id: 'legacy-asset', code: 'LEGACY-ASSET', categoryId: 'cat-heat' })
  const s = fresh(state), before = clone(s.state)
  assert.throws(() => s.saveCategory({ code: 'LEGACY-CHILD', name: '下级', parentId: 'cat-heat', enabled: true }), /台账引用.*下级/)
  assert.deepEqual(clone(s.state), before)
  const view = componentSetup('../../equipment/EquipmentLedgerView.vue', s)
  try {
    view.bindings.open(s.object('legacy-asset'))
    assert.equal(view.bindings.draft.value.categoryId, 'cat-heat')
    assert.ok(!view.bindings.categories.value.some(row => row.id === 'cat-heat'))
    view.bindings.save()
    assert.match(view.bindings.error.value, /三级末级/)
    assert.deepEqual(clone(s.state), before)
  } finally { view.stop() }
  assert.throws(() => s.saveCategory({ ...clone(s.byId(s.state.categories, 'cat-boiler')), parentId: 'cat-air' }), /已被引用/)
  assert.throws(() => s.saveCategory({ ...clone(s.byId(s.state.categories, 'cat-boiler')), code: 'RENAMED-ID' }), /已被引用/)
  s.saveCategory({ ...clone(s.byId(s.state.categories, 'cat-boiler')), name: '锅炉分类新名称', enabled: false })
  assert.equal(s.object('asset-boiler-1').categoryId, 'cat-boiler')
  assert.throws(() => s.saveAsset(newAsset(s, 'DISABLED-CATEGORY')), /启用/)
})

test('T04: rule type and category ancestors are independent and exclude combinations from equipment groups', () => {
  const s = fresh(createDemoState())
  const combined = s.saveAsset(newAsset(s, 'BOILER-COMBO', '组合设备'))
  const roomRule = clone(s.byId(s.state.rules, 'rule-boiler-room-daily'))
  roomRule.groups = [{ ...roomRule.groups[1], categoryId: 'cat-heat' }]
  assert.doesNotThrow(() => s.validateRule(roomRule, true))
  const view = s.preview(roomRule, ['space-boiler'])
  assert.deepEqual(view.issues, [])
  assert.deepEqual(view.points.flatMap(point => point.groups.map(group => group.object.id)).sort(), ['asset-boiler-1', 'asset-boiler-2'])
  assert.equal(view.itemCount, 4)
  const rule = inspectionRule(s, { rootType: '组合', targetType: '组合设备', categoryId: 'cat-boiler' })
  assert.doesNotThrow(() => s.validateRule(rule, true))
  assert.equal(s.rootIssue(rule, combined), '')
  assert.equal(s.preview(rule, [combined.id]).objectCount, 1)
  assert.match(s.rootIssue(rule, s.object('asset-boiler-1')), /需要组合/)
  rule.categoryId = 'cat-air'
  assert.match(s.rootIssue(rule, combined), /分类不适用/)
})

test('T05: facility roots support building components while explicit group types stay distinct', () => {
  const s = fresh(createDemoState())
  const door = s.saveAsset(newAsset(s, 'FIRE-DOOR', '建筑构件', 'cat-door'))
  const ordinary = s.saveAsset(newAsset(s, 'ORDINARY-FACILITY', '设施', 'cat-door'))
  const rule = inspectionRule(s)
  assert.equal(s.typeOf(door), '设施')
  assert.doesNotThrow(() => s.validateRule(rule, true))
  const view = s.preview(rule, [door.id])
  assert.deepEqual(view.issues, []); assert.equal(view.objectCount, 1)
  assert.equal(view.points[0].groups[0].object.type, '建筑构件')
  assert.equal(s.preview(rule, [ordinary.id]).objectCount, 0)
  rule.groups[0].targetType = '设施'
  assert.doesNotThrow(() => s.validateRule(rule, true))
  assert.equal(s.preview(rule, [door.id]).objectCount, 0)
  assert.equal(s.preview(rule, [ordinary.id]).objectCount, 1)
  rule.groups[0].targetType = '建筑构件'; rule.categoryId = 'cat-steam'
  assert.match(s.preview(rule, [door.id]).issues.join(''), /分类不适用/)
})

test('T05: explicitly related building components expand by their own type and stable identity', () => {
  const s = fresh(createDemoState())
  const door = s.saveAsset(newAsset(s, 'RELATED-DOOR', '建筑构件', 'cat-door'))
  s.saveSpaceFacilities('space-boiler', ['asset-steam-pipe', door.id])
  const rule = inspectionRule(s, { rootType: '空间', role: 'linkedFacility' })
  assert.doesNotThrow(() => s.validateRule(rule, true))
  const view = s.preview(rule, ['space-boiler'])
  assert.deepEqual(view.issues, []); assert.equal(view.objectCount, 1)
  assert.equal(view.points[0].groups[0].object.id, door.id)
  assert.equal(s.object(door.id).type, '建筑构件')
  assert.equal(s.state.assets.filter(row => row.id === door.id).length, 1)
  const general = { ...clone(rule), groups: [{ ...clone(rule.groups[0]), targetType: '设施', categoryId: '' }] }
  assert.deepEqual(s.preview(general, ['space-boiler']).points.flatMap(point => point.groups.map(group => group.object.id)), ['asset-steam-pipe'])
})

test('T05: system facility paths deduplicate building components and retain their actual check location', () => {
  const s = fresh(createDemoState())
  const door = s.saveAsset({ ...newAsset(s, 'SYSTEM-DOOR', '建筑构件', 'cat-door'), systemId: 'asset-heat-system', spaceId: 'space-f1' })
  s.saveAsset(clone(s.object('asset-heat-system')), [door.id])
  const rule = inspectionRule(s, { rootType: '空间', role: 'linkedFacility' })
  Object.assign(rule.groups[0], { includeSystemFacilities: true, extraRoles: ['systemMembers'] })
  const view = s.preview(rule, ['space-boiler'])
  assert.deepEqual(view.issues, [])
  assert.equal(view.objectCount, 1); assert.equal(view.itemCount, 1)
  assert.equal(view.points[0].space.id, 'space-f1')
  assert.equal(view.points[0].groups[0].object.id, door.id)
  assert.equal(view.duplicates[0].removedItems, 2)
})

test('T06: restored legacy category metadata is ignored without rewriting any persisted business data', () => {
  const legacy = createDemoState()
  for (const category of legacy.categories) category.objectType = legacy.assets.find(asset => asset.categoryId === category.id)?.type || ''
  legacy.categories.find(row => row.id === 'cat-boiler').objectType = '旧版分类类型（仅兼容）'
  const before = clone(legacy), stored = new Map([['ezhiwei:equipment-inspection:v1:state', JSON.stringify(legacy)]])
  const migrated = migrateDemoState(JSON.parse(stored.get('ezhiwei:equipment-inspection:v1:state')))
  assert.deepEqual(migrated.state, before)
  assert.equal(migrated.changed, false)
  const s = createJointStore(migrated.state, { storage: { setItem: (key, value) => stored.set(key, value) } })
  const records = clone(s.records())
  s.persist()
  assert.deepEqual(JSON.parse(stored.get('ezhiwei:equipment-inspection:v1:state')), before)
  s.saveAsset(newAsset(s, 'LEGACY-BOILER-COMBO', '组合设备'))
  for (const key of ['rules', 'plans', 'tasks', 'relations']) assert.deepEqual(clone(s.state[key]), before[key])
  assert.deepEqual(clone(s.records()), records)
  assert.deepEqual(clone(s.state.assets.slice(0, before.assets.length)), before.assets)
  assert.deepEqual(clone(s.state.categories), before.categories)
  const category = clone(s.byId(s.state.categories, 'cat-boiler'))
  s.saveCategory({ ...category, name: '旧分类改名后仍保留身份', objectType: '不再接受的新类型绑定' })
  assert.equal(s.byId(s.state.categories, category.id).objectType, category.objectType)
  assert.deepEqual(clone(s.records()), records)
  for (const key of ['rules', 'plans', 'tasks', 'relations']) assert.deepEqual(clone(s.state[key]), before[key])
})

test('T07: decoupling preserves relation validation, snapshots, unique IDs and original readings', () => {
  const s = fresh(createDemoState()), tasks = clone(s.state.tasks), records = clone(s.records())
  assert.throws(() => s.saveAsset(newAsset(s, 'BL-001')), /编码已存在/)
  assert.throws(() => s.saveAsset({ ...newAsset(s, 'BAD-TYPE'), type: '未知类型' }), /管理对象类型/)
  assert.throws(() => s.saveAsset({ ...newAsset(s, 'BAD-SPACE'), spaceId: 'not-a-space' }), /安装空间/)
  const first = s.saveAsset(newAsset(s, 'COMBO-1', '组合设备'))
  const second = s.saveAsset({ ...newAsset(s, 'COMBO-2', '组合设备'), parentId: first.id })
  const before = clone(s.state)
  assert.throws(() => s.saveAsset({ ...clone(first), parentId: second.id }), /循环/)
  assert.deepEqual(clone(s.state), before)
  assert.throws(() => s.saveAsset({ ...clone(s.object('asset-boiler-1')), type: '组合设备' }), /已被引用/)
  assert.throws(() => s.saveAsset({ ...newAsset(s, 'WRONG-SYSTEM'), systemId: first.id }), /专业系统/)
  s.saveCategory({ ...clone(s.byId(s.state.categories, 'cat-boiler')), name: '燃气蒸汽锅炉' })
  assert.deepEqual(clone(s.state.tasks), tasks); assert.deepEqual(clone(s.records()), records)
})
