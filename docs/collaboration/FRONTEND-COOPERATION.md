# E智维｜前端原型双人协作规范 V1.2

> 状态：修订候选，待 A/B 双方核对及 Stage 02 负责人签收后冻结。修订日期：2026-10-21。\
> 仓库内唯一正式文件位置：`docs/collaboration/FRONTEND-COOPERATION.md`（**从 Git 仓库根目录起算**）。\
> 适用范围：`web/` PC 管理后台原型，以及未来 `miniapp/` 微信小程序原型。\
> **目标：同一产品风格、同一技术路线、完整模块归属、改动相互隔离；以能演示的业务原型为第一优先级。**
> **路径规则：**文档所有路径统一采用仓库相对路径 `/` 分隔符。各人可将仓库克隆至任意 Windows/macOS/Linux 目录；绝不把本机绝对路径写入共享任务提示词。

## 1. 技术选型与不可变规则

| 事项 | 统一规则 |
| --- | --- |
| PC 应用 | **一套 Vue 3 + Vite 单页应用**，沿用现有 `web/` 工程，不按人员或用户角色拆建多套后台 |
| PC 业务页面 | Vue 单文件组件 `.vue`，推荐 `<script setup>`；**不得为新业务另建独立 `.html`、iframe 壳页面** |
| PC UI 组件 | **Element Plus，唯一新增业务 UI 组件库**；不混用 Ant Design Vue、Naive UI 等其他完整组件库 |
| 路由及菜单 | 沿用 Vue Router 和现有统一导航；不为个人模块自建顶栏、侧栏或登录页 |
| 图表 | 沿用 ECharts，统一图表配色和数据格式 |
| 语言 | 继承原工程 JavaScript；新增 PC 页面暂用 JavaScript，不以原型任务为由全面改成 TypeScript。未来进入芋道正式工程再遵循其 TypeScript 规范 |
| 微信小程序 | 单独的 `miniapp/`，推荐 uni-app + Vue3 + TypeScript；**不引入 Element Plus**，不复用 PC DOM 组件 |
| 依赖 | 现有 Vue、Vite、构建工具及锁文件不得由任意 Agent 自行升级；Element Plus 已受控接入，后续依赖变更由公共维护人 A 协调 |
| 原型数据 | 使用稳定、可复现的 Mock 数据与前端状态，不把模拟操作宣称为真实后端能力 |

**现状与迁移原则（Stage 02 结束时）：**业务方原始工程是 Vue3 + Vite + JavaScript，保留现有页面、路由、ECharts 和旧样式；Stage 02 已引入 **Element Plus 2.14.7**、`web/src/styles/theme.css` 与开发专用 `web/src/views/__dev/UiBaselineView.vue`（`/__ui-baseline`）。Stage 02 当前仍待负责人验收，**不授权批量重构业务页面**；新增或明确授权改动的业务页面逐步采用新规范。

## 2. 模块归属和文件边界

**负责人 A（目前使用 Codex）：模块 1 驾驶舱、2 专家知识库、3 AI智能体、8 工单处理。**\
**负责人 B（使用扣子/扣子编程，实际使用形态需 B 核验）：模块 4 AI随手拍、5 AI节能智能分析、6 设备健康、7 设备预测性维护。**\
**A/B 是人和业务责任分工，不是 Agent 类型。** 任何 AI 工具不能仅凭自身名称推定所属角色；每轮任务应由委托人明确声明 `角色=A/B` 与模块编号。未声明则只读核对，不做跨模块修改。\
同一模块的全部 PC 功能和小程序功能由同一负责人完成，**不得按功能点拆给两人**。

| 归属 | 涉及现有页面与文件 | 新增页面/子组件建议目录 |
| --- | --- | --- |
| A | `DashboardView.vue`、`KnowledgeBaseView.vue`、`AiChatView.vue`、`WorkOrderView.vue` | `views/dashboard/`、`views/knowledge/`、`views/ai-agent/`、`views/work-order/` |
| B | `SnapshotView.vue`、`EnergyView.vue`、`PredictMaintenanceView.vue` | `views/snapshot/`、`views/energy/`、`views/device-health/`、`views/predictive-maintenance/` |
| A 统一维护公共区 | `web/src/App.vue`、`web/src/main.js`、`web/src/router/`、`web/src/components/Sidebar.vue`、`web/src/components/Topbar.vue`、`web/src/views/LoginView.vue`、`web/src/views/SettingsView.vue`、`web/src/composables/`、`web/src/styles/`、`web/package.json`、锁文件、`web/server/`、仓库 `contracts/`、部署配置 | 以实际需求创建，不做一次性目录迁移 |

