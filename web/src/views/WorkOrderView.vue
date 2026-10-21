<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import * as echarts from 'echarts'
import { useEcharts } from '../composables/useEcharts'
import { WO_SPECS, WO_ALARMS, WO_ORDERS, levelClass, statusClass } from '../data/workOrder'

// ---- 统计卡片 ----
const stats = [
  { icon: '📋', cls: 'blue', target: 156, label: '总工单数' },
  { icon: '🚨', cls: 'red', target: 12, label: '待报警故障工单' },
  { icon: '⏳', cls: 'orange', target: 28, label: '待处理工单' },
  { icon: '🔧', cls: 'purple', target: 34, label: '处理中工单' },
  { icon: '✅', cls: 'green', target: 79, label: '已完成工单' },
  { icon: '⚠️', cls: 'gray', target: 3, label: '超时未处理' }
]
const statValues = ref(stats.map(() => 0))

function animateStats() {
  stats.forEach((s, i) => {
    const target = s.target
    const duration = 800
    const start = performance.now()
    function step(ts) {
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      statValues.value[i] = Math.round(ease * target)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

// ---- 过滤 ----
const alarmSpec = ref('')
const alarmLevel = ref('')
const orderSpec = ref('')
const orderStatus = ref('')

const filteredAlarms = computed(() =>
  WO_ALARMS.filter(
    (a) => (!alarmSpec.value || a.spec === alarmSpec.value) && (!alarmLevel.value || a.level === alarmLevel.value)
  )
)
const filteredOrders = computed(() =>
  WO_ORDERS.filter(
    (o) => (!orderSpec.value || o.spec === orderSpec.value) && (!orderStatus.value || o.status === orderStatus.value)
  )
)

// ---- 图表 ----
const pieRef = ref(null)
const barRef = ref(null)

function buildPieOption() {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: ['52%', '78%'], center: ['50%', '50%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { fontSize: 11, color: '#5C5C5C' },
      emphasis: { label: { fontSize: 14, fontWeight: 'bold' } },
      data: [
        { value: 28, name: '待处理', itemStyle: { color: '#FF9500' } },
        { value: 34, name: '处理中', itemStyle: { color: '#2173D8' } },
        { value: 8, name: '待验收', itemStyle: { color: '#7C3AED' } },
        { value: 79, name: '已完成', itemStyle: { color: '#107C10' } },
        { value: 3, name: '已超时', itemStyle: { color: '#D93025' } },
        { value: 4, name: '待派单', itemStyle: { color: '#757575' } }
      ]
    }]
  }
}

function buildBarOption() {
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 36, right: 16, top: 10, bottom: 24 },
    xAxis: { type: 'category', data: WO_SPECS, axisLabel: { fontSize: 10, rotate: 25 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{
      type: 'bar', barWidth: 18, borderRadius: [6, 6, 0, 0],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#2173D8' }, { offset: 1, color: '#7CB4F0' }
        ])
      },
      data: [32, 22, 18, 19, 14, 24, 11, 16]
    }]
  }
}

useEcharts(pieRef, buildPieOption)
useEcharts(barRef, buildBarOption)

// ---- 详情弹窗 ----
const modal = reactive({ show: false, title: '', kind: 'alarm', data: null })

function openAlarmDetail(a) {
  modal.kind = 'alarm'
  modal.data = a
  modal.title = '告警详情 — #' + a.id
  modal.show = true
}
function openOrderDetail(o) {
  modal.kind = 'order'
  modal.data = o
  modal.title = '工单详情 — ' + o.id
  modal.show = true
}
function closeModal() {
  modal.show = false
}

// ---- 操作 ----
function dispatch(id) {
  window.alert('派单处理：告警 #' + id + '\n（模拟：选择处理人并派发工单）')
}
function editOrder(id) {
  window.alert('编辑工单：' + id + '\n（模拟：打开编辑表单）')
}
function completeOrder(id) {
  window.alert('完结工单：' + id + '\n（模拟：提交验收确认，状态变更为已完成）')
}

onMounted(animateStats)
</script>

