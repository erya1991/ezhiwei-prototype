export const STORAGE_KEY = 'ezhiwei:work-order:v1:state'
export const PRIORITIES = ['普通', '较急', '紧急']
export const STATUSES = ['待派发', '待接单', '处理中', '待验收', '已关闭', '已终止']
export const PROFESSIONS = ['暖通', '给排水', '供配电', '建筑设施', '消防', '医用气体']
export const TERMINAL = ['已关闭', '已终止']
export const clone = value => JSON.parse(JSON.stringify(value))
export const blank = value => value == null || String(value).trim() === ''
export const requireValue = (condition, message) => { if (!condition) throw new Error(message) }
export const addMinutes = (time, minutes) => new Date(Date.parse(time) + minutes * 60000).toISOString()
export const late = (time, deadline) => Boolean(deadline) && Date.parse(time) > Date.parse(deadline)
export const displayTime = value => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '—'
export const statusTone = value => ({ 已关闭: 'success', 已终止: 'info', 处理中: 'primary' }[value] || 'warning')
export const newRequestId = () => globalThis.crypto?.randomUUID?.() || 'request-' + Date.now() + '-' + Math.random().toString(36).slice(2)
export function durationError(limits, priority, key) {
  const label = { receiving: '接单', processing: '处理', acceptance: '验收' }[key]
  if (!Number.isInteger(limits?.[key]) || limits[key] <= 0) return priority + label + '时限必须为正整数'
  if (key === 'processing' && limits.processing < limits.receiving) return priority + '处理时限不能短于接单时限'
  return ''
}
export function timeFacts(order, now) {
  const assignment = order.assignments.find(row => row.id === order.assignmentId)
  const submission = order.submissions.find(row => row.id === order.submissionId)
  const terminal = TERMINAL.includes(order.status)
  return {
    acceptanceLate: !terminal && order.status === '待验收' && late(now, submission?.acceptanceDeadline),
    receivingLate: !terminal && order.status === '待接单' && late(now, assignment?.deadline),
    processingLate: !terminal && order.status !== '待验收' && late(now, order.processingDeadline),
    submissionLate: submission?.late ?? null,
    assignment, submission
  }
}
