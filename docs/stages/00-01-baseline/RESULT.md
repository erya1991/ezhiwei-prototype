# Stage 00+01 执行结果

执行日期：2026-10-21。根目录：`D:\git\ezhiwei-prototype`。

**结论：受控初始化已完成，整体阶段验收 PENDING。** 安装、生产构建和临时端口的九路由浏览器加载检查已通过；默认 5173 端口因环境 EACCES 无法启动。历史 Key 轮换、负责人视觉/业务验收及业务资料授权待确认。未进入功能开发，未提交、打标签、推送、创建远程或部署。

## 1. 工程检查与初始状态

- 初始根目录：现有 `web/`、空 `miniapp/`、含 2 份原始资料的 `.local-inputs/`；无根 Git 仓库，也非父仓库的一部分。
- 现有 web：`src/views` 9 个 Vue 视图、`src/components` 5 个组件（3 个驾驶舱专属）、4 个 composable、3 个数据文件、2 个样式文件；另有 public、router、main/App、scripts、server、package/lock、Vite 和入口 HTML。
- 现有历史生成脚本只读检查，未运行；没有重组、替换或重做页面。
- package.json / package-lock 根声明匹配，lockfileVersion=3，共 153 个包记录（含根及可选平台包）。锁定 Vue 3.5.42、Vite 5.4.21、Vue Router 4.6.4、ECharts 5.6.0、Express 4.22.2、dotenv 16.6.1。
- 当前验证工具版本：Node.js v24.14.0、npm 11.9.0、Git 2.53.0.windows.1。
- 初始未发现真实 .env、node_modules、dist 或 _tmp。已有 `web/.env.example` 两个 Key 均为中文占位符，原样保留。
- 修改前采集原始 web 52 个文件 SHA-256，见 [WEB-SHA256.json](evidence/WEB-SHA256.json)。复核为 **52/52 一致，差异 0，新增业务源码 0**；package、lock、配置、登录、代理、视图、数据和资源均未修改。
- 校验清单按路径排序，以“路径 + TAB + SHA-256 + LF”连接后计算的聚合值为 `fb821458fc3907eb2a52d6c942803c1b06adc42d7457de7d3f9308cc405ee15a`（路径排序使用 JavaScript localeCompare，locale 为 en）。逐文件清单是主要核对依据。

## 2. 实际执行步骤

1. 只读检查文件结构、现有规范、package/lock、Vite、路由、入口、Vue 页面、公共组件、服务代理和演示登录。
2. 仅以路径、行号、类型报告敏感风险；检查环境示例占位符、常见凭据格式和文本联系方式格式；原始资料保留在 Git 忽略范围。
3. 记录原始源码哈希，建立根 .gitignore，覆盖根目录和未来嵌套子工程。
4. 在 web 使用现有 npm / lock 执行 npm ci、npm run build，未更换包管理器、未升级依赖、未改源码。
5. npm audit 首次因 TLS 连接中断失败，重试成功取得报告，因发现漏洞 exit 1；仅记录，没有执行 audit fix。
6. 当前项目根执行 git init -b main；无既有 Git 历史被覆盖。未 add、commit、tag、remote 或 push。
7. 5173 的 IPv6 / IPv4 启动均 EACCES；再次以额外执行权限启动仍失败。只读 netsh 排查命令在本环境不可用，未推断具体保留端口原因，也未调整系统设置。
8. 用临时命令 `npm run dev -- --host 127.0.0.1 --port 15173 --strictPort` 成功启动，不改 vite.config.js。localhost:15173/login HTTP 200；localhost:5173 连接拒绝。
9. 通过内置浏览器使用原演示账号口令登录，不输出口令、不勾选记住密码、不伪造 localStorage。逐页加载九个指定路由，验证登录守卫、退出和设置刷新；保存证据后退出登录。
10. 未启动 Express；3000 端口在 IPv4 / IPv6 均连接拒绝。设备页原有自动本地代理请求发生 ECONNREFUSED 并显示“本地研判”回退。未配置/使用真实 Key，未调用真实 AI。
11. 创建项目、协作、预留和阶段文档；检查哈希、链接、忽略规则、候选范围与 Git 状态。
12. 浏览器检查后通过 Ctrl+C 停止本次 Vite 服务，临时服务不作为持久部署。

## 3. 新增文件与修改范围

本次新增 12 个交付文件：

