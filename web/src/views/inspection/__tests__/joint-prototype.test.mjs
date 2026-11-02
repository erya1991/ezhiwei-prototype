import test from 'node:test'
import assert from 'node:assert/strict'
import { createJointStore, createDemoState, migrateDemoState, clone, taskEntries, evaluateItem, resultKey } from '../../../data/equipmentInspectionMock.js'
import { createEquipmentSeed, REVISION_SAMPLE_IDS } from '../../../data/equipmentInspectionSeed.js'

const fresh = () => createJointStore(createEquipmentSeed(), { clock: () => new Date('2026-10-29T03:00:00Z') })
test('A: stable asset/category/space/system references resolve to one identity', () => {
  const s = fresh()
  for (const asset of s.state.assets) {
    assert.equal(s.byId(s.state.categories, asset.categoryId).objectType, asset.type)
    assert.ok(s.byId(s.state.spaces, asset.spaceId))
    if (asset.systemId) assert.equal(s.object(asset.systemId).type, '专业系统')
    if (asset.parentId) assert.equal(s.object(asset.parentId).type, '组合设备')
  }
  assert.equal(s.state.assets.filter(row => row.id === 'asset-steam-pipe').length, 1)
  assert.notEqual(s.object('asset-hvac-out').spaceId, s.object('asset-hvac-in').spaceId)
})
test('A: duplicate codes, sibling names, cycles and fourth category levels are rejected', () => {
  const s = fresh(), base = { code:'NEW', name:'新分类', parentId:'', objectType:'', enabled:true, description:'' }
  assert.throws(() => s.saveCategory({...base,code:'SUP'}), /编码已存在/)
  assert.throws(() => s.saveCategory({...base,parentId:'cat-support',name:'热力保障'}), /名称不能重复/)
  assert.throws(() => s.saveCategory({...clone(s.state.categories[0]),parentId:'cat-boiler'}), /循环/)
  assert.throws(() => s.saveCategory({...base,parentId:'cat-boiler'}), /最多三级/)
})
test('A: referenced category identifiers are protected while disabling preserves assets', () => {
  const s = fresh(), row=clone(s.byId(s.state.categories,'cat-boiler'))
  assert.throws(() => s.saveCategory({...row,code:'CHANGED'}), /已被引用/)
  s.saveCategory({...row,enabled:false})
  assert.equal(s.object('asset-boiler-1').categoryId,row.id)
  assert.throws(() => s.saveAsset({...clone(s.object('asset-boiler-1')),id:'',code:'BL-NEW'}), /启用且匹配/)
})
test('A: a new room must reference a floor and have a locating description', () => {
  const s=fresh(), row=clone(s.object('space-boiler'))
  assert.throws(() => s.saveSpace({...row,id:'',code:'NEW-R',name:'新机房',parentId:'space-building'}), /空间层级/)
  assert.throws(() => s.saveSpace({...row,id:'',code:'NEW-R',name:'新机房',location:''}), /现场定位/)
  const saved=s.saveSpace({...row,id:'',code:'NEW-R',name:'新机房'})
  assert.equal(saved.parentId,'space-b1')
})
test('A: building-only fields and referenced room moves are protected', () => {
  const s=fresh(), room=clone(s.object('space-boiler'))
  assert.throws(()=>s.saveSpace({...room,structure:'框架'}), /仅适用于楼栋/)
  assert.throws(()=>s.saveSpace({...room,parentId:'space-f1'}), /已有下级或引用/)
})
test('A: directory categories cannot become assets and identifiers cannot change', () => {
  const s=fresh(), row=clone(s.object('asset-boiler-1'))
  assert.throws(()=>s.saveAsset({...row,id:'',code:'TEST',categoryId:'cat-heat'}), /实例分类/)
  assert.throws(()=>s.saveAsset({...row,code:'MOVED'}), /编号不可修改/)
  assert.throws(()=>s.saveAsset({...row,spaceId:'',location:''}), /准确位置/)
})
test('A: system/composition relations reject self-reference and wrong target types', () => {
  const s=fresh(), row=clone(s.object('asset-hvac-group'))
  assert.throws(()=>s.saveAsset({...row,parentId:row.id}), /上级组合/)
  assert.throws(()=>s.saveAsset({...row,systemId:'asset-boiler-1'}), /专业系统/)
})
test('A: optional meters are independent from rules and require real locating information', () => {
  const s=fresh(), row=clone(s.object('asset-boiler-2'))
  s.saveAsset(row)
  assert.equal(s.object(row.id).meters.length,0)
  assert.throws(()=>s.saveAsset({...row,meters:[{name:'压力表',location:''}]}), /读取位置必填/)
})
test('A: explicit room/facility links change only their own relationship set', () => {
  const s=fresh()
  s.saveSpaceFacilities('space-boiler',[])
  assert.deepEqual(s.facilityIds('space-boiler'),[])
  assert.deepEqual(s.facilityIds('space-air'),['asset-air-pipe'])
  assert.throws(()=>s.saveSpaceFacilities('space-boiler',['asset-boiler-1']), /已登记设施/)
})
test('A: storage failure preserves current session state and reports persistence limit', () => {
  const s=createJointStore(createEquipmentSeed(),{storage:{setItem(){throw new Error('quota')}}})
  s.saveCategory({code:'NEW',name:'演示新增分类',parentId:'',objectType:'',enabled:true,description:''})
  assert.ok(s.state.categories.some(row=>row.code==='NEW'))
  assert.match(s.notice.persistence,/刷新可能丢失/)
})

