/**
 * 人员调度 / 组织与人员 —— Mock 数据
 * 字段口径来源：字段整理表 v2 的 8-1 六张表（组织 / 岗位 / 人员 / 持证信息 / 工种 / 角色权限）
 * 数据背景：医用气体系统运维场景，主体为「医智维运维公司」
 */

// ---------- 字典 ----------
export const ORG_TYPES = ['公司', '项目部', '部门', '班组']
export const POSITION_CATEGORIES = ['管理岗', '技术岗', '操作岗', '服务岗']
export const PERSON_TYPES = ['自有员工', '分包人员', '院方人员', '第三方维保']
export const WORK_TYPE_CATEGORIES = ['电气', '机械', '管道', '焊接', '起重', '其他']
export const CERT_TYPES = ['特种设备作业人员证', '压力容器操作证', '电工证', '高处作业证', '焊工证', '其他']
export const ROLE_TYPES = ['系统角色', '业务角色']
export const DATA_SCOPES = ['全部数据', '本主体', '本组织及下级', '本组织', '本人']
export const STATUS_OPTIONS = ['启用', '停用']

export const ASSESS_DIMENSIONS = [
  '责任落实', '制度执行', '隐患整改', '教育培训',
  '应急演练', '设备维护', '记录规范', '现场管理'
]

export const PERMISSION_MODULES = [
  {
    module: '安全责任管理体系',
    menus: ['安全责任管理制度', '安全责任主体划分']
  },
  {
    module: '安全风险分级管控',
    menus: ['风险识别与评估', '风险目录化管理', '风险管控措施制定', '风险应急预案']
  },
  {
    module: '隐患排查治理',
    menus: ['AI随手拍', '隐患信息总览', '隐患派单记录', '隐患排查记录']
  },
  {
    module: '人员调度',
    menus: ['组织与人员']
  }
]

export const PERMISSION_ACTIONS = ['查看', '新增', '编辑', '删除', '导出']

// ---------- 组织架构 ----------
export const ORG_LIST = [
  {
    id: 'ORG-0001', name: '医智维运维公司', type: '公司', parentId: '',
    leaderId: 'RY-0001', leaderName: '陈建国', phone: '13800001001',
    subject: '我方 EPC 项目部', sort: 1, status: '启用', remark: '一级法人单位，承担全部运维合同履约责任'
  },
  {
    id: 'ORG-0002', name: '医用气体项目部', type: '项目部', parentId: 'ORG-0001',
    leaderId: 'RY-0002', leaderName: '李国强', phone: '13800001002',
    subject: '我方 EPC 项目部', sort: 1, status: '启用', remark: '驻院项目部，负责医用气体系统整体运维'
  },
  {
    id: 'ORG-0003', name: '安全管理部', type: '部门', parentId: 'ORG-0002',
    leaderId: 'RY-0003', leaderName: '王海涛', phone: '13800001003',
    subject: '我方 EPC 项目部', sort: 1, status: '启用', remark: '安全生产归口管理部门'
  },
  {
    id: 'ORG-0004', name: '设备运维部', type: '部门', parentId: 'ORG-0002',
    leaderId: 'RY-0004', leaderName: '赵明辉', phone: '13800001004',
    subject: '我方 EPC 项目部', sort: 2, status: '启用', remark: '设备运行与维护主责部门'
  },
  {
    id: 'ORG-0005', name: '液氧站运行班', type: '班组', parentId: 'ORG-0004',
    leaderId: 'RY-0005', leaderName: '刘志刚', phone: '13800001005',
    subject: '我方 EPC 项目部', sort: 1, status: '启用', remark: '液氧储罐区 24 小时值守'
  },
  {
    id: 'ORG-0006', name: '制氧机组维保班', type: '班组', parentId: 'ORG-0004',
    leaderId: 'RY-0008', leaderName: '孙建军', phone: '13800001008',
    subject: '我方 EPC 项目部', sort: 2, status: '启用', remark: '制氧机组与负压机组维保'
  },
  {
    id: 'ORG-0007', name: '管网巡检班', type: '班组', parentId: 'ORG-0004',
    leaderId: 'RY-0011', leaderName: '周文斌', phone: '13800001011',
    subject: '我方 EPC 项目部', sort: 3, status: '启用', remark: '输配管网及阀件日常巡检'
  },
  {
    id: 'ORG-0008', name: '临床服务部', type: '部门', parentId: 'ORG-0002',
    leaderId: 'RY-0015', leaderName: '吴晓丽', phone: '13800001015',
    subject: '我方 EPC 项目部', sort: 3, status: '启用', remark: '对接临床科室用气需求'
  }
]

