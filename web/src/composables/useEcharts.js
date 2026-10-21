import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted } from 'vue'

/**
 * 统一封装 ECharts 实例的初始化 / resize / dispose。
 * 后续节能、预测性维护等页面的大量图表都复用这一套，避免每个图手写 init/dispose。
 *
 * @param {import('vue').Ref<HTMLElement|null>} domRef 图表容器模板引用
 * @param {() => object} [optionFactory] 返回 ECharts option 的函数
 */
export function useEcharts(domRef, optionFactory) {
  let chart = null
  let observer = null

  const resize = () => chart && chart.resize()

  const setOption = (option, notMerge = true) => {
    if (chart) chart.setOption(option, notMerge)
  }

  const getChart = () => chart

  // 延迟初始化：容器可见（有实际宽高）时才 init，避免 v-show/v-if 隐藏时
  // ECharts 报 "Can't get DOM width or height" 的 0 尺寸告警。
  const ensureChart = () => {
    const el = domRef.value
    if (!el) return
    if (chart) {
      chart.resize()
      return
    }
    if (el.clientWidth === 0 && el.clientHeight === 0) return
    chart = echarts.init(el)
    if (optionFactory) chart.setOption(optionFactory())
  }

  onMounted(() => {
    if (!domRef.value) return
    ensureChart()
    // ResizeObserver：容器从隐藏变为可见（尺寸 >0）时自动初始化，尺寸变化时自动 resize，
    // 同时覆盖窗口缩放场景。
    observer = new ResizeObserver(() => ensureChart())
    observer.observe(domRef.value)
  })

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    if (chart) {
      chart.dispose()
      chart = null
    }
  })

  return { resize, setOption, getChart }
}