const configured = () => createJointStore(createDemoState(), { clock: () => new Date('2026-10-29T03:00:00Z') })
test('B: one boiler rule expands both real boilers once into their existing room', () => {
  const s=configured(), result=s.preview('rule-boiler',['asset-boiler-1','asset-boiler-2'])
  assert.deepEqual(result.issues,[])
  assert.equal(result.points.length,1)
  assert.equal(result.objectCount,2)
  assert.equal(result.itemCount,6)
  assert.deepEqual(result.points[0].groups.map(group=>group.object.id),['asset-boiler-1','asset-boiler-2'])
})
test('B: comprehensive room rule assigns independent room, boiler and shared-pipe results', () => {
  const s=configured(), result=s.preview('rule-boiler-room',['space-boiler'])
  assert.deepEqual(result.issues,[])
  assert.deepEqual(result.points[0].groups.map(group=>group.object.id),['space-boiler','asset-boiler-1','asset-boiler-2','asset-steam-pipe'])
  assert.equal(result.itemCount,9)
})
test('B: missing required relationships block activation instead of creating empty coverage', () => {
  const s=configured(), result=s.preview('rule-boiler-room',['space-boiler-incomplete'])
  assert.ok(result.issues.some(issue=>issue.includes('待补充关键关系')))
  assert.ok(s.planIssues(s.byId(s.state.plans,'plan-incomplete')).length)
  assert.throws(()=>s.togglePlan('plan-incomplete'),/待补充/)
})
test('B: wrong category, model and item operating conditions are visibly incompatible', () => {
  const s=configured()
  assert.match(s.preview('rule-boiler',['asset-compressor-1']).issues.join(''),/分类不适用/)
  s.object('asset-boiler-2').model='OTHER'
  assert.match(s.preview('rule-boiler',['asset-boiler-2']).issues.join(''),/型号不适用/)
  const rule=clone(s.byId(s.state.rules,'rule-boiler-room'));rule.groups[1].items[0].states=['备用']
  assert.match(s.preview(rule,['space-boiler']).issues.join(''),/工况不适用/)
})
test('B: three power rooms form three points using the same rule and plan', () => {
  const s=configured(), result=s.preview('rule-power',['space-power-b1','space-power-f1','space-power-f2'])
  assert.deepEqual(result.issues,[])
  assert.equal(result.points.length,3)
  assert.equal(result.itemCount,9)
})
test('B: rule publication checks units, option validity, reference bounds and required groups', () => {
  const s=configured(), original=clone(s.byId(s.state.rules,'rule-boiler'))
  let rule=clone(original);rule.groups[0].items[0].unit=''
  assert.throws(()=>s.saveRule(rule,true),/计量单位必填/)
  rule=clone(original);rule.groups[0].items[0].lower=2;rule.groups[0].items[0].upper=1
  assert.throws(()=>s.saveRule(rule,true),/下限不能大于上限/)
  rule=clone(original);rule.groups[0].items=[]
  assert.throws(()=>s.saveRule(rule,true),/未配置检查项|没有检查项/)
})
test('B: editing a published rule creates a distinct version and leaves old plans bound', () => {
  const s=configured(), old=clone(s.byId(s.state.rules,'rule-boiler')), input=clone(old)
  input.groups[0].items[0].upper=0.7
  const saved=s.saveRule(input,true)
  assert.equal(saved.version,2);assert.notEqual(saved.id,old.id)
  assert.equal(s.byId(s.state.rules,old.id).groups[0].items[0].upper,0.8)
  assert.equal(s.byId(s.state.plans,'plan-boiler').ruleId,old.id)
})
test('B: changed object relationships invalidate plan confirmation until a fresh preview', () => {
  const s=configured(), plan=s.byId(s.state.plans,'plan-boiler-room')
  assert.deepEqual(s.planIssues(plan),[])
  s.saveSpaceFacilities('space-boiler',[])
  assert.match(s.planIssues(plan).join(''),/待补充|重新展开/)
  assert.throws(()=>s.generateTask(plan.id,'2026-10-29','09:00'),/待补充/)
})
test('B: activation requires a real scope, confirmation, execution slots and person', () => {
  const s=configured(), plan=clone(s.byId(s.state.plans,'plan-boiler'))
  assert.throws(()=>s.savePlan({...plan,rootIds:[]},true),/实际检查对象/)
  assert.throws(()=>s.savePlan({...plan,confirmation:''},true),/重新展开并确认/)
  assert.throws(()=>s.savePlan({...plan,personId:''},true),/主执行人/)
  assert.throws(()=>s.savePlan({...plan,slots:[{start:'08:00',end:'07:00'}]},true),/截止晚于开始/)
})
test('B: generation rejects past dates, inactive plans, off-cycle dates and duplicate time slots', () => {
  const s=configured()
  const originalCount=s.state.tasks.length
  assert.throws(()=>s.generateTask('plan-boiler','2026-10-28','08:00'),/过往日期/)
  s.generateTask('plan-boiler','2026-10-29','08:00')
  assert.throws(()=>s.generateTask('plan-boiler','2026-10-29','08:00'),/重复生成/)
  assert.throws(()=>s.generateTask('plan-boiler','2026-10-29','09:30'),/已配置时段/)
  s.togglePlan('plan-boiler')
  assert.throws(()=>s.generateTask('plan-boiler','2026-10-29','10:00'),/已启用计划/)
  assert.equal(s.state.tasks.length,originalCount+1)
  const plan=clone(s.byId(s.state.plans,'plan-power'));plan.cycle='每周';plan.weekDays=[1]
  assert.equal(s.scheduledOn(plan,'2026-10-29'),false)
})