// ---------- 岗位 ----------
export const POSITION_LIST = [
  {
    id: 'GW-0001', name: '安全生产专项小组组长', orgId: 'ORG-0001', orgName: '医智维运维公司',
    category: '管理岗', duty: '1. 全面负责公司安全生产决策；2. 审批重大安全投入；3. 主持季度安全会议；4. 重大事故第一责任人',
    quota: 1, needCert: '否', certTypes: [], assess: ['责任落实', '应急演练'], sort: 1, status: '启用', remark: '决策层'
  },
  {
    id: 'GW-0002', name: '医用气体管理部门负责人', orgId: 'ORG-0002', orgName: '医用气体项目部',
    category: '管理岗', duty: '1. 统筹医用气体系统运维管理；2. 组织风险辨识与评估；3. 审核管控措施；4. 管理层安全第一责任人',
    quota: 1, needCert: '否', certTypes: [], assess: ['责任落实', '制度执行', '应急演练'], sort: 2, status: '启用', remark: '管理层'
  },
  {
    id: 'GW-0003', name: '气体管理员', orgId: 'ORG-0004', orgName: '设备运维部',
    category: '技术岗', duty: '1. 建立并维护气体设备台账；2. 组织日常检查与隐患整改；3. 编制应急预案并组织演练',
    quota: 3, needCert: '是', certTypes: ['压力容器操作证'], assess: ['制度执行', '隐患整改', '设备维护'], sort: 3, status: '启用', remark: '专业负责人'
  },
  {
    id: 'GW-0004', name: '运行值班员', orgId: 'ORG-0005', orgName: '液氧站运行班',
    category: '操作岗', duty: '1. 液氧储罐区 24 小时值守；2. 液位压力记录；3. 充装作业监护；4. 异常情况上报',
    quota: 6, needCert: '是', certTypes: ['特种设备作业人员证', '压力容器操作证'], assess: ['责任落实', '记录规范', '现场管理'], sort: 4, status: '启用', remark: '执行层'
  },
  {
    id: 'GW-0005', name: '维修保养工程师', orgId: 'ORG-0006', orgName: '制氧机组维保班',
    category: '技术岗', duty: '1. 制氧机组定期保养；2. 故障诊断与抢修；3. 维保记录归档；4. 备件需求提报',
    quota: 4, needCert: '是', certTypes: ['电工证'], assess: ['设备维护', '记录规范', '隐患整改'], sort: 5, status: '启用', remark: '技术骨干'
  },
  {
    id: 'GW-0006', name: '气瓶配送员', orgId: 'ORG-0005', orgName: '液氧站运行班',
    category: '操作岗', duty: '1. 氧气瓶配送至临床科室；2. 空满瓶回收登记；3. 气瓶外观检查；4. 配送路线安全确认',
    quota: 3, needCert: '否', certTypes: [], assess: ['责任落实', '现场管理'], sort: 6, status: '启用', remark: '执行层'
  },
  {
    id: 'GW-0007', name: '班组安全员', orgId: 'ORG-0007', orgName: '管网巡检班',
    category: '操作岗', duty: '1. 班组日常安全检查；2. 隐患上报与跟踪；3. 安全培训组织；4. 班组安全记录维护',
    quota: 3, needCert: '是', certTypes: ['高处作业证'], assess: ['责任落实', '隐患整改', '教育培训'], sort: 7, status: '启用', remark: '执行层安全岗'
  },
  {
    id: 'GW-0008', name: '临床联络员', orgId: 'ORG-0008', orgName: '临床服务部',
    category: '服务岗', duty: '1. 对接临床科室用气需求；2. 用气异常反馈处理；3. 终端设备使用指导；4. 满意度回访',
    quota: 2, needCert: '否', certTypes: [], assess: ['责任落实', '现场管理'], sort: 8, status: '启用', remark: '配合层'
  }
]

