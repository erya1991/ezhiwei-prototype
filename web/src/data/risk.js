// ============================================================
// 安全风险分级管控 —— 演示数据
// 口径：字段整理表 v2 的 5-1 / 5-2 / 5-3 / 5-4 系列共 9 张表
// 说明：一期只启用 LEC 法；LS 与风险矩阵预留未启用
// ============================================================
import { PERSON_LIST, POSITION_LIST, NODE_LIST } from './responsibility'

// ---------- 基础字典 ----------
export const GAS_SYSTEMS = [
  '中心供氧系统', '中心吸引系统', '压缩空气系统', '设备带系统',
  '牙科吸引系统', '感染楼吸引系统', '洗消牙科空压系统', '特殊气体汇流排'
]

export const RISK_POINT_TYPES = ['医用气体', '建筑结构', '机电设备', '其他']

export const ACCIDENT_TYPES = [
  '泄漏', '火灾', '爆炸', '中毒窒息', '供氧中断',
  '触电', '机械伤害', '灼烫', '其他'
]

/** L —— 事故发生的可能性（七档） */
export const L_OPTIONS = [
  { value: 10, label: '10 — 完全可以预料' },
  { value: 6, label: '6 — 相当可能' },
  { value: 3, label: '3 — 可能，但不经常' },
  { value: 1, label: '1 — 可能性小，完全意外' },
  { value: 0.5, label: '0.5 — 很不可能，可以设想' },
  { value: 0.2, label: '0.2 — 极不可能' },
  { value: 0.1, label: '0.1 — 实际不可能' }
]

/** E —— 暴露于危险环境的频繁程度（六档） */
export const E_OPTIONS = [
  { value: 10, label: '10 — 连续暴露' },
  { value: 6, label: '6 — 每天工作时间内暴露' },
  { value: 3, label: '3 — 每周一次或偶然暴露' },
  { value: 2, label: '2 — 每月一次暴露' },
  { value: 1, label: '1 — 每年几次暴露' },
  { value: 0.5, label: '0.5 — 非常罕见暴露' }
]

/** C —— 发生事故产生的后果（六档） */
export const C_OPTIONS = [
  { value: 100, label: '100 — 十人以上死亡' },
  { value: 40, label: '40 — 三至九人死亡' },
  { value: 15, label: '15 — 一至二人死亡' },
  { value: 7, label: '7 — 严重（重伤、重大财产损失）' },
  { value: 3, label: '3 — 重大，伤残' },
  { value: 1, label: '1 — 引人注意，需要救护' }
]

/** 风险等级五级 —— 色标固定，不进 theme.css */
export const RISK_LEVELS = [
  {
    level: 1, name: '稍有危险', color: '#2173D8', colorName: '蓝',
    min: 0, max: 19, controlLevel: '岗位级',
    action: '可以接受，保持现有管控措施'
  },
  {
    level: 2, name: '一般危险', color: '#FFD600', colorName: '黄',
    min: 20, max: 70, controlLevel: '岗位级',
    action: '需要注意，落实岗位级管控措施并定期检查'
  },
  {
    level: 3, name: '显著危险', color: '#FF9500', colorName: '橙',
    min: 71, max: 160, controlLevel: '科室级',
    action: '需要整改，制定科室级管控措施并跟踪落实'
  },
  {
    level: 4, name: '高度危险', color: '#7B3FF2', colorName: '紫',
    min: 161, max: 320, controlLevel: '部门级',
    action: '需要立即整改，部门级挂牌督办'
  },
  {
    level: 5, name: '极其危险', color: '#D93025', colorName: '红',
    min: 321, max: 99999, controlLevel: '部门级',
    action: '不能继续作业，立即停止并整改后方可恢复'
  }
]

/** D = L × E × C */
export function calcD(l, e, c) {
  if (!l || !e || !c) return 0
  const d = l * e * c
  return Math.round(d * 100) / 100
}

/** 由 D 值判定风险等级（边界归低一级） */
export function riskLevelOf(d) {
  const v = Number(d) || 0
  if (v < 20) return RISK_LEVELS[0]
  if (v <= 70) return RISK_LEVELS[1]
  if (v <= 160) return RISK_LEVELS[2]
  if (v <= 320) return RISK_LEVELS[3]
  return RISK_LEVELS[4]
}

export const AUDIT_STATUS = ['草稿', '待审核', '已通过', '已退回']
export const STATUS_OPTIONS = ['启用', '停用']

// ---------- 5-1 风险点 ----------
export const RISK_POINT_LIST = [
  {
    id: 'FX-QT-0001', name: '液氧储罐区', type: '医用气体',
    facility: '液氧储罐（2×10m³）+ 汽化器 + 调压装置',
    location: '住院楼 B1 液氧站', system: '中心供氧系统',
    area: '液氧储罐区', subjectId: 'ZT-EPC-0001',
    ownerName: '刘志刚', ownerId: 'RY-0005',
    status: '启用', createDate: '2026-01-10'
  },
  {
    id: 'FX-QT-0002', name: '氧气汇流排', type: '医用气体',
    facility: '氧气汇流排（20 瓶位）+ 减压阀组',
    location: '住院楼 1F 汇流排间', system: '中心供氧系统',
    area: '住院楼', subjectId: 'ZT-EPC-0001',
    ownerName: '张伟东', ownerId: 'RY-0006',
    status: '启用', createDate: '2026-01-10'
  },
  {
    id: 'FX-QT-0003', name: '中心供氧输送管道', type: '医用气体',
    facility: '不锈钢主管道 + 区域阀门箱 + 支管',
    location: '住院楼全楼层管井', system: '中心供氧系统',
    area: '住院楼', subjectId: 'ZT-EPC-0001',
    ownerName: '周文斌', ownerId: 'RY-0012',
    status: '启用', createDate: '2026-01-10'
  },
  {
    id: 'FX-QT-0004', name: '终端设备带', type: '医用气体',
    facility: '病房设备带 + 氧气/吸引终端 + 快速接头',
    location: '住院楼 3F-12F 病房', system: '设备带系统',
    area: '住院楼', subjectId: 'ZT-EPC-0001',
    ownerName: '周文斌', ownerId: 'RY-0012',
    status: '启用', createDate: '2026-01-10'
  },
  {
    id: 'FX-JD-0001', name: '压缩空气机组', type: '机电设备',
    facility: '无油空压机 2 台 + 储气罐 + 冷干机 + 过滤器',
    location: '医技楼 B1 空压机房', system: '压缩空气系统',
    area: '医技楼', subjectId: 'ZT-EPC-0001',
    ownerName: '孙建军', ownerId: 'RY-0008',
    status: '启用', createDate: '2026-01-10'
  },
  {
    id: 'FX-JD-0002', name: '真空吸引机组', type: '机电设备',
    facility: '水环式真空泵 2 台 + 汽水分离器 + 储气罐',
    location: '医技楼 B1 吸引机房', system: '中心吸引系统',
    area: '医技楼', subjectId: 'ZT-EPC-0001',
    ownerName: '孙建军', ownerId: 'RY-0008',
    status: '启用', createDate: '2026-01-10'
  },
  {
    id: 'FX-QT-0005', name: '牙科吸引系统', type: '医用气体',
    facility: '牙科吸引机组 + 分离器 + 管路',
    location: '门诊楼 4F 口腔科', system: '牙科吸引系统',
    area: '门诊楼', subjectId: 'ZT-EPC-0001',
    ownerName: '马晓峰', ownerId: 'RY-0009',
    status: '启用', createDate: '2026-02-05'
  },
  {
    id: 'FX-QT-0006', name: '特殊气体汇流排', type: '医用气体',
    facility: '二氧化碳 / 氮气 / 笑气汇流排 + 减压装置',
    location: '医技楼 2F 特殊气体间', system: '特殊气体汇流排',
    area: '医技楼', subjectId: 'ZT-3RD-0001',
    ownerName: '郑海龙', ownerId: 'RY-0010',
    status: '启用', createDate: '2026-02-05'
  }
]

