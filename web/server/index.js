import express from 'express'
import 'dotenv/config'
import { Readable } from 'node:stream'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
// AI 随手拍会传 base64 图片，放宽请求体上限
app.use(express.json({ limit: '25mb' }))

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 大模型上游配置：密钥只存在于服务端环境变量（.env），绝不进入前端代码
const UPSTREAMS = {
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    key: process.env.DEEPSEEK_API_KEY
  },
  qwen: {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    key: process.env.QWEN_API_KEY
  }
}

// 通用 AI 代理：POST /api/ai/:provider
// 透传前端请求体，仅在服务端注入密钥；支持流式(SSE)与非流式响应透传。
app.post('/api/ai/:provider', async (req, res) => {
  const upstream = UPSTREAMS[req.params.provider]
  if (!upstream || !upstream.key) {
    return res.status(500).json({ error: '未配置该模型服务的密钥，请在 .env 中设置对应 API Key' })
  }
  try {
    const upstreamRes = await fetch(upstream.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${upstream.key}`
      },
      body: JSON.stringify(req.body)
    })
    res.status(upstreamRes.status)
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json')
    if (upstreamRes.body) {
      Readable.fromWeb(upstreamRes.body).pipe(res)
    } else {
      res.end()
    }
  } catch (err) {
    res.status(502).json({ error: 'AI 服务请求失败：' + err.message })
  }
})

// 生产环境：托管前端构建产物 dist，并做 SPA 回退（history 路由刷新不 404）
const distDir = path.resolve(__dirname, '../dist')
app.use(express.static(distDir))
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(distDir, 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ E智维服务已启动：http://localhost:${PORT}`)
})
