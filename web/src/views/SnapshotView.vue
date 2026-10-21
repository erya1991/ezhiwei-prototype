<script setup>
import { ref, computed } from 'vue'
import { showToast } from '../composables/useToast'

// 密钥已移至服务端代理（server/index.js），前端只调用同源 /api 接口。
const QWEN_VL_MODEL = 'qwen-vl-plus'

const SNAP_SYSTEM_PROMPT = `你是一名专业的医院建筑缺陷期安全隐患识别专家。请仔细分析用户上传的图片，识别其中可能存在的安全隐患。

请严格按照以下JSON格式返回结果（只返回JSON，不要输出任何其他文字、解释或markdown代码块标记）：
{
  "hazards": [
    {
      "category": "建筑安装类",
      "description": "隐患的具体描述，要求准确、专业、简洁",
      "riskLevel": "高",
      "suggestion": "具体的整改建议，包含建议整改时限",
      "confidence": 0.92
    }
  ],
  "summary": "对图片整体安全状况的一句话总结"
}

识别规则（category 只能是以下五类之一）：
1. 建筑安装类：管线洞口未封堵、临边防护缺失、预留钢筋未处理等
2. 机电安全类：临时用电私拉乱接、配电箱未上锁/箱门缺失、线缆破损裸露等
3. 消防安全类：消防设施被遮挡或缺失、疏散通道被占用、防火门未保持常闭等
4. 装饰装修类：吊顶破损、墙地砖空鼓/脱落、地面高差绊倒风险等
5. 环境卫生类：积水湿滑、建筑垃圾未及时清运、医疗废物混放等

风险等级（riskLevel 只能是以下三者之一）：
- 高：可能造成人员伤亡或重大财产损失，需立即处置
- 中：存在一定安全风险，需限期整改
- 低：一般性隐患，建议尽快处理

confidence 是 0 到 1 之间的数字，表示识别置信度。
如果图片中未发现明显安全隐患，hazards 返回空数组，summary 说明未发现明显隐患。`

// ---- 状态 ----
const snapCurrentImage = ref(null)   // 当前图片 dataUrl (base64)
const result = ref(null)             // 当前识别结果
const analyzing = ref(false)
const dragover = ref(false)
const fileInput = ref(null)

const location = ref('')
const reporter = ref('')
const contact = ref('')

// ---- 派生结果 ----
const hazards = computed(() => (result.value && result.value.hazards) || [])
const highCount = computed(() => hazards.value.filter((h) => h.riskLevel === '高').length)
const midCount = computed(() => hazards.value.filter((h) => h.riskLevel === '中').length)
const lowCount = computed(() => hazards.value.filter((h) => h.riskLevel === '低').length)
const summaryIcon = computed(() =>
  hazards.value.length === 0 ? '✅' : (highCount.value > 0 ? '🚨' : (midCount.value > 0 ? '⚠️' : 'ℹ️'))
)
const summaryBg = computed(() =>
  hazards.value.length === 0 ? 'rgba(16,124,16,0.1)' : (highCount.value > 0 ? 'rgba(217,48,37,0.1)' : (midCount.value > 0 ? 'rgba(255,149,0,0.1)' : 'rgba(33,115,216,0.1)'))
)

function snapConf(h) {
  return Math.round((h.confidence || 0.9) * 100)
}
function snapCategoryClass(category) {
  if (category.includes('建筑')) return 'building'
  if (category.includes('机电')) return 'electrical'
  if (category.includes('消防')) return 'fire'
  if (category.includes('装饰')) return 'decor'
  if (category.includes('环境')) return 'env'
  return 'other'
}
function snapRiskClass(riskLevel) {
  if (riskLevel === '高') return 'high'
  if (riskLevel === '中') return 'mid'
  return 'low'
}

// ---- 图片压缩 ----
function snapCompressImage(file, maxSize = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      const scale = Math.min(1, maxSize / Math.max(width, height))
      width = Math.round(width * scale)
      height = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}

// ---- 处理选中图片 ----
async function snapHandleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('请选择图片文件', true)
    return
  }
  try {
    const dataUrl = await snapCompressImage(file)
    snapCurrentImage.value = dataUrl
    result.value = null
  } catch (err) {
    console.error('图片处理失败:', err)
    showToast('图片处理失败，请重试', true)
  }
}