| 文件 | 用途 |
| --- | --- |
| `.gitignore` | 根及嵌套工程的环境、依赖、产物、资料与临时文件保护 |
| `README.md` | 定位、技术栈、运行构建、Git、阶段与边界 |
| `AGENTS.md` | Codex 项目级最小修改、安全、模块及验证约束 |
| `docs/collaboration/OWNERSHIP.md` | 不依赖工具的双人整模块归属与公共文件规则 |
| `miniapp/README.md` | 后续 uni-app / Vue3 / TypeScript 与 4+1 移动范围 |
| `contracts/README.md` | 工单来源/接收的待确认协议方向 |
| `docs/stages/00-01-baseline/PLAN.md` | 基线、目标、允许/禁止范围、规划、风险 |
| `docs/stages/00-01-baseline/ACCEPTANCE.md` | 逐项状态及单列的负责人验收清单 |
| `docs/stages/00-01-baseline/RESULT.md` | 实际执行结果，即本文 |
| `docs/stages/00-01-baseline/evidence/WEB-SHA256.json` | 修改前原始 52 文件哈希 |
| `docs/stages/00-01-baseline/evidence/BROWSER-CHECKS.json` | 临时端口九路由与原登录守卫检查证据 |
| `docs/stages/00-01-baseline/evidence/PC-DASHBOARD.jpg` | Agent 驾驶舱截图；初始误用 .png，本轮按实际 JPEG 格式更名，字节未变 |

**已有文件修改：0；删除：0。** 本地新生成 `.git/`、`web/node_modules/`、`web/dist/`；后两项已忽略，Git 元数据不属于提交内容。原 .local-inputs 未改动。miniapp/contracts 仅有说明，无业务或协议实现。

## 4. 构建、启动与页面结果

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| npm ci | PASS | exit 0；added 105 packages；安装输出审计 106 packages；耗时约 18s |
| npm run build | PASS | exit 0；609 modules；Vite 报 built in 5.42s |
| 构建警告 | 已记录 | useEcharts 主块约 1,035.38 kB，gzip 343.67 kB，超过 500 kB 提示；本阶段不做拆包重构 |
| 默认 5173 启动 | FAIL（环境） | ::1 和 127.0.0.1 均 listen EACCES；HTTP ECONNREFUSED；不能称默认地址已验证可访问 |
| 临时 15173 启动 | PASS | 仅回环监听，449ms ready；localhost 访问 HTTP 200；检查完成后已停止 |
| 原登录、退出和路由守卫 | PASS（Agent 冒烟） | 未登录首页/知识库回登录；演示登录进首页；已登录访问 login 回首页；退出回登录 |
| 九个目标页面 | PASS（加载范围） | /login、/、/knowledge、/ai-agent、/snapshot、/energy、/predict、/work-order、/settings 均见页面内容 |
| 设置页刷新 | PASS | 当前 history 路由在 Vite 下刷新后仍显示设置 |
| 设备页本地回退 | PASS（原行为） | 本地代理连接拒绝，显示本地研判；不属于真实 AI 验收 |
| 浏览器错误/警告采样 | 已记录 | 最后设备页采样返回空列表；这不是全部交互或所有运行时的无错误保证 |
| 生产构建浏览器/部署验收 | PENDING / 本轮未执行 | 构建成功与 Vite 加载分别记录；未启动 Express/preview/公网环境 |
| 负责人业务和视觉验收 | PENDING | 详见 ACCEPTANCE 人工清单 |

## 5. 安全检查及处理状态

| 位置 / 风险类型 | 本次发现 | 处理状态 |
| --- | --- | --- |
| 环境文件 | 当前树未发现真实 .env；web/.env.example 为占位符 | 原样保留；嵌套忽略规则通过；未复制/创建真实环境文件 |
| 历史 Key 风险 | 原始分析资料记录历史原始材料曾包含服务商 Key | 当前文件不存在不代表密钥已失效；**轮换 PENDING，需负责人确认** |
| web/src/composables/useAuth.js（固定凭据及登录存储） | 客户端固定演示账号/口令，localStorage 登录标记；saveRemember 明文保存账号密码 | 未输出口令、未改源码；仅适合演示，生产认证待后续受控改造 |
| web/server/index.js（AI 代理） | POST /api/ai/:provider 读取服务端 env；无服务端身份认证、授权和限流/费用保护；25mb 请求体，透传上游请求/部分错误；监听未限制主机 | 未启动、未改造。正式公网前必须有访问控制和代理鉴权/限流，不得靠前端路由守卫保护服务 |
| 其他硬编码凭据扫描 | 常见 Key、云凭据、JWT、私钥标记、凭据字面量扫描中，仅发现演示口令需记录；未发现其他真实 Key | 位置/类型检查完成；不等于对任意编码内容和二进制资源的绝对无敏感证明 |
| 数据与资源 | src/data 未检出手机号/邮箱格式；存在机构标识、专家姓名与 public 头像等 | 保留原资源，未判断均为虚构；使用授权、隐私与目标仓库范围待负责人确认 |
| Git | index 为空、无 remote，候选清单不含 .local-inputs、node_modules、dist 或真实环境文件 | 根 .gitignore 验证覆盖 web/miniapp 及更深层路径；.env.example 可纳入 |
| AI 调用边界 | Express 未启动，3000 两种回环地址均 ECONNREFUSED；未点击发送、识别或报告调用 | 无真实 AI 请求；仅观察 predict 页原有失败回退 |

