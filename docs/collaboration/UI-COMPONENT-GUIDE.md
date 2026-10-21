# E智维公共 UI 使用指南

本指南说明 Stage 02 公共 UI 的使用方式。协作、模块和视觉规则以 [前端原型双人协作规范 V1.2](FRONTEND-COOPERATION.md)、[OWNERSHIP](OWNERSHIP.md) 及根 [AGENTS](../../AGENTS.md) 为准；V1.2 尚待两位负责人确认冻结。安装、构建、浏览器与负责人验收的实际结论见 [Stage 02 RESULT](../stages/02-ui-baseline/RESULT.md)，指南不代替阶段签收。

## 入口和技术

- 继续使用现有 `web/` Vue 3 + Vite + JavaScript 单页应用，新增页面使用 Vue 单文件组件、`<script setup>` 和 `<style scoped>`。Element Plus 是唯一新增业务 UI 库，ECharts 与 Vue Router 沿用现有实现。
- 本轮 Element Plus 精确锁定 `2.14.7`，其 Vue peer 范围为 `^3.3.7`，现有 Vue 为 `3.5.42`。通过 npm 与现有锁文件安装，不使用 CDN，不升级现有核心依赖。复现命令为在 `web/` 执行 `npm ci`、`npm run build`。
- `web/src/main.js` 只创建一次 Vue App，保留 Router 注册；统一全量注册 Element Plus，使用简体中文 locale，浮层起始 `zIndex` 为 `3000`。页面直接使用 `<el-button>` 等组件；需要编程反馈时从 `element-plus` 导入 `ElMessage`。全量引入的构建体积和告警以 RESULT 实测为准。
- CSS 顺序固定为 `index.css → app.css → Element Plus CSS → theme.css`。旧样式、字体、导航、背景和透明卡片保持原样，主题配置不反向覆盖旧 `--blue`、`--card-bg` 等 token。

## 主题变量

唯一主题入口为 `web/src/styles/theme.css`，在 `:root` 定义变量，使 Teleport 到 body 的弹窗、下拉和提示也可继承。业务页面只引用变量，不重复声明全站主题。

| 变量 | 用途 / 基准值 |
| --- | --- |
| `--ez-primary` / `--ez-primary-bg` | 主色 `#2173D8` / 浅背景 `#E8F1FC` |
| `--ez-success` / `--ez-warning` / `--ez-danger` / `--ez-info` | 正常与完成 / 待处理 / 异常 / 一般信息；成功 `#107C10`、警告 `#FF9500`、危险 `#D93025` |
| `--ez-text` / `--ez-text-secondary` / `--ez-text-muted` | 主文字 `#1D1D1D` / 次级 `#6B6B6B` / 辅助 `#9B9B9B` |
| `--ez-page-bg` / `--ez-card-bg` / `--ez-border` | 页面 `#FAFAFD` / 新卡片 `#FFFFFF` / 边框 `rgba(0,0,0,0.08)` |
| `--ez-page-padding` / `--ez-card-gap` | 页面内边距 `20px` / 卡片间距 `16px` |
| `--ez-space-8` / `--ez-space-12` / `--ez-space-16` / `--ez-space-24` | 控件及内容间距阶梯 |
| `--ez-font-size-body` / `--ez-font-size-title` / `--ez-font-size-card-title` / `--ez-font-size-caption` | 正文 `14px` / 页面标题 `20px` / 卡片标题 `16px` / 说明 `12px` |
| `--ez-card-radius` / `--ez-control-radius` | 新卡片 `16px` / 控件 `8px` |

主题层统一映射 Element Plus 各语义色、`light-1` 至 `light-9`、`dark-2`、文字、禁用、边框与圆角变量，覆盖 hover/active/浅色状态；模块页不再覆盖全局 `.el-*` 或使用成片 `!important`。旧卡片的半透明 `--card-bg` 与新 `--ez-card-bg` 独立，旧页面尺寸不强行迁移。

部分 Element Plus 组件会在自身元素定义局部变量，不能只依赖 `:root` 同名值。Dialog 使用 `class="ez-dialog"`，ElCard 使用 `class="ez-card"`，MessageBox 使用 `customClass: 'ez-message-box'`，由主题内项目专属类将圆角映射为 16px；不全局覆盖 `.el-*`。待处理 Tag 可用内联 `--el-tag-text-color:var(--ez-warning-text)`，warning Message 使用 `customClass: 'ez-warning-message'`，保留橙色语义和浅背景，文字使用更深颜色。

