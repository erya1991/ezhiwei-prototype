/**
 * 隐患排查治理 · 数据层
 * 字段口径：字段整理表 v2 —— 6-1 AI随手拍 / 6-2 隐患单 / 6-2 类型与规则 / 6-2 隐患分级标准
 *          6-3 隐患派单记录 / 6-4 排查名片 / 6-4 验收名片
 */

// ============ 字典 ============

/** 所在楼栋 */
export const BUILDINGS = ['门诊楼', '住院楼', '感染楼', '医技楼', '地下车库', '室外']

/** 专业系统（含其他） */
export const HAZARD_SYSTEMS = [
  '中心供氧系统', '中心吸引系统', '压缩空气系统', '设备带系统',
  '牙科吸引系统', '感染楼吸引系统', '洗消牙科空压系统', '特殊气体汇流排', '其他'
]

/** 隐患等级（三级） */
export const HAZARD_LEVELS = ['重大', '较大', '一般']

/** 隐患状态机 */
export const HAZARD_STATUS = ['待受理', '待派单', '整改中', '待验收', '已关闭', '已驳回']

/** 上报方式 */
export const REPORT_METHODS = ['手工上报', 'AI识别']

/** 上报来源 */
export const REPORT_SOURCES = ['小程序', 'PC']

/** 提交状态 */
export const SUBMIT_STATUS = ['草稿', '已提交']

/** 隐患类型分类 */
export const TYPE_CATEGORIES = ['建筑结构', '机电设备', '消防', '环境', '其他']

/** 派单方式 */
export const DISPATCH_METHODS = ['自动派单', '手工派单']

/** 派单对象类型 */
export const DISPATCH_TARGET_TYPES = ['责任人', '岗位', '班组', '责任主体']

/** 派单状态 */
export const DISPATCH_STATUS = ['待接收', '已接收', '已退回', '派单失败']

/** 排查类型 */
export const INSPECT_TYPES = ['日常排查', '专项排查', '节前排查', '季节性排查', '事故后排查']

/** 排查对象类型 */
export const INSPECT_OBJECT_TYPES = ['风险点', '设备设施', '场所区域']

/** 验收结论 */
export const ACCEPT_CONCLUSIONS = ['合格', '不合格', '部分合格']

/** 治理后等级评估 */
export const AFTER_LEVELS = ['重大', '较大', '一般', '已消除']

// ============ 隐患分级标准（配置表 · 三级预置） ============

export const GRADE_STANDARDS = [
  {
    level: 3,
    name: '重大',
    gongwei: 'Ⅰ类',
    colorName: '红',
    color: '#D93025',
    condition: '可能导致供氧中断、气体泄漏爆炸、人员伤亡或重大财产损失；涉及压力容器、压力管道本体失效；影响手术室、ICU 等关键科室供气。',
    deadlineDays: 1,
    acceptRequire: '需第三方复验 + 院方安全负责人联合验收',
    needReport: '是',
    enabled: '启用',
    remark: '须立即停止相关作业并上报院方及监管部门'
  },
  {
    level: 2,
    name: '较大',
    gongwei: 'Ⅱ类',
    colorName: '橙',
    color: '#FF9500',
    condition: '可能导致局部供气压力异常、设备停机、人员轻微伤害；安全附件失效但本体完好；影响普通病区正常使用。',
    deadlineDays: 7,
    acceptRequire: '需安全负责人验收',
    needReport: '否',
    enabled: '启用',
    remark: '限期整改，整改期间加强巡检'
  },
  {
    level: 1,
    name: '一般',
    gongwei: 'Ⅲ类',
    colorName: '黄',
    color: '#FFD600',
    condition: '不影响正常供气与安全运行的外观缺陷、标识缺失、记录不规范、环境脏乱等；可现场整改或短期内处理。',
    deadlineDays: 15,
    acceptRequire: '由部门负责人验收',
    needReport: '否',
    enabled: '启用',
    remark: '可结合日常巡检同步处理'
  }
]

export function gradeOf(levelName) {
  return GRADE_STANDARDS.find((g) => g.name === levelName) || GRADE_STANDARDS[2]
}

/** 按等级自动算整改期限（上报日期 + 天数） */
export function autoDeadline(levelName, baseDateStr) {
  const g = gradeOf(levelName)
  const base = new Date((baseDateStr || todayStr()).slice(0, 10) + 'T00:00:00')
  base.setDate(base.getDate() + g.deadlineDays)
  return fmtDate(base)
}

export function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayStr() {
  return fmtDate(new Date())
}

// ============ 隐患类型库（配置表） ============