// ---------- 5-1 危险源 ----------
function hz(id, pointId, seq, desc, accidents, trigger, facility, existing, l, e, c, auditStatus, assessDate, assessor) {
  const d = calcD(l, e, c)
  const lv = riskLevelOf(d)
  return {
    id, pointId, seq, desc, accidents, trigger, facility, existing,
    L: l, E: e, C: c, D: d,
    level: lv.level, levelName: lv.name, colorName: lv.colorName, color: lv.color,
    controlLevel: lv.controlLevel,
    method: 'LEC', assessDate, assessor, auditStatus, status: '启用'
  }
}

export const HAZARD_LIST = [
  hz('WX-0001-001', 'FX-QT-0001', 1,
    '液氧储罐超压或安全阀失效导致罐体破裂，大量氧气瞬时释放',
    ['爆炸', '泄漏'], '安全阀卡涩、压力表失真、充装过量、罐体超期未检',
    '液氧储罐、安全阀、压力表',
    '每日两次巡检记录罐压与液位；安全阀每半年校验；罐体每年定期检验',
    3, 6, 40, '已通过', '2026-03-12', '王海涛'),
  hz('WX-0001-002', 'FX-QT-0001', 2,
    '液氧充装作业时液体溢出，接触皮肤造成低温冻伤',
    ['灼烫', '其他'], '充装接头密封失效、操作人员未穿防护、充装速度过快',
    '充装接口、汽化器',
    '充装作业须两人在场；操作人员配戴防冻手套与面罩',
    1, 3, 7, '已通过', '2026-03-12', '王海涛'),
  hz('WX-0001-003', 'FX-QT-0001', 3,
    '液氧站内静电积聚放电引燃可燃物',
    ['火灾'], '防静电接地失效、站内堆放可燃物、未使用防爆电气',
    '防静电接地、站内照明',
    '每月检测接地电阻；站内禁放可燃物；使用防爆灯具',
    1, 6, 15, '已通过', '2026-03-12', '王海涛'),
  hz('WX-0001-004', 'FX-QT-0001', 4,
    '液氧储罐周边警戒缺失，无关人员进入导致误操作',
    ['其他'], '围栏破损、门禁失效、警示标识缺失',
    '围栏、门禁、警示牌',
    '设置双重围栏与门禁；张贴当心低温警示标识',
    3, 3, 1, '已通过', '2026-03-12', '王海涛'),

  hz('WX-0002-001', 'FX-QT-0002', 1,
    '汇流排减压阀膜片破损，氧气持续泄漏至室内',
    ['泄漏', '火灾'], '减压阀超期未更换、膜片老化、钢瓶压力过高',
    '减压阀、膜片、压力表',
    '减压阀每两年更换膜片；汇流排间设置氧浓度报警',
    3, 6, 15, '已通过', '2026-03-13', '王海涛'),
  hz('WX-0002-002', 'FX-QT-0002', 2,
    '氧气钢瓶瓶阀未关闭或密封圈缺失，换瓶时氧气喷射',
    ['泄漏', '灼烫'], '换瓶操作未泄压、密封圈老化、野蛮搬运',
    '瓶阀、密封圈',
    '换瓶前强制泄压；每季度更换密封圈；操作人员持证',
    3, 6, 7, '已通过', '2026-03-13', '王海涛'),
  hz('WX-0002-003', 'FX-QT-0002', 3,
    '汇流排间通风不良，泄漏氧气积聚形成富氧环境',
    ['火灾', '爆炸'], '排风扇停转、进排风口堵塞、通风联锁失效',
    '排风扇、通风口',
    '排风扇与氧浓度报警联锁；每日检查通风运行',
    1, 6, 15, '待审核', '2026-04-08', '赵明辉'),

  hz('WX-0003-001', 'FX-QT-0003', 1,
    '管道焊口或卡套接头松动，氧气缓慢泄漏',
    ['泄漏', '供氧中断'], '施工质量缺陷、管道振动、热胀冷缩',
    '主管道、焊口、卡套接头',
    '年度管道气密性试验；巡检使用检漏液逐点检查',
    6, 6, 3, '已通过', '2026-03-14', '周文斌'),
  hz('WX-0003-002', 'FX-QT-0003', 2,
    '区域阀门被误关闭，下游病区供氧中断',
    ['供氧中断'], '阀门无锁定、检修后未复位、标识不清',
    '区域阀门箱',
    '阀门加装锁定装置；检修执行「挂牌上锁」；阀门编号唯一',
    3, 3, 15, '已通过', '2026-03-14', '周文斌'),
  hz('WX-0003-003', 'FX-QT-0003', 3,
    '管道支吊架锈蚀脱落，管道下垂变形甚至断裂',
    ['泄漏', '其他'], '管井潮湿、支架未防腐、超期未检查',
    '支吊架、管井',
    '每年检查支吊架；管井除湿；锈蚀支架两年内更换',
    1, 6, 3, '已通过', '2026-03-14', '周文斌'),

  hz('WX-0004-001', 'FX-QT-0004', 1,
    '设备带氧气终端快速接头密封失效，病床边漏气',
    ['泄漏', '火灾'], '接头频繁插拔磨损、密封圈老化、粉尘堆积',
    '终端快速接头、密封圈',
    '每半年逐台检测终端气密性；插拔超过 500 次更换接头',
    6, 10, 1, '已通过', '2026-03-15', '周文斌'),
  hz('WX-0004-002', 'FX-QT-0004', 2,
    '设备带内电气线路与氧气管道同槽，短路引燃',
    ['火灾'], '线缆绝缘老化、插座过载、槽内积尘',
    '设备带内线缆、插座',
    '每年检测线路绝缘；氧气管道与电缆分槽敷设',
    1, 10, 7, '已通过', '2026-03-15', '周文斌'),
  hz('WX-0004-003', 'FX-QT-0004', 3,
    '设备带固定螺丝松脱，整体坠落砸伤患者',
    ['机械伤害'], '安装膨胀螺栓失效、墙体开裂、超载挂物',
    '设备带固定件',
    '每年检查固定件扭矩；禁止在设备带悬挂重物',
    3, 10, 1, '已通过', '2026-03-15', '周文斌'),

  hz('WX-0005-001', 'FX-JD-0001', 1,
    '空压机高温运行导致排气温度超限，触发停机使压缩空气中断',
    ['供氧中断', '其他'], '冷却器堵塞、润滑油不足、环境温度过高',
    '空压机、冷却器、润滑油系统',
    '每日记录排气温度；每季度清洗冷却器；油位每班检查',
    3, 6, 3, '已通过', '2026-03-16', '孙建军'),
  hz('WX-0005-002', 'FX-JD-0001', 2,
    '储气罐安全阀失效超压，罐体爆破',
    ['爆炸'], '安全阀锈死、压力表失真、超期未检',
    '储气罐、安全阀',
    '安全阀每年校验；储气罐每年定期检验；压力表半年校验',
    1, 6, 15, '已通过', '2026-03-16', '孙建军'),
  hz('WX-0005-003', 'FX-JD-0001', 3,
    '压缩空气未充分干燥，水分进入管路腐蚀并污染终端',
    ['其他'], '冷干机故障、过滤器失效、排水阀堵塞',
    '冷干机、过滤器、排水阀',
    '每日自动排水；每季度更换滤芯；露点在线监测',
    6, 6, 1, '已通过', '2026-03-16', '孙建军'),

  hz('WX-0006-001', 'FX-JD-0002', 1,
    '真空泵水环供水中断导致泵体过热损坏，负压消失',
    ['供氧中断', '机械伤害'], '供水阀误关、水泵故障、水质结垢',
    '真空泵、供水管路',
    '供水压力低报警联锁停机；每季度除垢',
    3, 6, 7, '已通过', '2026-03-16', '孙建军'),
  hz('WX-0006-002', 'FX-JD-0002', 2,
    '汽水分离器满溢，污水倒灌进入吸引管路',
    ['其他'], '排水泵故障、液位计失灵、未按时排水',
    '汽水分离器、排水泵',
    '液位高报警；排水泵双泵冗余；每日巡检液位',
    3, 6, 3, '已通过', '2026-03-16', '孙建军'),
  hz('WX-0006-003', 'FX-JD-0002', 3,
    '真空泵电机接线盒受潮短路，检修时触电',
    ['触电'], '机房渗水、接线盒密封老化、未断电检修',
    '电机接线盒、配电柜',
    '检修强制断电挂牌；接线盒每两年更换密封',
    1, 3, 15, '已通过', '2026-03-16', '孙建军'),

  hz('WX-0007-001', 'FX-QT-0005', 1,
    '牙科吸引管路被口腔填充物堵塞，吸引负压下降',
    ['其他'], '未使用过滤网、冲洗不及时、管路弯折',
    '吸引管路、过滤网',
    '每台配过滤网；每日班后冲洗管路',
    6, 3, 1, '已通过', '2026-03-18', '马晓峰'),
  hz('WX-0007-002', 'FX-QT-0005', 2,
    '牙科吸引排出物含汞合金，未分离直接排放污染环境',
    ['其他'], '汞分离器失效、未定期更换',
    '汞分离器',
    '每年更换汞分离器；废液按危废处置',
    1, 3, 3, '待审核', '2026-04-10', '马晓峰'),

  hz('WX-0008-001', 'FX-QT-0006', 1,
    '二氧化碳汇流排泄漏，狭小空间内积聚导致人员窒息',
    ['中毒窒息'], '减压阀失效、房间通风不足、无氧浓度监测',
    '二氧化碳汇流排、减压阀',
    '特殊气体间设置氧浓度报警与强制排风',
    1, 3, 40, '待审核', '2026-04-11', '郑海龙'),
  hz('WX-0008-002', 'FX-QT-0006', 2,
    '钢瓶未固定倾倒，瓶阀撞击断裂高速喷射',
    ['机械伤害', '其他'], '钢瓶未上链、地面不平、搬运不规范',
    '钢瓶、固定链',
    '所有钢瓶双链固定；搬运使用专用推车',
    3, 2, 7, '已退回', '2026-04-11', '郑海龙'),
  hz('WX-0008-003', 'FX-QT-0006', 3,
    '笑气（氧化亚氮）汇流排泄漏，长期低浓度暴露影响医护健康',
    ['中毒窒息'], '接头泄漏、房间无排放、无定期检测',
    '笑气汇流排',
    '每季度检漏；作业区设置机械排风',
    0.5, 6, 7, '草稿', '', '')
]

