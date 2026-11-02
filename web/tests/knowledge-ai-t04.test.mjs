import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRenderer, nextTick } from 'vue'
import { parse, compileScript } from 'vue/compiler-sfc'
import { routerKey } from 'vue-router'
import { createKnowledgeStore, knowledgeStore, demoContext, MATERIAL_TYPES, ROLES, KNOWLEDGE_STORAGE_KEY } from '../src/data/knowledgeAiMock.js'

// Synthetic fixture only; run with: node --test tests/knowledge-ai-t04.test.mjs
const maintainer = ROLES[0], reviewer = ROLES[1]
const question = '供配电系统巡检时，发现配电柜运行指示异常，应该怎么处理？'
const input = {
  title: '供配电系统巡检操作说明（测试）', type: MATERIAL_TYPES[4], domain: '供配电',
  scope: '项目专属', project: 'A', source: '自动回归合成资料',
  body: '配电柜巡检时，首先检查运行指示灯状态，其次核对交接班记录。如发现指示异常，应联系值班负责人进行复核。',
}
const expected = ['配电柜巡检时，首先检查运行指示灯状态，其次核对交接班记录。', '如发现指示异常，应联系值班负责人进行复核。']
function memoryStorage() {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}
async function publish(store, fields = input) {
  const id = store.save(fields, null, maintainer)
  await store.process(id, 1, maintainer)
  store.confirm(id, 1, store.versionOf(id, 1).fragments, maintainer)
  store.submit(id, maintainer)
  store.review(id, true, '', reviewer)
  return id
}

test('T01–T03: 草稿、加工、校验、审核门禁及退回保持原规则', async () => {
  const store = createKnowledgeStore()
  assert.throws(() => store.save({ ...input, project: '' }, null, maintainer))
  const id = store.save(input, null, maintainer), doc = store.getDocument(id)
  const hits = () => store.search(question, '供配电', 'A', maintainer).filter(h => h.documentId === id)
  assert.equal(doc.currentVersion, null)
  assert.equal(hits().length, 0)
  assert.throws(() => store.submit(id, maintainer))
  const processing = store.process(id, 1, maintainer)
  assert.equal(store.latest(doc).processing, '加工中')
  assert.throws(() => store.save(input, id, maintainer))
  await processing
  assert.equal(store.latest(doc).processing, '待校验')
  assert.deepEqual(store.latest(doc).fragments.map(f => f.text), expected)
  assert.throws(() => store.confirm(id, 1, [{ text: '正文不存在的内容', kind: '事实' }], maintainer))
  store.confirm(id, 1, store.latest(doc).fragments, maintainer)
  assert.equal(store.latest(doc).processing, '可检索')
  assert.equal(hits().length, 0)
  store.submit(id, maintainer)
  assert.equal(store.latest(doc).status, '待审核')
  assert.equal(hits().length, 0)
  assert.throws(() => store.review(id, true, '', maintainer))
  assert.throws(() => store.review(id, false, '', reviewer))
  store.review(id, false, '核对来源说明', reviewer)
  assert.equal(store.latest(doc).status, '草稿')
  assert.equal(store.latest(doc).rejection, '核对来源说明')
  store.submit(id, maintainer)
  store.review(id, true, '', reviewer)
  assert.equal(doc.currentVersion, 1)
  assert.equal(store.latest(doc).status, '已发布')
  assert.deepEqual(hits().map(h => h.text), expected)
})

test('T04: 在原有八条种子中匹配中文长问题，并返回可核对的引用', async () => {
  const store = createKnowledgeStore(), id = await publish(store)
  for (const q of [question, '配电柜指示异常怎么办？']) {
    const hits = store.search(q, '供配电', 'A', maintainer).filter(h => h.documentId === id)
    assert.equal(hits.length, 2)
    for (const hit of hits) {
      assert.equal(hit.title, input.title)
      assert.equal(hit.type, input.type)
      assert.equal(hit.version, 1)
      assert.equal(hit.project, 'A')
      const version = store.versionOf(hit.documentId, hit.version)
      assert.equal(version.fragments.find(f => f.id === hit.fragmentId).text, hit.text)
      assert.ok(version.body.includes(hit.text))
    }
  }
})

test('T04: 同问题的其他项目资料、访客禁用资料、错误专业不泄漏', async () => {
  const store = createKnowledgeStore(), a = await publish(store), b = await publish(store, { ...input, project: 'B' })
  const ownIds = new Set([a, b])
  const hits = (domain, project, role) => store.search(question, domain, project, role).filter(h => ownIds.has(h.documentId))
  assert.deepEqual([...new Set(hits('供配电', 'A', maintainer).map(h => h.documentId))], [a])
  assert.deepEqual([...new Set(hits('供配电', 'B', reviewer).map(h => h.documentId))], [b])
  assert.equal(hits('供配电', '', maintainer).length, 0)
  assert.equal(hits('消防', 'A', maintainer).length, 0)
  assert.equal(hits('供配电', 'A', ROLES[2]).length, 0)
  assert.equal(hits('供配电', 'A', '未知角色').length, 0)
  assert.equal(store.search('斑马宇航服', '供配电', 'A', maintainer).length, 0)
})

