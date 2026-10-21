<script setup>
import { ovOverviewData } from '../../data/dashboard'

defineProps({
  show: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

// 计算柱状条宽度百分比（与原始实现一致，最小 3%）
function pct(value, items) {
  const max = Math.max(...items.map((i) => i.value))
  return Math.max((value / max) * 100, 3).toFixed(1) + '%'
}
</script>

<template>
  <div class="ov-modal-overlay" :class="{ show }" @click.self="emit('close')">
    <div class="ov-modal">
      <div class="ov-modal-bar">
        <div class="ov-modal-dot red" @click="emit('close')" title="关闭"></div>
        <div class="ov-modal-dot yellow"></div>
        <div class="ov-modal-dot green"></div>
        <div class="ov-modal-title">平台综合总览 · 详细数据</div>
        <div class="ov-modal-tools"><button @click="emit('close')" style="color:#D70015">✕ 关闭</button></div>
      </div>
      <div class="ov-modal-body">
        <div v-for="sec in ovOverviewData" :key="sec.name" class="ov-sec" :style="{ '--c': sec.color }">
          <div class="ov-sec-img"><img :src="sec.img" :alt="sec.name" /></div>
          <div class="ov-sec-main">
            <div class="ov-sec-head">
              <div>
                <div class="ov-sec-name">{{ sec.name }}</div>
                <div class="ov-sec-sub">{{ sec.sub }}</div>
              </div>
              <div class="ov-sec-total">{{ sec.total }}<small> {{ sec.unit }}</small></div>
            </div>
            <div class="ov-sec-kpis">
              <div v-for="k in sec.kpis" :key="k.label" class="ov-sec-kpi">
                <span>{{ k.label }}</span>
                <b>{{ k.val }}<small v-if="k.unit">{{ k.unit }}</small></b>
              </div>
            </div>
            <div class="ov-sec-grid">
              <div v-for="g in sec.groups" :key="g.title" class="ov-sec-block">
                <div class="ov-sec-block-title">{{ g.title }}</div>
                <div v-for="i in g.items" :key="i.label" class="ov-item">
                  <div class="ov-bar-row">
                    <span class="ov-bar-label">{{ i.label }}</span>
                    <span class="ov-bar-val">{{ i.value.toLocaleString() }}</span>
                  </div>
                  <div class="ov-bar">
                    <div class="ov-bar-fill" :style="{ width: pct(i.value, g.items) }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
