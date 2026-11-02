/**
 * 安全责任管理体系 —— Mock 数据
 * 字段口径来源：字段整理表 v2 的 4-1 安全责任管理制度、4-2 责任主体 / 组织节点 / 人员任职
 * 业务背景：医用气体系统三方主体（我方 EPC 项目部 / 院方 / 第三方维保单位）
 */
import { PERSON_LIST, POSITION_LIST, ORG_LIST } from './orgPersonnel'

// ---------- 专业系统字典（8 大气体系统）----------
export const GAS_SYSTEMS = [
  '中心供氧系统',
  '中心吸引系统',
  '压缩空气系统',
  '设备带系统',
  '牙科吸引系统',
  '感染楼吸引系统',
  '洗消牙科空压系统',
  '特殊气体汇流排'
]

// ---------- 制度分类（十项管理制度，固定枚举）----------
export const SYSTEM_CATEGORIES = [
  { name: '安全生产责任制', code: 'ZRZ' },
  { name: '隐患排查', code: 'YHP' },
  { name: '教育培训', code: 'PXJY' },
  { name: '特种设备', code: 'TZSB' },
  { name: '应急管理', code: 'YJGL' },
  { name: '事故报告', code: 'SGBG' },
  { name: '消防', code: 'XF' },
  { name: '动火作业', code: 'DHZY' },
  { name: '有限空间', code: 'YXKJ' },
  { name: '承包商管理', code: 'CBSGL' }
]

export const SYSTEM_LEVELS = ['公司级', '项目级', '班组级']

