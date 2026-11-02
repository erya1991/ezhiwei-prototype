<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ACCEPT_LIST, HAZARD_LIST, ACCEPT_CONCLUSIONS, AFTER_LEVELS,
  gradeOf, hazardOf, todayStr, appendHistory
} from '../../data/hazard'

const keyword = ref('')
const filterConclusion = ref('')
const filterLevel = ref('')
const filterAfterLevel = ref('')

const rows = computed(() =>
  ACCEPT_LIST.map((a) => {
    const h = hazardOf(a.hazardId)
    return {
      ...a,
      hazardDesc: h ? h.desc : '（隐患已删除）',
      hazardLevel: h ? h.level : a.levelBefore,
      hazardStatus: h ? h.status : '—'
    }
  })
)

const tableData = computed(() => {
  let list = rows.value.slice()
  if (filterConclusion.value) list = list.filter((a) => a.conclusion === filterConclusion.value)
  if (filterLevel.value) list = list.filter((a) => a.hazardLevel === filterLevel.value)
  if (filterAfterLevel.value) list = list.filter((a) => a.levelAfter === filterAfterLevel.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (a) => a.id.includes(k) || a.hazardId.includes(k) || a.acceptor.includes(k) ||
             a.hazardDesc.includes(k)
    )
  }
  return list.sort((a, b) => (a.acceptTime < b.acceptTime ? 1 : -1))
})

const conclusionTag = { 合格: 'success', 部分合格: 'warning', 不合格: 'danger' }

function levelPillStyle(level) {
  if (level === '已消除') return { background: '#107C101A', color: '#107C10', borderColor: '#107C1055' }
  const g = gradeOf(level)
  return { background: g.color + '1A', color: g.color, borderColor: g.color + '55' }
}
function levelDot(level) {
  return { background: level === '已消除' ? '#107C10' : gradeOf(level).color }
}

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}
const detailHazard = computed(() =>
  detailRow.value ? hazardOf(detailRow.value.hazardId) : null
)

// ---- 新建验收 ----
const dialogVisible = ref(false)
const form = ref(emptyForm())
function emptyForm() {
  return {
    hazardId: '', acceptor: '', acceptTime: '', conclusion: '合格',
    levelAfter: '已消除', measure: '', failReason: '', remark: ''
  }
}

const pendingHazards = computed(() =>
  HAZARD_LIST.filter((h) => h.status === '待验收').map((h) => ({
    value: h.id,
    label: `${h.id}｜${h.level}｜${h.desc.slice(0, 24)}`
  }))
)

const selectedHazard = computed(() => hazardOf(form.value.hazardId))

function openCreate() {
  form.value = emptyForm()
  form.value.acceptTime = todayStr() + ' 09:00'
  dialogVisible.value = true
}

function submitForm() {
  if (!form.value.hazardId) { ElMessage.warning('请选择待验收的隐患'); return }
  if (!form.value.acceptor) { ElMessage.warning('请填写验收人'); return }
  if (form.value.conclusion !== '合格' && !form.value.failReason) {
    ElMessage.warning('不合格 / 部分合格必须填写原因')
    return
  }
  const h = selectedHazard.value
  const dstr = form.value.acceptTime.slice(0, 10).replace(/-/g, '')
  const maxNo = ACCEPT_LIST
    .filter((a) => a.id.startsWith(`YS-${dstr}-`))
    .reduce((m, a) => Math.max(m, Number(a.id.slice(-4)) || 0), 0)
  const prevFail = h ? ACCEPT_LIST.filter((a) => a.hazardId === h.id && a.conclusion !== '合格').length : 0
  ACCEPT_LIST.unshift({
    id: `YS-${dstr}-` + String(maxNo + 1).padStart(4, '0'),
    hazardId: form.value.hazardId,
    levelBefore: h ? h.level : '',
    inspectId: '',
    inspector: h ? h.ownerName || '' : '',
    measure: form.value.measure,
    fixer: h ? h.ownerName || '' : '',
    fixTime: h ? h.fixTime || '' : '',
    photosAfter: [],
    acceptor: form.value.acceptor,
    acceptTime: form.value.acceptTime,
    conclusion: form.value.conclusion,
    levelAfter: form.value.levelAfter,
    closed: form.value.conclusion === '合格' ? '是' : '否',
    failReason: form.value.failReason,
    failCount: form.value.conclusion === '合格' ? prevFail : prevFail + 1,
    remark: form.value.remark
  })
  if (h) {
    const idx = HAZARD_LIST.findIndex((x) => x.id === h.id)
    if (idx > -1) {
      const cur = HAZARD_LIST[idx]
      const ok = form.value.conclusion === '合格'
      let hist = appendHistory(cur, {
        time: form.value.acceptTime,
        node: '验收',
        actor: form.value.acceptor,
        action: `验收${form.value.conclusion}`,
        note: `治理后等级「${form.value.levelAfter}」` + (ok ? '' : `；退回整改：${form.value.failReason || ''}`)
      })
      hist = ok
        ? [...hist, { time: form.value.acceptTime, node: '关闭', actor: '系统', action: '隐患关闭', note: '闭环归档' }]
        : [...hist, { time: form.value.acceptTime, node: '整改', actor: '系统', action: '退回重新整改', note: '整改期限按等级重算' }]
      HAZARD_LIST.splice(idx, 1, {
        ...cur,
        status: ok ? '已关闭' : '整改中',
        acceptor: form.value.acceptor,
        acceptTime: form.value.acceptTime,
        acceptConclusion: form.value.conclusion,
        history: hist
      })
    }
  }
  ElMessage.success(
    form.value.conclusion === '合格'
      ? '验收合格，隐患已关闭（原型演示，刷新后还原）'
      : '验收不合格，隐患已退回「整改中」（原型演示，刷新后还原）'
  )
  dialogVisible.value = false
}

