<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useEcharts } from '../composables/useEcharts'
import { showToast } from '../composables/useToast'

// 密钥已移至服务端代理（server/index.js），前端只调用同源 /api 接口。
const DEEPSEEK_MODEL = 'deepseek-chat'

const EN_COLORS = { blue: '#0A84FF', green: '#34C759', orange: '#FF9F0A', red: '#FF3B30', teal: '#00C7BE', purple: '#BF5AF2', cyan: '#64D2FF' }

function fmt(n) { return n.toLocaleString('zh-CN') }

// ---- 24 小时数据 ----
const hourLabels = []
for (let i = 0; i < 24; i++) hourLabels.push(String(i).padStart(2, '0') + ':00')
const elecCurve = [620, 560, 530, 520, 540, 610, 760, 980, 1180, 1350, 1420, 1380, 1240, 1320, 1360, 1310, 1180, 1050, 1120, 1210, 1040, 880, 760, 690]
const pvCurve = [0, 0, 0, 0, 0, 20, 90, 180, 240, 278, 292, 286, 270, 240, 190, 120, 55, 10, 0, 0, 0, 0, 0, 0]
const waterCurve = [6, 5, 5, 4, 5, 7, 10, 13, 14, 15, 14, 13, 12, 13, 14, 13, 12, 11, 12, 13, 11, 9, 8, 7]
const gasCurve = [22, 20, 20, 19, 20, 26, 44, 58, 64, 62, 58, 60, 62, 64, 60, 56, 54, 58, 66, 62, 48, 38, 30, 26]

// ---- 模块1 KPI ----
const enKpis = [
  { v: 12.6, trend: '↓ 3.2%', cls: 'down', note: '较昨日同期' },
  { v: 1248, trend: '↓ 5.1%', cls: 'down', note: '较昨日同期' },
  { v: 86, trend: '→ 0.4%', cls: 'flat', note: '与昨日基本持平' },
  { v: 6.8, trend: '↓ 2.7%', cls: 'down', note: '较昨日同期' },
  { v: 286, trend: '↑ 12%', cls: 'up', note: '正午发电高峰' },
  { v: 182, trend: '→ 65%', cls: 'flat', note: 'SOC 电量' }
]
const KPI_META = [
  { name: '用水量', cls: 'water', ico: '💧', bg: 'rgba(10,132,255,0.12)', unit: 'm³/h' },
  { name: '用电功率', cls: 'elec', ico: '⚡', bg: 'rgba(255,159,10,0.13)', unit: 'kW' },
  { name: '燃气用量', cls: 'gas', ico: '🔥', bg: 'rgba(255,59,48,0.12)', unit: 'm³/h' },
  { name: '热力负荷', cls: 'heat', ico: '♨️', bg: 'rgba(0,199,190,0.13)', unit: 'GJ/h' },
  { name: '光伏发电', cls: 'pv', ico: '☀️', bg: 'rgba(52,199,89,0.13)', unit: 'kW' },
  { name: '储能电量', cls: 'storage', ico: '🔋', bg: 'rgba(191,90,242,0.13)', unit: 'kWh' }
]
const kpiDisplay = ref(enKpis.map(() => '0'))

