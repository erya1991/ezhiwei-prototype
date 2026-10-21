<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useEcharts } from '../composables/useEcharts'

// 密钥已移至服务端代理（server/index.js），前端只调用同源 /api 接口。
const DEEPSEEK_MODEL = 'deepseek-chat'

const PM_LEVEL_TEXT = { normal: '正常', subhealthy: '亚健康', risk: '隐患', danger: '高危' }
const PM_LEVEL_COLOR = { subhealthy: '#FFD60A', risk: '#FF9F0A', danger: '#FF3B30', normal: '#34C759' }

function pmTrend(start, end, noise, dec) {
  const arr = []
  for (let i = 0; i < 30; i++) {
    const v = start + (end - start) * (i / 29) + noise * Math.sin(i / 3)
    const f = Math.pow(10, dec)
    arr.push(Math.round(v * f) / f)
  }
  return arr
}
function pmNow() {
  const d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
const DAY_LABELS = []
for (let i = 29; i >= 0; i--) DAY_LABELS.push('D-' + i)

// ---- 五大设备数据 ----
const pmDevices = {
  elevator: {
    key: 'elevator', name: '电梯', icon: '🛗', color: '#0A84FF', health: 92,
    status: { online: true, level: 'normal', text: '运行中' },
    trendName: '振动幅值', trendUnit: 'mm/s', std: 0.5,
    base: [
      { l: '设备编号', v: 'DT-2021-014' }, { l: '安装位置', v: '门诊楼（4 台）' },
      { l: '投用日期', v: '2021-06' }, { l: '维保周期', v: '每月' },
      { l: '额定载重 / 速度', v: '1600 kg · 1.75 m/s' }, { l: '上次维保', v: '2026-08-12' }
    ],
    params: [
      { l: '实时运行速度', v: '1.75', u: 'm/s', state: 'normal' },
      { l: '振动幅值', v: '0.42', u: 'mm/s', state: 'warn' },
      { l: '启停频次', v: '86', u: '次/h', state: 'normal' },
      { l: '门机偏差', v: '1.2', u: 'mm', state: 'normal' },
      { l: '曳引机温度', v: '62', u: '℃', state: 'normal' },
      { l: '制动器间隙', v: '0.38', u: 'mm', state: 'warn' },
      { l: '平层精度', v: '3', u: 'mm', state: 'normal' },
      { l: '累计运行', v: '128,640', u: '次', state: 'normal' }
    ],
    trend: pmTrend(0.30, 0.42, 0.05, 2),
    radar: [92, 88, 95, 85, 90],
    abnormal: [
      { time: '08-22 09:14', text: '3F 门机开合时间偏长 0.4s', level: 'subhealthy' },
      { time: '08-20 14:02', text: '轿厢振动瞬时超阈值', level: 'subhealthy' }
    ],
    aiJudge: '电梯整体运行平稳，健康度 92%。振动幅值与制动器间隙呈缓慢上升趋势，虽未超限，但建议下次月度维保重点检查导靴与制动衬垫磨损情况。'
  },
  boiler: {
    key: 'boiler', name: '锅炉', icon: '🔥', color: '#FF9F0A', health: 85,
    status: { online: true, level: 'subhealthy', text: '运行中' },
    trendName: '排烟温度', trendUnit: '℃', std: 170,
    base: [
      { l: '设备编号', v: 'GL-2019-003' }, { l: '安装位置', v: '住院楼 A 栋地下' },
      { l: '投用日期', v: '2019-11' }, { l: '维保周期', v: '每季' },
      { l: '额定蒸发量 / 压力', v: '4 t/h · 1.0 MPa' }, { l: '上次维保', v: '2026-07-28' }
    ],
    params: [
      { l: '炉膛温度', v: '1,286', u: '℃', state: 'normal' },
      { l: '蒸汽压力', v: '0.92', u: 'MPa', state: 'normal' },
      { l: '排烟温度', v: '168', u: '℃', state: 'warn' },
      { l: '给水温度', v: '102', u: '℃', state: 'normal' },
      { l: '烟气氧含量', v: '4.2', u: '%', state: 'normal' },
      { l: '燃烧效率', v: '90.5', u: '%', state: 'warn' },
      { l: '水位', v: '-12', u: 'mm', state: 'normal' },
      { l: '燃气流量', v: '86', u: 'm³/h', state: 'normal' }
    ],
    trend: pmTrend(150, 168, 3, 0),
    radar: [85, 80, 90, 76, 84],
    abnormal: [
      { time: '08-22 06:30', text: '排烟温度连续 3 日偏高', level: 'risk' },
      { time: '08-19 21:10', text: '燃烧效率跌破 91%', level: 'subhealthy' }
    ],
    aiJudge: '锅炉健康度 85%，排烟温度连续三日偏高、燃烧效率降至 90.5%，可能存在受热面积灰或过量空气系数偏大的情况，建议安排吹灰并校核燃烧配比。'
  },
  hvac: {
    key: 'hvac', name: '中央空调', icon: '❄️', color: '#00C7BE', health: 78,
    status: { online: true, level: 'risk', text: '高负荷运行' },
    trendName: '压缩机电流', trendUnit: 'A', std: 75,
    base: [
      { l: '设备编号', v: 'AC-2020-008' }, { l: '安装位置', v: '住院楼 B 栋 / 门诊楼' },
      { l: '投用日期', v: '2020-05' }, { l: '维保周期', v: '每季' },
      { l: '额定制冷量', v: '2100 kW' }, { l: '上次维保', v: '2026-06-30' }
    ],
    params: [
      { l: '负荷率', v: '86', u: '%', state: 'warn' },
      { l: '冷冻水供/回水温', v: '7.2 / 12.6', u: '℃', state: 'normal' },
      { l: '冷却水回水温度', v: '34.8', u: '℃', state: 'warn' },
      { l: '2# 压缩机电流', v: '78', u: 'A', state: 'danger' },
      { l: '能效比 COP', v: '4.1', u: '', state: 'warn' },
      { l: '冷冻水压差', v: '0.18', u: 'MPa', state: 'normal' },
      { l: '冷媒压力', v: '1.24', u: 'MPa', state: 'normal' },
      { l: '室内平均温度', v: '24.6', u: '℃', state: 'normal' }
    ],
    trend: pmTrend(66, 78, 2, 0),
    radar: [78, 72, 88, 68, 80],
    abnormal: [
      { time: '08-22 13:40', text: '2# 压缩机电流持续偏高', level: 'danger' },
      { time: '08-21 16:05', text: '冷却水回水温度超阈值', level: 'risk' }
    ],
    aiJudge: '中央空调健康度 78%，处于高负荷运行，2# 压缩机电流持续偏高、COP 偏低，需警惕制冷剂不足或冷凝器结垢，建议 48 小时内安排专项检查。'
  },
  water: {
    key: 'water', name: '医用纯水', icon: '💧', color: '#34C759', health: 95,
    status: { online: true, level: 'normal', text: '运行中' },
    trendName: '产水电导率', trendUnit: 'μS/cm', std: 1.5,
    base: [
      { l: '设备编号', v: 'CW-2022-002' }, { l: '安装位置', v: '医技楼' },
      { l: '投用日期', v: '2022-03' }, { l: '维保周期', v: '每月' },
      { l: '产水量 / 水质', v: '5 m³/h · 药典标准' }, { l: '上次维保', v: '2026-08-18' }
    ],
    params: [
      { l: '产水电导率', v: '0.8', u: 'μS/cm', state: 'normal' },
      { l: '电阻率', v: '18.2', u: 'MΩ·cm', state: 'normal' },
      { l: 'pH 值', v: '6.9', u: '', state: 'normal' },
      { l: '滤芯压差', v: '0.06', u: 'MPa', state: 'normal' },
      { l: 'TOC', v: '12', u: 'ppb', state: 'normal' },
      { l: '产水流量', v: '4.6', u: 'm³/h', state: 'normal' },
      { l: '储罐液位', v: '82', u: '%', state: 'normal' },
      { l: '紫外灯强度', v: '88', u: '%', state: 'warn' }
    ],
    trend: pmTrend(0.9, 0.8, 0.06, 2),
    radar: [95, 93, 96, 90, 94],
    abnormal: [
      { time: '08-20 08:15', text: '紫外灯强度降至 88%', level: 'subhealthy' }
    ],
    aiJudge: '医用纯水系统健康度 95%，出水水质各项指标稳定达标，仅紫外灯强度降至 88% 接近更换阈值，建议本月内更换灯管。'
  },
  sewage: {
    key: 'sewage', name: '污水处理', icon: '♻️', color: '#FF3B30', health: 71,
    status: { online: true, level: 'danger', text: '运行中' },
    trendName: '出水 COD', trendUnit: 'mg/L', std: 50,
    base: [
      { l: '设备编号', v: 'WS-2021-006' }, { l: '安装位置', v: '后勤保障区' },
      { l: '投用日期', v: '2021-09' }, { l: '维保周期', v: '每季' },
      { l: '日处理量 / 排放标准', v: '800 m³/d · GB18466' }, { l: '上次维保', v: '2026-06-15' }
    ],
    params: [
      { l: '出水 COD', v: '46', u: 'mg/L', state: 'warn' },
      { l: '氨氮', v: '4.8', u: 'mg/L', state: 'normal' },
      { l: '曝气溶解氧', v: '1.6', u: 'mg/L', state: 'danger' },
      { l: 'pH 值', v: '7.4', u: '', state: 'normal' },
      { l: '污泥浓度 MLSS', v: '3,200', u: 'mg/L', state: 'normal' },
      { l: '出水浊度', v: '8', u: 'NTU', state: 'warn' },
      { l: '曝气机电流', v: '42', u: 'A', state: 'warn' },
      { l: '处理流量', v: '780', u: 'm³/d', state: 'normal' }
    ],
    trend: pmTrend(36, 46, 2, 0),
    radar: [71, 66, 82, 60, 74],
    abnormal: [
      { time: '08-22 05:20', text: '曝气溶解氧持续偏低', level: 'danger' },
      { time: '08-21 19:45', text: '出水 COD 逼近排放限值', level: 'risk' }
    ],
    aiJudge: '污水处理系统健康度 71%（高危），曝气溶解氧持续偏低、出水 COD 逼近 50 mg/L 限值，可能为曝气器堵塞或风机出力不足，需立即安排检修以防超标排放。'
  }
}

// ---- 板块1：8 宫格 KPI ----
const pmKpis = [
  { name: '设备综合健康评分', ico: '💚', val: '88.4', unit: '分', foot: '较上周', trend: '+1.2%', dir: 'up' },
  { name: '在线设备 / 总数', ico: '🔌', val: '128', unit: '/ 132 台', foot: '在线率 96.9%', trend: '稳定', dir: 'flat' },
  { name: '今日告警', ico: '🔔', val: '6', unit: '起', foot: '较昨日', trend: '-2 起', dir: 'up' },
  { name: '待处理隐患', ico: '⚠️', val: '3', unit: '项', foot: '较昨日', trend: '-1 项', dir: 'up' },
  { name: '设备平均健康度', ico: '📊', val: '91.2', unit: '%', foot: '环比', trend: '-0.4%', dir: 'down' },
  { name: '预测性维保任务', ico: '🗓️', val: '12', unit: '项', foot: '本周新增', trend: '+3 项', dir: 'flat' },
  { name: '本月避免故障', ico: '🛡️', val: '4', unit: '起', foot: '预测命中', trend: '+1 起', dir: 'up' },
  { name: '维保完成率', ico: '✅', val: '96.5', unit: '%', foot: '较上月', trend: '+0.8%', dir: 'up' }
]

// ---- 板块1：院区拓扑 ----
const pmTopo = [
  { bldg: '门诊楼', points: [{ name: '电梯', dev: 'elevator', health: 92, level: 'normal' }] },
  { bldg: '住院楼 A 栋', points: [{ name: '锅炉', dev: 'boiler', health: 85, level: 'subhealthy' }] },
  { bldg: '住院楼 B 栋', points: [{ name: '中央空调', dev: 'hvac', health: 78, level: 'risk' }] },
  { bldg: '医技楼', points: [{ name: '医用纯水', dev: 'water', health: 95, level: 'normal' }] },
  { bldg: '后勤保障区', points: [{ name: '污水处理', dev: 'sewage', health: 71, level: 'danger' }] }
]

// ---- 板块3：隐患清单 ----
const pmRisks = [
  { id: 'r1', dev: '污水处理', devKey: 'sewage', level: 'danger', time: '08-22 05:20', cause: '曝气系统溶解氧偏低', impact: '出水 COD 超标风险', status: 'doing', statusText: '处置中' },
  { id: 'r2', dev: '中央空调', devKey: 'hvac', level: 'danger', time: '08-22 13:40', cause: '2# 压缩机电流持续偏高', impact: '制冷效率下降 / 停机风险', status: 'todo', statusText: '待派单' },
  { id: 'r3', dev: '锅炉', devKey: 'boiler', level: 'risk', time: '08-22 06:30', cause: '排烟温度连续 3 日偏高', impact: '燃烧效率下降 · 能耗上升', status: 'doing', statusText: '处置中' },
  { id: 'r4', dev: '电梯', devKey: 'elevator', level: 'subhealthy', time: '08-22 09:14', cause: '3F 门机开合时间偏长', impact: '乘梯体验下降 · 隐患累积', status: 'todo', statusText: '待派单' },
  { id: 'r5', dev: '医用纯水', devKey: 'water', level: 'subhealthy', time: '08-20 08:15', cause: '紫外灯强度降至 88%', impact: '消毒效果边际下降', status: 'done', statusText: '已修复' }
]

// ---- 交互状态 ----
const pmCurDevice = ref('elevator')
const curDevice = computed(() => pmDevices[pmCurDevice.value])
const activeRiskId = ref('r1')
const activeRisk = computed(() => pmRisks.find((r) => r.id === activeRiskId.value))

// ---- AI 研判横幅 ----
const pmBannerText = ref('正在加载 AI 研判结论…')
const pmBannerTime = ref('—')

function pmCallAI(messages) {
  return fetch('/api/ai/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, max_tokens: 1200, temperature: 0.3 })
  }).then((response) => {
    if (!response.ok) throw new Error('API ' + response.status)
    return response.json()
  }).then((data) => {
    return data.choices && data.choices[0] && data.choices[0].message.content
  })
}