export const TYPE_LIST = [
  { id: 'LX-JZ-0001', name: '墙体开裂', category: '建筑结构', systems: [], defaultLevel: '较大', rule: '承重墙或楼板出现可见裂缝，宽度大于 0.3mm', keywords: ['裂缝', '开裂', '沉降'], enabled: '启用', sort: 1 },
  { id: 'LX-JZ-0002', name: '地面破损', category: '建筑结构', systems: [], defaultLevel: '一般', rule: '地面起砂、坑洼、面层脱落', keywords: ['破损', '坑洼', '起砂'], enabled: '启用', sort: 2 },
  { id: 'LX-JD-0001', name: '管道泄漏', category: '机电设备', systems: ['中心供氧系统', '中心吸引系统', '压缩空气系统'], defaultLevel: '重大', rule: '管道接口有气泡、有嘶声，或压力表持续下降', keywords: ['漏气', '泄漏', '嘶声', '压力下降'], enabled: '启用', sort: 3 },
  { id: 'LX-JD-0002', name: '终端堵塞', category: '机电设备', systems: ['中心吸引系统', '牙科吸引系统', '感染楼吸引系统'], defaultLevel: '较大', rule: '终端无负压或流量明显不足', keywords: ['堵塞', '无负压', '流量不足'], enabled: '启用', sort: 4 },
  { id: 'LX-JD-0003', name: '设备带破损', category: '机电设备', systems: ['设备带系统'], defaultLevel: '较大', rule: '设备带面板脱落、接口松动、快速接头密封失效', keywords: ['设备带', '面板脱落', '接口松动'], enabled: '启用', sort: 5 },
  { id: 'LX-JD-0004', name: '安全附件失效', category: '机电设备', systems: ['中心供氧系统', '特殊气体汇流排'], defaultLevel: '重大', rule: '安全阀、爆破片、压力表超期未检或已失效', keywords: ['安全阀', '压力表', '超期', '失效'], enabled: '启用', sort: 6 },
  { id: 'LX-JD-0005', name: '机组异常噪音', category: '机电设备', systems: ['压缩空气系统', '中心吸引系统'], defaultLevel: '一般', rule: '机组运行噪音明显增大、振动异常', keywords: ['噪音', '振动', '异响'], enabled: '启用', sort: 7 },
  { id: 'LX-JD-0006', name: '电气线路隐患', category: '机电设备', systems: [], defaultLevel: '重大', rule: '线路老化、绝缘破损、私拉乱接、未接地', keywords: ['线路', '老化', '裸露', '接地'], enabled: '启用', sort: 8 },
  { id: 'LX-XF-0001', name: '灭火器失效', category: '消防', systems: [], defaultLevel: '较大', rule: '压力不足、超期未检、被遮挡无法取用', keywords: ['灭火器', '压力不足', '遮挡'], enabled: '启用', sort: 9 },
  { id: 'LX-XF-0002', name: '消防通道占用', category: '消防', systems: [], defaultLevel: '重大', rule: '疏散通道、安全出口被物品占用或锁闭', keywords: ['通道', '占用', '锁闭'], enabled: '启用', sort: 10 },
  { id: 'LX-XF-0003', name: '防火门异常', category: '消防', systems: [], defaultLevel: '一般', rule: '常闭防火门被支开、闭门器损坏', keywords: ['防火门', '常闭', '闭门器'], enabled: '启用', sort: 11 },
  { id: 'LX-HJ-0001', name: '现场脏乱', category: '环境', systems: [], defaultLevel: '一般', rule: '设备周边堆放杂物、积尘积水、油污', keywords: ['杂物', '积尘', '积水', '油污'], enabled: '启用', sort: 12 },
  { id: 'LX-HJ-0002', name: '标识缺失', category: '环境', systems: [], defaultLevel: '一般', rule: '管道介质流向标识、警示标识、阀门编号缺失或模糊', keywords: ['标识', '流向', '警示'], enabled: '启用', sort: 13 },
  { id: 'LX-HJ-0003', name: '照明不足', category: '环境', systems: [], defaultLevel: '一般', rule: '设备间、管廊照明缺失或照度不足', keywords: ['照明', '照度', '灯具'], enabled: '启用', sort: 14 },
  { id: 'LX-QT-0001', name: '记录不规范', category: '其他', systems: [], defaultLevel: '一般', rule: '运行记录、交接班记录缺项、代签、提前填写', keywords: ['记录', '缺项', '代签'], enabled: '启用', sort: 15 },
  { id: 'LX-QT-0002', name: '人员未持证', category: '其他', systems: [], defaultLevel: '重大', rule: '特种设备作业人员无证或证件过期仍在岗作业', keywords: ['无证', '过期', '持证'], enabled: '启用', sort: 16 }
]

export function typeOf(id) {
  return TYPE_LIST.find((t) => t.id === id) || null
}

// ============ 隐患单（主表 · 全量台账） ============