function animateKpis() {
  enKpis.forEach((k, i) => {
    const decimals = k.v < 100 ? 1 : 0
    const start = performance.now()
    const duration = 900
    function step(ts) {
      const p = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      kpiDisplay.value[i] = (k.v * eased).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

// ---- 峰谷平拆分 ----
const splitData = [
  { label: '峰', v: 6200, color: EN_COLORS.orange, cls: 'enSplitPeak' },
  { label: '平', v: 4100, color: EN_COLORS.blue, cls: 'enSplitFlat' },
  { label: '谷', v: 2300, color: EN_COLORS.teal, cls: 'enSplitValley' }
]
const splitMax = Math.max(...splitData.map((s) => s.v))

// ---- 模块2 诊断清单 ----
const enDiags = [
  { sev: 'high', src: '空调机房 · 2#冷却泵', title: '冷却水泵频繁启停', desc: '检测到该泵 1 小时内启停 8 次，远超正常阈值，造成额外冲击能耗与设备磨损。', act: '检查温度传感器与变频器参数，切换至备用泵运行。', waste: 1240 },
  { sev: 'mid', src: '门诊楼 3F 走廊', title: '夜间公共区域照明未关', desc: '22:00–06:00 时段照明持续全开，无人活动区间仍满功率运行。', act: '接入人感联动，夜间自动降为 20% 亮度。', waste: 860 },
  { sev: 'mid', src: '中央空调主机', title: '冷水机组出水温度偏低', desc: '出水温度长期低于设计值 1.5℃，机组 COP 下降约 6%。', act: '上调出水设定温度至设计值，恢复高效区间。', waste: 720 },
  { sev: 'low', src: '生活热水系统', title: '热水循环泵定频运行', desc: '循环泵全天定频运行，低谷时段存在明显能量浪费。', act: '改为温差变频控制，低谷自动降频。', waste: 430 }
]
const diagTotal = computed(() => enDiags.reduce((s, d) => s + d.waste, 0))

// ---- 模块4 预警 ----
const enAlerts = [
  { lv: 'high', ico: '⚠️', title: '预计明晨用电高峰超需量', desc: '预测明日 09:00–11:00 用电需量将达 1,520 kW，逼近合同需量上限，存在超需量电费风险。', t: '12 小时后', ttl: '已生成削峰策略，建议储能放电 + 错峰运行。' },
  { lv: 'mid', ico: '🔧', title: '3# 变压器温升异常趋势', desc: '未来 24h 负载率持续上升，绕组温升或将逼近限值。', t: '18 小时后', ttl: '已派发巡检工单，建议均衡负载。' },
  { lv: 'low', ico: '☁️', title: '光伏发电量明日预计下降', desc: '明日阴天，光伏出力预计较今日下降约 40%。', t: '24 小时后', ttl: '已提前调整市电采购调度计划。' }
]

// ---- 模块5 效益 ----
const enBenefits = [
  { label: '⚡ 累计节电量', v: 186420, suffix: 'kWh', subType: 'rate', sub: '同比节约', rate: '8.6%', rateColor: '#1D7A3C' },
  { label: '💰 累计降本金额', v: 152860, suffix: '元', subType: 'text', sub: '电费+燃气+水费综合' },
  { label: '🌱 累计减碳量', v: 148.6, suffix: 'tCO₂', subType: 'rate', sub: '等效植树', rate: '2,472', rateColor: '#1D7A3C' },
  { label: '🪨 累计节煤量', v: 22.9, suffix: 't标煤', subType: 'text', sub: '标煤折合系数 0.1229' }
]
const benefitDisplay = ref(enBenefits.map(() => '0'))

function animateBenefits() {
  enBenefits.forEach((b, i) => {
    const decimals = b.v < 100 ? 1 : 0
    const start = performance.now()
    const duration = 1100
    function step(ts) {
      const p = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      benefitDisplay.value[i] = (b.v * eased).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

const benefitMonths = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月']
const benefitBefore = [285000, 272000, 268000, 290000, 305000, 318000, 335000, 342000]
const benefitAfter = [268000, 254000, 249000, 267000, 278000, 289000, 302000, 308000]

// ---- 模块1 趋势图 ----
const trendRef = ref(null)
const benefitChartRef = ref(null)

function buildTrendOption() {
  return {
    grid: { left: 42, right: 16, top: 14, bottom: 26 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.06)', textStyle: { color: '#1D1D1F', fontSize: 11 }, axisPointer: { type: 'line', lineStyle: { color: 'rgba(0,0,0,0.12)' } } },
    xAxis: { type: 'category', data: hourLabels, boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } }, axisTick: { show: false }, axisLabel: { color: '#AEAEB2', fontSize: 9, interval: 3 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } }, axisLabel: { color: '#AEAEB2', fontSize: 9 } },
    series: [
      { name: '用电功率', type: 'line', smooth: true, symbol: 'none', data: elecCurve, lineStyle: { width: 2.2, color: EN_COLORS.blue }, areaStyle: { color: 'rgba(10,132,255,0.08)' } },
      { name: '用水量', type: 'line', smooth: true, symbol: 'none', data: waterCurve, lineStyle: { width: 1.6, color: EN_COLORS.orange } },
      { name: '光伏发电', type: 'line', smooth: true, symbol: 'none', data: pvCurve, lineStyle: { width: 2, color: EN_COLORS.green }, areaStyle: { color: 'rgba(52,199,89,0.10)' } },
      { name: '燃气用量', type: 'line', smooth: true, symbol: 'none', data: gasCurve, lineStyle: { width: 1.4, color: EN_COLORS.red, type: 'dashed' } }
    ]
  }
}

function buildBenefitOption() {
  return {
    grid: { left: 52, right: 16, top: 14, bottom: 24 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.06)', textStyle: { color: '#1D1D1F', fontSize: 11 }, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,0.04)' } } },
    xAxis: { type: 'category', data: benefitMonths, axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } }, axisTick: { show: false }, axisLabel: { color: '#AEAEB2', fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } }, axisLabel: { color: '#AEAEB2', fontSize: 9, formatter: (v) => (v / 10000) + '万' } },
    series: [
      { name: '优化前', type: 'bar', data: benefitBefore, barWidth: 11, itemStyle: { color: 'rgba(10,132,255,0.55)', borderRadius: [4, 4, 0, 0] } },
      { name: '优化后', type: 'bar', data: benefitAfter, barWidth: 11, itemStyle: { color: 'rgba(52,199,89,0.85)', borderRadius: [4, 4, 0, 0] } }
    ]
  }
}

useEcharts(trendRef, buildTrendOption)
useEcharts(benefitChartRef, buildBenefitOption)

// ---- AI 监测状态逐字提示 ----
const monitorNote = ref('AI 监测中…正在分析各能源介质实时运行态势。')
const monitorNoteOpacity = ref(1)
let monitorTimer = null
function enMonitorTypewriter() {
  const msgs = [
    'AI 监测中…已建立六大能源介质实时数据模型。',
    '✅ 用电负荷平稳，处于合理区间，无异常波动。',
    '✅ 光伏出力达峰 292 kW，储能处于充电状态。',
    '💡 建议：当前处于平段电价，可适度提升储能充电比例。'
  ]
  let i = 0
  monitorTimer = setInterval(() => {
    i = (i + 1) % msgs.length
    monitorNoteOpacity.value = 0
    setTimeout(() => { monitorNote.value = msgs[i]; monitorNoteOpacity.value = 1 }, 260)
  }, 4200)
}

// ---- 重点设备 ----
const EQUIP_CARDS = [
  { key: 'coolingTower', name: '冷却塔', img: '/图片/冷却塔.png', glow: 'rgba(0,199,190,0.32)', status: '运行中', statusCls: 'on', params: [['进出水温', '32.5℃ → 28.1℃'], ['风机频率', '42 Hz']] },
  { key: 'transformer', name: '变压器', img: '/图片/变压器.png', glow: 'rgba(255,159,10,0.30)', status: '负载偏高', statusCls: 'warn', params: [['负载率', '76%'], ['绕组温度', '58℃']] },
  { key: 'pump', name: '水泵', img: '/图片/水泵.png', glow: 'rgba(10,132,255,0.30)', status: '运行中', statusCls: 'on', params: [['流量', '128 m³/h'], ['出口压力', '0.46 MPa']] },
  { key: 'collector', name: '集水器', img: '/图片/集水器.png', glow: 'rgba(191,90,242,0.30)', status: '运行中', statusCls: 'on', params: [['供回水温差', '5.4℃'], ['系统压力', '0.55 MPa']] }
]

const enEquipDetails = {
  coolingTower: {
    name: '冷却塔', img: '/图片/冷却塔.png', glow: 'rgba(0,199,190,0.32)', status: '运行中', statusCls: 'on', color: EN_COLORS.teal, health: 96,
    sub: '中央空调冷却水系统 · 逆流式冷却塔 CT-01',
    kpis: [
      { label: '进出水温', val: '32.5→28.1', unit: '℃' }, { label: '风机频率', val: '42', unit: 'Hz' },
      { label: '循环水量', val: '480', unit: 'm³/h' }, { label: '冷却温差', val: '4.4', unit: '℃' }
    ],
    params: [
      { l: '出水温度', v: '28.1', u: '℃' }, { l: '回水温度', v: '32.5', u: '℃' }, { l: '冷却水温差', v: '4.4', u: '℃' },
      { l: '风机频率', v: '42', u: 'Hz' }, { l: '风机电流', v: '18.6', u: 'A' }, { l: '循环水量', v: '480', u: 'm³/h' },
      { l: '补水流量', v: '2.4', u: 'm³/h' }, { l: '湿球温度', v: '26.3', u: '℃' }, { l: '电机功率', v: '11', u: 'kW' },
      { l: '运行时长', v: '8,642', u: 'h' }
    ],
    series: [
      { name: '出水温度(℃)', yAxisIndex: 0, area: true, color: EN_COLORS.blue, data: [27.8, 27.6, 27.5, 27.4, 27.5, 27.8, 28.2, 28.6, 28.9, 29.0, 28.8, 28.5, 28.2, 28.0, 27.9, 27.8, 27.7, 27.6, 27.5, 27.6, 27.8, 28.0, 28.1, 28.1] },
      { name: '回水温度(℃)', yAxisIndex: 0, color: EN_COLORS.orange, data: [32.2, 32.0, 31.9, 31.8, 32.0, 32.3, 32.8, 33.2, 33.5, 33.6, 33.4, 33.1, 32.8, 32.6, 32.4, 32.3, 32.2, 32.1, 32.0, 32.2, 32.4, 32.6, 32.5, 32.5] },
      { name: '风机频率(Hz)', yAxisIndex: 1, dash: true, color: EN_COLORS.teal, data: [30, 30, 28, 28, 30, 32, 38, 42, 44, 44, 42, 40, 38, 38, 40, 42, 44, 42, 38, 36, 38, 40, 42, 42] }
    ],
    table: [
      { item: '风机频率', spec: '50 Hz', real: '42 Hz', state: '正常' }, { item: '冷却水温差', spec: '≥4.5 ℃', real: '4.4 ℃', state: '正常' },
      { item: '风机电流', spec: '≤21 A', real: '18.6 A', state: '正常' }, { item: '补水流量', spec: '≤3.0 m³/h', real: '2.4 m³/h', state: '正常' },
      { item: '电机温升', spec: '≤75 K', real: '48 K', state: '正常' }
    ]
  },
  transformer: {
    name: '变压器', img: '/图片/变压器.png', glow: 'rgba(255,159,10,0.30)', status: '负载偏高', statusCls: 'warn', color: EN_COLORS.orange, health: 82,
    sub: '综合楼 B1 配电房 · 干式变压器 TR-01（1600 kVA）',
    kpis: [
      { label: '负载率', val: '76', unit: '%' }, { label: '绕组温度', val: '58', unit: '℃' },
      { label: '有功功率', val: '912', unit: 'kW' }, { label: '功率因数', val: '0.95', unit: '' }
    ],
    params: [
      { l: '负载率', v: '76', u: '%' }, { l: 'A相绕组温度', v: '58', u: '℃' }, { l: 'B相绕组温度', v: '56', u: '℃' },
      { l: 'C相绕组温度', v: '57', u: '℃' }, { l: '有功功率', v: '912', u: 'kW' }, { l: '无功功率', v: '286', u: 'kvar' },
      { l: '功率因数', v: '0.95', u: '' }, { l: 'A相电流', v: '1,385', u: 'A' }, { l: '环境温度', v: '32', u: '℃' },
      { l: '运行时长', v: '12,480', u: 'h' }
    ],
    series: [
      { name: '负载率(%)', yAxisIndex: 0, area: true, color: EN_COLORS.orange, data: [45, 42, 40, 38, 40, 48, 62, 78, 88, 92, 90, 86, 82, 84, 88, 86, 80, 74, 76, 80, 72, 58, 50, 48] },
      { name: '绕组温度(℃)', yAxisIndex: 1, color: EN_COLORS.red, data: [38, 37, 36, 35, 37, 41, 48, 54, 58, 60, 59, 57, 55, 56, 58, 57, 54, 51, 52, 54, 50, 44, 41, 39] }
    ],
    table: [
      { item: '负载率', spec: '≤85 %', real: '76 %', state: '正常' }, { item: '绕组温度', spec: '≤155 ℃ 报警', real: '58 ℃', state: '正常' },
      { item: '温升趋势', spec: '平稳', real: '缓慢上升', state: '关注' }, { item: '三相不平衡度', spec: '≤15 %', real: '2.1 %', state: '正常' },
      { item: '功率因数', spec: '≥0.9', real: '0.95', state: '正常' }
    ]
  },
  pump: {
    name: '水泵', img: '/图片/水泵.png', glow: 'rgba(10,132,255,0.30)', status: '运行中', statusCls: 'on', color: EN_COLORS.blue, health: 91,
    sub: '空调机房 · 冷冻水循环泵 CP-02（变频）',
    kpis: [
      { label: '流量', val: '128', unit: 'm³/h' }, { label: '出口压力', val: '0.46', unit: 'MPa' },
      { label: '电机电流', val: '62', unit: 'A' }, { label: '电机频率', val: '38', unit: 'Hz' }
    ],
    params: [
      { l: '流量', v: '128', u: 'm³/h' }, { l: '出口压力', v: '0.46', u: 'MPa' }, { l: '进口压力', v: '0.18', u: 'MPa' },
      { l: '扬程', v: '28', u: 'm' }, { l: '电机频率', v: '38', u: 'Hz' }, { l: '电机电流', v: '62', u: 'A' },
      { l: '轴功率', v: '32', u: 'kW' }, { l: '转速', v: '2,880', u: 'r/min' }, { l: '振动值', v: '2.1', u: 'mm/s' },
      { l: '运行时长', v: '9,876', u: 'h' }
    ],
    series: [
      { name: '流量(m³/h)', yAxisIndex: 0, area: true, color: EN_COLORS.blue, data: [80, 78, 75, 72, 76, 90, 108, 122, 130, 132, 128, 124, 120, 122, 128, 126, 118, 108, 104, 112, 108, 96, 88, 84] },
      { name: '电机电流(A)', yAxisIndex: 0, dash: true, color: EN_COLORS.teal, data: [40, 39, 38, 36, 38, 45, 54, 61, 65, 66, 64, 62, 60, 61, 64, 63, 59, 54, 52, 56, 54, 48, 44, 42] },
      { name: '出口压力(MPa)', yAxisIndex: 1, color: EN_COLORS.orange, data: [0.38, 0.37, 0.36, 0.35, 0.37, 0.40, 0.44, 0.46, 0.47, 0.47, 0.46, 0.45, 0.44, 0.45, 0.46, 0.45, 0.43, 0.41, 0.40, 0.42, 0.41, 0.39, 0.38, 0.37] }
    ],
    table: [
      { item: '出口压力', spec: '0.40–0.50 MPa', real: '0.46 MPa', state: '正常' }, { item: '电机电流', spec: '≤68 A', real: '62 A', state: '正常' },
      { item: '振动值', spec: '≤2.8 mm/s', real: '2.1 mm/s', state: '正常' }, { item: '轴承温度', spec: '≤75 ℃', real: '52 ℃', state: '正常' },
      { item: '流量', spec: '120 ±15% m³/h', real: '128 m³/h', state: '正常' }
    ]
  },
  collector: {
    name: '集水器', img: '/图片/集水器.png', glow: 'rgba(191,90,242,0.30)', status: '运行中', statusCls: 'on', color: EN_COLORS.purple, health: 89,
    sub: '冷冻水系统 · 分集水器 FC-01（四支路）',
    kpis: [
      { label: '供回水温差', val: '5.4', unit: '℃' }, { label: '系统压力', val: '0.55', unit: 'MPa' },
      { label: '供水温度', val: '12.5', unit: '℃' }, { label: '回水温度', val: '17.9', unit: '℃' }
    ],
    params: [
      { l: '供水温度', v: '12.5', u: '℃' }, { l: '回水温度', v: '17.9', u: '℃' }, { l: '供回水温差', v: '5.4', u: '℃' },
      { l: '系统压力', v: '0.55', u: 'MPa' }, { l: '供回水压差', v: '0.18', u: 'MPa' }, { l: '1#支路流量', v: '42', u: 'm³/h' },
      { l: '2#支路流量', v: '38', u: 'm³/h' }, { l: '3#支路流量', v: '33', u: 'm³/h' }, { l: '4#支路流量', v: '15', u: 'm³/h' },
      { l: '运行时长', v: '12,480', u: 'h' }
    ],
    series: [
      { name: '供水温度(℃)', yAxisIndex: 0, area: true, color: EN_COLORS.blue, data: [12.0, 11.8, 11.6, 11.5, 11.7, 12.0, 12.4, 12.8, 13.0, 13.0, 12.8, 12.6, 12.4, 12.3, 12.2, 12.1, 12.0, 11.9, 11.8, 11.9, 12.1, 12.3, 12.5, 12.5] },
      { name: '回水温度(℃)', yAxisIndex: 0, color: EN_COLORS.orange, data: [17.4, 17.2, 17.0, 16.9, 17.1, 17.5, 17.9, 18.3, 18.5, 18.5, 18.3, 18.1, 17.9, 17.8, 17.7, 17.6, 17.5, 17.4, 17.3, 17.4, 17.6, 17.8, 17.9, 17.9] },
      { name: '系统压力(MPa)', yAxisIndex: 1, dash: true, color: EN_COLORS.purple, data: [0.54, 0.53, 0.52, 0.52, 0.53, 0.54, 0.55, 0.56, 0.56, 0.55, 0.55, 0.54, 0.54, 0.55, 0.55, 0.54, 0.53, 0.53, 0.53, 0.54, 0.55, 0.55, 0.55, 0.55] }
    ],
    table: [
      { item: '系统压力', spec: '0.50–0.60 MPa', real: '0.55 MPa', state: '正常' }, { item: '供回水温差', spec: '5 ±1 ℃', real: '5.4 ℃', state: '正常' },
      { item: '供水温度', spec: '≤12 ℃', real: '12.5 ℃', state: '偏高' }, { item: '供回水压差', spec: '0.15–0.20 MPa', real: '0.18 MPa', state: '正常' },
      { item: '补水压力', spec: '0.30–0.40 MPa', real: '0.35 MPa', state: '正常' }
    ]
  }
}

// ---- 设备详情弹窗 ----
const equip = ref(null)
const equipShow = ref(false)
const equipChartRef = ref(null)
let equipChart = null

function buildEquipOption(d) {
  return {
    grid: { left: 46, right: 50, top: 34, bottom: 26 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.94)', borderColor: 'rgba(0,0,0,0.06)', textStyle: { color: '#1D1D1F', fontSize: 11 }, axisPointer: { type: 'line', lineStyle: { color: 'rgba(0,0,0,0.12)' } } },
    legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 8, textStyle: { color: '#6E6E73', fontSize: 10 } },
    xAxis: { type: 'category', data: hourLabels, boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(0,0,0,0.1)' } }, axisTick: { show: false }, axisLabel: { color: '#AEAEB2', fontSize: 9, interval: 3 } },
    yAxis: [
      { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } }, axisLabel: { color: '#AEAEB2', fontSize: 9 } },
      { type: 'value', splitLine: { show: false }, axisLabel: { color: '#AEAEB2', fontSize: 9 } }
    ],
    series: d.series.map((s) => ({
      name: s.name, type: 'line', smooth: true, symbol: 'none', data: s.data, yAxisIndex: s.yAxisIndex || 0,
      lineStyle: { width: 2, color: s.color, type: s.dash ? 'dashed' : 'solid' },
      areaStyle: s.area ? { color: s.color + '18' } : undefined
    }))
  }
}

