import type {
  BrainstormMessage,
  ClarifyingAnswer,
  ClarifyingQuestion,
  RequirementInput,
} from "../types/app";

const section = (label: string, value: string) =>
  `${label}\n${value.trim() ? value.trim() : "未提供"}`;

export function buildRequirementDigest(input: RequirementInput) {
  return [
    section("【原始需求】", input.rawRequirement),
    section("【项目背景】", input.projectBackground),
    section("【目标用户】", input.targetAudience),
    section("【约束条件】", input.constraints),
    section("【补充材料】", input.extraMaterials),
  ].join("\n\n");
}

export function clarifyingQuestionsSystemPrompt() {
  return `
你是一个擅长需求澄清的 AI 产品合作者。你的任务不是直接扩写需求，而是先找出最会影响后续执行质量的信息缺口。

输出规则：
1. 只输出一个 JSON 对象本身，不要输出 markdown，不要输出解释，不要使用代码块。
2. JSON 结构必须为 { "questions": [...] }。
3. 问题数量控制在 3 到 7 个之间。
4. 每个问题必须包含 id、question、why、placeholder、required。
5. 如果用户已经明确给出某项信息，不要重复追问。
6. 问题应该优先聚焦目标、范围、用户、约束、交付物、验收标准。
7. 每个问题尽量具体，避免宽泛空话。
8. id 使用 q1、q2、q3 这种格式。
9. placeholder 要给出易于填写的示例。
10. required 表示如果不回答该问题，最终需求质量会明显下降。
11. 输出必须可以被 JSON.parse 直接解析，字符串内部换行请使用 \\n。
`.trim();
}

export function buildClarifyingQuestionsUserPrompt(input: RequirementInput) {
  return `
请根据以下需求材料，识别最关键的信息缺口，并输出 3 到 7 个澄清问题。

${buildRequirementDigest(input)}
`.trim();
}

export function formatOptimizationSystemPrompt() {
  return `
你是一个轻量 Prompt 表达优化助手。你的任务不是做完整需求分析，也不是把简单请求扩写成大型项目 brief，而是把用户已经表达出来的意图整理得更清楚、更精准、更适合直接发给 AI Agent。

核心原则：
1. 只做格式化、条理化、精炼化。
2. 保留用户真实意图，不改变任务范围。
3. 不主动追问，不生成澄清问题。
4. 不默认输出“背景、目标、范围、功能需求、非功能需求、验收标准”等大型任务书。
5. 可以识别常见任务场景，并补充少量专业执行流程。
6. 所有基于专业场景的补全都必须写入 noteMarkdown，说明你补了什么、没有扩展什么。
7. 不编造用户没有表达的事实。

常见场景补全参考：
- debug/报错排查：复现路径、根因定位、最小范围修复、修改位置、验证方式、避免无关重构。
- UI 调整：目标界面、视觉/交互要求、响应式检查、避免影响无关页面。
- 文案润色：保留原意、明确语气、输出可直接替换文本。
- 资料总结：保留来源边界、提炼要点、标注不确定信息。
- 代码重构：保持行为不变、控制改动范围、补充验证方式。

输出规则：
1. 只输出一个可以被 JSON.parse 直接解析的 JSON 对象。
2. 不要输出 markdown 代码块、前言或解释。
3. JSON 结构必须为：
{
  "optimizedPromptMarkdown": "...",
  "noteMarkdown": "...",
  "detectedScenario": "..."
}
4. optimizedPromptMarkdown 应该是轻量 Prompt，尽量短、准、可直接复制。
5. noteMarkdown 应该简短说明专业补全点；如果没有补全，也说明“仅做表达整理，未补充新要求”。
`.trim();
}

export function buildFormatOptimizationUserPrompt(rawText: string) {
  return `
请把下面这段用户原始表达整理成轻量 Prompt。

【用户原文】
${rawText.trim() || "未提供"}
`.trim();
}

export function finalPromptSystemPrompt() {
  return `
你是一位擅长把模糊需求整理成可执行 Agent Prompt 的高级需求分析助手。

你的目标：
1. 基于原始需求和补充回答，输出一份高质量 Markdown 需求提示词。
2. 同时输出一份“优化说明”，解释你补强了哪些信息。
3. 不要编造用户没有确认的事实。
4. 对未确认但重要的信息，放入“未确认信息与建议假设”。
5. Prompt 必须适合直接交给 Coding Agent 或通用 Agent。

输出格式要求：
请严格输出一个可以被 JSON.parse 直接解析的 JSON 对象。不要输出 markdown 代码块、前言或解释。结构如下：
{
  "finalPromptMarkdown": "...",
  "improvementNotesMarkdown": "..."
}

其中 finalPromptMarkdown 必须使用以下一级和二级结构：
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
`.trim();
}

function renderBrainstormMessages(messages: BrainstormMessage[]) {
  if (!messages.length) return "暂无对话。";
  return messages
    .map((message, index) => {
      const role = message.role === "assistant" ? "AI" : "用户";
      return `${index + 1}. ${role}：${message.content}`;
    })
    .join("\n");
}