export const HAZARD_LIST = [
  // --- 待受理 ---
  {
    id: 'YH-20261101-0001', desc: '住院楼 3F 东侧走廊设备带氧气终端接口处有轻微漏气声，用肥皂水试有气泡',
    location: '住院楼 3F 东侧走廊', building: '住院楼', system: '设备带系统',
    typeId: 'LX-JD-0003', typeName: '设备带破损', level: '重大',
    status: '待受理', reporter: '钱晓燕', reportTime: '2026-11-01 09:12',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['终端接口漏气-近景.jpg', '设备带整体.jpg'],
    clue: '设备带系统维保', subjectName: '', ownerName: '',
    dispatchStatus: '', workOrderNo: '', deadline: '2026-11-02',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0001', remark: ''
  },
  {
    id: 'YH-20261101-0002', desc: '地下车库东侧消防通道堆放 6 个空氧气瓶，通道宽度不足 0.8 米',
    location: '地下车库 东侧消防通道', building: '地下车库', system: '其他',
    typeId: 'LX-XF-0002', typeName: '消防通道占用', level: '重大',
    status: '待受理', reporter: '徐鹏飞', reportTime: '2026-11-01 14:35',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['通道堆瓶.jpg'],
    clue: '气瓶配送组', subjectName: '', ownerName: '',
    dispatchStatus: '', workOrderNo: '', deadline: '2026-11-02',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0002', remark: '气瓶临时存放点已满，需协调库房'
  },
  {
    id: 'YH-20261102-0001', desc: '门诊楼 2F 采血室门口常闭防火门被灭火器箱支开',
    location: '门诊楼 2F 采血室门口', building: '门诊楼', system: '其他',
    typeId: 'LX-XF-0003', typeName: '防火门异常', level: '一般',
    status: '待受理', reporter: '何志远', reportTime: '2026-11-02 08:20',
    method: '手工上报', source: 'PC', submitStatus: '已提交',
    photos: [],
    clue: '', subjectName: '', ownerName: '',
    dispatchStatus: '', workOrderNo: '', deadline: '2026-11-17',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0003', remark: ''
  },

  // --- 待派单 ---
  {
    id: 'YH-20261031-0001', desc: '液氧站 1# 储罐安全阀检验标识显示已超期 2 个月，未更换',
    location: '室外 液氧站 1# 储罐', building: '室外', system: '中心供氧系统',
    typeId: 'LX-JD-0004', typeName: '安全附件失效', level: '重大',
    status: '待派单', reporter: '刘志刚', reportTime: '2026-10-31 10:05',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['安全阀铭牌.jpg', '检验标识.jpg'],
    clue: '液氧站值班', subjectName: '医智维运维公司医用气体项目部', ownerName: '',
    dispatchStatus: '', workOrderNo: '', deadline: '2026-11-01',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0004', remark: '已暂停 1# 储罐主供，切至 2# 储罐'
  },
  {
    id: 'YH-20261031-0002', desc: '感染楼 4F 吸引终端无负压，实测 -0.01MPa，标准应低于 -0.04MPa',
    location: '感染楼 4F 护士站', building: '感染楼', system: '感染楼吸引系统',
    typeId: 'LX-JD-0002', typeName: '终端堵塞', level: '较大',
    status: '待派单', reporter: '周文斌', reportTime: '2026-10-31 16:40',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['负压表读数.jpg'],
    clue: '管网巡检班', subjectName: '医智维运维公司医用气体项目部', ownerName: '',
    dispatchStatus: '', workOrderNo: '', deadline: '2026-11-07',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0005', remark: ''
  },

  // --- 整改中 ---
  {
    id: 'YH-20261028-0001', desc: '制氧机组 2# 机组运行噪音明显增大，伴随周期性振动，疑似轴承磨损',
    location: '室外 制氧站 2# 机组', building: '室外', system: '中心供氧系统',
    typeId: 'LX-JD-0005', typeName: '机组异常噪音', level: '一般',
    status: '整改中', reporter: '孙建军', reportTime: '2026-10-28 11:20',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['机组振动.jpg'],
    clue: '制氧机组维保班', subjectName: '医智维运维公司医用气体项目部', ownerName: '孙建军',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261028-0031', deadline: '2026-11-12',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0006', remark: ''
  },
  {
    id: 'YH-20261027-0001', desc: '医技楼 1F CT 室设备带快速接头密封圈老化，插拔时有轻微漏气',
    location: '医技楼 1F CT 室', building: '医技楼', system: '设备带系统',
    typeId: 'LX-JD-0003', typeName: '设备带破损', level: '较大',
    status: '整改中', reporter: '马晓峰', reportTime: '2026-10-27 09:50',
    method: '手工上报', source: 'PC', submitStatus: '已提交',
    photos: ['快速接头.jpg'],
    clue: '设备带维保', subjectName: '上海华卫医用设备维保有限公司', ownerName: '郑海龙',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261027-0018', deadline: '2026-11-03',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0007', remark: '备件已到货，等待停机窗口'
  },
  {
    id: 'YH-20261026-0001', desc: '中心供氧主管道 DN80 支架锈蚀严重，2 处焊口出现表面锈斑',
    location: '住院楼 地下 1F 管廊', building: '住院楼', system: '中心供氧系统',
    typeId: 'LX-JD-0001', typeName: '管道泄漏', level: '重大',
    status: '整改中', reporter: '周文斌', reportTime: '2026-10-26 15:30',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['支架锈蚀.jpg', '焊口锈斑.jpg', '管廊全景.jpg'],
    clue: '管网巡检班', subjectName: '医智维运维公司医用气体项目部', ownerName: '周文斌',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261026-0042', deadline: '2026-10-27',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0008', remark: '需夜间停气作业，已报院方审批'
  },
  {
    id: 'YH-20261024-0001', desc: '洗消中心牙科空压机储气罐压力表指针卡滞在 0.6MPa 不动',
    location: '医技楼 2F 洗消中心', building: '医技楼', system: '洗消牙科空压系统',
    typeId: 'LX-JD-0004', typeName: '安全附件失效', level: '重大',
    status: '整改中', reporter: '沈立国', reportTime: '2026-10-24 10:15',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['压力表卡滞.jpg'],
    clue: '制氧机组维保班', subjectName: '医智维运维公司医用气体项目部', ownerName: '沈立国',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261024-0015', deadline: '2026-10-25',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0009', remark: '压力表已采购，等待到货'
  },
  {
    id: 'YH-20261023-0001', desc: '牙科综合治疗台 3 号位吸引流量不足，吸引瓶内液体倒吸',
    location: '门诊楼 4F 口腔科', building: '门诊楼', system: '牙科吸引系统',
    typeId: 'LX-JD-0002', typeName: '终端堵塞', level: '较大',
    status: '整改中', reporter: '顾建华', reportTime: '2026-10-23 14:05',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['吸引瓶.jpg'],
    clue: '临床科室反馈', subjectName: '上海华卫医用设备维保有限公司', ownerName: '郑海龙',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261023-0009', deadline: '2026-10-30',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0010', remark: '已临时更换过滤器，待彻底疏通管路'
  },
  {
    id: 'YH-20261022-0001', desc: '液氧站围墙外 3 米处有施工人员动火作业，未见动火许可',
    location: '室外 液氧站围墙外', building: '室外', system: '中心供氧系统',
    typeId: 'LX-QT-0002', typeName: '人员未持证', level: '重大',
    status: '整改中', reporter: '曹德明', reportTime: '2026-10-22 09:40',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['动火现场.jpg'],
    clue: '外部施工单位', subjectName: '上海华卫医用设备维保有限公司', ownerName: '郑海龙',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261022-0003', deadline: '2026-10-23',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0011', remark: '已当场制止，要求补办动火许可'
  },
  {
    id: 'YH-20261021-0001', desc: '住院楼 8F 管井内氧气管道介质流向标识全部脱落',
    location: '住院楼 8F 管道井', building: '住院楼', system: '中心供氧系统',
    typeId: 'LX-HJ-0002', typeName: '标识缺失', level: '一般',
    status: '整改中', reporter: '张伟东', reportTime: '2026-10-21 11:00',
    method: '手工上报', source: 'PC', submitStatus: '已提交',
    photos: [],
    clue: '管网巡检班', subjectName: '医智维运维公司医用气体项目部', ownerName: '张伟东',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261021-0027', deadline: '2026-11-05',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0012', remark: ''
  },

  // --- 待验收 ---
  {
    id: 'YH-20261020-0001', desc: '门诊楼 1F 大厅灭火器 4 具压力表指针在红区，超期未检',
    location: '门诊楼 1F 大厅', building: '门诊楼', system: '其他',
    typeId: 'LX-XF-0001', typeName: '灭火器失效', level: '较大',
    status: '待验收', reporter: '何志远', reportTime: '2026-10-20 08:45',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['灭火器压力表.jpg'],
    clue: '物业消防', subjectName: '医智维运维公司医用气体项目部', ownerName: '何志远',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261020-0011', deadline: '2026-10-27',
    fixMeasure: '已更换 4 具 4kg 干粉灭火器，并粘贴检验标签，检验日期 2026-10-26',
    fixTime: '2026-10-26 15:30', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0013', remark: ''
  },
  {
    id: 'YH-20261019-0001', desc: '液氧站 2# 储罐充装软管外表有裂纹，接头处有轻微结霜',
    location: '室外 液氧站 2# 储罐', building: '室外', system: '中心供氧系统',
    typeId: 'LX-JD-0001', typeName: '管道泄漏', level: '重大',
    status: '待验收', reporter: '刘志刚', reportTime: '2026-10-19 13:20',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['软管裂纹.jpg', '接头结霜.jpg'],
    clue: '液氧站值班', subjectName: '医智维运维公司医用气体项目部', ownerName: '刘志刚',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261019-0006', deadline: '2026-10-20',
    fixMeasure: '已更换充装软管总成，打压试验 2.4MPa 保压 30 分钟无泄漏，记录见附件',
    fixTime: '2026-10-20 17:00', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0014', remark: '需第三方复验'
  },
  {
    id: 'YH-20261018-0001', desc: '制氧站配电柜内电缆绝缘层有破损，裸露铜芯可见',
    location: '室外 制氧站配电间', building: '室外', system: '其他',
    typeId: 'LX-JD-0006', typeName: '电气线路隐患', level: '重大',
    status: '待验收', reporter: '孙建军', reportTime: '2026-10-18 09:30',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['电缆破损.jpg'],
    clue: '维修电工', subjectName: '医智维运维公司医用气体项目部', ownerName: '孙建军',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261018-0002', deadline: '2026-10-19',
    fixMeasure: '已更换破损段电缆 2.5 米，加装阻燃套管，绝缘电阻测试 500MΩ 合格',
    fixTime: '2026-10-19 11:20', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0015', remark: ''
  },
  {
    id: 'YH-20261017-0001', desc: '住院楼 5F 设备带面板 2 处固定螺丝脱落，面板翘起约 15mm',
    location: '住院楼 5F 护士站', building: '住院楼', system: '设备带系统',
    typeId: 'LX-JD-0003', typeName: '设备带破损', level: '较大',
    status: '待验收', reporter: '马晓峰', reportTime: '2026-10-17 16:10',
    method: '手工上报', source: 'PC', submitStatus: '已提交',
    photos: ['面板翘起.jpg'],
    clue: '设备带维保', subjectName: '上海华卫医用设备维保有限公司', ownerName: '郑海龙',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261017-0033', deadline: '2026-10-24',
    fixMeasure: '已补齐 4 颗不锈钢螺丝并加装垫片，面板贴合无翘起',
    fixTime: '2026-10-24 10:00', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0016', remark: ''
  },

  // --- 已关闭 ---
  {
    id: 'YH-20261016-0001', desc: '医技楼 3F 走廊照明 2 盏灯管不亮，夜间巡检视线不清',
    location: '医技楼 3F 走廊', building: '医技楼', system: '其他',
    typeId: 'LX-HJ-0003', typeName: '照明不足', level: '一般',
    status: '已关闭', reporter: '徐鹏飞', reportTime: '2026-10-16 20:15',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: [],
    clue: '物业电工', subjectName: '医智维运维公司医用气体项目部', ownerName: '徐鹏飞',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261016-0020', deadline: '2026-10-31',
    fixMeasure: '已更换 2 支 LED 灯管，实测照度 220lx',
    fixTime: '2026-10-18 09:00', acceptor: '王海涛', acceptTime: '2026-10-18 14:30',
    acceptConclusion: '合格', qrCode: 'QR-YH-0017', remark: ''
  },
  {
    id: 'YH-20261015-0001', desc: '液氧站地面有积水，排水沟篦子堵塞',
    location: '室外 液氧站', building: '室外', system: '中心供氧系统',
    typeId: 'LX-HJ-0001', typeName: '现场脏乱', level: '一般',
    status: '已关闭', reporter: '刘志刚', reportTime: '2026-10-15 08:30',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['积水.jpg'],
    clue: '液氧站值班', subjectName: '医智维运维公司医用气体项目部', ownerName: '刘志刚',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261015-0004', deadline: '2026-10-30',
    fixMeasure: '已疏通排水沟并清理篦子，地面无积水',
    fixTime: '2026-10-15 16:00', acceptor: '赵明辉', acceptTime: '2026-10-16 09:20',
    acceptConclusion: '合格', qrCode: 'QR-YH-0018', remark: ''
  },
  {
    id: 'YH-20261014-0001', desc: '中心吸引机组 1# 真空泵运行记录连续 3 天未填写',
    location: '室外 吸引机房', building: '室外', system: '中心吸引系统',
    typeId: 'LX-QT-0001', typeName: '记录不规范', level: '一般',
    status: '已关闭', reporter: '赵明辉', reportTime: '2026-10-14 10:00',
    method: '手工上报', source: 'PC', submitStatus: '已提交',
    photos: [],
    clue: '运行值班', subjectName: '医智维运维公司医用气体项目部', ownerName: '赵明辉',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261014-0007', deadline: '2026-10-29',
    fixMeasure: '已补齐 3 天记录，并对值班人员进行记录规范培训',
    fixTime: '2026-10-15 11:00', acceptor: '王海涛', acceptTime: '2026-10-16 10:00',
    acceptConclusion: '合格', qrCode: 'QR-YH-0019', remark: ''
  },
  {
    id: 'YH-20261013-0001', desc: '感染楼 2F 负压病房吸引终端接口松动，插拔时终端整体晃动',
    location: '感染楼 2F 负压病房', building: '感染楼', system: '感染楼吸引系统',
    typeId: 'LX-JD-0003', typeName: '设备带破损', level: '较大',
    status: '已关闭', reporter: '周文斌', reportTime: '2026-10-13 15:45',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['终端松动.jpg'],
    clue: '设备带维保', subjectName: '上海华卫医用设备维保有限公司', ownerName: '郑海龙',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261013-0012', deadline: '2026-10-20',
    fixMeasure: '已更换终端底座并重新固定，做气密性试验合格',
    fixTime: '2026-10-19 14:00', acceptor: '王海涛', acceptTime: '2026-10-20 09:30',
    acceptConclusion: '合格', qrCode: 'QR-YH-0020', remark: ''
  },
  {
    id: 'YH-20261012-0001', desc: '地下车库 B2 层氧气瓶暂存区未设置防倾倒链条',
    location: '地下车库 B2 层', building: '地下车库', system: '特殊气体汇流排',
    typeId: 'LX-QT-0002', typeName: '人员未持证', level: '较大',
    status: '已关闭', reporter: '黄立新', reportTime: '2026-10-12 09:15',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: ['暂存区.jpg'],
    clue: '气瓶配送组', subjectName: '医智维运维公司医用气体项目部', ownerName: '黄立新',
    dispatchStatus: '已接收', workOrderNo: 'GD-20261012-0005', deadline: '2026-10-19',
    fixMeasure: '已加装防倾倒链条 2 组、瓶架 1 个，张贴警示标识',
    fixTime: '2026-10-17 16:30', acceptor: '王海涛', acceptTime: '2026-10-18 10:00',
    acceptConclusion: '合格', qrCode: 'QR-YH-0021', remark: ''
  },

  // --- 已驳回 ---
  {
    id: 'YH-20261011-0001', desc: '住院楼 6F 走廊有异味，疑似气体泄漏',
    location: '住院楼 6F 走廊', building: '住院楼', system: '其他',
    typeId: 'LX-HJ-0001', typeName: '现场脏乱', level: '一般',
    status: '已驳回', reporter: '钱晓燕', reportTime: '2026-10-11 11:30',
    method: '手工上报', source: '小程序', submitStatus: '已提交',
    photos: [],
    clue: '',
    subjectName: '', ownerName: '',
    dispatchStatus: '', workOrderNo: '', deadline: '2026-10-26',
    fixMeasure: '', fixTime: '', acceptor: '', acceptTime: '', acceptConclusion: '',
    qrCode: 'QR-YH-0022', remark: '经现场核实为保洁使用消毒液气味，非气体泄漏，驳回'
  }
]