// ---------- 工种 ----------
export const WORK_TYPE_LIST = [
  {
    id: 'GZ-0001', name: '维修电工', category: '电气', isSpecial: '是',
    certTypes: ['电工证'], positionIds: ['GW-0005'], status: '启用', remark: '负责电气控制系统维护'
  },
  {
    id: 'GZ-0002', name: '压力容器操作工', category: '机械', isSpecial: '是',
    certTypes: ['压力容器操作证', '特种设备作业人员证'], positionIds: ['GW-0004'], status: '启用', remark: '液氧储罐、压力容器操作'
  },
  {
    id: 'GZ-0003', name: '管道工', category: '管道', isSpecial: '否',
    certTypes: [], positionIds: ['GW-0007'], status: '启用', remark: '输配管网维护'
  },
  {
    id: 'GZ-0004', name: '焊工', category: '焊接', isSpecial: '是',
    certTypes: ['焊工证'], positionIds: [], status: '启用', remark: '管道焊接作业，外委为主'
  },
  {
    id: 'GZ-0005', name: '高处作业工', category: '其他', isSpecial: '是',
    certTypes: ['高处作业证'], positionIds: ['GW-0007'], status: '启用', remark: '管网高空段巡检'
  },
  {
    id: 'GZ-0006', name: '设备巡检工', category: '机械', isSpecial: '否',
    certTypes: [], positionIds: ['GW-0004', 'GW-0007'], status: '启用', remark: '日常设备巡检'
  }
]

