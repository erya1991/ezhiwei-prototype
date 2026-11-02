<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  HAZARD_LIST, RISK_POINT_LIST, RISK_POINT_TYPES, GAS_SYSTEMS,
  ACCIDENT_TYPES, CONTROL_LEVELS, AUDIT_STATUS, RISK_LEVELS,
  pointOf, measuresOfHazard
} from '../../data/risk'

const keyword = ref('')
const filterType = ref('')
const filterSystem = ref('')
const filterAccident = ref('')
const filterLevel = ref('')
const filterControl = ref('')
const filterOwner = ref('')
const filterAudit = ref('')
const groupByPoint = ref(true)

const ownerOptions = computed(() => {
  const set = new Set(RISK_POINT_LIST.map((p) => p.ownerName))
  return Array.from(set)
})

/** 组装成「危险源为行、风险点为分组」的目录行 */
const allRows = computed(() =>
  HAZARD_LIST.map((h) => {
    const p = pointOf(h.pointId) || {}
    const ms = measuresOfHazard(h.id)
    return {
      ...h,
      pointName: p.name || '—',
      pointType: p.type || '—',
      system: p.system || '—',
      location: p.location || '—',
      ownerName: p.ownerName || '—',
      measureSummary: ms.length
        ? ms.map((m) => (m.measure ? m.measure.name : '')).filter(Boolean).join('、')
        : '未制定',
      measureCount: ms.length
    }
  })
)

const tableData = computed(() => {
  let list = allRows.value.slice()
  if (filterType.value) list = list.filter((r) => r.pointType === filterType.value)
  if (filterSystem.value) list = list.filter((r) => r.system === filterSystem.value)
  if (filterAccident.value) list = list.filter((r) => (r.accidents || []).includes(filterAccident.value))
  if (filterLevel.value) list = list.filter((r) => String(r.level) === filterLevel.value)
  if (filterControl.value) list = list.filter((r) => r.controlLevel === filterControl.value)
  if (filterOwner.value) list = list.filter((r) => r.ownerName === filterOwner.value)
  if (filterAudit.value) list = list.filter((r) => r.auditStatus === filterAudit.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (r) => r.desc.includes(k) || r.id.includes(k) || r.pointName.includes(k)
    )
  }
  if (groupByPoint.value) {
    // 按风险点分组，组内 D 值降序
    const order = new Map()
    RISK_POINT_LIST.forEach((p, i) => order.set(p.id, i))
    list.sort((a, b) => {
      const oa = order.get(a.pointId) ?? 999
      const ob = order.get(b.pointId) ?? 999
      if (oa !== ob) return oa - ob
      return b.D - a.D
    })
  } else {
    list.sort((a, b) => b.D - a.D)
  }
  return list
})

/** 风险点列合并单元格（仅分组模式下生效） */
function spanMethod({ row, column, rowIndex, columnIndex }) {
  if (!groupByPoint.value) return { rowspan: 1, colspan: 1 }
  if (columnIndex > 4) return { rowspan: 1, colspan: 1 }
  const data = tableData.value
  const prev = data[rowIndex - 1]
  if (prev && prev.pointId === row.pointId) return { rowspan: 0, colspan: 0 }
  let count = 1
  for (let i = rowIndex + 1; i < data.length; i++) {
    if (data[i].pointId === row.pointId) count++
    else break
  }
  return { rowspan: count, colspan: 1 }
}

const levelDist = computed(() => {
  const m = {}
  RISK_LEVELS.forEach((r) => { m[r.level] = 0 })
  tableData.value.forEach((r) => { m[r.level] = (m[r.level] || 0) + 1 })
  return m
})

function resetFilters() {
  keyword.value = ''
  filterType.value = ''
  filterSystem.value = ''
  filterAccident.value = ''
  filterLevel.value = ''
  filterControl.value = ''
  filterOwner.value = ''
  filterAudit.value = ''
}

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}
const detailMeasures = computed(() =>
  detailRow.value ? measuresOfHazard(detailRow.value.id) : []
)