function pmBuildBannerPrompt() {
  return '你是医院设备健康管理与预测性维护专家。请根据以下五大核心设备的健康状态，输出一段"全院设备健康综合研判"结论（120 字以内，中文，纯文本，不要用 markdown、不要列表、不要 JSON）：\n' +
    '- 电梯：健康度 92%，运行正常，门机有轻微隐患\n' +
    '- 锅炉：健康度 85%，排烟温度偏高，燃烧效率下降\n' +
    '- 中央空调：健康度 78%，2# 压缩机电流偏高，存在隐患\n' +
    '- 医用纯水：健康度 95%，紫外灯强度偏低需更换\n' +
    '- 污水处理：健康度 71%，曝气溶解氧偏低，高危\n' +
    '请概括：整体健康评分、最关键隐患（哪台设备、什么风险）、以及最优先处置建议。'
}
function pmFallbackBanner() {
  return '全院五大核心设备综合健康评分 88.4 分，整体运行平稳。当前最需关注污水处理系统：曝气溶解氧持续偏低，出水 COD 逼近排放限值，属高危隐患；中央空调 2# 压缩机电流偏高、锅炉排烟温度偏高，建议列入本周专项维保。建议优先处置污水处理曝气系统，同步安排中央空调与锅炉的预防性维保。'
}
function pmLoadBanner() {
  pmBannerText.value = 'AI 正在研判全院设备健康状态…'
  pmCallAI([{ role: 'system', content: '你是医院设备健康与预测性维护 AI 助手。' }, { role: 'user', content: pmBuildBannerPrompt() }])
    .then((text) => {
      const clean = String(text || '').trim()
      if (!clean) throw new Error('empty')
      pmBannerText.value = clean
      pmBannerTime.value = 'DeepSeek 研判 · ' + pmNow()
    })
    .catch(() => {
      pmBannerText.value = pmFallbackBanner()
      pmBannerTime.value = '本地研判 · ' + pmNow()
    })
}

