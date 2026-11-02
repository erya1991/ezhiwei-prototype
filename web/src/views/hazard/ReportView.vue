<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  BUILDINGS, HAZARD_SYSTEMS, HAZARD_LEVELS, TYPE_LIST,
  GRADE_STANDARDS, gradeOf, HAZARD_LIST, autoDeadline, todayStr
} from '../../data/hazard'

const router = useRouter()

/** 当前登录人（原型固定，实际取登录态） */
const CURRENT_USER = '张安'

const formRef = ref(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    desc: '', location: '', building: '住院楼', system: '中心供氧系统',
    typeId: '', level: '一般', clue: '', photos: [], remark: ''
  }
}

const rules = {
  desc: [
    { required: true, message: '请描述隐患情况', trigger: 'blur' },
    { min: 10, message: '描述不少于 10 个字，便于受理人判断', trigger: 'blur' }
  ],
  location: [{ required: true, message: '请填写隐患位置', trigger: 'blur' }],
  building: [{ required: true, message: '请选择所在楼栋', trigger: 'change' }],
  system: [{ required: true, message: '请选择所属专业系统', trigger: 'change' }],
  typeId: [{ required: true, message: '请选择隐患类型', trigger: 'change' }],
  level: [{ required: true, message: '请选择隐患等级', trigger: 'change' }]
}

const selectedType = computed(() => TYPE_LIST.find((t) => t.id === form.value.typeId))

/** 选类型自动带出默认等级 */
function onTypeChange() {
  if (selectedType.value) {
    form.value.level = selectedType.value.defaultLevel
  }
}

/** 编号预览 */
const nextId = computed(() => {
  const d = todayStr().replace(/-/g, '')
  const prefix = `YH-${d}-`
  const maxNo = HAZARD_LIST
    .filter((h) => h.id.startsWith(prefix))
    .reduce((m, h) => Math.max(m, Number(h.id.slice(-4)) || 0), 0)
  return prefix + String(maxNo + 1).padStart(4, '0')
})

/** 按等级预估整改期限 */
const previewDeadline = computed(() => autoDeadline(form.value.level, todayStr()))

const levelGuide = computed(() => gradeOf(form.value.level))

const typeOptions = computed(() =>
  TYPE_LIST.filter((t) => t.enabled === '启用')
    .filter((t) => !t.systems.length || t.systems.includes(form.value.system) || form.value.system === '其他')
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
)

// 照片（原型模拟）
function mockAddPhoto() {
  if (form.value.photos.length >= 9) {
    ElMessage.warning('最多上传 9 张照片')
    return
  }
  const n = form.value.photos.length + 1
  form.value.photos.push(`现场照片${n}.jpg`)
  ElMessage.success('已添加（原型演示，实际支持拍照与相册选择）')
}

function removePhoto(i) {
  form.value.photos.splice(i, 1)
}

// 最近上报
const recent = computed(() =>
  HAZARD_LIST.slice()
    .sort((a, b) => (a.reportTime < b.reportTime ? 1 : -1))
    .slice(0, 6)
)

const statusTag = {
  待受理: 'warning', 待派单: 'warning', 整改中: 'primary',
  待验收: 'primary', 已关闭: 'success', 已驳回: 'danger'
}

