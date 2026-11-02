<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  INSPECT_LIST, INSPECT_TYPES, INSPECT_OBJECT_TYPES, HAZARD_LEVELS,
  gradeOf, hazardOf
} from '../../data/hazard'

const keyword = ref('')
const filterType = ref('')
const filterObjectType = ref('')
const filterInspector = ref('')
const viewMode = ref('card')

const inspectors = computed(() => [...new Set(INSPECT_LIST.map((i) => i.inspector))])

const tableData = computed(() => {
  let list = INSPECT_LIST.slice()
  if (filterType.value) list = list.filter((i) => i.type === filterType.value)
  if (filterObjectType.value) list = list.filter((i) => i.objectType === filterObjectType.value)
  if (filterInspector.value) list = list.filter((i) => i.inspector === filterInspector.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(
      (i) => i.id.includes(k) || i.objectName.includes(k) || i.location.includes(k) ||
             i.inspector.includes(k)
    )
  }
  return list.sort((a, b) => (a.inspectTime < b.inspectTime ? 1 : -1))
})

const totalFound = computed(() => tableData.value.reduce((s, i) => s + (i.foundCount || 0), 0))

function hazardsOf(inspect) {
  return (inspect.hazards || []).map((id) => hazardOf(id)).filter(Boolean)
}

const typeTag = {
  日常排查: 'primary', 专项排查: 'warning', 节前排查: 'danger',
  季节性排查: 'success', 事故后排查: 'danger'
}

// ---- 详情 ----
const drawerVisible = ref(false)
const detailRow = ref(null)
function openDetail(row) {
  detailRow.value = row
  drawerVisible.value = true
}
const detailHazards = computed(() =>
  detailRow.value ? hazardsOf(detailRow.value) : []
)

// ---- 新建排查名片 ----
const dialogVisible = ref(false)
const form = ref(emptyForm())
function emptyForm() {
  return {
    type: '日常排查', objectType: '风险点', objectName: '', location: '',
    inspector: '', inspectTime: '', itemCount: 0, remark: ''
  }
}
function openCreate() {
  form.value = emptyForm()
  dialogVisible.value = true
}
function submitForm() {
  if (!form.value.objectName) { ElMessage.warning('请填写排查对象'); return }
  if (!form.value.inspector) { ElMessage.warning('请填写排查人'); return }
  if (!form.value.inspectTime) { ElMessage.warning('请选择排查时间'); return }
  const dstr = form.value.inspectTime.slice(0, 10).replace(/-/g, '')
  const maxNo = INSPECT_LIST
    .filter((i) => i.id.startsWith(`PC-${dstr}-`))
    .reduce((m, i) => Math.max(m, Number(i.id.slice(-4)) || 0), 0)
  INSPECT_LIST.unshift({
    id: `PC-${dstr}-` + String(maxNo + 1).padStart(4, '0'),
    type: form.value.type,
    objectType: form.value.objectType,
    objectId: '',
    objectName: form.value.objectName,
    location: form.value.location,
    inspector: form.value.inspector,
    inspectTime: form.value.inspectTime,
    itemCount: form.value.itemCount,
    foundCount: 0,
    maxLevel: '—',
    conclusion: '未发现隐患',
    photos: [],
    qrCode: 'QR-NEW',
    hazards: [],
    status: '已提交',
    remark: form.value.remark
  })
  ElMessage.success('排查名片已创建（原型演示，刷新后还原）')
  dialogVisible.value = false
}
</script>