// ---------- 5-1 危害因素库 ----------
export const FACTOR_CATEGORIES = ['人', '机', '料', '法', '环']

export const FACTOR_LIST = [
  { id: 'YS-R-0001', name: '未持证上岗', category: '人', sub: '资质', desc: '特种设备作业人员未取得有效证件即安排作业', systems: [], refCount: 12, enabled: '启用' },
  { id: 'YS-R-0002', name: '违章操作', category: '人', sub: '行为', desc: '不按操作规程执行，如换瓶前未泄压、检修未挂牌', systems: [], refCount: 18, enabled: '启用' },
  { id: 'YS-R-0003', name: '疲劳作业', category: '人', sub: '状态', desc: '连续值班超 12 小时，注意力下降', systems: ['中心供氧系统'], refCount: 5, enabled: '启用' },
  { id: 'YS-R-0004', name: '未佩戴防护用品', category: '人', sub: '防护', desc: '充装、检修作业未穿防冻服、未戴防毒面具', systems: [], refCount: 7, enabled: '启用' },
  { id: 'YS-J-0001', name: '安全阀失效', category: '机', sub: '安全附件', desc: '安全阀卡涩、锈死或超期未校验', systems: ['中心供氧系统', '压缩空气系统'], refCount: 9, enabled: '启用' },
  { id: 'YS-J-0002', name: '压力表失真', category: '机', sub: '仪表', desc: '压力表指针卡滞或超期未检定', systems: ['中心供氧系统'], refCount: 6, enabled: '启用' },
  { id: 'YS-J-0003', name: '密封件老化', category: '机', sub: '密封', desc: 'O 型圈、膜片、垫片老化失去弹性', systems: [], refCount: 15, enabled: '启用' },
  { id: 'YS-J-0004', name: '管道锈蚀', category: '机', sub: '本体', desc: '管道内外壁锈蚀减薄，承压能力下降', systems: ['中心供氧系统'], refCount: 8, enabled: '启用' },
  { id: 'YS-J-0005', name: '电气绝缘老化', category: '机', sub: '电气', desc: '线缆绝缘层脆化开裂，存在短路与触电风险', systems: [], refCount: 11, enabled: '启用' },
  { id: 'YS-J-0006', name: '通风设备失效', category: '机', sub: '通风', desc: '排风扇停转或风量不足，有害气体积聚', systems: [], refCount: 4, enabled: '启用' },
  { id: 'YS-L-0001', name: '氧气纯度不达标', category: '料', sub: '介质', desc: '液氧或瓶装氧纯度低于 99.5%，影响治疗效果', systems: ['中心供氧系统'], refCount: 3, enabled: '启用' },
  { id: 'YS-L-0002', name: '钢瓶超期未检', category: '料', sub: '容器', desc: '气瓶超过检验周期仍在使用', systems: ['中心供氧系统', '特殊气体汇流排'], refCount: 5, enabled: '启用' },
  { id: 'YS-L-0003', name: '备件不合格', category: '料', sub: '备件', desc: '使用非原厂或不符合医用标准的密封件、滤芯', systems: [], refCount: 6, enabled: '启用' },
  { id: 'YS-F-0001', name: '操作规程缺失', category: '法', sub: '制度', desc: '关键作业无书面操作规程或规程未更新', systems: [], refCount: 4, enabled: '启用' },
  { id: 'YS-F-0002', name: '交接班不清', category: '法', sub: '流程', desc: '设备状态、异常情况未完整交接', systems: ['中心供氧系统'], refCount: 7, enabled: '启用' },
  { id: 'YS-F-0003', name: '检修未挂牌上锁', category: '法', sub: '流程', desc: '检修期间未执行 LOTO，存在误启动风险', systems: [], refCount: 10, enabled: '启用' },
  { id: 'YS-F-0004', name: '应急演练缺失', category: '法', sub: '应急', desc: '未按周期开展供氧中断、氧气泄漏应急演练', systems: [], refCount: 3, enabled: '启用' },
  { id: 'YS-H-0001', name: '空间狭小通风不良', category: '环', sub: '空间', desc: '汇流排间、特殊气体间面积小、换气次数不足', systems: ['特殊气体汇流排'], refCount: 5, enabled: '启用' },
  { id: 'YS-H-0002', name: '高温高湿', category: '环', sub: '气候', desc: '机房温度超 40℃、管井长期潮湿', systems: [], refCount: 6, enabled: '启用' },
  { id: 'YS-H-0003', name: '照明不足', category: '环', sub: '照明', desc: '机房、管井照度低于 100lx，影响巡检观察', systems: [], refCount: 2, enabled: '启用' },
  { id: 'YS-H-0004', name: '标识缺失', category: '环', sub: '标识', desc: '管道流向、阀门编号、警示标识缺失或模糊', systems: [], refCount: 9, enabled: '启用' }
]

