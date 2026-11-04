<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from './components/Topbar.vue'
import Sidebar from './components/Sidebar.vue'
import { useToast } from './composables/useToast'

const { msg, isError, visible } = useToast()
const route = useRoute()
const isLogin = computed(() => route.name === 'login')
const isWorkOrderMobile = computed(() => route.meta.layout === 'work-order-mobile')
</script>

<template>
  <template v-if="!isLogin && !isWorkOrderMobile">
    <Topbar />
    <Sidebar />
  </template>
  <router-view />
  <div class="sys-toast" :class="{ show: visible, error: isError }">{{ msg }}</div>
</template>
