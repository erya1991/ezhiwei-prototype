<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, saveRemember, loadRemember, clearRemember } from '../composables/useAuth'
import { showToast } from '../composables/useToast'

const router = useRouter()

const account = ref('')
const password = ref('')
const remember = ref(false)
const loading = ref(false)

// 预填记住的账号密码
const saved = loadRemember()
if (saved) {
  account.value = saved.account || ''
  password.value = saved.password || ''
  remember.value = true
}

function onLogin() {
  const a = account.value.trim()
  const p = password.value
  if (!a) { showToast('请输入账号', true); return }
  if (!p) { showToast('请输入密码', true); return }

  loading.value = true
  // 稍作停顿，呈现按钮 loading 态与细腻的过渡
  setTimeout(() => {
    const res = login(a, p)
    if (res.ok) {
      if (remember.value) saveRemember(a, p)
      else clearRemember()
      showToast('登录成功，正在进入平台…')
      setTimeout(() => router.replace('/'), 420)
    } else {
      showToast(res.error, true)
      loading.value = false
    }
  }, 520)
}

function onForgot() {
  showToast('请联系管理员重置密码（演示环境）')
}
</script>

<template>
  <div class="login-page">
    <div class="login-glow glow-1"></div>
    <div class="login-glow glow-2"></div>
    <div class="login-glow glow-3"></div>

    <div class="login-shell">
      <!-- 左侧品牌简介 -->
      <section class="login-brand">
        <div class="brand-logo">E</div>
        <h1 class="brand-name">E智维</h1>
        <p class="brand-tagline">医院后勤运维系统</p>
        <p class="brand-desc">
          面向医院的智慧后勤运维平台，覆盖八大医疗专项系统，提供故障智能诊断、标准处置 SOP 与应急预案指导，让后勤运维更高效、更安全。
        </p>
        <div class="brand-features">
          <div class="brand-feature">
            <span class="bf-icon">🤖</span>
            <div><b>AI 智能诊断</b><span>故障树分析 · 精准定位根因</span></div>
          </div>
          <div class="brand-feature">
            <span class="bf-icon">📊</span>
            <div><b>全域态势感知</b><span>能耗 · 告警 · 工单一屏总览</span></div>
          </div>
          <div class="brand-feature">
            <span class="bf-icon">🛡️</span>
            <div><b>安全合规保障</b><span>GB / WS / TSG 国标行标护航</span></div>
          </div>
        </div>
      </section>

      <!-- 右侧毛玻璃登录卡片 -->
      <section class="login-panel">
        <div class="login-card">
          <div class="card-head">
            <h2>登录</h2>
            <p>欢迎回来，请登录您的账号</p>
          </div>

          <form @submit.prevent="onLogin">
            <label class="field">
              <span class="field-label">账号</span>
              <div class="field-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input type="text" v-model="account" placeholder="请输入账号" autocomplete="username">
              </div>
            </label>

            <label class="field">
              <span class="field-label">密码</span>
              <div class="field-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input type="password" v-model="password" placeholder="请输入密码" autocomplete="current-password">
              </div>
            </label>

            <div class="card-row">
              <label class="remember">
                <input type="checkbox" v-model="remember">
                <span>记住密码</span>
              </label>
              <a class="forgot" @click="onForgot">忘记密码？</a>
            </div>

            <button type="submit" class="login-btn" :disabled="loading">
              <span v-if="loading" class="btn-spinner"></span>
              {{ loading ? '登录中…' : '登录' }}
            </button>
          </form>

          <p class="card-foot">E智维 · 南京市浦口人民医院 后勤运维系统</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  z-index: 200;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(160deg, rgba(240, 247, 253, 0.55) 0%, rgba(224, 238, 249, 0.38) 50%, rgba(214, 232, 247, 0.55) 100%),
    url('/login-bg.png') center / cover no-repeat;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
}