export function hazardOf(id) {
  return HAZARD_LIST.find((h) => h.id === id) || null
}

export function levelColor(levelName) {
  return gradeOf(levelName).color
}

/** 剩余天数（整改期限 - 今天），负数为已逾期 */
export function remainDays(row) {
  if (!row.deadline) return null
  const today = new Date(todayStr() + 'T00:00:00')
  const dl = new Date(row.deadline + 'T00:00:00')
  return Math.round((dl - today) / 86400000)
}

/** 逾期天数：已完成按完成时间算，未完成且已超期按今天算 */
export function overdueDays(row) {
  if (!row.deadline) return 0
  const dl = new Date(row.deadline + 'T00:00:00')
  let end
  if (row.fixTime) {
    end = new Date(row.fixTime.slice(0, 10) + 'T00:00:00')
  } else if (row.status === '已关闭') {
    return 0
  } else {
    end = new Date(todayStr() + 'T00:00:00')
  }
  const diff = Math.round((end - dl) / 86400000)
  return diff > 0 ? diff : 0
}

/** 是否逾期（未完成且已超期） */
export function isOverdue(row) {
  if (row.status === '已关闭' || row.status === '已驳回') return false
  return overdueDays(row) > 0
}

// ============ 派单记录（流水表） ============

export const DISPATCH_LIST = [
  { id: 'PD-20261101-0001', hazardId: 'YH-20261101-0001', level: '重大', workOrderNo: '', method: '自动派单', rule: '重大隐患 → 责任主体 → 第一责任人', targetType: '责任人', target: '郑海龙', dispatchTime: '2026-11-01 09:15', status: '待接收', receiveTime: '', handler: '', failReason: '', remark: '' },
  { id: 'PD-20261101-0002', hazardId: 'YH-20261101-0002', level: '重大', workOrderNo: 'GD-20261101-0051', method: '自动派单', rule: '重大隐患 → 责任主体 → 第一责任人', targetType: '班组', target: '气瓶配送组', dispatchTime: '2026-11-01 14:40', status: '已接收', receiveTime: '2026-11-01 15:10', handler: '黄立新', failReason: '', remark: '' },
  { id: 'PD-20261031-0001', hazardId: 'YH-20261031-0001', level: '重大', workOrderNo: '', method: '自动派单', rule: '重大隐患 → 责任主体 → 第一责任人', targetType: '责任人', target: '刘志刚', dispatchTime: '2026-10-31 10:10', status: '派单失败', receiveTime: '', handler: '', failReason: '责任人当前处于离岗培训状态，工单模块未返回可接收人', remark: '已转手工派单' },
  { id: 'PD-20261031-0002', hazardId: 'YH-20261031-0002', level: '较大', workOrderNo: '', method: '手工派单', rule: '', targetType: '班组', target: '管网巡检班', dispatchTime: '2026-10-31 17:00', status: '待接收', receiveTime: '', handler: '', failReason: '', remark: '' },
  { id: 'PD-20261028-0001', hazardId: 'YH-20261028-0001', level: '一般', workOrderNo: 'GD-20261028-0031', method: '自动派单', rule: '一般隐患 → 岗位 → 班组长', targetType: '岗位', target: '维修保养工程师', dispatchTime: '2026-10-28 11:25', status: '已接收', receiveTime: '2026-10-28 11:50', handler: '孙建军', failReason: '', remark: '' },
  { id: 'PD-20261027-0001', hazardId: 'YH-20261027-0001', level: '较大', workOrderNo: 'GD-20261027-0018', method: '自动派单', rule: '较大隐患 → 责任主体（第三方）→ 第一责任人', targetType: '责任主体', target: '上海华卫医用设备维保有限公司', dispatchTime: '2026-10-27 09:55', status: '已接收', receiveTime: '2026-10-27 10:30', handler: '郑海龙', failReason: '', remark: '' },
  { id: 'PD-20261026-0001', hazardId: 'YH-20261026-0001', level: '重大', workOrderNo: 'GD-20261026-0042', method: '自动派单', rule: '重大隐患 → 责任主体 → 第一责任人', targetType: '责任人', target: '周文斌', dispatchTime: '2026-10-26 15:35', status: '已接收', receiveTime: '2026-10-26 16:00', handler: '周文斌', failReason: '', remark: '' },
  { id: 'PD-20261024-0001', hazardId: 'YH-20261024-0001', level: '重大', workOrderNo: 'GD-20261024-0015', method: '自动派单', rule: '重大隐患 → 责任主体 → 第一责任人', targetType: '责任人', target: '沈立国', dispatchTime: '2026-10-24 10:20', status: '已接收', receiveTime: '2026-10-24 10:45', handler: '沈立国', failReason: '', remark: '' },
  { id: 'PD-20261023-0001', hazardId: 'YH-20261023-0001', level: '较大', workOrderNo: 'GD-20261023-0009', method: '自动派单', rule: '较大隐患 → 责任主体（第三方）→ 第一责任人', targetType: '责任主体', target: '上海华卫医用设备维保有限公司', dispatchTime: '2026-10-23 14:10', status: '已接收', receiveTime: '2026-10-23 15:00', handler: '郑海龙', failReason: '', remark: '' },
  { id: 'PD-20261022-0001', hazardId: 'YH-20261022-0001', level: '重大', workOrderNo: 'GD-20261022-0003', method: '手工派单', rule: '', targetType: '责任人', target: '郑海龙', dispatchTime: '2026-10-22 09:50', status: '已接收', receiveTime: '2026-10-22 10:05', handler: '郑海龙', failReason: '', remark: '现场已制止，需补办手续' },
  { id: 'PD-20261021-0001', hazardId: 'YH-20261021-0001', level: '一般', workOrderNo: 'GD-20261021-0027', method: '自动派单', rule: '一般隐患 → 岗位 → 班组长', targetType: '岗位', target: '设备巡检工', dispatchTime: '2026-10-21 11:05', status: '已接收', receiveTime: '2026-10-21 11:30', handler: '张伟东', failReason: '', remark: '' },
  { id: 'PD-20261020-0001', hazardId: 'YH-20261020-0001', level: '较大', workOrderNo: 'GD-20261020-0011', method: '自动派单', rule: '较大隐患 → 责任主体 → 第一责任人', targetType: '责任人', target: '何志远', dispatchTime: '2026-10-20 08:50', status: '已接收', receiveTime: '2026-10-20 09:10', handler: '何志远', failReason: '', remark: '' },
  { id: 'PD-20261019-0001', hazardId: 'YH-20261019-0001', level: '重大', workOrderNo: 'GD-20261019-0006', method: '自动派单', rule: '重大隐患 → 责任主体 → 第一责任人', targetType: '责任人', target: '刘志刚', dispatchTime: '2026-10-19 13:25', status: '已接收', receiveTime: '2026-10-19 13:40', handler: '刘志刚', failReason: '', remark: '' },
  { id: 'PD-20261018-0001', hazardId: 'YH-20261018-0001', level: '重大', workOrderNo: 'GD-20261018-0002', method: '自动派单', rule: '重大隐患 → 责任主体 → 第一责任人', targetType: '岗位', target: '维修保养工程师', dispatchTime: '2026-10-18 09:35', status: '已接收', receiveTime: '2026-10-18 10:00', handler: '孙建军', failReason: '', remark: '' },
  { id: 'PD-20261017-0001', hazardId: 'YH-20261017-0001', level: '较大', workOrderNo: 'GD-20261017-0033', method: '自动派单', rule: '较大隐患 → 责任主体（第三方）→ 第一责任人', targetType: '责任主体', target: '上海华卫医用设备维保有限公司', dispatchTime: '2026-10-17 16:15', status: '已接收', receiveTime: '2026-10-17 16:40', handler: '郑海龙', failReason: '', remark: '' },
  { id: 'PD-20261016-0001', hazardId: 'YH-20261016-0001', level: '一般', workOrderNo: 'GD-20261016-0020', method: '自动派单', rule: '一般隐患 → 岗位 → 班组长', targetType: '岗位', target: '设备巡检工', dispatchTime: '2026-10-16 20:20', status: '已接收', receiveTime: '2026-10-16 20:50', handler: '徐鹏飞', failReason: '', remark: '' },
  { id: 'PD-20261015-0001', hazardId: 'YH-20261015-0001', level: '一般', workOrderNo: 'GD-20261015-0004', method: '自动派单', rule: '一般隐患 → 岗位 → 班组长', targetType: '责任人', target: '刘志刚', dispatchTime: '2026-10-15 08:35', status: '已接收', receiveTime: '2026-10-15 09:00', handler: '刘志刚', failReason: '', remark: '' },
  { id: 'PD-20261014-0001', hazardId: 'YH-20261014-0001', level: '一般', workOrderNo: 'GD-20261014-0007', method: '手工派单', rule: '', targetType: '责任人', target: '赵明辉', dispatchTime: '2026-10-14 10:05', status: '已接收', receiveTime: '2026-10-14 10:30', handler: '赵明辉', failReason: '', remark: '' },
  { id: 'PD-20261013-0001', hazardId: 'YH-20261013-0001', level: '较大', workOrderNo: 'GD-20261013-0012', method: '自动派单', rule: '较大隐患 → 责任主体（第三方）→ 第一责任人', targetType: '责任主体', target: '上海华卫医用设备维保有限公司', dispatchTime: '2026-10-13 15:50', status: '已接收', receiveTime: '2026-10-13 16:20', handler: '郑海龙', failReason: '', remark: '' },
  { id: 'PD-20261012-0001', hazardId: 'YH-20261012-0001', level: '较大', workOrderNo: 'GD-20261012-0005', method: '自动派单', rule: '较大隐患 → 责任主体 → 第一责任人', targetType: '责任人', target: '黄立新', dispatchTime: '2026-10-12 09:20', status: '已接收', receiveTime: '2026-10-12 09:45', handler: '黄立新', failReason: '', remark: '' },
  { id: 'PD-20261011-0001', hazardId: 'YH-20261011-0001', level: '一般', workOrderNo: '', method: '手工派单', rule: '', targetType: '责任人', target: '吴晓丽', dispatchTime: '2026-10-11 11:35', status: '已退回', receiveTime: '2026-10-11 12:00', handler: '', failReason: '经核实非气体泄漏，建议驳回隐患单', remark: '' }
]