// 提交
function submitForm() {
  if (!formRef.value) return
  formRef.value.validate((valid) => {
    if (!valid) return
    const t = TYPE_LIST.find((x) => x.id === form.value.typeId)
    const now = new Date()
    const ts = `${todayStr()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const id = nextId.value
    HAZARD_LIST.unshift({
      id,
      desc: form.value.desc,
      location: form.value.location,
      building: form.value.building,
      system: form.value.system,
      typeId: form.value.typeId,
      typeName: t ? t.name : '',
      level: form.value.level,
      status: '待受理',
      reporter: CURRENT_USER,
      reportTime: ts,
      method: '手工上报',
      source: 'PC',
      submitStatus: '已提交',
      photos: [...form.value.photos],
      clue: form.value.clue,
      subjectName: '', ownerName: '',
      dispatchStatus: '', workOrderNo: '',
      deadline: previewDeadline.value,
      fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
      qrCode: 'QR-' + id.slice(-4),
      remark: form.value.remark
    })
    ElMessageBox.alert(
      `隐患编号 ${id} 已生成，状态为「待受理」。\n整改期限按 ${form.value.level}隐患自动设为 ${previewDeadline.value}（${levelGuide.value.deadlineDays} 天）。`,
      '上报成功',
      { confirmButtonText: '去隐患总览查看', type: 'success' }
    ).then(() => {
      router.push('/hazard/overview')
    }).catch(() => {})
    form.value = emptyForm()
  })
}

function saveDraft() {
  ElMessage.success('草稿已保存（原型演示，刷新后还原），草稿仅本人可见')
}

function resetForm() {
  form.value = emptyForm()
  if (formRef.value) formRef.value.clearValidate()
}

function goOverview() {
  router.push('/hazard/overview')
}
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">AI随手拍 · 隐患上报</h1>
        <p class="page-desc">
          一期只做非 AI 人工上报，AI 拍照识别与识别结果人工核实本期未启用。小程序为主入口，PC 端同表单。提交后自动生成隐患编号并进入隐患台账「待受理」。
        </p>
      </div>
      <el-button @click="goOverview">查看隐患总览</el-button>
    </div>

    <div class="layout">
      <!-- 左侧表单 -->
      <div class="form-card">
        <div class="card-head">
          <span class="card-title">上报内容</span>
          <span class="card-code">编号预览：{{ nextId }}</span>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" label-position="right">
          <el-form-item label="隐患描述" prop="desc">
            <el-input
              v-model="form.desc"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              placeholder="哪里有问题、什么表现。例：3F 走廊设备带氧气终端接口处有轻微漏气声"
            />
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="所在楼栋" prop="building">
                <el-select v-model="form.building" style="width: 100%">
                  <el-option v-for="b in BUILDINGS" :key="b" :label="b" :value="b" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="隐患位置" prop="location">
                <el-input v-model="form.location" maxlength="100" placeholder="楼栋-楼层-位置，如 住院楼 3F 东侧走廊" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="专业系统" prop="system">
                <el-select v-model="form.system" style="width: 100%">
                  <el-option v-for="s in HAZARD_SYSTEMS" :key="s" :label="s" :value="s" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="隐患类型" prop="typeId">
                <el-select
                  v-model="form.typeId"
                  filterable
                  style="width: 100%"
                  placeholder="支持搜索"
                  @change="onTypeChange"
                >
                  <el-option
                    v-for="t in typeOptions"
                    :key="t.id"
                    :label="`${t.name}（${t.category}）`"
                    :value="t.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="隐患等级" prop="level">
            <el-radio-group v-model="form.level">
              <el-radio v-for="l in HAZARD_LEVELS" :key="l" :value="l">
                <span class="level-radio">
                  <i :style="{ background: gradeOf(l).color }"></i>{{ l }}
                </span>
              </el-radio>
            </el-radio-group>
            <div class="field-hint">
              {{ levelGuide.condition }}
              <span class="deadline-hint">
                整改时限 {{ levelGuide.deadlineDays }} 天 → 期限 {{ previewDeadline }}
              </span>
            </div>
          </el-form-item>

          <el-form-item label="责任线索">
            <el-input
              v-model="form.clue"
              maxlength="100"
              placeholder="可能责任方或责任人，如「第三方维保」「液氧站值班」，供派单参考"
            />
          </el-form-item>

          <el-form-item label="现场照片">
            <div class="photo-area">
              <div v-for="(p, i) in form.photos" :key="i" class="photo-item">
                <span class="photo-name">{{ p }}</span>
                <el-button link type="danger" size="small" @click="removePhoto(i)">删除</el-button>
              </div>
              <el-button v-if="form.photos.length < 9" size="small" @click="mockAddPhoto">
                + 添加照片（{{ form.photos.length }}/9）
              </el-button>
              <div class="field-hint">支持拍照与相册，单张不超过 10MB；PC 端支持拖拽</div>
            </div>
          </el-form-item>

          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
          </el-form-item>

          <el-form-item label="上报人">
            <div class="readonly-line">
              <el-tag size="small" effect="plain">{{ CURRENT_USER }}</el-tag>
              <span class="readonly-hint">取当前登录人，不可修改</span>
            </div>
          </el-form-item>

          <el-form-item label="上报方式">
            <div class="readonly-line">
              <el-tag size="small" type="success" effect="plain">手工上报</el-tag>
              <el-tag size="small" type="info" effect="plain">AI 识别（预留未启用）</el-tag>
              <span class="readonly-hint">上报来源：PC</span>
            </div>
          </el-form-item>

          <div class="form-actions">
            <el-button @click="resetForm">重置</el-button>
            <el-button @click="saveDraft">存草稿</el-button>
            <el-button type="primary" @click="submitForm">提交上报</el-button>
          </div>
        </el-form>
      </div>

      <!-- 右侧辅助 -->
      <div class="side-col">
        <div class="side-card">
          <div class="side-title">隐患等级判定</div>
          <div v-for="g in GRADE_STANDARDS" :key="g.level" class="grade-item">
            <div class="grade-head">
              <span class="grade-dot" :style="{ background: g.color }"></span>
              <span class="grade-name">{{ g.name }}</span>
              <span class="grade-gongwei">{{ g.gongwei }}</span>
              <span class="grade-days">{{ g.deadlineDays }} 天</span>
            </div>
            <div class="grade-cond">{{ g.condition }}</div>
          </div>
        </div>

        <div class="side-card">
          <div class="side-title">最近上报</div>
          <div v-if="!recent.length" class="empty-text">暂无上报记录</div>
          <div v-for="h in recent" :key="h.id" class="recent-item" @click="goOverview">
            <div class="recent-top">
              <span class="recent-level" :style="{
                background: gradeOf(h.level).color + '1A',
                color: gradeOf(h.level).color
              }">{{ h.level }}</span>
              <span class="recent-type">{{ h.typeName }}</span>
              <el-tag :type="statusTag[h.status]" size="small" effect="light">{{ h.status }}</el-tag>
            </div>
            <div class="recent-desc">{{ h.desc }}</div>
            <div class="recent-meta">{{ h.reporter }} · {{ h.reportTime }} · {{ h.building }}</div>
          </div>
        </div>
      </div>
    </div>
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
  max-width: 820px;
  font-size: var(--ez-font-size-caption);
  color: var(--ez-text-secondary);
  line-height: 1.7;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 16px;
  align-items: stretch;
}

.form-card,
.side-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 16px 20px 18px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--ez-border-light);
}
.card-title { font-size: 14px; font-weight: 600; color: var(--ez-text); }
.card-code { font-size: 11px; color: var(--ez-text-muted); font-variant-numeric: tabular-nums; }

.level-radio { display: inline-flex; align-items: center; gap: 5px; }
.level-radio i { width: 8px; height: 8px; border-radius: 50%; }

.field-hint {
  flex: 1 1 100%;
  margin-top: 4px;
  font-size: 11px;
  color: var(--ez-text-muted);
  line-height: 1.6;
}
.deadline-hint { color: var(--ez-warning); font-weight: 600; margin-left: 6px; }

.photo-area { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.photo-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  background: var(--ez-fill-light);
  border-radius: 4px;
  font-size: 11px;
}
.photo-name { color: var(--ez-text-secondary); }

.readonly-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.readonly-hint { font-size: 11px; color: var(--ez-text-muted); }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--ez-border-light);
}

.side-col { display: flex; flex-direction: column; gap: 16px; }
.side-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
  margin-bottom: 12px;
}
.grade-item { margin-bottom: 12px; }
.grade-item:last-child { margin-bottom: 0; }
.grade-head { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.grade-dot { width: 8px; height: 8px; border-radius: 2px; }
.grade-name { font-size: 12px; font-weight: 600; color: var(--ez-text); }
.grade-gongwei { font-size: 10px; color: var(--ez-text-muted); }
.grade-days {
  margin-left: auto;
  font-size: 10px;
  color: var(--ez-primary);
  background: var(--ez-primary-bg);
  padding: 1px 6px;
  border-radius: 8px;
}
.grade-cond { font-size: 11px; color: var(--ez-text-secondary); line-height: 1.6; }

.recent-item {
  padding: 8px 0;
  border-bottom: 1px dashed var(--ez-border-light);
  cursor: pointer;
}
.recent-item:last-child { border-bottom: none; }
.recent-item:hover .recent-desc { color: var(--ez-primary); }
.recent-top { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.recent-level {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
}
.recent-type { font-size: 11px; color: var(--ez-text-secondary); }
.recent-desc {
  font-size: 12px;
  color: var(--ez-text);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.15s;
}
.recent-meta { font-size: 10px; color: var(--ez-text-muted); margin-top: 3px; }
.empty-text { font-size: 12px; color: var(--ez-text-muted); }

@media (max-width: 1200px) {
  .layout { grid-template-columns: 1fr; }
}
/* ===== 页面骨架：主卡片撑满可视区 ===== */
.page-head,
.stat-row {
  flex: none;
}
.layout {
  flex: 1 0 auto;
  min-height: 300px;
}
</style>
