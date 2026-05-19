# 更新日志

## v1.0.1 - 2026-05-19

### 修复

- 增加 Responses API 兼容，支持只提供 `/responses` 协议的 OpenAI-compatible 网关。
- 优化 Base URL 自动 fallback，路径不兼容时会尝试 `/v1` 与 `/responses`。
- 修复生成任务耗时只在模型事件返回时更新的问题，运行中会持续刷新状态。
- 为连接模型页和通用按钮补充点击反馈，减少“点了没反应”的感知。
- 更新连接失败提示，避免只提示 `/chat/completions` 导致误判。

## v1.0.0 - 2026-05-19

### 新增

- 发布 Windows 桌面端安装包，支持通过 GitHub Releases 下载 `.exe` 安装。
- 新增格式优化模式，用于将零散表达整理成轻量 Prompt。
- 新增头脑风暴模式，采用单栏 Chat 体验逐轮澄清需求。
- 头脑风暴每轮确认一条需求，并按 `【维度】需求内容总结` 格式沉淀。
- 新增流式生成、取消、重试和生成任务诊断。
- 新增本地历史会话、Markdown 导出和复制反馈。

### 优化

- 模型请求迁移到 Electron 主进程，减少浏览器 CORS 对 OpenAI-compatible 服务的影响。
- API Key 仅在用户主动操作时通过 Electron `safeStorage` 加密保存。
- 优化服务商预设、温度预设和请求诊断展示。
- 优化结果页 Markdown 可读性和复制体验。

### 仓库治理

- README 改为面向用户和开发者的中文 GitHub 项目说明。
- 新增 Windows CI 和 tag 触发的桌面端 Release workflow。
- 移除旧的 GitHub Pages 发布流程，当前主线为 Windows 桌面端。