- `PredictMaintenanceView.vue` 目前同时承载模块 6、7，均由 **B** 负责，不要求先拆文件。
- 现有 `components/dashboard/` 归 **A** 管理；新组件优先存自己模块目录；仅确实被至少两个模块重复使用且经双方确认，才抽为公共组件。
- **禁止** Agent 顺手编辑对方的页面、Mock、组件；也不得为了方便改动整个全局 CSS、公共依赖或代理。
- B 需要新增菜单、路由、公共变量/组件、依赖或跨模块功能时，先在任务说明中列出修改申请和目标效果；**由 A 集成公共改动**，B 继续独立实现自己的页面。紧急情形经双方明确同意后例外，PR 需单独列明。
- 小程序页面按上述业务归属。`miniapp` 全局页面注册、应用入口及主题由 A 协调维护；当前小程序重点根据需求清单落在 **AI随手拍（B）和工单（A）**。

## 3. 工程目录与文件写法

现有结构保持不动；对**新增页面**优先按下列方式存放。目录不是迁移命令：

```text
ezhiwei-prototype/
├── web/
│   ├── src/
│   │   ├── views/                      # 原页面保留；新增页面按模块建子目录
│   │   │   ├── work-order/             # A
│   │   │   ├── snapshot/               # B
│   │   │   └── ...
│   │   ├── components/                 # 既有公用/驾驶舱组件
│   │   ├── router/                     # A统一集成
│   │   ├── data/                       # 既有Mock；后续可按模块细分
│   │   └── styles/                     # 既有样式 + 已接入的 theme.css
│   └── package.json
├── miniapp/                           # 后续独立建立uni-app工程
├── contracts/                          # 跨模块字段/状态约定
└── docs/collaboration/
    ├── OWNERSHIP.md
    └── FRONTEND-COOPERATION.md          # 本规范
```

新页面默认约定：

- 一个主要业务页面一个 `.vue`；使用 `<template>`、`<script setup>`、`<style scoped>`，复杂内容可拆**本模块内**子组件。
- 使用 Vue 响应式状态、Vue Router，不操作 DOM 拼大段 HTML，不使用 iframe 承载业务页。
- 业务表单、表格、按钮、日期、选择器、对话框、抽屉、标签等优先使用 Element Plus；不重复手写第二套通用组件。
- 页面**不包含全站 Header/Sidebar**；不修改系统浏览器入口 HTML。
- 业务数据及本地状态按模块隔离；若需持久化，使用 `ezhiwei:<module>:v1:` 前缀；禁止直接向别人的 Mock 文件写入。
- 不新增无审批依赖；正式后端未实现前，所有接口与按钮须明确模拟范围，不放入任何真实密钥。

## 4. 统一视觉规范（PC 端）

**设计方向：蓝白色系、轻量科技感、清爽的企业管理后台。** 保留原始工程已采用的 Win11 风格基础：蓝色主色、浅色背景、浅色卡片和现有导航结构；不要突然将某个业务模块改成深色大屏、荧光渐变或另一套管理系统皮肤。

### 4.1 主题色（取自业务方原工程基础变量）

| 语义 | 色值 | 用途 |
| --- | --- | --- |
| 主色 / 选中 / 主要操作 | `#2173D8` | 主按钮、选中菜单、重点指标 |
| 主色浅背景 | `#E8F1FC` | 选中态、提示背景 |
| 成功 | `#107C10` | 已完成、正常 |
| 警告 | `#FF9500` | 待处理、注意（文本需保证对比度） |
| 危险 | `#D93025` | 故障、超时、删除 |
| 主文字 | `#1D1D1D` | 主要信息 |
| 次级文字 | `#6B6B6B` | 说明字段 |
| 辅助文字 | `#9B9B9B` | 占位、次要信息 |
| 页面背景 | `#FAFAFD` | 管理业务页面背景 |
| 卡片基底 | `#FFFFFF` | 表单、列表、管理卡片；驾驶舱原有半透明卡片可保留 |
| 边框 | `rgba(0,0,0,0.08)` | 卡片分隔和输入边界 |

