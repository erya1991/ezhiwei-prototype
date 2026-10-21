# Stage 02 公共 UI 基线计划

日期：2026-10-21。执行负责人 A（Codex）。本阶段仅建设现有 PC 工程的公共 UI 基线，不开展一期业务开发。

## 依据、初始状态与约束冲突

已阅读根 AGENTS、用户手动放入的 FRONTEND-COOPERATION V1.0、OWNERSHIP 和 Stage 00+01 PLAN/ACCEPTANCE/RESULT。V1.0 是技术与视觉依据，保留原文及“待确认冻结”状态，不覆盖或宣称双人已签收。

初始 web 原始 52 文件 SHA-256 全部一致；Vue 3.5.42、Vite 5.4.21、Vue Router 4.6.4、ECharts 5.6.0、plugin-vue 5.2.4、Node 24.14.0、npm 11.9.0。lockfileVersion=3，已安装版本与锁文件一致。已有 9 个视图、5 个组件、Express 代理和旧 CSS 均继续保留。

| 冲突或依赖 | 处理范围 |
| --- | --- |
| 旧 AGENTS 禁止 UI 框架、仅允许初始化 | 将旧条款限定在 Stage 00+01 历史阶段，增量增加本轮明确批准的公共 UI 例外；不扩展业务 |
| OWNERSHIP 末节禁止修改已有 web 文件 | 作为 Stage 00+01 历史边界保留；本轮仅按最新用户批准的入口/依赖/主题/开发路由白名单实施 |
| V1.0 要求从 origin/main 开分支，但当前 main 无首次提交且无 remote | 保留已有工作区和当前 main，不自动提交、建远程或搬移他人修改；分支/PR/冻结流程待基线审核后启用 |
| V1.0 文本仍描述接入前状态、待两位负责人冻结 | 不覆盖规范；当前实际接入结果在 Stage 02 与 UI 使用指南补充 |
| V1.0 不允许全局覆盖 el-*，本轮允许局部兼容 | 优先根变量映射；新增示例采用 scoped 布局，组件自身局部变量用项目专属 ez-* 类映射，不大范围覆盖 el-* 或重写 reset |

Stage 00+01 仍为 PENDING；5173 环境失败、Key 轮换、资料授权与负责人业务视觉验收不因本轮改变。此前 npm audit 5 中危、2 高危、1 严重继续记录。首次本地提交的上一轮候选确认尚未得到，本轮不执行任何 commit/tag/push/部署。

## 最小修改白名单

修改：AGENTS.md、web/package.json、package-lock.json、src/main.js、src/router/index.js。
新增：web/src/styles/theme.css、web/src/views/__dev/UiBaselineView.vue、docs/collaboration/UI-COMPONENT-GUIDE.md、本阶段 PLAN/ACCEPTANCE/RESULT 与脱敏验证记录。

原 9 个业务视图、全部 Mock 数据、原业务组件、登录逻辑、菜单/导航、index.css、app.css、App.vue、server、Vite 配置、小程序和 contracts 均不得修改。原始 52 文件中只允许 package、lock、main、router 4 个文件变化，其他 48 个文件应保持 SHA-256 一致。FRONTEND-COOPERATION、OWNERSHIP、Stage 00+01 文档均保持原样。

截图与本轮原始命令日志先放 Git 忽略的 _tmp/stage02；不自动纳入 Git 候选。不得输出真实凭据，浏览器用原演示登录，不伪造登录态，不调用真实 AI；检查 /predict 前确认 3000 没有真实代理监听。

## 技术方案

使用 npm 精确安装 Element Plus 2.14.7；官方 npm 元数据显示 Vue peer 为 ^3.3.7，与现有 3.5.42 匹配。采用官方全量注册方式，简体中文 locale、弹层起始 zIndex=3000，不增加自动按需插件或直接图标依赖。保留一次 createApp 和原 router 注册。

CSS 顺序：index.css → app.css → Element Plus CSS → theme.css。根 --ez-* 映射 --el-*，不反向覆盖旧 --blue/--card-bg 等变量、不改 body 或旧页面尺寸。主色 #2173D8、浅背景 #E8F1FC、成功 #107C10、警告 #FF9500、危险 #D93025；配套各色 light-1..9 / dark-2、文字/边框/禁用/圆角。警告 Tag 使用较深文字以改善可读性。

专用示例 /__ui-baseline 仅在 import.meta.env.DEV 条件中注册懒加载路由，沿用现有鉴权，不增加正式菜单。示例使用 Vue script setup + scoped、确定性 24 条内存数据；查询/重置、状态/日期筛选、分页、新增必填校验、提交后更新列表、取消关闭、Message/Tooltip/Dropdown。无服务器请求或持久化，不关联真实业务。

## 验证计划与风险

1. 检查 lock 的旧包记录及核心版本，解释新增依赖；发生无关升级或大规模无法解释变化即停止。
2. 执行 npm ci、npm run build，记录模块/体积增量和新警告，不为拆包扩大范围。
3. 比对旧业务、共享壳和 Stage 00+01/协作文档哈希；检查生产 dist 无开发路由、示例独有文案/组件块。
4. 在 1366×768、1920×1080 记录九路由接入前后布局和截图；检查原代表性弹窗/筛选/图表，以及示例控件和 Teleport 浮层。原有风险与新增问题分开记录。
5. 生产 preview 按原登录访问开发路径，确认不显示示例；SPA 未匹配路径可能返回 HTTP200，不能以 HTTP 状态代替路由隔离证据。
6. 验收至少覆盖 S02-01～18，自动、Agent 浏览器、负责人签收分别记录；负责人未验收时整体 PENDING。

初始 15173 已有本项目 Vite 服务，先复用采集接入前证据。后续 npm ci 遇到 Windows esbuild 文件锁，负责人按提示手动停止 Vite 后继续安装；Agent 再启动自有 15173 开发服务与 15174 生产预览核验，收尾停止自有服务。默认 5173 EACCES 不通过修改生产配置或安全设置解决。新主题/组件库全量 CSS、reset、固定布局和弹层/scroll-lock 是重点兼容风险。新增全量运行时和 CSS 会增加生产包体，按实际结果记录。

## 官方依据

- [Element Plus 安装](https://element-plus.org/en-US/guide/installation.html)
- [全量接入与全局配置](https://element-plus.org/en-US/guide/quickstart.html)
- [CSS 变量主题](https://element-plus.org/en-US/guide/theming.html)

官方资料用于接入方法；具体稳定版本和 Vue peer 取本轮 npm 元数据。后续业务模块开发与小程序创建、真实接口、认证/AI 代理改造及部署均需另行明确范围。