// ---------- 安全责任管理制度 ----------
export const SYSTEM_LIST = [
  {
    id: 'ZD-ZRZ-0001', name: '医用气体安全生产责任制', category: '安全生产责任制', level: '公司级',
    issuer: '医智维运维公司', version: 'V2.0', effectiveDate: '2026-01-01', expireDate: '',
    systems: ['全部'], keywords: '责任制,安全生产,全员,一岗双责',
    attachments: ['医用气体安全生产责任制V2.0.pdf'],
    remark: '公司安全责任体系的纲领性文件'
  },
  {
    id: 'ZD-ZRZ-0002', name: '医用气体安全管理岗位责任清单', category: '安全生产责任制', level: '项目级',
    issuer: '医用气体项目部', version: 'V1.2', effectiveDate: '2026-01-15', expireDate: '',
    systems: ['全部'], keywords: '岗位责任,责任清单,三级责任',
    attachments: ['岗位责任清单V1.2.docx'],
    remark: '明确决策层/管理层/执行层三级责任'
  },
  {
    id: 'ZD-ZRZ-0003', name: '医用气体安全责任考核办法', category: '安全生产责任制', level: '项目级',
    issuer: '医用气体项目部', version: 'V1.0', effectiveDate: '2026-12-01', expireDate: '',
    systems: ['全部'], keywords: '考核,奖惩,责任落实',
    attachments: ['安全责任考核办法V1.0.pdf'],
    remark: '待生效，2026-12-01 起执行'
  },
  {
    id: 'ZD-YHP-0001', name: '安全隐患排查治理管理制度', category: '隐患排查', level: '公司级',
    issuer: '医智维运维公司', version: 'V3.0', effectiveDate: '2026-02-01', expireDate: '',
    systems: ['全部'], keywords: '隐患排查,闭环,整改,销号',
    attachments: ['隐患排查治理管理制度V3.0.pdf'],
    remark: ''
  },
  {
    id: 'ZD-YHP-0002', name: '隐患分级判定与挂牌督办办法', category: '隐患排查', level: '项目级',
    issuer: '医用气体项目部', version: 'V1.0', effectiveDate: '2026-02-20', expireDate: '',
    systems: ['全部'], keywords: '隐患分级,重大隐患,挂牌督办',
    attachments: ['隐患分级判定办法V1.0.pdf'],
    remark: '定义一般/较大/重大隐患判定标准'
  },
  {
    id: 'ZD-PXJY-0001', name: '安全教育培训管理制度', category: '教育培训', level: '公司级',
    issuer: '医智维运维公司', version: 'V2.1', effectiveDate: '2026-03-01', expireDate: '',
    systems: ['全部'], keywords: '三级教育,培训,考核,持证上岗',
    attachments: ['安全教育培训管理制度V2.1.pdf'],
    remark: ''
  },
  {
    id: 'ZD-TZSB-0001', name: '特种设备安全管理制度', category: '特种设备', level: '公司级',
    issuer: '医智维运维公司', version: 'V2.0', effectiveDate: '2026-03-15', expireDate: '',
    systems: ['中心供氧系统', '特殊气体汇流排'], keywords: '特种设备,压力容器,定期检验',
    attachments: ['特种设备安全管理制度V2.0.pdf'],
    remark: ''
  },
  {
    id: 'ZD-TZSB-0002', name: '压力容器定期检验管理规定', category: '特种设备', level: '项目级',
    issuer: '医用气体项目部', version: 'V1.1', effectiveDate: '2026-04-01', expireDate: '',
    systems: ['中心供氧系统'], keywords: '压力容器,液氧储罐,定期检验,年检',
    attachments: ['压力容器定期检验规定V1.1.pdf'],
    remark: '液氧储罐、汽化器检验周期与责任分工'
  },
  {
    id: 'ZD-YJGL-0001', name: '医用气体泄漏应急预案', category: '应急管理', level: '项目级',
    issuer: '医用气体项目部', version: 'V2.0', effectiveDate: '2026-04-10', expireDate: '',
    systems: ['中心供氧系统', '中心吸引系统', '压缩空气系统'],
    keywords: '应急,泄漏,处置,疏散,上报',
    attachments: ['医用气体泄漏应急预案V2.0.pdf'],
    remark: '含液氧泄漏、管道泄漏、终端泄漏三类场景处置流程'
  },
  {
    id: 'ZD-YJGL-0002', name: '应急演练管理办法', category: '应急管理', level: '公司级',
    issuer: '医智维运维公司', version: 'V1.3', effectiveDate: '2026-05-01', expireDate: '',
    systems: ['全部'], keywords: '应急演练,桌面推演,实战演练,评估',
    attachments: ['应急演练管理办法V1.3.pdf'],
    remark: '每季度至少一次实战演练'
  },
  {
    id: 'ZD-SGBG-0001', name: '生产安全事故报告和调查处理制度', category: '事故报告', level: '公司级',
    issuer: '医智维运维公司', version: 'V1.5', effectiveDate: '2026-05-20', expireDate: '',
    systems: ['全部'], keywords: '事故报告,调查,四不放过',
    attachments: ['事故报告和调查处理制度V1.5.pdf'],
    remark: ''
  },
  {
    id: 'ZD-XF-0001', name: '消防安全管理制度', category: '消防', level: '公司级',
    issuer: '医智维运维公司', version: 'V2.2', effectiveDate: '2026-06-01', expireDate: '',
    systems: ['全部'], keywords: '消防,灭火器,疏散通道,防火巡查',
    attachments: ['消防安全管理制度V2.2.pdf'],
    remark: ''
  },
  {
    id: 'ZD-XF-0002', name: '消防设施维护保养规定（2025版）', category: '消防', level: '班组级',
    issuer: '液氧站运行班', version: '2025版', effectiveDate: '2025-01-01', expireDate: '2025-12-31',
    systems: ['全部'], keywords: '消防设施,维保,灭火器年检',
    attachments: ['消防设施维护保养规定2025版.pdf'],
    remark: '已被 2026 版替代，废止'
  },
  {
    id: 'ZD-DHZY-0001', name: '动火作业审批管理制度', category: '动火作业', level: '项目级',
    issuer: '医用气体项目部', version: 'V1.0', effectiveDate: '2026-06-15', expireDate: '',
    systems: ['全部'], keywords: '动火,动火票,监护,气体检测',
    attachments: ['动火作业审批管理制度V1.0.pdf'],
    remark: '医用气体区域动火须二级审批'
  },
  {
    id: 'ZD-YXKJ-0001', name: '有限空间作业安全管理制度', category: '有限空间', level: '项目级',
    issuer: '医用气体项目部', version: 'V1.0', effectiveDate: '2026-07-01', expireDate: '',
    systems: ['中心供氧系统'], keywords: '有限空间,氧舱,通风,气体检测,监护',
    attachments: ['有限空间作业安全管理制度V1.0.pdf'],
    remark: '液氧储罐区、地沟、阀井作业适用'
  },
  {
    id: 'ZD-CBSGL-0001', name: '承包商安全管理制度', category: '承包商管理', level: '公司级',
    issuer: '医智维运维公司', version: 'V1.4', effectiveDate: '2026-07-20', expireDate: '',
    systems: ['全部'], keywords: '承包商,资质审查,安全协议,入场教育',
    attachments: ['承包商安全管理制度V1.4.pdf'],
    remark: '第三方维保单位入场须签安全协议'
  }
]

