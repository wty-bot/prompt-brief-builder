# AI 需求描述优化器项目实施规划

## 1. 项目定位

本项目是一个开源 Web App，用来帮助用户把模糊、零散、不完整的需求描述，转化成可以直接交给 AI Agent 执行的高质量需求提示词。

核心价值不是简单改写文案，而是完成三件事：

1. 识别原始需求中缺失、矛盾或含糊的信息。
2. 通过 AI 生成关键澄清问题，引导用户补齐上下文。
3. 汇总原始需求与补充回答，输出结构化、可执行、可验收的 Agent Prompt。

首版只做浏览器端 Web App，不做账号系统、数据库、CLI、后端代理或云同步。

## 2. 目标用户与使用场景

### 2.1 目标用户

- 不知道如何向 AI Agent 描述需求的普通用户。
- 使用 Cursor、Codex、Claude Code、ChatGPT、Coze、Dify 等工具的开发者或产品人员。
- 希望把想法快速整理成开发任务、写作任务、自动化任务或研究任务的人。

### 2.2 典型场景

- 用户只有一句模糊描述，例如“帮我做一个自动化工具”，不知道如何拆解。
- 用户有较多背景材料，但表达混乱，希望 AI 帮忙提炼。
- 用户要把需求交给 Coding Agent，希望生成包含范围、约束、验收标准的提示词。
- 用户希望在提交给 Agent 前先被追问关键问题，避免 Agent 误解。

## 3. MVP 范围

### 3.1 必须实现

- 单页 Web 工作台。
- 中文默认界面。
- 用户手动输入 `API Key`、`Base URL`、`Model`。
- 浏览器端直连 OpenAI-compatible Chat Completions API。
- API Key 默认只保存在内存，不自动写入本地存储。
- 可选“记住配置到本地浏览器”开关，默认关闭。
- 原始需求输入表单。
- 连接测试按钮。
- 生成澄清问题。
- 用户逐项填写澄清回答，也允许跳过。
- 基于原始需求和澄清回答生成最终 Markdown Prompt。
- 展示优化说明。
- 展示原始需求与优化后 Prompt 对比。
- 一键复制最终 Markdown。
- 清晰的加载态、错误态、空状态。
- 移动端可用。

### 3.2 暂不实现

- 用户登录。
- 服务端 API Key 托管。
- 数据库。
- 多用户协作。
- Prompt 市场。
- CLI。
- 浏览器插件。
- 付费、计量、额度系统。
- 后端代理。
- 多语言切换。

## 4. 推荐技术栈

### 4.1 前端

- 构建工具：Vite。
- 框架：React。
- 语言：TypeScript。
- 样式：Tailwind CSS。
- 图标：Lucide React。
- Markdown 渲染：`react-markdown`。
- 代码高亮：首版可不接入，后续如需要再加 `rehype-highlight`。

### 4.2 API 协议

首版使用 OpenAI Chat Completions 兼容协议：

```text
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}
Content-Type: application/json
```

请求体：

```json
{
  "model": "用户输入的模型名",
  "messages": [
    { "role": "system", "content": "系统提示词" },
    { "role": "user", "content": "用户输入" }
  ],
  "temperature": 0.4
}
```

### 4.3 部署

- 首选：GitHub Pages。
- 构建产物：`dist/`。
- 后续可选：Vercel、Netlify、Cloudflare Pages。

## 5. 信息架构与页面布局

### 5.1 页面结构

页面采用单页工作台，不做复杂路由。

桌面端布局：

- 顶部：产品名称、简短说明、安全提示、GitHub 链接占位。
- 左栏：需求输入与模型配置。
- 右栏：澄清问题、最终 Prompt、复制操作。
- 底部：CORS 说明、隐私说明、开源说明。

移动端布局：

- 纵向步骤流。
- 配置、输入、澄清、结果依次展开。
- 避免固定双栏导致横向滚动。

### 5.2 视觉方向

风格关键词：清爽、可信、工具型、温暖纸张感、有一点编辑器气质。