// ---------- 人员 ----------
export const PERSON_LIST = [
  {
    id: 'RY-0001', name: '陈建国', empNo: 'YJ001', gender: '男', phone: '13800001001',
    idCard: '310101197505121234', orgId: 'ORG-0001', orgName: '医智维运维公司',
    positionId: 'GW-0001', positionName: '安全生产专项小组组长', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: '', workTypeName: '',
    entryDate: '2020-03-01', leaveDate: '', emergencyContact: '陈静', emergencyPhone: '13900001001',
    remark: '公司总经理，安全第一责任人'
  },
  {
    id: 'RY-0002', name: '李国强', empNo: 'YJ002', gender: '男', phone: '13800001002',
    idCard: '310101197808203456', orgId: 'ORG-0002', orgName: '医用气体项目部',
    positionId: 'GW-0002', positionName: '医用气体管理部门负责人', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: '', workTypeName: '',
    entryDate: '2020-05-15', leaveDate: '', emergencyContact: '张敏', emergencyPhone: '13900001002',
    remark: '项目部经理，管理层安全第一责任人'
  },
  {
    id: 'RY-0003', name: '王海涛', empNo: 'YJ003', gender: '男', phone: '13800001003',
    idCard: '310101198203154567', orgId: 'ORG-0003', orgName: '安全管理部',
    positionId: 'GW-0003', positionName: '气体管理员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0002', workTypeName: '压力容器操作工',
    entryDate: '2021-01-10', leaveDate: '', emergencyContact: '刘芳', emergencyPhone: '13900001003',
    remark: '安全管理部负责人'
  },
  {
    id: 'RY-0004', name: '赵明辉', empNo: 'YJ004', gender: '男', phone: '13800001004',
    idCard: '310101198509227890', orgId: 'ORG-0004', orgName: '设备运维部',
    positionId: 'GW-0003', positionName: '气体管理员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0002', workTypeName: '压力容器操作工',
    entryDate: '2021-03-20', leaveDate: '', emergencyContact: '王丽', emergencyPhone: '13900001004',
    remark: '设备运维部负责人'
  },
  {
    id: 'RY-0005', name: '刘志刚', empNo: 'YJ005', gender: '男', phone: '13800001005',
    idCard: '310101198711083456', orgId: 'ORG-0005', orgName: '液氧站运行班',
    positionId: 'GW-0004', positionName: '运行值班员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0002', workTypeName: '压力容器操作工',
    entryDate: '2021-06-01', leaveDate: '', emergencyContact: '李娜', emergencyPhone: '13900001005',
    remark: '液氧站班组长'
  },
  {
    id: 'RY-0006', name: '张伟东', empNo: 'YJ006', gender: '男', phone: '13800001006',
    idCard: '310101199001125678', orgId: 'ORG-0005', orgName: '液氧站运行班',
    positionId: 'GW-0004', positionName: '运行值班员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0006', workTypeName: '设备巡检工',
    entryDate: '2021-07-15', leaveDate: '', emergencyContact: '陈娟', emergencyPhone: '13900001006',
    remark: ''
  },
  {
    id: 'RY-0007', name: '黄立新', empNo: 'YJ007', gender: '男', phone: '13800001007',
    idCard: '310101199208203456', orgId: 'ORG-0005', orgName: '液氧站运行班',
    positionId: 'GW-0006', positionName: '气瓶配送员', subject: '我方 EPC 项目部',
    personType: '分包人员', workTypeId: '', workTypeName: '',
    entryDate: '2022-02-10', leaveDate: '', emergencyContact: '黄强', emergencyPhone: '13900001007',
    remark: '分包单位派驻'
  },
  {
    id: 'RY-0008', name: '孙建军', empNo: 'YJ008', gender: '男', phone: '13800001008',
    idCard: '310101198408156789', orgId: 'ORG-0006', orgName: '制氧机组维保班',
    positionId: 'GW-0005', positionName: '维修保养工程师', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0001', workTypeName: '维修电工',
    entryDate: '2021-04-01', leaveDate: '', emergencyContact: '周敏', emergencyPhone: '13900001008',
    remark: '制氧机组维保班组长'
  },
  {
    id: 'RY-0009', name: '马晓峰', empNo: 'YJ009', gender: '男', phone: '13800001009',
    idCard: '310101199305224567', orgId: 'ORG-0006', orgName: '制氧机组维保班',
    positionId: 'GW-0005', positionName: '维修保养工程师', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0001', workTypeName: '维修电工',
    entryDate: '2022-05-10', leaveDate: '', emergencyContact: '孙丽', emergencyPhone: '13900001009',
    remark: ''
  },
  {
    id: 'RY-0010', name: '郑海龙', empNo: 'YJ010', gender: '男', phone: '13800001010',
    idCard: '310101198906302345', orgId: 'ORG-0006', orgName: '制氧机组维保班',
    positionId: 'GW-0005', positionName: '维修保养工程师', subject: '我方 EPC 项目部',
    personType: '第三方维保', workTypeId: 'GZ-0001', workTypeName: '维修电工',
    entryDate: '2023-01-05', leaveDate: '', emergencyContact: '郑伟', emergencyPhone: '13900001010',
    remark: '第三方维保单位派驻'
  },
  {
    id: 'RY-0011', name: '周文斌', empNo: 'YJ011', gender: '男', phone: '13800001011',
    idCard: '310101198612117890', orgId: 'ORG-0007', orgName: '管网巡检班',
    positionId: 'GW-0007', positionName: '班组安全员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0003', workTypeName: '管道工',
    entryDate: '2021-08-01', leaveDate: '', emergencyContact: '吴敏', emergencyPhone: '13900001011',
    remark: '管网巡检班组长'
  },
  {
    id: 'RY-0012', name: '徐鹏飞', empNo: 'YJ012', gender: '男', phone: '13800001012',
    idCard: '310101199402185678', orgId: 'ORG-0007', orgName: '管网巡检班',
    positionId: 'GW-0007', positionName: '班组安全员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0005', workTypeName: '高处作业工',
    entryDate: '2022-09-01', leaveDate: '', emergencyContact: '徐建国', emergencyPhone: '13900001012',
    remark: ''
  },
  {
    id: 'RY-0013', name: '何志远', empNo: 'YJ013', gender: '男', phone: '13800001013',
    idCard: '310101199106253456', orgId: 'ORG-0007', orgName: '管网巡检班',
    positionId: 'GW-0007', positionName: '班组安全员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0003', workTypeName: '管道工',
    entryDate: '2023-03-15', leaveDate: '', emergencyContact: '何丽', emergencyPhone: '13900001013',
    remark: ''
  },
  {
    id: 'RY-0014', name: '罗建平', empNo: 'YJ014', gender: '男', phone: '13800001014',
    idCard: '310101198801094567', orgId: 'ORG-0005', orgName: '液氧站运行班',
    positionId: 'GW-0006', positionName: '气瓶配送员', subject: '我方 EPC 项目部',
    personType: '分包人员', workTypeId: '', workTypeName: '',
    entryDate: '2022-11-20', leaveDate: '2026-08-31', emergencyContact: '罗敏', emergencyPhone: '13900001014',
    remark: '已离场'
  },
  {
    id: 'RY-0015', name: '吴晓丽', empNo: 'YJ015', gender: '女', phone: '13800001015',
    idCard: '310101199007227890', orgId: 'ORG-0008', orgName: '临床服务部',
    positionId: 'GW-0008', positionName: '临床联络员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: '', workTypeName: '',
    entryDate: '2021-09-01', leaveDate: '', emergencyContact: '张伟', emergencyPhone: '13900001015',
    remark: '临床服务部负责人'
  },
  {
    id: 'RY-0016', name: '钱晓燕', empNo: 'YJ016', gender: '女', phone: '13800001016',
    idCard: '310101199308154567', orgId: 'ORG-0008', orgName: '临床服务部',
    positionId: 'GW-0008', positionName: '临床联络员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: '', workTypeName: '',
    entryDate: '2022-06-01', leaveDate: '', emergencyContact: '钱伟', emergencyPhone: '13900001016',
    remark: ''
  },
  {
    id: 'RY-0017', name: '顾建华', empNo: 'YJ017', gender: '男', phone: '13800001017',
    idCard: '310101198305206789', orgId: 'ORG-0005', orgName: '液氧站运行班',
    positionId: 'GW-0004', positionName: '运行值班员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0002', workTypeName: '压力容器操作工',
    entryDate: '2021-05-20', leaveDate: '', emergencyContact: '顾丽', emergencyPhone: '13900001017',
    remark: ''
  },
  {
    id: 'RY-0018', name: '曹德明', empNo: 'YJ018', gender: '男', phone: '13800001018',
    idCard: '310101199201183456', orgId: 'ORG-0005', orgName: '液氧站运行班',
    positionId: 'GW-0004', positionName: '运行值班员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0006', workTypeName: '设备巡检工',
    entryDate: '2023-02-01', leaveDate: '', emergencyContact: '曹敏', emergencyPhone: '13900001018',
    remark: ''
  },
  {
    id: 'RY-0019', name: '沈立国', empNo: 'YJ019', gender: '男', phone: '13800001019',
    idCard: '310101198711302345', orgId: 'ORG-0006', orgName: '制氧机组维保班',
    positionId: 'GW-0005', positionName: '维修保养工程师', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: 'GZ-0001', workTypeName: '维修电工',
    entryDate: '2022-03-10', leaveDate: '', emergencyContact: '沈丽', emergencyPhone: '13900001019',
    remark: ''
  },
  {
    id: 'RY-0020', name: '许海燕', empNo: 'YJ020', gender: '女', phone: '13800001020',
    idCard: '310101199405097890', orgId: 'ORG-0003', orgName: '安全管理部',
    positionId: 'GW-0003', positionName: '气体管理员', subject: '我方 EPC 项目部',
    personType: '自有员工', workTypeId: '', workTypeName: '',
    entryDate: '2023-06-01', leaveDate: '', emergencyContact: '许伟', emergencyPhone: '13900001020',
    remark: '安全管理部专员，未持压力容器操作证，需重点预警'
  }
]

