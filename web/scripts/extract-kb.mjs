// 从 _tmp/script.js 按行精确抽取专家知识库数据，生成 src/data/knowledgeBase.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const lines = fs.readFileSync(path.join(root, '_tmp', 'script.js'), 'utf8').split('\n')

// 行号基于 script.js 的 1-indexed（与 grep 一致）
function block(from1, to1) {
  return lines.slice(from1 - 1, to1).join('\n')
}

const kbEntries = block(2315, 2324).replace('const kbEntries =', 'export const kbEntries =')
const kbExperts = block(2327, 2334)
  .replace('const kbExperts =', 'export const kbExperts =')
  .replace(/photo:'头像\//g, "photo:'/头像/")
const kbCategories = block(2337, 2368).replace('const kbCategories =', 'export const kbCategories =')
const kbDomains = block(2668, 2668).replace('const KB_DOMAINS', 'export const KB_DOMAINS')
const kbExpertRole = block(2669, 2676).replace('const KB_EXPERT_ROLE', 'export const KB_EXPERT_ROLE')

const out = `// ==================== 专家知识库 mock 数据 ====================
// 由 scripts/extract-kb.mjs 从原 demo 脚本按行抽取生成。

${kbEntries}

${kbExperts}

${kbCategories}

${kbDomains}
${kbExpertRole}
`

fs.writeFileSync(path.join(root, 'src', 'data', 'knowledgeBase.js'), out)
console.log('written src/data/knowledgeBase.js, chars:', out.length)