npm audit 成功报告 **8 个存在漏洞报告的依赖包：5 moderate、2 high、1 critical**。这是工具报告，不等同于已证明所有漏洞可在本项目利用。

| 包 | npm audit 严重级别 | 本轮动作 |
| --- | --- | --- |
| body-parser、echarts、esbuild、express、qs | moderate（5） | 只记录，不自动修复 |
| source-map-js、vite | high（2） | 只记录，不自动升级 |
| proxy-addr | critical（1） | 只记录，部署前另行评估及受控处理 |

没有执行 npm audit fix / --force，也未升级 npm、Vue、Vite、ECharts 或 Express。安装和构建通过不代表依赖安全问题已解决。

## 6. 分工与未完成事项

A（Codex，整合维护者）：1 驾驶舱、2 专家知识库、3 AI智能体、8 工单处理。B（字节 AI 开发工具）：4 AI随手拍、5 AI节能智能分析、6 设备健康、7 设备预测性维护。比例按用户冻结口径为 B 57.7% / A 42.3%。6/7 共页由 B 统一维护，同模块两端归同一负责人。公共文件由 A 协调，变更单独列影响与验证，任何 Agent 不擅自跨负责人模块。

未完成：默认 5173 环境复验、负责人逐页业务/视觉签收、历史 Key 撤销/轮换确认、业务资料纳入目标仓库的授权确认。公网访问控制、代理鉴权/限流和依赖处置须在另行授权的部署准备阶段完成。无微信小程序工程/构建/真机验收，无真实后端、IoT、AI、数据库或跨端工单联调；这些均未被当成本阶段已交付能力。

## 7. Git 准备与负责人后续建议

本地仓库仅执行 git init -b main；无提交、无标签、无 remote、无暂存文件。没有历史提交/分支/工作区修改被删除。忽略规则已确认不误排除 web/.env.example、源码、package/lock 或本轮文档。

初始化时核验：30 项根目录/嵌套路径忽略探针全部符合预期；Git 候选文件共 64 个（原始 web 52 + 初始化交付 12），禁止项 0、已跟踪文件 0、当时 ref 0、remote 0。Markdown 相对文件链接无缺失，候选文本常见 Key 格式命中 0；初始化验证结束时 15173 与 3000 端口均已无服务监听。当前 Git 引用状态另见下方收尾复核，不把旧快照当作持续不变的状态。

**可进入首次提交候选审核，尚未获得实际提交或正式基线冻结授权。** 请先审阅候选文件、敏感资料与轮换确认、人工验收及默认端口问题；首次提交与阶段签收/标签冻结应分别决定，不能用 commit/tag 代替验收。

以下仅为负责人审核后自行执行或明确授权后的建议，本轮未执行：

```powershell
Set-Location D:\git\ezhiwei-prototype
git status --short --branch
git ls-files --others --exclude-standard
git check-ignore -v --no-index web/.env web/node_modules/ web/dist/ .local-inputs/
# 负责人确认文件范围和敏感资料后，才执行暂存与提交：
git add -- .gitignore README.md AGENTS.md web miniapp/README.md contracts/README.md docs
git diff --cached --name-only
git diff --cached --check
git commit -m "chore: initialize E智维 prototype baseline"
```

阶段门禁确认、签收并另行批准冻结后，才建议：

```powershell
git tag -a v0.1-business-demo -m "E智维 business demo baseline"
```

不提供或执行自动创建远程、修改 remote、push 或部署命令。

## 8. 本轮收尾复核与首次本地提交检查（2026-10-21）

