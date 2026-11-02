// All identities and measurements in this joint prototype are fictional, stable demo data.
export const PROJECT = { id: 'project-demo', name: '示范院区项目（模拟）' }
export const ORGANIZATIONS = [
  { id: 'org-hospital', name: '示范院区（产权方·模拟）' },
  { id: 'org-maintenance', name: '工程运维组（模拟）' }
]
export const PEOPLE = [
  { id: 'person-01', name: '巡检员甲（演示）' },
  { id: 'person-02', name: '巡检员乙（演示）' }
]
export const ASSET_TYPES = ['单台设备', '组合设备', '专业系统', '设施', '建筑构件']
export const ROOT_TYPES = ['设备', '空间', '组合', '系统', '设施']
export const SPACE_TYPES = ['院区', '楼栋', '楼层', '片区', '房间', '机房', '公共区域']
export const SPACE_PARENT_TYPES = { 院区:[], 楼栋:['院区'], 楼层:['楼栋'], 片区:['楼层'], 房间:['楼层','片区'], 机房:['楼层','片区'], 公共区域:['楼层','片区'] }
export const CHECKABLE_SPACE_TYPES = ['房间', '机房', '公共区域']
export const REVISION_SAMPLE_IDS = {
  categories:['cat-power-system','cat-hvac-system','cat-water','cat-water-system','cat-fire','cat-fire-system'],
  spaces:['space-zone-f1-east','space-lobby-f1','space-corridor-f1','space-corridor-f2','space-duty-room'],
  assets:['asset-power-system','asset-hvac-system','asset-water-system','asset-fire-system']
}
export const GROUP_ROLES = [
  { value: 'self', label: '当前对象自身' },
  { value: 'spaceEquipment', label: '空间内符合条件的设备' },
  { value: 'compositionMembers', label: '组合下成员' },
  { value: 'systemMembers', label: '系统成员' },
  { value: 'linkedFacility', label: '明确关联的设施' }
]
export const INPUT_TYPES = ['数值', '状态', '文本', '照片']
export const DEMO_BASIS = '模拟演示参考条件，未经专业确认，不得用于现场安全判断'

const category = (id, code, name, parentId = '') => ({ id, code, name, parentId, enabled: true, description: '医院建筑与支撑设施演示分类' })
const space = (id, code, name, type, parentId, extra = {}) => ({ id, code, name, type, parentId, projectId: PROJECT.id, usage: '', structure: '', deliveredAt: '', ownerId: '', maintainerId: 'org-maintenance', location: '', status: '使用中', ...extra })
const asset = (id, code, name, categoryId, type, spaceId, extra = {}) => ({ id, code, name, categoryId, type, spaceId, projectId: PROJECT.id, model: '', location: '', systemId: '', parentId: '', organizationId: 'org-maintenance', status: '运行', notes: '', meters: [], ...extra })

export const clone = value => JSON.parse(JSON.stringify(value))