设计约束：

- 不使用默认紫色 AI 模板。
- 背景使用暖纸色，例如 `#F7F1E5` 或接近色。
- 正文使用墨黑，例如 `#1F2520`。
- 主强调色使用青绿色，例如 `#0F766E`。
- 次强调色使用琥珀色，例如 `#D97706`。
- 卡片使用轻微边框与柔和阴影，不堆叠过多玻璃拟态。
- 字体默认可使用系统字体；如果引入 Web Font，优先选择可读性强的中文字体方案。

### 5.3 可访问性要求

- 所有输入框必须有可见 label。
- 所有按钮必须有明确文本，不只使用图标。
- 主要操作按钮在禁用时要显示原因或上下文提示。
- 错误信息必须靠近对应操作区域。
- 交互元素触控区域不小于 44px。
- 支持键盘 Tab 顺序。
- 颜色对比度满足常规文本 4.5:1。

## 6. 功能模块

### 6.1 模型配置模块

字段：

- `baseUrl`：默认可填 `https://api.openai.com/v1`。
- `apiKey`：密码输入框。
- `model`：默认可填 `gpt-4o-mini` 或留给用户修改。
- `temperature`：默认 `0.4`，范围 `0-1`。
- `rememberConfig`：是否记住配置到本地浏览器，默认 `false`。

行为：

- 点击“测试连接”后，向 `{baseUrl}/chat/completions` 发起一次极短请求。
- 测试成功显示模型可用。
- 测试失败显示具体错误：认证失败、404、网络错误、CORS 可能阻止、响应格式不兼容。
- `rememberConfig=false` 时，刷新页面后不恢复 API Key。
- `rememberConfig=true` 时，可保存 `baseUrl`、`model`、`temperature`，API Key 是否保存必须有二次提示。首版建议不保存 API Key，只保存非敏感配置。

### 6.2 需求输入模块

字段：

- `rawRequirement`：原始需求，必填。
- `projectBackground`：项目背景，选填。
- `targetAudience`：目标用户，选填。
- `constraints`：约束条件，选填。
- `extraMaterials`：补充材料，选填。

校验：

- `rawRequirement` 为空时，禁止生成澄清问题。
- `rawRequirement` 少于 10 个中文字符或 20 个英文字符时，提示用户需求过短，但允许继续。
- 长文本不截断，交给模型处理；首版不做 token 估算，只给出“过长可能失败”的温和提示。

### 6.3 澄清问题模块

生成内容：

- AI 输出 3-7 个问题。
- 每个问题包含：
  - `id`
  - `question`
  - `why`
  - `placeholder`
  - `required`

展示方式：

- 以卡片列表展示。
- 用户可逐项填写。
- 每项允许“跳过”。
- 跳过的问题在最终生成时标记为“用户未提供，需由 Agent 自行合理假设或在执行前再次确认”。

失败兜底：

- 如果模型返回非 JSON，可尝试从文本中提取 JSON。
- 如果仍失败，展示原始文本并提示用户重试。
- 不应让页面崩溃。

### 6.4 最终 Prompt 模块

最终输出固定为 Markdown，结构如下：

```markdown
# Agent 任务需求

## 背景

## 目标

## 当前输入

## 范围

## 功能需求

## 非功能需求

## 约束条件

## 已确认信息

## 未确认信息与建议假设

## 交付物

## 验收标准

## 执行建议
```

同时输出“优化说明”：

- 补全了哪些背景。
- 澄清了哪些目标。
- 增加了哪些边界。
- 增加了哪些验收标准。
- 还有哪些风险需要用户确认。

### 6.5 对比与复制模块

展示：

- 左侧或上方显示原始需求。
- 右侧或下方显示优化后 Prompt。
- 在移动端使用上下排列。

操作：

- 复制最终 Prompt。
- 复制优化说明。
- 清空当前会话。
- 首版不做文件下载；后续可加导出 `.md`。

## 7. 状态模型