const newBoilerTask=s=>s.generateTask('plan-boiler','2026-10-29','14:00')
function completeInputs(task) {
  return Object.fromEntries(taskEntries(task).map(({item,key})=>[key,{value:item.type==='数值'?(item.unit==='MPa'?0.6:item.unit==='℃'?140:230):item.type==='状态'?item.normalOptions[0] || item.options[0]:item.type==='文本'?'现场观察记录':'本地演示照片',note:'',photos:item.type==='照片'?[{name:'demo.png',dataUrl:'data:image/png;base64,AA=='}]:[]}]))
}
test('C: generated tasks start entirely blank and never inherit seeded readings or normal states', () => {
  const s=configured(),task=newBoilerTask(s)
  assert.deepEqual(task.results,{})
  assert.equal(task.status,'待执行')
  assert.equal(s.taskSummary(task),'未检查')
  assert.equal(s.progress(task).requiredFilled,0)
})
test('C: only assigned execution identity may start or save task results', () => {
  const s=configured(),task=newBoilerTask(s)
  assert.throws(()=>s.startTask(task.id,'person-02'),/主执行人/)
  assert.throws(()=>s.saveTaskDraft(task.id,completeInputs(task),'person-01'),/先开始/)
  s.startTask(task.id,'person-01')
  assert.equal(task.status,'进行中');assert.ok(task.startedAt)
})
test('C: required blanks block submission; legitimate zero is treated as a filled abnormal reading', () => {
  const s=configured(),task=newBoilerTask(s)
  s.startTask(task.id,'person-01')
  assert.throws(()=>s.submitTask(task.id,{},'person-01'),/必检未填/)
  const entry=taskEntries(task)[0]
  assert.equal(evaluateItem(entry.item,{value:0}),'异常')
  assert.equal(s.taskErrors(task,{[entry.key]:{value:0,note:'读数为零'}},false).length,0)
})
test('C: invalid numeric syntax is rejected while abnormal finite values can be draft-saved', () => {
  const s=configured(),task=newBoilerTask(s),entry=taskEntries(task)[0]
  s.startTask(task.id,'person-01')
  assert.throws(()=>s.saveTaskDraft(task.id,{[entry.key]:{value:'abc'}},'person-01'),/合法数值/)
  s.saveTaskDraft(task.id,{[entry.key]:{value:'0.92',note:''}},'person-01')
  assert.equal(task.results[entry.key].value,'0.92')
  assert.equal(task.results[entry.key].decision,'异常')
})
test('C: anomaly description is mandatory on submit and persisted in the actual source result', () => {
  const s=configured(),task=newBoilerTask(s),results=completeInputs(task),entry=taskEntries(task)[0]
  const originalRecords=s.records().length
  results[entry.key].value='0.92'
  s.startTask(task.id,'person-01')
  assert.throws(()=>s.submitTask(task.id,results,'person-01'),/异常说明必填/)
  results[entry.key].note='现场读数0.92，已报告值班负责人（模拟）'
  s.submitTask(task.id,results,'person-01')
  assert.equal(task.status,'已完成');assert.equal(s.taskSummary(task),'存在异常')
  const record=s.records().find(row=>row.taskId===task.id && row.key===entry.key)
  assert.equal(record.note,results[entry.key].note)
  assert.equal(record.value,'0.92');assert.equal(record.checkedBy,'person-01');assert.ok(record.checkedAt)
  assert.equal(s.records().length,originalRecords+6)
})
test('C: no valid reference yields no automatic normal result, including cumulative readings', () => {
  const s=configured(),task=newBoilerTask(s),entry=taskEntries(task).find(entry=>entry.item.id==='item-gas')
  assert.equal(evaluateItem(entry.item,{value:'230'}),'未自动判定')
  assert.equal(evaluateItem({...entry.item,lower:0,upper:300,basis:''},{value:'230'}),'未自动判定')
  assert.equal(evaluateItem({...entry.item,lower:0,upper:'',basis:'模拟参考'},{value:'230'}),'正常')
})
test('C: execution, result, and timing remain independent including late abnormal completion', () => {
  const s=configured(),task=newBoilerTask(s),results=completeInputs(task)
  s.startTask(task.id,'person-01');s.submitTask(task.id,results,'person-01')
  assert.equal(task.status,'已完成');assert.equal(s.taskSummary(task),'未自动判定')
  assert.equal(s.timeStatus(task),'未超期')
  const late=clone(task);late.submittedAt='2026-10-29T09:00:00Z'
  assert.equal(s.timeStatus(late),'逾期完成')
  late.status='进行中';late.submittedAt=''
  assert.equal(s.timeStatus(late,'2026-10-29T09:00:00Z'),'已超期')
})
test('C: task and record snapshots survive rule, position, equipment status and plan changes', () => {
  const s=configured(),task=newBoilerTask(s),ruleBefore=clone(task.rule),pointsBefore=clone(task.points)
  const rule=clone(s.byId(s.state.rules,'rule-boiler'));rule.groups[0].items[0].upper=0.5;s.saveRule(rule,true)
  const asset=clone(s.object('asset-boiler-1'));asset.spaceId='space-f1';asset.status='停用';s.saveAsset(asset)
  s.togglePlan('plan-boiler')
  assert.deepEqual(clone(task.rule),ruleBefore);assert.deepEqual(clone(task.points),pointsBefore)
  s.startTask(task.id,'person-01');s.submitTask(task.id,completeInputs(task),'person-01')
  assert.equal(s.records().find(row=>row.taskId===task.id).ruleVersion,1)
  assert.equal(s.records().find(row=>row.taskId===task.id).point.id,'space-boiler')
})
test('C: completed tasks cannot be edited or submitted a second time', () => {
  const s=configured(),task=newBoilerTask(s),results=completeInputs(task)
  s.startTask(task.id,'person-01');s.submitTask(task.id,results,'person-01')
  assert.throws(()=>s.saveTaskDraft(task.id,results,'person-01'),/只读/)
  assert.throws(()=>s.submitTask(task.id,results,'person-01'),/只读/)
})
test('C: result identity separates the room, two boilers and one common pipe', () => {
  const s=configured(),task=s.byId(s.state.tasks,'task-seed-room'),results=completeInputs(task)
  const first=taskEntries(task).find(entry=>entry.group.object.id==='asset-boiler-1' && entry.item.id==='item-pressure')
  const second=taskEntries(task).find(entry=>entry.group.object.id==='asset-boiler-2' && entry.item.id==='item-pressure')
  assert.notEqual(first.key,second.key)
  results[first.key].value='0.55';results[second.key].value='0.72'
  s.startTask(task.id,'person-01');s.submitTask(task.id,results,'person-01')
  const data=s.records().filter(row=>row.taskId===task.id)
  assert.equal(new Set(data.map(row=>row.object.id)).size,4)
  assert.equal(data.find(row=>row.key===first.key).value,'0.55')
  assert.equal(data.find(row=>row.key===second.key).value,'0.72')
})
test('C: task progress spans all three power-room points and cannot finish after only one', () => {
  const s=configured(),task=s.byId(s.state.tasks,'task-seed-power'),all=completeInputs(task)
  const firstOnly=Object.fromEntries(taskEntries(task).filter(entry=>entry.point.id===task.points[0].id).map(entry=>[entry.key,all[entry.key]]))
  s.startTask(task.id,'person-01');s.saveTaskDraft(task.id,firstOnly,'person-01')
  assert.equal(s.progress(task).completePoints,1)
  assert.throws(()=>s.submitTask(task.id,firstOnly,'person-01'),/必检未填/)
  s.submitTask(task.id,all,'person-01')
  assert.equal(s.progress(task).completePoints,3)
})
test('C: drafts are excluded from records and fields from another object cannot be injected', () => {
  const s=configured(),task=newBoilerTask(s),results=completeInputs(task),before=s.records().length
  results['wrong-object|group|item']={value:'900',note:'不应写入'}
  s.startTask(task.id,'person-01');s.saveTaskDraft(task.id,results,'person-01')
  assert.equal(s.records().length,before)
  assert.equal(task.results['wrong-object|group|item'],undefined)
  assert.equal(new Set(Object.keys(task.results)).size,6)
})
test('C: historical boiler electronic ledger keeps device/time identities and anomaly notes', () => {
  const s=configured(),data=s.records().filter(row=>row.item.id==='item-pressure')
  assert.equal(data.length,4)
  assert.equal(new Set(data.map(row=>`${row.object.id}|${row.date}|${row.slotStart}`)).size,4)
  assert.equal(data.find(row=>row.object.id==='asset-boiler-2' && row.slotStart==='10:00').value,0.92)
  assert.match(data.find(row=>row.object.id==='asset-boiler-2' && row.slotStart==='10:00').note,/0.92/)
  assert.equal(data.find(row=>row.object.id==='asset-boiler-1' && row.slotStart==='10:00').value,0.58)
})
test('C: exception-photo requirement is enforced on actual result data', () => {
  const s=configured(),task=newBoilerTask(s),entry=taskEntries(task)[0],results=completeInputs(task)
  entry.item.exceptionPhoto=true
  results[entry.key].value=0.95;results[entry.key].note='异常现场事实'
  s.startTask(task.id,'person-01')
  assert.throws(()=>s.submitTask(task.id,results,'person-01'),/需要补充照片/)
  results[entry.key].photos=[{name:'local-demo.png',dataUrl:'data:image/png;base64,AA=='}]
  s.submitTask(task.id,results,'person-01')
  assert.equal(s.records().find(row=>row.taskId===task.id && row.key===entry.key).photos[0].name,'local-demo.png')
})
test('B: cleared time controls and invalid calendar dates produce validation messages without crashing', () => {
  const s=configured(),plan=clone(s.byId(s.state.plans,'plan-boiler'))
  assert.match(s.planIssues({...plan,slots:[{start:null,end:null}]}).join(''),/合法开始/)
  assert.match(s.planIssues({...plan,startDate:'2026-02-31'}).join(''),/合法日期/)
  assert.throws(()=>s.generateTask('plan-boiler','2026-11-31','08:00'),/合法日期/)
})

