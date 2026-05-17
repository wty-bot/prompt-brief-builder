# AI 需求描述优化器

一个开源的浏览器端 Web App，用来把模糊、零散、不完整的需求描述，整理成可以直接交给 AI Agent 执行的高质量 Markdown Prompt。

它不是简单的“润色器”，而是一个先澄清、再总结的需求协作工具：

1. 用户输入原始需求和背景材料。
2. AI 识别信息缺口，生成 3 到 7 个关键澄清问题。
3. 用户补充回答或跳过。
4. AI 输出结构化的 Agent 任务需求和优化说明。

## 解决什么问题

- 很多人知道自己“想做什么”，但不知道怎么把需求说准确。
- 直接把模糊需求丢给 Agent，往往会导致误解、返工或结果很泛。
- 这个工具把 AI 放在“需求引导者”的位置，先帮用户把需求说清楚，再交给执行型 Agent。

## 功能特性

- 单页工作台，默认中文界面
- 兼容 OpenAI-compatible `/chat/completions` API
- 浏览器端直连，不依赖后端
- `API Key` 默认只保存在当前页面内存中
- 可选记住 `Base URL`、`Model`、`Temperature`
- 自动生成澄清问题
- 输出结构化 Markdown Prompt
- 输出优化说明
- 展示原始需求和优化后 Prompt 的对比
- 一键复制结果
- 适合部署到 GitHub Pages

## 技术栈

- Vite
- React
- TypeScript
- Tailwind CSS
- react-markdown
- lucide-react

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

### 4. 本地预览生产构建

```bash
npm run preview
```

## 如何使用

1. 打开页面后，填写 `Base URL`、`API Key`、`Model`。
2. 点击“测试连接”确认模型可用。
3. 输入原始需求和背景材料。
4. 点击“生成澄清问题”。
5. 回答 AI 提出的关键问题，或跳过暂时不确定的问题。
6. 点击“生成最终 Prompt”。
7. 复制最终 Markdown Prompt，交给 Cursor、Codex、Claude Code、ChatGPT 或其他 Agent。

## API 配置说明

本项目默认按 OpenAI-compatible Chat Completions 协议请求：

```text
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}
Content-Type: application/json
```

示例 `Base URL`：

- `https://api.openai.com/v1`
- 其他兼容 OpenAI 接口的服务商地址

注意：

- 不同服务商对 `Base URL` 末尾路径要求不同。
- 有些服务商支持 `response_format`，有些可能兼容性一般。
- 如果服务商不允许浏览器跨域访问，会出现 CORS 错误。

## 隐私与安全

- `API Key` 默认不会保存到 `localStorage`。
- 页面刷新后，默认不会恢复 `API Key`。
- 如果你勾选“记住非敏感配置”，只会保存：
  - `Base URL`
  - `Model`
  - `Temperature`
  - `rememberConfig`
- 原始需求、澄清回答、最终 Prompt 默认都不会持久化保存。

## CORS 限制说明

当前版本完全在浏览器中发起请求，因此依赖服务商允许前端跨域调用。

如果你遇到这类问题：

- 测试连接失败，但 Key 没问题
- 浏览器控制台出现 CORS 报错
- 某些服务商在后端能调通、前端调不通

那通常不是这个项目逻辑错了，而是服务商不允许浏览器直接访问。

解决方式：

- 更换支持浏览器请求的服务商
- 自己增加一个代理层
- 后续版本可接入 Vercel / Cloudflare Worker 代理

## GitHub Pages 部署

本项目内置了 GitHub Pages 工作流。

### 1. 创建 GitHub 仓库

把当前目录上传到一个 GitHub 仓库。

### 2. 打开 Pages

在仓库 `Settings -> Pages` 中，选择 `GitHub Actions` 作为部署来源。

### 3. 推送到 `main`

工作流会自动：

1. 使用 `npm ci` 安装锁定依赖
2. 构建项目
3. 部署 `dist/` 到 GitHub Pages

### 4. 关于 `base`

`vite.config.ts` 已根据 `GITHUB_REPOSITORY` 自动推导仓库名作为 `base`，适合大多数 GitHub Pages 场景。

如果你后续部署到自定义域名或其他平台，可以自行调整该配置。

## 验收目标

当前版本的目标是：

- 形成完整可上传的 GitHub 仓库
- 页面可本地运行
- 主流程可从输入需求走到生成最终 Prompt
- 适合直接部署到 GitHub Pages

## 后续路线图

### v0.2

- 导出 Markdown 文件
- 保存本地历史会话
- 一键直接优化模式
- 多种输出模板

### v0.3

- 可选代理模式
- 服务商预设
- Prompt 模板编辑器

### v1.0

- 多语言界面
- 团队模板共享
- 需求质量评分

## 项目说明

仓库中还包含一份更详细的实现规划文档：[PROJECT_PLAN.md](./PROJECT_PLAN.md)。