// ---------- 持证信息 ----------
// 有效期至：2027-xx 有效；2026-11-xx 即将到期（30 天内）；2026-xx 已过期
export const CERT_LIST = [
  {
    id: 'ZZ-00000001', personId: 'RY-0003', personName: '王海涛', certType: '压力容器操作证',
    certNo: 'YLRQ-2021-00312', issuer: '上海市市场监督管理局',
    issueDate: '2021-04-15', expireDate: '2027-04-14', remark: ''
  },
  {
    id: 'ZZ-00000002', personId: 'RY-0004', personName: '赵明辉', certType: '压力容器操作证',
    certNo: 'YLRQ-2021-00456', issuer: '上海市市场监督管理局',
    issueDate: '2021-07-20', expireDate: '2027-07-19', remark: ''
  },
  {
    id: 'ZZ-00000003', personId: 'RY-0005', personName: '刘志刚', certType: '压力容器操作证',
    certNo: 'YLRQ-2021-00789', issuer: '上海市市场监督管理局',
    issueDate: '2021-08-10', expireDate: '2027-08-09', remark: ''
  },
  {
    id: 'ZZ-00000004', personId: 'RY-0005', personName: '刘志刚', certType: '特种设备作业人员证',
    certNo: 'TZS-2021-01234', issuer: '上海市市场监督管理局',
    issueDate: '2021-08-10', expireDate: '2026-11-25', remark: '即将到期，需安排复审'
  },
  {
    id: 'ZZ-00000005', personId: 'RY-0006', personName: '张伟东', certType: '特种设备作业人员证',
    certNo: 'TZS-2021-01567', issuer: '上海市市场监督管理局',
    issueDate: '2021-09-05', expireDate: '2027-09-04', remark: ''
  },
  {
    id: 'ZZ-00000006', personId: 'RY-0008', personName: '孙建军', certType: '电工证',
    certNo: 'DG-2022-00321', issuer: '上海市应急管理局',
    issueDate: '2022-03-15', expireDate: '2028-03-14', remark: ''
  },
  {
    id: 'ZZ-00000007', personId: 'RY-0009', personName: '马晓峰', certType: '电工证',
    certNo: 'DG-2022-00654', issuer: '上海市应急管理局',
    issueDate: '2022-06-20', expireDate: '2026-11-30', remark: '即将到期'
  },
  {
    id: 'ZZ-00000008', personId: 'RY-0010', personName: '郑海龙', certType: '电工证',
    certNo: 'DG-2021-00987', issuer: '上海市应急管理局',
    issueDate: '2021-11-10', expireDate: '2026-10-15', remark: '已过期，禁止上岗'
  },
  {
    id: 'ZZ-00000009', personId: 'RY-0011', personName: '周文斌', certType: '高处作业证',
    certNo: 'GC-2022-00123', issuer: '上海市应急管理局',
    issueDate: '2022-04-08', expireDate: '2028-04-07', remark: ''
  },
  {
    id: 'ZZ-00000010', personId: 'RY-0012', personName: '徐鹏飞', certType: '高处作业证',
    certNo: 'GC-2022-00456', issuer: '上海市应急管理局',
    issueDate: '2022-10-12', expireDate: '2026-12-10', remark: ''
  },
  {
    id: 'ZZ-00000011', personId: 'RY-0017', personName: '顾建华', certType: '压力容器操作证',
    certNo: 'YLRQ-2021-00890', issuer: '上海市市场监督管理局',
    issueDate: '2021-06-15', expireDate: '2027-06-14', remark: ''
  },
  {
    id: 'ZZ-00000012', personId: 'RY-0019', personName: '沈立国', certType: '电工证',
    certNo: 'DG-2022-00789', issuer: '上海市应急管理局',
    issueDate: '2022-04-01', expireDate: '2028-03-31', remark: ''
  },
  {
    id: 'ZZ-00000013', personId: 'RY-0008', personName: '孙建军', certType: '压力容器操作证',
    certNo: 'YLRQ-2022-01122', issuer: '上海市市场监督管理局',
    issueDate: '2022-05-18', expireDate: '2028-05-17', remark: ''
  }
]

