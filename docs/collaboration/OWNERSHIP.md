# 双人模块归属与统一协作规则

模块分工记录日期：2026-10-21。适用于负责人 A（Windows + Codex）、负责人 B（macOS + 扣子/Coze，具体编程形态由 B 核验）及任何其他 Agent；角色每轮由人明确指派，不得因工具名称自行推断权限。模块分工沿用既定边界，不表示 V1.2、公共 UI 或平台对接已签收冻结。

执行前实际读取根 `AGENTS.md`、[协作规范 V1.2](FRONTEND-COOPERATION.md) 与 [UI 指南](UI-COMPONENT-GUIDE.md)，连同本文件作为共同入口。技术、视觉及扣子交付细则引用 V1.2，不重复维护另一套制度。

## 一期模块归属

采用原需求的 1～8 编号；工单处理是模块 8。需求中 A 清单内的第 4 项表示 A 的第四个模块，不改变业务模块编号。

| 业务模块 | 现有 PC 路由 | 现有 Vue 文件 / 专属数据、组件 | 负责人 | 小程序归属 |
| --- | --- | --- | --- | --- |
| 1 驾驶舱 | `/` | `web/src/views/DashboardView.vue`；`src/data/dashboard.js`；`src/components/dashboard/*` | A（整合维护者） | 后续若纳入，由 A 负责 |
| 2 专家知识库 | `/knowledge` | `web/src/views/KnowledgeBaseView.vue`；`src/data/knowledgeBase.js` | A | 后续若纳入，由 A 负责 |
| 3 AI智能体 | `/ai-agent` | `web/src/views/AiChatView.vue` | A | 后续若纳入，由 A 负责 |
| 4 AI随手拍 | `/snapshot` | `web/src/views/SnapshotView.vue` | B | 一期 4 条移动端需求均归 B |
| 5 AI节能智能分析 | `/energy` | `web/src/views/EnergyView.vue` | B | 后续若纳入，由 B 负责 |
| 6 设备健康 | `/predict`（共用） | `web/src/views/PredictMaintenanceView.vue`（与 7 合并） | B | 后续若纳入，由 B 负责 |
| 7 设备预测性维护 | `/predict`（共用） | 同一 `PredictMaintenanceView.vue` | B | 后续若纳入，由 B 负责 |
| 8 工单处理 | `/work-order` | `web/src/views/WorkOrderView.vue`；`src/data/workOrder.js` | A | 一期 1 条移动端需求归 A |
| 9 人员调度 | 暂无 | 二期，禁止在本阶段新增 | 后续另定 | 不在本阶段 |
| 10 备品备件及商城 | 暂无 | 二期，禁止在本阶段新增 | 后续另定 | 不在本阶段 |

表内 `src/...` 均位于 `web/`，不表示另建根目录源码。按用户冻结的原始估算口径，B 约 57.7%，A 约 42.3%，近似 6:4；该比例不是已完成工作量或原型实耗工时。

只按完整业务模块分配，不将同模块内部子功能拆给两人。模块 6 和 7 的现有合并页面由 B 同时维护，不为分工而拆页或改菜单。同模块 PC 与移动端始终由同一负责人承担。

## 公共文件由 A 统一协调维护

| 公共范围 | 现有文件 / 路径 | 维护与影响检查 |
| --- | --- | --- |
| 入口、布局、路由、导航 | `web/index.html`、`src/main.js`、`src/App.vue`、`src/router/index.js`、`src/components/Sidebar.vue`、`Topbar.vue` | A；影响全部路由和菜单 |
| 演示登录、系统设置、共享状态 | `src/views/LoginView.vue`、`SettingsView.vue`、`src/composables/useAuth.js`、`useAppState.js` | A；设置页未归入一期 8 个业务模块，按公共页维护 |
| 共享图表、提示与全局样式 | `src/composables/useEcharts.js`、`useToast.js`、`src/styles/*` | A；变更前核对各使用模块 |
| 公共静态资源 | `web/public/*` 及其图片、头像目录 | 默认 A 协调；模块专属新增资源须先确认归属和引用 |
| 依赖、构建、代理、环境示例、历史脚本 | `web/package.json`、`package-lock.json`、`vite.config.js`、`server/index.js`、`.env.example`、`scripts/*` | A；涉及所有开发者、AI 代理和部署 |
| 仓库规范、跨模块协议、未来部署配置 | 根 `.gitignore`、`README.md`、`AGENTS.md`、`docs/*`、`contracts/*`、未来小程序公共配置 | A 整合，B 参与影响评审；不得提前生成部署或小程序工程 |

## 协作流程

1. 两人使用独立工作目录或独立克隆，避免两个 Agent 同时改同一工作区。首次基线提交后，从确认的 `main` 创建各自模块分支；分支名建议 `feat/a-模块名`、`feat/b-模块名`。
2. 每次任务先列允许修改的文件、模块负责人、公共依赖和验证方式。Agent 不得顺手修改对方模块；跨模块问题只记录或交由所属负责人处理。
3. B 需要公共文件变更时，将原因、最小修改范围、影响路由及所需验证交给 A 协调。A 修改公共文件须单独检查并在评审中列明影响，不能把公共变更夹带在模块修改里。
4. 不覆盖对方未提交修改；出现语义冲突逐处比较双方意图。模块 6、7 共页由 B 内部统一安排，避免并发写入。
5. 提交前检查 `git status`、diff、忽略规则和暂存文件；仅纳入本任务文件。不得提交真实环境变量、原始资料、密钥、依赖、构建和临时文件。
6. 建立远程协作平台后，通过 PR 说明问题、最终改动、公共影响、验证和剩余风险，由 A 整合进入 `main`。创建远程、改 remote、commit、tag、push、合并和部署均等待负责人明确授权。
7. 涉及跨模块数据时先在 `contracts/` 确认字段、来源、权限与责任，不以直接修改对方页面实现联动。本阶段只记录待确认方向，不冻结正式状态机或接口。
8. 一次可交付修改应包含相应构建/页面验证证据；构建通过、Agent 浏览器冒烟、负责人业务验收分开记录。Mock 与真实能力按实际边界表述。

## Stage 00+01 历史初始化边界

允许初始化文档、忽略规则、原始源码哈希清单、npm 安装/构建、条件允许的本地启动和页面检查、无远程的本地 Git 初始化。本阶段不修改任何已有 `web/` 文件，不安装小程序依赖，不新增业务功能。历史源码内登录和代理风险只记录；正式公网部署前由 A 协调安全加固和负责人确认。

上段仅记录 Stage 00+01 历史范围；Stage 02 公共 UI 按独立授权已实施，当前扣子适配仅修改获准文档，不改 web 工程。双方阶段均保持 PENDING。扣子内部 Worktree 不等于远程分支，B 不得通过内置 Push 写共同 main；初期按 V1.2 采用代码导出 ZIP/压缩包 → Mac 获准功能分支挑选文件 → 构建/页面验证 → PR → A 集成，首次基线/远程与分别授权具备后才执行。
