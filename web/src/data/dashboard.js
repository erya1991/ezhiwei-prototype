// ==================== 综合看板 mock 数据 ====================
// 原 index.html 内联数据迁移至此；后续对接后端时替换为 API 请求即可。

// 实时告警列表
export const alarmData = [
  { loc: '住院部B楼 5F 502病房', type: '消防·烟感火警告警',   level: 'high' },
  { loc: '综合楼 B1 1#变压器',   type: '工单·绕组温度超限',   level: 'high' },
  { loc: '门诊楼 2F 中药房通道', type: '随手拍·通道堆放隐患', level: 'high' },
  { loc: '急诊楼 1F 大厅东侧',   type: '消防·一键报警触发',   level: 'high' },
  { loc: '中央空调主机机房',     type: '节能·出水温度诊断',   level: 'mid'  },
  { loc: '3#变压器 配电室',      type: '节能·温升趋势预警',   level: 'mid'  },
  { loc: '住院楼A栋 3F~5F',      type: '工单·监控画面离线',   level: 'mid'  },
  { loc: '后勤楼 2F 仓库区',     type: '消防·门禁非法闯入',   level: 'low'  }
]

// 消防报警主机事件（轮播）
export const hostEvents = [
  { time: '10:32', type: 'fire',  typeLabel: '火警', loc: '住院部B楼 5F 502病房 烟感探测器', host: '1#主机' },
  { time: '10:28', type: 'fire',  typeLabel: '火警', loc: '门诊楼 2F 中药房通道 温感探测器',   host: '1#主机' },
  { time: '10:25', type: 'fault', typeLabel: '故障', loc: '急诊楼 1F 大厅东侧 手动报警按钮',   host: '3#副机' },
  { time: '10:20', type: 'event', typeLabel: '事件', loc: '医技楼 3F MRI室 消防泵启动反馈',    host: '2#副机' },
  { time: '10:15', type: 'fault', typeLabel: '故障', loc: '住院部A楼 8F 护士站 液位传感器',     host: '1#主机' },
  { time: '10:08', type: 'event', typeLabel: '事件', loc: '行政楼 B1 配电房 喷淋泵压力低',      host: '4#副机' },
  { time: '10:02', type: 'fault', typeLabel: '故障', loc: '后勤楼 2F 仓库区 消火栓按钮离线',    host: '5#副机' },
  { time: '09:55', type: 'event', typeLabel: '事件', loc: '科教楼 4F 实验室 烟感复位',          host: '6#副机' },
  { time: '09:48', type: 'fire',  typeLabel: '火警', loc: '住院部B楼 3F 走廊 温感超阈值',       host: '1#主机' },
  { time: '09:40', type: 'fault', typeLabel: '故障', loc: '门诊楼 B1 停车场 防火阀关闭',        host: '3#副机' },
  { time: '09:32', type: 'event', typeLabel: '事件', loc: '急诊楼 2F 抢救室 消防电话通话',      host: '2#副机' },
  { time: '09:25', type: 'fault', typeLabel: '故障', loc: '住院部A楼 12F 正压送风口故障',       host: '4#副机' },
  { time: '09:18', type: 'event', typeLabel: '事件', loc: '行政楼 3F 会议室 声光报警测试',      host: '5#副机' },
  { time: '09:10', type: 'fire',  typeLabel: '火警', loc: '医技楼 1F CT室 烟感探测器报警',      host: '1#主机' },
  { time: '09:05', type: 'fault', typeLabel: '故障', loc: '后勤楼 B1 水泵房 消防泵过载',        host: '6#副机' }
]

// 平台综合总览弹窗数据（图片路径加了 / 前缀指向 public 目录）
export const ovOverviewData = [
  {
    name: '消防设备', img: '/图片/消防.png', color: '#D93025',
    total: '12,846', unit: '台', sub: '烟感 · 温感 · 喷淋 · 水泵',
    kpis: [
      { label: '设备在线率', val: '99.2%' },
      { label: '今日告警', val: '18', unit: '起' },
      { label: '巡检完成率', val: '96.5%' }
    ],
    groups: [
      { title: '设备构成', items: [
        { label: '烟感探测器', value: 6240 }, { label: '温感探测器', value: 2180 },
        { label: '自动喷淋头', value: 3104 }, { label: '消防水泵', value: 86 },
        { label: '室内消火栓', value: 512 }, { label: '灭火器', value: 724 }
      ] },
      { title: '楼栋分布', items: [
        { label: '住院楼 A/B 栋', value: 4126 }, { label: '门诊楼', value: 3580 },
        { label: '医技楼', value: 2904 }, { label: '后勤保障区', value: 2236 }
      ] }
    ]
  },
  {
    name: '专家知识库', img: '/图片/专家知识库.png', color: '#2173D8',
    total: '563', unit: '条', sub: '6 位专家 · 8 大专项 · 医工委',
    kpis: [
      { label: '收录专家', val: '6', unit: '位' },
      { label: '本月新增', val: '47', unit: '条' },
      { label: '本周访问', val: '892', unit: '次' }
    ],
    groups: [
      { title: '八大专项条目', items: [
        { label: '医用气体', value: 86 }, { label: '净化空调', value: 94 },
        { label: '医用纯水', value: 62 }, { label: '供配电', value: 108 },
        { label: '消防', value: 78 }, { label: '电梯', value: 45 },
        { label: '安防监控', value: 56 }, { label: '医用物流', value: 34 }
      ] },
      { title: '知识形态分布', items: [
        { label: 'SOP 标准流程', value: 208 }, { label: '故障树分析', value: 156 },
        { label: '国标·行标', value: 118 }, { label: '典型案例', value: 81 }
      ] }
    ]
  },
  {
    name: 'AI 智能体', img: '/图片/AI智能体.png', color: '#7A5AF8',
    total: '368', unit: '次', sub: '烟火识别 · 能耗诊断 · 随手拍 · 智能问答',
    kpis: [
      { label: '识别准确率', val: '94.6%' },
      { label: '平均响应', val: '1.8', unit: '秒' },
      { label: '本月累计', val: '8,246', unit: '次' }
    ],
    groups: [
      { title: '今日调用分布', items: [
        { label: '烟火识别', value: 142 }, { label: '能耗诊断', value: 96 },
        { label: 'AI 随手拍', value: 78 }, { label: '智能问答', value: 52 }
      ] },
      { title: '本月各周调用', items: [
        { label: '第 1 周', value: 1860 }, { label: '第 2 周', value: 2140 },
        { label: '第 3 周', value: 1980 }, { label: '第 4 周', value: 2266 }
      ] }
    ]
  },
  {
    name: '智能工单', img: '/图片/智能工单.png', color: '#FF9500',
    total: '156', unit: '单', sub: '报修 · 保养 · 巡检 · 隐患整改',
    kpis: [
      { label: '待处理', val: '28', unit: '单' },
      { label: '平均响应', val: '12', unit: '分钟' },
      { label: '按时完成率', val: '96.3%' }
    ],
    groups: [
      { title: '工单状态', items: [
        { label: '待处理', value: 28 }, { label: '处理中', value: 49 }, { label: '已完成', value: 79 }
      ] },
      { title: '工单类型', items: [
        { label: '设备报修', value: 62 }, { label: '预防性保养', value: 40 },
        { label: '巡检', value: 32 }, { label: '隐患整改', value: 22 }
      ] }
    ]
  }
]
