import type { ClarifyingAnswer, RequirementInput } from "../types/app";

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
1. 只输出 JSON，不要输出 markdown，不要输出解释。
2. JSON 结构必须为 { "questions": [...] }。
3. 问题数量控制在 3 到 7 个之间。
4. 每个问题必须包含 id、question、why、placeholder、required。
5. 如果用户已经明确给出某项信息，不要重复追问。
6. 问题应该优先聚焦目标、范围、用户、约束、交付物、验收标准。
7. 每个问题尽量具体，避免宽泛空话。
8. id 使用 q1、q2、q3 这种格式。
9. placeholder 要给出易于填写的示例。
10. required 表示如果不回答该问题，最终需求质量会明显下降。
`.trim();
}

export function buildClarifyingQuestionsUserPrompt(input: RequirementInput) {
  return `
请根据以下需求材料，识别最关键的信息缺口，并输出 3 到 7 个澄清问题。

${buildRequirementDigest(input)}
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
请严格输出一个 JSON 对象，结构如下：
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

export function buildFinalPromptUserPrompt(
  input: RequirementInput,
  answers: ClarifyingAnswer[],
) {
  const renderedAnswers = answers.length
    ? answers
        .map((item, index) => {
          const answerText = item.skipped
            ? "用户跳过，暂未提供。"
            : item.answer.trim() || "用户未填写内容。";
          return `问题 ${index + 1}（${item.questionId}）：${answerText}`;
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
