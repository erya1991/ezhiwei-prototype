import { ref } from 'vue'

// 全局 Toast 状态（模块级单例，供所有视图共享）
const msg = ref('')
const isError = ref(false)
const visible = ref(false)
let timer = null

export function showToast(text, error = false) {
  msg.value = text
  isError.value = !!error
  visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { visible.value = false }, 2200)
}

export function useToast() {
  return { msg, isError, visible, showToast }
}
