# Prompt Brief Builder

Windows 桌面端 AI 需求描述优化器。它会先让 AI 追问关键缺口，再把原始想法、补充回答、范围、交付物和验收标准整理成可直接交给 Codex、Cursor、Claude Code、ChatGPT 等 Agent 的 Markdown Brief。

## 当前定位

本项目主入口已经从 GitHub Pages 纯前端工具转为 Electron 桌面端 App。

这样做的原因很直接：很多 OpenAI-compatible 服务商不允许浏览器跨域直连，纯 Web 版容易遇到 CORS 或 `Failed to fetch`。桌面端把模型请求放到 Electron 主进程中处理，普通用户填写自己的 `Base URL`、`API Key` 和 `Model` 后更容易直接可用。

## 功能

- 阶段式桌面工作台：连接模型、输入需求、澄清问题、生成 Brief、回看历史。
- OpenAI-compatible Chat Completions 协议。
- 服务商预设：OpenAI、DeepSeek、OpenRouter、DashScope/通义、Moonshot/Kimi、自定义。
- API Key 默认不保存；用户主动点击后才用 Electron `safeStorage` 加密保存到本机。
- 本地历史会话：保存原始需求、澄清问题、回答、最终 Prompt、优化说明和诊断信息。
- 请求诊断：展示 endpoint、状态码、耗时、服务商识别、响应预览和修复建议。
- 复制最终 Prompt、复制诊断、导出历史 Markdown。

## 本地开发

安装依赖：

```bash
npm install
```

启动桌面端开发模式：

```bash
npm run dev:desktop
```

只启动 Vite Web 预览：

```bash
npm run dev
```

注意：当前主要功能依赖 Electron 主进程。单独打开 Web 预览时，页面会提示请使用桌面端启动。

## 构建与打包

构建 renderer 和 Electron 主进程：

```bash
npm run build
```

生成 Windows NSIS 安装包：

```bash
npm run dist:win
```

完整检查：

```bash
npm run check
```

## API 怎么填

本项目使用 OpenAI-compatible Chat Completions 协议：

```text
POST {Base URL}/chat/completions
Authorization: Bearer {API Key}
```

常见示例：

```text
Base URL: https://api.openai.com/v1
Model: gpt-4o-mini
```

如果你使用第三方中转、模型网关或本地代理，请选择“自定义”，再填写它提供的 OpenAI-compatible `Base URL` 和模型名。

## 隐私与本地数据

- API Key 默认只存在当前会话输入框中。
- 点击“安全保存 Key”后，桌面端会通过 Electron `safeStorage` 加密保存。
- 界面不会回显已保存 API Key 明文。
- 非敏感配置会保存为本地 JSON，包括 `Base URL`、`Model`、`Temperature` 和服务商预设。
- 历史会话保存到 Electron 的 `userData` 目录，不上传云端。
- 当前版本没有账号系统、云同步、数据库服务或自动更新。

## 技术栈

- Electron
- Vite
- React
- TypeScript
- Tailwind CSS
- Vitest
- electron-builder

## 相关文档

历史 Web 版规划见 [PROJECT_PLAN.md](./PROJECT_PLAN.md)。桌面端后续应以当前 README 和源码结构为准。
