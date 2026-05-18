import type {
  ClarifyingAnswer,
  ClarifyingQuestion,
} from "../types/app.js";
import type { HistorySession } from "../types/desktop.js";

export function createHistoryMarkdown(session: HistorySession) {
  const answers = session.questions
    .map((question: ClarifyingQuestion, index: number) => {
      const answer = session.answers.find(
        (item: ClarifyingAnswer) => item.questionId === question.id,
      );
      const value = answer?.skipped ? "已跳过" : answer?.answer.trim() || "未填写";
      return `### Q${index + 1}. ${question.question}\n\n${value}`;
    })
    .join("\n\n");

  const brainstorm = session.brainstormMessages?.length
    ? session.brainstormMessages
        .map((message, index) => {
          const role = message.role === "assistant" ? "AI" : "用户";
          return `${index + 1}. ${role}：${message.content}`;
        })
        .join("\n\n")
    : "";
  const confirmedRequirements = session.brainstormConfirmedRequirements?.length
    ? session.brainstormConfirmedRequirements
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n\n")
    : "";

  return `# ${session.title}\n\n## 模式\n\n${formatMode(session.mode ?? session.result.mode)}\n\n## 原始需求\n\n${session.requirementInput.rawRequirement || "无"}\n\n## 澄清回答\n\n${answers || "无"}\n\n## 已确认需求\n\n${confirmedRequirements || "无"}\n\n## 头脑风暴摘要\n\n${session.brainstormSummaryMarkdown || "无"}\n\n## 头脑风暴记录\n\n${brainstorm || "无"}\n\n## 最终 Prompt\n\n${session.result.finalPromptMarkdown || "无"}\n\n## 优化说明 / 备注\n\n${session.result.improvementNotesMarkdown || "无"}\n`;
}

function formatMode(mode: HistorySession["mode"] | undefined) {
  if (mode === "format-optimization") return "格式优化";
  if (mode === "brainstorming") return "头脑风暴";
  return "旧版 Brief 流程";
}