<template>
  <div class="wo-page">
    <div class="wo-header"><h2>工单处理</h2></div>

    <!-- 统计卡片 -->
    <div class="wo-stats">
      <div v-for="(s, i) in stats" :key="s.label" class="wo-stat-card">
        <div class="wo-stat-top"><span class="wo-stat-icon" :class="s.cls">{{ s.icon }}</span></div>
        <div class="wo-stat-val">{{ statValues[i] }}</div>
        <div class="wo-stat-lbl">{{ s.label }}</div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="wo-charts">
      <div class="wo-chart-card"><div class="wo-chart-title">工单状态占比</div><div class="wo-chart-box" ref="pieRef"></div></div>
      <div class="wo-chart-card"><div class="wo-chart-title">八大医疗专项工单分布</div><div class="wo-chart-box" ref="barRef"></div></div>
    </div>

    <!-- 报警列表 -->
    <div class="wo-section">
      <div class="wo-section-header">
        <h3>报警列表</h3>
        <div class="wo-filters">
          <select class="wo-filter-select" v-model="alarmSpec">
            <option value="">全部专项</option>
            <option v-for="s in WO_SPECS" :key="s" :value="s">{{ s }}</option>
          </select>
          <select class="wo-filter-select" v-model="alarmLevel">
            <option value="">全部等级</option>
            <option>紧急</option><option>重要</option><option>一般</option>
          </select>
        </div>
      </div>
      <div class="wo-table-wrap">
        <table class="wo-table">
          <thead><tr><th>告警时间</th><th>医疗专项</th><th>设备名称</th><th>报警等级</th><th>报警描述</th><th>设备位置</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="a in filteredAlarms" :key="a.id">
              <td>{{ a.time }}</td>
              <td>{{ a.spec }}</td>
              <td>{{ a.device }}</td>
              <td><span class="wo-badge" :class="levelClass(a.level)">{{ a.level }}</span></td>
              <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">{{ a.desc }}</td>
              <td>{{ a.location }}</td>
              <td><span class="wo-badge" :class="statusClass(a.status)">{{ a.status }}</span></td>
              <td>
                <div class="wo-actions">
                  <button class="wo-btn-sm primary" @click="openAlarmDetail(a)">查看详情</button>
                  <button class="wo-btn-sm primary" @click="dispatch(a.id)">派单处理</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 运维工单列表 -->
    <div class="wo-section">
      <div class="wo-section-header">
        <h3>运维处理工单列表</h3>
        <div class="wo-filters">
          <select class="wo-filter-select" v-model="orderSpec">
            <option value="">全部专项</option>
            <option v-for="s in WO_SPECS" :key="s" :value="s">{{ s }}</option>
          </select>
          <select class="wo-filter-select" v-model="orderStatus">
            <option value="">全部状态</option>
            <option>待派单</option><option>处理中</option><option>待验收</option><option>已完成</option><option>已超时</option>
          </select>
        </div>
      </div>
      <div class="wo-table-wrap">
        <table class="wo-table">
          <thead><tr><th>工单编号</th><th>医疗专项</th><th>设备名称</th><th>故障简述</th><th>上报时间</th><th>处理人</th><th>工单状态</th><th>完成时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="o in filteredOrders" :key="o.id">
              <td style="font-family:monospace;font-size:11px">{{ o.id }}</td>
              <td>{{ o.spec }}</td>
              <td>{{ o.device }}</td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">{{ o.desc }}</td>
              <td>{{ o.time }}</td>
              <td>{{ o.handler }}</td>
              <td><span class="wo-badge" :class="statusClass(o.status)">{{ o.status }}</span></td>
              <td>{{ o.doneTime }}</td>
              <td>
                <div class="wo-actions">
                  <button class="wo-btn-sm primary" @click="openOrderDetail(o)">查看</button>
                  <button class="wo-btn-sm" @click="editOrder(o.id)">编辑</button>
                  <button class="wo-btn-sm success" @click="completeOrder(o.id)">完结工单</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div class="wo-modal-overlay" :class="{ show: modal.show }" @click.self="closeModal">
      <div class="wo-modal">
        <div class="wo-modal-bar">
          <div class="wo-modal-dot red" @click="closeModal" title="关闭"></div>
          <div class="wo-modal-title">{{ modal.title }}</div>
        </div>
        <div class="wo-modal-body">
          <div class="wo-detail-grid">
            <template v-if="modal.kind === 'alarm' && modal.data">
              <div class="wo-detail-item"><span class="wo-detail-lbl">告警时间</span><span class="wo-detail-val">{{ modal.data.time }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">医疗专项</span><span class="wo-detail-val">{{ modal.data.spec }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">设备名称</span><span class="wo-detail-val">{{ modal.data.device }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">报警等级</span><span class="wo-detail-val"><span class="wo-badge" :class="levelClass(modal.data.level)">{{ modal.data.level }}</span></span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">设备位置</span><span class="wo-detail-val">{{ modal.data.location }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">当前状态</span><span class="wo-detail-val"><span class="wo-badge" :class="statusClass(modal.data.status)">{{ modal.data.status }}</span></span></div>
              <div class="wo-detail-item wo-detail-full"><span class="wo-detail-lbl">报警描述</span><div class="wo-detail-desc">{{ modal.data.desc }}</div></div>
            </template>
            <template v-else-if="modal.kind === 'order' && modal.data">
              <div class="wo-detail-item"><span class="wo-detail-lbl">工单编号</span><span class="wo-detail-val" style="font-family:monospace">{{ modal.data.id }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">医疗专项</span><span class="wo-detail-val">{{ modal.data.spec }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">设备名称</span><span class="wo-detail-val">{{ modal.data.device }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">处理人</span><span class="wo-detail-val">{{ modal.data.handler }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">上报时间</span><span class="wo-detail-val">{{ modal.data.time }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">完成时间</span><span class="wo-detail-val">{{ modal.data.doneTime }}</span></div>
              <div class="wo-detail-item"><span class="wo-detail-lbl">工单状态</span><span class="wo-detail-val"><span class="wo-badge" :class="statusClass(modal.data.status)">{{ modal.data.status }}</span></span></div>
              <div class="wo-detail-item" style="visibility:hidden"></div>
              <div class="wo-detail-item wo-detail-full"><span class="wo-detail-lbl">故障简述</span><div class="wo-detail-desc">{{ modal.data.desc }}</div></div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