**唯一真源原则：**公共维护人 A 维护 Stage 02 已创建的 `web/src/styles/theme.css`，集中管理 `--ez-*` 设计变量以及对应的 Element Plus `--el-*` 主题变量；原有 `index.css` 及 `app.css` 暂时保留。禁止 B 修改现有全局规则或在各业务页复制主题变量。若需要个别布局样式，可在本页 `style scoped` 中编写并优先引用变量。

示意（**现有 `theme.css` 的具体变量名与实际实现优先；以下为语义参考，不得重复创建主题文件或假设完全相同的变量名**）：

```css
:root {
  --ez-primary: #2173D8;
  --ez-success: #107C10;
  --ez-warning: #FF9500;
  --ez-danger: #D93025;
  --ez-page-bg: #FAFAFD;
  --ez-card-bg: #FFFFFF;
  --ez-text: #1D1D1D;
  --ez-text-secondary: #6B6B6B;
  --ez-card-radius: 16px;
  --ez-page-gap: 16px;
  --el-color-primary: var(--ez-primary);
}
```

Element Plus 的浅色衍生变量、状态色和实际样式优先通过其官方主题能力统一配置，不只修改一个主色变量就认为完成适配。

### 4.2 页面尺寸与组件标准

| 要素 | 统一约定 |
| --- | --- |
| 页面 | 继续使用现有顶栏+侧栏容器；正文内容区自适应，优先在 1366px 和 1920px 浏览器宽度检查 |
| 页边距 / 模块间距 | 主页面约 20px，卡片间距约 16px，控件内部间距使用 8/12/16/24px 阶梯 |
| 标题 | 页面标题约 20px；卡片标题约 16px；正文 14px；说明 12px；不随意使用 10px 小字 |
| 圆角 | 业务卡片 16px；表单/按钮约 6–8px；保持已有驾驶舱特殊组件原样 |
| 表格 | Element Plus Table，统一表头、行高、操作列位置、空状态和分页；操作按钮不过度堆叠 |
| 筛选栏 | 卡片顶部，查询/重置排列一致；同类型表单字段宽度一致 |
| 弹窗/抽屉 | 标题、正文和底部操作区统一；宽度随内容适配，避免超出视口；长表单用抽屉或分段 |
| 状态展示 | 统一 `el-tag` 或已有标准组件：正常绿、待处理橙、异常红、一般信息灰/蓝，不只靠颜色区分 |
| 图标 | 优先 Element Plus Icons；已有自定义图标继续保留，不新增随机 Emoji 作为正式功能图标 |
| 图表 | 沿用 ECharts，主蓝色及语义色；图例、单位、时间轴与 tooltip 清楚，Mock 数据不每次随机跳变 |

禁止：单个模块自创全站背景、深色主题、大面积渐变、不同按钮体系、全局覆盖 `el-*` 组件选择器、毫无业务意义的炫酷动画。**新增业务页以表格、表单、流程和状态可读性为优先。**

## 5. 原型业务交互要求

- 必须以最新需求清单、已确认评审意见和现有业务方原型为功能依据；未明确要求删改的字段、现有能力和入口继续保留。
- 原型可以不接真实后端，但**被用于演示的操作必须有可见结果**：新增/编辑/删除、筛选/重置、详情、状态变更、弹窗关闭与反馈等。新功能禁止只写 `alert('待开发')` 充数。
- 使用可复现的 Mock 数据，至少包含正常、异常、空数据等必要演示情境；状态、日期、数量、单位、编号相互一致。允许本地状态驱动交互，但不得称为真实数据同步。
- 跨模块（如 AI随手拍/设备预警→工单）先提出输入输出字段与交互约定，由**A 负责 `contracts/` 和工单接收端**，B 负责自己模块发起端；双方禁止互相直接改动业务文件。
- 每轮任务只修改明确授权的功能，避免同时进行大规模 UI 重绘、业务重构和依赖升级。