<template>
  <div class="tab-body">
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索排查编号 / 对象 / 位置 / 排查人" clearable style="width: 260px" />
        <el-select v-model="filterType" placeholder="排查类型" clearable style="width: 120px">
          <el-option v-for="t in INSPECT_TYPES" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="filterObjectType" placeholder="对象类型" clearable style="width: 120px">
          <el-option v-for="t in INSPECT_OBJECT_TYPES" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="filterInspector" placeholder="排查人" clearable style="width: 110px">
          <el-option v-for="i in inspectors" :key="i" :label="i" :value="i" />
        </el-select>
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="card">名片</el-radio-button>
          <el-radio-button value="table">列表</el-radio-button>
        </el-radio-group>
      </div>
      <div class="right-ops">
        <span class="count-text">{{ tableData.length }} 次排查 · 发现 {{ totalFound }} 条隐患</span>
        <el-button type="primary" size="small" @click="openCreate">+ 新建排查名片</el-button>
      </div>
    </div>

    <!-- 名片视图 -->
    <div v-if="viewMode === 'card'" class="card-grid">
      <div v-for="row in tableData" :key="row.id" class="inspect-card" @click="openDetail(row)">
        <div class="ic-head">
          <el-tag :type="typeTag[row.type]" size="small" effect="light">{{ row.type }}</el-tag>
          <span class="ic-code">{{ row.id }}</span>
        </div>
        <div class="ic-title">{{ row.objectName }}</div>
        <div class="ic-loc">{{ row.location || '未填写位置' }}</div>

        <div class="ic-meta">
          <span class="meta-item"><i class="dot"></i>{{ row.inspector }}</span>
          <span class="meta-item">{{ row.inspectTime }}</span>
        </div>

        <div class="ic-stats">
          <div class="ic-stat">
            <span class="ic-stat-num">{{ row.itemCount }}</span>
            <span class="ic-stat-label">排查项</span>
          </div>
          <div class="ic-stat">
            <span class="ic-stat-num" :class="row.foundCount ? 'warn' : ''">{{ row.foundCount }}</span>
            <span class="ic-stat-label">发现隐患</span>
          </div>
          <div class="ic-stat">
            <span
              v-if="row.foundCount"
              class="ic-stat-num"
              :style="{ color: gradeOf(row.maxLevel).color }"
            >{{ row.maxLevel }}</span>
            <span v-else class="ic-stat-num muted-num">—</span>
            <span class="ic-stat-label">最高等级</span>
          </div>
        </div>

        <div v-if="(row.hazards || []).length" class="ic-hazards">
          <span
            v-for="hid in row.hazards"
            :key="hid"
            class="hazard-chip"
          >{{ hid }}</span>
        </div>
        <div v-else class="ic-no-hazard">本次排查未发现隐患</div>
      </div>
      <el-empty v-if="!tableData.length" description="没有匹配的排查名片" :image-size="80" />
    </div>

    <!-- 列表视图 -->
    <el-table v-else :data="tableData" stripe border size="small" style="width: 100%">
      <el-table-column prop="id" label="排查编号" width="140" />
      <el-table-column prop="type" label="排查类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="typeTag[row.type]" size="small" effect="light">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="objectType" label="对象类型" width="95" align="center" />
      <el-table-column prop="objectName" label="排查对象" width="130" />
      <el-table-column prop="location" label="位置" width="160" show-overflow-tooltip />
      <el-table-column prop="inspector" label="排查人" width="85" />
      <el-table-column prop="inspectTime" label="排查时间" width="135" sortable />
      <el-table-column prop="itemCount" label="排查项" width="75" align="center" />
      <el-table-column label="发现隐患" width="85" align="center">
        <template #default="{ row }">
          <span :class="row.foundCount ? 'found-num' : 'muted'">{{ row.foundCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最高等级" width="95" align="center">
        <template #default="{ row }">
          <span
            v-if="row.foundCount"
            class="level-pill"
            :style="{
              background: gradeOf(row.maxLevel).color + '1A',
              color: gradeOf(row.maxLevel).color,
              borderColor: gradeOf(row.maxLevel).color + '55'
            }"
          >
            <i :style="{ background: gradeOf(row.maxLevel).color }"></i>{{ row.maxLevel }}
          </span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="conclusion" label="排查结论" width="105" />
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="没有匹配的排查名片" :image-size="80" />
      </template>
    </el-table>

    <!-- 详情 -->
    <el-drawer v-model="drawerVisible" title="排查名片" size="700px">
      <template v-if="detailRow">
        <div class="detail-title">{{ detailRow.objectName }}</div>
        <div class="detail-sub">
          <el-tag :type="typeTag[detailRow.type]" size="small" effect="light">{{ detailRow.type }}</el-tag>
          <el-tag size="small" effect="plain" type="info">{{ detailRow.objectType }}</el-tag>
          <span class="detail-code">{{ detailRow.id }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="排查对象">{{ detailRow.objectName }}</el-descriptions-item>
          <el-descriptions-item label="对象类型">{{ detailRow.objectType }}</el-descriptions-item>
          <el-descriptions-item label="位置" :span="2">{{ detailRow.location || '—' }}</el-descriptions-item>
          <el-descriptions-item label="排查人">{{ detailRow.inspector }}</el-descriptions-item>
          <el-descriptions-item label="排查时间">{{ detailRow.inspectTime }}</el-descriptions-item>
          <el-descriptions-item label="排查项数">{{ detailRow.itemCount }}</el-descriptions-item>
          <el-descriptions-item label="发现隐患">{{ detailRow.foundCount }}</el-descriptions-item>
          <el-descriptions-item label="最高等级">{{ detailRow.foundCount ? detailRow.maxLevel : '—' }}</el-descriptions-item>
          <el-descriptions-item label="排查结论">{{ detailRow.conclusion }}</el-descriptions-item>
          <el-descriptions-item label="提交状态">{{ detailRow.status }}</el-descriptions-item>
          <el-descriptions-item label="二维码编号">{{ detailRow.qrCode }}</el-descriptions-item>
          <el-descriptions-item label="现场照片" :span="2">
            <div v-if="(detailRow.photos || []).length" class="photo-list">
              <span v-for="p in detailRow.photos" :key="p" class="photo-chip">{{ p }}</span>
            </div>
            <span v-else class="muted">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-section-title">本次发现的隐患（{{ detailHazards.length }}）</div>
        <el-table v-if="detailHazards.length" :data="detailHazards" size="small" border>
          <el-table-column prop="id" label="隐患编号" width="135" />
          <el-table-column prop="desc" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column label="等级" width="85" align="center">
            <template #default="{ row }">
              <span class="level-pill" :style="{
                background: gradeOf(row.level).color + '1A',
                color: gradeOf(row.level).color,
                borderColor: gradeOf(row.level).color + '55'
              }">
                <i :style="{ background: gradeOf(row.level).color }"></i>{{ row.level }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="当前状态" width="90" align="center" />
        </el-table>
        <el-empty v-else description="本次排查未发现隐患" :image-size="60" />
      </template>
    </el-drawer>

    <!-- 新建 -->
    <el-dialog v-model="dialogVisible" title="新建排查名片" width="640px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="排查类型" required>
              <el-select v-model="form.type" style="width: 100%">
                <el-option v-for="t in INSPECT_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="对象类型" required>
              <el-select v-model="form.objectType" style="width: 100%">
                <el-option v-for="t in INSPECT_OBJECT_TYPES" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排查对象" required>
              <el-input v-model="form.objectName" placeholder="如 液氧储罐 / 住院楼 3F" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="位置">
              <el-input v-model="form.location" placeholder="楼栋-楼层-位置" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排查人" required>
              <el-input v-model="form.inspector" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排查时间" required>
              <el-date-picker
                v-model="form.inspectTime"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排查项数">
              <el-input-number v-model="form.itemCount" :min="0" :max="999" style="width: 100%" />
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
        <el-button type="primary" @click="submitForm">保存</el-button>
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
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.right-ops { display: flex; align-items: center; gap: 12px; }
.count-text { font-size: 12px; color: var(--ez-text-muted); }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.inspect-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.16s;
}
.inspect-card:hover {
  border-color: var(--ez-primary);
  box-shadow: 0 4px 16px rgba(33, 115, 216, 0.1);
  transform: translateY(-1px);
}
.ic-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ic-code { font-size: 10px; color: var(--ez-text-muted); font-variant-numeric: tabular-nums; }
.ic-title { font-size: 14px; font-weight: 600; color: var(--ez-text); margin-bottom: 3px; }
.ic-loc { font-size: 11px; color: var(--ez-text-secondary); margin-bottom: 10px; }
.ic-meta { display: flex; gap: 12px; font-size: 11px; color: var(--ez-text-muted); margin-bottom: 10px; }
.meta-item { display: inline-flex; align-items: center; gap: 4px; }
.meta-item .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--ez-primary); }