建议 TypeScript 类型如下：

```ts
export type ApiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  rememberConfig: boolean;
};

export type RequirementInput = {
  rawRequirement: string;
  projectBackground: string;
  targetAudience: string;
  constraints: string;
  extraMaterials: string;
};

export type ClarifyingQuestion = {
  id: string;
  question: string;
  why: string;
  placeholder: string;
  required: boolean;
};

export type ClarifyingAnswer = {
  questionId: string;
  answer: string;
  skipped: boolean;
};

export type OptimizedPromptResult = {
  finalPromptMarkdown: string;
  improvementNotesMarkdown: string;
};

export type AppPhase =
  | "idle"
  | "testingConnection"
  | "ready"
  | "generatingQuestions"
  | "answeringQuestions"
  | "generatingPrompt"
  | "completed"
  | "error";
```

## 8. 推荐代码结构

```text
src/
  App.tsx
  main.tsx
  index.css
  components/
    AppHeader.tsx
    ApiConfigPanel.tsx
    RequirementForm.tsx
    ClarifyingQuestionsPanel.tsx
    ResultPanel.tsx
    ComparisonPanel.tsx
    StatusCallout.tsx
  lib/
    openaiCompatibleClient.ts
    promptTemplates.ts
    responseParsers.ts
    storage.ts
    errors.ts
  types/
    app.ts
```

实现原则：

- API 调用逻辑集中在 `openaiCompatibleClient.ts`。
- 系统提示词集中在 `promptTemplates.ts`。
- JSON 解析和容错集中在 `responseParsers.ts`。
- 本地存储集中在 `storage.ts`。
- 组件保持展示和交互为主，不直接拼复杂 prompt。

## 9. AI 提示词设计

### 9.1 生成澄清问题的系统提示词

目标：让 AI 像产品经理和资深 Agent 协调者一样，识别需求缺口并提出最少但关键的问题。

要求：

- 只问会显著影响最终执行质量的问题。
- 避免问用户已经提供的信息。
- 问题数量 3-7 个。
- 每个问题附带为什么要问。
- 输出严格 JSON。

期望 JSON：

```json
{
  "questions": [
    {
      "id": "q1",
      "question": "这个工具的首要使用对象是谁？",
      "why": "目标用户会影响功能深度、界面复杂度和默认提示词风格。",
      "placeholder": "例如：普通用户、开发者、产品经理、学生等",
      "required": true
    }
  ]
}
```

### 9.2 生成最终 Prompt 的系统提示词

目标：把原始需求、背景材料和澄清回答整理成可执行 Agent Prompt。

要求：

- 输出 Markdown。
- 不编造用户没有确认的事实。
- 对未确认信息给出“建议假设”，并标明需要 Agent 执行前确认。
- 明确交付物和验收标准。
- 语言清晰，适合直接复制给 Coding Agent 或通用 Agent。

## 10. 错误处理

需要识别并展示：

- API Key 为空。
- Base URL 为空或格式错误。
- Model 为空。
- 认证失败：401 或 403。
- API 路径错误：404。
- 请求超时。
- 网络不可达。
- CORS 阻止。
- 模型返回格式不是预期 JSON。
- 模型返回空内容。

错误提示原则：

- 不展示过长堆栈。
- 尽量给用户下一步建议。
- CORS 场景提示：“该服务商可能不允许浏览器直接调用；可以换支持浏览器请求的服务，或等待后续代理模式。”

## 11. 本地存储策略

默认不保存敏感信息。

可保存：

- `baseUrl`
- `model`
- `temperature`
- `rememberConfig`

默认不保存：

- `apiKey`
- 原始需求
- 澄清回答
- 最终 Prompt

如果后续要保存 API Key，必须：

- 增加明确二次确认。
- 在界面上说明保存位置为浏览器 localStorage。
- 提供一键清除。

## 12. GitHub Pages 部署规划

建议配置：

- `vite.config.ts` 中根据仓库名配置 `base`。
- `package.json` 增加脚本：
  - `dev`
  - `build`
  - `preview`
  - `lint`
