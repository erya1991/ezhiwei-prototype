# Stage 02 公共 UI 基线执行结果

日期：2026-10-21。**工程实施及本轮自动/Agent 浏览器验证已完成，整体验收 PENDING，未冻结、提交或部署。** 负责人签收与历史安全待办保留实际状态。详见 [ACCEPTANCE](ACCEPTANCE.md) 与 [CHECKS.json](evidence/CHECKS.json)。

## 实际执行与范围

已读取 AGENTS、负责人手动放入的 FRONTEND-COOPERATION V1.0、OWNERSHIP 和 Stage 00+01 三份文档。检查 Git 后确认 main 尚无首次提交、暂存区为空、无远程和标签；保留现有内容及工具内部 refs。初始候选文件 65 个，包含负责人已有的协作规范。

先记录旧阶段限制与本轮公共 UI 授权之间的解释、origin/main 不存在的流程依赖，再按白名单实施。没有自动创建分支、覆盖规范或推进一期业务。接入前原始 52/52 文件哈希一致；接入后只允许四个既有工程文件改变。

| 类型 | 文件 | 目的 |
| --- | --- | --- |
| 修改 | AGENTS.md | 增量接入 V1.0、技术/归属/主题/DEV/验收约束 |
| 修改 | web/package.json | 仅新增精确 Element Plus 2.14.7 直接依赖 |
| 修改 | web/package-lock.json | 锁定其依赖树，原非根包记录不变 |
| 修改 | web/src/main.js | 全量组件注册、中文 locale、zIndex=3000、CSS 顺序 |
| 修改 | web/src/router/index.js | 仅 DEV 条件新增懒加载示例路由，原守卫及路由不改 |
| 新增 | web/src/styles/theme.css | --ez-* 主题与 Element Plus 映射、项目专属兼容类 |
| 新增 | web/src/views/__dev/UiBaselineView.vue | 开发用内存 Mock 组件/交互示例 |
| 新增 | docs/collaboration/UI-COMPONENT-GUIDE.md | 双人组件使用及公共修改指引 |
| 新增 | docs/stages/02-ui-baseline/PLAN.md | 阶段目标、冲突、范围及验证计划 |
| 新增 | docs/stages/02-ui-baseline/ACCEPTANCE.md | 逐项验收及人工待办 |
| 新增 | docs/stages/02-ui-baseline/RESULT.md | 本结果记录 |
| 新增 | docs/stages/02-ui-baseline/evidence/CHECKS.json | 脱敏结构化检查结果 |

本轮可交付新增 7 文件、修改 5 文件。另有本地依赖/构建、审计脚本、日志、截图存于被忽略的 node_modules/dist/_tmp，不属于待提交清单。原有 FRONTEND-COOPERATION、OWNERSHIP、Stage 00+01 三份文档 SHA-256 均未改变。

## 接入和兼容处理