.ic-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--ez-border-light);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}
.ic-stat {
  background: var(--ez-fill-light);
  padding: 8px 6px;
  text-align: center;
}
.ic-stat-num {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--ez-text);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.ic-stat-num.warn { color: var(--ez-warning); }
.ic-stat-num.muted-num { color: var(--ez-text-muted); }
.ic-stat-label { font-size: 10px; color: var(--ez-text-muted); }

.ic-hazards { display: flex; gap: 5px; flex-wrap: wrap; }
.hazard-chip {
  font-size: 10px;
  padding: 2px 7px;
  background: var(--ez-primary-bg);
  color: var(--ez-primary);
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}
.ic-no-hazard { font-size: 11px; color: var(--ez-success); }

.found-num { font-weight: 700; color: var(--ez-warning); font-variant-numeric: tabular-nums; }
.muted { color: var(--ez-text-muted); font-size: 12px; }

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

.detail-title { font-size: 15px; font-weight: 600; color: var(--ez-text); }
.detail-sub { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; flex-wrap: wrap; }
.detail-code { font-size: 12px; color: var(--ez-text-muted); }
.drawer-section-title { margin: 20px 0 10px; font-size: 13px; font-weight: 600; color: var(--ez-text); }

.photo-list { display: flex; gap: 6px; flex-wrap: wrap; }
.photo-chip {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--ez-fill-light);
  border-radius: 4px;
  color: var(--ez-text-secondary);
}
</style>
