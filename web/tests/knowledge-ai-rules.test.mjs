import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRenderer, nextTick } from 'vue'
import { parse, compileScript } from 'vue/compiler-sfc'
import { routerKey } from 'vue-router'
import { createKnowledgeStore, knowledgeStore, demoContext, ROLES, MATERIAL_TYPES, KNOWLEDGE_STORAGE_KEY } from '../src/data/knowledgeAiMock.js'

// Synthetic values are not equipment safety standards. No network or extra dependencies.
const role = ROLES[0]
const context = { domain:'供配电', device:'配电柜', project:'A', role }
const question = '配电柜巡检，柜内温度 实测85℃，应该如何复核？'
const material = {title:'规则测试用巡检资料（合成）',type:MATERIAL_TYPES[4],domain:'供配电',scope:'平台通用',project:'',source:'自动测试Mock',body:'配电柜巡检时应核对运行指示与交接班记录。读数异常时联系值班负责人复核。'}
async function published(store, input=material) {
  const id=store.save(input,null,role)
  await store.process(id,1,role);store.confirm(id,1,store.versionOf(id,1).fragments,role)
  store.submit(id,role);store.review(id,true,'',ROLES[1]);return id
}
function threshold(sourceId,fields={}) {return {name:'温度异常条件（Mock）',type:'阈值',domain:'供配电',device:'配电柜',metric:'柜内温度',operator:'>',value:80,unit:'℃',scope:'项目专属',project:'A',sourceId,applicability:'纯合成数值，非安全标准',start:'2020-01-01T00:00:00Z',end:'2099-12-31T23:59:59Z',...fields}}
function reasoning(thresholdId,knowledgeId,fields={}) {return {name:'巡检复核（Mock）',domain:'供配电',device:'配电柜',scope:'项目专属',project:'A',scenario:'巡检温度复核',keywords:'巡检，温升',thresholdIds:[thresholdId],knowledgeIds:[knowledgeId],steps:'核对设备、测量单位及时间',advice:'交由值班负责人复核',safety:'禁止据Mock结果调整设备保护值',...fields}}
async function fixture(store=createKnowledgeStore([]),scope='项目专属') {
  const kid=await published(store),tid=store.saveThreshold(threshold(kid,{scope}),null,role)
  store.setRuleEnabled('threshold',tid,true,role)
  const rid=store.saveReasoning(reasoning(tid,kid,{scope}),null,role)
  store.setRuleEnabled('reasoning',rid,true,role)
  return {store,kid,tid,rid}
}

test('R01/R02: 必填、作用范围、演示职责；配置只存ID并关联当前有效对象',async()=>{
  const {store,kid,tid,rid}=await fixture()
  assert.equal(store.ruleById('threshold',tid).enabled,true)
  assert.throws(()=>store.saveThreshold(threshold(kid,{project:''}),null,role))
  assert.throws(()=>store.saveThreshold(threshold(kid,{value:Infinity}),null,role))
  for(const value of [null,undefined,'',' '])assert.throws(()=>store.saveThreshold(threshold(kid,{value}),null,role))
  assert.throws(()=>store.saveThreshold(threshold(kid,{end:'2019-01-01'}),null,role))
  assert.throws(()=>store.saveThreshold(threshold(kid),null,ROLES[2]))
  const config=store.currentRule(store.ruleById('reasoning',rid))
  assert.deepEqual(config.thresholdIds,[tid]);assert.deepEqual(config.knowledgeIds,[kid])
  for(const key of ['value','unit','operator','threshold','thresholds'])assert.equal(key in config,false)
  store.setRuleEnabled('threshold',tid,false,role)
  assert.throws(()=>store.saveReasoning(reasoning(tid,kid),null,role))
})

test('R03: 真实提供的示例读数触发规则，回答与知识/规则引用具有有效版本',async()=>{
  const {store,kid,tid,rid}=await fixture(), result=store.runRules(question,context)
  assert.equal(result.configs[0].id,rid);assert.equal(result.decisions[0].status,'triggered')
  assert.equal(result.decisions[0].measurement.value,85)
  const reference=result.decisions[0].rules[0]
  assert.equal(reference.id,tid);assert.equal(reference.number,1)
  assert.equal(reference.source.documentId,kid);assert.equal(reference.source.version,1)
  assert.equal(result.knowledge.length,2)
  assert.ok(result.knowledge.every(k=>store.versionOf(k.documentId,k.version).body.includes(k.text)))
  assert.match(result.configs[0].advice,/值班负责人/);assert.match(result.notice,/Mock/)
  assert.equal(store.runRules(question.replace('85','80'),context).decisions[0].status,'not-triggered')
})

