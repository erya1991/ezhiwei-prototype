import test from 'node:test'
import assert from 'node:assert/strict'
import { createJointStore, createDemoState, migrateDemoState, clone, taskEntries, resultKey } from '../../../data/equipmentInspectionMock.js'

const setup=()=>createJointStore(createDemoState(),{clock:()=>new Date('2026-10-30T04:00:00Z')})
function planFor(s,rule,rootIds,name='增量验收计划') {
  const saved=s.saveRule({...clone(rule),id:'',familyId:'',code:`QA-${s.state.serial}`,name},true,true)
  return s.savePlan({name,ruleId:saved.id,rootIds,applicableStates:[],cycle:'每日',weekDays:[1],monthDay:1,intervalDays:1,slots:[{start:'13:00',end:'14:00'}],startDate:'2026-10-30',endDate:'2026-11-30',personId:'person-01',confirmation:s.signature(saved.id,rootIds,[])},true)
}
function submit(s,task,edit=()=>{}) {
  const values=Object.fromEntries(taskEntries(task).map(({key,item})=>[key,{value:item.type==='数值'?(item.unit==='MPa'?'0.6':'145'):item.type==='状态'?item.normalOptions[0]: '现场记录',note:'',photos:[]}]))
  edit(values,taskEntries(task));s.startTask(task.id,'person-01');s.submitTask(task.id,values,'person-01');return values
}
const daily=s=>clone(s.byId(s.state.rules,'rule-boiler-room-daily'))

test('T01: device history shares source result IDs, readings, notes, photos and actual inspection date',()=>{
  const s=setup(),task=s.generateTask('plan-boiler','2026-10-30','14:00')
  submit(s,task,(values,entries)=>{const row=entries.find(e=>e.group.object.id==='asset-boiler-1'&&e.item.id==='item-pressure');values[row.key]={value:'0.93',note:'模拟异常事实已报告',photos:[{name:'local.png',dataUrl:'data:image/png;base64,AA=='}]}})
  const before=JSON.stringify(s.state.tasks),rows=s.assetRecords('asset-boiler-1',{from:'2026-10-30',to:'2026-10-30',decision:'异常'})
  assert.equal(rows.length,1);assert.equal(rows[0].value,'0.93');assert.equal(rows[0].unit,'MPa');assert.match(rows[0].note,/已报告/)
  assert.equal(rows[0].checkedBy,'person-01');assert.equal(rows[0].checkedAt,'2026-10-30T04:00:00.000Z');assert.equal(rows[0].photos[0].name,'local.png')
  assert.deepEqual(rows[0],s.records().find(row=>row.id===rows[0].id));assert.equal(s.assetRecords('asset-boiler-2',{decision:'异常',from:'2026-10-30'}).length,0)
  assert.equal(s.assetRecords('asset-boiler-1',{to:'2026-10-29'}).length,6)
  assert.throws(()=>s.assetRecords('asset-boiler-1',{from:'2026-10-31',to:'2026-10-01'}),/合法日期范围/)
  assert.equal(JSON.stringify(s.state.tasks),before)
})

test('T01: composition history defaults to the parent; child readings retain child IDs and historical lineage',()=>{
  const s=setup(),rule=daily(s),base=clone(rule.groups[1].items[1])
  rule.rootType='组合';rule.categoryId='cat-hvac-group';rule.roomUsage='';rule.groups=[
    {id:'combo-self',name:'组合自身',role:'self',targetType:'组合设备',required:true,items:[{...clone(base),id:'combo-temperature'}]},
    {id:'combo-members',name:'内外机温度',role:'compositionMembers',targetType:'单台设备',models:['DEMO-H'],required:true,items:[{...clone(base),id:'child-temperature'}]}
  ]
  const plan=planFor(s,rule,['asset-hvac-group']),task=s.generateTask(plan.id,'2026-10-30','13:00')
  submit(s,task,(values,entries)=>{for(const row of entries)values[row.key].value=row.group.object.id==='asset-hvac-out'?'130':'145'})
  assert.equal(s.assetRecords('asset-hvac-group').length,1)
  const history=s.assetRecords('asset-hvac-group',{includeChildren:true})
  assert.equal(history.length,3);assert.deepEqual(new Set(history.map(row=>row.object.id)),new Set(['asset-hvac-group','asset-hvac-out','asset-hvac-in']))
  s.saveAsset({...clone(s.object('asset-hvac-out')),parentId:'',spaceId:'space-f2'})
  assert.equal(s.assetRecords('asset-hvac-group',{includeChildren:true}).find(row=>row.object.id==='asset-hvac-out').value,'130')
  assert.equal(s.assetRecords('asset-hvac-group').length,1)
})

