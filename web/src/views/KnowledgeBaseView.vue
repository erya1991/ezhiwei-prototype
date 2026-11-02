<script setup>
import { ref, computed, watch } from 'vue'
import { kbExperts, kbCategories } from '../data/knowledgeBase'
import { legacyEntries, knowledgeStore, demoContext, ROLES } from '../data/knowledgeAiMock.js'
import MaterialManager from './knowledge/MaterialManager.vue'

const entries = legacyEntries
const manager = ref(null)

// ---- 统计（本月新增会随提交递增）----
const monthlyNew = computed(() => entries.value.filter(e => e.time.startsWith(new Date().toLocaleString('sv-SE').slice(0, 7))).length)

// ---- 过滤状态 ----
const kbFilter = ref('all')
const searchQuery = ref('')
const timeFilter = ref('all')
const expertFilter = ref('')   // 点击“查看某专家全部条目”时的覆盖过滤
const categoryFilter = ref('') // 点击分类树时的覆盖过滤
const activeTab = ref('materials')

const filterTags = [
  { filter: 'all', label: '全部' },
  { filter: '医用气体', label: '医用气体' },
  { filter: '净化空调', label: '净化空调' },
  { filter: '医用纯水', label: '医用纯水' },
  { filter: '供配电', label: '供配电' },
  { filter: '电梯', label: '电梯' },
  { filter: '消防', label: '消防' },
  { filter: '安防监控', label: '安防监控' },
  { filter: '医用物流', label: '医用物流' }
]

const filteredEntries = computed(() => {
  let data = entries.value
  if (expertFilter.value) return data.filter((e) => e.expert === expertFilter.value)
  if (categoryFilter.value) return data.filter((e) => e.title.includes(categoryFilter.value) || e.domain.includes(categoryFilter.value))
  if (kbFilter.value !== 'all') data = data.filter((e) => e.domain === kbFilter.value)
  const q = searchQuery.value.toLowerCase()
  if (q) data = data.filter((e) => [e.title, e.desc, e.expert, e.domain].some((t) => (t || '').toLowerCase().includes(q)))
  if (timeFilter.value !== 'all') {
    const now = new Date()
    const cutoffs = { week: 7 * 86400000, month: 30 * 86400000, quarter: 90 * 86400000 }
    data = data.filter((e) => (now - new Date(e.time)) < cutoffs[timeFilter.value])
  }
  return data
})

// 普通过滤条件变化时，清除“专家/分类”覆盖过滤
watch([searchQuery, timeFilter, kbFilter], () => {
  expertFilter.value = ''
  categoryFilter.value = ''
})

// ---- 分类树展开状态 ----
const expandedCats = ref(new Set())
function toggleTree(name) {
  const s = new Set(expandedCats.value)
  s.has(name) ? s.delete(name) : s.add(name)
  expandedCats.value = s
}

// ---- 收藏 ----
function toggleFav(e) {
  const d = knowledgeStore.getDocument(e.id)
  d.fav = !d.fav
}

function openDetail(e) { manager.value.preview(e.id, e.version) }
function openAdd() { manager.value.openCreate() }

// ---- 专家弹窗（macOS 弹性动画）----
const expert = ref(null)
const expertShow = ref(false)
const expertOpen = ref(false)
const expertClosing = ref(false)
const expertOrigin = ref('50% 50%')

function openExpert(e, event) {
  expert.value = e
  const x = event ? event.clientX : window.innerWidth / 2
  const y = event ? event.clientY : window.innerHeight / 2
  expertOrigin.value = ((x / window.innerWidth) * 100).toFixed(1) + '% ' + ((y / window.innerHeight) * 100).toFixed(1) + '%'
  expertShow.value = true
  expertOpen.value = false
  expertClosing.value = false
  requestAnimationFrame(() => requestAnimationFrame(() => { expertOpen.value = true }))
  document.body.style.overflow = 'hidden'
}
function closeExpert() {
  expertOpen.value = false
  expertClosing.value = true
  setTimeout(() => {
    expertShow.value = false
    expertClosing.value = false
    document.body.style.overflow = ''
  }, 280)
}

// ---- 从专家/分类跳转到“知识条目”并过滤 ----
function viewExpertArticles(name) {
  closeExpert()
  setTimeout(() => {
    expertFilter.value = name
    categoryFilter.value = ''
    activeTab.value = 'entries'
  }, 300)
}
function filterByCategory(cat) {
  categoryFilter.value = cat
  expertFilter.value = ''
  activeTab.value = 'entries'
}

function importExport(action) {
  window.alert((action === 'export' ? '导出' : '导入') + '知识库数据\n（在实际部署中，触发文件下载/上传）')
}
</script>