### 文档与执行证据

PLAN 的原始范围、ACCEPTANCE 的实际状态、RESULT 的安装/构建及九路由记录，与本聊天已执行结果和落盘证据一致。npm 安装、构建及 audit 的完整原始 stdout 未另存为仓库日志，当前依据为此前工具执行记录及本文摘要；本轮未重新运行这些命令，不制造新运行结果。现存 dist 与已安装主要版本仅作为佐证，不能替代历史构建结果。

此前用户报告默认 `npm.cmd run dev` 再次返回 `listen EACCES ::1:5173`；随后 Agent 使用临时 15173 启动成功，`http://127.0.0.1:15173/login` 和 `http://localhost:15173/login` 均为 HTTP 200，测试服务已停止，Vite/package/lock 均未修改。这是启动及 HTTP 补证，不是重新完成九路由或负责人验收。

环境例外建议 EX-ENV-5173：只在当前 Windows 本地开发使用已验证的 `127.0.0.1:15173`，保留默认配置、默认端口失败记录及后续复验安排。**审批 PENDING，未批准；验收 13 仍为 FAIL（环境）**。不擅改系统端口保留、防火墙或安全设置，不把 15173 的通过写成 5173 通过。

### 证据文件与敏感内容

- 本轮目视检查唯一浏览器截图。未见 Key、口令、联系方式或患者信息；有院区运维布局、告警位置、业务数值与单字演示头像。这些属于既有原型内容，资料纳入本地 Git 需负责人确认，不能由技术扫描认定授权完成。
- 截图实际为 1280×720 JPEG，初始误存为 `.png`；仅更名为 `PC-DASHBOARD.jpg` 并同步引用，图像字节未变。SHA-256 为 `4869813137ad647baaef36f727aad414906c6172e0c3312df77184fda419f382`。仅含 JFIF 元数据，未发现 EXIF、GPS、XMP 或注释段。
- docs 内 Markdown/JSON 未检出常见凭据、手机号、邮箱、身份证号格式；浏览器 JSON 不含账号口令，仅本机 URL、路由、检查结果和截图引用。WEB-SHA256 清单不含文件内容，但头像路径含专家姓名，仍受资料授权边界约束。
- 全部候选文本的凭据复核仅发现 `web/src/composables/useAuth.js:9` 的原固定演示口令，未输出其值，未改源码；未发现真实服务 Key 或私钥。当前仅存在占位符 `.env.example`。文本扫描不构成对全部资源的绝对无敏感保证。

### 当前源码、Git 与待确认状态

- 原始 web 仍为 **52/52 SHA-256 一致**，缺失 0、变化 0、新增业务源码 0；已安装主要版本与锁文件匹配。本轮只改 PLAN、ACCEPTANCE、RESULT、浏览器证据 JSON 和截图文件后缀。
- 忽略规则 30 项根目录/嵌套路径探针通过；候选范围仍为 **64 个文件**（原始 web 52 + 初始化文档/证据 12）。无真实环境文件、原始资料、依赖、构建产物或工具本地状态进入候选。
- 当前 `main` 的 HEAD 尚不可解析，没有用户分支首次提交；index 为空，无标签、无 remote。存在 Codex 自动生成的内部 `refs/codex/*`，已保留，不视作用户首次版本，也不删除、重置或改写。
- 历史 Key 轮换、负责人业务视觉验收、资料授权均维持 **PENDING**；npm audit 的 **5 中危、2 高危、1 严重**仍为待处理风险，未升级、修复或声称关闭。
- 本轮用户要求先展示完整文件清单再确认提交。因此当前只输出 64 文件候选，**尚未暂存或提交，正在等待负责人确认**。确认本地提交也不自动变更整体 Stage、环境例外或资料对外使用授权的状态。

### Stage 02 准入建议

由负责人先确认 Stage 02 的目标、允许文件、模块归属及验收方式；不得仅凭本地 commit 自动进入业务开发。建议以确认后的首次本地提交作为可追溯基线，并明确 5173 环境例外、业务视觉验收、资料使用与历史 Key 的处理责任及放行范围。若后续仅限本地、无真实 AI 的受控开发，未关闭项须在 Stage 02 计划中单列并由负责人决定是否准入；凡涉及真实 AI、外部共享或公网部署，必须先完成相应密钥、资料授权、访问控制、代理鉴权/限流及依赖风险处置。当前 **Stage 00+01 仍为 PENDING，Stage 02 未自动放行**。