test('T02: composition and system membership reuse existing objects and keep independent positions',()=>{
  const s=setup(),inner=s.saveAsset({...clone(s.object('asset-hvac-in')),id:'',code:'HVAC-I02',name:'空调内机A2',parentId:'',spaceId:'space-f2'}),count=s.state.assets.length
  s.saveAsset(clone(s.object('asset-hvac-group')),undefined,{compositionIds:['asset-hvac-out','asset-hvac-in',inner.id,inner.id]})
  s.saveAsset(clone(s.object('asset-air-system')),undefined,{systemMemberIds:['asset-compressor-1','asset-compressor-2','asset-air-pipe']})
  assert.equal(s.state.assets.length,count);assert.equal(s.assetMembers('asset-hvac-group').length,3)
  assert.notEqual(s.object('asset-hvac-out').spaceId,s.object(inner.id).spaceId)
  assert.equal(s.assetMembers('asset-air-system','systemId').length,3);assert.equal(s.object('asset-air-pipe').parentId,'')
  assert.equal(s.state.assets.filter(row=>row.id==='asset-air-pipe').length,1)
})

test('T02: a cyclic batch is rejected atomically, including member updates and facility links',()=>{
  const s=setup(),other=s.saveAsset({...clone(s.object('asset-hvac-group')),id:'',code:'HVAC-G02',name:'组合B'}),before=clone(s.state)
  assert.throws(()=>s.saveAsset({...clone(s.object('asset-hvac-group')),parentId:other.id},['asset-steam-pipe'],{compositionIds:[other.id]}),/循环/)
  assert.deepEqual(clone(s.state),before)
  s.state.assets.push({...clone(s.object('asset-boiler-1')),id:'foreign',code:'FOREIGN',projectId:'other-project'})
  assert.throws(()=>s.saveAsset(clone(s.object('asset-air-system')),undefined,{systemMemberIds:['foreign']}),/同项目/)
})

test('T02: ordinary edits preserve facility relations when no relationship change was requested',()=>{
  const s=setup();s.saveAsset(clone(s.object('asset-heat-system')),['asset-steam-pipe'])
  s.saveAsset({...clone(s.object('asset-heat-system')),notes:'仅修改备注'})
  assert.deepEqual(s.facilityIds('asset-heat-system'),['asset-steam-pipe'])
})

test('T03: daily boiler-room rule expands 4 stable objects into exactly 3+2+2+2 checks',()=>{
  const s=setup(),rule=daily(s),view=s.preview(rule,['space-boiler'])
  assert.deepEqual(view.issues,[]);assert.equal(view.objectCount,4);assert.equal(view.itemCount,9)
  assert.deepEqual(view.points[0].groups.map(group=>[group.object.id,group.items.length]),[['space-boiler',3],['asset-boiler-1',2],['asset-boiler-2',2],['asset-steam-pipe',2]])
  s.object('asset-boiler-1').name='任意名称也不改变分类匹配'
  assert.equal(s.preview(rule,['space-boiler']).itemCount,9)
  assert.equal(JSON.stringify(rule).includes('asset-boiler-1'),false)
})

test('T04: space and system paths deduplicate the same item within one group and report why',()=>{
  const s=setup(),rule=daily(s);rule.groups[1].extraRoles=['systemMembers']
  const view=s.preview(rule,['space-boiler'])
  assert.deepEqual(view.issues,[]);assert.equal(view.itemCount,9)
  const duplicates=view.duplicates.filter(row=>row.groupId==='group-daily-boilers')
  assert.equal(duplicates.length,2);assert.ok(duplicates.every(row=>row.paths.some(path=>path.includes('空间'))&&row.paths.some(path=>path.includes('系统'))))
  const plan=planFor(s,rule,['space-boiler']),task=s.generateTask(plan.id,'2026-10-30','13:00')
  assert.equal(new Set(taskEntries(task).map(row=>row.key)).size,9)
})