选用 npm 元数据确认的稳定 Element Plus 2.14.7，Vue peer ^3.3.7 与现有 Vue 3.5.42 匹配。参考 [官方全量接入](https://element-plus.org/en-US/guide/quickstart.html) 和 [主题文档](https://element-plus.org/en-US/guide/theming.html)。不加自动按需插件、CDN、其他完整 UI 框架或直接图标依赖。

入口继续只调用一次 createApp，保留 Router。样式顺序为 index.css → app.css → Element Plus CSS → theme.css。新增根主题变量供 Teleport 浮层继承；不修改旧 --blue/--card-bg、全局 reset、App.vue、导航或既有页面尺寸。

主题包括主色 #2173D8 / 浅背景 #E8F1FC、成功 #107C10、警告 #FF9500、危险 #D93025，及 info、文字/边框/禁用/字体/间距/圆角。各语义色映射 light-1..9 与 dark-2；警告文字用深色增强可读性。Element Plus 部分组件在自身声明圆角变量，新增 ez-card/ez-dialog/ez-message-box 专属类作最小映射，warning Message 用 ez-warning-message；未全局大范围覆盖 .el-*，未用 !important。

浏览器实测主按钮/Input/Select/日期控件高 32px、主要控件圆角 8px，卡片与 Dialog 圆角 16px。Dialog body Teleport、宽 560px，1366 下高 540px、层级 3032，完整位于视口。分页按钮/Tag 等组件保留自身语义尺寸，未强制所有组件采用同一圆角。

公共影响覆盖原全部路由：入口全量加载及主题变量对后续 Element Plus 使用生效；原导航、壳、旧组件未变。只有开发环境增加不入菜单的 /__ui-baseline；A 负责集成，B 审阅公共影响，仍不允许越权修改业务模块。

## 安装、锁文件与构建

1. `npm.cmd install --save-exact element-plus@2.14.7` 成功，新增 21 条依赖记录。npm 11 对 14 个旧 Linux 可选包移除了 libc 元数据；逐项确认没有版本或其他变化后恢复这些旧记录。最终所有原非根包记录与安装前 JSON 完全一致，未删除重建 lock、未升级旧核心包。
2. `npm ci` 曾因 Windows 锁定 esbuild.exe 导致 EPERM；工具未能可靠识别宿主进程，未批量杀进程。负责人已回复“已停止 Vite”。之后一次普通重试遇到目录权限 EPERM，按同命令在授权环境下重试成功，exit0，added 126 packages。归因于文件锁/执行权限，未修改业务代码或 node_modules 补丁绕过。
3. `npm.cmd run build` 成功，exit0：Vite 5.4.21、2189 模块、14.11s。

| 体积（JS + CSS，非图片） | 接入前 | 接入后 | 增量 |
| --- | --- | --- | --- |
| 原始字节 | 1,444,397 | 2,769,687 | 1,325,290 |
| gzip 字节 | 475,716 | 834,351 | 358,635 |

主 JS 由 102.44kB / gzip40.00kB 增至 1060.17kB / gzip349.52kB；主 CSS 由 105.97kB / gzip17.68kB 增至 472.46kB / gzip66.79kB。原 ECharts 约 1035.38kB 大块告警仍在，新增主入口超过 500kB 告警与全量接入有关；无编译错误。不在本阶段开展拆包重构。

安装时 audit 仍为 8 项（5 中危、2 高危、1 严重），保留待处理，未运行 audit fix 或 force。最终 ci 成功结果不等于漏洞已解决。

## 浏览器验证

负责人停止旧服务后，Agent 启动 127.0.0.1:15173 开发服务及 15174 生产预览。默认 5173 历史 EACCES 仍保留，不修改 Vite 配置或系统保护；15173 成功不能直接把 5173 标为 PASS。

通过原演示登录表单登录，未勾选记住密码、未伪造本地登录态。3000 无真实代理监听，不启动 Express 或调用真实 AI。/predict 原有自动本地 AI 请求因代理不可用失败并走原回退，不作为真实 AI/IoT 能力验收。

| 路由 | 1366×768 | 1920×1080 | 核验内容 |
| --- | --- | --- | --- |
| /login | PASS | PASS | 原登录及页面布局，1920 稳定补采 |
| / | PASS | PASS | 驾驶舱、原图表、卡片与导航 |
| /knowledge | PASS | PASS | 知识列表、卡片与壳 |
| /ai-agent | PASS | PASS | 原页面与本地交互入口，未发送 AI |
| /snapshot | PASS | PASS | 原随手拍页面，未上传真实资料 |
| /energy | PASS | PASS | 原能耗/图表页面 |
| /predict | PASS | PASS | 原设备页、图表和本地回退 |
| /work-order | PASS | PASS | 原工单表格及壳 |
| /settings | PASS | PASS | 原设置页面 |
| /__ui-baseline（DEV） | PASS | PASS | 统一组件、表格和浮层 |

接入前后原九路由各两尺寸共 18 组截图/DOM 样本：抽样字体、颜色、背景、display、overflow、zIndex 与 canvas 数量一致；无文档横向溢出。原动画、侧栏 hover 与浮点几何会造成位置差异，原始完整指标仅 11/18 完全相等，**不声称像素级一致**。初始 1920 登录证据处于入场帧，后续 fullPage 稳定截图及 DOM 补证正常：卡片 x1086/y313、400×453，opacity=1、完整位于视口。曾出现一次 viewport 截图裁切现象，以稳定 fullPage 图和 DOM 复核，不修改登录页。

示例 20/20 交互 PASS：下一页、关键词、空态、重置、状态/日期筛选、必填与空白名称校验、取消/关闭不新增、重开清草稿/错误、提交新增可见行/成功提示、每页数量、三类 Message、恢复数据、Tooltip、1366 Dialog 的 Teleport/圆角/视口检查。示例 24 条确定性数据仅在内存，提交演示成为第 25 条；刷新恢复，不触及正式工单。

原代表性交互 12/12 PASS：驾驶舱图表切换/总览打开关闭、知识分类/详情/重置、工单消防筛选/详情/关闭重置、设置标签、设备标签。不是对全部原业务流程的完整验收。

当前登录与 UI 示例控制台样本无 error/warn；原设备页代理不可用的本地请求失败单列为历史行为。生产负向测试的未匹配路由告警属于预期，不视作新业务异常。未发现由本轮新增组件引起的关键运行错误。

生产静态扫描未找到 /__ui-baseline、UiBaselineView、示例独有标记/文案或示例 chunk；15174 用原登录后访问该路径，示例 DOM/标题均为 0，仍为原八项菜单。History SPA 的未知路径返回壳及 HTTP200，不能称为已注册开发路由或 HTTP404。

截图及原始日志位于本地 `_tmp/stage02/`，本轮未加入 Git 候选。截图可用于本地复核，不能自动当作对外发布材料。Agent 两尺寸目视检查通过；负责人视觉与业务签收 PENDING。

## 差异、安全与 Git

原始 52 文件中仅 web/package.json、package-lock.json、src/main.js、src/router/index.js 四个获批文件变化；其余 48/48 SHA-256 一致，原九视图、业务 Mock、五组件、登录/composable、App.vue、旧 CSS、server、Vite 未越界。V1.0、OWNERSHIP 和 Stage 00+01 三文档哈希不变。

根忽略规则未修改，环境文件/嵌套 node_modules/dist/_tmp/.local-inputs 8 个样本均忽略；保留原脱敏 .env.example，不读取展示真实 .env 值。候选文本检查未发现私钥/API Key 形态；此类扫描不是全量保密证明，原演示登录与原始资料仍需负责人审核。新代码/文档没有硬编码测试凭据或调用真实 AI。

复核原 Stage 00+01 `evidence/PC-DASHBOARD.jpg`：未见 Key、口令或私人联系方式；存在原演示指标、楼宇/机构背景等材料，授权及提交审核仍 PENDING，未因本轮扫描改为已授权。候选没有本轮新增截图。公开前须处理历史真实 Key 轮换、认证/明文密码、代理鉴权限流、依赖漏洞及资料权限。

最终 Git：main，无首次提交、暂存区为空、无 remote/tag；72 个未跟踪候选文件（原 65 + 本轮新增 7），其中只有上述 5 个既有文件被本轮修改。未暂存、commit、tag、push、建远程或部署。实际完整候选路径记录见 CHECKS.json，供负责人下一步审阅，当前不执行首次提交。

## 未完成事项与结论

S02-01～18 本轮工程检查 PASS；负责人 UI/业务视觉签收、B 的公共影响复核、V1.0 双人冻结仍 PENDING。Stage 00+01 的默认端口环境例外、历史 Key、资料授权、业务验收及风险整改继续保留，不自动关闭。

Agent 自有开发/生产预览已在验证后停止，避免再次锁定 esbuild。负责人可按 UI 指南命令自行启动 15173 复核。当前具备公共 UI 基线评审条件；收到负责人签收与后续 Git 明确授权前，不宣称正式冻结或进入一期业务开发。后续完整模块仍 A=1/2/3/8、B=4/5/6/7，公共变更由 A 协调，小程序技术方向及独立构建规划不变。

## V1.2 扣子协作适配增量记录（2026-10-21）

本节只记录后续文档适配，不替换以上原始 Stage 02 安装、构建、浏览器与 Git 证据。上文 V1.0、文档哈希不变及 72 个候选文件均指公共 UI 建设收尾时的历史快照；当前协作依据为已提供的 V1.2 修订候选，仍未冻结，两个阶段整体均为 PENDING。

### 输入与本轮修改

开工前正式位置已存在 `docs/collaboration/FRONTEND-COOPERATION.md` V1.2 和 `docs/collaboration/COZE-TASK-START.md`。沿用负责人提供的正文做增量修订，未重新生成替代文件。当前没有独立 V1.1 快照可供逐字对比；V1.1→V1.2 的变化依据已提供 V1.2 末尾变更说明及本轮要求记录，不声称完成历史全文 diff。

| 修改文件 | 本轮实际内容 |
| --- | --- |
| `AGENTS.md` | 四文件实际读取、V1.2 引用、人指派角色、文档白名单、扣子 main 保护/ZIP 回传/导入差异、安全与跨平台约束 |
| `docs/collaboration/FRONTEND-COOPERATION.md` | 沿用 V1.2；明确当前依赖事实、首次基线/远程前提、四文件必读、分别授权、导出格式与 B 实测边界 |
| `docs/collaboration/COZE-TASK-START.md` | 保留人工复制模板；补充人指派/云端分别授权/跨平台核验；无条件禁止内置 Push 写共同 main，终端功能分支另行验证 |
| `docs/collaboration/OWNERSHIP.md` | 更新 A Windows+Codex、B macOS+Coze 描述；保留模块分工，将初始化限制明确标为历史范围并引用 V1.2 |
| `docs/collaboration/UI-COMPONENT-GUIDE.md` | 负责人追加授权后仅将四处 V1.0 引用同步为 V1.2，其他字节内容不改，保留待双方冻结 |
| `docs/stages/02-ui-baseline/RESULT.md` | 仅追加本节，原始正文完整保留 |

本轮无新增仓库候选文件。`.trae/rules/ezhiwei.md` 及 `.trae/` 不存在，未删除任何配置，也未创建 TRAE 或 `.coze/rules/` 目录。V1.2 中提及 TRAE 仅用于说明无需此适配，不是要求 B 配置。

### 规范与平台能力核验

A=模块1/2/3/8，B=模块4/5/6/7；同模块 PC/小程序同一负责人，6/7 合并页继续归 B。角色由人明确指派，不能因 Agent 名称推断。公共路由/菜单/主题/依赖/协议由 A 协调，B 先列需求、公共路径/接口、模块完成情况和集成验收，再由 A 集成。

PC 技术与蓝白主题、Element Plus 2.14.7 现状一致；未来小程序独立 uni-app + Vue3 + TypeScript。扣子导入不构成改用其他框架、改入口或升级依赖的许可。统一入口是根 AGENTS 及其引用的三份规范；扣子任务文件只是可复制模板，实际引用文件读取必须逐一验证。

本次直接核对官方[产品动态](https://docs.coze.cn/guides_release_note)、[导入项目](https://docs.coze.cn/guides_import_from_github)、[Git 服务](https://docs.coze.cn/guides_using_git_services)、[多分支](https://docs.coze.cn/vibe-coding-multi-branch)、[编程环境](https://docs.coze.cn/guides_vibe_coding_environment)正文：根 AGENTS 自动加载、导入会补齐规范并构建、Git 界面仅同步 main/当前授权账号 owner、沙箱 Worktree 和代码压缩包下载均有官方说明。内部 Worktree 不等于 GitHub 远程分支，界面限制也不代表终端完全没有 Git 分支能力。官方导出说明未明确文件扩展名，ZIP 为约定路径，实际格式待 B 确认。

初期交付采用“扣子代码导出 ZIP/压缩包 → Mac 功能分支仅挑选获准文件 → 构建/页面核验 → PR → A 审核”。内置 Push 禁止写共同 main；未来终端路线须在另获授权的无敏感测试仓库验证后再提出调整，不能据此开放正式 main。个人/私有 GitHub 上传、扣子第三方云端导入、腾讯云发布是分别授权事项，本地提交另需授权。本轮没有连接、导入或发布。

### 差异与跨平台检查

- 本轮 `web/` 54/54 个候选工程文件 SHA-256 与开工快照一致，包含业务视图、Mock、package/lock、main/router/theme、旧样式和 Express。相对 Stage 00+01 的原始 52 文件，仍仅为上一轮已获批的四项公共改动，原其余 48 文件未变。
- 本轮仅六个获准文档变化；Stage 00+01 文档、Stage 02 PLAN/ACCEPTANCE/CHECKS 及旧验证证据未修改。RESULT 原始正文保持字节前缀一致。
- `git diff --check` 及暂存区检查通过；因仓库尚无首次提交、文件均未跟踪，额外逐文件与开工副本执行 `git -c core.autocrlf=false diff --no-index --check`，无新增空白诊断；no-index 的 exit1 表示存在本轮差异。该单次命令参数未写入 Git 配置，未以空 diff 冒充文档差异检查。
- 修改文档采用 LF，无个人本机绝对路径、无断开的仓库 Markdown 链接、无新增密钥形态命中；候选路径未发现大小写冲突。npm/锁文件、import 大小写规则和禁止整库换行重写的约束保留。未新增 `.gitattributes` 或环境版本配置。
- 本机 `core.autocrlf=true`，默认 no-index 检查会提示 Git 后续可能将 LF 转为 CRLF；当前六份文档实际仍全部为 LF。未擅改 Git 配置或执行 renormalize，首次基线前由双方决定是否另行授权最小 `.gitattributes` 统一策略；B 的实际克隆/导出换行结果仍待核验。
- 环境文件、嵌套依赖/构建、原始资料、本轮检查副本与日志均受现有忽略规则保护，`.gitignore` 未修改。敏感值未输出；扫描不替代历史资料授权审查。
- 本轮为纯文档变更，未重新执行 npm ci/build 或浏览器回归，原 Windows 构建记录完整保留。文档静态核验不能证明 B 的 macOS 或扣子环境已通过。

### 当前状态及下一步

Git 仍为 main、无首次提交、暂存区为空、无 remote/tag；当前 73 个未跟踪候选（比上轮多出的扣子模板在本轮开始前已由负责人提供）。未 commit/tag/push、创建远程或部署。完整当前候选及本轮差异/哈希检查留于被忽略的 `_tmp/stage02-coze-v12/`；原 CHECKS.json 的 72 文件清单保留为历史快照，首次提交前须重新审阅实际 73 文件，不能直接沿用旧清单。

文档适配检查已完成；Stage 00+01 与 Stage 02 整体继续 PENDING。默认 5173 历史 EACCES/例外审批、Key 轮换、原业务与视觉签收、图片/专家资料授权、npm audit 5 中危/2 高危/1 严重及代理/演示认证风险均未关闭。首次本地提交仍待负责人审核实际候选及明确批准，云端安全门禁不能由本地提交批准替代。

B 一次性验证仍为 PENDING：核实扣子具体产品形态与权限；取得云端分别授权并使用脱敏材料；验证四份规范实际读取和导入差异；核实内置 main/owner 限制及无自动部署/分享/新增服务；在获准无敏感试验中导出并在 Mac 功能分支挑选文件，分别执行安装、构建、页面/大小写/LF 核验；提供不写共同 main 的 PR 交接证据，由 A 复核后再授权后续模块任务。
