<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { GRADE_STANDARDS, HAZARD_LIST, gradeOf } from '../../data/hazard'

const router = useRouter()

const statusTag = {
  待受理: 'warning', 待派单: 'warning', 整改中: 'primary',
  待验收: 'primary', 已关闭: 'success', 已驳回: 'danger'
}

const recent = computed(() =>
  HAZARD_LIST.slice()
    .sort((a, b) => (a.reportTime < b.reportTime ? 1 : -1))
    .slice(0, 6)
)

function goManual() {
  router.push('/hazard/report/manual')
}

function goOverview() {
  router.push('/hazard/overview')
}
</script>

<template>
  <div class="page-wrap">
    <div class="page-head">
      <div>
        <h1 class="page-title">AI随手拍</h1>
        <p class="page-desc">
          隐患上报入口。一期开放「手动上报」，填写隐患信息后自动生成隐患编号并进入隐患台账「待受理」；「上传照片 · AI 识别」为二期能力，本期暂未开放。
        </p>
      </div>
      <el-button @click="goOverview">查看隐患总览</el-button>
    </div>

    <div class="entry-layout">
      <!-- 左侧：两个上报入口 -->
      <div class="entry-col">
        <div class="entry-card manual" @click="goManual">
          <div class="entry-icon tone-manual">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </div>
          <div class="entry-body">
            <div class="entry-title">
              手动上报
              <span class="entry-badge open">已开放</span>
            </div>
            <div class="entry-desc">
              填写隐患描述、位置、专业系统与隐患类型，选定等级后提交。系统自动生成隐患编号、按等级推算整改期限，并推送至台账「待受理」。
            </div>
            <ul class="entry-points">
              <li>适用：日常巡检、现场发现、他人反馈</li>
              <li>必填：描述 · 楼栋 · 位置 · 系统 · 类型 · 等级</li>
              <li>提交后由安全管理员受理并派单</li>
            </ul>
          </div>
          <div class="entry-action">开始上报<span class="arrow">→</span></div>
        </div>

        <div class="entry-card ai disabled">
          <div class="entry-icon tone-ai">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.3 3.7h5.4a1 1 0 0 1 .83.45l.94 1.4A1 1 0 0 0 17.3 6h1.2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5Z" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
          </div>
          <div class="entry-body">
            <div class="entry-title">
              上传照片 · AI 识别
              <span class="entry-badge pending">暂未开放</span>
            </div>
            <div class="entry-desc">
              拍照上传后由 AI 识别隐患类型与等级，人工核实确认后提交。该能力依赖图像识别模型与现场拍照规范，本期未启用。
            </div>
            <ul class="entry-points">
              <li>计划能力：照片识别 · 自动填单 · 人工复核</li>
              <li>依赖：AI 识别模型接入、拍照规范与样本积累</li>
              <li>上线时间：待二期排期</li>
            </ul>
          </div>
          <div class="entry-action muted">暂未开放</div>
        </div>
      </div>

      <!-- 右侧：等级判定 + 最近上报 -->
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

.entry-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 16px;
  align-items: stretch;
  flex: 1 0 auto;
  min-height: 380px;
}

.entry-col { display: flex; flex-direction: column; gap: 16px; }

.entry-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
  padding: 20px 22px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  transition: all 0.18s ease;
}
.entry-card.manual {
  cursor: pointer;
  flex: 1 1 auto;
}
.entry-card.manual:hover {
  border-color: var(--ez-primary);
  box-shadow: 0 6px 20px rgba(33, 115, 216, 0.12);
  transform: translateY(-1px);
}
.entry-card.disabled {
  flex: 1 1 auto;
  opacity: 0.62;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.58);
}

.entry-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tone-manual { background: var(--ez-primary-bg); color: var(--ez-primary); }
.tone-ai { background: rgba(120, 130, 145, 0.14); color: #6b7a89; }

.entry-body { flex: 1; min-width: 0; }
.entry-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ez-text);
  margin-bottom: 6px;
}
.entry-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 8px;
}
.entry-badge.open { color: var(--ez-primary); background: var(--ez-primary-bg); }
.entry-badge.pending { color: #6b7a89; background: rgba(120, 130, 145, 0.16); }

.entry-desc {
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.75;
}
.entry-points {
  margin: 10px 0 0;
  padding-left: 16px;
  font-size: 11px;
  color: var(--ez-text-muted);
  line-height: 1.9;
}

.entry-action {
  align-self: center;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--ez-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}
.entry-action .arrow { transition: transform 0.18s; }
.entry-card.manual:hover .entry-action .arrow { transform: translateX(3px); }
.entry-action.muted { color: var(--ez-text-muted); font-weight: 500; }

.side-col { display: flex; flex-direction: column; gap: 16px; }
.side-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  padding: 16px 20px 18px;
}
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
  .entry-layout { grid-template-columns: 1fr; }
}
</style>