export function createEquipmentSeed() {
  return {
    schema: 1,
    demoRevision: 2,
    matchingDemoRevision: 1,
    serial: 100,
    categories: [
      category('cat-support', 'SUP', '建筑与机电支撑设施'),
      category('cat-heat', 'SUP-01', '热力保障', 'cat-support'),
      category('cat-boiler', 'SUP-01-01', '锅炉', 'cat-heat'),
      category('cat-steam', 'SUP-01-02', '蒸汽管路', 'cat-heat'),
      category('cat-heat-system', 'SUP-01-03', '热力系统', 'cat-heat'),
      category('cat-air', 'SUP-02', '压缩空气保障', 'cat-support'),
      category('cat-compressor', 'SUP-02-01', '空压机', 'cat-air'),
      category('cat-air-system', 'SUP-02-02', '压缩空气系统', 'cat-air'),
      category('cat-air-pipe', 'SUP-02-03', '压缩空气管路', 'cat-air'),
      category('cat-electric', 'SUP-03', '供配电', 'cat-support'),
      category('cat-cabinet', 'SUP-03-01', '配电柜', 'cat-electric'),
      category('cat-power-system', 'SUP-03-02', '供配电系统', 'cat-electric'),
      category('cat-hvac', 'SUP-04', '空调保障', 'cat-support'),
      category('cat-hvac-group', 'SUP-04-01', '空调组合', 'cat-hvac'),
      category('cat-hvac-unit', 'SUP-04-02', '空调机组', 'cat-hvac'),
      category('cat-hvac-system', 'SUP-04-03', '空调系统', 'cat-hvac'),
      category('cat-building', 'SUP-05', '建筑构件', 'cat-support'),
      category('cat-door', 'SUP-05-01', '防火门', 'cat-building'),
      category('cat-water', 'SUP-06', '给排水保障', 'cat-support'),
      category('cat-water-system', 'SUP-06-01', '给排水系统', 'cat-water'),
      category('cat-fire', 'SUP-07', '消防保障', 'cat-support'),
      category('cat-fire-system', 'SUP-07-01', '消防系统', 'cat-fire')
    ],
    spaces: [
      space('space-campus', 'CAMPUS', '示范院区', '院区', '', { usage: '医疗辅助保障（模拟）' }),
      space('space-building', 'BUILD-A', '保障楼', '楼栋', 'space-campus', { usage: '后勤动力与配电保障', structure: '钢筋混凝土框架（模拟）', deliveredAt: '2020-06-30', ownerId: 'org-hospital', location: '示范院区北侧（模拟）' }),
      space('space-b1', 'A-B1', 'B1层', '楼层', 'space-building'),
      space('space-f1', 'A-F1', '1层', '楼层', 'space-building'),
      space('space-f2', 'A-F2', '2层', '楼层', 'space-building'),
      space('space-roof', 'A-RF', '屋面层', '楼层', 'space-building'),
      space('space-boiler', 'ROOM-B01', '锅炉房', '机房', 'space-b1', { usage: '锅炉房', location: 'B1层东侧动力区，B01入口' }),
      space('space-air', 'ROOM-B02', '压缩空气机房', '机房', 'space-b1', { usage: '压缩空气机房', location: 'B1层西侧动力区，B02入口' }),
      space('space-power-b1', 'ROOM-B03', 'B1配电房', '机房', 'space-b1', { usage: '配电房', location: 'B1层北侧，B03入口' }),
      space('space-power-f1', 'ROOM-103', '1层配电房', '机房', 'space-f1', { usage: '配电房', location: '1层东侧，103入口' }),
      space('space-power-f2', 'ROOM-203', '2层配电房', '机房', 'space-f2', { usage: '配电房', location: '2层东侧，203入口' }),
      space('space-boiler-incomplete', 'ROOM-B04', '备用动力间（关系待补充）', '机房', 'space-b1', { usage: '锅炉房', location: 'B1层南侧，B04入口' }),
      space('space-zone-f1-east', 'AREA-1E', '1层东区', '片区', 'space-f1', { usage:'东侧保障区域',location:'1层东侧区域' }),
      space('space-lobby-f1', 'PUBLIC-101', '1层大厅', '公共区域', 'space-f1', { usage:'大厅',location:'1层主入口大厅' }),
      space('space-corridor-f1', 'PUBLIC-102', '1层东区走廊', '公共区域', 'space-zone-f1-east', { usage:'走廊',location:'1层东区连通走廊' }),
      space('space-corridor-f2', 'PUBLIC-201', '2层走廊', '公共区域', 'space-f2', { usage:'走廊',location:'2层电梯厅向东的公共走廊' }),
      space('space-duty-room', 'ROOM-105', '运维值班室', '房间', 'space-zone-f1-east', { usage:'值班室',location:'1层东区走廊105室' })
    ],
    assets: [
      asset('asset-heat-system', 'SYS-HEAT', '热力保障系统', 'cat-heat-system', '专业系统', 'space-boiler'),
      asset('asset-boiler-1', 'BL-001', '1号锅炉', 'cat-boiler', '单台设备', 'space-boiler', { model: 'DEMO-B', systemId: 'asset-heat-system', meters: [{ id: 'meter-boiler-1', name: '锅炉出口压力表', location: '1号锅炉正面出口处' }] }),
      asset('asset-boiler-2', 'BL-002', '2号锅炉', 'cat-boiler', '单台设备', 'space-boiler', { model: 'DEMO-B', systemId: 'asset-heat-system' }),
      asset('asset-steam-pipe', 'PIPE-S01', '共用蒸汽管路', 'cat-steam', '设施', 'space-boiler', { systemId: 'asset-heat-system', location: '两台锅炉出口汇集段，共用设施只建一档' }),
      asset('asset-air-system', 'SYS-AIR', 'A压缩空气系统', 'cat-air-system', '专业系统', 'space-air'),
      asset('asset-compressor-1', 'AC-001', '1号空压机', 'cat-compressor', '单台设备', 'space-air', { model: 'DEMO-A', systemId: 'asset-air-system' }),
      asset('asset-compressor-2', 'AC-002', '2号空压机', 'cat-compressor', '单台设备', 'space-air', { model: 'DEMO-A', systemId: 'asset-air-system', status: '备用' }),
      asset('asset-air-pipe', 'PIPE-A01', '共用压缩空气管路', 'cat-air-pipe', '设施', 'space-air', { systemId: 'asset-air-system' }),
      asset('asset-cabinet-b1', 'EL-B01', 'B1配电柜', 'cat-cabinet', '单台设备', 'space-power-b1'),
      asset('asset-cabinet-f1', 'EL-101', '1层配电柜', 'cat-cabinet', '单台设备', 'space-power-f1'),
      asset('asset-cabinet-f2', 'EL-201', '2层配电柜', 'cat-cabinet', '单台设备', 'space-power-f2'),
      asset('asset-hvac-group', 'HVAC-G01', '保障楼空调组合', 'cat-hvac-group', '组合设备', 'space-roof', { location: '屋面外机与1层内机组成，成员位置独立' }),
      asset('asset-hvac-out', 'HVAC-O01', '空调室外机', 'cat-hvac-unit', '单台设备', 'space-roof', { parentId: 'asset-hvac-group', model: 'DEMO-H' }),
      asset('asset-hvac-in', 'HVAC-I01', '空调室内机', 'cat-hvac-unit', '单台设备', 'space-f1', { parentId: 'asset-hvac-group', model: 'DEMO-H' }),
      asset('asset-power-system', 'SYS-POWER', '保障楼供配电系统', 'cat-power-system', '专业系统', 'space-power-b1', {location:'以B1配电房为主要管理位置，覆盖保障楼（模拟）',notes:'演示系统档案；设备是否归属仍由明确关系维护。'}),
      asset('asset-hvac-system', 'SYS-HVAC', '保障楼空调系统', 'cat-hvac-system', '专业系统', 'space-roof', {location:'屋面主要机组位置，覆盖楼内空调（模拟）',notes:'演示系统档案，不自动改挂已登记空调组合。'}),
      asset('asset-water-system', 'SYS-WATER', '保障楼给排水系统', 'cat-water-system', '专业系统', 'space-building', {location:'保障楼主要管理范围；具体管路和设备另行定位（模拟）'}),
      asset('asset-fire-system', 'SYS-FIRE', '保障楼消防系统', 'cat-fire-system', '专业系统', 'space-building', {location:'保障楼主要管理范围；具体消防设施可定位到房间、大厅或走廊（模拟）'})
    ],
    relations: [
      { id: 'rel-steam-room', sourceId: 'space-boiler', sourceType: '空间', type: '设施关联', targetId: 'asset-steam-pipe' },
      { id: 'rel-air-room', sourceId: 'space-air', sourceType: '空间', type: '设施关联', targetId: 'asset-air-pipe' }
    ],
    rules: [], plans: [], tasks: [], audits: []
  }
}

