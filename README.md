# Prompt Brief Builder

Prompt Brief Builder 是一个 Windows 桌面端 AI 需求描述优化器。它可以把零散、口语化、还没想清楚的需求，整理成更适合交给 Codex、Claude Code、Cursor、ChatGPT 等 AI Agent 执行的 Prompt 或任务书。

当前版本基于 Electron 构建，主要面向 Windows 桌面环境，使用 OpenAI-compatible 接口与模型服务通信。

## 下载与安装

请前往 GitHub Releases 下载最新版 Windows 安装包：

https://github.com/wty-bot/prompt-brief-builder/releases

下载 Assets 中的 `.exe` 文件，双击安装即可。安装完成后，可以从开始菜单或桌面快捷方式启动。

## 功能特性

- Windows 桌面端应用，模型请求由 Electron 主进程发起。
- 支持 OpenAI-compatible Chat Completions 协议。
- 支持 OpenAI、DeepSeek、OpenRouter、DashScope/通义、Moonshot/Kimi 和自定义服务商。
- 两种需求优化模式：
  - 格式优化模式：将已有表达整理成轻量 Prompt。
  - 头脑风暴模式：像 AI Chat 一样逐轮澄清，每轮只确认一条需求。
- 头脑风暴确认项使用 `【维度】需求内容总结` 格式，便于后续收束。
- 支持流式生成、取消、重试和请求诊断。
- 本地历史会话保存，可回看、复制和导出 Markdown。
- API Key 默认不保存；用户主动点击后才会通过 Electron `safeStorage` 加密保存到本机。

## 快速开始

安装并启动应用后，按以下步骤使用：

1. 在“连接模型”中选择服务商，填写 `Base URL`、`API Key` 和 `Model`。
2. 点击“测试连接”，确认模型配置可用。
3. 选择“格式优化”或“头脑风暴”模式。
4. 输入原始想法或需求文本。
5. 等待 AI 生成可复制的 Prompt 或任务书。

常见 OpenAI-compatible 配置示例：

```text
Base URL: https://api.openai.com/v1
Model: gpt-4o-mini
```

第三方中转、模型网关或本地代理也可以使用。应用会优先尝试 Chat Completions 路径，并在路径不兼容时尝试 Responses API 路径。

## 隐私与本地数据

- API Key 默认只保存在当前输入框中，不会自动写入磁盘。
- 点击“安全保存 Key”后，API Key 会用 Electron `safeStorage` 加密保存在本机。
- 界面不会回显已保存 API Key 明文。
- 本地配置保存 `Base URL`、`Model`、温度预设和服务商预设等非敏感信息。
- 历史会话保存在 Electron `userData` 目录。
- 当前版本没有账号系统、云同步、远程数据库或自动上传行为。

## 开发环境

要求：

- Windows 10/11
- Node.js 22 或更高版本
- npm

安装依赖：

```bash
npm install
```

启动桌面端开发环境：

```bash
npm run dev:desktop
```

只启动 Vite 预览：

```bash
npm run dev
```

注意：主要功能依赖 Electron 主进程。单独打开 Web 预览时，页面会提示使用桌面端启动。

## 构建与验证

完整检查：

```bash
npm run check
```

构建 renderer 和 Electron 主进程：

```bash
npm run build
```

生成 Windows NSIS 安装包：

```bash
npm run dist:win
```

安装包会输出到 `release/` 目录。

## 发布流程

项目使用 GitHub Actions 自动发布 Windows 安装包：

1. 合并代码到 `main`。
2. 创建并推送形如 `v1.0.1` 的 tag。
3. `.github/workflows/release-desktop.yml` 会在 Windows runner 上构建安装包。
4. 构建完成后，GitHub Release 会自动附带 `.exe` 安装包。

## 技术栈

- Electron
- Vite
- React
- TypeScript
- Tailwind CSS
- Vitest
- electron-builder

## 项目结构

```text
electron/                 Electron 主进程与 preload
src/                      React renderer 源码
src/components/           UI 组件
src/lib/                  客户端调用、提示词和解析逻辑
src/shared/               前后端共享工具
src/types/                类型定义
docs/                     产品和设计文档
scripts/                  本地开发脚本
.github/workflows/        CI 与 Release 自动化
```

## 文档

- [产品模式说明](./docs/product-modes.md)
- [更新日志](./CHANGELOG.md)
- [本次发行说明](./RELEASE_NOTES.md)

## 许可证

本项目使用 MIT License。详见 [LICENSE](./LICENSE)。
