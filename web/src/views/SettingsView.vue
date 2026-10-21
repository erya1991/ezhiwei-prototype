<script setup>
import { ref, reactive } from 'vue'
import { showToast } from '../composables/useToast'
import { platformName } from '../composables/useAppState'

const activeTab = ref('basic')

// ---- 基本设置表单 ----
const basic = reactive({
  platformName: 'E智维智能体平台',
  hospital: '南京市浦口人民医院',
  lang: '简体中文',
  timezone: 'Asia/Shanghai (UTC+8)',
  desc: 'E智维智能体平台 — 南京市浦口人民医院后勤智慧运维管理系统，覆盖8大医疗专项系统，提供故障智能诊断、标准处置SOP、应急预案指导等AI驱动的运维服务。',
  retention: '365',
  backupTime: '每日 02:00',
  pageSize: '20',
  refreshInterval: '30'
})

function sysSaveBasic() {
  platformName.value = basic.platformName
  showToast('✓ 基本设置保存成功')
}

function sysResetBasic() {
  basic.platformName = 'E智维智能体平台'
  basic.hospital = '南京市浦口人民医院'
  basic.lang = '简体中文'
  basic.timezone = 'Asia/Shanghai (UTC+8)'
  basic.desc = 'E智维智能体平台 — 南京市浦口人民医院后勤智慧运维管理系统，覆盖8大医疗专项系统，提供故障智能诊断、标准处置SOP、应急预案指导等AI驱动的运维服务。'
  basic.retention = '365'
  basic.backupTime = '每日 02:00'
  basic.pageSize = '20'
  basic.refreshInterval = '30'
  platformName.value = basic.platformName
  showToast('已恢复默认设置')
}

// ---- 用户管理 ----
const sysUsers = ref([
  { id: 'U001', name: '张三', account: 'zhangsan', role: 'admin', dept: '信息科', phone: '138****6789', lastLogin: '2026-08-09 09:15', status: 'active' },
  { id: 'U002', name: '李四', account: 'lisi', role: 'manager', dept: '后勤管理处', phone: '139****8901', lastLogin: '2026-08-09 08:42', status: 'active' },
  { id: 'U003', name: '王五', account: 'wangwu', role: 'engineer', dept: '设备科', phone: '137****2345', lastLogin: '2026-08-08 17:30', status: 'active' },
  { id: 'U004', name: '赵六', account: 'zhaoliu', role: 'engineer', dept: '基建科', phone: '136****4567', lastLogin: '2026-08-08 14:20', status: 'active' },
  { id: 'U005', name: '陈七', account: 'chenqi', role: 'viewer', dept: '院办', phone: '135****7890', lastLogin: '2026-08-07 10:05', status: 'inactive' }
])

const ROLE_NAME = { admin: '系统管理员', manager: '运维经理', engineer: '运维工程师', viewer: '只读用户' }
const ROLE_COLOR = { admin: 'c1', manager: 'c2', engineer: 'c3', viewer: 'c4' }
function sysRoleName(role) { return ROLE_NAME[role] || role }
function sysAddUser() { showToast('模拟：打开添加用户表单（实际可对接用户管理API）') }
function sysEditUser(id) { showToast('模拟：编辑用户 ' + id) }
function sysToggleUser(id) {
  const user = sysUsers.value.find((u) => u.id === id)
  if (!user) return
  user.status = user.status === 'active' ? 'inactive' : 'active'
  showToast('用户状态已更新')
}

// ---- 通知设置 ----
const toggles = reactive({
  alert: true,
  inApp: true,
  sms: false,
  email: true,
  wechat: false
})
const thresholds = reactive({
  waterLow: '20',
  waterHigh: '95',
  tempThreshold: '80',
  alertInterval: '30'
})

function sysSaveNotify() {
  showToast('✓ 通知设置保存成功')
}
function sysResetNotify() {
  toggles.alert = true
  toggles.inApp = true
  toggles.sms = false
  toggles.email = true
  toggles.wechat = false
  thresholds.waterLow = '20'
  thresholds.waterHigh = '95'
  thresholds.tempThreshold = '80'
  thresholds.alertInterval = '30'
  showToast('已恢复默认通知设置')
}

