<script setup>
const tanks = [
  { name: 'B1 负一层消防水池', value: '2.8', color: '', limit: '上限 3.6m', vol: '452/580m³', trend: 'up', delta: '0.2', fill: 78, fillClass: 'normal' },
  { name: 'B2 负二层消防水池', value: '1.9', color: '#FF9500', limit: '上限 3.6m', vol: '302/580m³', trend: 'down', delta: '0.3', fill: 52, fillClass: 'low' },
  { name: '住院楼A 楼顶水箱', value: '3.4', color: '', limit: '上限 4.0m', vol: '30.6/36m³', trend: 'up', delta: '0.1', fill: 85, fillClass: 'normal' }
]
</script>

<template>
  <div class="water-tank-fixed">
    <div class="tank-header">
      <span class="tank-header-title">消防水系统 — 水池/水箱液位监测</span>
      <span class="tank-header-live"><span class="live-dot"></span>实时采集</span>
    </div>
    <div class="tank-row">
      <div v-for="t in tanks" :key="t.name" class="tank-item">
        <div class="tank-icon">
          <div class="tank-icon-fill" :class="t.fillClass" :style="{ height: t.fill + '%' }"></div>
        </div>
        <div class="tank-info">
          <div class="tank-info-name">{{ t.name }}</div>
          <div class="tank-info-row">
            <span class="tank-info-value" :style="t.color ? { color: t.color } : null">{{ t.value }}</span>
            <span class="tank-info-unit">m</span>
          </div>
          <div class="tank-info-meta">
            <span>{{ t.limit }}</span>
            <span>{{ t.vol }}</span>
            <span class="tank-info-trend" :class="t.trend">
              <svg v-if="t.trend === 'up'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="18 15 12 9 6 15"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
              {{ t.delta }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
