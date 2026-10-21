<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { kbEntries as rawEntries, kbExperts, kbCategories, KB_DOMAINS, KB_EXPERT_ROLE } from '../data/knowledgeBase'

const entries = ref(rawEntries)

// ---- 统计（本月新增会随提交递增）----
const monthlyNew = ref(47)

// ---- 过滤状态 ----
const kbFilter = ref('all')
const searchQuery = ref('')
const timeFilter = ref('all')
const expertFilter = ref('')   // 点击“查看某专家全部条目”时的覆盖过滤
const categoryFilter = ref('') // 点击分类树时的覆盖过滤
const activeTab = ref('entries')

const filterTags = [
  { filter: 'all', label: '全部' },
  { filter: '医用气体', label: '医用气体' },
  { filter: '净化空调', label: '净化空调' },
  { filter: '医用纯水', label: '医用纯水' },
  { filter: '供配电', label: '供配电' },
  { filter: '电梯', label: '电梯' },
  { filter: '消防', label: '消防' },
  { filter: '安防', label: '安防监控' },
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
  e.fav = !e.fav
}

// ---- 详情弹窗 ----
const detailEntry = ref(null)
function openDetail(e) {
  detailEntry.value = e
}
function closeDetail() {
  detailEntry.value = null
}

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

// ---- 新增知识条目 ----
const addShow = ref(false)
const addForm = reactive({ title: '', domain: '', expert: '', desc: '', content: '' })
const addFile = ref(null)

const uploadText = computed(() => {
  const f = addFile.value
  if (!f) return '点击选择附件（支持 PDF / Word / 图片，单个 ≤ 20MB）'
  const size = f.size >= 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1024)) + ' KB'
  return '已选择：' + f.name + '（' + size + '）'
})

function openAdd() {
  addForm.title = ''
  addForm.domain = ''
  addForm.expert = ''
  addForm.desc = ''
  addForm.content = ''
  addFile.value = null
  addShow.value = true
}
function closeAdd() {
  addShow.value = false
}
function onFileChange(e) {
  addFile.value = (e.target.files && e.target.files[0]) || null
}

function submitAdd() {
  const { title, domain, expert, desc, content } = addForm
  if (!title.trim()) { window.alert('请填写知识条目标题'); return }
  if (!domain) { window.alert('请选择所属分类'); return }
  if (!expert) { window.alert('请选择关联专家'); return }
  if (!content.trim()) { window.alert('请填写正文内容'); return }

  const now = new Date()
  const time = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
  const newEntry = {
    id: Date.now(),
    title: title.trim(),
    domain,
    expert,
    expertRole: KB_EXPERT_ROLE[expert] || '后勤运维专家',
    expertAvatar: (kbExperts.find((x) => x.name === expert) || {}).avatar || 'c1',
    time,
    desc: desc.trim() || title.trim(),
    content: '<p>' + content.split(/\n{2,}/).map((p) => p.replace(/\n/g, '<br>')).join('</p><p>') + '</p>',
    fav: false
  }

  entries.value.unshift(newEntry)
  expertFilter.value = ''
  categoryFilter.value = ''
  activeTab.value = 'entries'
  monthlyNew.value += 1
  closeAdd()
  window.alert('✓ 知识条目「' + title.trim() + '」已提交，等待审核发布')
}

function importExport(action) {
  window.alert((action === 'export' ? '导出' : '导入') + '知识库数据\n（在实际部署中，触发文件下载/上传）')
}
</script>

