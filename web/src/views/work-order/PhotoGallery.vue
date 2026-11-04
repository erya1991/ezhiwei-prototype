<script setup>
import { computed } from 'vue'
const props = defineProps({ order: { type: Object, required: true }, ids: { type: Array, default: () => [] } })
const pictures = computed(() => props.ids.map(id => props.order.attachments.find(row => row.id === id)).filter(Boolean))
</script>
<template><div v-if="pictures.length" class="gallery"><figure v-for="photo in pictures" :key="photo.id"><el-image :src="photo.dataUrl" :preview-src-list="pictures.map(row => row.dataUrl)" preview-teleported fit="cover" :alt="photo.name" /><figcaption>{{ photo.name }} · {{ photo.actor.name }}</figcaption></figure></div></template>
<style scoped>
.gallery{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px}.gallery figure{width:130px;margin:0}.el-image{width:125px;height:94px;border:1px solid var(--ez-border);border-radius:8px}figcaption{font-size:12px;color:var(--ez-text-secondary);overflow-wrap:anywhere}
</style>
