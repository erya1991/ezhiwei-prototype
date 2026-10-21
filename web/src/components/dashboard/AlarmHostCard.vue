<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { hostEvents } from '../../data/dashboard'

const visibleCount = 2 // 每次展示 2 行
const carouselIndex = ref(0)

const visible = computed(() => {
  const slice = hostEvents.slice(carouselIndex.value, carouselIndex.value + visibleCount)
  while (slice.length < visibleCount) {
    slice.push(hostEvents[slice.length % hostEvents.length])
  }
  return slice
})

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    carouselIndex.value = (carouselIndex.value + 1) % hostEvents.length
  }, 2500)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="alarm-host-fixed">
    <div class="host-header">
      <span class="host-header-title">消防报警主机 — 海湾 GST (1主6副)</span>
      <span class="host-header-sub"><span class="host-dot"></span>最近事件</span>
    </div>
    <div class="host-carousel">
      <div class="host-carousel-track">
        <div v-for="(e, i) in visible" :key="i" class="host-event">
          <span class="host-event-time">{{ e.time }}</span>
          <span class="host-event-type" :class="e.type">{{ e.typeLabel }}</span>
          <span class="host-event-loc">{{ e.loc }}</span>
          <span class="host-event-host">{{ e.host }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
