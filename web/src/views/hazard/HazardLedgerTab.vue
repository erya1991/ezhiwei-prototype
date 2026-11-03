<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  HAZARD_LIST, HAZARD_STATUS, HAZARD_LEVELS, BUILDINGS, HAZARD_SYSTEMS,
  TYPE_LIST, gradeOf, remainDays, overdueDays, isOverdue,
  dispatchesOf, acceptsOf, inspectOfHazard, autoDeadline,
  ACCEPT_LIST, ACCEPT_CONCLUSIONS, AFTER_LEVELS,
  historyOf, appendHistory, FLOW_NODE_STYLE, originOf
} from '../../data/hazard'
import { usePager } from '../../composables/usePager'

/* ===== 隐患来源展示 ===== */
const ORIGIN_CLASS = {
  AI随手拍: 'ai',
  巡检排查: 'inspect',
  外部检查: 'outer',
  投诉: 'complaint'
}
const ORIGIN_DOC_NAME = {
  巡检排查: '排查记录',
  外部检查: '外部检查单',
  投诉: '投诉单'
}

function originLabel(row) {
  const o = originOf(row)
  if (o.type === 'AI随手拍') return 'AI随手拍'
  return o.type || '—'
}

function originClass(row) {
  return ORIGIN_CLASS[originOf(row).type] || ''
}

/** AI随手拍无来源单，用上报方式占位；其余显示来源单号（暂为假蓝链） */
function originSub(row) {
  const o = originOf(row)
  if (o.no) return o.no
  return o.method || ''
}

function openOrigin(row) {
  const o = originOf(row)
  if (!o.no) return
  ElMessage.info(`${ORIGIN_DOC_NAME[o.type] || '来源单'} ${o.no} 暂未接入跳转，后续版本支持`)
}

const keyword = ref('')
const filterBuilding = ref('')
const filterSystem = ref('')
const filterType = ref('')
const filterLevel = ref('')
const filterStatus = ref('')
const onlyOverdue = ref(false)

const tableData = computed(() => {
  let list = HAZARD_LIST.slice()
  if (filterBuilding.value) list = list.filter((h) => h.building === filterBuilding.value)
  if (filterSystem.value) list = list.filter((h) => h.system === filterSystem.value)
  if (filterType.value) list = list.filter((h) => h.typeId === filterType.value)
  if (filterLevel.value) list = list.filter((h) => h.level === filterLevel.value)
  if (filterStatus.value) list = list.filter((h) => h.status === filterStatus.value)
  if (onlyOverdue.value) list = list.filter((h) => isOverdue(h))
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (h) => h.desc.includes(k) || h.id.includes(k) || h.location.includes(k) ||
             (h.reporter || '').includes(k) || (h.typeName || '').includes(k)
    )
  }
  // 未闭环优先、逾期优先、时间倒序
  const rank = { 待受理: 0, 待派单: 1, 整改中: 2, 待验收: 3, 已关闭: 5, 已驳回: 6 }
  return list.sort((a, b) => {
    const oa = isOverdue(a) ? -1 : 0
    const ob = isOverdue(b) ? -1 : 0
    if (oa !== ob) return oa - ob
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
    return a.reportTime < b.reportTime ? 1 : -1
  })
})

const statusTag = {
  待受理: 'warning', 待派单: 'warning', 整改中: 'primary',
  待验收: 'primary', 已关闭: 'success', 已驳回: 'danger'
}

function levelPillStyle(level) {
  const g = gradeOf(level)
  return { background: g.color + '1A', color: g.color, borderColor: g.color + '55' }
}
function levelDot(level) {
  return { background: gradeOf(level).color }
}

function nowStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- 受理 ----
const acceptDialog = ref(false)
const acceptRow = ref(null)
const acceptForm = ref({ level: '一般', subjectName: '', ownerName: '', deadline: '' })

function openAccept(row) {
  if (row.status !== '待受理') {
    ElMessage.info('只有「待受理」状态的隐患可以受理')
    return
  }
  acceptRow.value = row
  acceptForm.value = {
    level: row.level,
    subjectName: row.subjectName || '医智维运维公司医用气体项目部',
    ownerName: row.ownerName || '',
    deadline: row.deadline || autoDeadline(row.level, row.reportTime)
  }
  acceptDialog.value = true
}

function onAcceptLevelChange() {
  acceptForm.value.deadline = autoDeadline(acceptForm.value.level, acceptRow.value.reportTime)
}