## 6. 两人最简 Git 协作流程

**`main` 仅保存已审核、可演示的整合版本；开发工作在各自的短期分支完成。扣子编程的内置 Git 同步界面目前仅支持 `main`，B 不得以其直接 Push 替代 GitHub 功能分支 + PR。**

```text
main
├── feat/a-work-order          # A：工单一轮任务
├── feat/a-knowledge           # A：知识库一轮任务
├── feat/b-snapshot            # B：AI随手拍一轮任务
└── feat/b-device-health       # B：设备健康一轮任务
```

1. 开始任务时从最新 `origin/main` 新建 `feat/a-*` 或 `feat/b-*` 分支；不要两人共同修改同一个工作目录/分支。
2. Agent 修改前先核对当前分支和 `git status`（工具不支持时需如实说明），列出允许文件范围；**不得覆盖、恢复、清理不属于本任务的已有改动**。
3. 在正常本机 Git 工作流中只暂存本次文件，按模块 commit；`git add .`、强制 push、自动 rebase、直接提交 main 均不作为 Agent 默认动作。扣子内部 Worktree 可能自动记录提交，需区分其内部提交和 GitHub 远程写入。
4. 任务结束构建并截图核对；经审查从本地 Git 或已验证的安全通道将开发分支 push 到 GitHub 后创建 PR。另一人至少检查**越界文件、页面风格、功能可演示、构建结果**，合并后 main 仍应可演示。
5. 需更新公共文件时，由 A 在单独的公共变更提交中集成；只需在 PR 写明涉及的路由/菜单/依赖变更，不另维护冗长菜单冻结表。
6. 部署只使用已批准的 main 版本；发布和密钥、服务器配置由 A 统一控制。Agent 不得自动部署。

> 上述分支/PR流程在获批首次基线提交、远程仓库及 `origin/main` 建立后适用；当前尚无首次提交和 remote，不据此自动创建或执行。**个人/私有 GitHub 上传、扣子云端导入、腾讯云发布分别需要授权**；本地 Git 提交也需单独授权。机构资料授权、密钥轮换、依赖及访问控制等门禁保留，不以原型为理由跳过安全要求。

## 7. Agent 每轮任务验收（必做 6 项）

- [ ] **范围**：只修改所属业务模块及明确授权文件；不存在别人模块/公共文件的意外 diff。
- [ ] **技术**：PC 新增功能使用 `.vue` + Vue3 + 已统一接入的 Element Plus，不新建 HTML/iframe，不增其他 UI 库。
- [ ] **视觉**：页面主色、布局、间距、字体、表格、按钮、弹窗符合第 4 节；至少核对对应浏览器尺寸。
- [ ] **交互**：演示路径可操作，筛选/表单/弹窗/状态更新的结果真实反映 Mock 状态，不伪装真实接口。
- [ ] **回归**：使用项目已有命令在 `web/` 执行 `npm run build`（如任务涉及 miniapp，执行对应小程序构建），关键原有页面仍可打开；测试未完成要如实标记。
- [ ] **交付**：输出修改文件、业务变化、截图/复验项、build 结果、已知问题及需 A 集成的公共事项；未经明确授权不 commit/push/部署。

## 8. 两位 Agent 通用任务开头（复制使用）

```text
你正在协作开发 E智维前端原型。请以当前打开的 Git 仓库根目录为项目根目录；
不得假设 Windows/macOS/Linux 上的本机绝对路径相同。

开始修改前，实际打开并阅读以下仓库相对路径的文件（不得只凭文件名猜测内容）：
1. AGENTS.md
2. docs/collaboration/FRONTEND-COOPERATION.md（核对版本 V1.2）
3. docs/collaboration/OWNERSHIP.md
4. docs/collaboration/UI-COMPONENT-GUIDE.md

本次负责人：【A / B，必须填写】
本次业务模块：【模块编号与名称】
本次任务：【明确要做的功能】
允许修改：【具体仓库相对路径】
不允许修改：【对方模块、公共导航/全局样式/依赖/部署等】

开始前先回复：已读取的文件及其版本/主要约束、当前 Git 分支及工作区状态、
本次允许修改范围、需要 A 协作的公共文件；若任何规范文件缺失/无权访问，先停止修改并报告。
按规范使用 Vue 单文件组件与统一 UI 主题，保留未要求修改的既有业务功能。
超出模块边界的公共变更只提出请求，不擅自修改。
完成后执行适用的 npm 构建、关键交互回归和 git diff 检查，逐项汇报。
未经明确授权不得 commit、push main、修改历史或部署。
```