test('R03: 无实测、比较阈值、单位不符、多读数及多轮补充不足时不宣称超阈',async()=>{
  const {store}=await fixture()
  for(const q of ['配电柜巡检怎么处理？','配电柜巡检柜内温度>80℃','配电柜巡检柜内温度80℃是阈值','配电柜巡检柜内温度实测85°F','配电柜巡检柜内温度实测85℃、柜内温度实测75℃']) {
    assert.equal(store.runRules(q,context).decisions[0].status,'missing',q)
  }
  assert.equal(store.runRules(question,{...context,measurementText:'继续说明'}).decisions[0].status,'missing')
  assert.equal(store.runRules('巡检温升怎么处理？',{...context,device:''}).configs.length,0)
  assert.equal(store.runRules('无关场景',context).configs.length,0)
})

test('R04: 停用/过期/未到生效时间/设备不匹配的规则不出现在新的生效引用',async()=>{
  const {store,tid,rid}=await fixture(), first=store.runRules(question,context)
  store.setRuleEnabled('threshold',tid,false,role)
  const disabled=store.runRules(question,context)
  assert.equal(disabled.decisions.length,0);assert.match(disabled.gaps.join(),/停用/)
  assert.equal(first.decisions[0].rules[0].id,tid,'历史记录保持快照')
  store.setRuleEnabled('threshold',tid,true,role)
  for(const at of ['2100-01-01','2019-01-01'])assert.equal(store.runRules(question,{...context,at}).decisions.length,0)
  assert.equal(store.runRules(question,{...context,device:'变压器'}).decisions.length,0)
  store.setRuleEnabled('reasoning',rid,false,role)
  assert.equal(store.runRules(question,context).configs.length,0)
})

test('R05: 未关联但范围和时间重叠的不同标准也必须报冲突，不选最大最小最新',async()=>{
  const {store,kid,tid}=await fixture()
  const conflict=store.saveThreshold(threshold(kid,{name:'另一标准（Mock）',scope:'平台通用',value:90}),null,role)
  store.setRuleEnabled('threshold',conflict,true,role)
  const result=store.runRules(question,context), decision=result.decisions[0]
  assert.equal(decision.status,'conflict');assert.equal(decision.measurement,undefined)
  assert.deepEqual(new Set(decision.rules.map(v=>v.id)),new Set([tid,conflict]))
  assert.ok(decision.rules.every(v=>v.source?.documentId===kid))
  assert.equal(store.thresholdConflicts(tid,context)[0].id,conflict)
  store.setRuleEnabled('threshold',conflict,false,role)
  assert.equal(store.runRules(question,context).decisions[0].status,'triggered')
})

test('R05: 相同标准列出共同依据；不同单位、判断条件报冲突；无时间重叠不冲突',async()=>{
  const {store,kid,tid}=await fixture()
  const duplicate=store.saveThreshold(threshold(kid,{name:'相同标准'}),null,role)
  store.setRuleEnabled('threshold',duplicate,true,role)
  assert.equal(store.runRules(question,context).decisions[0].status,'triggered')
  assert.equal(store.runRules(question,context).decisions[0].rules.length,2)
  store.saveThreshold(threshold(kid,{operator:'>='}),duplicate,role)
  assert.equal(store.thresholdConflicts(tid,context).length,1)
  store.saveThreshold(threshold(kid,{unit:'°F'}),duplicate,role)
  assert.equal(store.runRules(question,context).decisions[0].status,'conflict')
  store.saveThreshold(threshold(kid,{unit:'mW'}),tid,role)
  store.setRuleEnabled('threshold',duplicate,false,role)
  assert.equal(store.runRules('配电柜巡检，柜内温度实测85MW',context).decisions[0].status,'missing','单位大小写有物理含义，不能自动换算')
  assert.equal(store.runRules('配电柜巡检，柜内温度实测85mW',context).decisions[0].status,'triggered')
  store.saveThreshold(threshold(kid,{unit:'MW'}),duplicate,role)
  store.setRuleEnabled('threshold',duplicate,true,role)
  assert.equal(store.runRules(question,context).decisions[0].status,'conflict')
  store.saveThreshold(threshold(kid,{start:'2100-01-01',end:'2101-01-01'}),duplicate,role)
  assert.equal(store.thresholdConflicts(tid,context).length,0)
})

test('R06: A专属在B/无项目/访客不生效；平台规则按同一范围门禁参与匹配',async()=>{
  const {store,kid,tid}=await fixture()
  for(const ctx of [{project:'B'},{project:''},{role:ROLES[2]},{role:'未知角色'},{domain:'消防'}])assert.equal(store.runRules(question,{...context,...ctx}).configs.length,0)
  assert.throws(()=>store.saveReasoning(reasoning(tid,kid,{scope:'平台通用'}),null,role))
  const common=store.saveThreshold(threshold(kid,{scope:'平台通用'}),null,role)
  store.setRuleEnabled('threshold',common,true,role)
  const rr=store.saveReasoning(reasoning(common,kid,{scope:'平台通用'}),null,role)
  store.setRuleEnabled('reasoning',rr,true,role)
  for(const project of ['A','B',''])assert.ok(store.runRules(question,{...context,project}).decisions.some(d=>d.rules.some(v=>v.id===common)))
  assert.ok(store.runRules(question,{...context,project:'B'}).decisions.every(d=>d.rules.every(v=>v.id!==tid)))
  const privateKnowledge=await published(store,{...material,scope:'项目专属',project:'A'})
  assert.throws(()=>store.saveThreshold(threshold(privateKnowledge,{scope:'平台通用'}),null,role))
})