function confirmAccept() {
  if (!acceptForm.value.ownerName) {
    ElMessage.warning('请指定责任人')
    return
  }
  const idx = HAZARD_LIST.findIndex((h) => h.id === acceptRow.value.id)
  if (idx > -1) {
    const cur = HAZARD_LIST[idx]
    HAZARD_LIST.splice(idx, 1, {
      ...cur,
      level: acceptForm.value.level,
      subjectName: acceptForm.value.subjectName,
      ownerName: acceptForm.value.ownerName,
      deadline: acceptForm.value.deadline,
      status: '待派单',
      history: appendHistory(cur, {
        time: nowStr(),
        node: '受理',
        actor: '张安',
        action: '受理',
        note: `确认等级「${acceptForm.value.level}」，责任主体「${acceptForm.value.subjectName}」，责任人「${acceptForm.value.ownerName}」，整改期限 ${acceptForm.value.deadline}`
      })
    })
  }
  ElMessage.success('已受理，状态流转为「待派单」（原型演示，刷新后还原）')
  acceptDialog.value = false
}

// ---- 派单 ----
function dispatch(row) {
  if (row.status !== '待派单') {
    ElMessage.info('只有「待派单」状态的隐患可以派单')
    return
  }
  ElMessageBox.confirm(
    `确认按「${row.level}隐患 → 责任主体 → 第一责任人」规则自动派单给「${row.ownerName || '未指定'}」？\n派单成功后自动生成工单号，隐患进入「整改中」。`,
    '自动派单',
    { type: 'info', confirmButtonText: '确认派单', cancelButtonText: '取消' }
  ).then(() => {
    const d = new Date()
    const dstr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const no = 'GD-' + dstr + '-' + String(Math.floor(Math.random() * 9000) + 1000)
    const idx = HAZARD_LIST.findIndex((h) => h.id === row.id)
    if (idx > -1) {
      const cur = HAZARD_LIST[idx]
      HAZARD_LIST.splice(idx, 1, {
        ...cur,
        status: '整改中',
        dispatchStatus: '已接收',
        workOrderNo: no,
        history: appendHistory(cur, {
          time: nowStr(),
          node: '派单',
          actor: '系统',
          action: '自动派单',
          note: `工单号 ${no}，派给「${cur.ownerName || '未指定'}」`
        })
      })
    }
    ElMessage.success(`派单成功，工单号 ${no}（原型演示，刷新后还原）`)
  }).catch(() => {})
}

// ---- 驳回 ----
function reject(row) {
  if (row.status !== '待受理' && row.status !== '待派单') {
    ElMessage.info('当前状态不可驳回')
    return
  }
  ElMessageBox.prompt('请填写驳回原因（必填）', '驳回隐患', {
    type: 'warning',
    confirmButtonText: '确认驳回',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputValidator: (v) => (v && v.trim().length >= 5 ? true : '驳回原因不少于 5 个字')
  }).then(({ value }) => {
    const idx = HAZARD_LIST.findIndex((h) => h.id === row.id)
    if (idx > -1) {
      const cur = HAZARD_LIST[idx]
      HAZARD_LIST.splice(idx, 1, {
        ...cur,
        status: '已驳回',
        remark: value,
        history: appendHistory(cur, {
          time: nowStr(),
          node: '驳回',
          actor: '张安',
          action: '驳回',
          note: value
        })
      })
    }
    ElMessage.success('已驳回（原型演示，刷新后还原）')
  }).catch(() => {})
}

// ---- 提交整改（整改中 → 待验收）----
const fixDialog = ref(false)
const fixRow = ref(null)
const fixForm = ref({ note: '', fixTime: '' })

function openFix(row) {
  if (row.status !== '整改中') {
    ElMessage.info('只有「整改中」的隐患可以提交整改')
    return
  }
  fixRow.value = row
  fixForm.value = { note: '', fixTime: todayStr() }
  fixDialog.value = true
}

function confirmFix() {
  const note = (fixForm.value.note || '').trim()
  if (note.length < 5) {
    ElMessage.warning('请填写不少于 5 个字的整改说明')
    return
  }
  const idx = HAZARD_LIST.findIndex((h) => h.id === fixRow.value.id)
  if (idx > -1) {
    const cur = HAZARD_LIST[idx]
    HAZARD_LIST.splice(idx, 1, {
      ...cur,
      status: '待验收',
      fixTime: fixForm.value.fixTime || todayStr(),
      fixNote: note,
      history: appendHistory(cur, {
        time: nowStr(),
        node: '整改',
        actor: cur.ownerName || '张安',
        action: '提交整改',
        note
      })
    })
  }
  fixDialog.value = false
  ElMessage.success('已提交整改，状态流转为「待验收」，等待验收人核验')
}

