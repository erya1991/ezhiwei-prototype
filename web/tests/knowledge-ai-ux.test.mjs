import test from 'node:test'
import assert from 'node:assert/strict'
import { createKnowledgeStore, ROLES, MATERIAL_TYPES } from '../src/data/knowledgeAiMock.js'
import { organizeKnowledge, groupSources, meaningfulFragment, adviceExcerpts, deviceOptions, thresholdStatus } from '../src/data/knowledgeAiPresentation.js'

const question = '配电柜巡检，柜内温度 实测85℃，应该如何复核？'
test('UX: 配电柜问题不得以变压器知识作为直接诊断依据，原文可作为相关参考', () => {
  const store = createKnowledgeStore()
  const hits = store.search(question, '供配电', 'A', ROLES[0], 60)
  const result = organizeKnowledge(question, hits, store.versionOf)
  assert.equal(result.direct.length, 0)
  assert.ok(result.related.some(g => g.documentId === 'KB-003'))
  assert.ok(result.related.every(g => g.fragments.every(f => store.versionOf(f.documentId, f.version).body.includes(f.text))))
  assert.deepEqual(adviceExcerpts(result.direct), [])
})

test('UX: 直接相关的新资料仍须经过加工发布；按版本合并原文，并保持项目隔离', async () => {
  const store = createKnowledgeStore(), role = ROLES[0]
  const input = { title: '供配电系统巡检操作说明（UX合成）', type: MATERIAL_TYPES[4], domain: '供配电', device:'配电柜', scope:'项目专属', project:'A', source:'合成示例', body:'配电柜巡检时，首先检查运行指示灯状态，其次核对交接班记录。如发现指示异常，应联系值班负责人进行复核。' }
  const id = store.save(input, null, role)
  const answer = project => organizeKnowledge(question, store.search(question,'供配电',project,role,60),store.versionOf)
  assert.equal(answer('A').direct.length, 0)
  await store.process(id,1,role);store.confirm(id,1,store.versionOf(id,1).fragments,role)
  assert.equal(answer('A').direct.length, 0)
  store.submit(id,role);store.review(id,true,'',ROLES[1])
  const result = answer('A')
  assert.deepEqual(result.direct.map(g => g.documentId), [id])
  assert.equal(result.direct[0].version, 1)
  assert.equal(result.direct[0].fragments.length, 2)
  assert.ok(adviceExcerpts(result.direct).some(f => f.text.includes('值班负责人')))
  assert.ok(result.direct[0].fragments.every(f => input.body.includes(f.text)))
  assert.equal(answer('B').direct.length, 0)
})

test('UX: 标题不能成为独立建议；重复命中合并，历史版本不混合', () => {
  for(const heading of ['一、故障现象','二、根因分析','二、故障树分析（FTA）','三、标准处置SOP','二、救援操作（5-15分钟）','3. 安全注意事项','目录']) assert.equal(meaningfulFragment(heading),false)
  assert.equal(meaningfulFragment('④检查冷却风机运行状态及风道通畅'),true)
  assert.equal(meaningfulFragment('一、检查配电柜运行指示灯'),true)
  const a={documentId:'K',version:1,fragmentId:'f',text:'核对设备编号与交接班记录。'}
  const groups=groupSources([a,{...a},{...a,version:2},{...a,fragmentId:'title',text:'一、故障现象'}])
  assert.equal(groups.length,2)
  assert.equal(groups[0].fragments.length,1)
  assert.equal(adviceExcerpts([{...groups[0],fragments:[{...a,text:'柜体由金属材料组成。'}]}]).length,0)
})

test('UX: 设备候选包含已有自定义值；停用、未到期与过期文案区分', () => {
  assert.ok(deviceOptions('供配电',[{domain:'供配电',device:'配电柜'}],'历史设备').includes('配电柜'))
  assert.ok(deviceOptions('供配电',[],'历史设备').includes('历史设备'))
  const rule={enabled:true,start:'2026-01-01',end:'2027-01-01'}
  assert.equal(thresholdStatus({...rule,enabled:false}),'已停用')
  assert.equal(thresholdStatus(rule,Date.parse('2025-01-01')),'尚未生效')
  assert.equal(thresholdStatus(rule,Date.parse('2028-01-01')),'已到期')
})