function quickAccept(row) {
  if (row.conclusion !== '合格') {
    ElMessageBox.alert(
      `该次验收结论为「${row.conclusion}」，原因：${row.failReason || '未填写'}。\n不合格须退回整改后重新验收，累计不合格 ${row.failCount} 次。`,
      '验收不合格',
      { type: 'warning' }
    ).catch(() => {})
  } else {
    openDetail(row)
  }
}
</script>

<template>
  <div class="tab-body">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索验收编号 / 隐患编号 / 验收人" clearable style="width: 250px" />
        <el-select v-model="filterLevel" placeholder="原隐患等级" clearable style="width: 125px">
          <el-option label="重大" value="重大" />
          <el-option label="较大" value="较大" />
          <el-option label="一般" value="一般" />
        </el-select>
        <el-select v-model="filterConclusion" placeholder="验收结论" clearable style="width: 120px">
          <el-option v-for="c in ACCEPT_CONCLUSIONS" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="filterAfterLevel" placeholder="治理后等级" clearable style="width: 125px">
          <el-option v-for="l in AFTER_LEVELS" :key="l" :label="l" :value="l" />
        </el-select>
      </div>
      <div class="right-ops">
        <span class="count-text">{{ tableData.length }} 条</span>
        <el-button type="primary" size="small" @click="openCreate">+ 新建验收</el-button>
      </div>
    </div>

    <el-table :data="tableData" stripe border size="small" style="width: 100%">
      <el-table-column prop="id" label="验收编号" width="140" />
      <el-table-column prop="hazardId" label="关联隐患" width="135" />
      <el-table-column prop="hazardDesc" label="隐患描述" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.hazardDesc }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="原等级" width="85" align="center">
        <template #default="{ row }">
          <span class="level-pill" :style="levelPillStyle(row.hazardLevel)">
            <i :style="levelDot(row.hazardLevel)"></i>{{ row.hazardLevel }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="fixer" label="整改人" width="80" />
      <el-table-column prop="fixTime" label="整改完成" width="135" />
      <el-table-column prop="acceptor" label="验收人" width="80" />
      <el-table-column prop="acceptTime" label="验收时间" width="135" sortable />
      <el-table-column label="验收结论" width="95" align="center">
        <template #default="{ row }">
          <el-tag :type="conclusionTag[row.conclusion]" size="small" effect="light">
            {{ row.conclusion }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="治理后等级" width="105" align="center">
        <template #default="{ row }">
          <span class="level-pill" :style="levelPillStyle(row.levelAfter)">
            <i :style="levelDot(row.levelAfter)"></i>{{ row.levelAfter }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="复核次数" width="85" align="center">
        <template #default="{ row }">
          <span :class="row.failCount ? 'fail-count' : 'muted'">{{ row.failCount || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="quickAccept(row)">详情</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的验收记录" :image-size="80" />
      </template>
    </el-table>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="验收名片" size="680px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.hazardDesc }}</div>
        <div class="detail-sub">
          <el-tag :type="conclusionTag[detailRow.conclusion]" size="small" effect="light">
            {{ detailRow.conclusion }}
          </el-tag>
          <span class="detail-code">{{ detailRow.id }} → {{ detailRow.hazardId }}</span>
        </div>

        <div v-if="detailRow.conclusion !== '合格'" class="alert-box warning">
          验收不合格，隐患已退回「整改中」。不合格原因：{{ detailRow.failReason || '未填写' }}。
          累计不合格 {{ detailRow.failCount }} 次，多次不合格须追责整改人。
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="关联隐患">{{ detailRow.hazardId }}</el-descriptions-item>
          <el-descriptions-item label="隐患当前状态">{{ detailRow.hazardStatus }}</el-descriptions-item>
          <el-descriptions-item label="原隐患等级">{{ detailRow.hazardLevel }}</el-descriptions-item>
          <el-descriptions-item label="治理后等级">{{ detailRow.levelAfter }}</el-descriptions-item>
          <el-descriptions-item label="来源排查">{{ detailRow.inspectId || '—' }}</el-descriptions-item>
          <el-descriptions-item label="是否关闭">{{ detailRow.closed }}</el-descriptions-item>
          <el-descriptions-item label="整改人">{{ detailRow.fixer }}</el-descriptions-item>
          <el-descriptions-item label="整改完成时间">{{ detailRow.fixTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改措施" :span="2">{{ detailRow.measure || '—' }}</el-descriptions-item>
          <el-descriptions-item label="验收人">{{ detailRow.acceptor }}</el-descriptions-item>
          <el-descriptions-item label="验收时间">{{ detailRow.acceptTime }}</el-descriptions-item>
          <el-descriptions-item label="不合格原因" :span="2">
            <span :class="detailRow.failReason ? 'danger-text' : ''">{{ detailRow.failReason || '—' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="整改后照片" :span="2">
            <div v-if="(detailRow.photosAfter || []).length" class="photo-list">
              <span v-for="p in detailRow.photosAfter" :key="p" class="photo-chip">{{ p }}</span>
            </div>
            <span v-else class="muted">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="detailHazard" class="drawer-section-title">关联隐患摘要</div>
        <el-descriptions v-if="detailHazard" :column="2" border size="small">
          <el-descriptions-item label="隐患位置" :span="2">{{ detailHazard.location }}</el-descriptions-item>
          <el-descriptions-item label="隐患类型">{{ detailHazard.typeName }}</el-descriptions-item>
          <el-descriptions-item label="专业系统">{{ detailHazard.system }}</el-descriptions-item>
          <el-descriptions-item label="上报人">{{ detailHazard.reporter }}</el-descriptions-item>
          <el-descriptions-item label="整改期限">{{ detailHazard.deadline }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <!-- 新建验收 -->
    <el-dialog v-model="dialogVisible" title="新建验收" width="680px" destroy-on-close>
      <el-form :model="form" label-width="110px">
        <el-form-item label="待验收隐患" required>
          <el-select v-model="form.hazardId" filterable style="width: 100%" placeholder="选择「待验收」状态的隐患">
            <el-option v-for="h in pendingHazards" :key="h.value" :label="h.label" :value="h.value" />
          </el-select>
          <div v-if="!pendingHazards.length" class="field-hint warn">
            当前没有「待验收」状态的隐患，请先在隐患台账中把整改完成的隐患流转到待验收
          </div>
        </el-form-item>
        <el-form-item v-if="selectedHazard" label="隐患信息">
          <div class="readonly-box">
            <div>{{ selectedHazard.desc }}</div>
            <div class="readonly-meta">
              等级：<span :style="{ color: gradeOf(selectedHazard.level).color, fontWeight: 600 }">{{ selectedHazard.level }}</span>
              ｜责任人：{{ selectedHazard.ownerName || '—' }}｜整改期限：{{ selectedHazard.deadline }}
            </div>
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="验收人" required>
              <el-input v-model="form.acceptor" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="验收时间">
              <el-date-picker
                v-model="form.acceptTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="验收结论" required>
              <el-radio-group v-model="form.conclusion">
                <el-radio v-for="c in ACCEPT_CONCLUSIONS" :key="c" :value="c">{{ c }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="治理后等级">
              <el-select v-model="form.levelAfter" style="width: 100%">
                <el-option v-for="l in AFTER_LEVELS" :key="l" :label="l" :value="l" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="整改措施确认">
              <el-input v-model="form.measure" type="textarea" :rows="2" maxlength="300" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="form.conclusion === '合格' ? '不合格原因' : '不合格原因（必填）'">
              <el-input
                v-model="form.failReason"
                type="textarea"
                :rows="2"
                maxlength="200"
                show-word-limit
                placeholder="不合格 / 部分合格必须写清哪里没整改到位"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">提交验收</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
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
.right-ops { display: flex; align-items: center; gap: 12px; }
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
.level-pill i { width: 5px; height: 5px; border-radius: 50%; }
.fail-count { font-weight: 700; color: var(--ez-danger); font-variant-numeric: tabular-nums; }
.muted { color: var(--ez-text-muted); font-size: 12px; }

.detail-title { font-size: 15px; font-weight: 600; color: var(--ez-text); line-height: 1.6; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; flex-wrap: wrap; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.drawer-section-title { margin: 20px 0 10px; font-size: 13px; font-weight: 600; color: var(--ez-text); }
.danger-text { color: var(--ez-danger); font-weight: 600; }

.photo-list { display: flex; gap: 6px; flex-wrap: wrap; }
.photo-chip {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--ez-fill-light);
  border-radius: 4px;
  color: var(--ez-text-secondary);
}

.readonly-box {
  width: 100%;
  padding: 8px 12px;
  background: var(--ez-fill-light);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text);
  line-height: 1.7;
}
.readonly-meta { margin-top: 4px; font-size: 11px; color: var(--ez-text-secondary); }

.field-hint { flex: 1 1 100%; margin-top: 4px; font-size: 11px; color: var(--ez-text-muted); line-height: 1.6; }
.field-hint.warn { color: var(--ez-warning-text); }

.alert-box {
  margin-bottom: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.7;
}
.alert-box.warning {
  background: rgba(255, 149, 0, 0.1);
  border-left: 3px solid var(--ez-warning);
  color: var(--ez-warning-text);
}
</style>
