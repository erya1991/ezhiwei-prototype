<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DISPATCH_LIST, HAZARD_LIST, DISPATCH_METHODS, DISPATCH_TARGET_TYPES,
  DISPATCH_STATUS, gradeOf, hazardOf, todayStr, appendHistory
} from '../../data/hazard'

const keyword = ref('')
const filterMethod = ref('')
const filterStatus = ref('')
const filterTargetType = ref('')
const filterLevel = ref('')

const rows = computed(() =>
  DISPATCH_LIST.map((d) => {
    const h = hazardOf(d.hazardId)
    return {
      ...d,
      hazardDesc: h ? h.desc : '（隐患已删除）',
      hazardLevel: h ? h.level : d.level,
      hazardStatus: h ? h.status : '—'
    }
  })
)

const tableData = computed(() => {
  let list = rows.value.slice()
  if (filterMethod.value) list = list.filter((d) => d.method === filterMethod.value)
  if (filterStatus.value) list = list.filter((d) => d.status === filterStatus.value)
  if (filterTargetType.value) list = list.filter((d) => d.targetType === filterTargetType.value)
  if (filterLevel.value) list = list.filter((d) => d.hazardLevel === filterLevel.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (d) => d.id.includes(k) || d.hazardId.includes(k) || d.target.includes(k) ||
             d.hazardDesc.includes(k) || (d.workOrderNo || '').includes(k)
    )
  }
  return list.sort((a, b) => (a.dispatchTime < b.dispatchTime ? 1 : -1))
})

const stats = computed(() => {
  const total = DISPATCH_LIST.length
  const auto = DISPATCH_LIST.filter((d) => d.method === '自动派单').length
  const received = DISPATCH_LIST.filter((d) => d.status === '已接收').length
  const failed = DISPATCH_LIST.filter((d) => d.status === '派单失败').length
  const returned = DISPATCH_LIST.filter((d) => d.status === '已退回').length
  const waiting = DISPATCH_LIST.filter((d) => d.status === '待接收').length
  return { total, auto, received, failed, returned, waiting, rate: total ? Math.round((received / total) * 100) : 0 }
})

const statusTag = {
  待接收: 'warning',
  已接收: 'success',
  已退回: 'danger',
  派单失败: 'danger'
}

// ---- 手工派单 ----
const dialogVisible = ref(false)
const form = ref(emptyForm())

function emptyForm() {
  return { hazardId: '', method: '手工派单', targetType: '责任人', target: '', remark: '' }
}

const hazardOptions = computed(() =>
  HAZARD_LIST.filter((h) => h.status === '待派单' || h.status === '待受理' || h.status === '整改中')
    .map((h) => ({ value: h.id, label: `${h.id}｜${h.level}｜${h.desc.slice(0, 26)}` }))
)

const selectedHazard = computed(() => hazardOf(form.value.hazardId))

const targetOptions = computed(() => {
  if (form.value.targetType === '责任主体') {
    return ['医智维运维公司医用气体项目部', '上海华卫医用设备维保有限公司', '上海市第一人民医院（南院）']
  }
  if (form.value.targetType === '班组') {
    return ['液氧站运行班', '制氧机组维保班', '管网巡检班', '气瓶配送组']
  }
  if (form.value.targetType === '岗位') {
    return ['气体管理员', '运行值班员', '维修保养工程师', '气瓶配送员', '班组安全员']
  }
  return ['刘志刚', '孙建军', '周文斌', '郑海龙', '马晓峰', '黄立新', '徐鹏飞', '何志远', '沈立国', '曹德明']
})

function openCreate() {
  form.value = emptyForm()
  dialogVisible.value = true
}