// ---- 关于系统 ----
function sysCheckUpdate() { showToast('当前已是最新版本 V2.1.0') }
function sysExportLog() { showToast('运行日志导出中，请稍候...') }
</script>

<template>
  <div class="sys-page">
    <div class="sys-header"><h2>系统设置</h2></div>

    <!-- Tabs -->
    <div class="sys-tab-bar">
      <button class="sys-tab" :class="{ active: activeTab === 'basic' }" @click="activeTab = 'basic'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        基本设置
      </button>
      <button class="sys-tab" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        用户管理
      </button>
      <button class="sys-tab" :class="{ active: activeTab === 'notify' }" @click="activeTab = 'notify'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        通知设置
      </button>
      <button class="sys-tab" :class="{ active: activeTab === 'about' }" @click="activeTab = 'about'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        关于系统
      </button>
    </div>

    <!-- 基本设置 -->
    <div v-show="activeTab === 'basic'" class="sys-tab-content">
      <div class="sys-card">
        <div class="sys-card-title">平台基本信息</div>
        <div class="sys-form-grid">
          <div class="sys-form-item">
            <span class="sys-form-label"><span class="req">*</span> 平台名称</span>
            <input class="sys-form-input" v-model="basic.platformName" placeholder="输入平台名称">
          </div>
          <div class="sys-form-item">
            <span class="sys-form-label"><span class="req">*</span> 所属机构</span>
            <input class="sys-form-input" v-model="basic.hospital" placeholder="输入机构名称">
          </div>
          <div class="sys-form-item">
            <span class="sys-form-label"><span class="req">*</span> 系统语言</span>
            <select class="sys-form-select" v-model="basic.lang">
              <option>简体中文</option><option>English</option>
            </select>
          </div>
          <div class="sys-form-item">
            <span class="sys-form-label">时区</span>
            <select class="sys-form-select" v-model="basic.timezone">
              <option>Asia/Shanghai (UTC+8)</option><option>Asia/Tokyo (UTC+9)</option><option>America/New_York (UTC-5)</option>
            </select>
          </div>
          <div class="sys-form-item full">
            <span class="sys-form-label">平台简介</span>
            <textarea class="sys-form-textarea" v-model="basic.desc" placeholder="输入平台简介信息..."></textarea>
          </div>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-title">数据与存储</div>
        <div class="sys-form-grid">
          <div class="sys-form-item">
            <span class="sys-form-label">数据保留周期（天）</span>
            <input class="sys-form-input" v-model="basic.retention" placeholder="默认365天" type="number">
            <span class="sys-form-hint">超过周期的历史数据将自动归档</span>
          </div>
          <div class="sys-form-item">
            <span class="sys-form-label">自动备份时间</span>
            <select class="sys-form-select" v-model="basic.backupTime">
              <option>每日 02:00</option><option>每日 06:00</option><option>每日 12:00</option><option>每周一 02:00</option>
            </select>
          </div>
          <div class="sys-form-item">
            <span class="sys-form-label">每页默认条数</span>
            <select class="sys-form-select" v-model="basic.pageSize">
              <option>10</option><option>20</option><option>50</option><option>100</option>
            </select>
          </div>
          <div class="sys-form-item">
            <span class="sys-form-label">数据刷新间隔（秒）</span>
            <input class="sys-form-input" v-model="basic.refreshInterval" placeholder="默认30秒" type="number">
          </div>
        </div>
      </div>

      <div class="sys-actions">
        <button class="sys-btn" @click="sysResetBasic">恢复默认</button>
        <button class="sys-btn primary" @click="sysSaveBasic">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          保存设置
        </button>
      </div>
    </div>

    <!-- 用户管理 -->
    <div v-show="activeTab === 'users'" class="sys-tab-content">
      <div class="sys-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div class="sys-card-title" style="margin-bottom:0;">系统用户列表</div>
          <button class="sys-btn primary" @click="sysAddUser" style="height:32px;padding:0 14px;font-size:11px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            添加用户
          </button>
        </div>
        <div class="sys-table-wrap">
          <table class="sys-table">
            <thead><tr><th>用户</th><th>账号</th><th>角色</th><th>所属部门</th><th>手机号</th><th>最后登录</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="u in sysUsers" :key="u.id">
                <td>
                  <span class="sys-user-avatar" :class="ROLE_COLOR[u.role] || 'c5'">{{ u.name.charAt(0) }}</span>
                  {{ u.name }}
                </td>
                <td style="font-family:monospace;font-size:11px;">{{ u.account }}</td>
                <td><span class="sys-role-badge" :class="u.role">{{ sysRoleName(u.role) }}</span></td>
                <td>{{ u.dept }}</td>
                <td>{{ u.phone }}</td>
                <td style="font-size:11px;color:var(--text-sec);">{{ u.lastLogin }}</td>
                <td><span class="sys-status-badge" :class="u.status">{{ u.status === 'active' ? '正常' : '停用' }}</span></td>
                <td>
                  <div class="wo-actions">
                    <button class="wo-btn-sm" @click="sysEditUser(u.id)">编辑</button>
                    <button class="wo-btn-sm success" @click="sysToggleUser(u.id)">{{ u.status === 'active' ? '停用' : '启用' }}</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 通知设置 -->
    <div v-show="activeTab === 'notify'" class="sys-tab-content">
      <div class="sys-card">
        <div class="sys-card-title">告警通知</div>
        <div class="sys-toggle-row">
          <div class="sys-toggle-info">
            <span class="sys-toggle-label">启用告警通知</span>
            <span class="sys-toggle-desc">开启后系统将通过以下渠道发送告警通知</span>
          </div>
          <div class="sys-toggle" :class="{ active: toggles.alert }" @click="toggles.alert = !toggles.alert"></div>
        </div>
        <hr class="sys-divider">
        <div class="sys-toggle-row">
          <div class="sys-toggle-info">
            <span class="sys-toggle-label">站内消息通知</span>
            <span class="sys-toggle-desc">在平台内显示实时告警弹窗和消息提醒</span>
          </div>
          <div class="sys-toggle" :class="{ active: toggles.inApp }" @click="toggles.inApp = !toggles.inApp"></div>
        </div>
        <div class="sys-toggle-row">
          <div class="sys-toggle-info">
            <span class="sys-toggle-label">短信通知</span>
            <span class="sys-toggle-desc">紧急告警通过短信发送至指定运维人员手机</span>
          </div>
          <div class="sys-toggle" :class="{ active: toggles.sms }" @click="toggles.sms = !toggles.sms"></div>
        </div>
        <div class="sys-toggle-row">
          <div class="sys-toggle-info">
            <span class="sys-toggle-label">邮件通知</span>
            <span class="sys-toggle-desc">每日/每周汇总报告发送至管理员邮箱</span>
          </div>
          <div class="sys-toggle" :class="{ active: toggles.email }" @click="toggles.email = !toggles.email"></div>
        </div>
        <div class="sys-toggle-row">
          <div class="sys-toggle-info">
            <span class="sys-toggle-label">微信通知</span>
            <span class="sys-toggle-desc">通过企业微信推送紧急告警和工单状态变更</span>
          </div>
          <div class="sys-toggle" :class="{ active: toggles.wechat }" @click="toggles.wechat = !toggles.wechat"></div>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-title">告警阈值配置</div>
        <div class="sys-form-grid">
          <div class="sys-form-item">
            <span class="sys-form-label">水位下限告警阈值 (%)</span>
            <input class="sys-form-input" v-model="thresholds.waterLow" placeholder="20%" type="number">
          </div>
          <div class="sys-form-item">
            <span class="sys-form-label">水位上限告警阈值 (%)</span>
            <input class="sys-form-input" v-model="thresholds.waterHigh" placeholder="95%" type="number">
          </div>
          <div class="sys-form-item">
            <span class="sys-form-label">温度告警阈值 (°C)</span>
            <input class="sys-form-input" v-model="thresholds.tempThreshold" placeholder="80°C" type="number">
          </div>
          <div class="sys-form-item">
            <span class="sys-form-label">告警重复间隔（分钟）</span>
            <input class="sys-form-input" v-model="thresholds.alertInterval" placeholder="30分钟" type="number">
          </div>
        </div>
      </div>

      <div class="sys-actions">
        <button class="sys-btn" @click="sysResetNotify">恢复默认</button>
        <button class="sys-btn primary" @click="sysSaveNotify">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          保存设置
        </button>
      </div>
    </div>

    <!-- 关于系统 -->
    <div v-show="activeTab === 'about'" class="sys-tab-content">
      <div class="sys-card" style="text-align:center;">
        <div class="sys-about-logo" style="margin:0 auto 12px;">E</div>
        <div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:4px;">E智维智能体平台</div>
        <div style="font-size:12px;color:var(--text-sec);margin-bottom:4px;">E-Wisdom Agent Platform</div>
        <div style="font-size:11px;color:var(--text-ter);">Version 2.1.0 (Build 2026.08)</div>
      </div>

      <div class="sys-card">
        <div class="sys-card-title">系统信息</div>
        <div class="sys-about-grid">
          <div class="sys-about-item"><span class="sys-about-lbl">版本号</span><span class="sys-about-val">V2.1.0</span></div>
          <div class="sys-about-item"><span class="sys-about-lbl">构建版本</span><span class="sys-about-val">Build 2026.08.01</span></div>
          <div class="sys-about-item"><span class="sys-about-lbl">前端框架</span><span class="sys-about-val">Vue 3 + Vite + ECharts 5.5</span></div>
          <div class="sys-about-item"><span class="sys-about-lbl">AI引擎</span><span class="sys-about-val">DeepSeek 大模型</span></div>
          <div class="sys-about-item"><span class="sys-about-lbl">运行环境</span><span class="sys-about-val">Browser / Win11</span></div>
          <div class="sys-about-item"><span class="sys-about-lbl">上次更新</span><span class="sys-about-val">2026年8月9日</span></div>
          <div class="sys-about-item"><span class="sys-about-lbl">版权所有</span><span class="sys-about-val">南京中建八局智慧科技有限公司</span></div>
          <div class="sys-about-item"><span class="sys-about-lbl">授权类型</span><span class="sys-about-val">永久授权 · 内部使用</span></div>
        </div>
      </div>

      <div class="sys-card">
        <div class="sys-card-title">功能模块</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="padding:6px 14px;border-radius:8px;font-size:11px;background:rgba(33,115,216,0.06);color:var(--blue);border:1px solid rgba(33,115,216,0.12);">综合态势驾驶舱</span>
          <span style="padding:6px 14px;border-radius:8px;font-size:11px;background:rgba(16,124,16,0.06);color:#107C10;border:1px solid rgba(16,124,16,0.12);">专家知识库</span>
          <span style="padding:6px 14px;border-radius:8px;font-size:11px;background:rgba(124,58,237,0.06);color:#7C3AED;border:1px solid rgba(124,58,237,0.12);">AI智能体（DeepSeek）</span>
          <span style="padding:6px 14px;border-radius:8px;font-size:11px;background:rgba(255,149,0,0.06);color:#E08A00;border:1px solid rgba(255,149,0,0.12);">工单处理</span>
          <span style="padding:6px 14px;border-radius:8px;font-size:11px;background:rgba(117,117,117,0.06);color:#757575;border:1px solid rgba(117,117,117,0.12);">系统设置</span>
        </div>
      </div>

      <div class="sys-actions">
        <button class="sys-btn" @click="sysCheckUpdate">检查更新</button>
        <button class="sys-btn" @click="sysExportLog">导出运行日志</button>
      </div>
    </div>
  </div>
</template>