// ---- 验收（待验收 → 已关闭 / 退回整改中）----
const verifyDialog = ref(false)
const verifyRow = ref(null)
const verifyForm = ref({ conclusion: '合格', levelAfter: '已消除', opinion: '' })

function openVerify(row) {
  if (row.status !== '待验收') {
    ElMessage.info('只有「待验收」的隐患可以验收')
    return
  }
  verifyRow.value = row
  verifyForm.value = { conclusion: '合格', levelAfter: '已消除', opinion: '' }
  verifyDialog.value = true
}

function confirmVerify() {
  const f = verifyForm.value
  const opinion = (f.opinion || '').trim()
  if (f.conclusion !== '合格' && opinion.length < 5) {
    ElMessage.warning('验收不合格时须填写不少于 5 个字的整改要求')
    return
  }
  const row = verifyRow.value
  const ts = todayStr()
  const ok = f.conclusion === '合格'
  const idx = HAZARD_LIST.findIndex((h) => h.id === row.id)
  if (idx > -1) {
    const cur = HAZARD_LIST[idx]
    const nextDeadline = ok ? cur.deadline : autoDeadline(row.level, ts)
    let hist = appendHistory(cur, {
      time: nowStr(),
      node: '验收',
      actor: '张安',
      action: `验收${f.conclusion}`,
      note: `治理后等级「${f.levelAfter}」` + (ok ? '' : `；退回整改：${opinion}`)
    })
    hist = ok
      ? [...hist, { time: nowStr(), node: '关闭', actor: '系统', action: '隐患关闭', note: '闭环归档' }]
      : [...hist, {
          time: nowStr(),
          node: '整改',
          actor: '系统',
          action: '退回重新整改',
          note: `整改期限按「${row.level}」等级重算为 ${nextDeadline}`
        }]
    HAZARD_LIST.splice(idx, 1, {
      ...cur,
      status: ok ? '已关闭' : '整改中',
      acceptConclusion: f.conclusion,
      fixTime: row.fixTime || ts,
      // 验收不合格退回时按等级重算整改期限，否则沿用旧期限会立刻再次逾期
      deadline: nextDeadline,
      remark: opinion || cur.remark,
      history: hist
    })
  }
  const prevFail = acceptsOf(row.id).filter((a) => a.conclusion !== '合格').length
  // 编号与「验收名片」保持一致：按当天最大流水号 +1
  const dstr = ts.replace(/-/g, '')
  const maxNo = ACCEPT_LIST
    .filter((a) => a.id.startsWith(`YS-${dstr}-`))
    .reduce((m, a) => Math.max(m, Number(a.id.slice(-4)) || 0), 0)
  ACCEPT_LIST.push({
    id: `YS-${dstr}-` + String(maxNo + 1).padStart(4, '0'),
    hazardId: row.id,
    levelBefore: row.level,
    inspectId: (inspectOfHazard(row.id) || {}).id || '',
    inspector: row.ownerName || '',
    measure: row.fixNote || '现场整改完成',
    fixer: row.ownerName || '',
    fixTime: (row.fixTime || ts) + ' 17:00',
    photosAfter: [],
    acceptor: '张安',
    acceptTime: ts + ' 16:00',
    conclusion: f.conclusion,
    levelAfter: f.levelAfter,
    closed: ok ? '是' : '否',
    failReason: ok ? '' : opinion,
    failCount: ok ? prevFail : prevFail + 1,
    remark: ''
  })
  verifyDialog.value = false
  ElMessage.success(ok ? '验收合格，隐患已关闭' : '验收不合格，已退回「整改中」')
}

// ---- 重新提交（已驳回 → 待受理，沿用原单号）----
const resubmitDialog = ref(false)
const resubmitRow = ref(null)
const resubmitForm = ref({ note: '' })

function openResubmit(row) {
  if (row.status !== '已驳回') {
    ElMessage.info('只有「已驳回」的隐患可以重新提交')
    return
  }
  resubmitRow.value = row
  resubmitForm.value = { note: '' }
  resubmitDialog.value = true
}

function confirmResubmit() {
  const note = (resubmitForm.value.note || '').trim()
  if (note.length < 5) {
    ElMessage.warning('请填写不少于 5 个字的补充说明，说明本次补充了什么')
    return
  }
  const row = resubmitRow.value
  const idx = HAZARD_LIST.findIndex((h) => h.id === row.id)
  if (idx > -1) {
    const cur = HAZARD_LIST[idx]
    HAZARD_LIST.splice(idx, 1, {
      ...cur,
      // 单号不变，重新进入受理环节，由受理人重新判定
      status: '待受理',
      submitStatus: '已提交',
      history: appendHistory(cur, {
        time: nowStr(),
        node: '重新提交',
        actor: cur.reporter || '张安',
        action: '重新提交',
        note
      })
    })
  }
  resubmitDialog.value = false
  ElMessage.success('已重新提交，沿用原单号，状态回到「待受理」')
}

