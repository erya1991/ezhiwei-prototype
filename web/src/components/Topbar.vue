<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { platformName } from '../composables/useAppState'
import { logout } from '../composables/useAuth'

const router = useRouter()

// 原 demo 中主题切换仅做视觉态切换（无暗色主题 CSS），这里用 ref 承载状态。
const dark = ref(false)

function toggleTheme() {
  dark.value = !dark.value
}

function onLogout() {
  logout()
  router.replace('/login')
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <div class="topbar-logo">E</div>
      <span class="topbar-title">{{ platformName }}</span>
    </div>
    <div class="topbar-right">
      <div class="win-toggle">
        <span>浅色</span>
        <div class="win-toggle-track" :class="{ active: dark }" @click="toggleTheme">
          <div class="win-toggle-thumb"></div>
        </div>
      </div>
      <button class="topbar-logout" @click="onLogout">退出</button>
      <div class="win-avatar" title="管理员 - 张三">张</div>
    </div>
  </header>
</template>