// ---------- 角色权限 ----------
export const ROLE_LIST = [
  {
    id: 'JS-0001', name: '系统管理员', type: '系统角色', scope: '全部数据',
    permissions: ['全部模块-查看', '全部模块-新增', '全部模块-编辑', '全部模块-删除', '全部模块-导出'],
    status: '启用', remark: '系统最高权限，仅限信息化负责人'
  },
  {
    id: 'JS-0002', name: '安全负责人', type: '业务角色', scope: '本主体',
    permissions: [
      '安全责任管理体系-查看', '安全责任管理体系-编辑',
      '安全风险分级管控-查看', '安全风险分级管控-编辑', '安全风险分级管控-导出',
      '隐患排查治理-查看', '隐患排查治理-编辑', '隐患排查治理-导出',
      '人员调度-查看'
    ],
    status: '启用', remark: '项目部安全第一责任人或安全管理部负责人'
  },
  {
    id: 'JS-0003', name: '专业负责人', type: '业务角色', scope: '本组织及下级',
    permissions: [
      '安全风险分级管控-查看', '安全风险分级管控-新增', '安全风险分级管控-编辑',
      '隐患排查治理-查看', '隐患排查治理-新增',
      '人员调度-查看'
    ],
    status: '启用', remark: '气体管理员、维修保养工程师等专业岗'
  },
  {
    id: 'JS-0004', name: '排查员', type: '业务角色', scope: '本组织',
    permissions: [
      '隐患排查治理-查看', '隐患排查治理-新增',
      '安全风险分级管控-查看'
    ],
    status: '启用', remark: '班组安全员、运行值班员等一线排查人员'
  },
  {
    id: 'JS-0005', name: '责任人', type: '业务角色', scope: '本人',
    permissions: [
      '隐患排查治理-查看',
      '安全风险分级管控-查看'
    ],
    status: '启用', remark: '仅可查看与本人相关的隐患与风险'
  },
  {
    id: 'JS-0006', name: '只读用户', type: '业务角色', scope: '本主体',
    permissions: [
      '安全责任管理体系-查看',
      '安全风险分级管控-查看',
      '隐患排查治理-查看',
      '人员调度-查看'
    ],
    status: '启用', remark: '院方、监理等外部查看账号'
  }
]