// ---- 详情 ----
const drawerVisible = ref(false)
// 详情按 id 实时取，避免操作后抽屉里还显示旧对象
const detailId = ref('')
const detailRow = computed(() => HAZARD_LIST.find((h) => h.id === detailId.value) || null)
function openDetail(row) {
  detailId.value = row.id
  drawerVisible.value = true
}
const detailDispatches = computed(() =>
  detailRow.value ? dispatchesOf(detailRow.value.id) : []
)
const detailAccepts = computed(() =>
  detailRow.value ? acceptsOf(detailRow.value.id) : []
)
const detailInspect = computed(() =>
  detailRow.value ? inspectOfHazard(detailRow.value.id) : null
)
const detailHistory = computed(() =>
  detailRow.value ? historyOf(detailRow.value) : []
)
const detailRemain = computed(() =>
  detailRow.value ? remainDays(detailRow.value) : null
)
const detailOverdue = computed(() =>
  detailRow.value ? overdueDays(detailRow.value) : 0
)

function resetFilters() {
  keyword.value = ''
  filterBuilding.value = ''
  filterSystem.value = ''
  filterType.value = ''
  filterLevel.value = ''
  filterStatus.value = ''
  onlyOverdue.value = false
}

const { page, size, total, rows: pagedRows, indexMethod } = usePager(() => tableData)
</script>