<template>
  <div class="ai-page">
    <!-- 搜索栏 -->
    <div class="kb-search-wrap">
      <div class="kb-search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" v-model="searchQuery" placeholder="搜索专家姓名、知识条目、关键词…">
      </div>
      <button class="kb-search-btn">🔍 搜索</button>
      <button class="kb-action-btn" @click="importExport('export')">📥 导出</button>
      <button class="kb-action-btn" @click="importExport('import')">📤 导入</button>
    </div>

    <!-- 过滤行 -->
    <div class="kb-filter-row">
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
        <div><div class="kb-stat-val">1,286</div><div class="kb-stat-lbl">知识库条目总数</div></div>
      </div>
      <div class="kb-stat-card">
        <div class="kb-stat-icon green">👨‍⚕️</div>
        <div><div class="kb-stat-val">26</div><div class="kb-stat-lbl">收录专家人数</div></div>
      </div>
      <div class="kb-stat-card">
        <div class="kb-stat-icon orange">🆕</div>
        <div><div class="kb-stat-val">{{ monthlyNew }}</div><div class="kb-stat-lbl">本月新增条目</div></div>
      </div>
      <div class="kb-stat-card">
        <div class="kb-stat-icon purple">🔥</div>
        <div><div class="kb-stat-val">892</div><div class="kb-stat-lbl">本周高频访问</div></div>
      </div>
    </div>

    <!-- Tab 栏 -->
    <div class="kb-tab-bar">
      <button class="kb-tab" :class="{ active: activeTab === 'entries' }" @click="activeTab = 'entries'">📋 知识条目</button>
      <button class="kb-tab" :class="{ active: activeTab === 'experts' }" @click="activeTab = 'experts'">👨‍🔬 专家名录</button>
      <button class="kb-tab" :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'">📂 分类目录</button>
    </div>

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
            <button class="kb-card-btn" @click.stop="window.alert('编辑功能：条目 #' + e.id + '\n（在实际部署中，此处可弹出编辑表单，连接后端API进行修改）')">✏️ 编辑</button>
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
          <div style="text-align:right;"><span class="kb-expert-count">📚 {{ e.count }} 条知识</span></div>
        </div>
      </div>
    </div>

    <!-- TAB 3：分类目录 -->
    <div class="kb-tab-content" :class="{ active: activeTab === 'categories' }">
      <div class="kb-tree">
        <div v-for="(cat, i) in kbCategories" :key="cat.name" class="kb-tree-node">
          <div class="kb-tree-parent" :class="{ expanded: expandedCats.has(cat.name) }" @click="toggleTree(cat.name)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            {{ cat.name }} <span class="badge">{{ cat.count }}</span>
          </div>
          <div class="kb-tree-children" :class="{ show: expandedCats.has(cat.name) }">
            <div v-for="ch in cat.children" :key="ch.name" class="kb-tree-child" @click="filterByCategory(ch.name)">{{ ch.name }} <span class="badge">{{ ch.count }}</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增按钮 -->
    <button class="kb-fab" @click="openAdd">＋ 新增知识条目</button>
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
          <div class="expert-stat-item"><div class="expert-stat-num">{{ expert.count }}</div><div class="expert-stat-lbl">知识条目</div></div>
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

  <!-- 知识条目详情弹窗 -->
  <div class="kb-modal-overlay" :class="{ show: !!detailEntry }" @click.self="closeDetail">
    <div class="kb-modal">
      <div style="position:relative;">
        <button class="kb-modal-close" style="position:absolute;top:0;right:0;" @click="closeDetail">✕</button>
        <div class="kb-modal-title">{{ detailEntry?.title }}</div>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <span class="kb-card-domain">{{ detailEntry?.domain }}</span>
        </div>
        <div class="kb-modal-body" v-html="detailEntry?.content"></div>
        <div class="kb-modal-footer">
          <span>👤 {{ detailEntry?.expert }} · {{ detailEntry?.expertRole }}</span>
          <span>🕐 {{ detailEntry?.time }}</span>
          <span>📋 来源：医工委专家知识库</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 新增知识条目弹窗 -->
  <div class="kb-modal-overlay" :class="{ show: addShow }" @click.self="closeAdd">
    <div class="kb-add-modal">
      <div class="kb-add-head">
        <div>
          <div class="kb-add-title">＋ 新增知识条目</div>
          <div class="kb-add-sub">填写条目内容，提交后将收录至医工委专家知识库</div>
        </div>
        <button class="kb-modal-close" style="position:static;flex-shrink:0;" @click="closeAdd">✕</button>
      </div>
      <div class="kb-add-body">
        <label class="kb-add-label">知识条目标题 <span class="kb-add-req">*</span></label>
        <input class="kb-add-input" v-model="addForm.title" maxlength="80" placeholder="例：手术室洁净空调温湿度超标故障树分析与标准处置SOP">

        <div class="kb-add-row">
          <div class="kb-add-col">
            <label class="kb-add-label">所属分类 <span class="kb-add-req">*</span></label>
            <select class="kb-add-input" v-model="addForm.domain">
              <option v-for="d in KB_DOMAINS" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="kb-add-col">
            <label class="kb-add-label">关联专家 <span class="kb-add-req">*</span></label>
            <select class="kb-add-input" v-model="addForm.expert">
              <option v-for="x in kbExperts" :key="x.id" :value="x.name">{{ x.name }}（{{ x.role }}）</option>
            </select>
          </div>
        </div>

        <label class="kb-add-label">内容摘要</label>
        <textarea class="kb-add-input kb-add-area" v-model="addForm.desc" rows="2" maxlength="200" placeholder="用一两句话概括核心内容，将显示在知识条目卡片上…"></textarea>

        <label class="kb-add-label">正文内容 <span class="kb-add-req">*</span></label>
        <textarea class="kb-add-input kb-add-area" v-model="addForm.content" rows="9" placeholder="建议包含：故障现象 / 故障树分析（FTA）/ 标准处置SOP / 依据的国标·行标…"></textarea>

        <label class="kb-add-label">附件上传（可选）</label>
        <div class="kb-add-upload" @click="$refs.addFileInput.click()">
          <div class="kb-add-upload-icon">{{ addFile ? '📄' : '📎' }}</div>
          <div class="kb-add-upload-text">{{ uploadText }}</div>
        </div>
        <input ref="addFileInput" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style="display:none" @change="onFileChange">

        <div class="kb-add-tip">💡 知识条目将经管理员审核后发布，并回传至 AI 模型持续迭代优化。</div>
      </div>
      <div class="kb-add-foot">
        <button class="kb-add-cancel" @click="closeAdd">取消</button>
        <button class="kb-add-submit" @click="submitAdd">✓ 提交知识条目</button>
      </div>
    </div>
  </div>
</template>