// ---------- 派生工具 ----------
/** 该组织（含下级）在岗人数 */
export function countPersonsByOrg(orgId, includeChildren = true) {
  const ids = new Set([orgId])
  if (includeChildren) {
    let changed = true
    while (changed) {
      changed = false
      ORG_LIST.forEach((o) => {
        if (o.parentId && ids.has(o.parentId) && !ids.has(o.id)) {
          ids.add(o.id)
          changed = true
        }
      })
    }
  }
  return PERSON_LIST.filter((p) => ids.has(p.orgId) && !p.leaveDate).length
}

/** 该岗位在岗人数 */
export function countPersonsByPosition(positionId) {
  return PERSON_LIST.filter((p) => p.positionId === positionId && !p.leaveDate).length
}

/** 人员持证状态 */
export function personCertStatus(personId) {
  const list = CERT_LIST.filter((c) => c.personId === personId)
  if (!list.length) return '无证'
  const today = new Date()
  let hasExpired = false
  let hasExpiring = false
  list.forEach((c) => {
    const d = daysUntil(c.expireDate)
    if (d < 0) hasExpired = true
    else if (d <= 30) hasExpiring = true
  })
  if (hasExpired) return '有证件已过期'
  if (hasExpiring) return '有证件即将到期'
  return '全部证件有效'
}

/** 距离某日期还有多少天（负数表示已过期） */
export function daysUntil(dateStr) {
  if (!dateStr) return 0
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

/** 证件状态 */
export function certStatus(expireDate) {
  const d = daysUntil(expireDate)
  if (d < 0) return '已过期'
  if (d <= 30) return '即将到期'
  return '有效'
}

/** 人员是否在岗 */
export function isOnDuty(person) {
  return !person.leaveDate
}

/** 按组织构造树 */
export function buildOrgTree(list = ORG_LIST) {
  const map = new Map()
  list.forEach((o) => map.set(o.id, { ...o, children: [] }))
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
