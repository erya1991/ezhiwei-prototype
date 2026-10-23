// Pure presentation helpers; all records still come from knowledgeAiMock's single store.
import { kbCategories } from './knowledgeBase.js'

const deviceAliases = [
  ['配电柜', '高低压柜', '高压柜', '低压柜'], ['变压器'], ['UPS', '不间断电源'],
  ['柴油发电机', '发电机'], ['氧气站', '液氧储罐'], ['压缩空气', '干燥器', '冷干机'],
  ['负压吸引'], ['洁净空调', '净化空调'], ['RO反渗透', 'RO纯水', '反渗透'],
  ['消防泵', '消防水泵'], ['电梯', '扶梯'], ['污水处理', '污水消毒'], ['门禁'], ['视频监控'], ['AGV'],
]
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\s/g, '')
export function deviceNames(text, extra = []) {
  const input = normalize(text)
  const names = deviceAliases.filter(aliases => aliases.some(name => input.includes(normalize(name)))).map(aliases => aliases[0])
  for (const name of extra.filter(Boolean)) {
    if (input.includes(normalize(name)) && !deviceAliases.some(a => a.some(n => normalize(name).includes(normalize(n))))) names.push(name)
  }
  return [...new Set(names)]
}
export function deviceOptions(domain, records = [], current = '') {
  const category = kbCategories.find(c => c.name === `${domain}系统` || c.name === domain)
  const inherited = (category?.children || []).map(c => c.name)
  const existing = records.filter(v => v.domain === domain).map(v => v.device).filter(Boolean)
  return [...new Set([...existing, ...inherited, ...(current ? [current] : [])])]
}
export function meaningfulFragment(text) {
  const raw = String(text || '').trim()
  const clean = raw.replace(/^[\s•·\d一二三四五六七八九十百、.．（）()①②③④⑤⑥⑦⑧⑨⑩]+/u, '').replace(/[：:。\s]+$/u, '')
  // Short chapter labels are not independent facts. Keep numbered action sentences.
  const chapterLabel = /^[一二三四五六七八九十]+、/.test(raw) && clean.length < 40 && !/[。！？；：:→]/.test(clean) && !/应|需|首先|其次|检查|核对|联系|记录|确认|观察|禁止/.test(clean)
  const label = clean.replace(/[（(].*?[）)]/g, '').trim()
  return clean.length > 2 && !chapterLabel && !/^(目录|概述|故障现象|根因分析|原因分析|可能原因|故障树推理|故障树分析|排查建议|标准处置流程|标准处置SOP|处置SOP|参考资料|安全注意事项|巡检步骤|操作步骤)$/i.test(label)
}
export function groupSources(sources = []) {
  const groups = new Map()
  for (const source of sources.filter(s => meaningfulFragment(s.text))) {
    const key = `${source.documentId}:${source.version}`
    if (!groups.has(key)) groups.set(key, { ...source, key, fragments: [] })
    const group = groups.get(key)
    if (!group.fragments.some(f => (source.fragmentId && f.fragmentId === source.fragmentId) || f.text === source.text)) group.fragments.push(source)
  }
  return [...groups.values()]
}
export function organizeKnowledge(question, sources, versionOf, extraDevices = []) {
  const devices = deviceNames(question, extraDevices)
  const direct = [], related = []
  for (const group of groupSources(sources)) {
    const version = versionOf(group.documentId, group.version)
    const titleDevices = deviceNames(`${version?.device || ''} ${group.title}`, extraDevices)
    const sourceDevices = titleDevices.length ? titleDevices : deviceNames(version?.body, extraDevices)
    const mismatch = devices.length && (!sourceDevices.length || sourceDevices.some(d => !devices.includes(d)))
    const target = mismatch ? related : direct
    target.push({ ...group, relation: mismatch ? '设备不同或未明确，仅供参考' : '直接相关资料' })
  }
  return { devices, direct: direct.slice(0, 3), related: related.slice(0, 2) }
}
export function adviceExcerpts(groups) {
  const excerpts = groups.flatMap(g => g.fragments.map(f => ({ ...f, sourceKey: g.key })))
  const actionable = excerpts.filter(f => /检查|核对|复核|确认|联系|记录|排查|通知|测量|校验|观察/.test(f.text))
  return actionable.filter((f, i, all) => all.findIndex(x => x.text === f.text) === i).slice(0, 3)
}
export function conditionSummary(rule) {
  const operator = { '>': '＞', '>=': '≥', '<': '＜', '<=': '≤', '=': '＝', '!=': '≠' }[rule.operator] || rule.operator || '…'
  return `${rule.metric || '指标'} ${operator} ${rule.value ?? '…'} ${rule.unit || ''}（Mock）`
}
export function thresholdStatus(rule, at = Date.now()) {
  if (!rule.enabled) return '已停用'
  if (at < new Date(rule.start).getTime()) return '尚未生效'
  if (at > new Date(rule.end).getTime()) return '已到期'
  return '当前范围有效'
}