// ---- 故障溯源 ----
const traceLoading = ref(false)
const traceResult = ref(null)
const traceSource = ref('')
const traceRiskLabel = ref('')
const traceTime = ref('')

function pmBuildTracePrompt(risk) {
  return '你是医院设备故障诊断与溯源专家。请针对以下隐患做一次故障溯源分析，严格输出 JSON 对象（不要输出 JSON 以外的任何文字、不要用 markdown 代码块包裹）：\n' +
    '隐患：' + risk.dev + ' —— ' + risk.cause + '\n' +
    '发生时段：' + risk.time + '\n' +
    '业务影响：' + risk.impact + '\n' +
    '隐患等级：' + (PM_LEVEL_TEXT[risk.level] || risk.level) + '\n' +
    '字段：{"root":"根本原因（40字内）","trend":"趋势判断（30字内）","impact":"影响评估（40字内）","action":"处置建议（50字内）"}'
}
function pmParseTrace(text) {
  let t = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  const s = t.indexOf('{'), e = t.lastIndexOf('}')
  if (s >= 0 && e > s) t = t.slice(s, e + 1)
  const d = JSON.parse(t)
  if (!d.root && !d.action) throw new Error('shape')
  return d
}
function pmFallbackTrace(risk) {
  return {
    root: risk.dev + ' ' + risk.cause + '，多为关键部件长期运行磨损/参数漂移叠加近期负荷变化所致。',
    trend: '若不处置，相关参数将持续劣化，' + risk.dev + '健康度预计一周内下降 3~5 个百分点。',
    impact: risk.impact + '，可能引发非计划停机与连带业务影响。',
    action: '建议 48 小时内安排专项维保：更换/校准相关部件并复核关键参数至正常区间。'
  }
}