<template>
  <div class="tab-body">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索编号 / 描述 / 位置 / 上报人" clearable style="width: 230px" />
        <el-select v-model="filterBuilding" placeholder="楼栋" clearable style="width: 105px">
          <el-option v-for="b in BUILDINGS" :key="b" :label="b" :value="b" />
        </el-select>
        <el-select v-model="filterSystem" placeholder="专业系统" clearable style="width: 150px">
          <el-option v-for="s in HAZARD_SYSTEMS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-select v-model="filterType" placeholder="隐患类型" clearable filterable style="width: 145px">
          <el-option v-for="t in TYPE_LIST" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
        <el-select v-model="filterLevel" placeholder="等级" clearable style="width: 95px">
          <el-option v-for="l in HAZARD_LEVELS" :key="l" :label="l" :value="l" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 105px">
          <el-option v-for="s in HAZARD_STATUS" :key="s" :label="s" :value="s" />
        </el-select>
        <el-checkbox v-model="onlyOverdue" label="只看逾期" />
        <el-button link type="primary" @click="resetFilters">重置</el-button>
      </div>
      <span class="count-text">{{ tableData.length }} 条</span>
    </div>

    <el-table
      :data="pagedRows"
      border
      size="small"
      style="width: 100%"
      :row-class-name="({ row }) => (isOverdue(row) ? 'row-overdue' : '')"
    >
      <el-table-column type="index" :index="indexMethod" label="序号" width="60" align="center" />
      <el-table-column prop="id" label="隐患编号" width="135" />
      <el-table-column prop="desc" label="隐患描述" min-width="250" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.desc }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="location" label="隐患位置" width="150" show-overflow-tooltip />
      <el-table-column prop="typeName" label="隐患类型" width="105" show-overflow-tooltip />
      <el-table-column label="等级" width="85" align="center">
        <template #default="{ row }">
          <span class="level-pill" :style="levelPillStyle(row.level)">
            <i :style="levelDot(row.level)"></i>{{ row.level }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTag[row.status]" size="small" effect="light">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="来源" width="150">
        <template #default="{ row }">
          <div class="origin-cell">
            <span class="origin-tag" :class="originClass(row)">{{ originLabel(row) }}</span>
            <el-link
              v-if="originOf(row).no"
              type="primary"
              :underline="false"
              class="origin-no"
              @click="openOrigin(row)"
            >{{ originSub(row) }}</el-link>
            <span v-else class="origin-sub">{{ originSub(row) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="reporter" label="上报人" width="80" />
      <el-table-column prop="reportTime" label="上报时间" width="135" sortable />
      <el-table-column label="责任人" width="85">
        <template #default="{ row }">{{ row.ownerName || '—' }}</template>
      </el-table-column>
      <el-table-column label="工单号" width="160">
        <template #default="{ row }">
          <span v-if="row.workOrderNo" class="wo-link">{{ row.workOrderNo }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="deadline" label="整改期限" width="105" />
      <el-table-column label="剩余 / 逾期" width="110" align="center">
        <template #default="{ row }">
          <span v-if="isOverdue(row)" class="overdue-text">
            逾期 {{ overdueDays(row) }} 天
          </span>
          <span v-else-if="row.status === '已关闭' || row.status === '已驳回'" class="muted">—</span>
          <span v-else class="remain-text">{{ remainDays(row) }} 天</span>
        </template>
      </el-table-column>
      <el-table-column label="验收结论" width="90" align="center">
        <template #default="{ row }">
          <el-tag
            v-if="row.acceptConclusion"
            :type="row.acceptConclusion === '合格' ? 'success' : 'warning'"
            size="small"
            effect="plain"
          >{{ row.acceptConclusion }}</el-tag>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="310" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
          <el-button
            v-if="row.status === '待受理'"
            link type="success" size="small"
            @click="openAccept(row)"
          >受理</el-button>
          <el-button
            v-if="row.status === '待派单'"
            link type="warning" size="small"
            @click="dispatch(row)"
          >派单</el-button>
          <el-button
            v-if="row.status === '整改中'"
            link type="primary" size="small"
            @click="openFix(row)"
          >提交整改</el-button>
          <el-button
            v-if="row.status === '待验收'"
            link type="success" size="small"
            @click="openVerify(row)"
          >验收</el-button>
          <el-button
            v-if="row.status === '待受理' || row.status === '待派单'"
            link type="danger" size="small"
            @click="reject(row)"
          >驳回</el-button>
          <el-button
            v-if="row.status === '已驳回'"
            link type="warning" size="small"
            @click="openResubmit(row)"
          >重新提交</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的隐患记录" :image-size="80" />
      </template>
    </el-table>

    <div v-if="total" class="table-pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="size"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <!-- 受理弹窗 -->
    <el-dialog v-model="acceptDialog" title="受理隐患" width="620px" destroy-on-close>
      <div v-if="acceptRow" class="accept-info">
        <div class="accept-desc">{{ acceptRow.desc }}</div>
        <div class="accept-meta">
          {{ acceptRow.id }}｜{{ acceptRow.building }} · {{ acceptRow.location }}｜上报人 {{ acceptRow.reporter }}
        </div>
      </div>
      <el-form :model="acceptForm" label-width="110px">
        <el-form-item label="隐患等级">
          <el-radio-group v-model="acceptForm.level" @change="onAcceptLevelChange">
            <el-radio v-for="l in HAZARD_LEVELS" :key="l" :value="l">{{ l }}</el-radio>
          </el-radio-group>
          <div class="field-hint">受理人可修正上报人的初判等级，等级决定整改时限</div>
        </el-form-item>
        <el-form-item label="责任主体">
          <el-select v-model="acceptForm.subjectName" style="width: 100%">
            <el-option label="医智维运维公司医用气体项目部" value="医智维运维公司医用气体项目部" />
            <el-option label="上海华卫医用设备维保有限公司" value="上海华卫医用设备维保有限公司" />
            <el-option label="上海市第一人民医院（南院）" value="上海市第一人民医院（南院）" />
          </el-select>
        </el-form-item>
        <el-form-item label="责任人" required>
          <el-input v-model="acceptForm.ownerName" placeholder="指定责任人姓名" />
        </el-form-item>
        <el-form-item label="整改期限">
          <el-date-picker v-model="acceptForm.deadline" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          <div class="field-hint">
            按等级自动计算：{{ acceptForm.level }}隐患 {{ gradeOf(acceptForm.level).deadlineDays }} 天，可手工调整
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="acceptDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAccept">确认受理</el-button>
      </template>
    </el-dialog>

    <!-- 提交整改弹窗 -->
    <el-dialog v-model="fixDialog" title="提交整改" width="560px">
      <div class="dialog-hint" v-if="fixRow">
        隐患 {{ fixRow.id }} · {{ fixRow.level }}隐患 · 责任期限 {{ fixRow.deadline || '未设置' }}
      </div>
      <el-form :model="fixForm" label-width="100px">
        <el-form-item label="整改完成时间">
          <el-date-picker v-model="fixForm.fixTime" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="整改说明" required>
          <el-input
            v-model="fixForm.note"
            type="textarea"
            :rows="4"
            maxlength="300"
            show-word-limit
            placeholder="说明采取了哪些措施、更换了哪些部件、自检结论（不少于 5 个字）"
          />
        </el-form-item>
        <el-form-item label="整改照片">
          <el-upload action="#" :auto-upload="false" list-type="picture-card" :limit="3">
            <span class="upload-plus">+</span>
          </el-upload>
          <div class="field-hint">原型阶段仅示意，不做真实上传</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fixDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmFix">提交整改</el-button>
      </template>
    </el-dialog>

    <!-- 验收弹窗 -->
    <el-dialog v-model="verifyDialog" title="隐患验收" width="560px">
      <div class="dialog-hint" v-if="verifyRow">
        隐患 {{ verifyRow.id }} · 原等级 {{ verifyRow.level }} · 整改说明「{{ verifyRow.fixNote || '未填写' }}」
      </div>
      <el-form :model="verifyForm" label-width="110px">
        <el-form-item label="验收结论" required>
          <el-radio-group v-model="verifyForm.conclusion">
            <el-radio v-for="c in ACCEPT_CONCLUSIONS" :key="c" :value="c">{{ c }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="治理后等级">
          <el-select v-model="verifyForm.levelAfter" style="width: 100%">
            <el-option v-for="l in AFTER_LEVELS" :key="l" :label="l" :value="l" />
          </el-select>
          <div class="field-hint">验收合格后按治理后等级重新计入风险台账；选「已消除」表示该隐患闭环</div>
        </el-form-item>
        <el-form-item label="验收意见">
          <el-input
            v-model="verifyForm.opinion"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            :placeholder="verifyForm.conclusion === '合格' ? '可选' : '不合格时必填，说明退回原因与整改要求（不少于 5 个字）'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmVerify">提交验收</el-button>
      </template>
    </el-dialog>

    <!-- 重新提交弹窗 -->
    <el-dialog v-model="resubmitDialog" title="重新提交隐患" width="520px">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="沿用原隐患单号，不新建单子"
        description="重新提交后状态回到「待受理」，由受理人重新判定等级与责任人；原驳回原因会保留在流程历史中。"
        style="margin-bottom: 14px"
      />
      <div v-if="resubmitRow" class="resubmit-meta">
        <span class="rm-code">{{ resubmitRow.id }}</span>
        <span class="rm-desc">{{ resubmitRow.desc }}</span>
      </div>
      <div v-if="resubmitRow && resubmitRow.remark" class="resubmit-reject">
        上次驳回原因：{{ resubmitRow.remark }}
      </div>
      <el-form label-width="96px" style="margin-top: 14px">
        <el-form-item label="补充说明" required>
          <el-input
            v-model="resubmitForm.note"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="请说明本次补充了哪些信息或证据，例如补充了现场照片、更换了上报角度、附第三方检测报告等（不少于 5 个字）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resubmitDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmResubmit">确认重新提交</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="drawerVisible" title="隐患详情" size="760px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.desc }}</div>
        <div class="detail-sub">
          <span class="level-pill" :style="levelPillStyle(detailRow.level)">
            <i :style="levelDot(detailRow.level)"></i>{{ detailRow.level }} · {{ gradeOf(detailRow.level).gongwei }}
          </span>
          <el-tag :type="statusTag[detailRow.status]" size="small" effect="light">{{ detailRow.status }}</el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <!-- 逾期警告 -->
        <div v-if="isOverdue(detailRow)" class="alert-box danger">
          该隐患已逾期 {{ detailOverdue }} 天（整改期限 {{ detailRow.deadline }}），须立即催办并按规定追责。
        </div>
        <div v-else-if="detailRemain !== null && detailRemain <= 2 && detailRow.status !== '已关闭'" class="alert-box warning">
          整改期限剩余 {{ detailRemain }} 天，请提醒责任人按期完成。
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="隐患位置" :span="2">{{ detailRow.location }}</el-descriptions-item>
          <el-descriptions-item label="所在楼栋">{{ detailRow.building }}</el-descriptions-item>
          <el-descriptions-item label="专业系统">{{ detailRow.system }}</el-descriptions-item>
          <el-descriptions-item label="隐患类型">{{ detailRow.typeName }}</el-descriptions-item>
          <el-descriptions-item label="隐患等级">{{ detailRow.level }}（{{ gradeOf(detailRow.level).gongwei }}）</el-descriptions-item>
          <el-descriptions-item label="色标">
            <span class="color-cell">
              <i :style="{ background: gradeOf(detailRow.level).color }"></i>
              {{ gradeOf(detailRow.level).colorName }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="验收要求">{{ gradeOf(detailRow.level).acceptRequire }}</el-descriptions-item>
          <el-descriptions-item label="上报人">{{ detailRow.reporter }}</el-descriptions-item>
          <el-descriptions-item label="上报时间">{{ detailRow.reportTime }}</el-descriptions-item>
          <el-descriptions-item label="上报方式">{{ detailRow.method }}</el-descriptions-item>
          <el-descriptions-item label="上报来源">{{ detailRow.source }}</el-descriptions-item>
          <el-descriptions-item label="隐患来源" :span="2">
            <span class="origin-detail">
              <span class="origin-tag" :class="originClass(detailRow)">{{ originLabel(detailRow) }}</span>
              <el-link
                v-if="originOf(detailRow).no"
                type="primary"
                :underline="false"
                class="origin-no"
                @click="openOrigin(detailRow)"
              >{{ originOf(detailRow).no }}</el-link>
              <span v-else class="origin-sub">{{ originSub(detailRow) }}</span>
              <span v-if="originOf(detailRow).unit" class="origin-sub">· {{ originOf(detailRow).unit }}</span>
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="责任主体">{{ detailRow.subjectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="责任人">{{ detailRow.ownerName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改期限">{{ detailRow.deadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="剩余天数">
            <span :class="isOverdue(detailRow) ? 'overdue-text' : ''">
              {{ detailRow.status === '已关闭' || detailRow.status === '已驳回' ? '—' : (detailRemain + ' 天') }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="派单状态">{{ detailRow.dispatchStatus || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关联工单">{{ detailRow.workOrderNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改措施" :span="2">{{ detailRow.fixMeasure || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改完成时间">{{ detailRow.fixTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="验收人">{{ detailRow.acceptor || '—' }}</el-descriptions-item>
          <el-descriptions-item label="验收时间">{{ detailRow.acceptTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="验收结论">{{ detailRow.acceptConclusion || '—' }}</el-descriptions-item>
          <el-descriptions-item label="二维码编号">{{ detailRow.qrCode }}</el-descriptions-item>
          <el-descriptions-item label="来源排查">
            {{ detailInspect ? `${detailInspect.id}（${detailInspect.inspector}）` : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="现场照片" :span="2">
            <div v-if="(detailRow.photos || []).length" class="photo-list">
              <span v-for="p in detailRow.photos" :key="p" class="photo-chip">{{ p }}</span>
            </div>
            <span v-else class="muted">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">流程历史（{{ detailHistory.length }} 个节点）</div>
        <div class="flow-timeline">
          <el-timeline>
            <el-timeline-item
              v-for="(it, i) in detailHistory"
              :key="i"
              :timestamp="it.time"
              :type="FLOW_NODE_STYLE[it.node] || 'info'"
              placement="top"
            >
              <div class="tl-head">
                <el-tag :type="FLOW_NODE_STYLE[it.node] || 'info'" size="small" effect="dark">{{ it.node }}</el-tag>
                <span class="tl-actor">{{ it.actor }}</span>
                <span class="tl-action">{{ it.action }}</span>
              </div>
              <div v-if="it.note" class="tl-note">{{ it.note }}</div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <div class="drawer-section-title">派单记录（{{ detailDispatches.length }}）</div>
        <el-table :data="detailDispatches" size="small" border>
          <el-table-column prop="id" label="派单编号" width="130" />
          <el-table-column prop="method" label="方式" width="85" />
          <el-table-column prop="target" label="派单对象" width="150" show-overflow-tooltip />
          <el-table-column prop="dispatchTime" label="派单时间" width="135" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag
                :type="row.status === '已接收' ? 'success' : (row.status === '派单失败' ? 'danger' : 'warning')"
                size="small"
                effect="light"
              >{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="failReason" label="失败/退回原因" min-width="160" show-overflow-tooltip />
          <template #empty>
            <el-empty description="尚未派单" :image-size="60" />
          </template>
        </el-table>

        <div class="drawer-section-title">验收记录（{{ detailAccepts.length }}）</div>
        <el-table :data="detailAccepts" size="small" border>
          <el-table-column prop="id" label="验收编号" width="130" />
          <el-table-column prop="acceptor" label="验收人" width="80" />
          <el-table-column prop="acceptTime" label="验收时间" width="135" />
          <el-table-column label="结论" width="85" align="center">
            <template #default="{ row }">
              <el-tag
                :type="row.conclusion === '合格' ? 'success' : 'warning'"
                size="small"
                effect="light"
              >{{ row.conclusion }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="levelAfter" label="治理后等级" width="100" align="center" />
          <el-table-column prop="failReason" label="不合格原因" min-width="140" show-overflow-tooltip />
          <template #empty>
            <el-empty description="尚未验收" :image-size="60" />
          </template>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.flow-timeline {
  padding: 6px 0 10px 2px;
}
.flow-timeline :deep(.el-timeline) {
  padding-left: 2px;
}
.flow-timeline :deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #6b7a89;
}
.tl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tl-actor {
  font-size: 13px;
  font-weight: 600;
  color: #1f2d3d;
}
.tl-action {
  font-size: 12px;
  color: #5b6b7c;
}
.tl-note {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.65;
  color: #6b7a89;
}
.resubmit-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.rm-code {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #5b6b7c;
}
.rm-desc {
  color: #1f2d3d;
  font-weight: 600;
}
.resubmit-reject {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(217, 48, 37, 0.07);
  border-left: 3px solid #d93025;
  font-size: 12px;
  line-height: 1.6;
  color: #a02418;
}
.tab-body { padding-top: 4px; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.count-text { font-size: 12px; color: var(--ez-text-muted); }

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

.wo-link { font-size: 11px; color: var(--ez-primary); font-variant-numeric: tabular-nums; }
/* ===== 来源列 ===== */
.origin-cell { display: flex; flex-direction: column; gap: 2px; line-height: 1.35; }
.origin-tag {
  display: inline-block; align-self: flex-start;
  font-size: 11px; padding: 0 5px; border-radius: 3px;
  border: 1px solid transparent;
}
.origin-tag.ai { color: #1f6feb; background: rgba(31, 111, 235, 0.08); border-color: rgba(31, 111, 235, 0.22); }
.origin-tag.inspect { color: #0d9488; background: rgba(13, 148, 136, 0.08); border-color: rgba(13, 148, 136, 0.22); }
.origin-tag.outer { color: #d97706; background: rgba(217, 119, 6, 0.08); border-color: rgba(217, 119, 6, 0.22); }
.origin-tag.complaint { color: #7c3aed; background: rgba(124, 58, 237, 0.08); border-color: rgba(124, 58, 237, 0.22); }
.origin-no { font-size: 11px; font-variant-numeric: tabular-nums; }
.origin-sub { font-size: 11px; color: var(--ez-text-muted); }
.origin-detail { display: inline-flex; align-items: center; gap: 6px; }
.muted { color: var(--ez-text-muted); font-size: 12px; }
.remain-text { color: var(--ez-text-secondary); font-variant-numeric: tabular-nums; }
.overdue-text { color: var(--ez-danger); font-weight: 700; font-variant-numeric: tabular-nums; }

:deep(.row-overdue) { background: rgba(217, 48, 37, 0.04) !important; }

.accept-info {
  padding: 12px 14px;
  background: var(--ez-fill-light);
  border-radius: 6px;
  margin-bottom: 16px;
}
.accept-desc { font-size: 13px; color: var(--ez-text); line-height: 1.6; }
.accept-meta { margin-top: 6px; font-size: 11px; color: var(--ez-text-secondary); }

.field-hint {
  flex: 1 1 100%;
  margin-top: 4px;
  font-size: 11px;
  color: var(--ez-text-muted);
  line-height: 1.6;
}

.detail-title { font-size: 15px; font-weight: 600; color: var(--ez-text); line-height: 1.6; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; flex-wrap: wrap; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.drawer-section-title {
  margin: 20px 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
}

.color-cell { display: inline-flex; align-items: center; gap: 5px; }
.color-cell i { width: 12px; height: 12px; border-radius: 3px; border: 1px solid rgba(0, 0, 0, 0.08); }

.photo-list { display: flex; gap: 6px; flex-wrap: wrap; }
.photo-chip {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--ez-fill-light);
  border-radius: 4px;
  color: var(--ez-text-secondary);
}

.alert-box {
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.7;
}
.alert-box.danger {
  background: rgba(217, 48, 37, 0.08);
  border-left: 3px solid var(--ez-danger);
  color: var(--ez-danger);
}
.alert-box.warning {
  background: rgba(255, 149, 0, 0.1);
  border-left: 3px solid var(--ez-warning);
  color: var(--ez-warning-text);
}
/* ===== 固定操作列不透明，避免横向滚动时下方列透出 ===== */
:deep(.el-table .el-table-fixed-column--right),
:deep(.el-table .el-table__fixed-right .el-table__cell) {
  background-color: #fff !important;
}
:deep(.el-table th.el-table-fixed-column--right),
:deep(.el-table__fixed-right .el-table__header .el-table__cell) {
  background-color: var(--ez-fill-light) !important;
}
:deep(.el-table__body tr:hover > td.el-table-fixed-column--right) {
  background-color: #f2f7ff !important;
}

/* ===== 统一分页栏 ===== */
.table-pager {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: right;
  padding: 14px 4px 2px;
}
.table-pager :deep(.el-pagination) {
  display: inline-flex;
  vertical-align: middle;
}
</style>