test('revision: an installation space is mandatory even with a free-text location',()=>{
  const s=fresh(),input=clone(s.object('asset-boiler-1'))
  assert.throws(()=>s.saveAsset({...input,id:'',code:'NO-SPACE',spaceId:'',location:'大厅里，文字不能代替空间引用'}),/安装空间必填/)
  const saved=s.saveAsset({...input,id:'',code:'HALL-DEVICE',name:'大厅设备（模拟）',spaceId:'space-lobby-f1'})
  assert.equal(saved.spaceId,'space-lobby-f1')
})
test('revision: floor and optional zone support ordinary rooms, halls and corridors',()=>{
  const s=fresh(),base=clone(s.object('space-duty-room'))
  const room=s.saveSpace({...base,id:'',code:'ROOM-NEW',name:'新增普通房间',parentId:'space-f2'})
  assert.equal(room.type,'房间')
  const corridor=s.saveSpace({...base,id:'',code:'PUBLIC-NEW',name:'新增走廊',type:'公共区域',parentId:'space-zone-f1-east',usage:'走廊'})
  assert.ok(s.spacePath(corridor.id).includes('1层东区'))
  assert.throws(()=>s.saveSpace({...base,id:'',code:'BAD-ROOM',name:'错误房间',parentId:'space-building'}),/空间层级/)
})
test('revision: public spaces can use explicit facility links and a suitable space rule',()=>{
  const s=configured(),rule=clone(s.byId(s.state.rules,'rule-power'))
  rule.roomUsage='大厅';rule.groups=[rule.groups[0]]
  s.saveSpaceFacilities('space-lobby-f1',['asset-steam-pipe'])
  assert.deepEqual(s.facilityIds('space-lobby-f1'),['asset-steam-pipe'])
  const preview=s.preview(rule,['space-lobby-f1'])
  assert.deepEqual(preview.issues,[])
  assert.equal(preview.points[0].space.type,'公共区域')
})
function legacyState(){const state=createDemoState();state.demoRevision=1;for(const collection of ['categories','spaces','assets'])state[collection]=state[collection].filter(row=>!REVISION_SAMPLE_IDS[collection].includes(row.id));return state}
test('revision: additive demo migration preserves custom edits, relationships and all historical facts',()=>{
  const old=legacyState();old.assets.find(row=>row.id==='asset-boiler-1').notes='人工维护内容';old.spaces.find(row=>row.id==='space-boiler').name='人工修改的锅炉房名称'
  const before=clone(old),migrated=migrateDemoState(old)
  for(const key of ['plans','rules','tasks','relations','audits'])assert.deepEqual(migrated.state[key],before[key])
  for(const row of before.assets)assert.deepEqual(migrated.state.assets.find(candidate=>candidate.id===row.id),row)
  for(const row of before.spaces)assert.deepEqual(migrated.state.spaces.find(candidate=>candidate.id===row.id),row)
  assert.equal(migrated.state.serial,before.serial)
  assert.equal(migrated.state.assets.filter(row=>row.type==='专业系统').length,6)
  assert.equal(migrated.state.demoRevision,2)
  assert.equal(old.demoRevision,1)
  assert.equal(migrateDemoState(migrated.state).changed,false)
})
test('revision: sample migration reports code conflicts without overwriting a user system',()=>{
  const old=legacyState(),custom={...clone(old.assets[0]),id:'custom-system',code:'SYS-WATER',name:'人工维护系统'}
  old.assets.push(custom)
  const migrated=migrateDemoState(old)
  assert.deepEqual(migrated.state.assets.find(row=>row.id===custom.id),custom)
  assert.equal(migrated.state.assets.some(row=>row.id==='asset-water-system'),false)
  assert.ok(migrated.notices.some(note=>note.includes('给排水系统')))
  assert.equal(new Set(migrated.state.assets.map(row=>row.code)).size,migrated.state.assets.length)
})
test('revision: new system examples do not silently assign existing devices to a new system',()=>{
  const state=createEquipmentSeed()
  assert.equal(state.assets.filter(row=>row.type==='专业系统').length,6)
  assert.equal(state.assets.find(row=>row.id==='asset-cabinet-b1').systemId,'')
  assert.equal(state.assets.find(row=>row.id==='asset-hvac-in').systemId,'')
  assert.equal(state.assets.find(row=>row.id==='asset-boiler-1').systemId,'asset-heat-system')
})