function pmTraceRisk(id) {
  const risk = pmRisks.find((r) => r.id === id)
  if (!risk) return
  activeRiskId.value = id
  diagChart.setOption(buildDiagOption(risk))
  traceLoading.value = true
  traceResult.value = null
  traceRiskLabel.value = risk.dev + ' · ' + risk.cause
  pmCallAI([{ role: 'system', content: '你是医院设备故障诊断与溯源专家。' }, { role: 'user', content: pmBuildTracePrompt(risk) }])
    .then((text) => {
      traceResult.value = pmParseTrace(text)
      traceSource.value = 'DeepSeek 溯源'
      traceTime.value = pmNow()
      traceLoading.value = false
    })
    .catch(() => {
      traceResult.value = pmFallbackTrace(risk)
      traceSource.value = '本地溯源（离线降级）'
      traceTime.value = pmNow()
      traceLoading.value = false
    })
}

// ---- 图表 ----
const deviceTrendRef = ref(null)
const sewageTrendRef = ref(null)
const hvacTrendRef = ref(null)
const boilerTrendRef = ref(null)
const diagChartRef = ref(null)
const pieChartRef = ref(null)

function buildTrendOption(d) {
  return {
    grid: { left: 38, right: 14, top: 16, bottom: 22 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.94)', borderColor: 'rgba(0,0,0,0.06)', textStyle: { color: '#1D1D1F', fontSize: 11 } },
    xAxis: { type: 'category', data: DAY_LABELS, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } }, axisLabel: { color: '#AEAEB2', fontSize: 9 }, name: d.trendName + '(' + d.trendUnit + ')', nameTextStyle: { color: '#AEAEB2', fontSize: 9 } },
    series: [{ name: d.trendName, type: 'line', smooth: true, symbol: 'none', data: d.trend, lineStyle: { width: 2, color: d.color }, areaStyle: { color: d.color + '18' } }]
  }
}

