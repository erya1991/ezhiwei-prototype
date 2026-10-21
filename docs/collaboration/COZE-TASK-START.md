# E智维｜扣子编程任务启动入口（负责人 B）

> **这是人工复制到扣子编程对话中的任务模板，不是扣子自动识别的规则配置文件。**
> 放置位置：`docs/collaboration/COZE-TASK-START.md`。本项目正式规则以根 `AGENTS.md` 和其引用的仓库规范为准。

仅当委托人明确指派负责人 B 及允许模块后使用，模板不自行授予角色。当前规范位置已提供 V1.2 修订候选，尚待双方确认冻结。个人/私有 GitHub 上传、扣子云端导入、腾讯云发布分别需要授权，本地提交另需授权；本模板不构成任何云端导入或部署许可。先完成脱敏及图片/专家资料授权审查，再由 B 核验实际扣子产品形态。实际导出的压缩格式（是否 ZIP）也须核实。

## 第一次导入项目：只读核验提示词

```text
你正在接收已有的“E智维”Vue3 前端原型项目，而不是从零新建应用。角色=B（模块4 AI随手拍、5 AI节能智能分析、6 设备健康、7 设备预测性维护）。
请以实际导入后的项目根目录为基础，先只读核验，不开始功能修改；不要自动部署、公开分享、配置数据库或引入新服务。禁止通过内置 Git Push 写入 GitHub main。

实际打开并阅读：
1. AGENTS.md
2. docs/collaboration/FRONTEND-COOPERATION.md（版本应为 V1.2）
3. docs/collaboration/OWNERSHIP.md
4. docs/collaboration/UI-COMPONENT-GUIDE.md

核实工程拥有 web/package.json、web/src/main.js、web/src/styles/theme.css、Vue3/Vite/Element Plus 基线。项目根目录不是 web/，执行 npm 命令前须进入 web/。不得自动生成另一套 React/HTML/iframe 工程。

先报告：四份文件实际读取情况；角色与修改边界；Git 当前状态和导入所处模式；有无自动生成或更改 AGENTS、package、入口、路由、主题；是否可在 web/ 执行 npm ci、npm run build；是否有同步仓库 main 的潜在风险。对无法验证的事项写 PENDING，不能猜测。
不提交远程代码，不执行功能开发。
```

## 日常 B 模块修改：复制后填写具体任务

```text
本次在已有 E智维原型上增量开发，角色=B。
本次模块：【填写 4/5/6/7 其中一个完整业务模块】
本次功能：【填写明确的页面/交互要求】
本轮允许修改仓库相对路径：【逐项列出，如 web/src/views/SnapshotView.vue】
禁止修改：负责人 A 模块、AGENTS.md、公共路由/导航、全局主题、依赖、contracts、部署配置；若需要，请给 A 一个公共变更请求。

请实际重新读取仓库根 AGENTS.md 及其引用的 FRONTEND-COOPERATION.md（V1.2）、OWNERSHIP.md、UI-COMPONENT-GUIDE.md，再说明本次执行边界。

保持现有 Vue3 + Vite + JavaScript + Element Plus 2.14.7 + Vue Router + ECharts 技术栈。仅在本轮明确允许的路径增量修改，可包含显式获准的本模块私有组件和 Mock；不重做系统、不新建 HTML/iframe，不自建第二套 UI 组件、不改变统一蓝白主题、不删除未要求修改的字段与交互。Mock 演示操作必须有可见结果，不以 Toast 假装跨模块真实联动。未来小程序独立使用 uni-app + Vue3 + TypeScript，不使用 Element Plus。

完成后列出全部改动文件，说明公共集成需求，在 web/ 执行可用的构建和关键页面交互核验，展示变更 Diff 并标记失败或待验证项。

扣子内部可能自动存储版本或提交，这是其平台行为；但你不得使用内置 Git Push 向共同 GitHub main 写入，不得远程部署或公开分享。

交付时提供项目代码下载压缩包（约定 ZIP，实际格式由 B 核验；无法导出则明确说明），由我在 Mac 本地 feat/b-* 分支仅选择本模块文件，审查后按授权提交 PR。不得让压缩包直接覆盖 Git 仓库。
```

## Mac 本地回传核验（由 B 人工执行，不交给扣子代为操作）

1. 前提是 A 已获批完成首次基线及远程仓库，且 B 已获公司对 GitHub/扣子分别授权；当前项目尚无首次提交及 remote，不执行后续步骤。条件具备后克隆统一私有仓库，以确认的最新 `origin/main` 建立 `feat/b-<module>`，不在 main 开发。
2. 从扣子下载代码 ZIP，并在仓库**外部**解压。识别新增及修改文件，不覆盖整个仓库。
3. 逐项确认仅含 B 模块的 Vue 页面、私有组件与 Mock；若包含 `AGENTS.md`、路由、package/lockfile、主题等公共改动，默认拒绝回传并提交给 A 评估。
4. 在本地 `web/` 执行 `npm ci` 与 `npm run build`，检查浏览器页面及样式。
5. `git diff --name-only`、`git diff --check`、检查敏感文件，再仅暂存获准文件；根据团队授权 push **B 的功能分支**并发 PR，等待 A 审核。

跨平台检查：共享任务使用仓库相对路径 `/`；继续使用 npm 和既有 lockfile；文本采用 LF，import 大小写与文件一致；不带回 node_modules/dist/.env/.DS_Store，不进行全库换行重写。Mac 与扣子环境的安装、构建、页面、四份规范实际读取和导出结果各自提供证据，Windows 历史通过记录不能替代。

> 注意：扣子 Git 服务界面与内部 Worktree、终端 Git 的能力不同。**无条件禁止 B 通过内置 Git Push 写共同仓库 main**。只有在获授权的无敏感测试仓库验证终端可安全推送独立远程功能分支后，才可提出调整 ZIP 交付流程；测试不构成对正式 main 的写入许可。

官方参考：
- https://docs.coze.cn/guides_release_note
- https://docs.coze.cn/guides_import_from_github
- https://docs.coze.cn/guides_using_git_services
- https://docs.coze.cn/vibe-coding-multi-branch
- https://docs.coze.cn/guides_vibe_coding_environment