/** 制度状态：按生效/失效日期与当前日期自动计算 */
export function systemStatus(row) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (row.expireDate) {
    const end = new Date(row.expireDate + 'T00:00:00')
    if (end < today) return '已废止'
  }
  const start = new Date(row.effectiveDate + 'T00:00:00')
  if (start > today) return '待生效'
  return '现行有效'
}

// ---------- 责任主体 ----------
export const SUBJECT_TYPES = ['我方 EPC 项目部', '院方', '第三方维保单位']

export const SUBJECT_LIST = [
  {
    id: 'ZT-EPC-0001', name: '医智维运维公司医用气体项目部', type: '我方 EPC 项目部',
    creditCode: '', contact: '李国强', phone: '13800001002',
    contractNo: 'YJ-EPC-2026-001', systems: GAS_SYSTEMS,
    serviceStart: '2026-01-01', serviceEnd: '2028-12-31',
    campusNodeId: 'ZZ-GL-0001', status: '启用',
    remark: '总承包方，对医用气体系统运维全面负责'
  },
  {
    id: 'ZT-HOS-0001', name: '上海市第一人民医院（南院）', type: '院方',
    creditCode: '12310000425012345X', contact: '陈志明', phone: '13800002001',
    contractNo: 'YJ-EPC-2026-001', systems: GAS_SYSTEMS,
    serviceStart: '2026-01-01', serviceEnd: '2028-12-31',
    campusNodeId: 'ZZ-JC-0001', status: '启用',
    remark: '使用方与监督方，参与联合检查与验收'
  },
  {
    id: 'ZT-3RD-0001', name: '上海华卫医用设备维保有限公司', type: '第三方维保单位',
    creditCode: '91310115MA1K3XYZ8N', contact: '郑海龙', phone: '13800001010',
    contractNo: 'YJ-3RD-2026-007', systems: ['中心供氧系统', '特殊气体汇流排'],
    serviceStart: '2026-03-01', serviceEnd: '2027-02-28',
    campusNodeId: 'ZZ-ZX-0002', status: '启用',
    remark: '负责液氧储罐与汇流排专项维保'
  }
]

// ---------- 组织节点（三级架构 + 配合层）----------
export const NODE_LEVELS = ['决策层', '管理层', '执行层', '配合层']
export const NODE_TYPES = ['专项小组', '管理部门', '运行班组', '临床联络岗']

