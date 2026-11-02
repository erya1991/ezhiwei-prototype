import { reactive } from 'vue'
import { ASSET_TYPES, SPACE_TYPES, SPACE_PARENT_TYPES, CHECKABLE_SPACE_TYPES, REVISION_SAMPLE_IDS, PROJECT, ORGANIZATIONS, PEOPLE, ROOT_TYPES, INPUT_TYPES, GROUP_ROLES, clone, createEquipmentSeed, createInspectionRules } from './equipmentInspectionSeed.js'

export { ASSET_TYPES, SPACE_TYPES, SPACE_PARENT_TYPES, CHECKABLE_SPACE_TYPES, PROJECT, ORGANIZATIONS, PEOPLE, clone } from './equipmentInspectionSeed.js'
export const STORAGE_KEY = 'ezhiwei:equipment-inspection:v1:state'
export const isBlank = value => value === '' || value === null || value === undefined || (typeof value === 'string' && !value.trim())
export function localDate(value = new Date()) { return new Date(value).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }) }
export function displayTime(value) { return value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '—' }
const requireValue = (condition, message) => { if (!condition) throw new Error(message) }
const trimmed = value => String(value ?? '').trim()
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value
const isFacility = object => ['设施', '建筑构件'].includes(object?.type)

// Registration is determined by the three-level hierarchy, never legacy objectType.
export function isAssetCategory(categories, id) {
  let row = categories.find(category => category.id === id)
  if (!row || categories.some(category => category.parentId === id)) return false
  const seen = new Set()
  while (row) {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    if (!row.parentId) return seen.size === 3
    row = categories.find(category => category.id === row.parentId)
  }
  return false
}