// ---------- 5-1 分级标准（一期预置只读） ----------
export const GRADE_STANDARDS = RISK_LEVELS.map((r) => ({
  level: r.level,
  name: r.name,
  min: r.min,
  max: r.max,
  colorName: r.colorName,
  color: r.color,
  action: r.action,
  controlLevel: r.controlLevel,
  version: 'V1.0',
  enabled: '启用'
}))

// ---------- 5-1 评估审核流水 ----------
export const AUDIT_LIST = [
  { id: 'SH-00000001', hazardId: 'WX-0001-001', hazardDesc: '液氧储罐超压或安全阀失效导致罐体破裂', dSnapshot: 720, levelSnapshot: 5, submitter: '刘志刚', submitTime: '2026-03-12 09:20', stage: '第二级（安全负责人）', auditor: '李国强', auditTime: '2026-03-12 14:05', conclusion: '通过', opinion: '同意 5 级判定，按部门级挂牌督办，立即落实停止作业要求', flowStatus: '已通过' },
  { id: 'SH-00000002', hazardId: 'WX-0001-002', hazardDesc: '液氧充装作业时液体溢出造成冻伤', dSnapshot: 21, levelSnapshot: 2, submitter: '刘志刚', submitTime: '2026-03-12 09:22', stage: '第二级（安全负责人）', auditor: '李国强', auditTime: '2026-03-12 14:10', conclusion: '通过', opinion: '同意', flowStatus: '已通过' },
  { id: 'SH-00000003', hazardId: 'WX-0002-001', hazardDesc: '汇流排减压阀膜片破损，氧气持续泄漏', dSnapshot: 270, levelSnapshot: 4, submitter: '张伟东', submitTime: '2026-03-13 10:00', stage: '第二级（安全负责人）', auditor: '王海涛', auditTime: '2026-03-13 16:30', conclusion: '通过', opinion: '同意 4 级，需加装氧浓度报警并联锁排风', flowStatus: '已通过' },
  { id: 'SH-00000004', hazardId: 'WX-0003-001', hazardDesc: '管道焊口或卡套接头松动，氧气缓慢泄漏', dSnapshot: 108, levelSnapshot: 3, submitter: '周文斌', submitTime: '2026-03-14 08:40', stage: '第二级（安全负责人）', auditor: '王海涛', auditTime: '2026-03-14 15:20', conclusion: '通过', opinion: '同意 3 级，年度气密性试验须留档', flowStatus: '已通过' },
  { id: 'SH-00000005', hazardId: 'WX-0005-001', hazardDesc: '空压机高温运行触发停机使压缩空气中断', dSnapshot: 54, levelSnapshot: 2, submitter: '孙建军', submitTime: '2026-03-16 09:15', stage: '第二级（安全负责人）', auditor: '赵明辉', auditTime: '2026-03-16 17:00', conclusion: '通过', opinion: '同意', flowStatus: '已通过' },
  { id: 'SH-00000006', hazardId: 'WX-0002-003', hazardDesc: '汇流排间通风不良，泄漏氧气积聚形成富氧环境', dSnapshot: 90, levelSnapshot: 3, submitter: '张伟东', submitTime: '2026-04-08 10:30', stage: '第一级（专业负责人）', auditor: '', auditTime: '', conclusion: '', opinion: '', flowStatus: '待第一级' },
  { id: 'SH-00000007', hazardId: 'WX-0008-001', hazardDesc: '二氧化碳汇流排泄漏，狭小空间内积聚导致人员窒息', dSnapshot: 120, levelSnapshot: 3, submitter: '郑海龙', submitTime: '2026-04-11 11:00', stage: '第一级（专业负责人）', auditor: '', auditTime: '', conclusion: '', opinion: '', flowStatus: '待第一级' },
  { id: 'SH-00000008', hazardId: 'WX-0008-002', hazardDesc: '钢瓶未固定倾倒，瓶阀撞击断裂高速喷射', dSnapshot: 42, levelSnapshot: 2, submitter: '郑海龙', submitTime: '2026-04-11 11:05', stage: '第一级（专业负责人）', auditor: '赵明辉', auditTime: '2026-04-12 09:00', conclusion: '退回', opinion: 'E 值取值依据不足，请补充现场作业频次记录后重新提交', flowStatus: '已退回' }
]