export const NODE_LIST = [
  {
    id: 'ZZ-JC-0001', name: '医用气体安全管理专项小组', level: '决策层', nodeType: '专项小组',
    parentId: '', subjectId: 'ZT-HOS-0001', systems: ['全部'],
    quota: 5, effectiveDate: '2026-01-01', sort: 1, status: '启用',
    remark: '院方与总承包方联合组建，季度例会'
  },
  {
    id: 'ZZ-GL-0001', name: '医用气体管理部门', level: '管理层', nodeType: '管理部门',
    parentId: 'ZZ-JC-0001', subjectId: 'ZT-EPC-0001', systems: GAS_SYSTEMS,
    quota: 3, effectiveDate: '2026-01-01', sort: 1, status: '启用',
    remark: '日常运维归口管理，配置气体管理员'
  },
  {
    id: 'ZZ-ZX-0001', name: '液氧站运行班', level: '执行层', nodeType: '运行班组',
    parentId: 'ZZ-GL-0001', subjectId: 'ZT-EPC-0001', systems: ['中心供氧系统'],
    quota: 6, effectiveDate: '2026-01-01', sort: 1, status: '启用',
    remark: '液氧储罐区 24 小时值守'
  },
  {
    id: 'ZZ-ZX-0002', name: '制氧机组维保班', level: '执行层', nodeType: '运行班组',
    parentId: 'ZZ-GL-0001', subjectId: 'ZT-EPC-0001',
    systems: ['中心供氧系统', '压缩空气系统', '特殊气体汇流排'],
    quota: 4, effectiveDate: '2026-01-01', sort: 2, status: '启用',
    remark: '制氧机组、负压机组、汇流排维保'
  },
  {
    id: 'ZZ-ZX-0003', name: '管网巡检班', level: '执行层', nodeType: '运行班组',
    parentId: 'ZZ-GL-0001', subjectId: 'ZT-EPC-0001',
    systems: ['中心供氧系统', '中心吸引系统', '压缩空气系统', '设备带系统'],
    quota: 3, effectiveDate: '2026-01-01', sort: 3, status: '启用',
    remark: '输配管网及终端设备巡检'
  },
  {
    id: 'ZZ-ZX-0004', name: '气瓶配送组', level: '执行层', nodeType: '运行班组',
    parentId: 'ZZ-GL-0001', subjectId: 'ZT-EPC-0001',
    systems: ['中心供氧系统', '特殊气体汇流排'],
    quota: 3, effectiveDate: '2026-01-01', sort: 4, status: '启用',
    remark: '氧气瓶配送与空满瓶回收'
  },
  {
    id: 'ZZ-PH-0001', name: '临床联络岗', level: '配合层', nodeType: '临床联络岗',
    parentId: 'ZZ-GL-0001', subjectId: 'ZT-EPC-0001',
    systems: ['设备带系统', '中心吸引系统'],
    quota: 2, effectiveDate: '2026-01-01', sort: 5, status: '启用',
    remark: '对接临床科室用气需求与异常反馈'
  }
]

// ---------- 人员任职 ----------
export const DUTY_TAGS = ['第一责任人', '专业负责人', '系统分包负责人', '普通责任人']

