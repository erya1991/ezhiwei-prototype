<script setup>
import { ref, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useEcharts } from '../composables/useEcharts'
import { alarmData } from '../data/dashboard'
import WaterTankCard from '../components/dashboard/WaterTankCard.vue'
import AlarmHostCard from '../components/dashboard/AlarmHostCard.vue'
import OverviewModal from '../components/dashboard/OverviewModal.vue'

// ---- 概览弹窗 ----
const ovOpen = ref(false)

// ---- 图表 ----
const trendRef = ref(null)
const pieRef = ref(null)
const currentView = ref('trend')

function buildTrendOption() {
  const days = [], alerts = [], works = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push((d.getMonth() + 1) + '/' + d.getDate())
    alerts.push(Math.floor(Math.random() * 18 + 4))
    works.push(Math.floor(Math.random() * 14 + 8))
  }
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.94)',
      borderColor: 'rgba(0,0,0,0.08)',
      textStyle: { color: '#1D1D1D', fontSize: 11, fontWeight: 500 }
    },
    legend: { bottom: 0, textStyle: { fontSize: 10, color: '#6B6B6B' }, itemWidth: 10, itemHeight: 6, itemGap: 16 },
    grid: { left: 4, right: 12, top: 6, bottom: 28 },
    xAxis: {
      type: 'category', data: days,
      axisLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } },
      axisTick: { show: false },
      axisLabel: { color: '#9B9B9B', fontSize: 9, interval: 5 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.04)' } },
      axisLabel: { color: '#9B9B9B', fontSize: 9 }
    },
    series: [
      {
        name: '告警总量', type: 'line', smooth: true, symbol: 'none',
        lineStyle: { color: '#D93025', width: 1.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(217,48,37,0.08)' },
            { offset: 1, color: 'rgba(217,48,37,0)' }
          ])
        },
        data: alerts
      },
      {
        name: '工单处理', type: 'line', smooth: true, symbol: 'none',
        lineStyle: { color: '#2173D8', width: 1.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(33,115,216,0.08)' },
            { offset: 1, color: 'rgba(33,115,216,0)' }
          ])
        },
        data: works
      }
    ]
  }
}

function buildPieOption() {
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.94)',
      borderColor: 'rgba(0,0,0,0.08)',
      textStyle: { color: '#1D1D1D', fontSize: 11 }
    },
    color: ['#D93025', '#FF9500', '#2173D8', '#107C10', '#757575'],
    series: [{
      type: 'pie', radius: ['55%', '78%'], center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 8 },
      label: { show: false },
      emphasis: { scaleSize: 6, label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: [
        { value: 18, name: '消防告警' },
        { value: 12, name: '设备故障' },
        { value: 8, name: '隐患预警' },
        { value: 6, name: '能耗预警' },
        { value: 3, name: '其他' }
      ]
    }]
  }
}

const trendChart = useEcharts(trendRef, buildTrendOption)
const pieChart = useEcharts(pieRef, buildPieOption)

function switchView(view) {
  if (view === currentView.value) return
  currentView.value = view
  nextTick(() => {
    if (view === 'trend') trendChart.resize()
    else pieChart.resize()
  })
}