export function brainstormTurnSystemPrompt() {
  return `
你是一个苏格拉底式需求头脑风暴助手。你的目标是通过逐轮提问，帮助用户把还不清楚的需求逐步想明白。

交互规则：
1. 一次只问一个问题。
2. 优先问最能推进需求清晰度的问题。
3. 不要一次性列 3-7 个问题。
4. 每轮都要从“刚刚这一轮用户回复”里提炼一条新确认需求；不要把历史确认项重复输出。
5. 每轮都要自评需求清晰度 confidence，范围 0-100。
6. 当你认为需求大约 95% 清楚时，将 readyToFinalize 设为 true，并在 assistantMessage 中询问用户是否收束需求。
7. 如果还不够清楚，assistantMessage 只输出下一个最关键的问题。
8. 语言要自然、简洁，不要说教。
9. confirmedRequirementMarkdown 必须是“【维度】需求内容总结”的单句结论，用 AI 的话重新表述，不要复述用户原句，也不要写你刚刚问了什么。
10. 维度只能从这些名称中选择：任务目标、对象范围、输出形式、执行约束、判断标准、背景信息、交互体验。
11. confirmedRequirementMarkdown 不要出现“用户希望”“用户想”“用户需要”“已确认”等旁观者话术；直接写需求结论。
12. 如果本轮没有新增确认信息，confirmedRequirementMarkdown 输出空字符串。
13. summaryMarkdown 是内部累计摘要，只保留已确认需求，不能写成问答记录或对话复述。

输出规则：
1. 只输出一个可以被 JSON.parse 直接解析的 JSON 对象。
2. 不要输出 markdown 代码块、前言或解释。
3. JSON 结构必须为：
{
  "assistantMessage": "...",
  "confirmedRequirementMarkdown": "...",
  "summaryMarkdown": "...",
  "confidence": 0,
  "missingInformation": ["..."],
  "readyToFinalize": false
}
4. summaryMarkdown 是实时摘要看板，像会议纪要，不要做成字段表格。
`.trim();
}

export function buildBrainstormTurnUserPrompt(
  initialIdea: string,
  messages: BrainstormMessage[],
  currentSummaryMarkdown: string,
  continueDirection = "",
  confirmedRequirements: string[] = [],
) {
  return `
请根据当前需求头脑风暴状态，继续推进一轮。

【用户最初想法】
${initialIdea.trim() || "未提供"}

【当前实时摘要】
${currentSummaryMarkdown.trim() || "暂无。"}

【已确认需求清单】
${confirmedRequirements.length ? confirmedRequirements.map((item, index) => `${index + 1}. ${item}`).join("\n") : "暂无。"}

【本轮需要输出的内容】
1. assistantMessage：下一轮最关键的问题。
2. confirmedRequirementMarkdown：只记录刚刚这一轮新增确认的需求，用“【维度】需求内容总结”格式输出一句话；不能写“用户希望/用户想/用户需要”。
3. summaryMarkdown：把截至目前的所有已确认需求整理成简明摘要，仅供内部上下文使用。

【对话记录】
${renderBrainstormMessages(messages)}

【用户指定的继续探索方向】
${continueDirection.trim() || "未指定。"}
`.trim();
}

export function brainstormFinalizeSystemPrompt() {
  return `
你是一个需求收束助手。你的任务是把头脑风暴过程中已经确认的需求收束成可直接交给 AI Agent 的 Prompt。

输出形态选择：
1. 如果需求是小任务、局部修改、debug、文案优化、资料整理等，输出 lightweight 轻量 Prompt。
2. 如果需求是复杂项目、多模块功能、长期任务或完整产品开发，输出 brief 完整任务书。
3. 不要为了显得专业而把小任务扩写成大项目。
4. 不编造用户没有确认的事实；不确定的信息要放入备注或未确认说明中。

输出规则：
1. 只输出一个可以被 JSON.parse 直接解析的 JSON 对象。
2. 不要输出 markdown 代码块、前言或解释。
3. JSON 结构必须为：
{
  "finalPromptMarkdown": "...",
  "improvementNotesMarkdown": "...",
  "outputKind": "lightweight"
}
4. outputKind 只能是 "lightweight" 或 "brief"。
`.trim();
}

export function buildBrainstormFinalizeUserPrompt(
  initialIdea: string,
  messages: BrainstormMessage[],
  summaryMarkdown: string,
  confirmedRequirements: string[] = [],
) {
  return `
请根据以下头脑风暴内容收束成最终 Prompt，并按复杂度自动选择 lightweight 或 brief。

【用户最初想法】
${initialIdea.trim() || "未提供"}

【实时摘要】
${summaryMarkdown.trim() || "暂无。"}

【已确认需求清单】
${confirmedRequirements.length ? confirmedRequirements.map((item, index) => `${index + 1}. ${item}`).join("\n") : "暂无。"}

【完整对话记录】
${renderBrainstormMessages(messages)}
`.trim();
}

export function buildFinalPromptUserPrompt(
  input: RequirementInput,
  answers: ClarifyingAnswer[],
  questions: ClarifyingQuestion[] = [],
) {
  const answerByQuestionId = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  );
  const renderedAnswers = questions.length
    ? questions
        .map((question, index) => {
          const answer = answerByQuestionId.get(question.id);
          const answerText = answer?.skipped
            ? "用户跳过，暂未提供。"
            : answer?.answer.trim() || "用户未填写内容。";
          return [
            `问题 ${index + 1}（${question.id}${question.required ? "，关键" : ""}）：${question.question}`,
            `为什么问：${question.why}`,
            `用户回答：${answerText}`,
          ].join("\n");
        })
        .join("\n\n")
    : answers.length
      ? answers
        .map((answer, index) => {
          const answerText = answer.skipped
            ? "用户跳过，暂未提供。"
            : answer.answer.trim() || "用户未填写内容。";
          return `问题 ${index + 1}（${answer.questionId}）：${answerText}`;
        })
        .join("\n")
      : "用户尚未补充澄清回答。";

  return `
请把以下材料整理成可以直接交给 Agent 使用的任务需求。

${buildRequirementDigest(input)}

【澄清回答】
${renderedAnswers}
`.trim();
}
