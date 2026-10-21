<script setup>
import { ref, reactive, nextTick } from 'vue'

// 密钥已移至服务端代理（server/index.js），前端只调用同源 /api 接口，避免密钥暴露。
const DEEPSEEK_MODEL = 'deepseek-chat'

const DEEP_SYSTEM_PROMPT = `你是一位拥有20年经验的医院后勤运维专家，服务于南京市浦口人民医院。你的职责是为医院后勤人员提供专业、准确、可操作的建议。

## 你的专业领域
- 医院电气系统（配电房、UPS、发电机、照明）
- 暖通空调系统（冷水机组、锅炉、新风、洁净空调）
- 医用气体系统（氧气、压缩空气、负压吸引）
- 给排水系统（供水、热水、污水处理）
- 电梯与特种设备管理
- 消防与安全管理
- 安防监控与医用物流系统
- 医院感染控制相关后勤保障
- 医院等级评审标准与法规

## 回复要求
1. **结构化呈现**：使用清晰的步骤、表格和分段，适当换行，避免内容堆在一起
2. **具体可操作**：给出具体的参数值、时间节点、工具名称
3. **区分优先级**：紧急情况先给应急处置步骤，再给后续处理
4. **标注规范来源**：引用相关国标/法规时注明标准号（如GB 50333、GB 50751等）
5. **安全提醒**：涉及安全的关键步骤用⚠️标记
6. **使用Markdown风格的HTML格式**：用<strong>加粗关键参数</strong>，表格对比，分步骤编号

## 重要安全声明
在每次回复结尾添加：
> ⚠️ 免责声明：以上建议仅供参考，具体操作请结合医院实际情况，遵守医院规章制度和相关法律法规。紧急情况请立即联系专业人员处置。`

const DEEP_SYSTEM_CONTEXTS = {
  '医用气体': '当前对话上下文为医用气体系统（氧气、压缩空气、负压吸引、液氧储罐、汽化器、调压阀组等），请结合GB 50751标准进行专业回答。',
  '净化空调': '当前对话上下文为净化空调系统（手术室洁净空调、AHU、温湿度控制、压差控制、过滤器等），请结合GB 50333和WS/T 368标准进行专业回答。',
  '医用纯水': '当前对话上下文为医用纯水系统（RO反渗透、EDI电去离子、超滤、电导率控制等），请结合YY 0572标准进行专业回答。',
  '供配电': '当前对话上下文为医院供配电系统（变压器、高低压柜、ATS双电源切换、UPS、柴油发电机等），请结合GB 50052、GB 50054标准进行专业回答。',
  '电梯': '当前对话上下文为电梯系统（乘客电梯、医用电梯、扶梯），请结合TSG T5002、TSG T7001、GB 7588标准进行专业回答。',
  '消防': '当前对话上下文为消防系统（火灾自动报警、消防泵、消火栓、喷淋、气体灭火等），请结合GB 50116、GB 50974、GB 50016标准进行专业回答。',
  '安防': '当前对话上下文为安防监控系统（视频监控、门禁、入侵报警），请结合GB 50348、GB/T 28181标准进行专业回答。',
  '医用物流': '当前对话上下文为医用物流传输系统（气动物流、轨道小车、AGV等），请结合JGJ 312标准进行专业回答。'
}

// ---- 会话状态 ----
const deepHistory = ref([])
const deepSystemContext = ref('')
const selectedSystem = ref('')
const inputText = ref('')
const sending = ref(false)
const chatBodyRef = ref(null)

let _id = 0
const nextId = () => ++_id

const WELCOME_HTML = `<div class="sec-h1">🤖 AI智能体 · 南京市浦口人民医院后勤运维专家</div>
<div class="ref-bar">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
  基于 DeepSeek 大模型 · 8大医疗专项系统 · 实时流式推理
</div>
<div class="info-card blue">
  <div class="info-card-title">🔍 我能为您做什么</div>
  <strong>故障智能诊断</strong> — 基于故障树分析（FTA）+ 概率排序，精准定位根因<br>
  <strong>标准处置SOP</strong> — 多阶段分步流程 + 时间分配 + 工具清单 + 验收标准<br>
  <strong>应急预案指导</strong> — 分阶段响应流程 + 人员分工 + 安全注意事项<br>
  <strong>预防性维护计划</strong> — 巡检周期表 + 参数阈值 + 备件库存标准<br>
  <strong>法规标准查询</strong> — GB/WS/TSG 国标行标快速检索与解读
</div>
请在<strong>右侧选择医疗专项系统</strong>设定对话上下文，或直接输入您的问题开始对话。`

const messages = ref([
  { id: nextId(), role: 'ai', html: WELCOME_HTML }
])

// 智能滚动：仅当用户本就停留在底部附近时才跟随滚动到底，避免滚轮被强制拉回底部。
function scrollDeepChat(force = false) {
  nextTick(() => {
    const el = chatBodyRef.value
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (force || nearBottom) el.scrollTop = el.scrollHeight
  })
}

