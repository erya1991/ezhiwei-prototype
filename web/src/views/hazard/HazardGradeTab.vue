<script setup>
import { GRADE_STANDARDS, HAZARD_LIST } from '../../data/hazard'

const countOf = (name) => HAZARD_LIST.filter((h) => h.level === name).length
const openOf = (name) =>
  HAZARD_LIST.filter((h) => h.level === name && h.status !== '已关闭' && h.status !== '已驳回').length
</script>

<template>
  <div class="tab-body">
    <div class="std-note">
      隐患等级按 Ⅰ / Ⅱ / Ⅲ 三类（对应重大 / 较大 / 一般），与风险等级（LEC 五级）是两套口径，不能混用。等级决定整改时限，时限直接驱动整改期限与逾期判定。
    </div>

    <el-table :data="GRADE_STANDARDS" border style="width: 100%" size="small">
      <el-table-column label="等级" width="90" align="center">
        <template #default="{ row }">
          <span class="lv-badge" :style="{ background: row.color }">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="医工委类别" width="105" align="center">
        <template #default="{ row }">
          <span class="gongwei">{{ row.gongwei }}</span>
        </template>
      </el-table-column>
      <el-table-column label="色标" width="85" align="center">
        <template #default="{ row }">
          <span class="color-cell">
            <i :style="{ background: row.color }"></i>{{ row.colorName }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="color" label="色值" width="100" />
      <el-table-column prop="condition" label="判定条件" min-width="300" show-overflow-tooltip />
      <el-table-column label="整改时限" width="100" align="center">
        <template #default="{ row }">
          <span class="days">{{ row.deadlineDays }} 天</span>
        </template>
      </el-table-column>
      <el-table-column prop="acceptRequire" label="验收要求" min-width="230" show-overflow-tooltip />
      <el-table-column label="需上报" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.needReport === '是' ? 'danger' : 'info'" size="small" effect="plain">
            {{ row.needReport }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="台账 / 未闭环" width="110" align="center">
        <template #default="{ row }">
          <span class="cnt">{{ countOf(row.name) }}</span>
          <span class="cnt-sep">/</span>
          <span class="cnt-open">{{ openOf(row.name) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="extra-row">
      <div class="extra-card">
        <div class="extra-title">整改期限自动计算规则</div>
        <ul class="extra-list">
          <li>整改期限 = 上报日期 + 对应等级整改时限（重大 1 天 / 较大 7 天 / 一般 15 天）</li>
          <li>受理时可手工调整期限，但调整需留痕</li>
          <li>剩余天数 = 整改期限 − 今天；负数即逾期</li>
          <li>逾期天数：已完成按「完成日期 − 期限」算；未完成按「今天 − 期限」算</li>
        </ul>
      </div>
      <div class="extra-card">
        <div class="extra-title">等级与验收的关系</div>
        <ul class="extra-list">
          <li>重大隐患：需第三方复验 + 院方安全负责人联合验收，且须上报院方及监管部门</li>
          <li>较大隐患：需安全负责人验收</li>
          <li>一般隐患：由部门负责人验收</li>
          <li>验收不合格 → 隐患退回「整改中」，累计不合格次数</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-body { padding-top: 4px; }

.std-note {
  padding: 9px 14px;
  background: var(--ez-primary-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.lv-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.gongwei {
  font-size: 12px;
  font-weight: 600;
  color: var(--ez-text);
}
.color-cell { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }
.color-cell i {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.days { font-weight: 600; color: var(--ez-primary); font-variant-numeric: tabular-nums; }
.cnt { font-weight: 600; color: var(--ez-text); font-variant-numeric: tabular-nums; }
.cnt-sep { color: var(--ez-text-muted); margin: 0 4px; }
.cnt-open { font-weight: 700; color: var(--ez-danger); font-variant-numeric: tabular-nums; }

.extra-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}
.extra-card {
  padding: 14px 16px;
  background: var(--ez-fill-light);
  border-radius: 8px;
}
.extra-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-text);
  margin-bottom: 8px;
}
.extra-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.9;
}

@media (max-width: 1100px) {
  .extra-row { grid-template-columns: 1fr; }
}
</style>
