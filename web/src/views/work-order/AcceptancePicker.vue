<script setup>
import { computed } from 'vue'
import { workOrderStore as store } from '../../data/workOrder.js'
const props = defineProps({ modelValue: { type: Object, required: true } })
const emit = defineEmits(['update:modelValue'])
const people = computed(() => store.state.directory.accounts.filter(row => row.active && row.projectIds.includes('project-demo') && row.campusIds.includes('space-campus')))
const roles = computed(() => store.state.directory.roles.filter(row => row.active))
function change(type, targetId = '') { emit('update:modelValue', { type, targetId }) }
</script>
<template>
  <div class="acceptance-picker">
    <el-radio-group :model-value="modelValue.type" @change="value => change(value)"><el-radio-button value="person">指定人员</el-radio-button><el-radio-button value="role">指定角色</el-radio-button></el-radio-group>
    <el-select v-if="modelValue.type === 'person'" :model-value="modelValue.targetId" placeholder="选择有效人员" filterable @change="value => change('person', value)">
      <el-option v-for="row in people" :key="row.id" :value="row.id" :label="row.name + ' · ' + store.orgName(row.organizationId)" />
    </el-select>
    <el-select v-else :model-value="modelValue.targetId" placeholder="选择共享验收角色" @change="value => change('role', value)">
      <el-option v-for="row in roles" :key="row.id" :value="row.id" :label="row.name" />
    </el-select>
    <p class="hint">{{ modelValue.type === 'role' ? '角色内符合范围与自验条件的任一成员完成后，本次事项结束。' : '本单直接指定账号，无需额外具有默认验收角色。' }}</p>
  </div>
</template>
<style scoped>
.acceptance-picker{display:grid;gap:10px;width:100%}.hint{font-size:12px;line-height:1.7;color:var(--ez-text-secondary)}.el-select{width:100%}
</style>
