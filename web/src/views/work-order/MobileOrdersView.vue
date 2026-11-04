<script setup>
import { useRoute } from 'vue-router'
import WorkOrderList from './WorkOrderList.vue'
const route = useRoute()
</script>
<template><WorkOrderList mobile :mine="route.path.endsWith('/mine')" /></template>