// ---------- 5-3 管控措施 ----------
export const MEASURE_CATEGORIES = ['工程技术', '管理', '培训教育', '个体防护', '应急处置']
export const MEASURE_STATUS = ['未开始', '进行中', '已完成', '已逾期']
export const VALIDITY_STATUS = ['未验证', '有效', '部分有效', '无效']
export const CONTROL_LEVELS = ['岗位级', '科室级', '部门级']

export const MEASURE_LIST = [
  {
    id: 'CS-GC-0001', name: '液氧储罐安全阀与压力联锁改造', category: '工程技术',
    desc: '在安全阀前加装双路压力变送器，超压自动报警并联动切断充装阀',
    requirement: '压力变送器精度不低于 0.5 级，报警值设定为 1.35MPa',
    acceptance: '模拟超压试验，报警与切断动作均在 3 秒内完成',
    controlLevel: '部门级', ownerName: '刘志刚', ownerId: 'RY-0005',
    positionName: '运行值班员', planDate: '2026-04-30',
    status: '已完成', validity: '有效', verifyDate: '2026-05-06', verifier: '王海涛',
    linkCount: 1, fromLibrary: '是'
  },
  {
    id: 'CS-GC-0002', name: '汇流排间氧浓度监测与强制排风联锁', category: '工程技术',
    desc: '安装氧浓度报警仪，超 23% 时自动启动防爆排风扇并声光报警',
    requirement: '报警仪每季度标定，排风扇换气次数不低于 12 次/小时',
    acceptance: '标气测试，氧浓度达 23% 时排风扇 5 秒内启动',
    controlLevel: '部门级', ownerName: '张伟东', ownerId: 'RY-0006',
    positionName: '运行值班员', planDate: '2026-05-15',
    status: '已完成', validity: '有效', verifyDate: '2026-05-20', verifier: '王海涛',
    linkCount: 2, fromLibrary: '是'
  },
  {
    id: 'CS-GC-0003', name: '区域阀门挂牌上锁装置', category: '工程技术',
    desc: '每个区域阀门箱加装锁具与唯一编号牌，检修须两人签认',
    requirement: '锁具与钥匙由值班长统一保管，检修记录留存三年',
    acceptance: '抽查 10 个阀门箱，编号与台账一致率 100%',
    controlLevel: '科室级', ownerName: '周文斌', ownerId: 'RY-0012',
    positionName: '维修保养工程师', planDate: '2026-03-31',
    status: '已完成', validity: '有效', verifyDate: '2026-04-02', verifier: '赵明辉',
    linkCount: 1, fromLibrary: '是'
  },
  {
    id: 'CS-GC-0004', name: '特殊气体间氧浓度与强制排风', category: '工程技术',
    desc: '二氧化碳、氮气、笑气汇流排间设置氧浓度报警与机械排风',
    requirement: '报警阈值 19.5%，排风量按房间容积 15 次/小时设计',
    acceptance: '标气测试合格，排风量实测不低于设计值 95%',
    controlLevel: '部门级', ownerName: '郑海龙', ownerId: 'RY-0010',
    positionName: '维修保养工程师', planDate: '2026-06-30',
    status: '进行中', validity: '未验证', verifyDate: '', verifier: '',
    linkCount: 1, fromLibrary: '否'
  },
  {
    id: 'CS-GL-0001', name: '液氧站每日双次巡检制度', category: '管理',
    desc: '每日 08:00、20:00 各巡检一次，记录罐压、液位、汽化器结霜情况',
    requirement: '巡检记录须签名，异常情况 10 分钟内上报值班长',
    acceptance: '抽查近 30 天巡检记录，缺项不超过 1 次',
    controlLevel: '岗位级', ownerName: '刘志刚', ownerId: 'RY-0005',
    positionName: '运行值班员', planDate: '2026-01-31',
    status: '已完成', validity: '有效', verifyDate: '2026-02-05', verifier: '王海涛',
    linkCount: 2, fromLibrary: '是'
  },
  {
    id: 'CS-GL-0002', name: '特种设备定期检验台账管理', category: '管理',
    desc: '压力容器、安全阀、压力表建立检验到期提醒台账，提前 30 天预警',
    requirement: '台账与实际设备一一对应，不得遗漏',
    acceptance: '核对台账与现场设备铭牌，一致率 100%',
    controlLevel: '部门级', ownerName: '赵明辉', ownerId: 'RY-0004',
    positionName: '气体管理员', planDate: '2026-02-28',
    status: '已完成', validity: '有效', verifyDate: '2026-03-03', verifier: '李国强',
    linkCount: 3, fromLibrary: '是'
  },
  {
    id: 'CS-GL-0003', name: '检修作业挂牌上锁（LOTO）流程', category: '管理',
    desc: '所有涉及能量隔离的检修执行挂牌上锁，作业票与锁具编号绑定',
    requirement: '一人一锁一牌，作业结束由本人解锁',
    acceptance: '抽查 5 次检修作业，作业票与锁具记录完整',
    controlLevel: '科室级', ownerName: '孙建军', ownerId: 'RY-0008',
    positionName: '维修保养工程师', planDate: '2026-04-15',
    status: '进行中', validity: '未验证', verifyDate: '', verifier: '',
    linkCount: 2, fromLibrary: '是'
  },
  {
    id: 'CS-GL-0004', name: '设备带终端半年气密性普检', category: '管理',
    desc: '每半年对全部病房设备带终端逐台做气密性检测并贴合格标签',
    requirement: '覆盖率 100%，不合格终端当日停用',
    acceptance: '抽检 20 个终端，无泄漏且标签在有效期内',
    controlLevel: '科室级', ownerName: '周文斌', ownerId: 'RY-0012',
    positionName: '维修保养工程师', planDate: '2026-06-30',
    status: '未开始', validity: '未验证', verifyDate: '', verifier: '',
    linkCount: 1, fromLibrary: '是'
  },
  {
    id: 'CS-GL-0005', name: '钢瓶双链固定与专用推车管理', category: '管理',
    desc: '所有在用与备用钢瓶双链固定，搬运使用专用推车，禁止滚瓶',
    requirement: '每日巡检钢瓶固定状态，发现松动立即整改',
    acceptance: '现场抽查 20 只钢瓶，固定合格率 100%',
    controlLevel: '岗位级', ownerName: '郑海龙', ownerId: 'RY-0010',
    positionName: '气瓶配送员', planDate: '2026-03-15',
    status: '已逾期', validity: '部分有效', verifyDate: '2026-04-20', verifier: '王海涛',
    linkCount: 1, fromLibrary: '是'
  },
  {
    id: 'CS-PX-0001', name: '特种设备作业人员持证上岗管理', category: '培训教育',
    desc: '压力容器操作、电工、高处作业等岗位必须持有效证件，到期前 60 天提醒复审',
    requirement: '无证不得排班，证件台账与排班系统联动',
    acceptance: '抽查在岗人员证件，无证上岗 0 人次',
    controlLevel: '部门级', ownerName: '王海涛', ownerId: 'RY-0003',
    positionName: '气体管理员', planDate: '2026-02-28',
    status: '已完成', validity: '有效', verifyDate: '2026-03-05', verifier: '李国强',
    linkCount: 2, fromLibrary: '是'
  },
  {
    id: 'CS-PX-0002', name: '年度医用气体安全专项培训', category: '培训教育',
    desc: '每年组织不少于 8 学时的医用气体安全培训，覆盖全部运维人员',
    requirement: '培训率 100%，考核合格率 100%',
    acceptance: '培训签到表、试卷、考核成绩齐全',
    controlLevel: '部门级', ownerName: '王海涛', ownerId: 'RY-0003',
    positionName: '气体管理员', planDate: '2026-09-30',
    status: '未开始', validity: '未验证', verifyDate: '', verifier: '',
    linkCount: 0, fromLibrary: '是'
  },
  {
    id: 'CS-GT-0001', name: '液氧充装防冻防护装备配备', category: '个体防护',
    desc: '充装作业配备防冻手套、面屏、防静电工作服与安全鞋',
    requirement: '装备每两年更换，破损即换',
    acceptance: '现场检查 4 套装备，完好率 100%',
    controlLevel: '岗位级', ownerName: '刘志刚', ownerId: 'RY-0005',
    positionName: '运行值班员', planDate: '2026-02-15',
    status: '已完成', validity: '有效', verifyDate: '2026-02-18', verifier: '王海涛',
    linkCount: 1, fromLibrary: '是'
  },
  {
    id: 'CS-GT-0002', name: '特殊气体作业防毒面具配备', category: '个体防护',
    desc: '二氧化碳、氮气作业区配备正压式空气呼吸器与便携式氧浓度检测仪',
    requirement: '每季度检查气瓶压力与面罩气密性',
    acceptance: '抽查 3 套呼吸器，压力均不低于 28MPa',
    controlLevel: '岗位级', ownerName: '郑海龙', ownerId: 'RY-0010',
    positionName: '维修保养工程师', planDate: '2026-05-31',
    status: '进行中', validity: '未验证', verifyDate: '', verifier: '',
    linkCount: 1, fromLibrary: '是'
  },
  {
    id: 'CS-YJ-0001', name: '中心供氧中断现场处置方案演练', category: '应急处置',
    desc: '每半年组织一次供氧中断应急演练，覆盖备用汇流排切换全流程',
    requirement: '切换时间不超过 10 分钟，临床科室同步知晓',
    acceptance: '演练记录、评估报告、改进项闭环',
    controlLevel: '部门级', ownerName: '李国强', ownerId: 'RY-0002',
    positionName: '医用气体管理部门负责人', planDate: '2026-06-30',
    status: '进行中', validity: '未验证', verifyDate: '', verifier: '',
    linkCount: 2, fromLibrary: '是'
  },
  {
    id: 'CS-YJ-0002', name: '氧气泄漏应急处置卡张贴', category: '应急处置',
    desc: '在液氧站、汇流排间、特殊气体间张贴应急处置卡，明确报告与处置步骤',
    requirement: '卡片内容与预案一致，每年更新',
    acceptance: '现场查看 5 处，卡片齐全且在有效期内',
    controlLevel: '科室级', ownerName: '张伟东', ownerId: 'RY-0006',
    positionName: '运行值班员', planDate: '2026-03-31',
    status: '已完成', validity: '有效', verifyDate: '2026-04-05', verifier: '赵明辉',
    linkCount: 1, fromLibrary: '是'
  },
  {
    id: 'CS-GC-0005', name: '设备带强弱电分槽与阻燃套管改造', category: '工程技术',
    desc: '设备带内氧气管道与电气线路分槽敷设，电气线路穿阻燃金属软管',
    requirement: '强弱电间距不小于 100mm，穿越处做防火封堵',
    acceptance: '逐床核查分槽情况，抽检 10% 线路绝缘电阻≥0.5MΩ',
    controlLevel: '科室级', ownerName: '周文斌', ownerId: 'RY-0014',
    positionName: '维修保养工程师', planDate: '2026-09-30',
    status: '进行中', validity: '未验证', verifyDate: '', verifier: '',
    linkCount: 1, fromLibrary: '否'
  },
  {
    id: 'CS-GC-0006', name: '压缩空气干燥机露点在线监测与自动排水', category: '工程技术',
    desc: '加装露点仪与自动排水阀，露点超限报警并联动备用干燥机',
    requirement: '压力露点不高于 -20℃，排水阀每 30 分钟动作一次',
    acceptance: '连续 72 小时记录，露点稳定达标且终端无积水',
    controlLevel: '科室级', ownerName: '孙建军', ownerId: 'RY-0009',
    positionName: '维修保养工程师', planDate: '2026-10-31',
    status: '已完成', validity: '有效', verifyDate: '2026-10-28', verifier: '赵明辉',
    linkCount: 1, fromLibrary: '是'
  }
]