## 标准页面写法

可直接参考 `web/src/views/__dev/UiBaselineView.vue` 的实现，再复制本模块需要的局部结构。它是公共组件样例，不是正式工单模块或跨模块协议。

| 区域 | 使用方式 |
| --- | --- |
| 标题与操作 | 页面标题、简短说明，主要动作用 primary Button，次操作用普通 Button；不重复放 Header/Sidebar |
| 筛选栏 | Form + Input + Select + DatePicker，输入条件与已应用条件分开；查询更新列表并回第一页，重置清空条件和页码 |
| 表格与分页 | Table + TableColumn + Pagination，先筛选再分页，total 使用筛选结果；空结果保留空态，状态 Tag 同时显示文字 |
| 状态 | 正常/已完成用 success，待处理用 warning，异常用 danger，一般信息用 info/primary；不只依赖颜色 |
| 表单弹窗 | Dialog + Form + FormItem + Input/Select，必填项用 rules 校验；通过才更新 Mock 列表；取消和关闭不新增记录，再次打开清空草稿与旧校验 |
| 反馈与浮层 | 使用 ElMessage 显示操作结果，Tooltip 解释按钮，Dropdown 承载次要动作；提示文字明确演示范围 |

示例数据确定、仅存内存；查询、重置、分页、新增提交均只改变此页状态，刷新恢复初始数据，不读写业务 Mock、服务端或真实 AI。后续模块若需要持久化，遵守 V1.2 的模块存储前缀和独立任务授权。

页面私有布局写在本页 `<style scoped>` 或本模块私有组件，不写裸 `body/button/input/table` 全局规则；间距、字体和圆角优先引用上表变量。对 Teleport 的样式优先使用公共主题变量，确需局部调整时使用明确的专属 class；不要把浮层限制在 `overflow:auto/hidden` 的页面容器内。Dialog 保持 body 挂载，检查滚动、关闭后焦点与遮罩恢复。

## 开发预览与回归

在 `web/` 启动 Vite。默认端口若继续 EACCES，本地可按本轮允许的验证方式使用：

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 15173 --strictPort
```

先按原登录流程进入系统，再打开 [开发示例](http://127.0.0.1:15173/__ui-baseline)。此入口仅 `import.meta.env.DEV` 注册，不进入正式菜单，不绕过登录，不修改默认端口配置。15173 可用不等于 5173 已通过；Stage 00+01 的默认端口失败及例外审批保留原记录。

生产构建不注册 `/__ui-baseline`，也不包含该开发组件。History SPA 对未知路径返回 `index.html` / HTTP 200，并不表示路由存在；检查实际路由匹配、渲染内容及构建资源，不能仅以 HTTP 状态判断开发入口是否暴露。

重要公共变更需构建，并在 1366×768、1920×1080 下回归原九路由及示例：顶部/侧栏、旧卡片图表、Button/Input/Select/DatePicker、表头与分页、必填校验、提交/取消/关闭、Dialog/Message/Tooltip/Dropdown 和横向溢出。原全局 reset、body overflow 及旧浮层最高 `z-index:1000` 均保留，新浮层按公共 3000 层级验证。Agent 浏览器检查与负责人业务视觉签收分开记录。

截图先放入被忽略的 `_tmp/stage02/`，检查 Key、口令、联系方式、机构及个人资料等敏感内容；未经负责人审核，不纳入 Git 候选。

## 公共变更入口

业务模块负责人不得顺带修改入口、Router、导航、登录、`theme.css` / 全局样式、公共组件/composable、package/lock、代理、`contracts/` 或部署配置。B 先提出目标、允许文件、影响路由和验证需求，由 A 集成；A 也须单列公共影响。

只有被至少两个模块确实复用并经双方确认，才申请抽取公共组件：说明用途、输入输出和兼容范围，由 A 集成、B 参与审阅。其余内容保留在本模块内。模块完整归属、后续分支/评审和授权流程直接遵守 V1.2，不另建第二套制度；本轮不提交、打标签、推送、创建远程或部署。