test('T04 漏检回归: 同分片段不能由一份旧资料占满，相关的新资料仍可见', async () => {
  const store = createKnowledgeStore(), id = await publish(store)
  const hits = store.search('配电', '供配电', 'A', maintainer)
  assert.ok(hits.some(h => h.documentId === id), '已发布测试资料被旧资料的同分片段挤出前六条')
  assert.ok(hits.some(h => h.documentId === 'KB-003'), '原有相关知识仍然可见')
  assert.ok(hits.length <= 6)
  assert.deepEqual(hits, store.search('配电', '供配电', 'A', maintainer), '排序必须可重复')
  const longHits = store.search(question, '供配电', 'A', maintainer)
  assert.equal(longHits[0].documentId, id, '高相关度仍优先')
  assert.ok(longHits.every((h, i) => !i || longHits[i - 1].score >= h.score))
})

test('T04: 当前有效版本继续受发布及可检索状态约束', async () => {
  const store = createKnowledgeStore(), id = await publish(store)
  const hits = () => store.search(question, '供配电', 'A', maintainer).filter(h => h.documentId === id)
  const v1 = store.versionOf(id, 1)
  v1.processing = '待校验'
  assert.equal(hits().length, 0)
  v1.processing = '可检索'
  store.save({ ...input, body: '配电柜运行指示异常时，应核对设备编号并联系值班负责人。' }, id, maintainer)
  assert.ok(hits().every(h => h.version === 1))
  await store.process(id, 2, maintainer)
  store.confirm(id, 2, store.versionOf(id, 2).fragments, maintainer)
  store.submit(id, maintainer); store.review(id, true, '', reviewer)
  assert.ok(hits().length > 0)
  assert.ok(hits().every(h => h.version === 2))
  assert.equal(v1.body, input.body)
  store.archive(id, reviewer)
  assert.equal(hits().length, 0)
})

test('T02: 只有附件不可提取，模拟失败后仍可重试', async () => {
  const store = createKnowledgeStore([])
  const id = store.save({ ...input, body: '', attachment: { name: 'synthetic.pdf' } }, null, maintainer)
  assert.equal(await store.process(id, 1, maintainer), false)
  assert.equal(store.versionOf(id, 1).fragments.length, 0)
  assert.throws(() => store.submit(id, maintainer))
  store.save(input, id, maintainer)
  assert.equal(await store.process(id, 1, maintainer, true), false)
  assert.equal(await store.process(id, 1, maintainer), true)
  assert.equal(store.versionOf(id, 1).processing, '待校验')
})

test('T04 状态丢失回归: 各阶段重新初始化仍保持同一资料与发布后引用', async () => {
  const storage = memoryStorage()
  let store = createKnowledgeStore(undefined, storage)
  const restart = () => {
    store.stopPersistence()
    store = createKnowledgeStore(undefined, storage)
    assert.equal(store.storageState.error, '')
  }
  const id = store.save(input, null, maintainer)
  restart()
  assert.equal(store.versionOf(id, 1).body, input.body)
  assert.equal(store.versionOf(id, 1).status, '草稿')
  await store.process(id, 1, maintainer)
  restart()
  assert.equal(store.versionOf(id, 1).processing, '待校验')
  store.confirm(id, 1, store.versionOf(id, 1).fragments, maintainer)
  restart()
  assert.equal(store.versionOf(id, 1).processing, '可检索')
  store.submit(id, maintainer)
  restart()
  assert.equal(store.versionOf(id, 1).status, '待审核')
  store.review(id, true, '', reviewer)
  restart()
  assert.equal(store.getDocument(id).currentVersion, 1)
  assert.equal(store.versionOf(id, 1).reviews.at(-1).result, '确认发布')
  assert.deepEqual(store.search(question, '供配电', 'A', maintainer).filter(h => h.documentId === id).map(h => h.text), expected)
  const nextId = store.save(input, null, maintainer)
  assert.notEqual(nextId, id, '恢复后不能重复分配资料 ID')
  assert.equal(new Set(store.documents.map(d => d.id)).size, store.documents.length)
  store.stopPersistence()
})