// ---------- 5-3 措施与危险源关联 ----------
export const MEASURE_LINKS = [
  { id: 'GL-00000001', hazardId: 'WX-0001-001', measureId: 'CS-GC-0001', linkType: '主要措施', isDone: '已完成', doneDate: '2026-05-06' },
  { id: 'GL-00000002', hazardId: 'WX-0001-001', measureId: 'CS-GL-0001', linkType: '辅助措施', isDone: '已完成', doneDate: '2026-02-05' },
  { id: 'GL-00000003', hazardId: 'WX-0001-002', measureId: 'CS-GT-0001', linkType: '主要措施', isDone: '已完成', doneDate: '2026-02-18' },
  { id: 'GL-00000004', hazardId: 'WX-0001-003', measureId: 'CS-GL-0001', linkType: '辅助措施', isDone: '已完成', doneDate: '2026-02-05' },
  { id: 'GL-00000005', hazardId: 'WX-0002-001', measureId: 'CS-GC-0002', linkType: '主要措施', isDone: '已完成', doneDate: '2026-05-20' },
  { id: 'GL-00000006', hazardId: 'WX-0002-003', measureId: 'CS-GC-0002', linkType: '主要措施', isDone: '已完成', doneDate: '2026-05-20' },
  { id: 'GL-00000007', hazardId: 'WX-0002-001', measureId: 'CS-GL-0002', linkType: '辅助措施', isDone: '已完成', doneDate: '2026-03-03' },
  { id: 'GL-00000008', hazardId: 'WX-0002-002', measureId: 'CS-PX-0001', linkType: '主要措施', isDone: '已完成', doneDate: '2026-03-05' },
  { id: 'GL-00000009', hazardId: 'WX-0003-002', measureId: 'CS-GC-0003', linkType: '主要措施', isDone: '已完成', doneDate: '2026-04-02' },
  { id: 'GL-00000010', hazardId: 'WX-0003-001', measureId: 'CS-GL-0002', linkType: '辅助措施', isDone: '已完成', doneDate: '2026-03-03' },
  { id: 'GL-00000011', hazardId: 'WX-0004-001', measureId: 'CS-GL-0004', linkType: '主要措施', isDone: '未开始', doneDate: '' },
  { id: 'GL-00000012', hazardId: 'WX-0005-002', measureId: 'CS-GL-0002', linkType: '主要措施', isDone: '已完成', doneDate: '2026-03-03' },
  { id: 'GL-00000013', hazardId: 'WX-0005-001', measureId: 'CS-GL-0003', linkType: '主要措施', isDone: '进行中', doneDate: '' },
  { id: 'GL-00000014', hazardId: 'WX-0006-003', measureId: 'CS-GL-0003', linkType: '主要措施', isDone: '进行中', doneDate: '' },
  { id: 'GL-00000015', hazardId: 'WX-0006-003', measureId: 'CS-PX-0001', linkType: '辅助措施', isDone: '已完成', doneDate: '2026-03-05' },
  { id: 'GL-00000016', hazardId: 'WX-0008-001', measureId: 'CS-GC-0004', linkType: '主要措施', isDone: '进行中', doneDate: '' },
  { id: 'GL-00000017', hazardId: 'WX-0008-002', measureId: 'CS-GL-0005', linkType: '主要措施', isDone: '已逾期', doneDate: '' },
  { id: 'GL-00000018', hazardId: 'WX-0008-003', measureId: 'CS-GT-0002', linkType: '主要措施', isDone: '进行中', doneDate: '' },
  { id: 'GL-00000019', hazardId: 'WX-0003-002', measureId: 'CS-YJ-0001', linkType: '辅助措施', isDone: '进行中', doneDate: '' },
  { id: 'GL-00000020', hazardId: 'WX-0001-001', measureId: 'CS-YJ-0002', linkType: '辅助措施', isDone: '已完成', doneDate: '2026-04-05' }
]