function snapResetImage() {
  snapCurrentImage.value = null
  result.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function onFileChange(e) {
  if (e.target.files && e.target.files[0]) snapHandleFile(e.target.files[0])
}

function onDrop(e) {
  dragover.value = false
  if (e.dataTransfer.files && e.dataTransfer.files[0]) snapHandleFile(e.dataTransfer.files[0])
}

// ---- 解析模型返回 JSON ----
function snapParseJSON(text) {
  let t = text.trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

// ---- 执行 AI 识别 ----
async function snapAnalyze() {
  if (!snapCurrentImage.value) {
    showToast('请先上传图片', true)
    return
  }
  analyzing.value = true

  const extraText =
    (location.value.trim() ? `\n隐患位置：${location.value.trim()}` : '') +
    (reporter.value.trim() ? `\n发现人：${reporter.value.trim()}` : '') +
    (contact.value.trim() ? `\n联系方式：${contact.value.trim()}` : '')

  try {
    const response = await fetch('/api/ai/qwen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: QWEN_VL_MODEL,
        messages: [
          { role: 'system', content: SNAP_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: snapCurrentImage.value } },
              { type: 'text', text: '请分析这张图片中的安全隐患' + extraText }
            ]
          }
        ],
        temperature: 0.2
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`)
    }

    const data = await response.json()
    const rawContent = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    if (!rawContent) throw new Error('API 返回内容为空')

    result.value = snapParseJSON(rawContent)
    showToast('✓ AI 识别完成')
  } catch (err) {
    console.error('AI识别失败:', err)
    showToast('AI 识别失败：' + err.message, true)
    result.value = { hazards: [], summary: '识别失败：' + err.message, error: true }
  } finally {
    analyzing.value = false
  }
}

// ---- 生成报告 ----
function snapBuildReportHTML() {
  const loc = location.value.trim() || '未填写'
  const rep = reporter.value.trim() || '未填写'
  const cont = contact.value.trim() || '未填写'
  const now = new Date()
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const hs = hazards.value

  const riskName = { 高: '高风险', 中: '中风险', 低: '低风险' }
  const hazardRows = hs.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#107C10;">✅ 未发现明显安全隐患</td></tr>'
    : hs.map((h, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${h.category}</td>
        <td>${h.description}</td>
        <td style="text-align:center;font-weight:700;color:${h.riskLevel === '高' ? '#D93025' : (h.riskLevel === '中' ? '#E08A00' : '#2173D8')};">${riskName[h.riskLevel] || h.riskLevel}</td>
        <td>${h.suggestion}</td>
      </tr>`).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>安全隐患检查报告</title>
<style>
  body { font-family: "Microsoft YaHei","PingFang SC",sans-serif; color:#1D1D1D; padding:40px; line-height:1.7; }
  h1 { font-size:22px; text-align:center; margin-bottom:4px; }
  .sub { text-align:center; color:#757575; font-size:13px; margin-bottom:28px; }
  .meta { font-size:12px; color:#555; margin-bottom:20px; }
  .meta span { display:inline-block; margin-right:24px; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-top:12px; }
  th, td { border:1px solid #ddd; padding:8px 10px; text-align:left; vertical-align:top; }
  th { background:#f2f6fb; }
  .footer { margin-top:28px; font-size:11px; color:#999; text-align:center; }
</style></head><body>
  <h1>医院建筑缺陷期安全隐患检查报告</h1>
  <div class="sub">E智维智能体平台 · AI随手拍</div>
  <div class="meta">
    <span><strong>隐患位置：</strong>${loc}</span>
    <span><strong>发现人：</strong>${rep}</span>
    <span><strong>联系方式：</strong>${cont}</span>
    <span><strong>检查时间：</strong>${timeStr}</span>
  </div>
  <table>
    <thead><tr><th style="width:36px;">序号</th><th style="width:100px;">隐患类别</th><th>隐患描述</th><th style="width:80px;">风险等级</th><th>整改建议</th></tr></thead>
    <tbody>${hazardRows}</tbody>
  </table>
  ${snapCurrentImage.value ? `<div style="margin-top:20px;"><strong>现场照片：</strong></div><img src="${snapCurrentImage.value}" style="max-width:100%;margin-top:8px;border-radius:6px;">` : ''}
  <div class="footer">本报告由 AI 自动生成，识别结果仅供管理参考，请结合现场实际情况核实。</div>
</body></html>`
}

function snapExportWord() {
  if (!result.value) { showToast('暂无可导出的识别结果', true); return }
  const html = snapBuildReportHTML()
  const blob = new Blob(['﻿' + html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '安全隐患检查报告_' + new Date().toISOString().slice(0, 10) + '.doc'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('✓ Word 报告已导出')
}

function snapExportPDF() {
  if (!result.value) { showToast('暂无可导出的识别结果', true); return }
  const html = snapBuildReportHTML()
  const w = window.open('', '_blank')
  if (!w) { showToast('浏览器拦截了弹窗，请允许弹窗后重试', true); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 500)
}
</script>

<template>
  <div class="snap-page">
    <div class="snap-header">
      <h2>AI随手拍</h2>
      <span class="snap-header-sub">拍照上传 → AI智能识别 → 一键生成检查报告</span>
    </div>

    <div class="snap-layout">
      <!-- Left: upload + info -->
      <div class="snap-left">
        <div class="snap-card">
          <div class="snap-card-title">📷 隐患图片上传</div>

          <div
            v-if="!snapCurrentImage"
            class="snap-upload-zone"
            :class="{ dragover }"
            @dragover.prevent="dragover = true"
            @dragleave.prevent="dragover = false"
            @drop.prevent="onDrop"
          >
            <input type="file" ref="fileInput" accept="image/*" capture="environment" @change="onFileChange">
            <div class="snap-upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <div class="snap-upload-title">点击拍照或选择图片上传</div>
            <div class="snap-upload-hint">支持手机拍照、从相册选择<br>图片将发送至 AI 进行安全隐患分析</div>
          </div>

          <div v-else class="snap-preview">
            <img :src="snapCurrentImage" alt="预览">
            <div class="snap-preview-actions">
              <button @click="snapResetImage()">重新选择</button>
            </div>
          </div>
        </div>

        <div class="snap-card">
          <div class="snap-card-title">📍 补充信息（可选）</div>
          <div class="snap-form">
            <div class="snap-form-row">
              <span class="snap-form-label">隐患位置</span>
              <input class="snap-form-input" v-model="location" placeholder="如：住院楼三楼西侧走廊">
            </div>
            <div class="snap-form-row">
              <span class="snap-form-label">发现人</span>
              <input class="snap-form-input" v-model="reporter" placeholder="如：张工">
            </div>
            <div class="snap-form-row">
              <span class="snap-form-label">联系方式</span>
              <input class="snap-form-input" v-model="contact" placeholder="手机号（便于联系核实）">
            </div>
          </div>
        </div>

        <button class="snap-analyze-btn" :disabled="!snapCurrentImage || analyzing" @click="snapAnalyze">
          <span v-if="analyzing" class="spin"></span>
          <span v-else>🔍</span>
          <span>{{ analyzing ? 'AI 正在识别中…' : 'AI 智能识别隐患' }}</span>
        </button>
      </div>

      <!-- Right: results -->
      <div class="snap-right">
        <!-- 空状态 -->
        <div v-if="!result" class="snap-result-empty">
          <div style="font-size:40px;">📋</div>
          <div>识别结果将展示在这里</div>
          <div style="font-size:11px;color:var(--text-ter);">上传图片并点击「AI 智能识别隐患」后，<br>系统将自动返回隐患描述、风险等级与整改建议</div>
        </div>

        <!-- 结果内容 -->
        <template v-else>
          <div class="snap-summary-card">
            <div class="snap-summary-icon" :style="{ background: summaryBg }">{{ result.error ? '❌' : summaryIcon }}</div>
            <div class="snap-summary-text">
              <strong>{{ result.error ? '识别失败' : '识别汇总：' }}</strong>{{ result.error ? '' : (result.summary || '') }}<br>
              <span v-if="!result.error" style="font-size:11px;color:var(--text-ter);">
                共识别 {{ hazards.length }} 项隐患
                <template v-if="highCount"> · 高风险 {{ highCount }} 项</template>
                <template v-if="midCount"> · 中风险 {{ midCount }} 项</template>
                <template v-if="lowCount"> · 低风险 {{ lowCount }} 项</template>
              </span>
              <span v-else style="font-size:11px;">{{ result.summary }}</span>
            </div>
          </div>

          <div v-if="!result.error && hazards.length === 0" class="snap-hazard-card low" style="text-align:center;padding:24px;color:var(--green);">✅ 未发现明显安全隐患</div>

          <div v-else-if="!result.error" class="snap-hazard-list">
            <div v-for="(h, i) in hazards" :key="i" class="snap-hazard-card" :class="snapRiskClass(h.riskLevel)">
              <div class="snap-hazard-top">
                <span class="snap-hazard-category" :class="snapCategoryClass(h.category)">{{ h.category }}</span>
                <span class="snap-risk-badge" :class="snapRiskClass(h.riskLevel)">{{ h.riskLevel }}风险</span>
              </div>
              <div class="snap-hazard-desc"><strong>隐患 #{{ i + 1 }}：</strong>{{ h.description }}</div>
              <div class="snap-hazard-suggestion"><strong>整改建议：</strong>{{ h.suggestion }}</div>
              <div class="snap-confidence">
                <span>AI 置信度</span>
                <div class="snap-confidence-bar"><div class="snap-confidence-fill" :style="{ width: snapConf(h) + '%' }"></div></div>
                <span>{{ snapConf(h) }}%</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Export bar -->
    <div v-if="result" class="snap-export-bar" style="margin-top:16px;">
      <button class="sys-btn" @click="snapExportWord">📄 导出 Word 报告</button>
      <button class="sys-btn" @click="snapExportPDF">📑 导出 PDF 报告</button>
    </div>
  </div>
</template>