<template>
  <div class="ai-page knowledge-page">
    <!-- 搜索栏 -->
    <div v-show="activeTab !== 'materials'" class="kb-search-wrap">
      <div class="kb-search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" v-model="searchQuery" placeholder="搜索专家姓名、知识条目、关键词…">
      </div>
      <button class="kb-search-btn">🔍 搜索</button>
      <button class="kb-action-btn" @click="importExport('export')">📥 导出</button>
      <button class="kb-action-btn" @click="importExport('import')">📤 导入</button>
    </div>

    <!-- 过滤行 -->
    <div v-show="activeTab !== 'materials'" class="kb-filter-row">
      <span class="kb-filter-label">知识分类：</span>
      <button
        v-for="t in filterTags" :key="t.filter"
        class="kb-filter-tag"
        :class="{ active: kbFilter === t.filter }"
        @click="kbFilter = t.filter"
      >{{ t.label }}</button>
      <span style="margin-left:16px;" class="kb-filter-label">更新时间：</span>
      <select class="kb-filter-select" v-model="timeFilter">
        <option value="all">全部时间</option><option value="week">最近一周</option><option value="month">最近一月</option><option value="quarter">最近三月</option>
      </select>
    </div>

    <!-- 统计卡片 -->
    <div class="kb-stat-row">
      <div class="kb-stat-card">
        <div class="kb-stat-icon blue">📚</div>
        <div><div class="kb-stat-val">{{ entries.length }}</div><div class="kb-stat-lbl">知识库条目总数</div></div>
      </div>
      <div class="kb-stat-card">
        <div class="kb-stat-icon green">👨‍⚕️</div>
        <div><div class="kb-stat-val">{{ kbExperts.length }}</div><div class="kb-stat-lbl">收录专家人数</div></div>
      </div>
      <div class="kb-stat-card">
        <div class="kb-stat-icon orange">🆕</div>
        <div><div class="kb-stat-val">{{ monthlyNew }}</div><div class="kb-stat-lbl">本月新增条目</div></div>
      </div>
      <div class="kb-stat-card">
        <div class="kb-stat-icon purple">🔥</div>
        <div><div class="kb-stat-val">{{ knowledgeStore.documents.filter(d => d.currentVersion && !d.archived).length }}</div><div class="kb-stat-lbl">当前有效资料</div></div>
      </div>
    </div>

    <!-- Tab 栏 -->
    <div class="kb-tab-bar">
      <button class="kb-tab" :class="{ active: activeTab === 'materials' }" @click="activeTab = 'materials'">资料管理</button>
      <button class="kb-tab" :class="{ active: activeTab === 'entries' }" @click="activeTab = 'entries'">📋 知识条目</button>
      <button class="kb-tab" :class="{ active: activeTab === 'experts' }" @click="activeTab = 'experts'">👨‍🔬 专家名录</button>
      <button class="kb-tab" :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'">📂 分类目录</button>
    </div>

    <MaterialManager ref="manager" v-show="activeTab === 'materials'" />

    <!-- TAB 1：知识条目 -->
    <div class="kb-tab-content" :class="{ active: activeTab === 'entries' }">
      <div class="kb-card-grid">
        <div v-for="e in filteredEntries" :key="e.id" class="kb-card" @click="openDetail(e)">
          <div class="kb-card-title">{{ e.title }}</div>
          <div class="kb-card-meta">
            <span class="kb-card-domain">{{ e.domain }}</span>
            <span class="kb-card-expert">👤 {{ e.expert }} · {{ e.expertRole }}</span>
            <span class="kb-card-time">{{ e.time }}</span>
          </div>
          <div class="kb-card-desc">{{ e.desc }}</div>
          <div class="kb-card-actions">
            <button class="kb-card-btn primary" @click.stop="openDetail(e)">📄 查看详情</button>
            <button class="kb-card-btn" @click.stop="manager.edit(e.id)" :disabled="demoContext.role !== ROLES[0] || ['待审核','已归档'].includes(knowledgeStore.latest(knowledgeStore.getDocument(e.id)).status) || knowledgeStore.latest(knowledgeStore.getDocument(e.id)).processing === '加工中'">✏️ 编辑</button>
            <button class="kb-card-btn fav" @click.stop="toggleFav(e)">{{ e.fav ? '★ 已收藏' : '☆ 收藏' }}</button>
          </div>
        </div>
      </div>
      <div v-if="!filteredEntries.length" style="text-align:center;padding:20px;font-size:12px;color:var(--text-ter);">未找到匹配的知识条目</div>
    </div>

    <!-- TAB 2：专家名录 -->
    <div class="kb-tab-content" :class="{ active: activeTab === 'experts' }">
      <div class="kb-card-grid">
        <div v-for="e in kbExperts" :key="e.id" class="kb-expert-card" @click="openExpert(e, $event)">
          <img v-if="e.photo" :src="e.photo" class="kb-expert-photo" :alt="e.name">
          <div v-else class="kb-expert-avatar" :class="e.avatar">{{ e.name[0] }}</div>
          <div style="flex:1;">
            <div class="kb-expert-name">{{ e.name }}</div>
            <div class="kb-expert-role">{{ e.role }}</div>
            <div style="display:flex;gap:4px;margin-top:4px;">
              <span v-for="d in e.domain" :key="d" class="kb-card-domain">{{ d }}</span>
            </div>
          </div>
          <div style="text-align:right;"><span class="kb-expert-count">📚 {{ entries.filter(x => x.expert === e.name).length }} 条知识</span></div>
        </div>
      </div>
    </div>

    <!-- TAB 3：分类目录 -->
    <div class="kb-tab-content" :class="{ active: activeTab === 'categories' }">
      <div class="kb-tree">
        <div v-for="(cat, i) in kbCategories" :key="cat.name" class="kb-tree-node">
          <div class="kb-tree-parent" :class="{ expanded: expandedCats.has(cat.name) }" @click="toggleTree(cat.name)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            {{ cat.name }} <span class="badge">{{ entries.filter(e => e.domain === cat.name.replace(/系统$/, '')).length }}</span>
          </div>
          <div class="kb-tree-children" :class="{ show: expandedCats.has(cat.name) }">
            <div v-for="ch in cat.children" :key="ch.name" class="kb-tree-child" @click="filterByCategory(ch.name)">{{ ch.name }} <span class="badge">{{ entries.filter(e => e.title.includes(ch.name) || e.domain.includes(ch.name)).length }}</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增按钮 -->
    <button v-if="activeTab !== 'materials' && demoContext.role === ROLES[0]" class="kb-fab" @click="openAdd">＋ 新增知识条目</button>
  </div>

  <!-- 专家详情弹窗 -->
  <div class="expert-overlay" :class="{ show: expertShow, closing: expertClosing }" @click.self="closeExpert">
    <div v-if="expert" class="expert-modal" :class="{ open: expertOpen, closing: expertClosing }" :style="{ transformOrigin: expertOrigin }">
      <div class="expert-modal-bar">
        <div class="expert-dot red" @click="closeExpert" title="关闭"></div>
        <div class="expert-dot amber" @click="closeExpert" title="最小化"></div>
        <div class="expert-dot green" @click="closeExpert" title="全屏"></div>
        <div class="expert-modal-title">{{ expert.name }}</div>
      </div>
      <div class="expert-body">
        <div class="expert-profile">
          <div style="position:relative;display:inline-block;">
            <img v-if="expert.photo" :src="expert.photo" class="expert-photo-lg" :alt="expert.name">
            <div v-else class="expert-photo-lg fallback" :class="expert.avatar">{{ expert.name[0] }}</div>
          </div>
          <div class="expert-name-lg">{{ expert.name }}</div>
          <div class="expert-role-lg">{{ expert.role }}</div>
          <div class="expert-domains-lg">
            <span v-for="d in expert.domain" :key="d" class="kb-card-domain">{{ d }}</span>
          </div>
        </div>
        <hr class="expert-divider">
        <div class="expert-section-title">📋 专家简介</div>
        <div class="expert-intro" v-html="expert.bio"></div>
        <div class="expert-stats-row">
          <div class="expert-stat-item"><div class="expert-stat-num">{{ entries.filter(x => x.expert === expert.name).length }}</div><div class="expert-stat-lbl">知识条目</div></div>
          <div class="expert-stat-item"><div class="expert-stat-num">{{ expert.domain.length }}</div><div class="expert-stat-lbl">专业领域</div></div>
          <div class="expert-stat-item"><div class="expert-stat-num">30+</div><div class="expert-stat-lbl">年经验</div></div>
        </div>
        <div style="margin-top:16px;text-align:center;">
          <button class="sys-btn primary" style="font-size:12px;padding:8px 16px;" @click="viewExpertArticles(expert.name)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            查看 {{ expert.name }} 的全部知识条目
          </button>
        </div>
      </div>
    </div>
  </div>


</template>
<style scoped>
.knowledge-page { min-width:0; }
.knowledge-page .kb-stat-row { gap:12px; margin-bottom:12px; }
.knowledge-page .kb-stat-card { padding:10px 16px; gap:12px; }
.knowledge-page .kb-stat-icon { width:32px; height:32px; font-size:18px; }
.knowledge-page .kb-stat-val { font-size:20px; line-height:1.2; }
.knowledge-page .kb-stat-card > div:last-child { display:flex; align-items:center; gap:10px; }
.knowledge-page .kb-tab-bar { margin-bottom:14px; }
.knowledge-page > * { flex-shrink:0; min-width:0; }
.kb-filter-row,.kb-search-wrap { flex-wrap:wrap; }
.kb-card-title,.kb-card-desc { overflow-wrap:anywhere; }
</style>
