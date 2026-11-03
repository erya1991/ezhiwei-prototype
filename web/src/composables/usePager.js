import { computed, ref, unref, isRef, watch } from 'vue'

/**
 * 列表分页：给台账/列表页统一提供分页状态、当前页数据与跨页序号。
 *
 * @param {Function|import('vue').Ref} source 返回数据数组的函数，或 ref/computed
 * @param {number} defaultSize 每页条数，默认 10
 */
export function usePager(source, defaultSize = 10) {
  const page = ref(1)
  const size = ref(defaultSize)

  const list = computed(() => {
    const v = typeof source === 'function' ? source() : source
    const arr = isRef(v) ? unref(v) : v
    return Array.isArray(arr) ? arr : []
  })

  const total = computed(() => list.value.length)

  const rows = computed(() => {
    const start = (page.value - 1) * size.value
    return list.value.slice(start, start + size.value)
  })

  /** 跨页连续序号 */
  const indexMethod = (i) => (page.value - 1) * size.value + i + 1

  watch(total, (t) => {
    const maxPage = Math.max(1, Math.ceil(t / size.value))
    if (page.value > maxPage) page.value = maxPage
  })

  watch(size, () => {
    page.value = 1
  })

  function resetPage() {
    page.value = 1
  }

  return { page, size, total, rows, indexMethod, resetPage }
}