function buildDiagOption(risk) {
  const d = pmDevices[risk.devKey]
  const best = d.trend.map((v) => Math.round(v * 0.85 * 10) / 10)
  const std = d.trend.map(() => d.std)
  return {
    grid: { left: 40, right: 16, top: 34, bottom: 24 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.94)', borderColor: 'rgba(0,0,0,0.06)', textStyle: { color: '#1D1D1F', fontSize: 11 } },
    legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: '#6E6E73', fontSize: 9 } },
    xAxis: { type: 'category', data: DAY_LABELS, boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } }, axisLabel: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } }, axisLabel: { color: '#AEAEB2', fontSize: 9 } },
    series: [
      { name: '实时工况', type: 'line', smooth: true, symbol: 'none', data: d.trend, lineStyle: { width: 2.5, color: '#FF3B30' }, areaStyle: { color: 'rgba(255,59,48,0.10)' } },
      { name: '历史最优', type: 'line', smooth: true, symbol: 'none', data: best, lineStyle: { width: 1.5, color: '#0A84FF', type: 'dashed' } },
      { name: '行业标准', type: 'line', smooth: false, symbol: 'none', data: std, lineStyle: { width: 1.5, color: '#34C759', type: 'dashed' } }
    ]
  }
}

function buildPieOption() {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c}%（{d}%）' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: '#6E6E73', fontSize: 9 } },
    series: [{
      type: 'pie', radius: ['42%', '64%'], center: ['50%', '44%'],
      data: [
        { name: '机械磨损', value: 32 }, { name: '电气老化', value: 24 }, { name: '参数漂移', value: 20 },
        { name: '环境因素', value: 14 }, { name: '人为操作', value: 10 }
      ],
      label: { show: false },
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 1 },
      color: ['#0A84FF', '#FF9F0A', '#BF5AF2', '#34C759', '#FF3B30']
    }]
  }
}

useEcharts(sewageTrendRef, () => buildTrendOption(pmDevices.sewage))
useEcharts(hvacTrendRef, () => buildTrendOption(pmDevices.hvac))
useEcharts(boilerTrendRef, () => buildTrendOption(pmDevices.boiler))
useEcharts(pieChartRef, buildPieOption)
const deviceTrend = useEcharts(deviceTrendRef, () => buildTrendOption(pmDevices.elevator))
const diagChart = useEcharts(diagChartRef, () => buildDiagOption(activeRisk.value))

function switchDevice(key) {
  if (!pmDevices[key]) return
  pmCurDevice.value = key
  nextTick(() => deviceTrend.setOption(buildTrendOption(pmDevices[key])))
}

onMounted(() => {
  pmLoadBanner()
})
</script>