### 8.1 跨平台路径与运行环境（Windows / macOS / Linux）

- **仓库相对路径是唯一共享写法。** 本规范、Agent 提示词、报错、PR 清单都以当前 Git 仓库根目录为基准，例如 `web/src/views/SnapshotView.vue`。个人电脑上的工作目录由各人自行选择，不写入共享规范；代码不得包含本机磁盘盘符、用户主目录或绝对资源路径。
- 两名成员应分别在本机通过 Git 克隆同一仓库；不要复制对方电脑上的 `node_modules/`、构建产物或 `.env`。**项目根目录不是 `web/`：**在仓库根目录打开 AI 工具，PC npm 命令进入 `web/` 再运行。
- PC 端统一使用 `npm` 与仓库内的 `web/package-lock.json`：在 `web/` 执行 `npm ci`、`npm run dev`、`npm run build`。不混用 `pnpm/yarn`，不提交本机依赖目录。Node/npm 版本应以双方验证过的兼容版本统一，待确定后再建立 `.nvmrc`/engines，不由 Agent 猜测升级。
- 自动化脚本优先通过 `npm scripts` 实现跨平台；不要在共享脚本内硬编码 PowerShell 语法、Windows 盘符或 macOS 专用命令。操作指南若必须写 shell 命令，分别标注 PowerShell 与 macOS Shell 示例。
- 新增路径和 `import` 的大小写必须与真实文件名完全一致，禁止只改大小写的重命名被无意遗漏；不以 Windows 或默认 macOS 文件系统的大小写不敏感为依据，需考虑 Linux 服务器大小写敏感。新建共享 `.gitattributes`（如需）应最小化规定文本 LF；禁止未经审查对现有大量源码执行全库换行重写或 `git add --renormalize .`。
- `.env`、`.local-inputs/`、日志、构建产物、macOS `.DS_Store` 和工具本机状态不得进入 Git。部署、服务器主机名、个人密钥不写入业务页面或规范示例。
- 本地开发端口（例如 5173 或 15173）可能因环境占用/权限差异而变化；共享代码和 Agent 提示词**不得依赖唯一固定端口**，验收记录应报告实际地址。

### 8.2 Codex + 扣子编程：统一规则的加载与核验

- **唯一规则入口**：仓库根目录 `AGENTS.md`；它**引用** `docs/collaboration/FRONTEND-COOPERATION.md`（技术/视觉/协作）、`docs/collaboration/OWNERSHIP.md`（归属）、`docs/collaboration/UI-COMPONENT-GUIDE.md`（UI 细则），不在各 Agent 的专属文件重复复制规范正文。
- **Codex**：在 Git 仓库根目录打开项目，并读取根 `AGENTS.md` 及其引用文件。
- **扣子编程（Coze Coding）**：官方 2026 年 3 月更新说明其 AI 编程支持自动加载项目根 `AGENTS.md`；但**不等于自动读完被引用的全部文件**。每轮开始仍要显式提示它实际打开并读取四份文件，回答规范版本、角色与模块、文件边界、主题和 UI 约定。
- **不使用 TRAE 规则路径**：本项目 B 不使用 TRAE，无需 `.trae/rules/ezhiwei.md`；不为扣子臆造 `.coze/rules/`、`.coze/AGENTS.md` 等自动生效目录。`docs/collaboration/COZE-TASK-START.md` 是**可复制粘贴的提示词模板，不是扣子平台自动加载的规则文件**。
- **角色由人指派**：扣子不会因为开发者使用它就自动获得 B 的模块权限。每个任务必须写明 `角色=B`、模块号、允许修改文件。若缺少规范、角色不明、未实际读取文件，停止写入并报告。
- **导入后先审计**：扣子编程从 GitHub/ZIP 导入时可能自动补充 `AGENTS.md`、修改工程入口或尝试适配构建；在开始业务开发前对比文件树和 Git diff，未经授权的 `AGENTS.md`、技术栈、路由、依赖修改不得回传正式仓库。
- **双人验证**：A 与 B 各自让 Agent 复述本人负责模块、`--ez-*` 主题和公共文件流程；人工抽查两次执行记录及实际读取证据，不能只凭口头说“已遵守”就视为通过。

