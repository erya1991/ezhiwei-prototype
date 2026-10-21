import { ref } from 'vue'

// 登录态与记住密码的本地存储键
const AUTH_KEY = 'ezw_auth'
const REMEMBER_KEY = 'ezw_remember'

// 演示用有效账号（实际项目应替换为后端鉴权接口）
const VALID_ACCOUNT = 'admin'
const VALID_PASSWORD = 'admin123'

export const isAuthenticated = ref(localStorage.getItem(AUTH_KEY) === '1')

export function login(account, password) {
  if (account === VALID_ACCOUNT && password === VALID_PASSWORD) {
    isAuthenticated.value = true
    localStorage.setItem(AUTH_KEY, '1')
    return { ok: true }
  }
  return { ok: false, error: '账号或密码错误，请重新输入' }
}

export function logout() {
  isAuthenticated.value = false
  localStorage.removeItem(AUTH_KEY)
}

export function saveRemember(account, password) {
  localStorage.setItem(REMEMBER_KEY, JSON.stringify({ account, password }))
}

export function loadRemember() {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export function clearRemember() {
  localStorage.removeItem(REMEMBER_KEY)
}

export function useAuth() {
  return { isAuthenticated, login, logout, saveRemember, loadRemember, clearRemember }
}