test('T04: independent groups and different plans retain their own checks for the same device',()=>{
  const s=setup(),rule=daily(s),extra=clone(rule.groups[1]);extra.id='group-second-pass';extra.name='独立复查';rule.groups.push(extra)
  const first=planFor(s,rule,['space-boiler'],'独立复查计划A'),second=planFor(s,rule,['space-boiler'],'独立复查计划B')
  const taskA=s.generateTask(first.id,'2026-10-30','13:00'),taskB=s.generateTask(second.id,'2026-10-30','13:00')
  assert.equal(taskEntries(taskA).length,13);assert.equal(new Set(taskEntries(taskA).map(row=>row.key)).size,13)
  assert.notEqual(taskA.id,taskB.id);assert.equal(taskEntries(taskB).length,13)
})

test('T04: shared facility results at two explicit locations stay separate through submit and history',()=>{
  const s=setup(),rule=daily(s);rule.roomUsage='';rule.groups=[rule.groups[2]];rule.groups[0].includeSystemFacilities=false
  s.saveSpaceFacilities('space-power-f1',['asset-steam-pipe'])
  const plan=planFor(s,rule,['space-boiler','space-power-f1']),task=s.generateTask(plan.id,'2026-10-30','13:00')
  assert.equal(task.points.length,2);assert.equal(taskEntries(task).length,4);assert.equal(new Set(taskEntries(task).map(row=>row.key)).size,4)
  submit(s,task,(values,entries)=>{const entry=entries.find(row=>row.point.space.id==='space-power-f1');values[entry.key].value='发现异常';values[entry.key].note='该检查位置连接部位异常（模拟）'})
  const records=s.assetRecords('asset-steam-pipe').filter(row=>row.taskId===task.id)
  assert.equal(records.length,4);assert.equal(records.filter(row=>row.decision==='异常').length,1)
  assert.equal(records.find(row=>row.decision==='异常').point.id,'space-power-f1')
  assert.equal(records.filter(row=>row.point.id==='space-boiler').every(row=>row.decision==='正常'),true)
})

test('T05: one rule applies directly to a batch of boilers without room IDs in the plan scope',()=>{
  const s=setup(),rule=clone(s.byId(s.state.rules,'rule-boiler')),ids=['asset-boiler-1','asset-boiler-2'],plan=planFor(s,rule,ids)
  assert.deepEqual(plan.rootIds,ids);assert.equal(plan.expansion.itemCount,6);assert.equal(plan.expansion.objectCount,2)
  const task=s.generateTask(plan.id,'2026-10-30','13:00')
  submit(s,task,(values,entries)=>{for(const row of entries.filter(row=>row.item.id==='item-pressure'))values[row.key].value=row.group.object.id==='asset-boiler-1'?'0.55':'0.72'})
  assert.equal(s.assetRecords('asset-boiler-1',{from:'2026-10-30'}).find(row=>row.item.id==='item-pressure').value,'0.55')
  assert.equal(s.assetRecords('asset-boiler-2',{from:'2026-10-30'}).find(row=>row.item.id==='item-pressure').value,'0.72')
})

test('T04: a system relation cannot relocate a facility without an explicit space association',()=>{
  const s=setup(),rule=daily(s);rule.roomUsage='';rule.groups=[rule.groups[2]]
  s.saveAsset({...clone(s.object('asset-boiler-1')),spaceId:'space-power-f1'})
  let view=s.preview(rule,['space-power-f1'])
  assert.deepEqual(view.issues,[]);assert.equal(view.points.length,1);assert.equal(view.points[0].space.id,'space-boiler')
  s.saveSpaceFacilities('space-power-f1',['asset-steam-pipe'])
  view=s.preview(rule,['space-power-f1'])
  assert.deepEqual(view.issues,[]);assert.equal(view.points.length,1);assert.equal(view.points[0].space.id,'space-power-f1');assert.equal(view.itemCount,2)
})

test('T02: selecting a system does not expand upstream sibling systems or their devices',()=>{
  const s=setup(),rule=daily(s)
  s.saveAsset({...clone(s.object('asset-air-system')),systemId:'asset-hvac-system'})
  s.saveAsset({...clone(s.object('asset-boiler-1')),systemId:'asset-hvac-system'})
  rule.rootType='系统';rule.categoryId='cat-air-system';rule.roomUsage=''
  rule.groups=[{...rule.groups[1],role:'systemMembers',categoryId:'',models:[],states:[]}]
  const view=s.preview(rule,['asset-air-system'])
  assert.deepEqual(view.issues,[]);assert.equal(view.objectCount,2)
  assert.deepEqual(new Set(view.points.flatMap(point=>point.groups.map(group=>group.object.id))),new Set(['asset-compressor-1','asset-compressor-2']))
})