export const ASSIGNMENT_LIST = [
  {
    id: 'RZ-0001', personId: 'RY-0002', personName: '李国强', empNo: 'YJ002',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0002', positionName: '医用气体管理部门负责人',
    nodeId: 'ZZ-JC-0001', dutyTag: '第一责任人',
    systems: ['全部'], areas: ['全部院区'],
    startDate: '2026-01-01', endDate: '', remark: '项目经理，安全第一责任人'
  },
  {
    id: 'RZ-0002', personId: 'RY-0003', personName: '王海涛', empNo: 'YJ003',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0003', positionName: '气体管理员',
    nodeId: 'ZZ-GL-0001', dutyTag: '专业负责人',
    systems: GAS_SYSTEMS, areas: ['全部院区'],
    startDate: '2026-01-01', endDate: '', remark: '安全管理部负责人，专业归口'
  },
  {
    id: 'RZ-0003', personId: 'RY-0004', personName: '赵明辉', empNo: 'YJ004',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0003', positionName: '气体管理员',
    nodeId: 'ZZ-GL-0001', dutyTag: '专业负责人',
    systems: ['中心供氧系统', '压缩空气系统'], areas: ['住院楼', '门诊楼'],
    startDate: '2026-01-01', endDate: '', remark: '设备运维部负责人'
  },
  {
    id: 'RZ-0004', personId: 'RY-0005', personName: '刘志刚', empNo: 'YJ005',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0004', positionName: '运行值班员',
    nodeId: 'ZZ-ZX-0001', dutyTag: '系统分包负责人',
    systems: ['中心供氧系统'], areas: ['液氧储罐区'],
    startDate: '2026-01-01', endDate: '', remark: '液氧站班组长'
  },
  {
    id: 'RZ-0005', personId: 'RY-0006', personName: '张伟东', empNo: 'YJ006',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0004', positionName: '运行值班员',
    nodeId: 'ZZ-ZX-0001', dutyTag: '普通责任人',
    systems: ['中心供氧系统'], areas: ['液氧储罐区'],
    startDate: '2026-01-01', endDate: '', remark: ''
  },
  {
    id: 'RZ-0006', personId: 'RY-0017', personName: '顾建华', empNo: 'YJ017',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0004', positionName: '运行值班员',
    nodeId: 'ZZ-ZX-0001', dutyTag: '普通责任人',
    systems: ['中心供氧系统'], areas: ['液氧储罐区'],
    startDate: '2026-01-01', endDate: '', remark: ''
  },
  {
    id: 'RZ-0007', personId: 'RY-0018', personName: '曹德明', empNo: 'YJ018',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0004', positionName: '运行值班员',
    nodeId: 'ZZ-ZX-0001', dutyTag: '普通责任人',
    systems: ['中心供氧系统'], areas: ['液氧储罐区'],
    startDate: '2026-01-01', endDate: '', remark: ''
  },
  {
    id: 'RZ-0008', personId: 'RY-0008', personName: '孙建军', empNo: 'YJ008',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0005', positionName: '维修保养工程师',
    nodeId: 'ZZ-ZX-0002', dutyTag: '系统分包负责人',
    systems: ['中心供氧系统', '压缩空气系统'], areas: ['制氧站', '负压机房'],
    startDate: '2026-01-01', endDate: '', remark: '制氧机组维保班组长'
  },
  {
    id: 'RZ-0009', personId: 'RY-0009', personName: '马晓峰', empNo: 'YJ009',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0005', positionName: '维修保养工程师',
    nodeId: 'ZZ-ZX-0002', dutyTag: '普通责任人',
    systems: ['中心供氧系统'], areas: ['制氧站'],
    startDate: '2026-01-01', endDate: '', remark: ''
  },
  {
    id: 'RZ-0010', personId: 'RY-0010', personName: '郑海龙', empNo: 'YJ010',
    subjectId: 'ZT-3RD-0001', positionId: 'GW-0005', positionName: '维修保养工程师',
    nodeId: 'ZZ-ZX-0002', dutyTag: '系统分包负责人',
    systems: ['特殊气体汇流排'], areas: ['汇流排间'],
    startDate: '2026-03-01', endDate: '', remark: '第三方维保派驻'
  },
  {
    id: 'RZ-0011', personId: 'RY-0019', personName: '沈立国', empNo: 'YJ019',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0005', positionName: '维修保养工程师',
    nodeId: 'ZZ-ZX-0002', dutyTag: '普通责任人',
    systems: ['压缩空气系统'], areas: ['负压机房'],
    startDate: '2026-01-01', endDate: '', remark: ''
  },
  {
    id: 'RZ-0012', personId: 'RY-0011', personName: '周文斌', empNo: 'YJ011',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0007', positionName: '班组安全员',
    nodeId: 'ZZ-ZX-0003', dutyTag: '系统分包负责人',
    systems: ['中心供氧系统', '中心吸引系统'], areas: ['住院楼', '门诊楼', '医技楼'],
    startDate: '2026-01-01', endDate: '', remark: '管网巡检班组长'
  },
  {
    id: 'RZ-0013', personId: 'RY-0012', personName: '徐鹏飞', empNo: 'YJ012',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0007', positionName: '班组安全员',
    nodeId: 'ZZ-ZX-0003', dutyTag: '普通责任人',
    systems: ['设备带系统'], areas: ['住院楼'],
    startDate: '2026-01-01', endDate: '', remark: ''
  },
  {
    id: 'RZ-0014', personId: 'RY-0013', personName: '何志远', empNo: 'YJ013',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0007', positionName: '班组安全员',
    nodeId: 'ZZ-ZX-0003', dutyTag: '普通责任人',
    systems: ['中心吸引系统'], areas: ['医技楼'],
    startDate: '2026-01-01', endDate: '', remark: ''
  },
  {
    id: 'RZ-0015', personId: 'RY-0007', personName: '黄立新', empNo: 'YJ007',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0006', positionName: '气瓶配送员',
    nodeId: 'ZZ-ZX-0004', dutyTag: '系统分包负责人',
    systems: ['中心供氧系统'], areas: ['全部院区'],
    startDate: '2026-01-01', endDate: '', remark: '分包单位派驻'
  },
  {
    id: 'RZ-0016', personId: 'RY-0015', personName: '吴晓丽', empNo: 'YJ015',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0008', positionName: '临床联络员',
    nodeId: 'ZZ-PH-0001', dutyTag: '专业负责人',
    systems: ['设备带系统', '中心吸引系统'], areas: ['全部院区'],
    startDate: '2026-01-01', endDate: '', remark: '临床服务部负责人'
  },
  {
    id: 'RZ-0017', personId: 'RY-0016', personName: '钱晓燕', empNo: 'YJ016',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0008', positionName: '临床联络员',
    nodeId: 'ZZ-PH-0001', dutyTag: '普通责任人',
    systems: ['设备带系统'], areas: ['住院楼'],
    startDate: '2026-01-01', endDate: '', remark: ''
  },
  {
    id: 'RZ-0018', personId: 'RY-0014', personName: '罗建平', empNo: 'YJ014',
    subjectId: 'ZT-EPC-0001', positionId: 'GW-0006', positionName: '气瓶配送员',
    nodeId: 'ZZ-ZX-0004', dutyTag: '普通责任人',
    systems: ['中心供氧系统'], areas: ['全部院区'],
    startDate: '2026-01-01', endDate: '2026-08-31', remark: '已离场，任职终止'
  }
]