export function createJointStore(initial = createEquipmentSeed(), { storage = null, clock = () => new Date() } = {}) {
  const state = reactive(clone(initial))
  const notice = reactive({ persistence: '', catalog: '' })
  const byId = (list, id) => list.find(row => row.id === id)
  const now = () => clock().toISOString()
  const nextId = prefix => `${prefix}-${++state.serial}`
  const persist = () => {
    try { if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(state)); notice.persistence = '' }
    catch { notice.persistence = '浏览器存储不可用或容量不足；本次操作保留在当前页面内存，刷新可能丢失。' }
  }
  function audit(entity, id, action) { state.audits.push({ id: nextId('audit'), entity, objectId: id, action, at: now() }) }
  function upsert(list, row) { const index = list.findIndex(old => old.id === row.id); if (index < 0) list.push(row); else list[index] = row; persist(); return row }
  function ancestors(list, id) {
    const found = [], seen = new Set()
    let row = byId(list, id)
    while (row && !seen.has(row.id)) { found.unshift(row); seen.add(row.id); row = byId(list, row.parentId) }
    return found
  }
  function categoryReferenced(id) {
    return state.categories.some(row => row.parentId === id) || state.assets.some(row => row.categoryId === id) || state.rules.some(rule => rule.categoryId === id || rule.groups.some(group => group.categoryId === id))
  }
  function spaceReferenced(id) {
    return state.spaces.some(row => row.parentId === id) || state.assets.some(row => row.spaceId === id) || state.relations.some(row => row.sourceId === id) || state.plans.some(plan => plan.rootIds.includes(id))
  }
  function assetReferenced(id) {
    return state.assets.some(row => row.systemId === id || row.parentId === id) || state.relations.some(row => row.sourceId === id || row.targetId === id) || state.plans.some(plan => plan.rootIds.includes(id)) || state.tasks.some(task => task.points.some(point => point.groups.some(group => group.object.id === id)))
  }
  function uniqueCode(list, draft) { requireValue(!list.some(row => row.id !== draft.id && row.code.toLowerCase() === draft.code.toLowerCase()), '编码已存在，请使用唯一编码') }
  function noCycle(list, draft, parentField = 'parentId') {
    let id = draft[parentField]
    const visited = new Set([draft.id])
    while (id) { requireValue(!visited.has(id), '关联不能指向自身或形成循环'); visited.add(id); id = byId(list, id)?.[parentField] }
  }
  function saveCategory(input) {
    const draft = clone(input), old = byId(state.categories, draft.id)
    draft.parentId ||= ''
    // Preserve existing cached metadata without accepting it as a new constraint.
    delete draft.objectType
    if (old && Object.hasOwn(old, 'objectType')) draft.objectType = old.objectType
    draft.code = trimmed(draft.code); draft.name = trimmed(draft.name)
    requireValue(draft.code && draft.name, '分类编码与名称必填')
    requireValue(draft.code.length <= 40 && draft.name.length <= 60 && trimmed(draft.description).length <= 500, '编码最多40字，名称最多60字，说明最多500字')
    uniqueCode(state.categories, draft); noCycle(state.categories, draft)
    if (draft.parentId) requireValue(byId(state.categories, draft.parentId), '上级分类不存在')
    requireValue(ancestors(state.categories, draft.parentId).length < 3, '一期分类最多三级')
    if (draft.parentId && (!old || old.parentId !== draft.parentId)) requireValue(!state.assets.some(asset => asset.categoryId === draft.parentId), '上级分类已有台账引用，不能新增或移入下级，请先核对原台账分类')
    requireValue(!state.categories.some(row => row.id !== draft.id && row.parentId === draft.parentId && row.name === draft.name), '同一上级下分类名称不能重复')
    if (old && categoryReferenced(old.id)) requireValue(['code', 'parentId'].every(key => old[key] === draft[key]), '分类已被引用，编码和上级受限；名称及启停不改变原有身份')
    draft.id ||= nextId('category'); audit('分类', draft.id, old ? '编辑（历史引用保留）' : '新增')
    return upsert(state.categories, draft)
  }
  function saveSpace(input) {
    const draft = clone(input), old = byId(state.spaces, draft.id)
    draft.parentId ||= ''
    draft.code = trimmed(draft.code); draft.name = trimmed(draft.name)
    requireValue(draft.code && draft.name && SPACE_TYPES.includes(draft.type), '空间编码、名称与类型必填')
    requireValue(draft.code.length <= 40 && draft.name.length <= 60 && trimmed(draft.location).length <= 500, '空间编码最多40字、名称最多60字、位置说明最多500字')
    requireValue(draft.projectId === PROJECT.id, '空间必须属于当前演示项目')
    const parent = byId(state.spaces, draft.parentId)
    if (draft.type === '院区') requireValue(!draft.parentId, '院区不可再选择上级')
    else requireValue(parent && SPACE_PARENT_TYPES[draft.type].includes(parent.type) && parent.projectId === draft.projectId, '空间层级须为院区 → 楼栋 → 楼层 → 可选片区 → 房间 / 机房 / 公共区域')
    uniqueCode(state.spaces, draft); noCycle(state.spaces, draft)
    requireValue(!state.spaces.some(row => row.id !== draft.id && row.parentId === draft.parentId && row.name === draft.name), '同一上级下空间名称不能重复')
    if (draft.type === '楼栋') requireValue(trimmed(draft.usage), '建筑用途必填')
    else requireValue(!draft.structure && !draft.deliveredAt && !draft.ownerId, '结构、交付日期和产权单位仅适用于楼栋')
    if (CHECKABLE_SPACE_TYPES.includes(draft.type)) requireValue(trimmed(draft.location), '请填写可现场定位的空间位置')
    if (draft.deliveredAt) requireValue(validDate(draft.deliveredAt), '交付日期不合法')
    requireValue(['使用中', '暂不使用'].includes(draft.status), '空间使用状态无效')
    for (const key of ['ownerId', 'maintainerId']) if (draft[key]) requireValue(byId(ORGANIZATIONS, draft[key]), '请选择已有责任单位')
    if (old && spaceReferenced(old.id)) requireValue(['code', 'type', 'parentId', 'projectId'].every(key => old[key] === draft[key]), '空间已有下级或引用，编码、层级和上级受限')
    draft.id ||= nextId('space'); audit('空间', draft.id, old ? '编辑（不回写历史任务）' : '新增空间')
    return upsert(state.spaces, draft)
  }
  function assetMembers(id, field = 'parentId', recursive = false) {
    const found = [], seen = new Set([id]), queue = [id]
    while (queue.length) {
      const parentId = queue.shift()
      for (const row of state.assets.filter(row => row[field] === parentId)) {
        if (seen.has(row.id)) continue
        seen.add(row.id); found.push(row)
        if (recursive) queue.push(row.id)
      }
    }
    return found
  }
  function saveAsset(input, facilityIds, selections = {}) {
    const draft = clone(input), old = byId(state.assets, draft.id)
    draft.parentId ||= ''; draft.systemId ||= ''; draft.spaceId ||= ''; draft.meters ||= []
    draft.code = trimmed(draft.code); draft.name = trimmed(draft.name)
    requireValue(draft.code && draft.name && ASSET_TYPES.includes(draft.type), '台账编号、名称与管理对象类型必填')
    requireValue(draft.code.length <= 40 && draft.name.length <= 60, '台账编号最多40字，名称最多60字')
    requireValue(draft.projectId === PROJECT.id, '台账必须属于当前演示项目')
    uniqueCode(state.assets, draft)
    const category = byId(state.categories, draft.categoryId)
    requireValue(category && isAssetCategory(state.categories, category.id), '请选择三级末级设备 / 设施分类，非末级分类不能用于台账建档')
    requireValue(category.enabled || old?.categoryId === category.id, '请选择启用的三级末级分类；停用分类仅保留原有台账归属')
    requireValue(draft.spaceId, '安装空间必填；请先在空间档案中建立准确位置，大厅和走廊也需建档')
    requireValue(byId(state.spaces, draft.spaceId)?.projectId === draft.projectId, '安装空间不存在或项目不一致')
    if (draft.systemId) requireValue(draft.systemId !== draft.id && byId(state.assets, draft.systemId)?.type === '专业系统' && byId(state.assets, draft.systemId)?.projectId === draft.projectId, '所属系统必须是其他同项目已建档的专业系统')
    if (draft.parentId) requireValue(draft.parentId !== draft.id && byId(state.assets, draft.parentId)?.type === '组合设备' && byId(state.assets, draft.parentId)?.projectId === draft.projectId, '上级组合必须是其他同项目已建档的组合设备')
    noCycle(state.assets, draft, 'parentId'); noCycle(state.assets, draft, 'systemId')
    requireValue(['运行', '备用', '停用'].includes(draft.status), '运行状态无效')
    if (draft.organizationId) requireValue(byId(ORGANIZATIONS, draft.organizationId), '责任单位不存在')
    if (old) requireValue(old.code === draft.code, '创建后台账编号不可修改')
    if (old && assetReferenced(old.id)) requireValue(old.type === draft.type && old.categoryId === draft.categoryId, '对象已被引用，类型及分类受限')
    const meterNames = new Set()
    for (const meter of draft.meters) {
      meter.name = trimmed(meter.name); meter.location = trimmed(meter.location)
      requireValue(meter.name && meter.location, '登记仪表时名称与读取位置必填')
      requireValue(!meterNames.has(meter.name), '同一对象下仪表名称不能重复'); meterNames.add(meter.name)
    }
    const uniqueFacilities = [...new Set(facilityIds ?? state.relations.filter(row=>row.sourceId === draft.id && row.type === '设施关联').map(row=>row.targetId))]
    requireValue(uniqueFacilities.every(id => id !== draft.id && isFacility(byId(state.assets, id)) && byId(state.assets, id)?.projectId === draft.projectId), '只能关联其他同项目已登记设施或建筑构件，不可自关联')
    const temporaryId = draft.id || '__new_asset__'
    const proposed = state.assets.filter(row=>row.id !== draft.id).map(row=>clone(row))
    proposed.push({...draft,id:temporaryId})
    for (const [key,field,type] of [['compositionIds','parentId','组合设备'],['systemMemberIds','systemId','专业系统']]) {
      if (!Object.hasOwn(selections,key)) continue
      requireValue(draft.type === type && Array.isArray(selections[key]), `仅${type}可维护对应成员列表`)
      const ids = [...new Set(selections[key])]
      requireValue(ids.every(id=>id !== temporaryId && byId(state.assets,id)?.projectId === draft.projectId && (field !== 'parentId' || byId(state.assets,id)?.type !== '专业系统' || byId(state.assets,id)?.parentId === draft.id)), '成员必须是其他同项目已建档对象；专业系统关系不能代替组成关系')
      for (const row of proposed) {
        if (row.id === temporaryId) continue
        if (ids.includes(row.id)) row[field] = temporaryId
        else if (row[field] === temporaryId) row[field] = ''
      }
    }
    for (const row of proposed) { noCycle(proposed,row,'parentId'); noCycle(proposed,row,'systemId') }
    // Validate the whole relation change before changing live assets or result snapshots.
    for (const meter of draft.meters) meter.id ||= nextId('meter')
    draft.id ||= nextId('asset')
    for (const row of proposed) {
      if (row.id === temporaryId) continue
      const current = byId(state.assets,row.id)
      current.parentId = row.parentId === temporaryId ? draft.id : row.parentId
      current.systemId = row.systemId === temporaryId ? draft.id : row.systemId
    }
    state.relations = state.relations.filter(row => row.sourceId !== draft.id || row.type !== '设施关联')
    uniqueFacilities.forEach(targetId => state.relations.push({ id: nextId('relation'), sourceId: draft.id, sourceType: draft.type, targetId, type: '设施关联' }))
    audit('设备', draft.id, old ? '编辑资料/关系（旧任务快照不变）' : '新增台账')
    return upsert(state.assets, draft)
  }
  function saveSpaceFacilities(id, facilityIds) {
    requireValue(CHECKABLE_SPACE_TYPES.includes(byId(state.spaces, id)?.type), '仅对已有房间、机房或公共区域维护明确设施关联')
    const space = byId(state.spaces, id)
    requireValue(facilityIds.every(targetId => isFacility(byId(state.assets, targetId)) && byId(state.assets, targetId)?.projectId === space.projectId), '请选择同项目已登记设施或建筑构件')
    state.relations = state.relations.filter(row => row.sourceId !== id)
    ;[...new Set(facilityIds)].forEach(targetId => state.relations.push({ id: nextId('relation'), sourceId: id, sourceType: '空间', targetId, type: '设施关联' }))
    audit('空间设施关联', id, '更新明确关系（需要重新核对受影响计划）'); persist()
  }
  return attachInspection({ state, notice, now, nextId, persist, audit, upsert, byId, ancestors, categoryReferenced, spaceReferenced, assetReferenced, assetMembers, saveCategory, saveSpace, saveAsset, saveSpaceFacilities,
    isAssetCategory: id => isAssetCategory(state.categories, id),
    categoryPath: id => ancestors(state.categories, id).map(row => row.name).join(' / '),
    spacePath: id => ancestors(state.spaces, id).map(row => row.name).join(' / '),
    facilityIds: id => state.relations.filter(row => row.sourceId === id && row.type === '设施关联').map(row => row.targetId),
    object: id => byId(state.assets, id) || byId(state.spaces, id)
  })
}