// ---- 内容数据（原 demo 内联标记 → 数据驱动）----
const kpiItems = [
  { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#D93025" stroke-width="1.5"><path d="M12 2C8 6 4 8 4 12c0 4.42 3.58 8 8 8s8-3.58 8-8c0-4-4-6-8-10z"/></svg>', value: '12,846', label: '消防设备', sub: '烟感·温感·喷淋·水泵' },
  { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#2173D8" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', value: '563', label: '专家知识库', sub: '6位专家 · 8大专项' },
  { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#7A5AF8" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/><line x1="20" y1="15" x2="23" y2="15"/></svg>', value: '368', label: 'AI智能体', sub: '烟火识别·能耗诊断·随手拍' },
  { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#FF9500" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', value: '156', label: '智能工单', sub: '待处理28 · 已完成79' }
]

const todoItems = [
  { cls: 'fire', dot: 'red', title: '住院部B楼 5F 烟感火警告警', meta: '10:28 · 立即处置', msg: '跳转消防监测 — 住院部B楼5F烟感火警告警处置' },
  { cls: 'warn', dot: 'orange', title: '门诊楼 2F 中药房 隐患未闭环', meta: '剩余 2 天 · 闭环整改', msg: '跳转工单处理 — 门诊楼中药房隐患闭环' },
  { cls: 'info', dot: 'blue', title: 'AI随手拍 3处隐患待复核', meta: '09:45 · 复核派单', msg: '跳转AI随手拍 — 3处隐患待复核派单' },
  { cls: 'ok', dot: 'green', title: '节能「错峰用电」策略待执行', meta: '今日 · 一键下发', msg: '跳转节能中心 — 错峰用电削峰策略待执行' }
]

const safetyItems = [
  { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#107C10" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>', value: '98.6', unit: '%', color: 'var(--green)', label: '设备在线率' },
  { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#D93025" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>', value: '47', unit: '', color: 'var(--red)', label: '今日告警总量' },
  { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#2173D8" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>', value: '3', unit: '处', color: 'var(--blue)', label: '今日AI识别隐患' },
  { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#FF9500" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', value: '16.7', unit: '%', color: 'var(--orange)', label: '本月节能率' }
]

function showAlert(msg) {
  window.alert(msg)
}

function handleAlarm(a) {
  showAlert('跳转详情页\n位置：' + a.loc + '\n类型：' + a.type)
}
</script>

<template>
  <WaterTankCard />
  <AlarmHostCard />
  <OverviewModal :show="ovOpen" @close="ovOpen = false" />

  <div class="main">
    <!-- ===== 左栏 ===== -->
    <div class="left-panel">
      <div class="card" style="cursor:pointer" title="点击查看平台综合总览详细数据" @click="ovOpen = true">
        <div class="card-header">
          <span class="card-header-left">平台综合总览</span>
          <span class="card-subtitle">当前 · 点击查看详情 ›</span>
        </div>
        <div class="card-body">
          <div class="kpi-mini-grid">
            <div v-for="k in kpiItems" :key="k.label" class="kpi-mini-item">
              <div class="kpi-icon" v-html="k.icon"></div>
              <div class="kpi-mini-value">{{ k.value }}</div>
              <div class="kpi-mini-label">{{ k.label }}</div>
              <div class="kpi-mini-sub" style="color:var(--text-ter)">{{ k.sub }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-header-left">今日待办中心</span>
          <span class="card-subtitle" style="color:var(--red)">4 项</span>
        </div>
        <div class="card-body">
          <div class="todo-mini-list">
            <div v-for="t in todoItems" :key="t.title" class="todo-mini-item" :class="t.cls" @click="showAlert(t.msg)">
              <div class="todo-mini-dot" :class="t.dot"></div>
              <div class="todo-mini-info">
                <div class="todo-mini-title">{{ t.title }}</div>
                <div class="todo-mini-meta">{{ t.meta }}</div>
              </div>
              <span class="todo-mini-arrow">›</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 中栏：留空，展示背景 ===== -->
    <div class="center-panel"></div>

    <!-- ===== 右栏 ===== -->
    <div class="right-panel">
      <div class="card">
        <div class="card-header">
          <span class="card-header-left">平台运行核心指标</span>
          <span class="card-subtitle">今日</span>
        </div>
        <div class="card-body">
          <div class="safety-mini-grid">
            <div v-for="s in safetyItems" :key="s.label" class="safety-mini-item">
              <div class="safety-mini-icon" v-html="s.icon"></div>
              <div class="safety-mini-value" :style="{ color: s.color }">
                {{ s.value }}<span v-if="s.unit" style="font-size:13px;font-weight:500">{{ s.unit }}</span>
              </div>
              <div class="safety-mini-label">{{ s.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-header-left">运行分析</span>
          <div class="sidebar-tabs">
            <button class="sidebar-tab" :class="{ active: currentView === 'trend' }" @click="switchView('trend')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              趋势
            </button>
            <button class="sidebar-tab" :class="{ active: currentView === 'pie' }" @click="switchView('pie')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
              占比
            </button>
          </div>
        </div>
        <div class="card-body">
          <div v-show="currentView === 'trend'" class="chart-container" ref="trendRef"></div>
          <div v-show="currentView === 'pie'" class="chart-container" ref="pieRef"></div>
        </div>
      </div>

      <div class="card" style="flex:1;min-height:0;">
        <div class="card-header">
          <span class="card-header-left">实时动态</span>
          <span class="card-subtitle">最新 8 条</span>
        </div>
        <div class="card-body" style="padding:0 8px 8px;">
          <div class="alarm-list" style="max-height:320px;overflow-y:auto;">
            <div class="alarm-list-header">
              <span>位置</span><span>类型</span><span>等级</span>
            </div>
            <div class="alarm-row" :class="{ fire: a.level === 'high' }" v-for="a in alarmData" :key="a.loc" @click="handleAlarm(a)">
              <span class="loc">{{ a.loc }}</span>
              <span class="type">{{ a.type }}</span>
              <span v-if="a.level === 'high'" class="alarm-badge high">高风险</span>
              <span v-else-if="a.level === 'mid'" class="alarm-badge mid">中风险</span>
              <span v-else class="alarm-badge low">低风险</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
