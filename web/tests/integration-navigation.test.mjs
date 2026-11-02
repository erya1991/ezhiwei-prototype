import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname, relative } from 'node:path'
import { parse, compileScript } from '@vue/compiler-sfc'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref, watch, reactive, nextTick, effectScope } from 'vue'

const webRoot = fileURLToPath(new URL('../', import.meta.url))
const routerPath = resolve(webRoot, 'src/router/index.js')
const routerSource = readFileSync(routerPath, 'utf8')
const sidebarSource = readFileSync(resolve(webRoot, 'src/components/Sidebar.vue'), 'utf8')
const productionPaths = [
  '/login', '/', '/knowledge', '/knowledge-processing', '/threshold-rules',
  '/reasoning-rules', '/ai-agent', '/work-order', '/snapshot', '/energy', '/predict',
  '/equipment/categories', '/equipment/ledger', '/equipment/spaces',
  '/inspection/rules', '/inspection/plans', '/inspection/tasks', '/inspection/records',
  '/personnel/organization', '/safety/responsibility-system', '/safety/responsibility-subject',
  '/risk/identify', '/risk/catalog', '/risk/measure', '/risk/plan',
  '/hazard/report', '/hazard/overview', '/hazard/dispatch', '/hazard/inspect', '/settings'
]

function routerHarness(dev = false) {
  const authenticated = ref(false)
  // Exercise the real route records and guard with in-memory history. Component imports
  // are checked on disk below; Node does not load Vue SFCs while testing navigation.
  const source = routerSource
    .replace(/^import .* from .*$/gm, '')
    .replaceAll('import.meta.env.DEV', String(dev))
    .replace(/\(\) => import\('[^']+'\)/g, "() => Promise.resolve({ render: () => null })")
    .replace('export default router', 'return router')
  const router = new Function('createRouter', 'createWebHistory', 'isAuthenticated', source)(
    createRouter, createMemoryHistory, authenticated
  )
  return { router, authenticated }
}

function sidebarHarness(path = '/') {
  const { descriptor } = parse(sidebarSource)
  const compiled = compileScript(descriptor, { id: 'integration-sidebar' }).content
    .replace(/^import .* from .*$/gm, '')
    .replace('export default', 'return')
  const route = reactive({ path })
  const component = new Function('ref', 'watch', 'useRoute', compiled)(ref, watch, () => route)
  const scope = effectScope()
  const state = scope.run(() => component.setup({}, { expose() {} }))
  return { route, state, stop: () => scope.stop() }
}

function assertExactCase(path) {
  const parts = relative(webRoot, path).split(/[\\/]/)
  let current = webRoot
  for (const part of parts) {
    assert.ok(readdirSync(current).includes(part), `Missing or incorrectly cased import: ${path}`)
    current = resolve(current, part)
  }
}

test('integration: retain all 30 production routes, unique paths/names and exact-case SFC imports', () => {
  const { router } = routerHarness()
  const routes = router.getRoutes()
  assert.equal(routes.length, 30)
  assert.deepEqual(routes.map(route => route.path).sort(), [...productionPaths].sort())
  assert.equal(new Set(routes.map(route => route.name)).size, routes.length)
  const imports = [...routerSource.matchAll(/component: \(\) => import\('([^']+)'\)/g)]
  assert.equal(imports.length, 31)
  for (const [, importPath] of imports) assertExactCase(resolve(dirname(routerPath), importPath))
  assert.equal(router.resolve('/knowledge').meta.title, '知识资料管理')
  assert.equal(router.resolve('/ai-agent').meta.title, '智能问答')
})

test('integration: every protected production page has exactly one visible menu entry', () => {
  const harness = sidebarHarness()
  try {
    const { items } = harness.state
    const links = items.flatMap(item => item.children || [item])
    assert.equal(items.length, 14)
    assert.equal(items.filter(item => item.children).length, 8)
    assert.equal(new Set(items.map(item => item.path)).size, items.length)
    assert.equal(new Set(links.map(item => item.path)).size, 29)
    assert.equal(new Set(links.map(item => item.label)).size, 29)
    assert.deepEqual(links.map(item => item.path).sort(), productionPaths.filter(path => path !== '/login').sort())
    for (const [label, count] of [
      ['专家知识库', 3], ['AI智能体', 2], ['设备管理', 3], ['巡检管理', 4],
      ['人员调度', 1], ['安全责任管理体系', 2], ['安全风险分级管控', 4], ['隐患排查治理', 4]
    ]) assert.equal(items.find(item => item.label === label)?.children.length, count, label)
    assert.equal(links.find(item => item.path === '/snapshot').label, 'AI随手拍（历史）')
    assert.equal(links.find(item => item.path === '/hazard/report').label, 'AI随手拍')
  } finally { harness.stop() }
})

test('integration: all eight groups toggle, replace the previous group and collapse on a second click', () => {
  const harness = sidebarHarness()
  try {
    const { state } = harness
    assert.equal(state.expandedGroup.value, '')
    for (const item of state.items.filter(item => item.children)) {
      state.toggleGroup(item.path)
      assert.equal(state.expandedGroup.value, item.path)
    }
    const last = state.expandedGroup.value
    state.toggleGroup(last)
    assert.equal(state.expandedGroup.value, '')
  } finally { harness.stop() }
})

test('integration: direct entry, route changes and history navigation select only the matching group/page', async () => {
  const harness = sidebarHarness('/inspection/records')
  try {
    const { state, route } = harness
    assert.equal(state.expandedGroup.value, '/inspection/rules')
    for (const path of productionPaths.filter(path => path !== '/login')) {
      route.path = path
      await nextTick()
      const active = state.items.filter(state.isActive)
      assert.equal(active.length, 1, path)
      assert.equal(state.expandedGroup.value, active[0].children ? active[0].path : '', path)
    }
    route.path = '/risk/catalog-extra'
    await nextTick()
    assert.equal(state.expandedGroup.value, '')
    assert.equal(state.items.filter(state.isActive).length, 0)
  } finally { harness.stop() }
})

test('integration: original login guard protects every production page and redirects an authenticated login', async () => {
  const { router, authenticated } = routerHarness()
  for (const path of productionPaths.filter(path => path !== '/login')) {
    await router.push(path)
    assert.equal(router.currentRoute.value.name, 'login', path)
  }
  authenticated.value = true
  for (const path of productionPaths.filter(path => path !== '/login')) {
    await router.push(path)
    assert.equal(router.currentRoute.value.path, path)
  }
  await router.push('/login')
  assert.equal(router.currentRoute.value.name, 'dashboard')
})

test('integration: UI baseline is development-only and remains behind the same login guard', async () => {
  const production = routerHarness()
  assert.ok(!production.router.getRoutes().some(route => route.path === '/__ui-baseline'))
  const development = routerHarness(true)
  assert.equal(development.router.getRoutes().length, 31)
  await development.router.push('/__ui-baseline')
  assert.equal(development.router.currentRoute.value.name, 'login')
  development.authenticated.value = true
  await development.router.push('/__ui-baseline')
  assert.equal(development.router.currentRoute.value.name, 'ui-baseline')
})