export function evaluateItem(item, result) {
  if (!result || isBlank(result.value)) return '未检查'
  if (item.type === '数值') {
    if (!Number.isFinite(Number(result.value))) return '未自动判定'
    const hasLower = !isBlank(item.lower), hasUpper = !isBlank(item.upper)
    if (!trimmed(item.basis) || (!hasLower && !hasUpper)) return '未自动判定'
    if ((hasLower && Number(result.value) < Number(item.lower)) || (hasUpper && Number(result.value) > Number(item.upper))) return '异常'
    return '正常'
  }
  if (item.type === '状态' && trimmed(item.basis) && item.normalOptions?.length && item.options.includes(result.value)) return item.normalOptions.includes(result.value) ? '正常' : '异常'
  return '未自动判定'
}
export function referenceText(item) {
  if (item.type === '数值' && trimmed(item.basis) && (!isBlank(item.lower) || !isBlank(item.upper))) return `${item.demoReference ? '模拟演示值' : '参考条件'}：${isBlank(item.lower) ? '无下限' : item.lower} ～ ${isBlank(item.upper) ? '无上限' : item.upper} ${item.unit}`
  if (item.type === '状态' && item.basis && item.normalOptions?.length) return `${item.demoReference ? '模拟演示条件' : '参考条件'}：${item.normalOptions.join(' / ')}`
  return '无有效参考条件 · 未自动判定'
}
// Existing task keys remain readable; new tasks explicitly separate inspection locations.
export const resultKey = (group, item) => `${group.resultContext ? `${group.resultContext}|` : ''}${group.object.id}|${group.id}|${item.id}`
export function taskEntries(task) { return task.points.flatMap(point => point.groups.flatMap(group => group.items.map(item => ({ point, group, item, key: resultKey(group, item), result: task.results[resultKey(group, item)] })))) }
export function isResultFilled(item, result) { return item.type === '照片' ? Boolean(result?.photos?.length) : Boolean(result && !isBlank(result.value)) }
function attachInspection(store) {
  const { state, byId, nextId, now, persist, upsert, audit } = store
  function validateRule(rule, publishing = false) {
    requireValue(trimmed(rule.code) && trimmed(rule.name) && trimmed(rule.scene) && ROOT_TYPES.includes(rule.rootType), '规则编号、名称、场景与适用对象类型必填')
    requireValue(rule.name.length <= 80 && rule.code.length <= 40, '规则名称最多80字，编号最多40字')
    if (rule.rootType !== '空间' && rule.categoryId) requireValue(byId(state.categories, rule.categoryId), '规则适用分类不存在')
    if (publishing) requireValue(rule.groups.length && rule.groups.some(group => group.items.length), '未配置检查项不能启用规则')
    const groupNames = new Set(), groupIds = new Set()
    for (const group of rule.groups) {
      requireValue(trimmed(group.name) && !groupNames.has(trimmed(group.name)), '分组名称必填且同版本内不能重复'); groupNames.add(trimmed(group.name))
      if (group.id) { requireValue(!groupIds.has(group.id), '同一规则内分组身份不能重复，请使用复用分组操作'); groupIds.add(group.id) }
      const roles = [normalizedRole(group.role,rule.rootType),...(group.extraRoles || []).map(role=>normalizedRole(role,rule.rootType))]
      requireValue(roles.every(role=>matchingRoles(rule.rootType).some(option=>option.value === role)), '匹配方式与规则根对象不适用，请核对空间、组成或系统关系')
      requireValue(!group.targetType || ['空间',...ASSET_TYPES].includes(group.targetType), '请选择有效的作用对象类型')
      if (roles.every(role=>role === 'self') && group.targetType) requireValue((group.targetType === '空间' ? '空间' : typeOf({type:group.targetType})) === rule.rootType, '当前对象自身分组的作用对象类型必须与规则根类型一致')
      if (roles.some(role=>role !== 'self')) requireValue(group.categoryId || group.targetType, '非自身分组必须明确目标类型或分类')
      if (group.categoryId) requireValue(byId(state.categories, group.categoryId), '分组过滤分类不存在')
      if (group.categoryId) requireValue(group.targetType !== '空间', '空间分组不使用设备分类，请通过空间范围和用途匹配')
      requireValue((group.models || []).every(model=>trimmed(model)) && (group.states || []).every(status=>['运行','备用','停用','使用中','暂不使用'].includes(status)), '分组型号或运行工况无效')
      requireValue(!group.objectId && !group.assetId && !group.spaceId, '分组只定义类型与匹配条件，不能绑定具体设备或空间ID')
      if (publishing && group.required) requireValue(group.items.length, `必需分组“${group.name}”没有检查项`)
      const names = new Set(), itemIds = new Set()
      for (const item of group.items) {
        requireValue(trimmed(item.name) && !names.has(trimmed(item.name)), '检查项名称必填且同组不能重复'); names.add(trimmed(item.name))
        if (item.id) { requireValue(!itemIds.has(item.id), '同组检查项身份不能重复'); itemIds.add(item.id) }
        requireValue(INPUT_TYPES.includes(item.type), '检查项输入类型无效')
        if (item.type === '数值') {
          requireValue(trimmed(item.unit), `“${item.name}”为数值型，计量单位必填`)
          for (const bound of ['lower', 'upper']) if (!isBlank(item[bound])) requireValue(Number.isFinite(Number(item[bound])), '参考上下限必须为合法数值')
          if (!isBlank(item.lower) && !isBlank(item.upper)) requireValue(Number(item.lower) <= Number(item.upper), '参考下限不能大于上限')
          if (publishing && (!isBlank(item.lower) || !isBlank(item.upper))) requireValue(trimmed(item.basis), '配置自动判定参考值时必须填写判断依据；演示值须明确标识')
        }
        if (item.type === '状态') {
          requireValue(item.options.length >= 2 && item.options.every(option => trimmed(option)) && new Set(item.options).size === item.options.length, '状态型至少两个非空且不重复的选项')
          requireValue(item.normalOptions.every(option => item.options.includes(option)), '正常选项必须来自当前可选项')
        }
        if (item.exceptionPhoto) requireValue(item.exceptionNote, '异常要求照片时同时保留异常说明')
      }
    }
  }
  function saveRule(input, publishing = false, copy = false) {
    const draft = clone(input), old = byId(state.rules, draft.id)
    draft.name = trimmed(draft.name); draft.code = trimmed(draft.code)
    validateRule(draft, publishing)
    let familyId = copy ? '' : old?.familyId || old?.id || draft.familyId
    requireValue(!state.rules.some(rule => rule.code === draft.code && (rule.familyId || rule.id) !== familyId), '规则编号已存在，复制规则需使用新编号')
    if (copy || !old) { draft.id = nextId('rule'); familyId ||= draft.id; draft.version = 1 }
    else if (old.status !== '草稿') { draft.id = nextId('rule'); draft.version = Math.max(...state.rules.filter(rule => (rule.familyId || rule.id) === familyId).map(rule => rule.version)) + 1 }
    else { draft.id = old.id; draft.version = old.version }
    draft.familyId = familyId || draft.id
    draft.status = publishing ? '已启用' : '草稿'
    for (const group of draft.groups) { group.id ||= nextId('group'); for (const item of group.items) item.id ||= nextId('item') }
    draft.updatedAt = now(); audit('巡检规则', draft.id, `${old && old.status !== '草稿' ? '创建新版本' : '保存'} V${draft.version} ${draft.status}`)
    return upsert(state.rules, draft)
  }
  function toggleRule(id) {
    const row = byId(state.rules, id); requireValue(row, '规则不存在')
    if (row.status !== '已启用') validateRule(row, true)
    row.status = row.status === '已启用' ? '已停用' : '已启用'; audit('巡检规则', id, row.status); persist()
  }
  // “设施” is a scope family; group.targetType still compares the exact asset type.
  function typeOf(object) { return SPACE_TYPES.includes(object?.type) ? '空间' : ({ 单台设备:'设备', 组合设备:'组合', 专业系统:'系统', 设施:'设施', 建筑构件:'设施' })[object?.type] }
  function normalizedRole(role, rootType) { return role === 'members' ? rootType === '组合' ? 'compositionMembers' : 'systemMembers' : role }
  function matchingRoles(rootType) {
    const allowed = {空间:['self','spaceEquipment','compositionMembers','systemMembers','linkedFacility'],设备:['self','linkedFacility'],组合:['self','compositionMembers','linkedFacility'],系统:['self','compositionMembers','systemMembers','linkedFacility'],设施:['self','linkedFacility']}
    return GROUP_ROLES.filter(role=>(allowed[rootType] || []).includes(role.value))
  }
  const categoryMatches = (object, categoryId) => !categoryId || store.ancestors(state.categories, object.categoryId).some(row => row.id === categoryId)
  function rootIssue(rule, object, applicableStates = []) {
    if (!object) return '对象不存在'
    if (object.projectId !== PROJECT.id) return '对象不属于当前项目'
    if (typeOf(object) !== rule.rootType) return `需要${rule.rootType}对象`
    if (rule.rootType === '空间' && !CHECKABLE_SPACE_TYPES.includes(object.type)) return '空间巡检请选择具体房间、机房或公共区域'
    if (!categoryMatches(object, rule.categoryId)) return '分类不适用，请更换规则或对象'
    if (rule.roomUsage && object.usage !== rule.roomUsage) return `机房用途不适用：需要${rule.roomUsage}`
    if (rule.models.length && !rule.models.includes(object.model)) return '型号不适用，请核对规则变体'
    if (rule.states.length && !rule.states.includes(object.status)) return '运行工况不适用'
    if (applicableStates.length && typeOf(object) !== '空间' && !applicableStates.includes(object.status)) return '不在本计划适用运行状态内'
    if (typeOf(object) === '空间' && object.status !== '使用中') return '空间暂不使用，请核对范围'
    return ''
  }
  function objectSnapshot(object) { return { ...clone(object), rootType: typeOf(object), spacePath: store.spacePath(typeOf(object) === '空间' ? object.id : object.spaceId), categoryName: byId(state.categories, object.categoryId)?.name || '', compositionPath:typeOf(object) === '空间' ? [] : store.ancestors(state.assets,object.id).map(row=>({id:row.id,name:row.name})) } }
  function relatedSystems(root) {
    if (root.type === '专业系统') return [root]
    const ids = new Set()
    if (root.systemId) ids.add(root.systemId)
    if (typeOf(root) === '空间') {
      for (const row of state.assets.filter(asset=>asset.spaceId === root.id)) {
        if (row.type === '专业系统') ids.add(row.id)
        if (row.systemId) ids.add(row.systemId)
      }
    }
    return [...ids].map(id=>store.object(id)).filter(row=>row?.type === '专业系统' && row.projectId === root.projectId)
  }
  function preview(ruleOrId, rootIds, applicableStates = []) {
    const rule = typeof ruleOrId === 'string' ? byId(state.rules, ruleOrId) : ruleOrId
    const output = { points: [], issues: [], excluded: [], duplicates: [], roots:[], rule:null, itemCount: 0, objectCount: 0 }
    if (!rule) { output.issues.push('尚未选择有效规则'); return output }
    output.rule = {id:rule.id,name:rule.name,version:rule.version}
    if (!rootIds.length) output.issues.push('至少选择一个实际检查对象')
    if (new Set(rootIds).size !== rootIds.length) output.issues.push('检查范围不能重复选择同一对象')
    for (const rootId of [...new Set(rootIds)]) {
      const root = store.object(rootId), issue = rootIssue(rule, root, applicableStates)
      if (issue) { output.issues.push(`${root?.name || rootId}：${issue}`); output.excluded.push({ name: root?.name || rootId, reason: issue }); continue }
      output.roots.push(objectSnapshot(root))
      for (const group of rule.groups) {
        const candidates = [], roles=[...new Set([group.role,...(group.extraRoles || [])].map(role=>normalizedRole(role,rule.rootType)))]
        const add=(object,path,role,positionId='')=>{if(object)candidates.push({object,path,role,positionId})}
        for (const role of roles) {
          if (!matchingRoles(rule.rootType).some(option=>option.value === role)) { output.issues.push(`${group.name}：匹配方式与${rule.rootType}范围不适用`); continue }
          if (role === 'self') add(root,'当前对象自身',role)
          if (role === 'spaceEquipment') state.assets.filter(asset=>asset.spaceId === root.id).forEach(object=>add(object,'空间内设备',role))
          if (role === 'systemMembers') for (const system of relatedSystems(root)) store.assetMembers(system.id,'systemId',true).forEach(object=>add(object,`系统成员 · ${system.name}`,role))
          if (role === 'compositionMembers') {
            const combinations = root.type === '组合设备' ? [root] : typeOf(root) === '空间' ? state.assets.filter(asset=>asset.type === '组合设备' && asset.spaceId === root.id) : store.assetMembers(root.id,'systemId',true).filter(asset=>asset.type === '组合设备')
            for (const combination of combinations) store.assetMembers(combination.id,'parentId',true).forEach(object=>add(object,`组合下成员 · ${combination.name}`,role))
          }
          if (role === 'linkedFacility') {
            const directIds=store.facilityIds(root.id)
            const inspectionPosition=object=>typeOf(root) === '空间' && directIds.includes(object.id) ? root.id : ''
            for (const id of directIds) {
              const object=store.object(id)
              if (!object) { const reason=`${root.name} / ${group.name}：明确设施关联指向不存在对象 ${id}`; output.excluded.push({name:id,reason}); if(group.required)output.issues.push(reason) }
              else add(object,'当前对象明确设施关联',role,inspectionPosition(object))
            }
            if (group.includeSystemFacilities) for (const system of relatedSystems(root)) {
              for (const id of store.facilityIds(system.id)) { const object=store.object(id); if(object)add(object,`专业系统明确设施关联 · ${system.name}`,role,inspectionPosition(object)) }
              store.assetMembers(system.id,'systemId',true).filter(isFacility).forEach(object=>add(object,`专业系统设施成员 · ${system.name}`,role,inspectionPosition(object)))
            }
          }
        }
        const eligible=candidates.filter(({object})=>(!group.targetType || (group.targetType === '空间' ? typeOf(object) === '空间' : object.type === group.targetType)) && categoryMatches(object,group.categoryId))
        if (!eligible.length) {
          const reason = `${root.name} / ${group.name}：${group.required ? '待补充关键关系，必需组无匹配对象' : '可选组无匹配，已明确排除'}；请核对${roles.map(role=>GROUP_ROLES.find(option=>option.value === role)?.label || role).join('、')}及类型/分类条件`
          if (group.required) output.issues.push(reason)
          output.excluded.push({ name: group.name, reason }); continue
        }
        for (const {object,path,positionId} of eligible) {
          if (object.projectId !== root.projectId) { const reason=`${group.name} / ${object.name}：关联对象不属于同一项目`; output.excluded.push({name:object.name,reason}); if(group.required)output.issues.push(reason); continue }
          if ((group.models?.length && !group.models.includes(object.model)) || (group.states?.length && !group.states.includes(object.status))) { const reason=`${object.name} / ${group.name}：分组型号或运行工况不适用`; output.excluded.push({name:object.name,reason}); if(group.required)output.issues.push(reason); continue }
          if (applicableStates.length && typeOf(object) !== '空间' && !applicableStates.includes(object.status)) { const reason = `${object.name}：不在计划适用运行状态内`; output.excluded.push({ name: object.name, reason }); if (group.required) output.issues.push(reason); continue }
          const items = group.items.filter(item => {
            const applicable = (!item.models?.length || item.models.includes(object.model)) && (!item.states?.length || item.states.includes(object.status))
            if (!applicable) { const reason = `${object.name} / ${item.name}：型号或工况不适用，请核对规则变体`; output.excluded.push({ name: object.name, reason }); if (item.required) output.issues.push(reason) }
            return applicable
          })
          if (!items.length) { if (group.required) output.issues.push(`${object.name} / ${group.name}：没有可执行检查项`); continue }
          const spaceId = typeOf(object) === '空间' ? object.id : positionId || object.spaceId
          if (!spaceId || !byId(state.spaces, spaceId)) { output.issues.push(`${object.name}：尚无可确认的检查位置，请补充台账空间关系`); continue }
          let point = output.points.find(point => point.space.id === spaceId)
          if (!point) { point = { id: `point-${spaceId}`, space: objectSnapshot(store.object(spaceId)), groups: [] }; output.points.push(point) }
          let existing = point.groups.find(existing => existing.id === group.id && existing.object.id === object.id)
          if (existing) {
            const duplicatedItems = items.filter(item=>existing.items.some(old=>old.id === item.id)).length
            if (duplicatedItems) {
              let duplicate=output.duplicates.find(row=>row.pointId === point.id && row.groupId === group.id && row.objectId === object.id)
              if (!duplicate) { duplicate={pointId:point.id,pointName:point.space.name,groupId:group.id,groupName:group.name,objectId:object.id,objectName:object.name,paths:[...existing.matchPaths],removedItems:0}; output.duplicates.push(duplicate) }
              duplicate.removedItems+=duplicatedItems; if(!duplicate.paths.includes(path))duplicate.paths.push(path)
            }
            existing.items.push(...clone(items.filter(item=>!existing.items.some(old=>old.id === item.id))))
            if (!existing.matchPaths.includes(path)) existing.matchPaths.push(path)
            if (!existing.rootIds.includes(rootId)) existing.rootIds.push(rootId)
          } else point.groups.push({ id: group.id, name: group.name, rootId, rootIds:[rootId], role: group.role, matchPaths:[path], resultContext:point.id, object: objectSnapshot(object), items: clone(items) })
        }
      }
    }
    output.issues = [...new Set(output.issues)]
    output.itemCount = output.points.reduce((sum, point) => sum + point.groups.reduce((count, group) => count + group.items.length, 0), 0)
    output.objectCount = new Set(output.points.flatMap(point => point.groups.map(group => group.object.id))).size
    if (!output.itemCount && !output.issues.length) output.issues.push('没有有效检查项，不能生成空检查任务')
    return output
  }
  function signature(ruleId, rootIds, applicableStates = []) { return JSON.stringify({ rule: byId(state.rules, ruleId), roots: rootIds, applicableStates, expansion: preview(ruleId, rootIds, applicableStates) }) }
  function planIssues(plan, needsConfirmation = true) {
    const errors = [], rule = byId(state.rules, plan.ruleId)
    if (!trimmed(plan.name)) errors.push('计划名称必填')
    if (!rule || rule.status !== '已启用') errors.push('需绑定已启用的规则版本；停用规则不用于后续生成')
    const expansion = preview(plan.ruleId, plan.rootIds || [], plan.applicableStates || [])
    errors.push(...expansion.issues)
    if (needsConfirmation && plan.confirmation !== signature(plan.ruleId, plan.rootIds || [], plan.applicableStates || [])) errors.push('规则版本、对象资料或范围有变化，请重新展开并确认')
    if (!['每日', '每周', '每月', '固定间隔'].includes(plan.cycle)) errors.push('请选择周期方式')
    if (plan.cycle === '每周' && (!plan.weekDays?.length || plan.weekDays.some(day => day < 1 || day > 7))) errors.push('每周周期需选择有效星期')
    if (plan.cycle === '每月' && (!Number.isInteger(Number(plan.monthDay)) || Number(plan.monthDay) < 1 || Number(plan.monthDay) > 28)) errors.push('每月执行日为1—28日，避免不存在的日期')
    if (plan.cycle === '固定间隔' && (!Number.isInteger(Number(plan.intervalDays)) || Number(plan.intervalDays) < 1)) errors.push('固定间隔必须为正整数天')
    if (!validDate(plan.startDate)) errors.push('有效开始日期必填且必须为合法日期')
    if (plan.endDate && (!validDate(plan.endDate) || plan.endDate < plan.startDate)) errors.push('结束日期须合法且不能早于开始日期')
    if (!PEOPLE.some(person => person.id === plan.personId)) errors.push('启用前必须明确主执行人')
    if (!plan.slots?.length) errors.push('至少配置一个执行时段')
    const sorted = [...(plan.slots || [])].sort((a,b) => String(a.start || '').localeCompare(String(b.start || '')))
    sorted.forEach((slot, index) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) || slot.end <= slot.start) errors.push('每个时段须有合法开始 / 截止时间，截止晚于开始')
      if (index && sorted[index - 1].end > slot.start) errors.push('同一计划的时段不能重叠')
    })
    return [...new Set(errors)]
  }
  function savePlan(input, enable = false) {
    const draft = clone(input), old = byId(state.plans, draft.id)
    draft.name = trimmed(draft.name)
    requireValue(draft.name && draft.name.length <= 80, '计划名称必填且不超过80字')
    requireValue(!state.plans.some(plan => plan.id !== draft.id && plan.name === draft.name), '计划名称重复，请区分范围或班次')
    if (enable) { const issues = planIssues(draft); requireValue(!issues.length, issues.join('；')) }
    draft.id ||= nextId('plan'); draft.code ||= `PLAN-${state.serial}`
    draft.version = (old?.version || 0) + 1; draft.status = enable ? '已启用' : '草稿'
    if (draft.confirmation === signature(draft.ruleId, draft.rootIds, draft.applicableStates)) { draft.expansion = preview(draft.ruleId, draft.rootIds, draft.applicableStates); draft.ruleSnapshot = clone(byId(state.rules, draft.ruleId)); draft.confirmedAt = now() }
    else { draft.expansion = null; draft.ruleSnapshot = null; draft.confirmedAt = '' }
    draft.updatedAt = now(); audit('巡检计划', draft.id, `保存 V${draft.version} ${draft.status}，仅作用于未来任务`)
    return upsert(state.plans, draft)
  }
  function togglePlan(id) {
    const plan = byId(state.plans, id); requireValue(plan, '计划不存在')
    if (plan.status === '已启用') { plan.status = '已停用'; audit('巡检计划', id, '停用，历史任务与记录保留'); persist(); return }
    const issues = planIssues(plan); requireValue(!issues.length, issues.join('；'))
    plan.status = '已启用'; audit('巡检计划', id, '重新校验后启用，不补造历史任务'); persist()
  }
  function scheduledOn(plan, date) {
    if (date < plan.startDate || (plan.endDate && date > plan.endDate)) return false
    if (plan.cycle === '每周') return plan.weekDays.includes(new Date(`${date}T12:00:00+08:00`).getUTCDay() || 7)
    if (plan.cycle === '每月') return Number(date.slice(-2)) === Number(plan.monthDay)
    if (plan.cycle === '固定间隔') return Math.floor((Date.parse(date) - Date.parse(plan.startDate)) / 86400000) % Number(plan.intervalDays) === 0
    return true
  }
  function generateTask(planId, date, start) {
    const plan = byId(state.plans, planId); requireValue(plan?.status === '已启用', '仅已启用计划可以模拟生成任务')
    const issues = planIssues(plan); requireValue(!issues.length, issues.join('；'))
    requireValue(validDate(date) && date >= localDate(now()), '仅可模拟今天或未来合法日期，不补造过往日期任务')
    requireValue(scheduledOn(plan, date), '所选日期不在有效期或不符合周期')
    const slot = plan.slots.find(slot => slot.start === start); requireValue(slot, '请选择当前计划已配置时段')
    requireValue(!state.tasks.some(task => task.planId === planId && task.date === date && task.slot.start === start), '同一计划同一时段已存在任务，禁止重复生成')
    const task = makeTaskSnapshot(store, plan, date, slot, nextId('task'), now())
    state.tasks.push(task); audit('巡检任务', task.id, '人工点击模拟生成，未运行后台定时调度'); persist(); return task
  }
  function authorizedTask(id, personId) {
    const task = byId(state.tasks, id); requireValue(task, '任务不存在')
    requireValue(task.personId === personId && PEOPLE.some(person => person.id === personId), '仅本任务主执行人可以执行；演示身份请与任务责任人一致')
    requireValue(task.status !== '已完成', '已提交任务只读，一期不提供历史更正')
    return task
  }
  function startTask(id, personId) {
    const task = authorizedTask(id, personId)
    if (task.status === '待执行') { task.status = '进行中'; task.startedAt = now(); audit('巡检任务', id, '主执行人开始检查'); persist() }
    return task
  }
  function taskErrors(task, results = task.results, full = true) {
    const errors = [], entries = taskEntries(task)
    if (full && (!entries.length || !entries.some(entry => isResultFilled(entry.item, results[entry.key])))) errors.push({ key:'', message:'尚未填写任何检查结果，不能提交空检查任务' })
    for (const {group,item,key} of entries) {
      const result = results[key], label = `${group.object.name} / ${item.name}`
      if (!isResultFilled(item, result)) { if (full && item.required) errors.push({ key, message:`${label}：必检未填` }); continue }
      if (item.type === '数值' && !Number.isFinite(Number(result.value))) errors.push({ key, message:`${label}：请输入合法数值；超出参考值仍允许如实保存` })
      if (item.type === '状态' && !item.options.includes(result.value)) errors.push({ key, message:`${label}：请选择本检查项的有效状态` })
      if (trimmed(result.value).length > 1000 || trimmed(result.note).length > 1000) errors.push({ key, message:`${label}：文本 / 说明最多1000字` })
      if (full && evaluateItem(item, result) === '异常') {
        if (item.exceptionNote && !trimmed(result.note)) errors.push({ key, message:`${label}：异常说明必填，原始异常读数可保存` })
        if (item.exceptionPhoto && !result.photos?.length) errors.push({ key, message:`${label}：异常需要补充照片（仅保留在本地浏览器）` })
      }
    }
    return errors
  }
  function saveTaskDraft(id, results, personId) {
    const task = authorizedTask(id, personId); requireValue(task.status === '进行中', '请先开始检查')
    const errors = taskErrors(task, results, false); requireValue(!errors.length, errors.map(error => error.message).join('；'))
    const nextResults = {}
    for (const {point,group,item,key} of taskEntries(task)) {
      const supplied = results[key]
      if (!supplied || !isResultFilled(item, supplied)) continue
      const previous = task.results[key]
      const changed = !previous || JSON.stringify([previous.value,previous.note,previous.photos]) !== JSON.stringify([supplied.value,supplied.note || '',supplied.photos || []])
      nextResults[key] = { id:previous?.id || nextId('result'), taskId:task.id, pointId:point.id, objectId:group.object.id, itemId:item.id, value:supplied.value, note:supplied.note || '', photos:clone(supplied.photos || []), decision:evaluateItem(item,supplied), checkedBy:personId, checkedAt:changed ? now() : previous.checkedAt }
    }
    task.results = nextResults; audit('巡检结果', id, '本地暂存真实输入，未提交结果不形成正式记录'); persist(); return task
  }
  function submitTask(id, results, personId) {
    const task = authorizedTask(id, personId); requireValue(task.status === '进行中', '请先开始检查')
    const errors = taskErrors(task, results, true); requireValue(!errors.length, errors.map(error => error.message).join('；'))
    saveTaskDraft(id, results, personId)
    task.status = '已完成'; task.submittedAt = now(); audit('巡检任务', id, '提交完成，结果只读；完成不等于无异常'); persist(); return task
  }
  function taskSummary(task, results = task.results) {
    const entries = taskEntries(task), decisions = entries.filter(entry => isResultFilled(entry.item,results[entry.key])).map(entry => results[entry.key]?.decision || evaluateItem(entry.item, results[entry.key]))
    if (!decisions.length) return '未检查'
    if (decisions.includes('异常')) return '存在异常'
    if (entries.some(entry => entry.item.required && !isResultFilled(entry.item,results[entry.key]))) return '未检查'
    return decisions.includes('未自动判定') ? '未自动判定' : '未见异常'
  }
  function timeStatus(task, at = now()) { const late = Date.parse(task.submittedAt || at) > Date.parse(task.deadline); return late ? task.status === '已完成' ? '逾期完成' : '已超期' : '未超期' }
  function progress(task, results = task.results, pointId = '') {
    const entries = taskEntries(task).filter(entry => !pointId || entry.point.id === pointId), errors = taskErrors(task,results)
    const required = entries.filter(entry => entry.item.required), filled = entries.filter(entry => isResultFilled(entry.item,results[entry.key])).length
    return { filled, total:entries.length, requiredFilled:required.filter(entry => isResultFilled(entry.item,results[entry.key])).length, requiredTotal:required.length, complete:filled>0 && !errors.some(error => !error.key || entries.some(entry => entry.key === error.key)), completePoints:task.points.filter(point => { const pointEntries = taskEntries(task).filter(entry => entry.point.id === point.id); return pointEntries.some(entry => isResultFilled(entry.item,results[entry.key])) && !errors.some(error => !error.key || pointEntries.some(entry => entry.key === error.key)) }).length }
  }
  function records() {
    return state.tasks.filter(task => task.status === '已完成').flatMap(task => taskEntries(task).filter(entry => isResultFilled(entry.item,entry.result)).map(({point,group,item,result,key}) => ({ id:result.id, taskId:task.id, taskCode:task.code, taskName:task.planName, planId:task.planId, planVersion:task.planVersion, date:task.date, slotStart:task.slot.start, plannedAt:task.scheduledStart, submittedAt:task.submittedAt, ruleName:task.rule.name, ruleVersion:task.rule.version, ruleId:task.rule.id, groupId:group.id, groupName:group.name, pointId:point.id, point:point.space, object:group.object, item:clone(item), value:result.value, unit:item.unit, decision:result.decision, note:result.note, photos:result.photos, checkedBy:result.checkedBy, checkedByName:PEOPLE.find(person => person.id === result.checkedBy)?.name || result.checkedBy, checkedAt:result.checkedAt, key })))
  }
  function assetRecords(id, {includeChildren=false,from='',to='',decision=''} = {}) {
    requireValue((!from || validDate(from)) && (!to || validDate(to)) && (!from || !to || from <= to), '请选择合法日期范围，结束日期不能早于开始日期')
    const isChild=row=>{
      if (row.object.compositionPath?.some(parent=>parent.id === id && parent.id !== row.object.id)) return true
      const task=byId(state.tasks,row.taskId), objects=new Map(task.points.flatMap(point=>point.groups.map(group=>[group.object.id,group.object])))
      let parentId=row.object.parentId; const seen=new Set([row.object.id])
      while(parentId && !seen.has(parentId)) { if(parentId === id)return true;seen.add(parentId);parentId=objects.get(parentId)?.parentId }
      return false
    }
    return records().filter(row=>(row.object.id === id || (includeChildren && store.object(id)?.type === '组合设备' && isChild(row))) && (!from || (row.checkedAt && localDate(row.checkedAt) >= from)) && (!to || (row.checkedAt && localDate(row.checkedAt) <= to)) && (!decision || row.decision === decision)).sort((a,b)=>(b.checkedAt || '').localeCompare(a.checkedAt || '')||a.key.localeCompare(b.key))
  }
  return Object.assign(store, { validateRule, saveRule, toggleRule, typeOf, normalizedRole, matchingRoles, rootIssue, preview, signature, planIssues, savePlan, togglePlan, scheduledOn, generateTask, authorizedTask, startTask, taskErrors, saveTaskDraft, submitTask, taskSummary, timeStatus, progress, records, assetRecords })
}