test('版本: 修订保留历史并即时读取当前阈值；知识新草稿不影响旧有效版，归档后提示依据不足',async()=>{
  const {store,kid,tid,rid}=await fixture()
  store.saveThreshold(threshold(kid,{value:90}),tid,role)
  const r=store.runRules(question,context)
  assert.equal(r.decisions[0].status,'not-triggered');assert.equal(r.decisions[0].rules[0].number,2)
  assert.equal(store.ruleById('threshold',tid).versions[0].value,80)
  assert.deepEqual(store.currentRule(store.ruleById('reasoning',rid)).thresholdIds,[tid])
  store.save({...material,body:'新版未发布'},kid,role)
  assert.ok(store.runRules(question,context).knowledge.every(s=>s.version===1))
  store.archive(kid,ROLES[1])
  const missing=store.runRules(question,context)
  assert.equal(missing.decisions[0].status,'insufficient');assert.equal(missing.knowledge.length,0)
  assert.match(missing.summary,/不能形成确定结论/)
})

test('会话兼容: 旧schema1资料快照恢复、新规则与版本共同恢复且ID不重复',async()=>{
  const map=new Map(), storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}
  const original=createKnowledgeStore([],storage),kid=await published(original)
  original.stopPersistence()
  const snapshot=JSON.parse(map.get(KNOWLEDGE_STORAGE_KEY));delete snapshot.thresholdRules;delete snapshot.reasoningRules
  map.set(KNOWLEDGE_STORAGE_KEY,JSON.stringify(snapshot))
  const current=createKnowledgeStore([],storage)
  assert.equal(current.versionOf(kid,1).status,'已发布');assert.equal(current.storageState.error,'')
  const {tid,rid}=await fixture(current)
  current.saveThreshold(threshold(kid,{value:90}),tid,role);current.stopPersistence()
  const restored=createKnowledgeStore([],storage)
  assert.equal(restored.storageState.error,'');assert.equal(restored.ruleById('threshold',tid).versions.length,2)
  assert.deepEqual(restored.currentRule(restored.ruleById('reasoning',rid)).thresholdIds,[tid])
  assert.notEqual(restored.saveThreshold(threshold(kid),null,role),tid)
  assert.equal(restored.versionOf(kid,1).body,material.body);restored.stopPersistence()
})

test('关联资料单独失效时，即使阈值来源仍有效，也不能形成确定结论',async()=>{
  const {store,kid,tid,rid}=await fixture()
  const extra=await published(store,{...material,title:'单独关联的Mock核实资料'})
  store.saveReasoning(reasoning(tid,kid,{knowledgeIds:[extra]}),rid,role)
  store.archive(extra,ROLES[1])
  const result=store.runRules(question,context)
  assert.equal(result.decisions[0].rules[0].source.documentId,kid)
  assert.equal(result.decisions[0].status,'insufficient')
  assert.match(result.summary,/不能形成确定结论/)
})

test('R03/R04: 实际AiChat组件调用规则层；停用立即影响新问答，fetch为0',async t=>{
  const sourceUrl=new URL('../src/views/AiChatView.vue',import.meta.url)
  const {descriptor}=parse(await readFile(sourceUrl,'utf8'))
  const compiled=compileScript(descriptor,{id:'knowledge-ai-rules'}).content.replace(/from (['"])([^'"]+)\1/g,(_,quote,specifier)=>`from ${quote}${specifier.startsWith('.')?new URL(specifier,sourceUrl).href:import.meta.resolve(specifier)}${quote}`)
  const {default:Component}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
  const renderer=createRenderer({createComment:()=>({}),insert(){},remove(){},parentNode:()=>null,nextSibling:()=>null})
  const app=renderer.createApp({...Component,render:()=>null});app.provide(routerKey,{push(){}})
  const state=app.mount({}).$.setupState, oldContext={...demoContext}
  const fetchMock=t.mock.method(globalThis,'fetch',()=>{throw new Error('No real AI')})
  try{
    const {tid}=await fixture(knowledgeStore)
    demoContext.project='A';demoContext.role=role;await nextTick();state.setSystem('供配电')
    state.inputText=question;await state.sendDeepMsg()
    assert.equal(state.messages.at(-1).ruleResult.decisions[0].status,'triggered')
    knowledgeStore.setRuleEnabled('threshold',tid,false,role)
    state.inputText=question;await state.sendDeepMsg()
    assert.equal(state.messages.at(-1).ruleResult.decisions.length,0)
    assert.equal(state.deepHistory.length,0);assert.equal(fetchMock.mock.callCount(),0)
  }finally{app.unmount();Object.assign(demoContext,oldContext)}
})
