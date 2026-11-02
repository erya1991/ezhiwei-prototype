<script setup>
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { jointStore as store, ASSET_TYPES, clone } from '../../data/equipmentInspectionMock.js'

const search = ref(''), applied = ref(''), selected = ref(''), page = ref(1)
const tree = computed(() => makeTree(''))
function makeTree(parentId) { return store.state.categories.filter(row => row.parentId === parentId).map(row => ({ ...row, children: makeTree(row.id) })) }
const rows = computed(() => store.state.categories.filter(row => (!selected.value || store.ancestors(store.state.categories, row.id).some(parent => parent.id === selected.value)) && (!applied.value || `${row.code}${row.name}`.toLowerCase().includes(applied.value.toLowerCase()))))
function query() { applied.value = search.value.trim(); page.value = 1 }
function reset() { search.value = ''; applied.value = ''; selected.value = ''; page.value = 1 }
const dialog = ref(false), draft = ref({}), error = ref(''), detail = ref(null)
const purpose = ref('目录分类'), renameId = ref(''), renameValue = ref(''), treeError = ref(''), renameInput = ref(null)
const locked = computed(() => Boolean(draft.value.id && store.categoryReferenced(draft.value.id)))
const parents = computed(() => store.state.categories.filter(row => row.id !== draft.value.id && store.ancestors(store.state.categories, row.id).length < 3 && !store.ancestors(store.state.categories, row.id).some(parent => parent.id === draft.value.id)))
function open(row, parentId = '') {
  draft.value = row ? clone(row) : { id: '', code: '', name: '', parentId, objectType: '', enabled: true, description: '' }
  purpose.value = row?.objectType ? '可建档分类' : parentId && store.ancestors(store.state.categories,parentId).length === 2 ? '可建档分类' : '目录分类'
  error.value = ''; dialog.value = true
}
function changePurpose() { if(purpose.value === '目录分类') draft.value.objectType = '' }
function save() { try { if(purpose.value === '可建档分类' && !draft.value.objectType) throw new Error('可建档分类必须选择管理对象类型，用于约束设备建档'); store.saveCategory(draft.value); dialog.value = false; ElMessage.success('分类已保存到本地演示数据') } catch (e) { error.value = e.message } }
function toggle(row) { try { store.saveCategory({ ...clone(row), enabled: !row.enabled }); ElMessage.success(row.enabled ? '分类已停用，历史实例保留' : '分类已启用') } catch (e) { ElMessage.error(e.message) } }
async function rename(row) { renameId.value = row.id; renameValue.value = row.name; treeError.value = ''; await nextTick(); const input=Array.isArray(renameInput.value)?renameInput.value[0]:renameInput.value; input?.focus?.() }
function saveName(row) { try { store.saveCategory({...clone(store.byId(store.state.categories,row.id)),name:renameValue.value}); renameId.value=''; treeError.value=''; ElMessage.success('分类名称已更新，原有引用身份保留') } catch(e) { treeError.value=e.message } }
</script>