/** 某条隐患的全部派单记录（按时间倒序） */
export function dispatchesOf(hazardId) {
  return DISPATCH_LIST
    .filter((d) => d.hazardId === hazardId)
    .sort((a, b) => (a.dispatchTime < b.dispatchTime ? 1 : -1))
}

/** 某条隐患最新一条派单 */
export function latestDispatch(hazardId) {
  const list = dispatchesOf(hazardId)
  return list.length ? list[0] : null
}

// ============ 排查名片（主表） ============

export const INSPECT_LIST = [
  {
    id: 'PC-20261101-0001', type: '日常排查', objectType: '风险点', objectId: 'FX-QT-0001',
    objectName: '液氧储罐', location: '室外 液氧站',
    inspector: '刘志刚', inspectTime: '2026-11-01 08:30',
    itemCount: 12, foundCount: 1, maxLevel: '重大', conclusion: '发现隐患',
    photos: ['储罐外观.jpg', '安全阀.jpg'], qrCode: 'QR-FX-QT-0001',
    hazards: ['YH-20261031-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261101-0002', type: '日常排查', objectType: '风险点', objectId: 'FX-QT-0004',
    objectName: '终端设备带', location: '住院楼 3F 东侧走廊',
    inspector: '钱晓燕', inspectTime: '2026-11-01 09:00',
    itemCount: 8, foundCount: 1, maxLevel: '重大', conclusion: '发现隐患',
    photos: ['设备带.jpg'], qrCode: 'QR-FX-QT-0004',
    hazards: ['YH-20261101-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261031-0001', type: '专项排查', objectType: '风险点', objectId: 'FX-JD-0002',
    objectName: '真空吸引机组', location: '感染楼 4F 护士站',
    inspector: '周文斌', inspectTime: '2026-10-31 16:20',
    itemCount: 10, foundCount: 1, maxLevel: '较大', conclusion: '发现隐患',
    photos: ['负压表.jpg'], qrCode: 'QR-FX-JD-0002',
    hazards: ['YH-20261031-0002'], status: '已提交', remark: '感染楼专项'
  },
  {
    id: 'PC-20261030-0001', type: '节前排查', objectType: '场所区域', objectId: 'AREA-0001',
    objectName: '地下车库',
    location: '地下车库 B1-B2', inspector: '徐鹏飞', inspectTime: '2026-10-30 14:00',
    itemCount: 15, foundCount: 1, maxLevel: '重大', conclusion: '发现隐患',
    photos: ['车库通道.jpg'], qrCode: 'QR-AREA-0001',
    hazards: ['YH-20261101-0002'], status: '已提交', remark: '节前安全检查'
  },
  {
    id: 'PC-20261028-0001', type: '日常排查', objectType: '设备设施', objectId: 'EQ-0001',
    objectName: '制氧机组 2#',
    location: '室外 制氧站', inspector: '孙建军', inspectTime: '2026-10-28 11:00',
    itemCount: 9, foundCount: 1, maxLevel: '一般', conclusion: '发现隐患',
    photos: [], qrCode: 'QR-EQ-0001',
    hazards: ['YH-20261028-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261027-0001', type: '日常排查', objectType: '风险点', objectId: 'FX-QT-0004',
    objectName: '终端设备带', location: '医技楼 1F CT 室',
    inspector: '马晓峰', inspectTime: '2026-10-27 09:30',
    itemCount: 8, foundCount: 1, maxLevel: '较大', conclusion: '发现隐患',
    photos: [], qrCode: 'QR-FX-QT-0004',
    hazards: ['YH-20261027-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261026-0001', type: '专项排查', objectType: '风险点', objectId: 'FX-QT-0003',
    objectName: '中心供氧输送管道', location: '住院楼 地下 1F 管廊',
    inspector: '周文斌', inspectTime: '2026-10-26 15:00',
    itemCount: 14, foundCount: 1, maxLevel: '重大', conclusion: '发现隐患',
    photos: ['管廊支架.jpg'], qrCode: 'QR-FX-QT-0003',
    hazards: ['YH-20261026-0001'], status: '已提交', remark: '管廊专项'
  },
  {
    id: 'PC-20261024-0001', type: '日常排查', objectType: '设备设施', objectId: 'EQ-0002',
    objectName: '牙科空压机储气罐',
    location: '医技楼 2F 洗消中心', inspector: '沈立国', inspectTime: '2026-10-24 09:50',
    itemCount: 7, foundCount: 1, maxLevel: '重大', conclusion: '发现隐患',
    photos: [], qrCode: 'QR-EQ-0002',
    hazards: ['YH-20261024-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261023-0001', type: '日常排查', objectType: '风险点', objectId: 'FX-QT-0005',
    objectName: '牙科吸引系统', location: '门诊楼 4F 口腔科',
    inspector: '顾建华', inspectTime: '2026-10-23 13:40',
    itemCount: 6, foundCount: 1, maxLevel: '较大', conclusion: '发现隐患',
    photos: [], qrCode: 'QR-FX-QT-0005',
    hazards: ['YH-20261023-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261022-0001', type: '季节性排查', objectType: '风险点', objectId: 'FX-QT-0001',
    objectName: '液氧储罐', location: '室外 液氧站',
    inspector: '曹德明', inspectTime: '2026-10-22 09:20',
    itemCount: 12, foundCount: 1, maxLevel: '重大', conclusion: '发现隐患',
    photos: ['动火作业.jpg'], qrCode: 'QR-FX-QT-0001',
    hazards: ['YH-20261022-0001'], status: '已提交', remark: '秋冬防火专项'
  },
  {
    id: 'PC-20261021-0001', type: '日常排查', objectType: '风险点', objectId: 'FX-QT-0003',
    objectName: '中心供氧输送管道', location: '住院楼 8F 管道井',
    inspector: '张伟东', inspectTime: '2026-10-21 10:40',
    itemCount: 14, foundCount: 1, maxLevel: '一般', conclusion: '发现隐患',
    photos: [], qrCode: 'QR-FX-QT-0003',
    hazards: ['YH-20261021-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261020-0001', type: '日常排查', objectType: '场所区域', objectId: 'AREA-0002',
    objectName: '门诊楼 1F 大厅',
    location: '门诊楼 1F', inspector: '何志远', inspectTime: '2026-10-20 08:30',
    itemCount: 10, foundCount: 1, maxLevel: '较大', conclusion: '发现隐患',
    photos: [], qrCode: 'QR-AREA-0002',
    hazards: ['YH-20261020-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261019-0001', type: '日常排查', objectType: '风险点', objectId: 'FX-QT-0001',
    objectName: '液氧储罐', location: '室外 液氧站',
    inspector: '刘志刚', inspectTime: '2026-10-19 13:00',
    itemCount: 12, foundCount: 1, maxLevel: '重大', conclusion: '发现隐患',
    photos: ['充装软管.jpg'], qrCode: 'QR-FX-QT-0001',
    hazards: ['YH-20261019-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261016-0001', type: '日常排查', objectType: '场所区域', objectId: 'AREA-0003',
    objectName: '医技楼 3F 走廊',
    location: '医技楼 3F', inspector: '徐鹏飞', inspectTime: '2026-10-16 20:00',
    itemCount: 8, foundCount: 1, maxLevel: '一般', conclusion: '发现隐患',
    photos: [], qrCode: 'QR-AREA-0003',
    hazards: ['YH-20261016-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261015-0001', type: '日常排查', objectType: '风险点', objectId: 'FX-QT-0001',
    objectName: '液氧储罐', location: '室外 液氧站',
    inspector: '刘志刚', inspectTime: '2026-10-15 08:15',
    itemCount: 12, foundCount: 1, maxLevel: '一般', conclusion: '发现隐患',
    photos: [], qrCode: 'QR-FX-QT-0001',
    hazards: ['YH-20261015-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261014-0001', type: '日常排查', objectType: '设备设施', objectId: 'EQ-0003',
    objectName: '中心吸引机组 1#',
    location: '室外 吸引机房', inspector: '赵明辉', inspectTime: '2026-10-14 09:40',
    itemCount: 9, foundCount: 1, maxLevel: '一般', conclusion: '发现隐患',
    photos: [], qrCode: 'QR-EQ-0003',
    hazards: ['YH-20261014-0001'], status: '已提交', remark: ''
  },
  {
    id: 'PC-20261102-0001', type: '日常排查', objectType: '风险点', objectId: 'FX-QT-0002',
    objectName: '氧气汇流排', location: '住院楼 1F 汇流排间',
    inspector: '曹德明', inspectTime: '2026-11-02 08:00',
    itemCount: 11, foundCount: 0, maxLevel: '', conclusion: '正常',
    photos: ['汇流排.jpg'], qrCode: 'QR-FX-QT-0002',
    hazards: [], status: '已提交', remark: '各项正常'
  },
  {
    id: 'PC-20261102-0002', type: '日常排查', objectType: '风险点', objectId: 'FX-JD-0001',
    objectName: '压缩空气机组', location: '室外 空压机房',
    inspector: '孙建军', inspectTime: '2026-11-02 09:15',
    itemCount: 10, foundCount: 0, maxLevel: '', conclusion: '正常',
    photos: [], qrCode: 'QR-FX-JD-0001',
    hazards: [], status: '草稿', remark: '待补充现场照片后提交'
  }
]

export function inspectOf(id) {
  return INSPECT_LIST.find((p) => p.id === id) || null
}

/** 某条隐患来自哪次排查 */
export function inspectOfHazard(hazardId) {
  return INSPECT_LIST.find((p) => (p.hazards || []).includes(hazardId)) || null
}

// ============ 验收名片（主表） ============

export const ACCEPT_LIST = [
  { id: 'YS-20261018-0001', hazardId: 'YH-20261016-0001', levelBefore: '一般', inspectId: 'PC-20261016-0001', inspector: '徐鹏飞', measure: '更换 2 支 LED 灯管，实测照度 220lx', fixer: '徐鹏飞', fixTime: '2026-10-18 09:00', photosAfter: ['更换后照明.jpg'], acceptor: '王海涛', acceptTime: '2026-10-18 14:30', conclusion: '合格', levelAfter: '已消除', closed: '是', failReason: '', failCount: 0, remark: '' },
  { id: 'YS-20261016-0001', hazardId: 'YH-20261015-0001', levelBefore: '一般', inspectId: 'PC-20261015-0001', inspector: '刘志刚', measure: '疏通排水沟并清理篦子，地面无积水', fixer: '刘志刚', fixTime: '2026-10-15 16:00', photosAfter: ['清理后地面.jpg'], acceptor: '赵明辉', acceptTime: '2026-10-16 09:20', conclusion: '合格', levelAfter: '已消除', closed: '是', failReason: '', failCount: 0, remark: '' },
  { id: 'YS-20261016-0002', hazardId: 'YH-20261014-0001', levelBefore: '一般', inspectId: 'PC-20261014-0001', inspector: '赵明辉', measure: '补齐 3 天记录，对值班人员做记录规范培训', fixer: '赵明辉', fixTime: '2026-10-15 11:00', photosAfter: ['补齐记录.jpg', '培训签到.jpg'], acceptor: '王海涛', acceptTime: '2026-10-16 10:00', conclusion: '合格', levelAfter: '已消除', closed: '是', failReason: '', failCount: 0, remark: '' },
  { id: 'YS-20261020-0001', hazardId: 'YH-20261013-0001', levelBefore: '较大', inspectId: '', inspector: '周文斌', measure: '更换终端底座并重新固定，做气密性试验合格', fixer: '郑海龙', fixTime: '2026-10-19 14:00', photosAfter: ['终端固定后.jpg', '气密试验记录.jpg'], acceptor: '王海涛', acceptTime: '2026-10-20 09:30', conclusion: '合格', levelAfter: '已消除', closed: '是', failReason: '', failCount: 1, remark: '首次验收发现密封圈未更换，退回后重做' },
  { id: 'YS-20261018-0002', hazardId: 'YH-20261012-0001', levelBefore: '较大', inspectId: '', inspector: '黄立新', measure: '加装防倾倒链条 2 组、瓶架 1 个，张贴警示标识', fixer: '黄立新', fixTime: '2026-10-17 16:30', photosAfter: ['防倾倒链条.jpg', '警示标识.jpg'], acceptor: '王海涛', acceptTime: '2026-10-18 10:00', conclusion: '合格', levelAfter: '已消除', closed: '是', failReason: '', failCount: 0, remark: '' }
]

/** 某条隐患的验收记录 */
export function acceptsOf(hazardId) {
  return ACCEPT_LIST.filter((a) => a.hazardId === hazardId)
}

/** 某条隐患累计不合格次数 */
export function failCountOf(hazardId) {
  return ACCEPT_LIST
    .filter((a) => a.hazardId === hazardId && a.conclusion !== '合格')
    .reduce((m, a) => Math.max(m, a.failCount || 0), 0)
}

// ============ 统计派生 ============

export function countByStatus(status) {
  return HAZARD_LIST.filter((h) => h.status === status).length
}

export function countByLevel(levelName) {
  return HAZARD_LIST.filter((h) => h.level === levelName).length
}

export function overdueList() {
  return HAZARD_LIST.filter((h) => isOverdue(h))
}

// ===== 流程历史 =====
export const FLOW_NODES = ['上报', '受理', '派单', '整改', '驳回', '重新提交', '验收', '关闭']

export const FLOW_NODE_STYLE = {
  上报: 'info',
  受理: 'primary',
  派单: 'warning',
  整改: 'primary',
  驳回: 'danger',
  重新提交: 'warning',
  验收: 'success',
  关闭: 'success'
}

function toMs(timeStr) {
  const t = new Date((timeStr || '').replace(' ', 'T') + ':00').getTime()
  return isNaN(t) ? null : t
}

function fmt(ms) {
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 取两个时间点的中点，保证节点顺序不打架 */
function midpoint(a, b) {
  const ta = toMs(a)
  const tb = toMs(b)
  if (ta === null || tb === null || tb - ta < 60000) return null
  return fmt(ta + Math.floor((tb - ta) / 2))
}

function addHours(timeStr, hours) {
  const d = new Date((timeStr || '').replace(' ', 'T') + ':00')
  if (isNaN(d.getTime())) return timeStr || ''
  d.setHours(d.getHours() + hours)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * 按现有字段倒推流程历史（仅用于初始化展示）。
 * 运行时每次流转会把新节点追加到 h.history，之后优先使用 h.history。
 */
export function deriveHistory(h) {
  const out = []
  out.push({
    time: h.reportTime,
    node: '上报',
    actor: h.reporter || '—',
    action: '提交上报',
    note: `${h.method || '手工上报'} · ${h.source || '小程序'}`
  })
  if (h.status === '待受理') return out

  const disp = dispatchesOf(h.id)[0]
  const dispatchTime = disp ? disp.dispatchTime : addHours(h.reportTime, 4)
  // 受理时间取上报与派单的中点，保证三个节点时间严格递增
  const acceptTime = midpoint(h.reportTime, dispatchTime) || addHours(h.reportTime, 1)
  out.push({
    time: acceptTime,
    node: '受理',
    actor: '王海涛',
    action: '受理',
    note: `确认等级「${h.level}」，责任主体「${h.subjectName || '待指定'}」`
  })
  if (h.status === '待派单') return out

  if (h.status === '已驳回') {
    out.push({
      time: addHours(h.reportTime, 20),
      node: '驳回',
      actor: '王海涛',
      action: '驳回',
      note: h.remark || '信息不足，驳回'
    })
    return out
  }

  out.push({
    time: dispatchTime,
    node: '派单',
    actor: disp ? '系统' : '王海涛',
    action: disp ? disp.method || '自动派单' : '手工派单',
    note: `工单号 ${h.workOrderNo || '—'} · 派给 ${h.ownerName || '—'}`
  })
  if (h.status === '整改中') return out

  out.push({
    time: h.fixTime || addHours(h.reportTime, 30),
    node: '整改',
    actor: h.ownerName || '—',
    action: '提交整改',
    note: h.fixMeasure || '现场整改完成'
  })
  if (h.status === '待验收') return out

  const a = acceptsOf(h.id)[0]
  out.push({
    time: h.acceptTime || (a && a.acceptTime) || addHours(h.reportTime, 48),
    node: '验收',
    actor: h.acceptor || '王海涛',
    action: `验收${h.acceptConclusion || '合格'}`,
    note: a ? `治理后等级 ${a.levelAfter}` : ''
  })
  out.push({
    time: h.acceptTime || (a && a.acceptTime) || addHours(h.reportTime, 48),
    node: '关闭',
    actor: '系统',
    action: '隐患关闭',
    note: '闭环归档'
  })
  return out
}

/** 取隐患完整流程历史：优先运行时累积的 history */
export function historyOf(h) {
  return h.history && h.history.length ? h.history : deriveHistory(h)
}

/** 追加一条流程节点，返回新数组（不改原对象） */
export function appendHistory(h, record) {
  return [...historyOf(h), record]
}
