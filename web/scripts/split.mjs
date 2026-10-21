// 一次性从旧版 index.html 抽取 CSS / 脚本 / body，并拷贝素材到 public/
// 用法: node scripts/split.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..') // vue-app/
const srcDir = path.resolve(root, '..') // 上级目录，index.html 所在

const html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8')

// ---- 抽取 CSS（第一个 <style> … </style>）----
const styleStart = html.indexOf('<style>') + '<style>'.length
const styleEnd = html.indexOf('</style>')
let css = html.slice(styleStart, styleEnd).trim()

// ---- 抽取内联脚本（裸 <script>，非 CDN 的 <script src=...>）----
const scriptStart = html.indexOf('<script>') + '<script>'.length
const scriptEnd = html.lastIndexOf('</script>')
const js = html.slice(scriptStart, scriptEnd).trim()

// ---- 抽取 body ----
const bodyStart = html.indexOf('<body>') + '<body>'.length
const bodyEnd = html.indexOf('</body>')
const bodyHtml = html.slice(bodyStart, bodyEnd)

// ---- 背景图改名 + 修正 CSS 引用 ----
css = css.replace(
  "url('建筑图片风格迁移 (3).png')",
  "url('/bg.png')"
)

// ---- 写入 ----
fs.mkdirSync(path.join(root, 'src', 'styles'), { recursive: true })
fs.mkdirSync(path.join(root, '_tmp'), { recursive: true })
fs.mkdirSync(path.join(root, 'public'), { recursive: true })

fs.writeFileSync(path.join(root, 'src', 'styles', 'index.css'), css + '\n')
fs.writeFileSync(path.join(root, '_tmp', 'body.html'), bodyHtml)
fs.writeFileSync(path.join(root, '_tmp', 'script.js'), js + '\n')

// ---- 拷贝素材 ----
const copyAsset = (rel, toName) => {
  const from = path.join(srcDir, rel)
  const to = path.join(root, 'public', toName)
  if (fs.existsSync(from)) {
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
    console.log('copied:', rel, '->', toName)
  } else {
    console.warn('MISSING:', rel)
  }
}

copyAsset('建筑图片风格迁移 (3).png', 'bg.png')

for (const d of ['图片', '头像']) {
  const fromDir = path.join(srcDir, d)
  const toDir = path.join(root, 'public', d)
  if (fs.existsSync(fromDir)) {
    fs.cpSync(fromDir, toDir, { recursive: true })
    console.log('copied dir:', d)
  } else {
    console.warn('MISSING dir:', d)
  }
}

console.log('\nCSS chars:', css.length)
console.log('JS  chars:', js.length)
console.log('BODY chars:', bodyHtml.length)
console.log('Done.')