// ---------- 5-4 风险应急预案 ----------
export const PLAN_CATEGORIES = ['综合应急预案', '专项应急预案', '现场处置方案']
export const PLAN_STATUS = ['草稿', '已发布', '已废止']

export const PLAN_LIST = [
  {
    id: 'YA-ZH-0001', name: '医用气体系统综合应急预案', category: '综合应急预案',
    pointIds: [], accidents: ['泄漏', '火灾', '爆炸', '中毒窒息', '供氧中断'],
    positions: ['医用气体管理部门负责人', '气体管理员', '运行值班员'],
    issuer: '医智维运维公司医用气体项目部', editor: '王海涛',
    editDate: '2026-01-20', version: 'V1.0',
    attachments: ['医用气体系统综合应急预案V1.0.pdf'],
    org: '指挥组（组长李国强）、抢险组（组长刘志刚）、疏散组（组长吴晓丽）、后勤保障组（组长赵明辉）',
    flow: '发现异常 → 现场确认与初期处置 → 上报值班长与项目经理 → 启动预案 → 抢险处置 → 恢复供气 → 事件调查与总结',
    resourceCount: 12, status: '已发布', publishDate: '2026-01-25'
  },
  {
    id: 'YA-ZX-0001', name: '中心供氧中断专项应急预案', category: '专项应急预案',
    pointIds: ['FX-QT-0001', 'FX-QT-0002', 'FX-QT-0003'],
    accidents: ['供氧中断'], positions: ['运行值班员', '维修保养工程师'],
    issuer: '医智维运维公司医用气体项目部', editor: '刘志刚',
    editDate: '2026-02-10', version: 'V1.1',
    attachments: ['中心供氧中断专项应急预案V1.1.pdf'],
    org: '指挥组（组长李国强）、切换操作组（组长刘志刚）、临床联络组（组长吴晓丽）',
    flow: '发现压力下降 → 判断是否可切换 → 启动备用汇流排 → 通知临床科室 → 抢修主管道 → 恢复主供气 → 总结',
    resourceCount: 8, status: '已发布', publishDate: '2026-02-15'
  },
  {
    id: 'YA-ZX-0002', name: '氧气泄漏与火灾专项应急预案', category: '专项应急预案',
    pointIds: ['FX-QT-0001', 'FX-QT-0002'],
    accidents: ['泄漏', '火灾', '爆炸'], positions: ['运行值班员', '气瓶配送员'],
    issuer: '医智维运维公司医用气体项目部', editor: '张伟东',
    editDate: '2026-02-18', version: 'V1.0',
    attachments: ['氧气泄漏与火灾专项应急预案V1.0.pdf'],
    org: '指挥组（组长李国强）、抢险组（组长张伟东）、警戒疏散组（组长吴晓丽）',
    flow: '发现泄漏或火情 → 立即切断气源 → 疏散人员并警戒 → 上报并拨打 119 → 使用干粉灭火器初期处置 → 配合消防 → 恢复评估',
    resourceCount: 10, status: '已发布', publishDate: '2026-02-22'
  },
  {
    id: 'YA-XC-0001', name: '液氧储罐超压现场处置方案', category: '现场处置方案',
    pointIds: ['FX-QT-0001'], accidents: ['爆炸', '泄漏'],
    positions: ['运行值班员'],
    issuer: '液氧站运行班', editor: '刘志刚',
    editDate: '2026-03-05', version: 'V1.0',
    attachments: ['液氧储罐超压现场处置方案V1.0.pdf'],
    org: '现场由值班长统一指挥，抢险 2 人、警戒 2 人',
    flow: '超压报警 → 立即停止充装 → 开启放空阀降压 → 疏散周边人员 → 上报项目经理 → 联系厂家技术支持 → 恢复前做气密与安全阀复检',
    resourceCount: 5, status: '已发布', publishDate: '2026-03-10'
  },
  {
    id: 'YA-XC-0002', name: '特殊气体间窒息现场处置方案', category: '现场处置方案',
    pointIds: ['FX-QT-0006'], accidents: ['中毒窒息'],
    positions: ['维修保养工程师', '气瓶配送员'],
    issuer: '上海华卫医用设备维保有限公司', editor: '郑海龙',
    editDate: '2026-04-15', version: 'V1.0',
    attachments: ['特殊气体间窒息现场处置方案V1.0.pdf'],
    org: '现场由气体管理员指挥，救援 2 人（须佩戴正压呼吸器）、警戒 1 人',
    flow: '氧浓度报警 → 禁止单人进入 → 佩戴呼吸器进入施救 → 将人员移至通风处 → 拨打 120 → 关闭气源并强制排风 → 复测氧浓度合格后恢复',
    resourceCount: 6, status: '草稿', publishDate: ''
  },
  {
    id: 'YA-ZX-0003', name: '压缩空气与真空系统故障专项应急预案', category: '专项应急预案',
    pointIds: ['FX-JD-0001', 'FX-JD-0002'],
    accidents: ['供氧中断', '其他'], positions: ['维修保养工程师'],
    issuer: '医智维运维公司医用气体项目部', editor: '孙建军',
    editDate: '2025-11-20', version: 'V1.0',
    attachments: ['压缩空气与真空系统故障专项应急预案V1.0.pdf'],
    org: '指挥组（组长赵明辉）、抢修组（组长孙建军）、临床联络组（组长吴晓丽）',
    flow: '发现压力或负压异常 → 切换备用机组 → 通知临床 → 抢修故障机组 → 恢复并观察 30 分钟',
    resourceCount: 7, status: '已废止', publishDate: '2025-11-25'
  }
]