test('T04: 恢复包含待发布新版的快照时，旧有效版和权限仍然成立', async () => {
  const storage = memoryStorage(), store = createKnowledgeStore(undefined, storage)
  const id = await publish(store)
  store.save({ ...input, body: '配电柜巡检时核对设备编号。' }, id, maintainer)
  store.stopPersistence()
  const restored = createKnowledgeStore(undefined, storage)
  assert.equal(restored.getDocument(id).currentVersion, 1)
  assert.equal(restored.latest(restored.getDocument(id)).number, 2)
  const hits = restored.search(question, '供配电', 'A', maintainer).filter(h => h.documentId === id)
  assert.deepEqual(hits.map(h => h.text), expected)
  assert.ok(hits.every(h => h.version === 1))
  assert.ok(restored.search(question, '供配电', 'B', maintainer).every(h => h.documentId !== id))
  restored.stopPersistence()
})

test('T04: 存储不可写或损坏时明确报错，不静默覆盖原缓存', () => {
  const storage = memoryStorage()
  storage.setItem(KNOWLEDGE_STORAGE_KEY, '{broken')
  const broken = createKnowledgeStore(undefined, storage)
  assert.match(broken.storageState.error, /无法恢复/)
  broken.save(input, null, maintainer)
  assert.equal(storage.getItem(KNOWLEDGE_STORAGE_KEY), '{broken')
  const blocked = createKnowledgeStore([], { getItem: () => null, setItem: () => { throw new Error('quota') } })
  const id = blocked.save(input, null, maintainer)
  assert.match(blocked.storageState.error, /保存失败/)
  assert.equal(blocked.versionOf(id, 1).body, input.body)
  blocked.stopPersistence()
})

test('T02: 恢复被页面初始化中断的加工时明确失败并允许重试', async () => {
  const storage = memoryStorage(), store = createKnowledgeStore([], storage)
  const id = store.save(input, null, maintainer)
  const pending = store.process(id, 1, maintainer)
  store.stopPersistence()
  const restored = createKnowledgeStore([], storage)
  assert.equal(restored.versionOf(id, 1).processing, '加工失败')
  assert.match(restored.versionOf(id, 1).error, /中断/)
  assert.equal(restored.getDocument(id).currentVersion, null)
  assert.equal(await restored.process(id, 1, maintainer), true)
  assert.deepEqual(restored.versionOf(id, 1).fragments.map(f => f.text), expected)
  await pending
  restored.stopPersistence()
})

test('T04: 执行实际问答组件的 Mock 发送与无命中分支，fetch 调用为零', async t => {
  // Compile the real SFC script with the existing Vue compiler; no copied answer implementation.
  const sourceUrl = new URL('../src/views/AiChatView.vue', import.meta.url)
  const { descriptor } = parse(await readFile(sourceUrl, 'utf8'))
  const compiled = compileScript(descriptor, { id: 'knowledge-ai-t04' }).content.replace(
    /from (['"])([^'"]+)\1/g,
    (_, quote, specifier) => `from ${quote}${specifier.startsWith('.') ? new URL(specifier, sourceUrl).href : import.meta.resolve(specifier)}${quote}`,
  )
  const { default: Component } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
  const renderer = createRenderer({
    createComment: () => ({}), insert() {}, remove() {}, parentNode: () => null, nextSibling: () => null,
  })
  const app = renderer.createApp({ ...Component, render: () => null })
  app.provide(routerKey, { push() {} })
  const vm = app.mount({}), state = vm.$.setupState
  const oldContext = { ...demoContext }, oldIds = new Set(knowledgeStore.documents.map(d => d.id))
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('禁止真实 AI 请求') })
  try {
    assert.equal(state.mode, 'mock')
    const id = await publish(knowledgeStore)
    demoContext.project = 'A'; demoContext.role = maintainer
    await nextTick()
    state.setSystem('供配电')
    state.inputText = question
    await state.sendDeepMsg()
    const answer = state.messages.at(-1)
    assert.equal(answer.mock, true)
    assert.ok(answer.context.includes('项目A'))
    assert.deepEqual(answer.sources.filter(h => h.documentId === id).map(h => h.text), expected)
    state.inputText = '斑马宇航服'
    await state.sendDeepMsg()
    assert.match(state.messages.at(-1).text, /暂无有效知识依据/)
    assert.deepEqual(state.messages.at(-1).sources, [])
    assert.equal(fetchMock.mock.callCount(), 0)
    assert.equal(state.deepHistory.length, 0)
  } finally {
    app.unmount()
    Object.assign(demoContext, oldContext)
    for (let i = knowledgeStore.documents.length - 1; i >= 0; i--) {
      if (!oldIds.has(knowledgeStore.documents[i].id)) knowledgeStore.documents.splice(i, 1)
    }
  }
})