test('T06: required associations and group model/state conditions give concrete blocking reasons',()=>{
  const s=setup(),rule=daily(s)
  s.saveSpaceFacilities('space-boiler',[]);s.saveAsset({...clone(s.object('asset-steam-pipe')),systemId:''})
  assert.match(s.preview(rule,['space-boiler']).issues.join('；'),/管路设施检查.*待补充关键关系/)
  s.object('asset-boiler-2').model='OTHER'
  const result=s.preview(rule,['space-boiler'])
  assert.ok(result.excluded.some(row=>row.reason.includes('2号锅炉')&&row.reason.includes('型号或运行工况不适用')))
  assert.throws(()=>planFor(s,rule,['space-boiler']),/待补充|不适用/)
})

test('T06: rule and relationship changes cannot rewrite submitted task snapshots or history',()=>{
  const s=setup(),plan=planFor(s,daily(s),['space-boiler']),task=s.generateTask(plan.id,'2026-10-30','13:00')
  submit(s,task);const oldTask=clone(task),oldRecords=clone(s.records())
  s.saveAsset({...clone(s.object('asset-boiler-1')),spaceId:'space-f1',systemId:'',parentId:'asset-hvac-group'})
  const rule=clone(s.byId(s.state.rules,plan.ruleId));rule.groups[1].models=['OTHER'];s.saveRule(rule,true)
  assert.deepEqual(clone(task),oldTask);assert.deepEqual(clone(s.records()),oldRecords)
  assert.match(s.planIssues(s.byId(s.state.plans,plan.id)).join(''),/重新展开|不适用/)
})

test('compatibility: legacy member roles and legacy result keys remain usable without rewriting history',()=>{
  const s=setup(),rule=daily(s);rule.rootType='系统';rule.categoryId='cat-air-system';rule.roomUsage='';rule.groups=[{...rule.groups[1],role:'members',categoryId:'cat-compressor',models:[],states:[]}]
  assert.equal(s.preview(rule,['asset-air-system']).objectCount,2);assert.doesNotThrow(()=>s.validateRule(rule,true))
  const task=clone(s.state.tasks.find(row=>row.id==='task-seed-boiler-1')),oldResults={}
  for(const point of task.points)for(const group of point.groups){for(const item of group.items){oldResults[`${group.object.id}|${group.id}|${item.id}`]=task.results[resultKey(group,item)]}delete group.resultContext;delete group.object.compositionPath}
  task.results=oldResults;s.state.tasks=[task];const before=clone(task)
  assert.equal(s.assetRecords('asset-boiler-1').length,3);assert.deepEqual(clone(task),before)
})

test('compatibility: adding the new sample rule preserves every existing rule, task and result',()=>{
  const old=createDemoState();delete old.matchingDemoRevision;old.rules=old.rules.filter(row=>row.id!=='rule-boiler-room-daily');const before=clone(old)
  const next=migrateDemoState(old)
  for(const row of before.rules)assert.deepEqual(next.state.rules.find(candidate=>candidate.id===row.id),row)
  for(const key of ['tasks','plans','assets','relations','audits'])assert.deepEqual(next.state[key],before[key])
  assert.equal(next.state.rules.length,before.rules.length+1);assert.equal(next.state.serial,before.serial);assert.equal(migrateDemoState(next.state).changed,false)
  old.rules.push({...clone(before.rules[0]),id:'custom-daily',code:'RULE-005'})
  const collision=migrateDemoState(old);assert.ok(collision.notices.length);assert.equal(collision.state.rules.some(row=>row.id==='rule-boiler-room-daily'),false)
})

test('validation: group type/category and matching mode must agree and rules cannot bind instance IDs',()=>{
  const s=setup(),rule=daily(s)
  rule.groups[1].targetType='设施';assert.throws(()=>s.validateRule(rule,true),/作用对象类型一致/)
  rule.groups[1].targetType='单台设备';rule.groups[1].objectId='asset-boiler-1';assert.throws(()=>s.validateRule(rule,true),/不能绑定具体/)
  delete rule.groups[1].objectId;rule.groups[0].targetType='单台设备';assert.throws(()=>s.validateRule(rule,true),/当前对象自身.*根类型一致/)
  rule.rootType='设备';assert.throws(()=>s.validateRule(rule,true),/匹配方式.*不适用/)
})