function submitForm() {
  if (!form.value.hazardId) { ElMessage.warning('请选择关联隐患'); return }
  if (!form.value.target) { ElMessage.warning('请选择派单对象'); return }
  const d = new Date()
  const dstr = todayStr().replace(/-/g, '')
  const maxNo = DISPATCH_LIST
    .filter((x) => x.id.startsWith(`PD-${dstr}-`))
    .reduce((m, x) => Math.max(m, Number(x.id.slice(-4)) || 0), 0)
  const ts = `${todayStr()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const no = 'GD-' + dstr + '-' + String(Math.floor(Math.random() * 9000) + 1000)
  const h = selectedHazard.value
  DISPATCH_LIST.push({
    id: `PD-${dstr}-` + String(maxNo + 1).padStart(4, '0'),
    hazardId: form.value.hazardId,
    level: h ? h.level : '',
    workOrderNo: no,
    method: form.value.method,
    rule: form.value.method === '自动派单' ? `${h ? h.level : ''}隐患 → ${form.value.targetType} → ${form.value.target}` : '',
    targetType: form.value.targetType,
    target: form.value.target,
    dispatchTime: ts,
    status: '待接收',
    receiveTime: '',
    handler: '',
    failReason: '',
    remark: form.value.remark
  })
  if (h) {
    const idx = HAZARD_LIST.findIndex((x) => x.id === h.id)
    if (idx > -1) {
      const cur = HAZARD_LIST[idx]
      HAZARD_LIST.splice(idx, 1, {
        ...cur,
        status: '整改中',
        dispatchStatus: '待接收',
        workOrderNo: no,
        history: appendHistory(cur, {
          time: ts,
          node: '派单',
          actor: '张安',
          action: form.value.method,
          note: `工单号 ${no}，派给「${form.value.target}」` + (form.value.remark ? `；${form.value.remark}` : '')
        })
      })
    }
  }
  ElMessage.success(`派单已创建，工单号 ${no}（原型演示，刷新后还原）`)
  dialogVisible.value = false
}

function reDispatch(row) {
  ElMessageBox.confirm(
    `重新派单：将以「手工派单」方式再次派给 ${row.target}，原失败记录保留以便追溯。`,
    '重新派单',
    { type: 'warning', confirmButtonText: '确认重派', cancelButtonText: '取消' }
  ).then(() => {
    const d = new Date()
    const dstr = todayStr().replace(/-/g, '')
    const maxNo = DISPATCH_LIST
      .filter((x) => x.id.startsWith(`PD-${dstr}-`))
      .reduce((m, x) => Math.max(m, Number(x.id.slice(-4)) || 0), 0)
    const ts = `${todayStr()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    DISPATCH_LIST.push({
      ...row,
      id: `PD-${dstr}-` + String(maxNo + 1).padStart(4, '0'),
      method: '手工派单',
      dispatchTime: ts,
      status: '待接收',
      receiveTime: '',
      handler: '',
      failReason: '',
      remark: '由失败记录重派'
    })
    ElMessage.success('已重新派单（原型演示，刷新后还原）')
  }).catch(() => {})
}