// ---- 系统标签 ----
const SYSTEMS = [
  { name: '医用气体', label: '医用气体', icon: '<path d="M12 2v7"/><circle cx="12" cy="15" r="4"/><line x1="8" y1="15" x2="16" y2="15"/>' },
  { name: '净化空调', label: '净化空调', icon: '<rect x="2" y="3" width="20" height="8" rx="2"/><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"/>' },
  { name: '医用纯水', label: '医用纯水', icon: '<path d="M2 12h20"/><path d="M12 2v20"/><circle cx="12" cy="12" r="6"/>' },
  { name: '供配电', label: '供配电', icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { name: '电梯', label: '电梯', icon: '<rect x="6" y="2" width="12" height="20" rx="1"/><polyline points="10 10 12 8 14 10"/><polyline points="10 16 12 18 14 16"/>' },
  { name: '消防', label: '消防系统', icon: '<path d="M12 2C8 6 4 8 4 12c0 4.42 3.58 8 8 8s8-3.58 8-8c0-4-4-6-8-10z"/>' },
  { name: '安防', label: '安防监控', icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><circle cx="12" cy="11" r="3"/>' },
  { name: '医用物流', label: '医用物流', icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>' }
]

// ---- 快捷提问 ----
const QUICK = [
  { icon: '🔧', label: '氧气站压力偏低诊断', q: '医用气体系统氧气站输出压力偏低（低于设计值0.4MPa），请依据GB 50751给出故障诊断与处置SOP' },
  { icon: '🏥', label: '手术室温湿度超标分析', q: '手术室净化空调温湿度持续超标（温度>25℃或湿度>60%RH），请依据GB 50333和WS/T 368给出故障树分析' },
  { icon: '⚡', label: '变压器过载根因与处理', q: '住院楼配电房变压器过载告警（绕组温度>155℃），请分析根因并给出标准处置流程' },
  { icon: '🚒', label: '消防泵远程启动失败排查', q: '消防水泵房消防泵无法远程启动/自动巡检失败，请依据GB 50116和GB 50974给出跨系统排查路径' },
  { icon: '💧', label: 'RO纯水电导率超标诊断', q: 'RO纯水系统产水电导率持续上升（超出1μS/cm），请给出膜污染诊断与化学清洗方案' },
  { icon: '🛗', label: '电梯困人应急标准流程', q: '医院电梯困人应急救援的标准流程是什么？需说明医院场景下的特殊要求' },
  { icon: '💊', label: '污水消毒超标原因分析', q: '医院污水处理站出水粪大肠菌群数持续超标，请依据GB 18466分析消毒工艺各环节可能原因' },
  { icon: '💨', label: '压缩空气含水量超标诊断', q: '医用压缩空气系统含水量超标（露点温度高于-20℃/末端管路有水分析出），请分析干燥系统故障' }
]

// ---- 工具 ----
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatDeepAnswer(text) {
  let html = text.replace(/\n{3,}/g, '\n\n')
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/^---+$/gm, '<hr>')
  html = html.replace(/&gt; ⚠️([\s\S]+?)(\n\n|$)/g, '<blockquote>⚠️$1</blockquote>')
  html = html.replace(/\n\n/g, '<br><br>')
  html = html.replace(/\n/g, '<br>')
  html = html.replace(/(<br>\s*){4,}/g, '<br><br>')
  return html
}

function buildDeepMessages(userMsg) {
  const msgs = []
  let systemContent = DEEP_SYSTEM_PROMPT
  if (deepSystemContext.value) systemContent += '\n\n' + deepSystemContext.value
  msgs.push({ role: 'system', content: systemContent })
  for (const h of deepHistory.value.slice(-20)) msgs.push({ role: h.role, content: h.content })
  msgs.push({ role: 'user', content: userMsg })
  return msgs
}

function setSystem(sys) {
  if (selectedSystem.value === sys) {
    selectedSystem.value = ''
    deepSystemContext.value = ''
    return
  }
  selectedSystem.value = sys
  deepSystemContext.value = DEEP_SYSTEM_CONTEXTS[sys] || ''
  messages.value.push({ id: nextId(), role: 'system', text: `📌 已切换到：${sys}系统 — AI将基于该领域专业知识回答` })
  scrollDeepChat()
}

function quickAsk(q) {
  inputText.value = q
  sendDeepMsg()
}

// 处理回车发送：忽略中文输入法组合态（isComposing）下的回车，避免误发送。
function onEnter(e) {
  if (e.isComposing) return
  sendDeepMsg()
}

// 非流式兜底：一次性取回完整结果，兼容被代理缓冲/阻断流式响应的网络环境。
async function fetchDeepOnce(messages) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)
  try {
    const response = await fetch('/api/ai/deepseek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, stream: false, max_tokens: 4096, temperature: 0.3 }),
      signal: controller.signal
    })
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`)
    }
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } finally {
    clearTimeout(timeoutId)
  }
}

// 流式请求：SSE 逐字返回，边收边渲染，实现"打字机"逐字跳出的效果，无需干等整段结果。
// 若 20s 内收不到首个分片（典型为代理缓冲流式响应），触发超时，由调用方回退到非流式。
async function fetchDeepStream(messages, aiMsg) {
  const controller = new AbortController()
  let gotFirst = false
  const firstChunkTimer = setTimeout(() => { if (!gotFirst) controller.abort() }, 20000)

  try {
    const response = await fetch('/api/ai/deepseek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, stream: true, max_tokens: 4096, temperature: 0.3 }),
      signal: controller.signal
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`API ${response.status}: ${errText.slice(0, 200)}`)
    }
    if (!response.body) throw new Error('流式响应不可用')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullAnswer = ''
    let lastRender = 0
    const RENDER_MS = 50

    const flush = () => {
      if (!fullAnswer) return
      aiMsg.html = formatDeepAnswer(fullAnswer)
      scrollDeepChat()
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      gotFirst = true
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) fullAnswer += content
        } catch (e) { /* 忽略不完整分片 */ }
      }

      const now = Date.now()
      if (now - lastRender >= RENDER_MS) {
        flush()
        lastRender = now
      }
    }

    flush()
    return fullAnswer
  } finally {
    clearTimeout(firstChunkTimer)
  }
}

async function sendDeepMsg() {
  const q = inputText.value.trim()
  if (!q || sending.value) return

  messages.value.push({ id: nextId(), role: 'user', text: q })
  inputText.value = ''

  const aiMsg = reactive({ id: nextId(), role: 'deep-ai', streaming: true, html: '' })
  messages.value.push(aiMsg)
  sending.value = true
  scrollDeepChat(true)

  try {
    const apiMessages = buildDeepMessages(q)
    let fullAnswer = ''
    try {
      fullAnswer = await fetchDeepStream(apiMessages, aiMsg)
    } catch (streamErr) {
      console.warn('DeepSeek 流式调用失败，回退为非流式请求：', streamErr)
      fullAnswer = await fetchDeepOnce(apiMessages)
    }

    if (fullAnswer.length > 0) {
      aiMsg.html = formatDeepAnswer(fullAnswer)
    } else {
      aiMsg.html = '<div class="info-card"><div class="info-card-title">⚠️ 未获取到有效回复</div>请稍后重试或更换提问方式。</div>'
    }
    aiMsg.streaming = false

    deepHistory.value.push({ role: 'user', content: q })
    deepHistory.value.push({ role: 'assistant', content: fullAnswer })
  } catch (err) {
    aiMsg.html = `<div class="info-card red"><div class="info-card-title">❌ API 调用失败</div>${escapeHtml(err.message)}</div>`
    aiMsg.streaming = false
    console.error('DeepSeek API error:', err)
  } finally {
    sending.value = false
    scrollDeepChat()
  }
}
</script>

<template>
  <div class="deep-agent-page">
    <div class="ai-chat-card">
      <div class="ai-chat-header">
        <span class="ai-chat-header-left">AI智能体 · 后勤运维专家</span>
        <span class="deep-agent-badge">DeepSeek 驱动</span>
      </div>

      <div class="ai-chat-body" ref="chatBodyRef">
        <template v-for="m in messages" :key="m.id">
          <div v-if="m.role === 'system'" style="text-align:center;margin:8px 0;">
            <span class="ctx-chip">{{ m.text }}</span>
          </div>
          <div v-else class="ai-msg" :class="m.role">
            <div class="ai-msg-avatar" :class="m.role">{{ m.role === 'user' ? 'U' : 'AI' }}</div>
            <div class="ai-msg-bubble">
              <template v-if="m.role === 'user'">{{ m.text }}</template>
              <template v-else-if="m.streaming && !m.html">
                <div class="deep-thinking">
                  <div class="d-dot"></div><div class="d-dot"></div><div class="d-dot"></div>
                  <span class="deep-thinking-label">DeepSeek 正在推理中…</span>
                </div>
              </template>
              <span v-else v-html="m.html"></span>
            </div>
          </div>
        </template>
      </div>

      <div class="ai-chat-input">
        <input
          type="text"
          v-model="inputText"
          placeholder="输入设备故障现象或运维问题…"
          @keydown.enter.prevent="onEnter"
        >
        <button type="button" @click="sendDeepMsg" title="发送">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>

    <div class="ai-right-panel">
      <div class="ai-system-card">
        <div class="ai-system-header">8大医疗专项系统</div>
        <div style="font-size:10px;color:var(--text-ter);padding:0 14px 10px;">点击标签设定AI对话上下文</div>
        <div class="ai-system-grid">
          <div
            v-for="s in SYSTEMS" :key="s.name"
            class="ai-system-tag"
            :class="{ active: selectedSystem === s.name }"
            @click="setSystem(s.name)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" v-html="s.icon"></svg>
            {{ s.label }}
          </div>
        </div>
      </div>

      <div class="ai-quick-card">
        <div class="ai-quick-header">快捷提问</div>
        <button v-for="item in QUICK" :key="item.label" class="ai-quick-item" @click="quickAsk(item.q)">{{ item.icon }} {{ item.label }}</button>
      </div>
    </div>
  </div>
</template>
