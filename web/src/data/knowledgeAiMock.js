import { reactive, computed, watch } from 'vue'
import { kbEntries, KB_DOMAINS } from './knowledgeBase.js'
import { meaningfulFragment } from './knowledgeAiPresentation.js'

export const MATERIAL_TYPES = ['医工委专家知识', '工程基本资料', '竣工图纸资料', '设备设施台账资料', '机电系统技术资料', '医疗专项系统资料', '消防与安全资料', '检测验收与合格证明', '组织联络与缺陷期资料']
export const DOMAINS = KB_DOMAINS
export const PROJECTS = [{ id: 'A', name: '项目A（演示）' }, { id: 'B', name: '项目B（演示）' }]
export const ROLES = ['资料维护人员', '专业审核人员', '只读访客']
export const ELEMENT_KINDS = ['事实', '概念', '实体关系', '候选规则']
export const RULE_TYPES = ['阈值', '预测分析预警']
export const RULE_OPERATORS = ['>', '>=', '<', '<=', '=', '!=']
export const MOCK_RULE_NOTICE = 'Mock示例：阈值、案例和判断仅用于前端演示，未经医院设备安全标准验证；不代表真实模型推理或专业诊断。'
export const demoContext = reactive({ role: ROLES[0], project: '' })
export const KNOWLEDGE_STORAGE_KEY = 'ezhiwei:knowledge-ai:v1:state'
const now = () => new Date().toLocaleString('sv-SE')
const clone = (value) => JSON.parse(JSON.stringify(value))
export const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
// Only strip known formatting tags from the trusted legacy seed; keep comparisons such as <1μS/cm.
const seedText = (html) => html.replace(/<br\s*\/?\s*>|<\/p>/gi, '\n').replace(/<\/?(?:p|strong|b|em|span)(?:\s[^>]*)?>/gi, '').trim()
export function extractFragments(body) {
  return body.split(/\n+|(?<=[。；！？])/u).map(text => text.trim()).filter(Boolean).map((text, i) => ({
    id: i + 1, text, sourceText: text, origin: '正文原文截取（模拟）',
    kind: /[≤≥<>]|阈值|应维持/.test(text) ? '候选规则' : /→|导致|关联/.test(text) ? '实体关系' : /是指|定义|规范/.test(text) ? '概念' : '事实',
  }))
}
function validSnapshot(value) {
  if (value?.schema !== 1 || !Array.isArray(value.documents)) return false
  // Optional collections keep first-round session snapshots compatible.
  for (const [key, prefix] of [['thresholdRules', 'TR'], ['reasoningRules', 'RR']]) {
    if (value[key] === undefined) continue
    const ruleIds = new Set()
    if (!Array.isArray(value[key]) || !value[key].every(r => {
      if (!r || !new RegExp(`^${prefix}-\\d+$`).test(r.id) || ruleIds.has(r.id) || typeof r.enabled !== 'boolean' || !Array.isArray(r.versions) || !r.versions.length) return false
      ruleIds.add(r.id)
      const numbers = r.versions.map(v => v?.number)
      return new Set(numbers).size === numbers.length && numbers.includes(r.currentVersion) && r.versions.every(v =>
        Number.isInteger(v.number) && v.number > 0 && ['name', 'device'].every(k => typeof v[k] === 'string' && v[k].trim()) && DOMAINS.includes(v.domain) &&
        ['平台通用', '项目专属'].includes(v.scope) && (v.scope !== '项目专属' || PROJECTS.some(p => p.id === v.project)) &&
        (key === 'thresholdRules' ? RULE_TYPES.includes(v.type) && RULE_OPERATORS.includes(v.operator) && Number.isFinite(v.value) && ['metric', 'unit', 'sourceId', 'applicability', 'start', 'end'].every(k => typeof v[k] === 'string') && Number.isFinite(Date.parse(v.start)) && Number.isFinite(Date.parse(v.end)) :
          ['keywords', 'thresholdIds', 'knowledgeIds'].every(k => Array.isArray(v[k]) && v[k].every(x => typeof x === 'string')) && ['scenario', 'steps', 'advice', 'safety'].every(k => typeof v[k] === 'string')))
    })) return false
  }
  const ids = new Set()
  return value.documents.every(d => {
    if (!/^KB-\d+$/.test(d?.id) || ids.has(d.id) || !Array.isArray(d.versions) || !d.versions.length) return false
    ids.add(d.id)
    const numbers = new Set()
    return d.versions.every(v => {
      if (!Number.isInteger(v?.number) || v.number < 1 || numbers.has(v.number)) return false
      numbers.add(v.number)
      return ['title', 'body', 'creator', 'updatedAt', 'source'].every(k => typeof v[k] === 'string') &&
        MATERIAL_TYPES.includes(v.type) && DOMAINS.includes(v.domain) &&
        ['平台通用', '项目专属'].includes(v.scope) && (v.scope !== '项目专属' || PROJECTS.some(p => p.id === v.project)) &&
        ['草稿', '待审核', '已发布', '已归档'].includes(v.status) &&
        ['未加工', '加工中', '加工失败', '待校验', '可检索'].includes(v.processing) &&
        Array.isArray(v.reviews) && Array.isArray(v.fragments) &&
        v.fragments.every(f => f && typeof f.text === 'string' && Boolean(f.text.trim()) && v.body.includes(f.text) && ELEMENT_KINDS.includes(f.kind))
    }) && (d.currentVersion === null || numbers.has(d.currentVersion))
  })
}
export function createKnowledgeStore(seeds = kbEntries, storage = null) {
  const storageState = reactive({ error: '', message: storage ? '当前标签页会话保存：刷新或热更新后保留资料；不保证新标签或关闭会话后保留。' : '会话存储不可用：仅内存演示，刷新或热更新会丢失新增资料。' })
  let restored = null, restoredRules = {}
  if (storage) {
    try {
      const raw = storage.getItem(KNOWLEDGE_STORAGE_KEY)
      if (raw !== null) {
        const snapshot = JSON.parse(raw)
        if (!validSnapshot(snapshot)) throw new Error('invalid snapshot')
        restored = snapshot.documents
        restoredRules = snapshot
        // A timer cannot survive reinitialization; require an explicit retry.
        restored.forEach(d => d.versions.forEach(v => {
          if (v.processing === '加工中') {
            v.processing = '加工失败'; v.validation = '未校验'; v.fragments = []
            v.error = '页面重新初始化中断了模拟加工，请重新加工'
          }
        }))
      }
    } catch {
      storageState.error = '无法恢复会话资料，暂显示初始种子；原缓存保留且不覆盖，请保留当前页面交由维护人员排查。'
    }
  }
  const documents = reactive(restored || seeds.map(e => ({
    id: `KB-${String(e.id).padStart(3, '0')}`, legacyId: e.id, fav: e.fav, currentVersion: 1, archived: false,
    versions: [{ number: 1, title: e.title, type: MATERIAL_TYPES[0], domain: e.domain === '安防' ? '安防监控' : e.domain,
      scope: '平台通用', project: '', device: '', source: '原有专家知识Mock', sourceNote: '预置演示已发布且可检索；未经过真实专业审核',
      body: seedText(e.content), attachment: null, expert: e.expert, desc: e.desc, creator: e.expert, updatedAt: e.time,
      status: '已发布', processing: '可检索', validation: '预置演示确认', processedAt: e.time,
      fragments: extractFragments(seedText(e.content)), rejection: '', reviews: [], seed: true }],
  })))
  const thresholdRules = reactive(restoredRules.thresholdRules || [])
  const reasoningRules = reactive(restoredRules.reasoningRules || [])
  let sequence = Math.max(0, ...documents.map(d => Number(d.id.slice(3))))
  const stopPersistence = storage && !storageState.error ? watch([documents, thresholdRules, reasoningRules], () => {
    try {
      storage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify({ schema: 1, documents, thresholdRules, reasoningRules }))
      storageState.error = ''
    } catch {
      storageState.error = '会话资料保存失败，当前更改仅存内存；请勿刷新，并检查浏览器存储是否可用。'
    }
  }, { deep: true, flush: 'sync' }) : () => {}
  const getDocument = id => documents.find(d => d.id === id)
  const latest = d => d?.versions[d.versions.length - 1]
  const versionOf = (id, number) => getDocument(id)?.versions.find(v => v.number === Number(number))
  function requireRole(role, expected) {
    if (role !== expected) throw new Error(`请切换为${expected}（仅演示职责）`)
  }
  function draft(id, number, role) {
    requireRole(role, ROLES[0])
    const d = getDocument(id), v = versionOf(id, number)
    if (!d || d.archived || !v || latest(d) !== v || v.status !== '草稿' || v.processing === '加工中') throw new Error('只能操作未归档、未在加工中的最新草稿')
    return v
  }
  function validateInput(input) {
    if (!input.title?.trim() || !MATERIAL_TYPES.includes(input.type) || !DOMAINS.includes(input.domain) || !input.source?.trim()) throw new Error('请填写标题、资料类型、专业系统和资料来源')
    if (!['平台通用', '项目专属'].includes(input.scope)) throw new Error('请选择知识范围')
    if (input.scope === '项目专属' && !PROJECTS.some(p => p.id === input.project)) throw new Error('项目专属资料必须选择所属项目')
    if (!input.body?.trim() && !input.attachment?.name) throw new Error('请填写正文或登记附件')
  }
  function save(input, id, role) {
    requireRole(role, ROLES[0]); validateInput(input)
    let d = id ? getDocument(id) : null
    if (id && !d) throw new Error('资料不存在')
    const previous = d && latest(d)
    if (d?.archived || previous?.status === '待审核' || previous?.processing === '加工中') throw new Error('已归档、待审核或加工中的资料不可编辑')
    const fields = Object.fromEntries(['title', 'type', 'domain', 'scope', 'project', 'device', 'source', 'sourceNote', 'body', 'attachment', 'expert', 'desc'].map(k => [k, clone(input[k] ?? '')]))
    fields.title = fields.title.trim(); fields.body = fields.body.trim()
    if (fields.scope === '平台通用') fields.project = ''
    const number = previous ? previous.number + (previous.status === '已发布' ? 1 : 0) : 1
    const v = { ...fields, number, creator: previous?.creator || '演示资料维护员', updatedAt: now(), status: '草稿', processing: '未加工', validation: '未校验', processedAt: '', fragments: [], rejection: previous?.rejection || '', reviews: previous?.status === '已发布' ? [] : clone(previous?.reviews || []), seed: false }
    if (!d) {
      d = { id: `KB-${String(++sequence).padStart(3, '0')}`, currentVersion: null, archived: false, fav: false, versions: [v] }
      documents.unshift(d)
    } else if (previous.status === '已发布') d.versions.push(v)
    else d.versions.splice(d.versions.length - 1, 1, v)
    return d.id
  }
  async function process(id, number, role, simulateFailure = false) {
    const v = draft(id, number, role)
    v.processing = '加工中'; v.validation = '未校验'; v.fragments = []; v.error = ''; v.processedAt = now()
    await new Promise(resolve => setTimeout(resolve, 450))
    if (simulateFailure || !v.body.trim()) {
      v.processing = '加工失败'; v.error = simulateFailure ? '模拟加工失败，可重新加工' : '只有附件登记，没有可用正文；本原型不执行OCR或附件解析'
      return false
    }
    v.fragments = extractFragments(v.body); v.processing = '待校验'; v.updatedAt = now()
    return true
  }
  function confirm(id, number, fragments, role) {
    const v = draft(id, number, role)
    if (v.processing !== '待校验') throw new Error('请先完成模拟加工')
    if (!fragments.length || fragments.some(f => !f.text.trim() || !v.body.includes(f.text.trim()) || !ELEMENT_KINDS.includes(f.kind))) throw new Error('每个片段必须是正文中可核对的非空原文；请从正文重新截取或补充')
    v.fragments = fragments.map((f, i) => ({ id: i + 1, kind: f.kind, text: f.text.trim(), sourceText: f.text.trim(), origin: '人工校验的正文摘录（模拟）' }))
    v.processing = '可检索'; v.validation = '人工已确认（模拟）'; v.updatedAt = now()
  }
  function submit(id, role) {
    const d = getDocument(id), v = draft(id, latest(d)?.number, role)
    if (v.processing !== '可检索') throw new Error('请先加工并完成人工校验，再提交审核')
    v.status = '待审核'; v.updatedAt = now()
  }
  function review(id, approve, reason, role) {
    requireRole(role, ROLES[1])
    const d = getDocument(id), v = d && latest(d)
    if (!v || d.archived || v.status !== '待审核') throw new Error('仅可审核未归档的待审核资料')
    if (!approve && !reason?.trim()) throw new Error('请填写退回原因')
    if (approve && v.processing !== '可检索') throw new Error('该版本尚未完成人工校验')
    v.reviews.push({ at: now(), by: '演示专业审核员', result: approve ? '确认发布' : '退回草稿', reason: approve ? '' : reason.trim() })
    v.status = approve ? '已发布' : '草稿'; v.rejection = approve ? '' : reason.trim(); v.updatedAt = now()
    if (approve) d.currentVersion = v.number
  }
  function archive(id, role) {
    requireRole(role, ROLES[1])
    const d = getDocument(id)
    if (!d || d.archived || !d.currentVersion || latest(d).processing === '加工中') throw new Error('只能归档已有发布版本且未在加工中的资料')
    d.archived = true; d.currentVersion = null
    d.versions.forEach(v => { v.status = '已归档'; v.updatedAt = now() })
  }
  function canAccess(v, project, role) {
    // Demo visitors only see platform knowledge; both operating roles can access A/B in a matching context.
    return ROLES.includes(role) && (v.scope === '平台通用' || (role !== ROLES[2] && Boolean(project) && v.project === project))
  }
  function search(question, domain, project, role, limit = 6) {
    const clean = question.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    if (clean.length < 2) return []
    const tokens = new Set(Array.from({ length: clean.length - 1 }, (_, i) => clean.slice(i, i + 2)))
    const selectedDomain = domain === '安防' ? '安防监控' : domain
    const results = []
    for (const d of documents) {
      const v = versionOf(d.id, d.currentVersion)
      if (d.archived || !v || v.status !== '已发布' || v.processing !== '可检索' || !canAccess(v, project, role) || (selectedDomain && v.domain !== selectedDomain)) continue
      for (const f of v.fragments) {
        if (!meaningfulFragment(f.text)) continue
        const text = (v.title + f.text).toLowerCase()
        const score = [...tokens].filter(t => text.includes(t)).length
        if (score) results.push({ documentId: d.id, version: v.number, title: v.title, type: v.type, domain: v.domain, scope: v.scope, project: v.project, fragmentId: f.id, text: f.text, score })
      }
    }
    const ranked = results.sort((a, b) => b.score - a.score || a.documentId.localeCompare(b.documentId) || a.fragmentId - b.fragmentId)
    // Equal-score fragments share the six slots across documents. A title match
    // repeated on every fragment of an older document must not hide other sources.
    const occurrences = new Map()
    return ranked.map((hit, order) => {
      const key = `${hit.score}:${hit.documentId}`
      const occurrence = occurrences.get(key) || 0
      occurrences.set(key, occurrence + 1)
      return { hit, order, occurrence }
    }).sort((a, b) => b.hit.score - a.hit.score || a.occurrence - b.occurrence || a.order - b.order)
      .slice(0, limit).map(({ hit }) => hit)
  }
  // Rules share this store and the same session snapshot with the approved knowledge flow.
  const currentRule = r => r?.versions.find(v => v.number === r.currentVersion)
  const ruleById = (kind, id) => (kind === 'threshold' ? thresholdRules : reasoningRules).find(r => r.id === id)
  const normalized = text => String(text || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '')
  const normalizedUnit = text => String(text || '').normalize('NFKC').replace(/\s+/g, '')
  const same = (a, b) => normalized(a) === normalized(b)
  const inTime = (v, at = new Date()) => new Date(v.start).getTime() <= new Date(at).getTime() && new Date(at).getTime() <= new Date(v.end).getTime()
  const scopeCovers = (source, target) => source.scope === '平台通用' || (target.scope === '项目专属' && target.project === source.project)
  function effectiveKnowledge(project, role = demoContext.role, domain = '') {
    return documents.flatMap(d => {
      const v = versionOf(d.id, d.currentVersion)
      return !d.archived && v?.status === '已发布' && v.processing === '可检索' && canAccess(v, project, role) && (!domain || v.domain === domain) ? [{ documentId: d.id, ...v }] : []
    })
  }
  function requireRuleEditor(role) {
    if (!ROLES.slice(0, 2).includes(role)) throw new Error('只读访客不能维护规则（仅演示职责）')
  }
  function validateRuleBase(input) {
    if (!input.name?.trim() || !input.device?.trim() || !DOMAINS.includes(input.domain)) throw new Error('请填写规则名称、专业系统及设备类别')
    if (!['平台通用', '项目专属'].includes(input.scope) || (input.scope === '项目专属' && !PROJECTS.some(p => p.id === input.project))) throw new Error('请选择适用范围及所属项目')
  }
  function ruleFields(input, keys) {
    const fields = Object.fromEntries(keys.map(k => [k, typeof input[k] === 'string' ? input[k].trim() : clone(input[k] ?? '')]))
    if (fields.scope === '平台通用') fields.project = ''
    return fields
  }
  function saveRuleVersion(collection, prefix, fields, id) {
    let record = id && collection.find(r => r.id === id)
    if (id && !record) throw new Error('规则不存在')
    const version = { ...fields, number: record ? Math.max(...record.versions.map(v => v.number)) + 1 : 1, updatedAt: now(), mock: true }
    if (record) {
      record.versions.push(version); record.currentVersion = version.number
    } else {
      const sequence = Math.max(0, ...collection.map(r => Number(r.id.slice(3)))) + 1
      record = { id: `${prefix}-${String(sequence).padStart(3, '0')}`, currentVersion: 1, enabled: false, versions: [version] }
      collection.unshift(record)
    }
    return record.id
  }
  function saveThreshold(input, id, role = demoContext.role) {
    requireRuleEditor(role); validateRuleBase(input)
    if (!RULE_TYPES.includes(input.type) || !input.metric?.trim() || !input.unit?.trim() || !RULE_OPERATORS.includes(input.operator) || input.value == null || !String(input.value).trim() || !Number.isFinite(Number(input.value))) throw new Error('请填写规则类型、指标、判断条件、有限阈值及单位')
    if (!Number.isFinite(Date.parse(input.start)) || !Number.isFinite(Date.parse(input.end)) || Date.parse(input.start) > Date.parse(input.end)) throw new Error('请设置有效的起止时间，结束时间不得早于开始时间')
    if (!input.applicability?.trim()) throw new Error('请填写适用说明，并说明阈值为人工配置的Mock示例')
    const source = effectiveKnowledge(input.project, role, input.domain).find(v => v.documentId === input.sourceId)
    if (!source || !scopeCovers(source, input)) throw new Error('来源须为同专业、范围兼容的已发布可检索资料')
    return saveRuleVersion(thresholdRules, 'TR', { ...ruleFields(input, ['name', 'type', 'domain', 'device', 'metric', 'operator', 'unit', 'scope', 'project', 'sourceId', 'applicability', 'start', 'end']), value: Number(input.value), sourceVersion: source.number }, id)
  }
  function eligibleThresholds({ domain, device, project = '', role = demoContext.role, at = new Date() } = {}) {
    return thresholdRules.flatMap(r => {
      const v = currentRule(r)
      return r.enabled && v && inTime(v, at) && canAccess(v, project, role) && (!domain || v.domain === domain) && (!device || same(v.device, device)) ? [{ id: r.id, ...v }] : []
    })
  }
  function saveReasoning(input, id, role = demoContext.role) {
    requireRuleEditor(role); validateRuleBase(input)
    const keywords = [...new Set((Array.isArray(input.keywords) ? input.keywords : String(input.keywords || '').split(/[，,\n]/)).map(k => k.trim()).filter(Boolean))]
    if (!keywords.length || ['scenario', 'steps', 'advice', 'safety'].some(k => !input[k]?.trim())) throw new Error('请填写场景、触发关键词、核实步骤、建议及安全提示')
    const thresholdIds = [...new Set(input.thresholdIds || [])], knowledgeIds = [...new Set(input.knowledgeIds || [])]
    if (!thresholdIds.length || !knowledgeIds.length) throw new Error('请关联至少一条当前有效阈值规则和一份已发布知识')
    const available = eligibleThresholds({ domain: input.domain, device: input.device, project: input.project, role })
    if (thresholdIds.some(id => !available.some(v => v.id === id && scopeCovers(v, input)))) throw new Error('关联阈值须已启用、在有效时间内、专业/设备及项目范围兼容')
    const knowledge = effectiveKnowledge(input.project, role, input.domain)
    if (knowledgeIds.some(id => !knowledge.some(v => v.documentId === id && scopeCovers(v, input)))) throw new Error('关联知识须为已发布可检索且范围兼容的当前版本')
    // Store stable IDs only. Numeric values and effective versions are resolved on each execution.
    return saveRuleVersion(reasoningRules, 'RR', { ...ruleFields(input, ['name', 'domain', 'device', 'scope', 'project', 'scenario', 'steps', 'advice', 'safety']), keywords, thresholdIds, knowledgeIds }, id)
  }
  function setRuleEnabled(kind, id, enabled, role = demoContext.role) {
    requireRuleEditor(role)
    const r = ruleById(kind, id)
    if (!r) throw new Error('规则不存在')
    r.enabled = Boolean(enabled)
  }
  const criterion = v => JSON.stringify([v.operator, v.value, normalizedUnit(v.unit)])
  function thresholdConflicts(id, { project = '', role = demoContext.role, at = new Date() } = {}) {
    const r = ruleById('threshold', id), v = currentRule(r)
    if (!v || !r.enabled || !inTime(v, at) || !canAccess(v, project, role)) return []
    return eligibleThresholds({ domain: v.domain, device: v.device, project, role, at }).filter(other => other.id !== id && same(other.metric, v.metric) && criterion(other) !== criterion(v))
  }
  function knowledgeCitations(ids, context) {
    return effectiveKnowledge(context.project, context.role, context.domain).filter(v => ids.includes(v.documentId)).flatMap(v => v.fragments.map(f => ({ documentId: v.documentId, version: v.number, title: v.title, type: v.type, fragmentId: f.id, text: f.text })))
  }
  function measure(text, metric, unit) {
    // Require an explicit reading, never interpret a limit/comparison as a measured value.
    const escaped = normalized(metric).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(?=${escaped}(?:实测|测得|测量值|读数|为|是|:|=)+(-?\\d+(?:\\.\\d+)?)([^\\s，。；、,;？?！!）)]+))`, 'giu')
    const hits = [...String(text).normalize('NFKC').replace(/\s+/g, '').matchAll(re)]
    if (hits.length !== 1) return { valid: false, message: hits.length ? '同一指标出现多个读数，请提供唯一读数' : '未提供明确实测值；不能宣称超阈，请填写“指标名称 实测数值 单位”' }
    const suffix = hits[0][2], expected = normalizedUnit(unit)
    // A unit must end at punctuation, a CJK sentence, or end of input; no automatic conversions.
    if (!suffix.startsWith(expected) || /^[a-zA-Z/%μµ°℃0-9]/u.test(suffix.slice(expected.length))) return { valid: false, message: `单位不匹配，请提供 ${unit}；本原型不换算单位` }
    return { valid: true, value: Number(hits[0][1]), unit }
  }
  function runRules(question, context = {}) {
    const { project = '', role = demoContext.role, at = new Date(), reasoningId = '', measurementText = question } = context
    let domain = context.domain === '安防' ? '安防监控' : context.domain || '', device = context.device?.trim() || ''
    const q = normalized(question)
    let matches = reasoningRules.flatMap(r => {
      const v = currentRule(r)
      return r.enabled && v && (!reasoningId || r.id === reasoningId) && canAccess(v, project, role) && (!domain || v.domain === domain) && v.keywords.some(k => q.includes(normalized(k))) ? [{ id: r.id, ...v }] : []
    })
    if (!domain && new Set(matches.map(v => v.domain)).size === 1) domain = matches[0].domain
    if (!device) {
      const explicit = [...new Set(matches.filter(v => q.includes(normalized(v.device))).map(v => v.device))]
      if (explicit.length === 1) device = explicit[0]
    }
    const result = { notice: MOCK_RULE_NOTICE, domain, device, project, evaluatedAt: new Date(at).toISOString(), configs: [], decisions: [], knowledge: [], gaps: [], summary: '' }
    if (!matches.length) { result.summary = '未匹配到当前启用且适用的推理规则，不能形成规则判断。'; return result }
    if (!domain || !device) { result.summary = '专业或设备类别不明确，请选择专业并在问题中写明设备类别；不能形成规则判断。'; return result }
    matches = matches.filter(v => v.domain === domain && same(v.device, device))
    if (!matches.length) { result.summary = '当前设备类别没有适用的推理规则，不能形成规则判断。'; return result }
    const ctx = { domain, device, project, role, at }, eligible = eligibleThresholds(ctx)
    const ruleCitation = v => {
      const source = knowledgeCitations([v.sourceId], ctx)
      return { ...clone(v), source: source[0] || null, sourceAvailable: Boolean(source.length) }
    }
    result.configs = clone(matches)
    const linked = [...new Set(matches.flatMap(v => v.thresholdIds))]
    const requiredKnowledge = [...new Set(matches.flatMap(v => v.knowledgeIds))]
    for (const id of linked) {
      if (!eligible.some(v => v.id === id)) result.gaps.push(`${id} 已停用、失效或不适用，本次不作为生效依据`)
    }
    result.knowledge = knowledgeCitations(requiredKnowledge, ctx)
    for (const id of requiredKnowledge) {
      if (!result.knowledge.some(s => s.documentId === id)) result.gaps.push(`${id} 无当前已发布、可检索且有权限的知识版本`)
    }
    const metrics = [...new Set(eligible.filter(v => linked.includes(v.id)).map(v => normalized(v.metric)))]
    for (const metric of metrics) {
      // Inspect all applicable standards for this metric, including unlinked conflicts.
      const standards = eligible.filter(v => normalized(v.metric) === metric)
      const rules = standards.map(ruleCitation)
      const decision = { metric: standards[0].metric, rules, status: '', message: '' }
      if (new Set(standards.map(criterion)).size > 1) {
        decision.status = 'conflict'; decision.message = '阈值冲突：存在多个不同判断标准，需专业人员核实；未选择唯一阈值或结论。'
      } else if (rules.some(r => !r.sourceAvailable) || requiredKnowledge.some(id => !result.knowledge.some(s => s.documentId === id))) {
        decision.status = 'insufficient'; decision.message = '关联知识或规则来源不可用，不能形成确定结论。'
      } else {
        const reading = measure(measurementText, decision.metric, standards[0].unit)
        decision.measurement = reading
        if (!reading.valid) { decision.status = 'missing'; decision.message = reading.message }
        else {
          const v = standards[0], x = reading.value
          const triggered = { '>': x > v.value, '>=': x >= v.value, '<': x < v.value, '<=': x <= v.value, '=': x === v.value, '!=': x !== v.value }[v.operator]
          decision.status = triggered ? 'triggered' : 'not-triggered'
          decision.message = `输入读数 ${x}${v.unit} ${triggered ? '满足' : '不满足'} Mock异常条件 ${v.operator} ${v.value}${v.unit}。${triggered ? '仅提示复核，不证明实际设备故障。' : '仅此指标未触发，不表示设备整体安全。'}`
        }
      }
      result.decisions.push(decision)
    }
    result.summary = result.gaps.length || !result.decisions.length || result.decisions.some(d => ['conflict', 'insufficient', 'missing'].includes(d.status)) ? '依据或条件不完整，不能形成确定结论；请按下列记录补充或核实。' : '已完成输入读数与Mock条件的比较；以下为辅助复核记录，不作真实诊断。'
    return clone(result)
  }
  return { documents, getDocument, latest, versionOf, save, process, confirm, submit, review, archive, canAccess, search, storageState, stopPersistence,
    thresholdRules, reasoningRules, currentRule, ruleById, effectiveKnowledge, saveThreshold, saveReasoning, setRuleEnabled, eligibleThresholds, thresholdConflicts, runRules }
}
function sessionStorageOrNull() {
  try { return globalThis.sessionStorage || null } catch { return null }
}
export const knowledgeStore = createKnowledgeStore(kbEntries, sessionStorageOrNull())
if (import.meta.hot) import.meta.hot.dispose(() => knowledgeStore.stopPersistence())
export const legacyEntries = computed(() => knowledgeStore.documents.map(d => {
  const v = knowledgeStore.latest(d), seed = kbEntries.find(e => e.id === d.legacyId)
  return { ...seed, id: d.id, version: v.number, title: v.title, domain: v.domain, expert: v.expert || v.creator, expertRole: seed?.expertRole || '演示资料维护人员', time: v.updatedAt.slice(0, 10), desc: v.desc || v.body.slice(0, 120), content: v.seed ? seed?.content : escapeHtml(v.body).replace(/\n/g, '<br>'), fav: d.fav }
}))