// ---------- 派生函数 ----------
export function pointName(id) {
  const p = RISK_POINT_LIST.find((x) => x.id === id)
  return p ? p.name : '—'
}
export function pointOf(id) {
  return RISK_POINT_LIST.find((x) => x.id === id) || null
}
export function hazardsOfPoint(pointId) {
  return HAZARD_LIST.filter((h) => h.pointId === pointId)
}
/** 风险点最高风险等级（用于色标） */
export function maxLevelOfPoint(pointId) {
  const hs = hazardsOfPoint(pointId)
  if (!hs.length) return null
  return hs.reduce((m, h) => (h.level > m.level ? h : m), hs[0])
}
/** 风险点审核状态：全部通过才算通过，有草稿算草稿 */
export function auditStatusOfPoint(pointId) {
  const hs = hazardsOfPoint(pointId)
  if (!hs.length) return '草稿'
  if (hs.every((h) => h.auditStatus === '已通过')) return '已通过'
  if (hs.some((h) => h.auditStatus === '已退回')) return '已退回'
  if (hs.some((h) => h.auditStatus === '待审核')) return '待审核'
  return '草稿'
}
export function measureName(id) {
  const m = MEASURE_LIST.find((x) => x.id === id)
  return m ? m.name : '—'
}
export function measuresOfHazard(hazardId) {
  return MEASURE_LINKS.filter((l) => l.hazardId === hazardId).map((l) => {
    const m = MEASURE_LIST.find((x) => x.id === l.measureId)
    return { ...l, measure: m || null }
  })
}
export function hazardName(id) {
  const h = HAZARD_LIST.find((x) => x.id === id)
  return h ? h.desc : '—'
}
export function hazardOf(id) {
  return HAZARD_LIST.find((x) => x.id === id) || null
}
/** 措施关联的危险源数量（实时统计） */
export function linkCountOf(measureId) {
  return MEASURE_LINKS.filter((l) => l.measureId === measureId).length
}

export { PERSON_LIST, POSITION_LIST, NODE_LIST }

/** 某措施关联的危险源（原始关联记录） */
export function linksOfMeasure(measureId) {
  return MEASURE_LINKS.filter((l) => l.measureId === measureId)
}

// ===== 原型数据补全：确保每个危险源都有管控措施，并同步措施关联数 =====
const AUTO_MEASURE_MAP = {
  'WX-0001-004': ['CS-GL-0001', '主要措施'],
  'WX-0003-003': ['CS-GL-0002', '主要措施'],
  'WX-0004-002': ['CS-GC-0005', '主要措施'],
  'WX-0004-003': ['CS-GL-0004', '辅助措施'],
  'WX-0005-003': ['CS-GC-0006', '主要措施'],
  'WX-0006-001': ['CS-GL-0003', '主要措施'],
  'WX-0006-002': ['CS-GL-0001', '辅助措施'],
  'WX-0007-001': ['CS-GL-0004', '辅助措施'],
  'WX-0007-002': ['CS-GL-0002', '辅助措施']
}
Object.entries(AUTO_MEASURE_MAP).forEach(([hazardId, [measureId, linkType]]) => {
  if (!MEASURE_LINKS.some((l) => l.hazardId === hazardId && l.measureId === measureId)) {
    MEASURE_LINKS.push({
      id: 'GL-' + String(MEASURE_LINKS.length + 1).padStart(8, '0'),
      hazardId, measureId, linkType,
      isDone: '已完成', doneDate: '2026-06-01'
    })
  }
})
MEASURE_LIST.forEach((m) => {
  m.linkCount = MEASURE_LINKS.filter((l) => l.measureId === m.id).length
})

// ===== 原型数据补全：为已通过审核但缺流水的危险源补齐审核记录 =====
HAZARD_LIST
  .filter((h) => h.auditStatus === '已通过' && !AUDIT_LIST.some((a) => a.hazardId === h.id))
  .forEach((h) => {
    AUDIT_LIST.push({
      id: 'SH-' + String(AUDIT_LIST.length + 1).padStart(8, '0'),
      hazardId: h.id,
      hazardDesc: h.desc,
      dSnapshot: h.D,
      levelSnapshot: h.level,
      submitter: h.assessor,
      submitTime: h.assessDate + ' 09:00',
      stage: '第二级（安全负责人）',
      auditor: '李国强',
      auditTime: h.assessDate + ' 15:30',
      conclusion: '通过',
      opinion: '同意 ' + h.level + ' 级判定，按' + h.controlLevel + '落实管控',
      flowStatus: '已通过'
    })
  })
