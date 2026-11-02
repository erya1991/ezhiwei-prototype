<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { jointStore as store, ASSET_TYPES, PROJECT, ORGANIZATIONS, clone } from '../../data/equipmentInspectionMock.js'
import AssetRelationsEditor from './AssetRelationsEditor.vue'
import EquipmentInspectionHistory from './EquipmentInspectionHistory.vue'
const route=useRoute()
const filters=ref({text:'',type:'',status:'',spaceId:''}), applied=ref(clone(filters.value)), page=ref(1)
const rows=computed(()=>store.state.assets.filter(row=>(!applied.value.text || `${row.code}${row.name}${row.model}`.toLowerCase().includes(applied.value.text.toLowerCase())) && (!applied.value.type || row.type===applied.value.type) && (!applied.value.status || row.status===applied.value.status) && (!applied.value.spaceId || store.ancestors(store.state.spaces,row.spaceId).some(parent=>parent.id===applied.value.spaceId))))
function query() { applied.value=clone(filters.value); applied.value.text=applied.value.text.trim(); page.value=1 }
function reset() { filters.value={text:'',type:'',status:'',spaceId:''}; query() }
const dialog=ref(false), draft=ref({}), error=ref(''), facilities=ref([]), detailId=ref(''), editTab=ref('base'), detailTab=ref('base'), compositionIds=ref([]), systemMemberIds=ref([])
const detail=computed(()=>store.byId(store.state.assets,detailId.value))
watch(()=>route.query.asset,id=>{if(id && store.object(String(id))) detailId.value=String(id)},{immediate:true})
const locked=computed(()=>Boolean(draft.value.id && store.assetReferenced(draft.value.id)))
const categories=computed(()=>store.state.categories.filter(row=>row.objectType===draft.value.type && (row.enabled || row.id===draft.value.categoryId)))
const compositionMembers=computed(()=>detail.value?store.assetMembers(detail.value.id):[])
const systemMembers=computed(()=>detail.value?store.assetMembers(detail.value.id,'systemId'):[])
const detailCoverage=computed(()=>[...new Set([detail.value?.spaceId,...compositionMembers.value.map(row=>row.spaceId),...systemMembers.value.map(row=>row.spaceId)].filter(Boolean))])
function openDetail(id){detailId.value=id;detailTab.value='base'}
function open(row,tab='base') { draft.value=row?clone(row):{id:'',code:'',name:'',type:'单台设备',categoryId:'',model:'',projectId:PROJECT.id,spaceId:'',location:'',systemId:'',parentId:'',organizationId:'org-maintenance',status:'运行',notes:'',meters:[]}; facilities.value=row?store.facilityIds(row.id):[]; compositionIds.value=row?store.assetMembers(row.id).map(member=>member.id):[];systemMemberIds.value=row?store.assetMembers(row.id,'systemId').map(member=>member.id):[];editTab.value=tab;error.value='';dialog.value=true }
function save() { try { const selections={};if(draft.value.type==='组合设备')selections.compositionIds=compositionIds.value;if(draft.value.type==='专业系统')selections.systemMemberIds=systemMemberIds.value;store.saveAsset(draft.value,facilities.value,selections); dialog.value=false; ElMessage.success('设备资料与关系已保存；已生成任务与记录保留原快照') } catch(e) { error.value=e.message } }
</script>
<template>
  <main class="equipment-page">
    <header class="page-heading"><div><div class="eyebrow">设备管理 / 实际对象</div><h1>设备台账</h1><p class="subtitle">设备、组合、专业系统与共用设施各有独立身份，位置与成员关系分开维护。</p></div><el-button type="primary" @click="open()">新增设备</el-button></header>
    <p class="scope-note">本地 Mock 演示 · 台账维护实际对象和可选仪表位置；检查项统一在巡检规则编制。运行状态不等于任务状态，不接入 IoT 或真实告警。</p>
    <el-alert v-if="store.notice.catalog" :title="store.notice.catalog" type="warning" :closable="false" /><el-alert v-if="store.notice.persistence" :title="store.notice.persistence" type="warning" :closable="false" />
    <section class="panel"><el-form class="filters" @submit.prevent="query"><el-input v-model="filters.text" aria-label="设备查询" placeholder="设备名称 / 编号 / 型号" clearable /><el-select v-model="filters.type" aria-label="对象类型筛选" placeholder="全部对象类型" clearable><el-option v-for="type in ASSET_TYPES" :key="type" :value="type" /></el-select><el-select v-model="filters.spaceId" aria-label="安装位置筛选" placeholder="全部安装位置" clearable filterable><el-option v-for="row in store.state.spaces" :key="row.id" :value="row.id" :label="store.spacePath(row.id)" /></el-select><el-select v-model="filters.status" aria-label="运行状态筛选" placeholder="全部运行状态" clearable><el-option v-for="status in ['运行','备用','停用']" :key="status" :value="status" /></el-select><el-button type="primary" native-type="submit">查询</el-button><el-button @click="reset">重置</el-button></el-form>
      <p class="table-caption">共 {{ rows.length }} 项 · 共用管路只建一档，组合成员可位于不同楼层</p>
      <el-table :data="rows.slice((page-1)*10,page*10)" stripe empty-text="没有符合条件的设备 / 设施"><el-table-column label="台账对象" min-width="200"><template #default="{row}"><el-button link type="primary" class="asset-name" @click="openDetail(row.id)">{{ row.name }}</el-button><small class="muted">{{ row.code }} · {{ row.type }}</small></template></el-table-column><el-table-column label="分类 / 型号" min-width="145"><template #default="{row}">{{ store.byId(store.state.categories,row.categoryId)?.name }}<div class="muted">{{ row.model || '无实物型号' }}</div></template></el-table-column><el-table-column label="安装位置" min-width="200"><template #default="{row}">{{ store.spacePath(row.spaceId) || row.location }}</template></el-table-column><el-table-column label="所属系统 / 组合" min-width="160"><template #default="{row}">{{ store.object(row.systemId)?.name || '—' }}<div class="muted">{{ store.object(row.parentId)?.name || '无上级组合' }}</div></template></el-table-column><el-table-column label="运行状态" width="100"><template #default="{row}"><el-tag :type="row.status==='运行'?'success':row.status==='备用'?'warning':'info'">{{ row.status }}</el-tag></template></el-table-column><el-table-column label="操作" width="125" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open(row)">编辑</el-button><el-button link @click="openDetail(row.id)">详情</el-button></template></el-table-column></el-table><el-pagination v-model:current-page="page" :total="rows.length" :page-size="10" layout="total, prev, pager, next" class="pagination" />
    </section>
    <el-dialog v-model="dialog" :title="draft.id?'编辑设备 / 设施':'新增设备 / 设施'" class="ez-dialog equipment-editor" width="min(1000px,94vw)" align-center append-to-body destroy-on-close>
      <el-alert v-if="locked" title="此对象已被关系、计划或任务引用，类型和分类受限；关系、位置或状态修改不回写旧任务。" type="info" :closable="false" />
      <el-tabs v-model="editTab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="base">
          <el-form class="form-grid" label-position="top" @submit.prevent="save">
            <el-form-item label="台账编号" required><el-input v-model="draft.code" :disabled="Boolean(draft.id)" maxlength="40" /></el-form-item>
            <el-form-item label="名称" required><el-input v-model="draft.name" maxlength="60" /></el-form-item>
            <el-form-item label="管理对象类型" required><el-select v-model="draft.type" :disabled="locked" @change="draft.categoryId=''"><el-option v-for="type in ASSET_TYPES" :key="type" :value="type" /></el-select></el-form-item>
            <el-form-item label="设备 / 设施分类" required><el-select v-model="draft.categoryId" :disabled="locked" filterable placeholder="选择可创建实例的分类"><el-option v-for="row in categories" :key="row.id" :value="row.id" :label="store.categoryPath(row.id)" /></el-select></el-form-item>
            <el-form-item label="型号规格（实物资料有型号时填写）"><el-input v-model="draft.model" maxlength="100" /></el-form-item>
            <el-form-item label="所属项目 / 院区" required><el-input :model-value="PROJECT.name" disabled /></el-form-item>
            <el-form-item label="安装空间" required><el-select v-model="draft.spaceId" filterable placeholder="选择已建空间，包括大厅、走廊等"><el-option v-for="row in store.state.spaces" :key="row.id" :value="row.id" :label="store.spacePath(row.id)" /></el-select></el-form-item>
            <el-form-item label="运行状态" required><el-select v-model="draft.status"><el-option v-for="status in ['运行','备用','停用']" :key="status" :value="status" /></el-select></el-form-item>
            <div class="wide reference-help"><strong>安装空间必须来自空间档案</strong><p>大厅、走廊、普通房间、机房均先建立空间身份。组合成员保留各自位置；跨区域系统明确主要管理空间，并补充覆盖范围。</p></div>
            <el-form-item label="具体位置 / 跨区域位置说明" class="wide"><el-input v-model="draft.location" maxlength="500" placeholder="位置不足以定位时填写，如跨楼层管线、实际入口" /></el-form-item>
            <el-form-item label="责任单位"><el-select v-model="draft.organizationId" clearable><el-option v-for="row in ORGANIZATIONS" :key="row.id" :value="row.id" :label="row.name" /></el-select></el-form-item>
            <el-form-item label="管理备注" class="wide"><el-input v-model="draft.notes" type="textarea" :rows="2" maxlength="500" /></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="关联关系" name="relations"><AssetRelationsEditor :asset="draft" v-model:composition-ids="compositionIds" v-model:system-member-ids="systemMemberIds" v-model:facility-ids="facilities" /></el-tab-pane>
        <el-tab-pane label="现场仪表（可选）" name="meters">
          <div class="row-between"><h2>现场仪表 / 人工抄表位置</h2><el-button @click="draft.meters.push({id:'',name:'',location:''})">添加仪表位置</el-button></div>
          <p class="reference">仅用于找到真实读取位置；没有仪表档案也可以编制巡检规则，不在此维护检查项或阈值。</p>
          <div v-for="(meter,index) in draft.meters" :key="meter.id || index" class="meter-row"><el-input v-model="meter.name" :aria-label="'仪表'+(index+1)+'名称'" placeholder="仪表 / 抄表点名称" maxlength="100" /><el-input v-model="meter.location" :aria-label="'仪表'+(index+1)+'位置'" placeholder="现场读取位置" maxlength="200" /><el-button type="danger" plain @click="draft.meters.splice(index,1)">移除</el-button></div>
        </el-tab-pane>
      </el-tabs>
      <p v-if="error" class="error-box" role="alert">{{ error }}</p><template #footer><p class="reference">保存基本资料与关联关系；历史任务、检查项与原始读数保持原快照。</p><el-button @click="dialog=false">取消</el-button><el-button type="primary" @click="save">保存台账</el-button></template>
    </el-dialog>
    <el-drawer :model-value="Boolean(detail)" title="设备 / 设施台账详情" size="min(1080px,94vw)" append-to-body destroy-on-close @close="detailId=''">
      <template v-if="detail">
        <div class="row-between"><div><h2>{{ detail.name }}</h2><p class="muted">{{ detail.code }} · {{ detail.id }}</p></div><div class="actions"><el-tag>{{ detail.type }}</el-tag><el-button type="primary" plain @click="open(detail,'relations')">维护关联关系</el-button></div></div>
        <el-tabs v-model="detailTab" class="detail-tabs">
          <el-tab-pane label="基本资料" name="base">
            <dl class="detail-list"><dt>稳定 ID / 编号</dt><dd>{{ detail.id }} / {{ detail.code }}</dd><dt>分类</dt><dd>{{ store.categoryPath(detail.categoryId) }}</dd><dt>型号规格</dt><dd>{{ detail.model || '未登记 / 不适用' }}</dd><dt>安装位置</dt><dd>{{ store.spacePath(detail.spaceId) || '见具体位置' }}</dd><dt>位置说明</dt><dd>{{ detail.location || '—' }}</dd><dt>所属专业系统</dt><dd>{{ store.object(detail.systemId)?.name || '未关联' }}</dd><dt>上级组合</dt><dd>{{ store.object(detail.parentId)?.name || '未关联' }}</dd><dt>责任单位</dt><dd>{{ ORGANIZATIONS.find(row=>row.id===detail.organizationId)?.name || '未登记' }}</dd><dt>运行状态</dt><dd>{{ detail.status }}</dd><dt>管理备注</dt><dd>{{ detail.notes || '—' }}</dd></dl>
            <h2 class="section">可选现场仪表</h2><div v-for="meter in detail.meters" :key="meter.id" class="relation-card"><strong>{{ meter.name }}</strong><p>{{ meter.location }}</p></div><p v-if="!detail.meters.length" class="muted">未独立登记仪表；普通巡检不以此为前置。</p>
            <div class="scope-note section">检查项唯一编制入口：巡检规则。设备详情不复制可编辑检查表。</div><el-button type="primary" plain style="margin-top:16px" @click="detailTab='history'">查看该对象巡检记录</el-button>
          </el-tab-pane>
          <el-tab-pane label="关联关系" name="relations">
            <h2 class="section">组成关系 · 父子设备</h2><p class="muted">父设备：<el-button v-if="detail.parentId" link type="primary" @click="openDetail(detail.parentId)">{{ store.object(detail.parentId)?.name || detail.parentId }}</el-button><span v-else>独立对象，无需设置父设备</span></p>
            <div v-for="member in compositionMembers" :key="member.id" class="relation-card"><el-button link type="primary" @click="openDetail(member.id)">{{ member.name }}</el-button><p class="muted">{{ member.code }} · {{ store.spacePath(member.spaceId) }} · {{ member.status }}</p></div><p v-if="!compositionMembers.length" class="muted">无组成子设备。</p>
            <h2 class="section">专业系统关系 · 独立于组成</h2><p class="muted">所属系统：<el-button v-if="detail.systemId" link type="primary" @click="openDetail(detail.systemId)">{{ store.object(detail.systemId)?.name || detail.systemId }}</el-button><span v-else>未关联专业系统</span></p>
            <div v-for="member in systemMembers" :key="member.id" class="relation-card"><el-button link type="primary" @click="openDetail(member.id)">{{ member.name }}</el-button><p class="muted">{{ member.code }} · {{ member.type }} · {{ store.spacePath(member.spaceId) }}</p></div><p v-if="detail.type==='专业系统' && !systemMembers.length" class="muted">此系统尚无成员，可通过“维护关联关系”选择既有台账对象。</p>
            <h2 class="section">明确关联的共用设施</h2><div v-for="id in store.facilityIds(detail.id)" :key="id" class="relation-card"><el-button link type="primary" @click="openDetail(id)">{{ store.object(id)?.name || id }}</el-button><p class="muted">引用同一个实际设施，不复制档案。</p></div><p v-if="!store.facilityIds(detail.id).length" class="muted">未登记额外设施关联。</p>
            <h2 class="section">空间位置关系</h2><p class="muted">{{ detailCoverage.map(id=>store.spacePath(id)).join('；') }}。各成员的位置与组成、系统关系分别维护。</p>
          </el-tab-pane>
          <el-tab-pane label="巡检记录" name="history" lazy><EquipmentInspectionHistory v-if="detailTab==='history'" :key="detail.id" :asset="detail" /></el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>
  </main>
</template>
<style scoped src="./equipment.css"></style>
