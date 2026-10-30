# AzurPilot 独立前端

这是新建的独立前端仓库。管理与公开统计分别构建、分别部署到 Cloudflare Pages，由 GitHub `main` 分支推送自动触发构建和发布；不使用手动上传部署。

| 站点 | 正式域名 | Pages 项目 | 构建命令 | 输出 |
|---|---|---|---|---|
| 管理面板 | `admin.azurpilot.com` | `azurpilot-admin` | `npm run build:admin` | `dist/admin` |
| 公开统计 | `stats.azurpilot.com` | `azurpilot-stats` | `npm run build:stats` | `dist/stats` |

两个 Pages 项目都直接链接 GitHub `wess09/AzurPilotCloudWeb`，生产分支 `main`，Node 22。GitHub Actions 只做检查，不上传生产资源。

## 后端连接

- 主服务器管理：`wss://api.azurpilot.com/api/v1/admin/ws`。
- 模板管理：`wss://templates-api.azurpilot.com/internal/v1/templates/ws`，浏览器直连模板服务器。
- 公开统计：`https://api.azurpilot.com/api/v3/get/commission` 和 `/api/v3/get/research`，HTTP GET，不携带管理员凭据。
- 客户端模板上传：直连模板 API；资源从 `templates.azurpilot.com` Worker 下载。

管理员在首次 WebSocket 消息中发送 `{"type":"auth","token":"..."}`；令牌不放 URL。随后命令为 `{"id":"1","method":"state.subscribe","params":{}}`，响应使用相同 id，变化通过 `{"type":"event","topic":"state","data":...}` 推送。管理页面没有 REST 轮询。

连接断开后自动重连和重新订阅，但不会自动重放写操作；断线中的操作需根据新状态核对，避免重复发布。两端管理员令牌保持一致，因此只需登录一次。

## 开发与检查

```sh
npm ci
npm run check
npm run build
npm run dev:admin
# 另一终端按需运行 npm run dev:stats
```

本地管理联调需后端显式允许 `http://localhost:5173` 来源。仓库不保存服务令牌、Cloudflare 发布凭据或后端源码。样式不在此次验收范围内。