function markReceived(row) {
  const idx = DISPATCH_LIST.findIndex((d) => d.id === row.id)
  if (idx > -1) {
    const d = new Date()
    DISPATCH_LIST.splice(idx, 1, {
      ...DISPATCH_LIST[idx],
      status: '已接收',
      receiveTime: `${todayStr()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })
    ElMessage.success('已标记接收（原型演示，刷新后还原）')
  }
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
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">隐患派单记录</h1>
        <p class="page-desc">
          派单本质是把隐患转成工单（模块 11），本页只记录「谁、什么时候、把哪条隐患派给了谁、结果如何」。一条隐患可多次派单，派单失败须留原因便于排查规则问题。
        </p>
      </div>
      <el-button type="primary" @click="openCreate">+ 手工派单</el-button>
    </div>

    <div class="stat-row">
      <div class="stat-card tone-primary">
        <div class="stat-label">派单总数</div>
        <div class="stat-value">{{ stats.total }}<span class="unit">条</span></div>
      </div>
      <div class="stat-card tone-primary">
        <div class="stat-label">自动派单</div>
        <div class="stat-value">{{ stats.auto }}<span class="unit">条</span></div>
        <div class="stat-hint-muted">占比 {{ stats.total ? Math.round((stats.auto / stats.total) * 100) : 0 }}%</div>
      </div>
      <div class="stat-card tone-warning">
        <div class="stat-label">待接收</div>
        <div class="stat-value">{{ stats.waiting }}<span class="unit">条</span></div>
      </div>
      <div class="stat-card tone-success">
        <div class="stat-label">已接收</div>
        <div class="stat-value">{{ stats.received }}<span class="unit">条</span></div>
        <div class="stat-hint-muted">接收率 {{ stats.rate }}%</div>
      </div>
      <div class="stat-card tone-danger">
        <div class="stat-label">失败 / 退回</div>
        <div class="stat-value">{{ stats.failed + stats.returned }}<span class="unit">条</span></div>
        <div v-if="stats.failed + stats.returned" class="stat-hint">
          失败 {{ stats.failed }} · 退回 {{ stats.returned }}
        </div>
      </div>
    </div>

    <div class="tab-card">
      <div class="toolbar">
        <div class="filters">
          <el-input v-model="keyword" placeholder="搜索派单编号 / 隐患编号 / 派单对象 / 工单号" clearable style="width: 280px" />
          <el-select v-model="filterMethod" placeholder="派单方式" clearable style="width: 120px">
            <el-option v-for="m in DISPATCH_METHODS" :key="m" :label="m" :value="m" />
          </el-select>
          <el-select v-model="filterTargetType" placeholder="对象类型" clearable style="width: 120px">
            <el-option v-for="t in DISPATCH_TARGET_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select v-model="filterLevel" placeholder="隐患等级" clearable style="width: 110px">
            <el-option label="重大" value="重大" />
            <el-option label="较大" value="较大" />
            <el-option label="一般" value="一般" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="派单状态" clearable style="width: 120px">
            <el-option v-for="s in DISPATCH_STATUS" :key="s" :label="s" :value="s" />
          </el-select>
        </div>
        <span class="count-text">{{ tableData.length }} 条</span>
      </div>

      <el-table :data="tableData" stripe border size="small" style="width: 100%">
        <el-table-column prop="id" label="派单编号" width="135" />
        <el-table-column prop="hazardId" label="关联隐患" width="135" />
        <el-table-column prop="hazardDesc" label="隐患描述" min-width="230" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openDetail(row)">{{ row.hazardDesc }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="80" align="center">
          <template #default="{ row }">
            <span class="level-pill" :style="{
              background: gradeOf(row.hazardLevel).color + '1A',
              color: gradeOf(row.hazardLevel).color,
              borderColor: gradeOf(row.hazardLevel).color + '55'
            }">
              <i :style="{ background: gradeOf(row.hazardLevel).color }"></i>{{ row.hazardLevel }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="工单号" width="160">
          <template #default="{ row }">
            <span v-if="row.workOrderNo" class="wo">{{ row.workOrderNo }}</span>
            <span v-else class="muted">未生成</span>
          </template>
        </el-table-column>
        <el-table-column prop="method" label="派单方式" width="95" align="center">
          <template #default="{ row }">
            <el-tag :type="row.method === '自动派单' ? 'primary' : 'info'" size="small" effect="plain">
              {{ row.method }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetType" label="对象类型" width="95" align="center" />
        <el-table-column prop="target" label="派单对象" width="150" show-overflow-tooltip />
        <el-table-column prop="dispatchTime" label="派单时间" width="135" sortable />
        <el-table-column label="状态" width="95" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag[row.status]" size="small" effect="light">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="接收时间" width="135">
          <template #default="{ row }">{{ row.receiveTime || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === '待接收'"
              link type="success" size="small"
              @click="markReceived(row)"
            >接收</el-button>
            <el-button
              v-if="row.status === '派单失败' || row.status === '已退回'"
              link type="warning" size="small"
              @click="reDispatch(row)"
            >重派</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有匹配的派单记录" :image-size="80" />
        </template>
      </el-table>
    </div>

    <!-- 手工派单 -->
    <el-dialog v-model="dialogVisible" title="手工派单" width="680px" destroy-on-close>
      <el-form :model="form" label-width="110px">
        <el-form-item label="关联隐患" required>
          <el-select v-model="form.hazardId" filterable style="width: 100%" placeholder="选择待派单的隐患">
            <el-option v-for="h in hazardOptions" :key="h.value" :label="h.label" :value="h.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedHazard" label="隐患信息">
          <div class="readonly-box">
            <div>{{ selectedHazard.desc }}</div>
            <div class="readonly-meta">
              当前状态：{{ selectedHazard.status }}｜整改期限：{{ selectedHazard.deadline }}｜
              等级：
              <span :style="{ color: gradeOf(selectedHazard.level).color, fontWeight: 600 }">
                {{ selectedHazard.level }}
              </span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="派单方式">
          <el-radio-group v-model="form.method">
            <el-radio value="自动派单">自动派单</el-radio>
            <el-radio value="手工派单">手工派单</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="派单对象类型" required>
          <el-select v-model="form.targetType" style="width: 100%" @change="form.target = ''">
            <el-option v-for="t in DISPATCH_TARGET_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="派单对象" required>
          <el-select v-model="form.target" filterable style="width: 100%">
            <el-option v-for="t in targetOptions" :key="t" :label="t" :value="t" />
          </el-select>
          <div class="field-hint">按对象类型联动；选班组则取班组长</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认派单</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="派单记录详情" size="600px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.hazardDesc }}</div>
        <div class="detail-sub">
          <el-tag :type="statusTag[detailRow.status]" size="small" effect="light">{{ detailRow.status }}</el-tag>
          <el-tag :type="detailRow.method === '自动派单' ? 'primary' : 'info'" size="small" effect="plain">
            {{ detailRow.method }}
          </el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="关联隐患">{{ detailRow.hazardId }}</el-descriptions-item>
          <el-descriptions-item label="隐患等级">{{ detailRow.hazardLevel }}</el-descriptions-item>
          <el-descriptions-item label="隐患当前状态">{{ detailRow.hazardStatus }}</el-descriptions-item>
          <el-descriptions-item label="工单号">{{ detailRow.workOrderNo || '未生成' }}</el-descriptions-item>
          <el-descriptions-item label="派单方式">{{ detailRow.method }}</el-descriptions-item>
          <el-descriptions-item label="派单时间">{{ detailRow.dispatchTime }}</el-descriptions-item>
          <el-descriptions-item label="派单对象类型">{{ detailRow.targetType }}</el-descriptions-item>
          <el-descriptions-item label="派单对象">{{ detailRow.target }}</el-descriptions-item>
          <el-descriptions-item label="接收时间">{{ detailRow.receiveTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="处理人">{{ detailRow.handler || '—' }}</el-descriptions-item>
          <el-descriptions-item label="命中规则" :span="2">{{ detailRow.rule || '手工派单无规则' }}</el-descriptions-item>
          <el-descriptions-item label="失败 / 退回原因" :span="2">
            <span :class="detailRow.failReason ? 'danger-text' : ''">
              {{ detailRow.failReason || '—' }}
            </span>
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

        <div v-if="detailRow.status === '派单失败'" class="alert-box danger">
          派单失败须排查规则或责任人状态问题，修正后重新派单。失败记录保留，作为派单规则优化的依据。
        </div>
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
  max-width: 880px;
  font-size: var(--ez-font-size-caption);
  color: var(--ez-text-secondary);
  line-height: 1.7;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
}
.tone-primary::before { background: var(--ez-primary); }
.tone-success::before { background: var(--ez-success); }
.tone-warning::before { background: var(--ez-warning); }
.tone-danger::before { background: var(--ez-danger); }
.stat-label { font-size: var(--ez-font-size-caption); color: var(--ez-text-secondary); margin-bottom: 6px; }
.stat-value { font-size: 24px; font-weight: 600; color: var(--ez-text); line-height: 1.1; font-variant-numeric: tabular-nums; }
.unit { font-size: 12px; font-weight: 400; color: var(--ez-text-muted); margin-left: 3px; }
.stat-hint { margin-top: 4px; font-size: 11px; color: var(--ez-danger); }
.stat-hint-muted { margin-top: 4px; font-size: 11px; color: var(--ez-text-muted); }

.tab-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 14px 16px 16px;
}

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
.level-pill i { width: 5px; height: 5px; border-radius: 50%; }
.wo { font-size: 11px; color: var(--ez-primary); font-variant-numeric: tabular-nums; }
.muted { color: var(--ez-text-muted); font-size: 12px; }

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
.field-hint { flex: 1 1 100%; margin-top: 4px; font-size: 11px; color: var(--ez-text-muted); }

.detail-title { font-size: 15px; font-weight: 600; color: var(--ez-text); line-height: 1.6; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; flex-wrap: wrap; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.drawer-section-title { margin: 20px 0 10px; font-size: 13px; font-weight: 600; color: var(--ez-text); }
.danger-text { color: var(--ez-danger); font-weight: 600; }

.alert-box {
  margin-top: 16px;
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

@media (max-width: 1280px) {
  .stat-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
/* ===== 页面骨架：主卡片撑满可视区 ===== */
.page-head,
.stat-row {
  flex: none;
}
.tab-card {
  flex: 1 0 auto;
  min-height: 300px;
}
</style>