<template>
  <div class="en-page">
    <div class="en-header">
      <div class="en-title">
        <div class="en-title-icon" style="background:linear-gradient(135deg,#0A84FF 0%,#BF5AF2 100%);box-shadow:0 6px 18px rgba(191,90,242,0.32);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>
        </div>
        <div>
          <h2>设备健康与预测性维护 AI 中心</h2>
          <div class="en-title-sub">全维监测 → 隐患诊断 → 故障溯源 → 预测维保 → 预警闭环 → 成效复盘</div>
        </div>
      </div>
      <div class="en-ai-status"><span class="dot"></span>AI 预测引擎运行中 · 实时在线</div>
    </div>

    <!-- 板块1：AI 设备健康总览驾驶舱 -->
    <div class="pm-banner">
      <div class="pm-banner-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12a4 4 0 0 1 8 0"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
      </div>
      <div class="pm-banner-body">
        <div class="pm-banner-head">
          <span class="pm-banner-label">AI 全局智能研判</span>
          <span class="pm-banner-time">{{ pmBannerTime }}</span>
        </div>
        <div class="pm-banner-text">{{ pmBannerText }}</div>
      </div>
    </div>

    <div class="pm-kpi-grid">
      <div v-for="k in pmKpis" :key="k.name" class="pm-kpi">
        <div class="pm-kpi-top"><span class="pm-kpi-name">{{ k.name }}</span><span class="pm-kpi-ico">{{ k.ico }}</span></div>
        <div class="pm-kpi-val">{{ k.val }}<small>{{ k.unit }}</small></div>
        <div class="pm-kpi-foot">{{ k.foot }} <span class="pm-kpi-trend" :class="k.dir">{{ k.trend }}</span></div>
      </div>
    </div>

    <div class="en-card">
      <div class="en-card-head"><div class="en-card-title"><span class="en-card-num">①</span>污水处理系统实时监测</div><div class="en-card-tag">格栅 → 调节 → 生化 → 沉淀 → 消毒 → 排放</div></div>
      <div class="pm-flow"><img src="/图片/污水处理.png" alt="污水处理全流程示意图"></div>
      <div class="pm-sewage">
        <div class="pm-device-status">
          <span class="pm-status-dot online"></span>
          <span>实时在线</span>
          <span class="pm-status-tag danger">高危</span>
          <span style="margin-left:auto;color:#AEAEB2">综合健康度 71%</span>
        </div>
        <div class="pm-params-grid">
          <div v-for="p in pmDevices.sewage.params" :key="p.l" class="pm-param">
            <span>{{ p.l }}</span>
            <b :class="p.state === 'warn' ? 'warn' : p.state === 'danger' ? 'danger' : ''">{{ p.v }}<small>{{ p.u }}</small></b>
          </div>
        </div>
        <div class="pm-sewage-mid">
          <div class="pm-sewage-trend"><div class="pm-sewage-chart-head">📈 出水 COD 近 30 天趋势（mg/L）</div><div class="pm-sewage-chart" ref="sewageTrendRef"></div></div>
          <div class="pm-device-base"><div class="pm-base-title">📋 基础台账</div>
            <div v-for="r in pmDevices.sewage.base" :key="r.l" class="pm-base-row"><span>{{ r.l }}</span><b>{{ r.v }}</b></div>
          </div>
        </div>
        <div class="pm-device-bottom">
          <div class="pm-ai-judge">🧠 <b>AI 实时判定：</b>{{ pmDevices.sewage.aiJudge }}</div>
          <div class="pm-abnormal"><div class="pm-ab-title">⚠️ 异常快照（近 7 天）</div>
            <div v-for="a in pmDevices.sewage.abnormal" :key="a.text" class="pm-ab-item">
              <span class="pm-ab-dot" :style="{ background: PM_LEVEL_COLOR[a.level] || '#34C759' }"></span><span>{{ a.text }}</span><span class="pm-ab-time">{{ a.time }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="en-card">
      <div class="en-card-head"><div class="en-card-title"><span class="en-card-num">②</span>中央空调机组实时监测</div><div class="en-card-tag">冷水机组 · 压缩机 · 冷凝器 · 冷却塔</div></div>
      <div class="pm-hvac">
        <div class="pm-hvac-img"><img src="/图片/中央空调机组.png" alt="中央空调机组"></div>
        <div class="pm-hvac-right">
          <div class="pm-device-status">
            <span class="pm-status-dot online"></span>
            <span>实时在线</span>
            <span class="pm-status-tag risk">隐患</span>
            <span style="margin-left:auto;color:#AEAEB2">综合健康度 78%</span>
          </div>
          <div class="pm-params-grid">
            <div v-for="p in pmDevices.hvac.params" :key="p.l" class="pm-param">
              <span>{{ p.l }}</span>
              <b :class="p.state === 'warn' ? 'warn' : p.state === 'danger' ? 'danger' : ''">{{ p.v }}<small>{{ p.u }}</small></b>
            </div>
          </div>
          <div class="pm-hvac-mid">
            <div class="pm-hvac-trend"><div class="pm-hvac-chart-head">📈 压缩机电流 近 30 天趋势（A）</div><div class="pm-hvac-chart" ref="hvacTrendRef"></div></div>
            <div class="pm-device-base"><div class="pm-base-title">📋 基础台账</div>
              <div v-for="r in pmDevices.hvac.base" :key="r.l" class="pm-base-row"><span>{{ r.l }}</span><b>{{ r.v }}</b></div>
            </div>
          </div>
          <div class="pm-device-bottom">
            <div class="pm-ai-judge">🧠 <b>AI 实时判定：</b>{{ pmDevices.hvac.aiJudge }}</div>
            <div class="pm-abnormal"><div class="pm-ab-title">⚠️ 异常快照（近 7 天）</div>
              <div v-for="a in pmDevices.hvac.abnormal" :key="a.text" class="pm-ab-item">
                <span class="pm-ab-dot" :style="{ background: PM_LEVEL_COLOR[a.level] || '#34C759' }"></span><span>{{ a.text }}</span><span class="pm-ab-time">{{ a.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="en-card">
      <div class="en-card-head"><div class="en-card-title"><span class="en-card-num">③</span>燃气锅炉实时监测</div><div class="en-card-tag">燃烧器 · 炉膛 · 省煤器 · 烟气系统</div></div>
      <div class="pm-boiler">
        <div class="pm-boiler-left">
          <div class="pm-device-status">
            <span class="pm-status-dot online"></span>
            <span>实时在线</span>
            <span class="pm-status-tag subhealthy">亚健康</span>
            <span style="margin-left:auto;color:#AEAEB2">综合健康度 85%</span>
          </div>
          <div class="pm-params-grid">
            <div v-for="p in pmDevices.boiler.params" :key="p.l" class="pm-param">
              <span>{{ p.l }}</span>
              <b :class="p.state === 'warn' ? 'warn' : p.state === 'danger' ? 'danger' : ''">{{ p.v }}<small>{{ p.u }}</small></b>
            </div>
          </div>
          <div class="pm-hvac-mid">
            <div class="pm-hvac-trend"><div class="pm-hvac-chart-head">📈 排烟温度 近 30 天趋势（℃）</div><div class="pm-hvac-chart" ref="boilerTrendRef"></div></div>
            <div class="pm-device-base"><div class="pm-base-title">📋 基础台账</div>
              <div v-for="r in pmDevices.boiler.base" :key="r.l" class="pm-base-row"><span>{{ r.l }}</span><b>{{ r.v }}</b></div>
            </div>
          </div>
          <div class="pm-device-bottom">
            <div class="pm-ai-judge">🧠 <b>AI 实时判定：</b>{{ pmDevices.boiler.aiJudge }}</div>
            <div class="pm-abnormal"><div class="pm-ab-title">⚠️ 异常快照（近 7 天）</div>
              <div v-for="a in pmDevices.boiler.abnormal" :key="a.text" class="pm-ab-item">
                <span class="pm-ab-dot" :style="{ background: PM_LEVEL_COLOR[a.level] || '#34C759' }"></span><span>{{ a.text }}</span><span class="pm-ab-time">{{ a.time }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="pm-hvac-img pm-boiler-img"><img src="/图片/燃气锅炉.png" alt="燃气锅炉"><span class="pm-img-badge">🔥 燃气锅炉</span></div>
      </div>
    </div>

    <div class="en-card">
      <div class="en-card-head"><div class="en-card-title"><span class="en-card-num">④</span>院区设备点位拓扑</div><div class="en-card-tag">悬浮查看设备实时健康状态</div></div>
      <div class="pm-topo">
        <div v-for="b in pmTopo" :key="b.bldg" class="pm-topo-bldg">
          <div class="pm-topo-bldg-name">{{ b.bldg }}</div>
          <div class="pm-topo-points">
            <div v-for="p in b.points" :key="p.dev" class="pm-topo-point">
              <span class="pm-topo-dot" :class="p.level"></span>
              <span>{{ p.name }}</span>
              <span class="pm-topo-tip"><b>{{ p.name }}</b> · {{ PM_LEVEL_TEXT[p.level] || '' }}<br>健康度 {{ p.health }}% · 实时在线监测中</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 板块2：两大核心设备精细化监测 -->
    <div class="en-card">
      <div class="en-card-head">
        <div class="en-card-title"><span class="en-card-num">2</span>两大核心设备精细化监测</div>
        <div class="en-card-tag">Tab 切换 · 实时参数 · 趋势曲线 · AI 判定</div>
      </div>
      <div class="pm-tabs">
        <button class="pm-tab" :class="{ active: pmCurDevice === 'elevator' }" @click="switchDevice('elevator')"><span class="pm-tab-ico">🛗</span>电梯</button>
        <button class="pm-tab" :class="{ active: pmCurDevice === 'water' }" @click="switchDevice('water')"><span class="pm-tab-ico">💧</span>医用纯水</button>
      </div>
      <div class="pm-device">
        <div class="pm-device-top">
          <div class="pm-device-left">
            <div class="pm-device-img"><span class="big">{{ curDevice.icon }}</span><span>{{ curDevice.name }} 设备效果图（接入 IoT 后可替换实拍）</span></div>
            <div class="pm-device-base"><div class="pm-base-title">📋 基础台账</div>
              <div v-for="r in curDevice.base" :key="r.l" class="pm-base-row"><span>{{ r.l }}</span><b>{{ r.v }}</b></div>
            </div>
          </div>
          <div class="pm-device-right">
            <div class="pm-device-status">
              <span class="pm-status-dot online"></span>
              <span>实时在线</span>
              <span class="pm-status-tag" :class="curDevice.status.level">{{ PM_LEVEL_TEXT[curDevice.status.level] }}</span>
              <span style="margin-left:auto;color:#AEAEB2">健康度 {{ curDevice.health }}%</span>
            </div>
            <div class="pm-params-grid">
              <div v-for="p in curDevice.params" :key="p.l" class="pm-param">
                <span>{{ p.l }}</span>
                <b :class="p.state === 'warn' ? 'warn' : p.state === 'danger' ? 'danger' : ''">{{ p.v }}<small>{{ p.u }}</small></b>
              </div>
            </div>
            <div class="pm-device-trend" ref="deviceTrendRef"></div>
          </div>
        </div>
        <div class="pm-device-bottom">
          <div class="pm-ai-judge">🧠 <b>AI 实时判定：</b>{{ curDevice.aiJudge }}</div>
          <div class="pm-abnormal"><div class="pm-ab-title">⚠️ 异常快照（近 7 天）</div>
            <div v-for="a in curDevice.abnormal" :key="a.text" class="pm-ab-item">
              <span class="pm-ab-dot" :style="{ background: PM_LEVEL_COLOR[a.level] || '#34C759' }"></span><span>{{ a.text }}</span><span class="pm-ab-time">{{ a.time }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 板块3：AI 隐患诊断与故障溯源 -->
    <div class="en-card" style="margin-bottom:0;">
      <div class="en-card-head"><div class="en-card-title"><span class="en-card-num">3</span>AI 隐患诊断与故障溯源</div><div class="en-card-tag">点击隐患行生成 AI 溯源结论</div></div>
      <div class="pm-diag-grid">
        <div class="pm-diag-left">
          <div class="pm-risk-table">
            <div class="pm-risk-row head"><span>设备</span><span>等级</span><span>时段</span><span>AI 归因</span><span>业务影响</span><span>状态</span></div>
            <div
              v-for="r in pmRisks" :key="r.id"
              class="pm-risk-row" :class="r.level"
              :style="{ boxShadow: r.id === activeRiskId ? 'inset 0 0 0 2px #0A84FF' : 'none' }"
              @click="pmTraceRisk(r.id)"
            >
              <span><b>{{ r.dev }}</b></span>
              <span><span class="pm-risk-lv" :class="r.level">{{ PM_LEVEL_TEXT[r.level] || r.level }}</span></span>
              <span>{{ r.time }}</span>
              <span>{{ r.cause }}</span>
              <span>{{ r.impact }}</span>
              <span><span class="pm-risk-status" :class="r.status">{{ r.statusText }}</span></span>
            </div>
          </div>
        </div>
        <div class="pm-diag-right">
          <div class="pm-diag-chart-head">单设备三曲线溯源对比</div>
          <div class="pm-chart" ref="diagChartRef"></div>
          <div class="pm-diag-chart-head" style="margin-top:8px;">隐患原因占比</div>
          <div class="pm-chart" ref="pieChartRef"></div>
        </div>
      </div>
      <div class="pm-trace">
        <div class="pm-trace-ico">🔍</div>
        <div class="pm-trace-body">
          <template v-if="traceLoading">
            <span class="loading">⏳ AI 正在溯源分析「{{ traceRiskLabel }}」…</span>
          </template>
          <template v-else-if="traceResult">
            <div style="margin-bottom:6px;"><b>故障溯源结论</b> · {{ traceRiskLabel }} <span style="color:#AEAEB2;font-size:10px;">（{{ traceSource }} · {{ traceTime }}）</span></div>
            <div>📍 <b>根本原因：</b>{{ traceResult.root }}</div>
            <div>📈 <b>趋势判断：</b>{{ traceResult.trend }}</div>
            <div>💥 <b>影响评估：</b>{{ traceResult.impact }}</div>
            <div>🛠 <b>处置建议：</b>{{ traceResult.action }}</div>
          </template>
          <template v-else>
            点击上方隐患清单任意一条，AI 将生成该隐患的故障溯源结论。
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