- 增加 GitHub Actions 工作流：
  - push 到 `main` 时构建。
  - 部署 `dist/` 到 GitHub Pages。

首版如果尚未确定仓库名，可以先在 README 中说明部署前需要设置 Vite `base`。

## 13. 测试计划

### 13.1 手动测试

- 空需求：生成按钮禁用或提示必填。
- 极短需求：显示过短提示，但允许继续。
- 中文长文本：页面不卡死，内容不丢失。
- 中英混合文本：最终 Prompt 保持语义。
- 无 API Key：测试连接和生成都阻止。
- 错误 API Key：显示认证失败。
- 错误 Base URL：显示网络或路径错误。
- 不存在模型：显示模型不可用或服务端错误。
- CORS 失败：显示浏览器直连限制说明。
- 跳过部分问题：仍可生成最终 Prompt，并标出未确认信息。
- 复制按钮：复制成功后有明确反馈。
- 移动端：无横向滚动，主要按钮可点击。

### 13.2 自动化测试建议

首版可以先不强制接入单元测试，但如果接入，优先测试：

- `responseParsers.ts` 能解析标准 JSON。
- `responseParsers.ts` 能从 Markdown code block 中提取 JSON。
- `errors.ts` 能把常见 HTTP 错误转成用户友好文案。
- `storage.ts` 不保存 API Key。

## 14. 验收标准

项目达到首版可用时，应满足：

- 用户可在浏览器中完成从需求输入到最终 Prompt 复制的完整流程。
- 不需要后端服务即可运行。
- API Key 默认不持久化。
- 所有主要错误都有用户可理解的提示。
- 最终输出为结构化 Markdown。
- UI 在桌面和移动端都可用。
- README 清楚说明安装、运行、配置 API、CORS 限制和部署方式。
- 中文文案在源码、README、页面显示中没有乱码。

## 15. README 必备内容

README 至少包含：

- 项目简介。
- 解决什么痛点。
- 功能截图占位或说明。
- 本地运行方式。
- API 配置说明。
- 隐私与安全说明。
- CORS 限制说明。
- GitHub Pages 部署说明。
- 后续路线图。

## 16. 后续路线图

### 16.1 v0.2

- 导出 Markdown 文件。
- 保存本地历史会话。
- 一键直接优化模式。
- 提供多种输出模板：Coding Agent、写作 Agent、研究 Agent、自动化 Agent。

### 16.2 v0.3

- 可选 Cloudflare Worker 代理。
- 服务商预设：OpenAI、DeepSeek、OpenRouter、硅基流动、月之暗面等。
- Prompt 模板编辑器。

### 16.3 v1.0

- 多语言界面。
- 团队共享模板。
- 浏览器插件或桌面小工具。
- 需求质量评分。

## 17. 给实现 Agent 的执行顺序

建议按以下顺序实现：

1. 初始化 Vite React TypeScript 项目。
2. 接入 Tailwind CSS。
3. 建立类型、API client、prompt 模板、解析器等基础文件。
4. 完成静态页面布局和响应式样式。
5. 实现 API 配置与连接测试。
6. 实现需求输入与澄清问题生成。
7. 实现澄清回答表单。
8. 实现最终 Prompt 生成。
9. 实现复制、对比、错误提示和清空会话。
10. 补 README。
11. 跑构建检查。
12. 如果仓库名确定，补 GitHub Pages 部署配置。

## 18. 关键实现注意事项

- 不要把 API Key 写死进代码或示例配置。
- 不要默认把 API Key 存到 localStorage。
- 不要引入后端代理，除非用户明确要求进入后续版本。
- 不要让模型返回的 JSON 解析失败导致页面崩溃。
- 不要在组件里散落系统提示词。
- 不要用只靠颜色区分状态的 UI。
- 不要让移动端出现横向滚动。
- 不要把最终 Prompt 写成泛泛建议，必须能直接交给 Agent 执行。

