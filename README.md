# E智维智能运维平台前端原型

已完成 Stage 00+01 工程初始化与 Stage 02 公共 UI 基线建设，两阶段整体验收均为 **PENDING**。PC 唯一基线是业务方现有 `web/`，继续保留原业务页面、字段、菜单、数据和交互；当前仅准备首次本地 Git 基线，不开展业务功能开发。验收见 [Stage 00+01 ACCEPTANCE](docs/stages/00-01-baseline/ACCEPTANCE.md)、[RESULT](docs/stages/00-01-baseline/RESULT.md) 及 [Stage 02 ACCEPTANCE](docs/stages/02-ui-baseline/ACCEPTANCE.md)、[RESULT](docs/stages/02-ui-baseline/RESULT.md)。

## 工程布局

```text
web/                      现有 PC Vue 工程，保持原目录
miniapp/README.md          微信小程序方向预留，无实际工程
contracts/README.md        跨模块数据协议讨论入口，无正式状态机
docs/collaboration/       双人及不同 AI 工具统一协作规则
docs/stages/00-01-baseline/ 初始化计划、验收、结果与原始源码校验清单
docs/stages/02-ui-baseline/ 公共 UI 基线计划、验收与执行证据
.local-inputs/            本地原始需求资料，Git 忽略
```

## PC 技术栈与运行

Vue 3 + Vite 5 + Vue Router 4 + ECharts 5 + JavaScript，已接入 Element Plus 2.14.7 与统一主题 `web/src/styles/theme.css`；现有 Node.js / Express AI 接口代理。以 `web/package-lock.json` 为准，当前锁定 Vue 3.5.42、Vite 5.4.21、Vue Router 4.6.4、ECharts 5.6.0、Express 4.22.2、dotenv 16.6.1。初始化验证环境：Windows / Node.js 24.14.0 / npm 11.9.0；这是既有 Windows 验证环境，不是最低版本承诺，也不代替 B 的 macOS/扣子验证。

先在仓库根目录打开终端，再执行以下命令，适用于 Windows PowerShell 和 macOS Shell。Windows 若受 npm 脚本执行策略限制，可将 `npm` 写为 `npm.cmd`。

```powershell
cd web
npm ci
npm run dev
```

默认开发入口为 [http://localhost:5173/](http://localhost:5173/)，遵循现有演示登录与路由守卫。已有 Windows 5173 EACCES 与临时 15173 验证记录，本轮不处理端口限制；实际启动方式和 UI 示例见 [UI 使用指南](docs/collaboration/UI-COMPONENT-GUIDE.md)。若端口被占用，先查看终端实际地址；阶段核验应使用 `--strictPort` 区分端口变化，不能将替代端口通过视为默认端口已修复。

```powershell
npm run build
npm run preview
```

构建输出 `web/dist/`。如需停止本地服务，在对应终端使用 Ctrl+C。

现有 `npm run server` 与 `npm start` 都执行 `node server/index.js`，默认端口为 3000；它同时托管 `dist/` 并提供 history 路由回退。Vite 会把 `/api` 转发到 `http://localhost:3000`。本阶段不启动 Express、不配置真实 Key、不调用真实 AI；`/predict` 页面存在自动请求本地 AI 代理并在失败时回退的原有逻辑。运行该页面前应确保 3000 端口没有真实 AI 服务。

`web/.env.example` 仅有占位符，原样保留。真实环境变量只由负责人在本地或部署平台配置；禁止进入 Git、前端代码及 `VITE_*` 客户端变量。演示账号由负责人从现有实现确认，文档不传播固定口令。

## 小程序方向

后续采用 uni-app + Vue 3 + TypeScript，独立构建和微信小程序发布。当前只预留 [miniapp/README.md](miniapp/README.md)，不创建项目、不安装依赖。移动端一期优先原需求的 5 条：AI随手拍 4 条、工单处理 1 条；PC 继续使用 JavaScript。

## Git 与双人协作

根目录统一管理 PC、后续小程序、协议和文档。按完整业务模块分工，同模块 PC / 小程序由同一负责人负责；负责人 A 统一协调公共文件。两个 Agent 均须实际阅读 [AGENTS.md](AGENTS.md)、[协作规范 V1.2](docs/collaboration/FRONTEND-COOPERATION.md)、[OWNERSHIP](docs/collaboration/OWNERSHIP.md) 和 [UI 使用指南](docs/collaboration/UI-COMPONENT-GUIDE.md)。V1.2 尚待双方核对及负责人签收冻结；B 的 [扣子任务入口](docs/collaboration/COZE-TASK-START.md) 是人工复制模板，不是自动加载配置。

建议经负责人确认基线后，两人分别使用独立工作目录或各自分支，以模块命名，例如 `feat/a-dashboard`、`feat/b-snapshot`。提交前检查文件归属和 diff，经评审后由 A 整合；有远程协作平台后使用 PR。本地基线按负责人授权提交，远程连接、推送和标签冻结另行批准；本地提交不代表阶段验收或第三方托管授权已完成。

不得提交真实 `.env`、凭据、`node_modules/`、`dist/`、`_tmp/`、`.local-inputs/`、缓存、日志、原始压缩包及开发工具临时文件。根目录规则保护嵌套工程；仅经脱敏检查的 `.env.example` 可提交。忽略规则不会移除已经被 Git 跟踪的文件，后续提交前仍须检查暂存区。

## 当前交付边界

现有页面中的静态数据、Mock、alert、AI 失败回退和客户端演示登录，不代表真实设备接入、工单闭环、身份认证或 AI 服务可用。当前发现依赖安全告警与代理/演示登录风险，仅记录，未升级依赖或改造业务。

正式公网部署前须完成历史 Key 轮换确认、可靠访问控制、AI 代理服务端鉴权/限流与费用保护、依赖风险处理，以及医院/专家/头像等资料的使用授权。负责人验收和历史 Key 轮换尚待确认时，不得将整体 Stage 标为 PASS。