### 8.3 公共文件和跨模块请求的最小交接

跨模块请求不需要复杂审批单。由发起人（通常是 B）在 PR 或任务结果中写明四项：

1. **需求**：例如为设备健康新增菜单和 `/device-health/overview` 路由，或发起“生成工单”。
2. **涉及公共文件与接口**：拟新增路由名称/路径、目标 Vue 组件、预期跳转参数或字段类型。
3. **模块内部完成状态**：已实现哪些页面、用什么 Mock 可验证；指出因公共文件未接入而不可达的部分。
4. **集成验收**：A 集成公共修改、双方确认入口与跨模块跳转；PR 合并前确认 `npm run build` 和涉及页面可正常访问。

公共路由名和路径必须语义化、唯一，业务模块内部新组件自行管理；B 不直接修改 A 所维护的 `web/src/router/`、公共主题、全局数据与 `contracts/`。必要时由 A 在 B 的开发分支上补齐受控公共入口（或使用明确关联的集成 PR），在演示版本合入 main 前完成端到端联调。**不可将“AI 随手拍已创建工单”仅做各自独立 Toast 的伪联动。**

### 8.4 双人 Git 合并与跨平台预演

- A 完成首次获批准的本地 Git 基线、脱敏审查和 GitHub 私有仓库建设后，B 再获取**同一份**工程，不能让扣子另外生成一套不兼容的工程。
- **标准 GitHub 交付仍是 `feat/b-*` → PR → A 审核 → `main`**。Coze 内部工作树分支是扣子项目的隔离机制，不能未经验证就当成 GitHub 远程 `feat/b-*` 分支。
- **扣子官方 Git 服务限制（核验于 2026-10-21）**：内置同步界面仅支持 `main`，不提供切换/创建远程功能分支；绑定既有仓库还存在 owner 必须为已授权账号的限制。**禁止 B 对共同仓库使用内置 Push 直接写 main**。
- **默认安全交付（推荐）**：B 在扣子编程中基于经授权的相同 Vue 工程修改；完成后下载项目 ZIP；在自己的 Mac **克隆的 Git 仓库**中创建 `feat/b-*`，只挑选 B 模块获准文件进行对比与应用，执行 `npm ci`、`npm run build` 和页面核验；然后从 Mac 将功能分支 push 到 GitHub 并发 PR。**不可解压整包覆盖仓库**，也不可把扣子生成的 `AGENTS.md`、依赖、根目录入口等越界变化带入。
- **导出证据边界**：官方说明支持下载项目代码压缩文件；本文以 ZIP 为约定交付形式，实际下载格式、内容完整性和 B 当前产品入口仍需 B 核验，不以官方文档代替其导出实测。
- **直接推送的可选升级路线**：仅在 B 用无敏感数据的测试仓库实际证实扣子终端可使用标准 Git 创建、切换并 push 独立远程功能分支，而且不会意外写 `main`、不会覆盖历史之后，方可提出变更此交接流程。验证前不能推定终端 Git 命令支持完整分支权限与行为。
- A 在 Windows、B 在 macOS 分别运行同一 `web/` 的 `npm ci` / `npm run build`，检查 import 大小写、LF、锁文件、视觉布局；B 的云端构建不能替代其 Mac 上的整合验收。
- 同一浏览器 LocalStorage 中使用模块专属 key；跨模块统一协议由 A 维护，与 B 共同确认。
- 本地 commit、私有 GitHub 上传、扣子第三方云端导入、腾讯云公网发布是**四种不同的数据/安全行为**。未获公司授权或未完成密钥、图片/专家资料审查时，不得把内部代码/敏感资料导入扣子云端，也不得推送或公开部署。

### 8.5 扣子编程首次对接检查（B 实施，A 确认）

