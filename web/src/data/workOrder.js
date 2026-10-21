// ==================== 智能工单 mock 数据 ====================

export const WO_SPECS = ['净化空调', '医用气体', '医用纯水', '供配电', '电梯', '消防', '安防监控', '医用物流']

// Mock 报警数据
export const WO_ALARMS = [
  { id: 1, time: '2026-08-09 09:32', spec: '净化空调', device: '手术室AHU-3#机组', level: '紧急', desc: '送风温度持续偏高28.5℃，湿度68%RH超标', location: '手术部5F', status: '待处理' },
  { id: 2, time: '2026-08-09 08:15', spec: '医用气体', device: '液氧储罐汽化器', level: '重要', desc: '液氧汽化器出口压力波动，低于0.35MPa', location: '住院楼A栋B1', status: '处理中' },
  { id: 3, time: '2026-08-09 07:48', spec: '供配电', device: '1#变压器低压柜', level: '紧急', desc: 'B相绕组温度158℃，超过报警阈值155℃', location: '综合楼B1', status: '待处理' },
  { id: 4, time: '2026-08-08 22:10', spec: '消防', device: '消防泵控制柜', level: '重要', desc: '消防泵远程启动失败，FAS模块无响应', location: '综合楼B1', status: '处理中' },
  { id: 5, time: '2026-08-08 18:25', spec: '医用纯水', device: 'RO反渗透机组', level: '一般', desc: '产水电导率上升至2.8μS/cm，趋近报警值', location: '医技楼2F', status: '已处理' },
  { id: 6, time: '2026-08-08 15:03', spec: '电梯', device: '住院楼B栋3#电梯', level: '紧急', desc: '电梯困人报警，轿厢停在7F与8F之间', location: '住院楼B栋8F', status: '已处理' },
  { id: 7, time: '2026-08-08 14:30', spec: '安防监控', device: '住院楼A栋监控主机', level: '一般', desc: '住院楼A栋3F~5F监控画面黑屏离线', location: '住院楼A栋B1', status: '待处理' },
  { id: 8, time: '2026-08-08 11:12', spec: '医用物流', device: '气动物流3#站点', level: '重要', desc: '气动物流3#站点收发故障，传输瓶卡在管道中', location: '门诊楼3F', status: '处理中' },
  { id: 9, time: '2026-08-07 16:45', spec: '净化空调', device: 'ICU洁净空调AHU-1#', level: '重要', desc: '初效过滤器压差异常，需更换滤芯', location: '住院楼A栋8F', status: '已处理' },
  { id: 10, time: '2026-08-07 10:20', spec: '医用气体', device: '负压吸引机组', level: '一般', desc: '负压吸引系统真空度不足-55kPa', location: '急诊楼1F', status: '待处理' },
  { id: 11, time: '2026-08-07 09:05', spec: '消防', device: '火灾报警控制器', level: '紧急', desc: 'FAS主机报探测器故障，2回路通讯异常', location: '住院楼A栋B1', status: '已处理' },
  { id: 12, time: '2026-08-06 14:18', spec: '电梯', device: '门诊楼2#扶梯', level: '一般', desc: '扶梯运行异响，需停机检查链轮磨损', location: '门诊楼3F', status: '待处理' }
]

// Mock 运维工单数据
export const WO_ORDERS = [
  { id: 'WO2026080901', spec: '净化空调', device: '手术室AHU-3#机组', desc: '送风温度持续偏高28.5℃，湿度68%超标', time: '2026-08-09 09:32', handler: '张工', status: '待派单', doneTime: '-' },
  { id: 'WO2026080902', spec: '供配电', device: '1#变压器低压柜', desc: 'B相绕组温度158℃超报警阈值', time: '2026-08-09 07:48', handler: '李工', status: '处理中', doneTime: '-' },
  { id: 'WO2026080801', spec: '消防', device: '消防泵控制柜', desc: '消防泵远程启动失败，FAS模块无响应', time: '2026-08-08 22:10', handler: '王工', status: '处理中', doneTime: '-' },
  { id: 'WO2026080802', spec: '医用气体', device: '液氧储罐汽化器', desc: '汽化器出口压力波动低于0.35MPa', time: '2026-08-08 08:15', handler: '赵工', status: '待验收', doneTime: '-' },
  { id: 'WO2026080803', spec: '医用纯水', device: 'RO反渗透机组', desc: '产水电导率上升至2.8μS/cm', time: '2026-08-08 18:25', handler: '陈工', status: '已完成', doneTime: '2026-08-09 10:30' },
  { id: 'WO2026080701', spec: '电梯', device: '住院楼B栋3#电梯', desc: '电梯困人报警，7F与8F之间', time: '2026-08-08 15:03', handler: '刘工', status: '已完成', doneTime: '2026-08-08 16:20' },
  { id: 'WO2026080702', spec: '净化空调', device: 'ICU洁净空调AHU-1#', desc: '初效过滤器压差异常需更换', time: '2026-08-07 16:45', handler: '周工', status: '已完成', doneTime: '2026-08-08 11:00' },
  { id: 'WO2026080703', spec: '消防', device: '火灾报警控制器', desc: 'FAS主机探测器故障2回路通讯异常', time: '2026-08-07 09:05', handler: '张工', status: '已完成', doneTime: '2026-08-07 14:30' },
  { id: 'WO2026080601', spec: '安防监控', device: '住院楼A栋监控主机', desc: '3F~5F监控画面黑屏离线', time: '2026-08-08 14:30', handler: '李工', status: '已超时', doneTime: '-' },
  { id: 'WO2026080602', spec: '医用物流', device: '气动物流3#站点', desc: '收发故障传输瓶卡在管道中', time: '2026-08-08 11:12', handler: '王工', status: '处理中', doneTime: '-' },
  { id: 'WO2026080603', spec: '医用气体', device: '负压吸引机组', desc: '真空度不足-55kPa', time: '2026-08-07 10:20', handler: '赵工', status: '待派单', doneTime: '-' },
  { id: 'WO2026080501', spec: '电梯', device: '门诊楼2#扶梯', desc: '运行异响需检查链轮磨损', time: '2026-08-06 14:18', handler: '-', status: '待派单', doneTime: '-' }
]

const LEVEL_BADGE = { '紧急': 'urgent', '重要': 'important', '一般': 'normal' }
const STATUS_BADGE = { '待派单': 'pending', '处理中': 'processing', '待验收': 'accepting', '已完成': 'done', '已超时': 'overdue', '待处理': 'pending', '已处理': 'done' }

export function levelClass(lv) {
  return LEVEL_BADGE[lv] || 'normal'
}
export function statusClass(st) {
  return STATUS_BADGE[st] || 'normal'
}
