<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { jointStore as store, SPACE_TYPES, SPACE_PARENT_TYPES, CHECKABLE_SPACE_TYPES, PROJECT, ORGANIZATIONS, clone } from '../../data/equipmentInspectionMock.js'
const search = ref(''), applied = ref(''), selected = ref(''), page = ref(1)
function treeRows(parentId='') { return store.state.spaces.filter(row => row.parentId===parentId).map(row => ({...row,children:treeRows(row.id)})) }
const tree = computed(() => treeRows())
const rows = computed(() => store.state.spaces.filter(row => (!selected.value || store.ancestors(store.state.spaces,row.id).some(parent => parent.id===selected.value)) && (!applied.value || `${row.code}${row.name}${row.usage}`.includes(applied.value))))
function query() { applied.value=search.value.trim(); page.value=1 }
function reset() { search.value=''; applied.value=''; selected.value=''; page.value=1 }
const dialog=ref(false), draft=ref({}), error=ref(''), facilities=ref([]), detailId=ref('')
const detail=computed(() => store.byId(store.state.spaces,detailId.value))
const locked=computed(() => Boolean(draft.value.id && store.spaceReferenced(draft.value.id)))
const parents=computed(() => store.state.spaces.filter(row => (SPACE_PARENT_TYPES[draft.value.type] || []).includes(row.type) && row.id!==draft.value.id))
function open(row) {
  draft.value=row?clone(row):{id:'',code:'',name:'',type:'机房',parentId:'',projectId:PROJECT.id,usage:'',structure:'',deliveredAt:'',ownerId:'',maintainerId:'org-maintenance',location:'',status:'使用中'}
  if (!row && SPACE_PARENT_TYPES[draft.value.type].includes(store.byId(store.state.spaces,selected.value)?.type)) draft.value.parentId=selected.value
  facilities.value=row?store.facilityIds(row.id):[]; error.value=''; dialog.value=true
}
function changeType() { draft.value.parentId=''; if (draft.value.type!=='楼栋') { draft.value.structure=''; draft.value.deliveredAt=''; draft.value.ownerId='' } }
function save() { try { const saved=store.saveSpace(draft.value); if(CHECKABLE_SPACE_TYPES.includes(saved.type)) store.saveSpaceFacilities(saved.id,facilities.value); dialog.value=false; ElMessage.success('空间与关联已保存；历史任务保持生成时的位置快照') } catch(e) { error.value=e.message } }
const orgName=id=>ORGANIZATIONS.find(row=>row.id===id)?.name || '未登记'
</script>
<template>
  <main class="equipment-page">
    <header class="page-heading"><div><div class="eyebrow">设备管理 / 基础对象</div><h1>院区空间与建筑档案</h1><p class="subtitle">维护院区、楼栋、楼层及其片区、房间、机房和公共区域，设备统一引用安装空间。</p></div><el-button type="primary" @click="open()">新增空间</el-button></header>
    <p class="scope-note">本地 Mock 演示 · 院区 → 楼栋 → 楼层 → 片区（可选）→ 房间 / 机房 / 公共区域。大厅、走廊也须建档；空间与设备各自保留稳定身份。</p>
    <el-alert v-if="store.notice.catalog" :title="store.notice.catalog" type="warning" :closable="false" /><el-alert v-if="store.notice.persistence" :title="store.notice.persistence" type="warning" :closable="false" />
    <div class="workspace"><aside class="panel tree-panel"><div class="row-between"><h2>院区空间</h2><el-button link @click="reset">全部</el-button></div><el-tree :data="tree" node-key="id" :props="{label:'name'}" default-expand-all highlight-current @node-click="row=>{selected=row.id;page=1}" /></aside>
      <section class="panel"><el-form class="filters" @submit.prevent="query"><el-input v-model="search" aria-label="空间查询" placeholder="空间名称 / 编码 / 用途" clearable /><el-button type="primary" native-type="submit">查询</el-button><el-button @click="reset">重置</el-button></el-form><p class="table-caption">{{ PROJECT.name }} · 共 {{ rows.length }} 个空间</p>
        <el-table :data="rows.slice((page-1)*10,page*10)" stripe empty-text="没有符合条件的空间"><el-table-column label="空间" min-width="190"><template #default="{row}"><el-button link type="primary" class="asset-name" @click="detailId=row.id">{{ row.name }}</el-button><small class="muted">{{ row.code }} · {{ row.type }}</small></template></el-table-column><el-table-column label="上级位置" min-width="150"><template #default="{row}">{{ store.byId(store.state.spaces,row.parentId)?.name || '—' }}</template></el-table-column><el-table-column label="用途 / 位置" min-width="210"><template #default="{row}">{{ row.usage || '—' }}<div class="muted">{{ row.location || '见上级位置' }}</div></template></el-table-column><el-table-column prop="status" label="使用状态" width="100" /><el-table-column label="操作" width="120" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open(row)">编辑</el-button><el-button link @click="detailId=row.id">详情</el-button></template></el-table-column></el-table><el-pagination v-model:current-page="page" :total="rows.length" :page-size="10" layout="total, prev, pager, next" class="pagination" />
      </section>
    </div>
    <el-dialog v-model="dialog" :title="draft.id?'编辑空间与建筑资料':'新增空间'" class="ez-dialog equipment-editor" width="min(820px,94vw)" align-center append-to-body destroy-on-close>
      <el-alert v-if="locked" title="已有下级或对象引用：空间编码、类型、上级与项目受限。位置名称变化不改写已生成任务。" type="info" :closable="false" />
      <el-form label-position="top" class="form-grid" @submit.prevent="save"><el-form-item label="空间类型" required><el-select v-model="draft.type" :disabled="locked" @change="changeType"><el-option v-for="type in SPACE_TYPES" :key="type" :value="type" /></el-select></el-form-item><el-form-item label="所属项目 / 院区" required><el-input :model-value="PROJECT.name" disabled /></el-form-item><el-form-item label="空间编码" required><el-input v-model="draft.code" :disabled="locked" maxlength="40" /></el-form-item><el-form-item label="空间名称" required><el-input v-model="draft.name" maxlength="60" /></el-form-item><el-form-item v-if="draft.type!=='院区'" label="上级空间" required><el-select v-model="draft.parentId" filterable :disabled="locked" placeholder="按层级选择上级"><el-option v-for="row in parents" :key="row.id" :value="row.id" :label="store.spacePath(row.id)" /></el-select></el-form-item><el-form-item label="用途 / 场所类型" :required="draft.type==='楼栋'"><el-input v-model="draft.usage" placeholder="如大厅、走廊、普通房间、锅炉房或建筑用途" maxlength="100" /></el-form-item>
        <template v-if="draft.type==='楼栋'"><el-form-item label="结构形式"><el-input v-model="draft.structure" placeholder="资料未取得时可留空" maxlength="100" /></el-form-item><el-form-item label="竣工 / 交付日期"><el-date-picker v-model="draft.deliveredAt" type="date" value-format="YYYY-MM-DD" /></el-form-item><el-form-item label="产权单位"><el-select v-model="draft.ownerId" clearable><el-option v-for="row in ORGANIZATIONS" :key="row.id" :value="row.id" :label="row.name" /></el-select></el-form-item></template>
        <el-form-item label="管养单位"><el-select v-model="draft.maintainerId" clearable><el-option v-for="row in ORGANIZATIONS" :key="row.id" :value="row.id" :label="row.name" /></el-select></el-form-item><el-form-item label="使用状态" required><el-select v-model="draft.status"><el-option value="使用中" /><el-option value="暂不使用" /></el-select></el-form-item><el-form-item label="可现场定位的位置说明" :required="CHECKABLE_SPACE_TYPES.includes(draft.type)" class="wide"><el-input v-model="draft.location" type="textarea" :rows="2" maxlength="500" /></el-form-item>
        <el-form-item v-if="CHECKABLE_SPACE_TYPES.includes(draft.type)" label="明确关联设施 / 建筑构件（供综合检查展开）" class="wide"><el-select v-model="facilities" multiple filterable placeholder="选择已登记的共用管路、防火门等"><el-option v-for="row in store.state.assets.filter(asset=>['设施','建筑构件'].includes(asset.type))" :key="row.id" :value="row.id" :label="`${row.code} · ${row.name}`" /></el-select><p class="reference">仍按实际类型和分类匹配规则；缺少关联时必需组提示待补充，不按房间名称猜测。</p></el-form-item>
      </el-form><p v-if="error" class="error-box" role="alert">{{ error }}</p><template #footer><el-button @click="dialog=false">取消</el-button><el-button type="primary" @click="save">保存空间</el-button></template>
    </el-dialog>
    <el-drawer :model-value="Boolean(detail)" title="空间 / 建筑档案" size="min(680px,94vw)" append-to-body @close="detailId=''">
      <template v-if="detail"><h2>{{ detail.name }}</h2><dl class="detail-list"><dt>稳定 ID / 编码</dt><dd>{{ detail.id }} / {{ detail.code }}</dd><dt>位置路径</dt><dd>{{ store.spacePath(detail.id) }}</dd><dt>所属项目</dt><dd>{{ PROJECT.name }}</dd><dt>用途</dt><dd>{{ detail.usage || '未登记' }}</dd><template v-if="detail.type==='楼栋'"><dt>结构形式</dt><dd>{{ detail.structure || '资料待取得' }}</dd><dt>竣工 / 交付</dt><dd>{{ detail.deliveredAt || '资料待取得' }}</dd><dt>产权单位</dt><dd>{{ orgName(detail.ownerId) }}</dd></template><dt>管养单位</dt><dd>{{ orgName(detail.maintainerId) }}</dd><dt>位置说明</dt><dd>{{ detail.location || '见位置路径' }}</dd><dt>使用状态</dt><dd>{{ detail.status }}</dd></dl><h2 class="section">此空间内的实际台账对象</h2><div v-for="row in store.state.assets.filter(asset=>asset.spaceId===detail.id)" :key="row.id" class="relation-card"><strong>{{ row.name }}</strong><p class="muted">{{ row.code }} · {{ row.type }} · {{ row.status }}</p></div><p v-if="!store.state.assets.some(asset=>asset.spaceId===detail.id)" class="muted">暂无直接安装对象；下级空间的对象保留各自位置。</p><h2 v-if="CHECKABLE_SPACE_TYPES.includes(detail.type)" class="section">明确关联设施</h2><p v-if="CHECKABLE_SPACE_TYPES.includes(detail.type)" class="muted">{{ store.facilityIds(detail.id).map(id=>store.object(id)?.name).join('、') || '未关联；综合规则若要求设施组，将提示待补充。' }}</p></template>
    </el-drawer>
  </main>
</template>
<style scoped src="./equipment.css"></style>