1. 核实使用的是**扣子编程 AI 编程项目**，还是普通扣子智能体/Coze Studio/其他扣子形态；后者不默认具备相同代码导入、AGENTS 自动读取及 Git 能力。
2. 核实对经脱敏、获授权的 GitHub 仓库能否导入。若 GitHub 授权、仓库 owner 或权限限制阻碍，则用**脱敏 ZIP**导入，不要为迁就平台直接改仓库所有权或放宽安全权限。
3. 导入完毕立即检查 `AGENTS.md`、技术栈、`web/` 子目录、依赖、路由、Element Plus 主题有无被重写。尤其检查扣子的默认开发框架不能取代 Vue3 + Vite。
4. 进行**不含真实业务内容的 B 模块小改动试验**：完成一处 `.vue` 演示调整，导出 ZIP 并在 Mac Git 分支只提取该改动，运行 `npm ci`、`npm run build`，形成待审核的差异；不需要也不允许向共享 `main` 提交测试变更。
5. 核对扣子是否意外自动启用部署、数据库、外部集成或公开分享；本项目全部禁用，除非另有审批。
6. 将验证证据（是否成功、差异清单、工程结构和 Git 同步限制）告知 A，双方批准后才开始 B 的真实模块开发。

**参考官方说明（以实际产品版本为准）：**
- AGENTS 项目规则：`https://docs.coze.cn/guides_release_note`
- 导入已有项目：`https://docs.coze.cn/guides_import_from_github`
- 内置 Git 服务：`https://docs.coze.cn/guides_using_git_services`
- AI 编程 Worktree：`https://docs.coze.cn/vibe-coding-multi-branch`
- 下载项目代码：`https://docs.coze.cn/guides_vibe_coding_environment`

## 9. 启用 V1.2 的一次性核对（公共 UI 已实施，对接验证仍待签收）

A 先完成并请 B 审阅：

1. 确认负责人提供的本 V1.2 已位于正式位置 `docs/collaboration/FRONTEND-COOPERATION.md`，**不重新生成替代内容或覆盖已有人工修改**。在授权范围内增量核对根 `AGENTS.md`、`OWNERSHIP.md`、`UI-COMPONENT-GUIDE.md`，避免版本、归属与技术规范冲突。
2. **不创建 TRAE 专属规则文件**；已有 `.trae/rules/ezhiwei.md` 如系前次误建且不存在其他工具依赖，经确认后移除。核对负责人提供的 `docs/collaboration/COZE-TASK-START.md`，只作为 B 的可复制任务提示词，而非自动规则目录。
3. Stage 02 已受控引入 Element Plus 2.14.7、主题及开发专用 `/__ui-baseline`；业务方原页面不变。A/B 继续评审视觉和构建，**Stage 00+01、Stage 02 均维持真实 PENDING 状态**直到负责人签收。
4. 后续首次 Git 提交、私有仓库授权与扣子平台导入分别履行安全门禁；先验证 B 在 Mac 与扣子云端的规范加载、`web/` 构建、代码导出和**不写 main 的 PR 交接**。
5. 未通过扣子对接试验前，不得宣称双人协作已完成自动化验证，也不得开始真实业务模块的云端批量修改。

2026-10-21 文档核验：上述官方页面支持根 AGENTS 加载、导入时补齐规范/构建、内置界面仅 main 和 owner 绑定限制，以及沙箱 Worktree、代码压缩包下载。它们是产品说明，不能证明 B 当前所用形态、账号权限、被引用规范的实际读取或 Mac 回传流程已通过；这些一次性验收仍为 PENDING。

**版本变化：**V1.2 基于 V1.1 删除 TRAE 专属说明，明确扣子编程 `AGENTS.md` 支持、内部 Worktree 与 GitHub `main` 同步的区别、仓库 owner 绑定限制、ZIP 代码回传和 Mac 本地功能分支 PR 的安全交付路径；保留既定模块分工、技术栈及蓝白色视觉规范。此前 V1.1 跨平台路径与公共交接规则继续有效。

---

参考：业务方现有 Vue3 源码；《多人协作原型项目规范》；[芋道 Vue3 项目](https://gitee.com/yudaocode/yudao-ui-admin-vue3)；[Element Plus 主题官方文档](https://element-plus.org/zh-CN/guide/theming.html)；[扣子编程官方文档](https://docs.coze.cn/)。