function makeTaskSnapshot(store, plan, date, slot, id, generatedAt) {
  return { id, code: `TASK-${id.replace('task-', '')}`, planId: plan.id, planName: plan.name, planVersion: plan.version, date, slot: clone(slot), scheduledStart: `${date}T${slot.start}:00+08:00`, deadline: `${date}T${slot.end}:00+08:00`, personId: plan.personId, personName: PEOPLE.find(person => person.id === plan.personId)?.name, rule: clone(plan.ruleSnapshot), points: clone(plan.expansion.points), results: {}, status: '待执行', startedAt: '', submittedAt: '', generatedAt, seeded: false }
}

export function createDemoState() {
  const seed = createEquipmentSeed(); seed.rules = createInspectionRules()
  const store = createJointStore(seed, { clock: () => new Date('2026-10-29T00:00:00Z') })
  const definitions = [
    ['plan-boiler', '锅炉运行抄表 · 多时段', 'rule-boiler', ['asset-boiler-1', 'asset-boiler-2'], [{start:'08:00',end:'09:00'}, {start:'10:00',end:'11:00'}, {start:'14:00',end:'15:00'}]],
    ['plan-boiler-room', '锅炉房综合检查', 'rule-boiler-room', ['space-boiler'], [{start:'09:00',end:'11:00'}]],
    ['plan-power', '保障楼多楼层配电巡检', 'rule-power', ['space-power-b1','space-power-f1','space-power-f2'], [{start:'09:00',end:'12:00'}]],
    ['plan-air', '压缩空气机房检查', 'rule-air', ['space-air'], [{start:'10:00',end:'12:00'}]]
  ]
  definitions.forEach(([id,name,ruleId,rootIds,slots], index) => {
    const plan = {id,code:`PLAN-00${index+1}`,name,ruleId,rootIds,cycle:'每日',weekDays:[1],monthDay:1,intervalDays:1,slots,startDate:'2026-10-01',endDate:'2027-12-31',personId:'person-01',applicableStates:[],notes:'稳定的本地演示样例；未配置真实后台调度。',confirmation:store.signature(ruleId,rootIds,[])}
    store.savePlan(plan,true)
  })
  const incomplete = { ...clone(store.state.plans[1]), id:'plan-incomplete', code:'PLAN-005', name:'关系待补充 · 不能启用', rootIds:['space-boiler-incomplete'], confirmation:'' }
  store.savePlan(incomplete,false)
  // Built-in historical samples are visibly labelled; user-triggered generation never backdates.
  const boilerPlan = store.byId(store.state.plans,'plan-boiler')
  for (let index = 0; index < 2; index++) {
    const task = makeTaskSnapshot(store,boilerPlan,'2026-10-28',boilerPlan.slots[index],`task-seed-boiler-${index+1}`,'2026-10-28T00:00:00+08:00')
    task.seeded = true; task.status = '已完成'; task.startedAt = `2026-10-28T${index===0?'08:05':'10:05'}:00+08:00`; task.submittedAt = `2026-10-28T${index===0?'08:20':'10:20'}:00+08:00`
    for (const entry of taskEntries(task)) {
      const second = entry.group.object.id === 'asset-boiler-2'
      const value = entry.item.id === 'item-pressure' ? (index===1 && second ? 0.92 : second ? 0.65 : 0.58) : entry.item.id === 'item-temperature' ? (second ? 150+index*5 : 140+index*3) : (second ? 220+index*12 : 210+index*10)
      task.results[entry.key] = { id:`result-seed-${index}-${entry.group.object.id}-${entry.item.id}`, taskId:task.id, pointId:entry.point.id, objectId:entry.group.object.id, itemId:entry.item.id, value, note:index===1 && second && entry.item.id==='item-pressure'?'模拟样本：现场读数0.92 MPa，已报告值班负责人；按批准预案处置，后续处理未在本原型联动。':'', photos:[], decision:evaluateItem(entry.item,{value}), checkedBy:'person-01', checkedAt:task.submittedAt }
    }
    store.state.tasks.push(task)
  }
  for (const [planId,id] of [['plan-boiler-room','task-seed-room'],['plan-power','task-seed-power'],['plan-air','task-seed-air']]) {
    const plan = store.byId(store.state.plans,planId), task=makeTaskSnapshot(store,plan,'2026-10-29',plan.slots[0],id,'2026-10-29T00:00:00+08:00')
    task.seeded=true;store.state.tasks.push(task)
  }
  return clone(store.state)
}

