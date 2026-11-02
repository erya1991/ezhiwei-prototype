<script setup>
import { GRADE_STANDARDS, HAZARD_LIST } from '../../data/risk'

const countByLevel = (lv) => HAZARD_LIST.filter((h) => h.level === lv).length
</script>

<template>
  <div class="tab-body">
    <div class="std-note">
      一期固定使用 LEC 法五级分级标准（V1.0），由系统预置、只读不可改。判定边界归属规则：D 值恰好落在边界值时归低一级。
    </div>

    <el-table :data="GRADE_STANDARDS" border style="width: 100%" size="small">
      <el-table-column label="等级" width="70" align="center">
        <template #default="{ row }">
          <span class="lv-badge" :style="{ background: row.color }">{{ row.level }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="等级名称" width="110" />
      <el-table-column label="D 值区间" width="130" align="center">
        <template #default="{ row }">
          <span class="d-range">
            {{ row.level === 1 ? `< ${row.max + 1}` : (row.level === 5 ? `> ${row.min - 1}` : `${row.min} ~ ${row.max}`) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="色标" width="90" align="center">
        <template #default="{ row }">
          <span class="color-cell">
            <i :style="{ background: row.color }"></i>
            {{ row.colorName }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="color" label="色值" width="110" />
      <el-table-column prop="action" label="处置要求" min-width="240" />
      <el-table-column prop="controlLevel" label="管控层级" width="100" align="center" />
      <el-table-column label="当前危险源" width="110" align="center">
        <template #default="{ row }">
          <span class="num">{{ countByLevel(row.level) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="extra-row">
      <div class="extra-card">
        <div class="extra-title">边界归属示例</div>
        <ul class="extra-list">
          <li>D = 20 → 2 级（一般危险），不归 1 级</li>
          <li>D = 70 → 2 级；D = 71 → 3 级</li>
          <li>D = 160 → 3 级；D = 161 → 4 级</li>
          <li>D = 320 → 4 级；D = 321 → 5 级</li>
        </ul>
      </div>
      <div class="extra-card">
        <div class="extra-title">风险等级 ≠ 隐患等级</div>
        <p class="extra-text">
          风险等级按 LEC 五级（蓝/黄/橙/紫/红），由 D 值自动判定；隐患等级按重大/较大/一般三级（红/橙/黄），
          由隐患分级标准判定。两套口径不能混用，同一对象可能同时有风险等级与隐患等级。
        </p>
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
  width: 22px;
  height: 22px;
  line-height: 22px;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.d-range { font-variant-numeric: tabular-nums; font-weight: 600; }
.color-cell { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; }
.color-cell i {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.num { font-weight: 600; color: var(--ez-primary); font-variant-numeric: tabular-nums; }

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
.extra-text {
  margin: 0;
  font-size: 12px;
  color: var(--ez-text-secondary);
  line-height: 1.8;
}

@media (max-width: 1100px) {
  .extra-row { grid-template-columns: 1fr; }
}
</style>