/* 背景装饰光斑（低饱和冰蓝，柔和晕染） */
.login-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
}
.glow-1 { width: 440px; height: 440px; left: -90px; top: -70px; background: #bcd9f2; opacity: 0.55; }
.glow-2 { width: 380px; height: 380px; right: -70px; bottom: -50px; background: #c4dff0; opacity: 0.5; }
.glow-3 { width: 300px; height: 300px; right: 18%; top: 8%; background: #d8e9f7; opacity: 0.5; }

.login-shell {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 56px;
  width: min(1100px, 92vw);
  padding: 40px 24px;
}

/* ---- 左侧品牌 ---- */
.login-brand {
  flex: 1 1 52%;
  color: #2b3a4a;
  animation: login-rise 600ms ease both;
}
.brand-logo {
  width: 72px; height: 72px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  font-size: 34px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, #7fb2e8, #4a8fd4);
  box-shadow: 0 12px 32px rgba(74, 143, 212, 0.35);
  margin-bottom: 26px;
}
.brand-name {
  font-size: 44px; font-weight: 700; letter-spacing: 2px; margin: 0;
  color: #1f3345;
}
.brand-tagline { font-size: 20px; font-weight: 500; color: #4a6a8a; margin: 8px 0 20px; }
.brand-desc { font-size: 14px; line-height: 1.9; color: #5c7690; max-width: 460px; margin: 0 0 32px; }
.brand-features { display: flex; flex-direction: column; gap: 16px; max-width: 440px; }
.brand-feature {
  display: flex; align-items: center; gap: 14px;
  padding: 13px 16px; border-radius: 18px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.bf-icon { font-size: 22px; }
.brand-feature b { display: block; font-size: 14px; color: #2b3a4a; font-weight: 600; }
.brand-feature span { font-size: 12px; color: #7a92a8; }

/* ---- 右侧毛玻璃卡片 ---- */
.login-panel { flex: 0 0 400px; }
.login-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 28px;
  padding: 40px 36px 26px;
  box-shadow:
    0 24px 60px rgba(70, 110, 150, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: login-rise 600ms 80ms ease both;
}
.card-head { margin-bottom: 28px; }
.card-head h2 { font-size: 26px; font-weight: 700; color: #1f3345; margin: 0 0 6px; }
.card-head p { font-size: 13px; color: #7a92a8; margin: 0; }

.field { display: block; margin-bottom: 18px; }
.field-label { display: block; font-size: 12px; font-weight: 500; color: #4a6a8a; margin-bottom: 8px; }
.field-box {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(120, 150, 180, 0.18);
  transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}
.field-box:focus-within {
  border-color: rgba(74, 143, 212, 0.55);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0 0 4px rgba(74, 143, 212, 0.14);
}
.field-box svg { width: 18px; height: 18px; flex-shrink: 0; color: #8aa4bc; }
.field-box input {
  flex: 1; min-width: 0; border: none; outline: none; background: transparent;
  font-size: 15px; color: #1f3345; font-family: inherit;
}
.field-box input::placeholder { color: #a8bccf; }

.card-row { display: flex; align-items: center; justify-content: space-between; margin: 2px 0 22px; }
.remember { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #5c7690; cursor: pointer; }
.remember input { width: 16px; height: 16px; accent-color: #4a8fd4; cursor: pointer; }
.forgot { font-size: 13px; color: #4a8fd4; cursor: pointer; text-decoration: none; }
.forgot:hover { color: #3a7ec0; }

.login-btn {
  width: 100%; padding: 14px 0;
  border: none; border-radius: 14px;
  font-size: 16px; font-weight: 600; color: #fff;
  background: linear-gradient(135deg, #7fb2e8, #4a8fd4);
  box-shadow: 0 8px 20px rgba(74, 143, 212, 0.35);
  cursor: pointer; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}
.login-btn:hover { filter: brightness(1.05); box-shadow: 0 10px 26px rgba(74, 143, 212, 0.42); transform: translateY(-1px); }
.login-btn:active { transform: translateY(0) scale(0.98); box-shadow: 0 5px 14px rgba(74, 143, 212, 0.3); }
.login-btn:disabled { opacity: 0.85; cursor: default; }
.btn-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4); border-top-color: #fff;
  animation: spin 700ms linear infinite;
}

.card-foot { text-align: center; font-size: 11px; color: #9ab0c4; margin-top: 24px; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes login-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 860px) {
  .login-shell { flex-direction: column; gap: 28px; padding: 24px; }
  .login-brand { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .brand-desc { margin: 0 auto 20px; }
  .brand-features { display: none; }
  .login-panel { width: 100%; flex: none; }
  .login-card { padding: 32px 24px 22px; }
}
</style>