const item = (id, name, type, extra = {}) => ({ id, name, type, unit: '', options: [], normalOptions: [], required: true, lower: '', upper: '', basis: '', demoReference: true, method: '', models: [], states: [], exceptionNote: true, exceptionPhoto: false, guidance: '如有异常，请及时报告并遵循院方已批准的处置预案。本提示仅为演示。', ...extra })
const numeric = (id, name, unit, lower, upper) => item(id, name, '数值', { unit, lower, upper, basis: DEMO_BASIS, method: '读取现场对应仪表；不自动使用上次读数。' })
const statusItem = (id, name, options, normalOptions) => item(id, name, '状态', { options, normalOptions, basis: DEMO_BASIS, method: '现场逐项查看并主动选择，未检查不可选为正常。' })
const group = (id, name, role, categoryId, items, targetType = '') => ({ id, name, role, categoryId, targetType, required: true, items })

export function createInspectionRules() {
  const boilerItems = () => [
    numeric('item-pressure', '出口压力', 'MPa', 0.4, 0.8),
    numeric('item-temperature', '排烟温度', '℃', 80, 180),
    item('item-gas', '燃气表读数', '数值', { unit: 'm³', method: '读取累计示数，只采集；本样例未配置有效参考条件。', exceptionNote: false })
  ]
  return [
    { id: 'rule-boiler', code: 'RULE-001', name: '锅炉运行抄表', version: 1, status: '已启用', rootType: '设备', categoryId: 'cat-boiler', roomUsage: '', models: ['DEMO-B'], states: ['运行'], scene: '运行抄表', basis: DEMO_BASIS, notes: '一次选择规则应用多台锅炉；累计燃气读数仅采集不判定。', groups: [group('group-boiler-read', '锅炉运行数据', 'self', '', boilerItems())] },
    { id: 'rule-boiler-room', code: 'RULE-002', name: '锅炉房综合检查', version: 1, status: '已启用', rootType: '空间', categoryId: '', roomUsage: '锅炉房', models: [], states: [], scene: '机房综合检查', basis: DEMO_BASIS, notes: '分别归属房间、锅炉和明确关联的共用管路。', groups: [
      group('group-room', '机房自身', 'self', '', [statusItem('item-door', '门锁状态', ['完好', '损坏'], ['完好']), statusItem('item-light', '照明状态', ['照明完好', '照明故障'], ['照明完好'])]),
      group('group-room-boilers', '空间内符合条件的锅炉', 'spaceEquipment', 'cat-boiler', boilerItems(), '单台设备'),
      group('group-steam', '明确关联的共用管路', 'linkedFacility', 'cat-steam', [statusItem('item-pipe', '管路外观', ['未见可见异常', '发现渗漏'], ['未见可见异常'])], '设施')
    ] },
    { id: 'rule-power', code: 'RULE-003', name: '配电房日常检查', version: 1, status: '已启用', rootType: '空间', categoryId: '', roomUsage: '配电房', models: [], states: [], scene: '机房综合检查', basis: DEMO_BASIS, notes: '多个楼层的机房一次形成多检查点任务。', groups: [
      group('group-power-room', '配电房环境', 'self', '', [statusItem('item-power-door', '门禁与通道', ['完好畅通', '存在异常'], ['完好畅通']), item('item-power-note', '现场观察补充', '文本', { required: false, exceptionNote: false })]),
      group('group-cabinet', '房内配电柜', 'spaceEquipment', 'cat-cabinet', [statusItem('item-cabinet', '柜体外观', ['未见可见异常', '存在异常'], ['未见可见异常'])], '单台设备')
    ] },
    { id: 'rule-air', code: 'RULE-004', name: '压缩空气机房综合检查', version: 1, status: '已启用', rootType: '空间', categoryId: '', roomUsage: '压缩空气机房', models: [], states: [], scene: '机房综合检查', basis: DEMO_BASIS, notes: '关联机房、两台空压机与共用管路，不依赖IoT。', groups: [
      group('group-air-room', '机房环境', 'self', '', [statusItem('item-air-light', '照明与通道', ['完好畅通', '存在异常'], ['完好畅通'])]),
      group('group-air-machine', '空压机检查', 'spaceEquipment', 'cat-compressor', [numeric('item-air-pressure', '出口压力', 'MPa', 0.5, 0.8), statusItem('item-air-state', '现场运行状态', ['运行', '备用', '异常'], ['运行', '备用'])], '单台设备'),
      group('group-air-pipe', '关联管路', 'linkedFacility', 'cat-air-pipe', [statusItem('item-air-pipe-check', '连接部位', ['未见可见异常', '发现泄漏'], ['未见可见异常'])], '设施')
    ] },
    { id: 'rule-boiler-room-daily', code: 'RULE-005', name: '锅炉房日常巡检规则', version: 1, status: '已启用', rootType: '空间', categoryId: '', roomUsage: '锅炉房', models: [], states: [], scene: '机房综合检查', basis: DEMO_BASIS, notes: '分组按分类ID和明确关系自动匹配；标准示例为1个房间、2台锅炉、1段共用管路，共9项。旧版综合规则与任务保持原样。', groups: [
      { ...group('group-daily-room', '机房环境检查', 'self', '', [statusItem('item-daily-door', '门锁', ['完好','损坏'], ['完好']), statusItem('item-daily-light', '照明', ['照明完好','照明故障'], ['照明完好']), statusItem('item-daily-clean', '环境卫生', ['整洁','需要处理'], ['整洁'])], '空间'), models:[], states:[], extraRoles:[] },
      { ...group('group-daily-boilers', '锅炉运行检查', 'spaceEquipment', 'cat-boiler', [numeric('item-daily-pressure', '蒸汽压力', 'MPa', 0.4, 0.8), numeric('item-daily-temperature', '排烟温度', '℃', 80, 180)], '单台设备'), models:['DEMO-B'], states:['运行'], extraRoles:[] },
      { ...group('group-daily-pipe', '管路设施检查', 'linkedFacility', 'cat-steam', [statusItem('item-daily-pipe-look', '管路外观', ['未见可见异常','发现异常'], ['未见可见异常']), statusItem('item-daily-pipe-joint', '连接部位', ['未见可见异常','发现异常'], ['未见可见异常'])], '设施'), models:[], states:[], extraRoles:[], includeSystemFacilities:true }
    ] }
  ]
}
