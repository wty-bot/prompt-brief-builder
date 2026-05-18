# Prompt Brief Builder v0.3.0 发行说明

这是 Prompt Brief Builder 的 Windows 桌面端发布版本。

## 下载

请在 GitHub Release 的 Assets 中下载 `.exe` 安装包，双击运行即可安装。安装完成后，可以从开始菜单或桌面快捷方式启动 Prompt Brief Builder。

## 主要变化

- 桌面端模型请求：通过 Electron 主进程调用 OpenAI-compatible 接口，减少浏览器 CORS 问题。
- 两种工作模式：格式优化模式和头脑风暴模式。
- 单栏 Chat 头脑风暴：逐轮澄清需求，每轮沉淀一条确认项。
- 本地历史会话：自动保存生成结果，支持回看和导出 Markdown。
- 安全保存 Key：API Key 默认不保存，主动保存时使用 Electron safeStorage 加密。
- 请求诊断：显示请求状态、耗时、服务商识别和修复建议。

## 使用前准备

你需要准备一个 OpenAI-compatible 模型服务：

```text
Base URL: https://api.openai.com/v1
Model: gpt-4o-mini
```

也可以使用 DeepSeek、OpenRouter、DashScope/通义、Moonshot/Kimi、第三方中转或本地模型网关，只要它兼容 `/chat/completions`。

## 注意事项

- 当前版本仅发布 Windows 安装包。
- 应用不内置模型服务，也不提供 API Key。
- 本地历史和已保存 Key 都保存在当前 Windows 用户环境中。
- 如果 Windows SmartScreen 提示未知发布者，请确认安装包来自本项目 GitHub Release 页面后再继续安装。
