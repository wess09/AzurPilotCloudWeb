# AzurPilot Cloud Web

Next.js 16 App Router / React 19 / TypeScript。公开统计使用 Cloudflare Kumo 与 Tailwind 4，设计规范见 [DESIGN.md](DESIGN.md)。管理站和公开站分别构建为静态资源，保留既有 Cloudflare Pages 项目、域名、构建命令与输出路径。

| 站点 | 域名 | Pages 项目 | 构建命令 | 输出 |
| --- | --- | --- | --- | --- |
| 公开统计 | `stats.azurpilot.com` | `azurpilot-stats` | `npm run build:stats` | `dist/stats` |
| 独立管理 | `admin.azurpilot.com` | `azurpilot-admin` | `npm run build:admin` | `dist/admin` |

两个 Pages 项目仍由 GitHub 原生关联 `wess09/AzurPilotCloudWeb` 的 `main` 分支部署，Node 22+。此次迁移无需修改线上构建输出设置。GitHub Actions 检查两个构建与浏览器用例，不手动上传生产资源。公开统计页面没有管理后台、TM 或模板管理跳转。

## 公开统计

- `/`：科研产物；`/commission/`：军事委托；`/methodology/`：统计定义与来源。
- 先选同类别、同单位的分类汇总，或搜索指定物品，如埃吉尔蓝图、天雷设计图、心智魔方。
- 按区服、日期范围、期数、类型与时长筛选；按项目、期数、类型或时长重新分组。
- 展示有效样本、命中概率、最小/最大数量、单次及每小时平均产量、额外奖励。
- 默认每小时产量降序；表头和选择器支持各项升降序，空值始终位于末尾。支持排行榜、图表、任务消耗与条件明细、CSV 导出。
- 筛选保存在 URL，支持直接打开分享链接。自定义日期按北京时间包含首尾日期，最长 366 天。

公开页面以 `credentials: omit` 调用 `GET https://api.azurpilot.com/api/v3/get/analysis`。**上线需先发布配套主服务仓库 `AzurPillotCloudServer` 的统一分析接口**，旧的逐物品汇总接口缺少分类联合命中与极值，不能替代它。服务尚未升级或不可用时，页面显示错误，不填入虚构统计。

分析接口按原始完成记录计算。零掉落计入样本；同次任务掉落多个目标物品只记一次命中；分类极值在单次任务内合并后计算；每小时产量为总产出除以样本任务总耗时，分组后重新计算。委托分组超过 50 个样本后公开。科研 BONUS、追赶/活动奖励单独列示；大成功展示其样本数及实际目标产出，不估算反事实增量。未知时长显示空值。

## 开发与验证

```powershell
npm ci
npm run dev:stats   # http://localhost:5174
npm run dev:admin   # http://localhost:5173

npm test
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

浏览器测试使用实际静态导出和生成的 CSP，覆盖桌面 1280px、手机 375px。测试响应仅存在于测试文件中，生产没有演示数据模式。

本地接入独立测试后端时，在运行开发命令的终端设置 `NEXT_PUBLIC_STATS_API_BASE=http://127.0.0.1:18096`，并让后端的 `PUBLIC_ORIGINS` 包含开发站来源。该变量是公开 API 地址，不存放令牌。生产默认使用正式 API；更换生产 API 域名时也需调整 `stats/public/_headers` 的连接来源。

`tools/build.mjs` 只清理对应的 `dist/stats` 或 `dist/admin`，随后复制 Next.js 导出资源并为实际内联水合脚本生成 SHA-256 CSP，不开放任意内联脚本。静态分块使用 `/_next/static/*` 长缓存，HTML 重新验证。详细规则参考 [Next.js 静态导出](https://nextjs.org/docs/app/guides/static-exports) 和 [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)。

## 数据目录

`src/data/catalog.json` 包含科研时长、消耗、条件、委托昼夜标识、物品分类与模板别名，并记录来源文件 SHA-256。没有样本产量或理论掉率。当前生成器收录 674 个科研项目、119 个委托条目（含昼夜版本及客户端补充标识）、179 个可识别产物。

```powershell
# 在客户端的 Python 环境中执行生成器；两个来源仓库位于同级目录。
uv run --project ../AzurLaneAutoScript python tools/generate-catalog.py `
  --client ../AzurLaneAutoScript `
  --lua ../AzurLaneLuaScripts `
  --backend ../AzurPillotCloudServer
```

生成器同时更新前端目录与主服务嵌入目录，两个仓库应一起验证和发布。Lua 使用国服快照；客户端固定来源目录补充多语言别名。发生时长歧义时要求明确客户端标识，不按物品奖励预览猜测。游戏更新后重新生成并检查差异。

## 独立管理连接

管理站保留原有 WebSocket RPC、订阅、重连、截图分块校验及登录方式：

- 主服务：`wss://api.azurpilot.com/api/v1/admin/ws`。
- 模板服务：`wss://templates-api.azurpilot.com/internal/v1/templates/ws`。
- 令牌只在首个认证帧传递，不放入 URL；管理操作不使用 HTTP 轮询。
- 断线后重连订阅，不自动重放中断的写操作。模板完整原图仅经模板服务按需读取。

管理站使用独立 Next.js 入口和 Kumo 组件。登录、侧栏、概览、公告、更新策略、维护计划、发布状态和模板管理统一使用组件库；侧栏保持挂载，页面使用 React ViewTransition 过渡。模板列表使用表格，映射及完整原图集中在详情弹窗。浏览器加载后才初始化依赖 localStorage 的管理会话。

公告编辑时实时渲染草稿，也可切换查看已发布内容。Markdown 使用 react-markdown、remark-gfm 和 Tailwind Typography；链接、表格和任务清单使用 Kumo。支持标题、列表、引用、链接、图片、代码块、表格及任务清单；忽略原始 HTML，不执行脚本。公告仍通过原有 WebSocket 方法保存 content 字符串，客户端已有 Markdown 渲染。