async function openEquip(key) {
  const d = enEquipDetails[key]
  if (!d) return
  equip.value = d
  equipShow.value = true
  await nextTick()
  if (equipChartRef.value) {
    if (equipChart) equipChart.dispose()
    equipChart = echarts.init(equipChartRef.value)
    equipChart.setOption(buildEquipOption(d))
  }
}
function closeEquip() {
  equipShow.value = false
  if (equipChart) { equipChart.dispose(); equipChart = null }
}

// ---- 模块3 策略推演 ----
const PLAN_CARDS = [
  { icon: '❄️', iconBg: 'rgba(10,132,255,0.12)', name: '中央空调系统', save: '可节能 15%', desc: 'AI 根据室内外温差、人流密度与时段负荷，动态优化冷冻水泵变频与主机群控策略，实现按需供冷。', from: '1,240 kWh', to: '1,054 kWh', target: '85%', gradient: 'linear-gradient(90deg,var(--en-blue),var(--en-cyan))' },
  { icon: '💡', iconBg: 'rgba(255,159,10,0.13)', name: '照明系统', save: '可节能 25%', desc: 'AI 结合人感、光感与作息时间，自动执行分区分时智能调光与自然光优先策略，杜绝长明灯与过度照明。', from: '860 kWh', to: '645 kWh', target: '75%', gradient: 'linear-gradient(90deg,var(--en-orange),var(--en-green))' },
  { icon: '🛗', iconBg: 'rgba(191,90,242,0.13)', name: '电梯与动力系统', save: '可节能 10%', desc: 'AI 智能群控调度减少空载运行，配合能量回馈装置与启停优化，降低垂直交通与动力设备的无效能耗。', from: '430 kWh', to: '387 kWh', target: '90%', gradient: 'linear-gradient(90deg,var(--en-purple),var(--en-blue))' }
]
const planFillWidths = ref(['0%', '0%', '0%'])
const planRunning = ref(false)
const planBtnText = ref('▶ 启动 AI 策略推演')
const planStatus = ref('点击「启动推演」模拟 AI 策略落地过程')
const lastPlanData = ref(null)
const reportTime = ref('')
const LOOP_NODES = [
  { label: '数据建模', icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 3v18"/>' },
  { label: '智能诊断', icon: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>' },
  { label: '策略优化', icon: '<line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="15" cy="17" r="2"/>' },
  { label: '预测预警', icon: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
  { label: '效益量化', icon: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' },
  { label: '自动报告', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' }
]
const loopDone = ref([true, true, true, false, false, false])

function enBuildPlanPrompt() {
  return `你是医院能源管理与节能仿真推演专家。请基于以下南京市浦口人民医院的"当前能耗基线"与"已诊断问题"，对三套节能策略分别做一次仿真推演，给出量化结果。

【当前能耗基线】
- 用电功率：1248 kW（较昨日 ↓5.1%）
- 用水量：12.6 m³/h（较昨日 ↓3.2%）
- 燃气用量：86 m³/h
- 热力负荷：6.8 GJ/h
- 光伏发电：286 kW（正午高峰）
- 储能电量：182 kWh（SOC 65%）
- 今日峰/平/谷用电：6200 / 4100 / 2300 kWh

【已诊断的能耗问题（月浪费金额）】
1. 冷却水泵频繁启停：+1240 元/月
2. 夜间公共区域照明未关：+860 元/月
3. 冷水机组出水温度偏低：+720 元/月
4. 热水循环泵定频运行：+430 元/月

【待推演的三套节能策略】
1. 中央空调系统：变频优化 + 分区分时控制
2. 照明系统：智能照明 + 人感调光 + 自然光优先
3. 电梯与动力系统：群控调度 + 能量回馈 + 启停优化

请严格输出一个 JSON 对象（不要输出 JSON 以外的任何文字、不要用 markdown 代码块包裹），字段如下：
{
  "summary": "整体推演结论，80字以内",
  "plans": [
    {"name":"中央空调系统","savingRate":15.2,"annualEnergySaved":183000,"annualCostSaved":150000,"invest":280000,"payback":1.9,"risk":"中等","suggestion":"一句落地建议"},
    {"name":"照明系统","savingRate":25.0,"annualEnergySaved":210000,"annualCostSaved":168000,"invest":90000,"payback":0.6,"risk":"低","suggestion":"一句落地建议"},
    {"name":"电梯与动力系统","savingRate":10.0,"annualEnergySaved":76000,"annualCostSaved":62000,"invest":150000,"payback":2.4,"risk":"中等","suggestion":"一句落地建议"}
  ],
  "recommendation": "综合推荐方案及排序理由",
  "riskNote": "落地实施的风险提示与建议"
}

数值要求：savingRate 为百分比数值、annualEnergySaved 单位 kWh/年、annualCostSaved 单位 元/年、invest 单位 元、payback 单位 年。数值应符合医院年能耗约 1000 万 kWh、年能源成本约 800 万元的体量，保持合理、自洽，可适当偏离示例值。`
}

function enCallPlanAI(messages) {
  return fetch('/api/ai/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, max_tokens: 2000, temperature: 0.2 })
  }).then(async (response) => {
    if (!response.ok) throw new Error('API ' + response.status)
    const data = await response.json()
    return data.choices && data.choices[0] && data.choices[0].message.content
  })
}

function enParsePlanJSON(text) {
  let t = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim()
  const s = t.indexOf('{'), e = t.lastIndexOf('}')
  if (s >= 0 && e > s) t = t.slice(s, e + 1)
  const data = JSON.parse(t)
  if (!data.plans || !Array.isArray(data.plans) || data.plans.length === 0) throw new Error('shape')
  data.plans.forEach((p) => {
    p.savingRate = Number(p.savingRate) || 0
    p.annualEnergySaved = Number(p.annualEnergySaved) || 0
    p.annualCostSaved = Number(p.annualCostSaved) || 0
    p.invest = Number(p.invest) || 0
    p.payback = Number(p.payback) || 0
    p.risk = p.risk || '中'
    p.suggestion = p.suggestion || ''
  })
  data.source = 'ai'
  const sum = data.plans.reduce((a, p) => a + p.savingRate, 0)
  data.savingRate = (sum / data.plans.length).toFixed(1)
  return data
}

function enFallbackPlanData() {
  return {
    source: 'local', savingRate: '16.7',
    summary: '综合推演：三套策略落地后，医院综合节能率约 16.7%，预计年节电 36.8 万 kWh、年降本约 30.2 万元，其中照明系统投入产出比最高，建议优先实施。',
    plans: [
      { name: '中央空调系统', savingRate: 15.2, annualEnergySaved: 183000, annualCostSaved: 150000, invest: 280000, payback: 1.9, risk: '中等', suggestion: '先做冷冻水泵变频试点，验证后推广主机群控。' },
      { name: '照明系统', savingRate: 25.0, annualEnergySaved: 136000, annualCostSaved: 112000, invest: 90000, payback: 0.8, risk: '低', suggestion: '优先落地公共区域人感调光与自然光优先策略。' },
      { name: '电梯与动力系统', savingRate: 10.0, annualEnergySaved: 49000, annualCostSaved: 40000, invest: 150000, payback: 3.8, risk: '中等', suggestion: '结合电梯改造周期分批实施能量回馈。' }
    ],
    recommendation: '建议按「照明 → 中央空调 → 电梯动力」顺序分三期落地：先做低成本高回报的照明系统，再推进空调变频，最后结合设备改造周期实施电梯能量回馈。',
    riskNote: '仿真结果基于当前能耗基线推算，实际节能率受季节负荷、设备工况与运维执行影响，建议落地后按月复核并动态修正策略参数。'
  }
}

function enRiskClass(risk) {
  const r = String(risk || '')
  if (r.indexOf('高') >= 0) return 'high'
  if (r.indexOf('低') >= 0) return 'low'
  return 'mid'
}

async function enRunPlan() {
  if (planRunning.value) return
  planRunning.value = true
  planBtnText.value = '⏳ 推演中…'
  planStatus.value = '🧠 AI 正在构建数字孪生模型，调用 DeepSeek 进行仿真推演…'
  lastPlanData.value = null

  const aiPromise = enCallPlanAI([
    { role: 'system', content: '你是医院节能仿真推演专家，只输出一个合法的 JSON 对象，不输出任何其他内容。' },
    { role: 'user', content: enBuildPlanPrompt() }
  ]).then(enParsePlanJSON).catch(() => enFallbackPlanData())

  ;[3, 4, 5].forEach((idx, k) => { setTimeout(() => { loopDone.value[idx] = true }, 500 * (k + 1)) })
  PLAN_CARDS.forEach((card, k) => { setTimeout(() => { planFillWidths.value[k] = card.target }, 500 * (k + 1)) })

  setTimeout(async () => {
    const data = await aiPromise
    lastPlanData.value = data
    reportTime.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    planRunning.value = false
    planBtnText.value = '✓ 推演完成 · 查看下方报告'
    if (data.source === 'ai') {
      planStatus.value = '✅ AI 推演完成：综合节能率约 ' + data.savingRate + '%，详见下方仿真推演报告。'
      showToast('✓ AI 仿真推演完成，已生成推演报告')
    } else {
      planStatus.value = '⚠️ AI 接口暂不可用，已回退本地仿真结果（综合节能率 ' + data.savingRate + '%）。'
      showToast('⚠️ AI 接口调用失败，已展示本地仿真结果', true)
    }
    setTimeout(() => { planBtnText.value = '▶ 启动 AI 策略推演' }, 2600)
  }, 2200)
}

function enResetPlan() {
  planFillWidths.value = ['0%', '0%', '0%']
  loopDone.value = [true, true, true, false, false, false]
  planStatus.value = '点击「启动推演」，AI 将基于当前能耗数据生成仿真推演结果'
  lastPlanData.value = null
  planBtnText.value = '▶ 启动 AI 策略推演'
  planRunning.value = false
}

function enCloseReport() {
  lastPlanData.value = null
}

// ---- 模块6 报告 ----
const reportShow = ref(false)
const reportHtml = ref('')
const genBtnLoading = ref(false)

function sevText(s) { return s === 'high' ? '高' : s === 'mid' ? '中' : '低' }

function enBuildReportHTML() {
  const plan = lastPlanData.value || enFallbackPlanData()
  const totalWaste = enDiags.reduce((s, d) => s + d.waste, 0)
  const now = new Date()
  const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日'
  const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')

  const metrics = [
    ['用水量', '12.6', 'm³/h', '↓ 3.2%'], ['用电功率', '1,248', 'kW', '↓ 5.1%'],
    ['燃气用量', '86', 'm³/h', '→ 0.4%'], ['热力负荷', '6.8', 'GJ/h', '↓ 2.7%'],
    ['光伏发电', '286', 'kW', '↑ 12%'], ['储能电量', '182', 'kWh', 'SOC 65%']
  ]
  const metricRows = metrics.map((m) => {
    const cls = m[3].indexOf('↓') >= 0 ? 'rpt-down' : m[3].indexOf('↑') >= 0 ? 'rpt-up' : ''
    return `<tr><td>${m[0]}</td><td>${m[1]}</td><td>${m[2]}</td><td class="${cls}">${m[3]}</td></tr>`
  }).join('')

  const diagRows = enDiags.map((d) => `<tr><td><span class="rpt-sev ${d.sev}">${sevText(d.sev)}</span></td><td>${d.title}</td><td>${d.src}</td><td>${fmt(d.waste)} 元/月</td></tr>`).join('')
  const planRows = plan.plans.map((p) => `<tr><td>${p.name}</td><td>${p.savingRate}%</td><td>${fmt(p.annualEnergySaved)}</td><td>${fmt(p.annualCostSaved)}</td><td>${fmt(p.invest)}</td><td>${p.payback} 年</td><td>${p.risk}</td></tr>`).join('')
  const alertRows = enAlerts.map((a) => `<tr><td><span class="rpt-sev ${a.lv}">${sevText(a.lv)}</span></td><td>${a.title}</td><td>${a.t}</td></tr>`).join('')

  const benLabels = ['累计节电量', '累计降本金额', '累计减碳量', '累计节煤量']
  const benRows = enBenefits.map((b, i) => `<div class="rpt-b-item"><span>${benLabels[i]}</span><b>${fmt(b.v)}</b><small>${b.suffix.trim()}</small></div>`).join('')

  const peak = splitData.find((s) => s.label === '峰')
  const flat = splitData.find((s) => s.label === '平')
  const valley = splitData.find((s) => s.label === '谷')
  const splitNote = `今日峰/平/谷用电拆分：峰段 ${fmt(peak.v)} kWh · 平段 ${fmt(flat.v)} kWh · 谷段 ${fmt(valley.v)} kWh。`

  const yearElec = plan.plans.reduce((s, p) => s + p.annualEnergySaved, 0)
  const yearCost = plan.plans.reduce((s, p) => s + p.annualCostSaved, 0)

  return `
    <div class="rpt">
      <div class="rpt-head">
        <div class="rpt-logo">E</div>
        <h1>E智维 AI 节能分析报告</h1>
        <div class="rpt-sub">南京市浦口人民医院 · 后勤能源管理中心</div>
        <div class="rpt-meta">报告周期：2026 年 8 月（月度）　|　生成时间：${dateStr} ${timeStr}　|　生成方式：AI 智能分析引擎</div>
      </div>

      <h2 class="rpt-h2">一、能耗概况</h2>
      <table class="rpt-table">
        <thead><tr><th>能源介质</th><th>当前值</th><th>单位</th><th>环比趋势</th></tr></thead>
        <tbody>${metricRows}</tbody>
      </table>
      <p class="rpt-note">${splitNote}光伏正午出力达峰 286 kW，储能 SOC 65%。</p>

      <h2 class="rpt-h2">二、能耗异常诊断与浪费溯源</h2>
      <table class="rpt-table">
        <thead><tr><th>级别</th><th>异常项</th><th>故障源</th><th>月浪费金额</th></tr></thead>
        <tbody>${diagRows}</tbody>
      </table>
      <p class="rpt-note">本期 AI 共诊断 <b>${enDiags.length}</b> 项异常，合计月浪费约 <b class="rpt-red">${fmt(totalWaste)} 元</b>，建议优先处置「冷却水泵频繁启停」与「夜间照明未关」两项高价值问题。</p>

      <h2 class="rpt-h2">三、节能策略推演与优化</h2>
      <table class="rpt-table">
        <thead><tr><th>策略方案</th><th>节能率</th><th>年节电量(kWh)</th><th>年降本(元)</th><th>投资额(元)</th><th>回收期</th><th>风险</th></tr></thead>
        <tbody>${planRows}</tbody>
      </table>
      <p class="rpt-note">${plan.summary}</p>
      <p class="rpt-note"><b>最优推荐：</b>${plan.recommendation}</p>

      <h2 class="rpt-h2">四、预测性预警</h2>
      <table class="rpt-table">
        <thead><tr><th>级别</th><th>预警内容</th><th>预测触发</th></tr></thead>
        <tbody>${alertRows}</tbody>
      </table>

      <h2 class="rpt-h2">五、节能效益量化</h2>
      <div class="rpt-benefit">${benRows}</div>

      <h2 class="rpt-h2">六、AI 综合分析结论</h2>
      <div class="rpt-conclusion">
        <p>本期医院能源系统整体运行平稳，综合能耗呈下降趋势。AI 诊断发现 ${enDiags.length} 项能耗浪费点，合计月浪费约 ${fmt(totalWaste)} 元；经策略推演，三套节能方案综合节能率约 ${plan.savingRate}%，预计年节电 ${fmt(yearElec)} kWh、年降本约 ${fmt(yearCost)} 元，其中「照明系统」投入产出比最高，建议优先实施。</p>
        <p>预测预警方面，需重点关注「明晨用电高峰超需量」风险，建议执行储能放电与错峰运行策略。全年累计已实现节电 ${fmt(enBenefits[0].v)} kWh、减碳 ${enBenefits[2].v} tCO₂（等效植树约 2,472 棵），节能成效显著。</p>
      </div>

      <div class="rpt-footer">
        <div>报告单位：南京中建八局智慧科技有限公司</div>
        <div>E智维智能体平台 · 本报告由 AI 智能分析引擎自动生成</div>
        <div class="rpt-disclaimer">⚠️ 本报告数据基于当前能耗采集与模拟推演结果，仅供参考，具体以现场实测为准。</div>
      </div>
    </div>`
}

function enGenReport() {
  genBtnLoading.value = true
  setTimeout(() => {
    reportHtml.value = enBuildReportHTML()
    reportShow.value = true
    genBtnLoading.value = false
    showToast('✓ AI 节能分析报告已生成，共含六大板块')
  }, 700)
}

function enCloseReportModal() {
  reportShow.value = false
}

function enExportReport(type) {
  const title = 'AI节能分析报告_' + new Date().toISOString().slice(0, 10)
  const html = enBuildReportHTML()
  const fullHtml = `<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:#1D1D1F;margin:40px;line-height:1.7}
.rpt-head{text-align:center;margin-bottom:26px}
.rpt-logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0A84FF,#00C7BE);color:#fff;font-size:20px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.rpt-head h1{font-size:22px;margin:0 0 6px}
.rpt-sub{font-size:13px;color:#6E6E73}
.rpt-meta{font-size:11px;color:#AEAEB2}
.rpt-h2{font-size:15px;margin:24px 0 12px;padding-left:10px;border-left:3px solid #0A84FF}
.rpt-table{width:100%;border-collapse:collapse;font-size:12px}
.rpt-table th,.rpt-table td{padding:9px 12px;border-bottom:1px solid #eee;text-align:left}
.rpt-table th{background:#f5f5f7;font-weight:700;color:#6E6E73;font-size:11px}
.rpt-sev{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px}
.rpt-sev.high{background:#fde8e7;color:#D70015}
.rpt-sev.mid{background:#fff4e5;color:#B36B00}
.rpt-sev.low{background:#e8f1fc;color:#0A6ED1}
.rpt-down{color:#1D7A3C;font-weight:600}
.rpt-up{color:#0A6ED1;font-weight:600}
.rpt-note{font-size:12px;margin-top:10px;color:#4A4A4F}
.rpt-red{color:#D70015}
.rpt-benefit{display:flex;gap:12px}
.rpt-b-item{flex:1;background:#f0faf2;border:1px solid #d5ecd9;border-radius:12px;padding:14px;text-align:center}
.rpt-b-item span{display:block;font-size:11px;color:#6E6E73;margin-bottom:6px}
.rpt-b-item b{font-size:22px;font-weight:700}
.rpt-b-item small{font-size:11px;color:#6E6E73;margin-left:3px}
.rpt-conclusion{background:#f4f8ff;border:1px solid #dbe7ff;border-radius:12px;padding:16px 18px}
.rpt-conclusion p{font-size:12.5px;margin:0 0 8px}
.rpt-footer{margin-top:30px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#AEAEB2}
.rpt-disclaimer{margin-top:8px;color:#B36B00}
@media print{body{margin:0;padding:20px}}
</style></head><body>${html}</body></html>`

  if (type === 'pdf') {
    const w = window.open('', '_blank')
    if (!w) { showToast('浏览器拦截了弹窗，请允许后重试', true); return }
    w.document.write(fullHtml)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 500)
    showToast('✓ 已在新窗口打开报告，请选择"另存为 PDF"')
  } else if (type === 'word') {
    const blob = new Blob(['﻿' + fullHtml], { type: 'application/msword' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = title + '.doc'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
    showToast('✓ Word 报告已导出')
  } else {
    const plan = lastPlanData.value || enFallbackPlanData()
    const lines = []
    lines.push('能源介质,当前值,单位,环比趋势')
    ;[['用水量', '12.6', 'm³/h', '↓3.2%'], ['用电功率', '1248', 'kW', '↓5.1%'], ['燃气用量', '86', 'm³/h', '→0.4%'], ['热力负荷', '6.8', 'GJ/h', '↓2.7%'], ['光伏发电', '286', 'kW', '↑12%'], ['储能电量', '182', 'kWh', 'SOC65%']].forEach((r) => lines.push(r.join(',')))
    lines.push('')
    lines.push('异常项,故障源,月浪费金额(元)')
    enDiags.forEach((d) => lines.push([d.title, d.src, d.waste].join(',')))
    lines.push('')
    lines.push('策略方案,节能率%,年节电量kWh,年降本元,投资元,回收期年,风险')
    plan.plans.forEach((p) => lines.push([p.name, p.savingRate, p.annualEnergySaved, p.annualCostSaved, p.invest, p.payback, p.risk].join(',')))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = title + '.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
    showToast('✓ Excel(CSV) 报告已导出')
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') { enCloseReportModal(); closeEquip() }
}
function onResize() {
  if (equipChart) equipChart.resize()
}

onMounted(() => {
  animateKpis()
  animateBenefits()
  enMonitorTypewriter()
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  if (monitorTimer) clearInterval(monitorTimer)
  if (equipChart) equipChart.dispose()
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="en-page">
    <div class="en-header">
      <div class="en-title">
        <div class="en-title-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div>
          <h2>AI节能智能分析与优化中心</h2>
          <div class="en-title-sub">AI 数据建模 → 智能诊断 → 策略优化 → 预测预警 → 效益量化 → 自动报告</div>
        </div>
      </div>
      <div class="en-ai-status"><span class="dot"></span>AI 引擎运行中 · 实时在线</div>
    </div>

    <!-- AI 闭环流程条 -->
    <div class="en-loop">
      <div v-for="(n, i) in LOOP_NODES" :key="n.label" class="en-loop-node" :class="{ done: loopDone[i] }">
        <div class="en-loop-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" v-html="n.icon"></svg></div>
        <span class="en-loop-label">{{ n.label }}</span>
      </div>
    </div>

    <!-- 模块1 -->
    <div class="en-card">
      <div class="en-card-head">
        <div class="en-card-title"><span class="en-card-num">1</span>AI精细化实时能耗智能监测</div>
        <div class="en-card-tag"><span class="dot" style="width:6px;height:6px;border-radius:50%;background:var(--en-green)"></span>数据每 5 秒刷新 · AI 秒级监测</div>
      </div>
      <div class="en-kpi-grid">
        <div v-for="(k, i) in enKpis" :key="KPI_META[i].name" class="en-kpi" :class="KPI_META[i].cls">
          <div class="en-kpi-top">
            <span class="en-kpi-name">{{ KPI_META[i].name }}</span>
            <span class="en-kpi-ico" :style="{ background: KPI_META[i].bg }">{{ KPI_META[i].ico }}</span>
          </div>
          <div class="en-kpi-val"><span>{{ kpiDisplay[i] }}</span><small>{{ KPI_META[i].unit }}</small></div>
          <div class="en-kpi-foot">
            <span class="en-kpi-trend" :class="k.cls">{{ k.trend }}</span>
            <span>{{ k.note }}</span>
          </div>
        </div>
      </div>

      <!-- 重点设备实时运行 -->
      <div class="en-equip-head">
        <span class="en-equip-title">🏭 重点设备 · 实时运行态势</span>
        <span class="en-equip-tag">冷却塔 / 变压器 / 水泵 / 集水器 · 设备级监测</span>
      </div>
      <div class="en-equip-row">
        <div v-for="e in EQUIP_CARDS" :key="e.key" class="en-equip-card" @click="openEquip(e.key)">
          <div class="en-equip-visual" :style="{ '--glow': e.glow }">
            <img :src="e.img" :alt="e.name">
            <span class="en-equip-status" :class="e.statusCls">{{ e.status }}</span>
          </div>
          <div class="en-equip-name">{{ e.name }}</div>
          <div class="en-equip-params">
            <div class="en-equip-param"><span>{{ e.params[0][0] }}</span><b>{{ e.params[0][1] }}</b></div>
            <div class="en-equip-param"><span>{{ e.params[1][0] }}</span><b>{{ e.params[1][1] }}</b></div>
          </div>
        </div>
      </div>

      <div class="en-chart-row" style="margin-top:14px;">
        <div class="en-chart-box">
          <div class="en-legend">
            <span class="en-legend-item"><span class="en-legend-dot" style="background:var(--en-blue)"></span>用电功率</span>
            <span class="en-legend-item"><span class="en-legend-dot" style="background:var(--en-orange)"></span>用水量</span>
            <span class="en-legend-item"><span class="en-legend-dot" style="background:var(--en-green)"></span>光伏发电</span>
            <span class="en-legend-item"><span class="en-legend-dot" style="background:var(--en-red)"></span>燃气用量</span>
          </div>
          <div class="en-chart" ref="trendRef"></div>
        </div>
        <div class="en-side-panel">
          <div class="en-side-block">
            <div class="en-side-block-title">峰谷平时段拆分（今日）</div>
            <div v-for="s in splitData" :key="s.label" class="en-split-row">
              <span class="en-split-name">{{ s.label }}</span>
              <span class="en-split-bar"><span class="en-split-fill" :style="{ width: (s.v / splitMax * 100).toFixed(1) + '%', background: s.color }"></span></span>
              <span class="en-split-val">{{ fmt(s.v) }} kWh</span>
            </div>
          </div>
          <div class="en-ai-note" :style="{ opacity: monitorNoteOpacity }">{{ monitorNote }}</div>
        </div>
      </div>
    </div>

    <!-- 模块2 -->
    <div class="en-card">
      <div class="en-card-head">
        <div class="en-card-title"><span class="en-card-num">2</span>AI能耗异常诊断与浪费智能溯源</div>
        <div class="en-card-tag">已诊断 <b style="color:var(--en-ink)">{{ enDiags.length }}</b> 项异常 · 预估月浪费 <b style="color:var(--en-red)">{{ fmt(diagTotal) }} 元</b></div>
      </div>
      <div class="en-diag-list">
        <div v-for="d in enDiags" :key="d.title" class="en-diag">
          <span class="en-diag-sev" :class="d.sev">{{ d.sev === 'high' ? '高' : d.sev === 'mid' ? '中' : '低' }}</span>
          <div class="en-diag-body">
            <div class="en-diag-title">{{ d.title }} <span class="en-diag-src">{{ d.src }}</span></div>
            <div class="en-diag-desc">{{ d.desc }}</div>
            <div class="en-diag-act">✅ AI 建议：{{ d.act }}</div>
          </div>
          <div class="en-diag-meta">月浪费<b :style="{ color: d.sev === 'high' ? 'var(--en-red)' : 'var(--en-ink)' }">{{ fmt(d.waste) }}</b>元</div>
        </div>
      </div>
    </div>

    <!-- 模块3 -->
    <div class="en-card">
      <div class="en-card-head">
        <div class="en-card-title"><span class="en-card-num">3</span>AI节能策略智能推演与落地优化</div>
        <div class="en-card-tag">基于数字孪生模型 · 模拟推演最优策略</div>
      </div>
      <div class="en-plan-grid">
        <div v-for="(c, i) in PLAN_CARDS" :key="c.name" class="en-plan">
          <div class="en-plan-head">
            <span class="en-plan-name"><span class="en-plan-ico" :style="{ background: c.iconBg }">{{ c.icon }}</span>{{ c.name }}</span>
            <span class="en-plan-save">{{ c.save }}</span>
          </div>
          <div class="en-plan-desc">{{ c.desc }}</div>
          <div class="en-plan-vs"><span class="from">{{ c.from }}</span><span class="arrow">→</span><span class="to">{{ c.to }}</span></div>
          <div class="en-plan-bar"><span class="en-plan-fill" :style="{ width: planFillWidths[i], background: c.gradient }"></span></div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;align-items:center;">
        <button class="en-btn en-btn-primary" :class="{ 'en-scan': planRunning }" :disabled="planRunning" @click="enRunPlan">{{ planBtnText }}</button>
        <button class="en-btn en-btn-ghost" @click="enResetPlan">重置</button>
        <span style="font-size:11px;color:var(--en-ink-3)">{{ planStatus }}</span>
      </div>

      <div v-if="lastPlanData" class="en-plan-report">
        <div class="en-rp-head">
          <div>
            <div class="en-rp-title">🤖 AI 仿真推演报告 <span v-if="lastPlanData.source === 'local'" class="en-rp-local">本地仿真</span></div>
            <div class="en-rp-meta">{{ lastPlanData.source === 'ai' ? '基于 DeepSeek 大模型 · 数字孪生仿真' : '离线本地仿真' }} · 生成于 {{ reportTime }}</div>
          </div>
          <button class="en-btn en-btn-ghost" @click="enCloseReport">收起</button>
        </div>
        <div class="en-rp-summary">📋 {{ lastPlanData.summary }}</div>
        <div class="en-rp-table">
          <div class="en-rp-row head">
            <div class="en-rp-cell name">方案</div><div class="en-rp-cell num">节能率</div><div class="en-rp-cell num">年节电量</div>
            <div class="en-rp-cell num">年降本</div><div class="en-rp-cell num">投资额</div><div class="en-rp-cell num">回收期</div><div class="en-rp-cell">风险</div>
          </div>
          <div v-for="p in lastPlanData.plans" :key="p.name" class="en-rp-row">
            <div class="en-rp-cell name"><b>{{ p.name }}</b><span class="en-rp-sugg">{{ p.suggestion }}</span></div>
            <div class="en-rp-cell num"><b>{{ p.savingRate }}%</b><span>节能率</span></div>
            <div class="en-rp-cell num"><b>{{ fmt(p.annualEnergySaved) }}</b><span>kWh/年</span></div>
            <div class="en-rp-cell num"><b>{{ fmt(p.annualCostSaved) }}</b><span>元/年</span></div>
            <div class="en-rp-cell num"><b>{{ fmt(p.invest) }}</b><span>投资(元)</span></div>
            <div class="en-rp-cell num"><b>{{ p.payback }}</b><span>回收期(年)</span></div>
            <div class="en-rp-cell"><span class="en-rp-risk" :class="enRiskClass(p.risk)">{{ p.risk }}</span></div>
          </div>
        </div>
        <div class="en-rp-foot">
          <div class="en-rp-reco">🎯 <b>最优推荐：</b>{{ lastPlanData.recommendation }}</div>
          <div class="en-rp-risknote">⚠️ {{ lastPlanData.riskNote }}</div>
        </div>
      </div>
    </div>

    <!-- 模块4 -->
    <div class="en-card">
      <div class="en-card-head">
        <div class="en-card-title"><span class="en-card-num">4</span>AI预测性预警与智能运维</div>
        <div class="en-card-tag">12~24 小时超前预判 · 分级处置闭环</div>
      </div>
      <div class="en-alert" v-for="a in enAlerts" :key="a.title">
        <div class="en-alert-ico" :class="a.lv">{{ a.ico }}</div>
        <div class="en-alert-body">
          <div class="en-alert-title">{{ a.title }} <span class="en-alert-lv" :class="a.lv">{{ a.lv === 'high' ? '高' : '预警' }}</span></div>
          <div class="en-alert-desc">{{ a.desc }}</div>
          <div class="en-alert-desc" style="color:var(--en-blue);margin-top:3px;">🛠 {{ a.ttl }}</div>
        </div>
        <div class="en-alert-time"><b>{{ a.t }}</b>预测触发</div>
      </div>
    </div>

    <!-- 模块5 -->
    <div class="en-card">
      <div class="en-card-head">
        <div class="en-card-title"><span class="en-card-num">5</span>AI节能效益智能量化与复盘</div>
        <div class="en-card-tag">累计核算区间：本年度 1-8 月</div>
      </div>
      <div class="en-benefit-grid">
        <div v-for="(b, i) in enBenefits" :key="b.label" class="en-benefit">
          <div class="en-benefit-label">{{ b.label }}</div>
          <div class="en-benefit-val"><span>{{ benefitDisplay[i] }}</span><small> {{ b.suffix }}</small></div>
          <div class="en-benefit-sub">
            <template v-if="b.subType === 'rate'">{{ b.sub }} <b :style="{ color: b.rateColor }">{{ b.rate }}</b> 棵</template>
            <template v-else>{{ b.sub }}</template>
          </div>
        </div>
      </div>
      <div class="en-chart-box" style="margin-top:14px;">
        <div class="en-legend">
          <span class="en-legend-item"><span class="en-legend-dot" style="background:var(--en-blue)"></span>优化前</span>
          <span class="en-legend-item"><span class="en-legend-dot" style="background:var(--en-green)"></span>优化后</span>
          <span class="en-legend-item" style="margin-left:auto">单位：kWh/月</span>
        </div>
        <div class="en-chart" ref="benefitChartRef" style="height:220px;"></div>
      </div>
    </div>

    <!-- 模块6 -->
    <div class="en-card" style="margin-bottom:0;">
      <div class="en-card-head">
        <div class="en-card-title"><span class="en-card-num">6</span>AI智能数据分析与自动报告</div>
        <div class="en-card-tag">周报 · 月报 · 自动生成 · 一键导出</div>
      </div>
      <div class="en-report-body">
        <div class="en-report-info">
          <div class="en-report-line">📊 <b>数据范围</b>：水、电、气、热、光伏、储能六大能源介质全量采集数据</div>
          <div class="en-report-line">🧠 <b>AI 分析内容</b>：能耗趋势、异常诊断、策略效果、预测预警、效益复盘</div>
          <div class="en-report-line">🗓️ <b>报告周期</b>：周报（每周一 08:00 自动生成）、月报（每月 1 日自动生成）</div>
          <div class="en-report-line">📬 <b>推送方式</b>：站内信 + 邮件推送至后勤、物业、管理层</div>
        </div>
        <div class="en-report-actions">
          <button class="en-btn en-btn-primary" :disabled="genBtnLoading" @click="enGenReport">{{ genBtnLoading ? '⏳ 生成中…' : '🤖 立即生成 AI 报告' }}</button>
          <button class="en-btn en-btn-ghost" @click="enExportReport('pdf')">📄 导出 PDF</button>
          <button class="en-btn en-btn-ghost" @click="enExportReport('excel')">📊 导出 Excel</button>
        </div>
      </div>
    </div>

    <!-- 设备详情弹窗 -->
    <div class="en-modal-overlay" :class="{ show: equipShow }" @click.self="closeEquip">
      <div class="en-modal en-eq-modal">
        <div class="en-modal-bar">
          <div class="en-modal-dot red" @click="closeEquip" title="关闭"></div>
          <div class="en-modal-dot yellow"></div>
          <div class="en-modal-dot green"></div>
          <div class="en-modal-title">{{ equip?.name }} · 运行态势</div>
          <div class="en-modal-tools"><button @click="closeEquip" style="color:#D70015">✕ 关闭</button></div>
        </div>
        <div class="en-modal-body en-eq-body">
          <div v-if="equip">
            <div class="en-eq-hero">
              <div class="en-eq-img" :style="{ '--glow': equip.glow }">
                <img :src="equip.img" :alt="equip.name">
                <span class="en-equip-status" :class="equip.statusCls">{{ equip.status }}</span>
              </div>
              <div class="en-eq-info">
                <div>
                  <div class="en-eq-name">{{ equip.name }}</div>
                  <div class="en-eq-sub">{{ equip.sub }}</div>
                </div>
                <div class="en-eq-health">
                  <div class="en-eq-health-head"><span>设备健康度</span><b>{{ equip.health }}%</b></div>
                  <div class="en-eq-health-bar"><span class="en-eq-health-fill" :style="{ width: equip.health + '%', background: equip.color }"></span></div>
                </div>
                <div class="en-eq-kpis">
                  <div v-for="k in equip.kpis" :key="k.label" class="en-eq-kpi">
                    <span class="en-eq-kpi-label">{{ k.label }}</span>
                    <span class="en-eq-kpi-val">{{ k.val }}<small>{{ k.unit }}</small></span>
                  </div>
                </div>
              </div>
            </div>

            <div class="en-eq-sec">📊 实时运行参数</div>
            <div class="en-eq-grid">
              <div v-for="p in equip.params" :key="p.l" class="en-eq-param"><span>{{ p.l }}</span><b>{{ p.v }}<small>{{ p.u }}</small></b></div>
            </div>

            <div class="en-eq-sec">📈 24 小时运行趋势</div>
            <div class="en-eq-chart" ref="equipChartRef"></div>

            <div class="en-eq-sec">📋 运行参数对照</div>
            <div class="en-eq-table">
              <div class="en-eq-trow head"><span>监测项</span><span>额定 / 规范值</span><span>实时值</span><span>状态</span></div>
              <div v-for="r in equip.table" :key="r.item" class="en-eq-trow">
                <span>{{ r.item }}</span><span>{{ r.spec }}</span><span>{{ r.real }}</span>
                <span :class="r.state === '正常' ? 'ok' : 'warn'">{{ r.state }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI 节能分析报告弹窗 -->
    <div class="en-modal-overlay" :class="{ show: reportShow }" @click.self="enCloseReportModal">
      <div class="en-modal">
        <div class="en-modal-bar">
          <div class="en-modal-dot red" @click="enCloseReportModal" title="关闭"></div>
          <div class="en-modal-dot yellow"></div>
          <div class="en-modal-dot green"></div>
          <div class="en-modal-title">AI 节能分析报告</div>
          <div class="en-modal-tools">
            <button @click="enExportReport('pdf')">📄 PDF</button>
            <button @click="enExportReport('word')">📝 Word</button>
            <button @click="enExportReport('excel')">📊 Excel</button>
            <button @click="enCloseReportModal" style="color:#D70015">✕ 关闭</button>
          </div>
        </div>
        <div class="en-modal-body" v-html="reportHtml"></div>
      </div>
    </div>
  </div>
</template>