// ---------- 派生 ----------
/** 任职状态：按任职止与当前日期自动判定 */
export function assignmentStatus(row) {
  if (!row.endDate) return '在任'
  const end = new Date(row.endDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return end < today ? '已离任' : '在任'
}

/** 节点在岗人数：按该节点下状态为「在任」的任职记录统计 */
export function countOnDutyByNode(nodeId) {
  return ASSIGNMENT_LIST.filter((a) => a.nodeId === nodeId && assignmentStatus(a) === '在任').length
}

/** 主体关联节点数 */
export function countNodesBySubject(subjectId) {
  return NODE_LIST.filter((n) => n.subjectId === subjectId).length
}

/** 主体关联任职人数（去重） */
export function countPersonsBySubject(subjectId) {
  const set = new Set(
    ASSIGNMENT_LIST.filter((a) => a.subjectId === subjectId && assignmentStatus(a) === '在任')
      .map((a) => a.personId)
  )
  return set.size
}

/** 人员持证状态（从人员档案带出） */
export { personCertStatus } from './orgPersonnel'

/** 按层级构造组织节点树 */
export function buildNodeTree(list = NODE_LIST) {
  const map = new Map()
  list.forEach((n) => map.set(n.id, { ...n, children: [] }))
  const roots = []
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

/** 节点树层级代码 → 编号前缀 */
export const LEVEL_CODE = {
  决策层: 'JC',
  管理层: 'GL',
  执行层: 'ZX',
  配合层: 'PH'
}

export { PERSON_LIST, POSITION_LIST, ORG_LIST }