<template>
  <main class="equipment-page">
    <header class="page-heading"><div><div class="eyebrow">设备管理 / 基础对象</div><h1>设备分类管理</h1><p class="subtitle">在设备设施分类树上添加下级、编辑资料或快速改名，统一维护三级分类。</p></div></header>
    <p class="scope-note">本地 Mock 演示 · 分类表示通用类型，实际设备在台账建档；机房在空间档案维护。示例分类不包含 CT / X 光等诊疗仪器。</p>
    <el-alert v-if="store.notice.persistence" :title="store.notice.persistence" type="warning" :closable="false" />
    <div class="workspace category-workspace">
      <aside class="panel tree-panel category-tree"><div class="row-between"><h2>设备设施分类</h2><div class="actions"><el-button size="small" type="primary" @click="open(null,'')">添加一级分类</el-button><el-button link @click="reset">全部</el-button></div></div>
        <p class="reference">一级、二级可添加下级；“改名”只更新名称，“编辑”打开完整资料弹窗。</p>
        <el-tree :data="tree" node-key="id" :props="{label:'name'}" default-expand-all highlight-current :expand-on-click-node="false" @node-click="node => { selected = node.id; page = 1 }">
          <template #default="{data}"><div class="category-node"><template v-if="renameId===data.id"><el-input ref="renameInput" v-model="renameValue" :aria-label="`${data.name}新名称`" size="small" maxlength="60" @click.stop @keyup.enter="saveName(data)" @keyup.esc="renameId=''" /><div class="node-actions"><el-button link size="small" type="primary" @click.stop="saveName(data)">保存</el-button><el-button link size="small" @click.stop="renameId='';treeError=''">取消</el-button></div></template><template v-else><span class="category-label" :title="data.name">{{ data.name }}</span><div class="node-actions"><el-button v-if="store.ancestors(store.state.categories,data.id).length<3" link size="small" type="primary" :aria-label="`${data.name}添加下级`" @click.stop="open(null,data.id)">添加下级</el-button><el-button link size="small" type="primary" :aria-label="`编辑${data.name}`" @click.stop="open(data)">编辑</el-button><el-button link size="small" :aria-label="`${data.name}改名`" @click.stop="rename(data)">改名</el-button></div></template></div></template>
        </el-tree><p v-if="treeError" class="error-box" role="alert">{{ treeError }}</p>
      </aside>
      <section class="panel"><el-form class="filters" @submit.prevent="query"><el-input v-model="search" aria-label="分类查询" placeholder="分类名称 / 编码" clearable @keyup.enter="query" /><el-button type="primary" native-type="submit">查询</el-button><el-button @click="reset">重置</el-button></el-form>
        <p class="table-caption">共 {{ rows.length }} 个分类 · 目录分类用于组织层级，实例分类才可供台账选择</p>
        <el-table :data="rows.slice((page-1)*10,page*10)" row-key="id" stripe empty-text="没有符合条件的分类，请重置查询">
          <el-table-column label="分类名称" min-width="160"><template #default="{row}"><el-button link type="primary" class="asset-name" @click="detail=clone(row)">{{ row.name }}</el-button><small class="muted">{{ row.code }}</small></template></el-table-column>
          <el-table-column label="层级 / 上级" min-width="150"><template #default="{row}">{{ store.ancestors(store.state.categories,row.id).length }} 级<div class="muted">{{ store.byId(store.state.categories,row.parentId)?.name || '顶级分类' }}</div></template></el-table-column>
          <el-table-column label="管理对象类型" min-width="120"><template #default="{row}">{{ row.objectType || '目录（不直接建档）' }}</template></el-table-column>
          <el-table-column label="使用状态" width="90"><template #default="{row}"><el-tag :type="row.enabled?'success':'info'">{{ row.enabled?'已启用':'已停用' }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="150" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open(row)">编辑</el-button><el-button link :type="row.enabled?'info':'success'" :style="{color:!row.enabled?'var(--ez-success)':undefined}" @click="toggle(row)">{{ row.enabled?'停用':'启用' }}</el-button></template></el-table-column>
        </el-table><el-pagination v-model:current-page="page" :page-size="10" :total="rows.length" layout="total, prev, pager, next" class="pagination" />
      </section>
    </div>
    <el-dialog v-model="dialog" :title="draft.id?'编辑分类':draft.parentId?'添加下级分类':'添加一级分类'" class="ez-dialog equipment-editor" width="min(720px,94vw)" align-center destroy-on-close append-to-body>
      <el-alert v-if="locked" title="已存在下级、台账或规则引用：编码、上级和对象类型受限；名称调整不改变历史身份。" type="info" :closable="false" />
      <el-form label-position="top" class="form-grid" @submit.prevent="save">
        <el-form-item label="分类编码" required><el-input v-model="draft.code" :disabled="locked" maxlength="40" /></el-form-item><el-form-item label="分类名称" required><el-input v-model="draft.name" maxlength="60" /></el-form-item>
        <el-form-item label="上级分类"><el-select v-model="draft.parentId" :disabled="locked" clearable placeholder="留空表示顶级"><el-option v-for="row in parents" :key="row.id" :value="row.id" :label="store.categoryPath(row.id)" /></el-select></el-form-item>
        <el-form-item label="分类用途"><el-radio-group v-model="purpose" :disabled="locked" @change="changePurpose"><el-radio-button value="目录分类">目录分类</el-radio-button><el-radio-button value="可建档分类">可建档分类</el-radio-button></el-radio-group></el-form-item>
        <el-form-item v-if="purpose==='可建档分类'" label="管理对象类型" required><el-select v-model="draft.objectType" :disabled="locked" placeholder="选择这类档案允许登记的对象"><el-option v-for="type in ASSET_TYPES" :key="type" :value="type" /></el-select></el-form-item>
        <div class="wide reference-help"><strong>为什么要区分管理对象类型？</strong><p>目录分类只负责分组，不能直接登记设备；可建档分类指定允许登记的对象类型，设备建档时必须与它一致。已被引用后不直接改变类型。</p><p>单台设备如锅炉；组合设备如内外机组合；专业系统如供配电系统；设施如共用管路；建筑构件如防火门。这些是当前原型的业务区分，正式字典仍需业务确认。</p></div>
        <el-form-item label="分类说明" class="wide"><el-input v-model="draft.description" type="textarea" :rows="3" maxlength="500" /></el-form-item><el-form-item label="供新增设备使用"><el-switch v-model="draft.enabled" active-text="启用" inactive-text="停用" style="--el-switch-on-color:var(--ez-success)" /></el-form-item>
      </el-form><p v-if="error" class="error-box" role="alert">{{ error }}</p>
      <template #footer><el-button @click="dialog=false">取消</el-button><el-button type="primary" @click="save">保存分类</el-button></template>
    </el-dialog>
    <el-drawer :model-value="Boolean(detail)" title="分类详情" size="min(560px,94vw)" append-to-body @close="detail=null"><template v-if="detail"><h2>{{ detail.name }}</h2><dl class="detail-list"><dt>稳定 ID</dt><dd>{{ detail.id }}</dd><dt>分类路径</dt><dd>{{ store.categoryPath(detail.id) }}</dd><dt>管理对象</dt><dd>{{ detail.objectType || '目录' }}</dd><dt>引用情况</dt><dd>{{ store.categoryReferenced(detail.id)?'已被下级分类 / 台账 / 规则引用，保留历史引用':'暂无引用' }}</dd><dt>说明</dt><dd>{{ detail.description || '—' }}</dd></dl></template></el-drawer>
  </main>
</template>
<style scoped src="./equipment.css"></style>
