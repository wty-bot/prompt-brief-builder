# Prompt Brief Builder

把模糊需求整理成可直接交给 AI Agent 执行的任务 Brief。

在线使用：

```text
https://wty-bot.github.io/prompt-brief-builder/
```

## 直接使用

1. 打开在线地址。
2. 展开“连接模型”，填写 `Base URL`、`API Key`、`Model`。
3. 点击“测试连接”。
4. 输入你的原始需求。
5. 点击“生成澄清问题”。
6. 回答或跳过 AI 提出的问题。
7. 点击“生成最终 Prompt”，复制结果给 Codex、Cursor、Claude Code、ChatGPT 等 Agent。

## API 怎么填

本项目使用 OpenAI-compatible Chat Completions 协议：

```text
POST {Base URL}/chat/completions
Authorization: Bearer {API Key}
```

常见填写方式：

```text
Base URL: https://api.openai.com/v1
Model: gpt-4o-mini
```

如果你使用第三方中转、模型网关或本地代理，请填写它提供的 OpenAI-compatible `Base URL` 和模型名。

页面会显示请求诊断信息，包括 endpoint、状态码、耗时、响应预览和修复建议。连接失败时，优先查看“请求诊断”面板。

## 隐私说明

- API Key 默认只存在当前浏览器页面内存中。
- 默认不会把 API Key 写入 `localStorage`。
- 勾选“记住非敏感配置”时，只保存 `Base URL`、`Model`、`Temperature`。
- 原始需求、回答和生成结果默认不做云端存储。

## 浏览器直连限制

本项目是纯前端应用，请求直接从浏览器发出。

如果服务商不允许浏览器跨域调用，会出现 CORS 或 `Failed to fetch`。这不是 API Key 一定错误，而是服务商可能要求通过后端代理访问。

解决方式：

- 使用支持浏览器直连的 OpenAI-compatible 服务。
- 自行加一层代理。
- 后续版本可扩展 Cloudflare Worker / Vercel 代理模式。

## 本地开发

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
```

完整检查：

```bash
npm run check
```

## 部署

项目已配置 GitHub Pages workflow。

上传到 GitHub 后，在仓库中设置：

```text
Settings -> Pages -> Source -> GitHub Actions
```

推送到 `main` 后会自动构建并部署。

## 技术栈

- Vite
- React
- TypeScript
- Tailwind CSS
- Vitest

## 相关文档

详细项目规划见 [PROJECT_PLAN.md](./PROJECT_PLAN.md)。