function exportCatalog() {
  ElMessage.success(`已生成风险目录清单（${tableData.value.length} 条），原型阶段不实际导出文件`)
}
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">风险目录化管理</h1>
        <p class="page-desc">
          汇总视图：由风险点、危险源、管控措施三张表实时组装，不单独存储数据。以危险源为行、风险点为分组，一屏看清全部风险及其等级、措施与责任人。
        </p>
      </div>
      <div class="head-actions">
        <el-button @click="resetFilters">重置筛选</el-button>
        <el-button type="primary" @click="exportCatalog">导出目录</el-button>
      </div>
    </div>

    <!-- 等级分布条 -->
    <div class="dist-card">
      <div class="dist-left">
        <span class="dist-total">{{ tableData.length }}</span>
        <span class="dist-total-label">条危险源</span>
      </div>
      <div class="dist-bars">
        <div
          v-for="r in RISK_LEVELS"
          :key="r.level"
          class="dist-item"
          :class="{ zero: !levelDist[r.level] }"
        >
          <span class="dist-dot" :style="{ background: r.color }"></span>
          <span class="dist-name">{{ r.level }} 级 {{ r.name }}</span>
          <span class="dist-count" :style="{ color: levelDist[r.level] ? r.color : undefined }">
            {{ levelDist[r.level] || 0 }}
          </span>
        </div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-card">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索危险源 / 风险点" clearable style="width: 210px" />
        <el-select v-model="filterType" placeholder="风险点类型" clearable style="width: 125px">
          <el-option v-for="t in RISK_POINT_TYPES" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="filterSystem" placeholder="专业系统" clearable style="width: 145px">
          <el-option v-for="s in GAS_SYSTEMS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filterAccident" placeholder="事故类型" clearable style="width: 125px">
          <el-option v-for="a in ACCIDENT_TYPES" :key="a" :label="a" :value="a" />
        </el-select>
        <el-select v-model="filterLevel" placeholder="风险等级" clearable style="width: 130px">
          <el-option
            v-for="r in RISK_LEVELS"
            :key="r.level"
            :label="`${r.level} 级 · ${r.name}`"
            :value="String(r.level)"
          />
        </el-select>
        <el-select v-model="filterControl" placeholder="管控层级" clearable style="width: 120px">
          <el-option v-for="c in CONTROL_LEVELS" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filterOwner" placeholder="责任人" clearable style="width: 110px">
          <el-option v-for="o in ownerOptions" :key="o" :label="o" :value="o" />
        </el-select>
        <el-select v-model="filterAudit" placeholder="审核状态" clearable style="width: 120px">
          <el-option v-for="a in AUDIT_STATUS" :key="a" :label="a" :value="a" />
        </el-select>
      </div>
      <el-switch
        v-model="groupByPoint"
        active-text="按风险点分组"
        inline-prompt
        style="--el-switch-on-color: var(--ez-primary)"
      />
    </div>

    <!-- 目录表 -->
    <div class="table-card">
      <el-table
        :data="tableData"
        border
        size="small"
        :span-method="spanMethod"
        style="width: 100%"
        :row-class-name="({ row }) => (row.level >= 4 ? 'row-high' : '')"
      >
        <el-table-column label="序号" width="55" align="center">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>
        <el-table-column label="风险点" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="point-cell">
              <span class="point-name">{{ row.pointName }}</span>
              <span class="point-code">{{ row.pointId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="pointType" label="类型" width="85" align="center" />
        <el-table-column prop="system" label="所属专业系统" width="130" show-overflow-tooltip />
        <el-table-column prop="location" label="所在位置" width="150" show-overflow-tooltip />
        <el-table-column prop="id" label="危险源编号" width="115" />
        <el-table-column prop="desc" label="危险源描述" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.desc }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="可能事故" width="130">
          <template #default="{ row }">
            <div class="tag-row">
              <el-tag v-for="a in row.accidents" :key="a" size="small" effect="plain" type="info">{{ a }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="L×E×C" width="90" align="center">
          <template #default="{ row }">
            <span class="lec-cell">{{ row.L }}×{{ row.E }}×{{ row.C }}</span>
          </template>
        </el-table-column>
        <el-table-column label="D 值" width="75" align="center" sortable :sort-by="(r) => r.D">
          <template #default="{ row }">
            <b class="d-value">{{ row.D }}</b>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="125" align="center">
          <template #default="{ row }">
            <span class="level-pill" :style="{
              background: row.color + '1A', color: row.color, borderColor: row.color + '55'
            }">
              <i :style="{ background: row.color }"></i>{{ row.level }} 级 · {{ row.levelName }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="管控措施" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.measureCount" class="measure-text">
              {{ row.measureSummary }}
              <span class="measure-count">（{{ row.measureCount }}）</span>
            </span>
            <el-tag v-else type="danger" size="small" effect="plain">未制定</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="controlLevel" label="管控层级" width="90" align="center" />
        <el-table-column prop="ownerName" label="责任人" width="85" />
        <el-table-column label="审核" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.auditStatus === '已通过' ? 'success' : (row.auditStatus === '已退回' ? 'danger' : 'warning')"
              size="small"
              effect="light"
            >{{ row.auditStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assessDate" label="评估日期" width="105" sortable />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有匹配的风险目录数据" :image-size="80" />
        </template>
      </el-table>
    </div>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="风险目录条目详情" size="680px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.desc }}</div>
        <div class="detail-sub">
          <span class="level-pill" :style="{
            background: detailRow.color + '1A',
            color: detailRow.color,
            borderColor: detailRow.color + '55'
          }">
            <i :style="{ background: detailRow.color }"></i>
            {{ detailRow.level }} 级 · {{ detailRow.levelName }}
          </span>
          <el-tag
            :type="detailRow.auditStatus === '已通过' ? 'success' : 'warning'"
            size="small"
            effect="light"
          >{{ detailRow.auditStatus }}</el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="风险点" :span="2">
            {{ detailRow.pointName }}（{{ detailRow.pointId }}）
          </el-descriptions-item>
          <el-descriptions-item label="风险点类型">{{ detailRow.pointType }}</el-descriptions-item>
          <el-descriptions-item label="所属专业系统">{{ detailRow.system }}</el-descriptions-item>
          <el-descriptions-item label="所在位置" :span="2">{{ detailRow.location }}</el-descriptions-item>
          <el-descriptions-item label="可能事故类型" :span="2">
            <div class="tag-row">
              <el-tag v-for="a in detailRow.accidents" :key="a" size="small" effect="plain" type="info">{{ a }}</el-tag>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="L / E / C">
            {{ detailRow.L }} / {{ detailRow.E }} / {{ detailRow.C }}
          </el-descriptions-item>
          <el-descriptions-item label="D 值">
            <b :style="{ color: detailRow.color }">{{ detailRow.D }}</b>
          </el-descriptions-item>
          <el-descriptions-item label="管控层级">{{ detailRow.controlLevel }}</el-descriptions-item>
          <el-descriptions-item label="责任人">{{ detailRow.ownerName }}</el-descriptions-item>
          <el-descriptions-item label="评估方法">{{ detailRow.method }}</el-descriptions-item>
          <el-descriptions-item label="评估日期">{{ detailRow.assessDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="触发条件" :span="2">{{ detailRow.trigger || '—' }}</el-descriptions-item>
          <el-descriptions-item label="现有管控措施" :span="2">{{ detailRow.existing || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">已制定管控措施（{{ detailMeasures.length }}）</div>
        <el-table :data="detailMeasures" size="small" border>
          <el-table-column label="措施名称" min-width="220">
            <template #default="{ row }">{{ row.measure ? row.measure.name : '—' }}</template>
          </el-table-column>
          <el-table-column label="类别" width="95">
            <template #default="{ row }">{{ row.measure ? row.measure.category : '—' }}</template>
          </el-table-column>
          <el-table-column prop="linkType" label="关联类型" width="90" align="center" />
          <el-table-column label="落实" width="85" align="center">
            <template #default="{ row }">
              <el-tag
                :type="row.isDone === '已完成' ? 'success' : (row.isDone === '已逾期' ? 'danger' : 'warning')"
                size="small"
                effect="light"
              >{{ row.isDone }}</el-tag>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="尚未制定管控措施" :image-size="60" />
          </template>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.page-wrap {
  position: fixed;
  top: var(--topbar-h);
  left: var(--sidebar-w);
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 18px 20px 20px;
  box-sizing: border-box;
  transition: left var(--transition);
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.page-title {
  margin: 0 0 6px;
  font-size: var(--ez-font-size-title);
  font-weight: 600;
  color: var(--ez-text);
}
.page-desc {
  margin: 0;
  max-width: 860px;
  font-size: var(--ez-font-size-caption);
  color: var(--ez-text-secondary);
  line-height: 1.7;
}
.head-actions { display: flex; gap: 8px; flex: 0 0 auto; }

.dist-card {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 12px 18px;
  margin-bottom: 12px;
}
.dist-left { display: flex; align-items: baseline; gap: 6px; }
.dist-total {
  font-size: 26px;
  font-weight: 700;
  color: var(--ez-text);
  font-variant-numeric: tabular-nums;
}
.dist-total-label { font-size: 12px; color: var(--ez-text-secondary); }
.dist-bars { display: flex; gap: 18px; flex-wrap: wrap; flex: 1; }
.dist-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ez-text-secondary); }
.dist-item.zero { opacity: 0.45; }
.dist-dot { width: 8px; height: 8px; border-radius: 50%; }
.dist-count { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--ez-text); }

.filter-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.table-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 12px 14px 16px;
}

.point-cell { display: flex; flex-direction: column; line-height: 1.4; }
.point-name { font-weight: 600; color: var(--ez-text); font-size: 12px; }
.point-code { font-size: 10px; color: var(--ez-text-muted); }

.tag-row { display: flex; gap: 3px; flex-wrap: wrap; }
.lec-cell { font-size: 11px; color: var(--ez-text-secondary); font-variant-numeric: tabular-nums; }
.d-value { font-variant-numeric: tabular-nums; color: var(--ez-text); }

.level-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.level-pill i { width: 5px; height: 5px; border-radius: 50%; flex: 0 0 5px; }

.measure-text { font-size: 12px; color: var(--ez-text-secondary); }
.measure-count { color: var(--ez-text-muted); }

:deep(.row-high) { background: rgba(217, 48, 37, 0.035) !important; }

.detail-title { font-size: 15px; font-weight: 600; color: var(--ez-text); line-height: 1.6; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.drawer-section-title {
  margin: 20px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}
/* ===== 页面骨架：主卡片撑满可视区 ===== */
.page-head,
.stat-row {
  flex: none;
}
.table-card {
  flex: 1 0 auto;
  min-height: 300px;
}
</style>