export function migrateDemoState(snapshot) {
  const state = clone(snapshot), notices = []
  let changed = false
  const seed = createEquipmentSeed()
  if ((state.demoRevision || 1) < 2) {
  for (const collection of ['categories','spaces','assets']) {
    for (const sample of seed[collection].filter(row=>REVISION_SAMPLE_IDS[collection].includes(row.id))) {
      if (state[collection].some(row=>row.id === sample.id)) continue
      const collision = state[collection].some(row=>row.code?.toLowerCase() === sample.code.toLowerCase() || (row.name === sample.name && (collection === 'assets' || row.parentId === sample.parentId)))
      const validParent = collection !== 'categories' && collection !== 'spaces' || !sample.parentId || state[collection].some(row=>row.id === sample.parentId)
      const validAsset = collection !== 'assets' || (state.spaces.some(row=>row.id === sample.spaceId) && isAssetCategory(state.categories, sample.categoryId) && state.categories.some(row=>row.id === sample.categoryId && row.enabled))
      if (collision || !validParent || !validAsset) { notices.push(`演示样例“${sample.name}”未补入：存在编码 / 名称冲突或依赖待补充；已有资料保留。`); continue }
      state[collection].push(clone(sample))
    }
  }
  state.demoRevision = 2
  changed = true
  }
  if (!state.matchingDemoRevision) {
    const sample = createInspectionRules().find(rule=>rule.id === 'rule-boiler-room-daily')
    if (!state.rules.some(rule=>rule.id === sample.id)) {
      if (state.rules.some(rule=>rule.code === sample.code || rule.name === sample.name)) notices.push('锅炉房日常规则样例未补入：已有同编号或名称规则，原有版本和历史记录保留。')
      else state.rules.push(clone(sample))
    }
    state.matchingDemoRevision = 1; changed = true
  }
  return { state, notices, changed }
}

let browserStorage = null, restored = null, restoreWarning = ''
try {
  if (typeof window !== 'undefined') {
    browserStorage = window.localStorage
    const raw = browserStorage.getItem(STORAGE_KEY)
    if (raw) { const parsed = JSON.parse(raw); if (parsed.schema === 1 && ['categories','spaces','assets','relations','rules','plans','tasks','audits'].every(key => Array.isArray(parsed[key])) && Number.isFinite(parsed.serial)) restored = parsed; else restoreWarning = '本模块本地数据版本不匹配，已载入演示样例；原存储未主动删除。' }
  }
} catch { restoreWarning = '本模块本地数据暂不可读取，当前使用内存演示；原存储未主动删除。' }
const migrated = migrateDemoState(restored || createDemoState())
export const jointStore = createJointStore(migrated.state, { storage: browserStorage })
if (migrated.changed && browserStorage) jointStore.persist()
if (migrated.notices.length) jointStore.notice.catalog = migrated.notices.join('；')
if (restoreWarning) jointStore.notice.persistence = restoreWarning
