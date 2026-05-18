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

  return `# ${session.title}\n\n## 原始需求\n\n${session.requirementInput.rawRequirement || "无"}\n\n## 澄清回答\n\n${answers || "无"}\n\n## 最终 Prompt\n\n${session.result.finalPromptMarkdown || "无"}\n\n## 优化说明\n\n${session.result.improvementNotesMarkdown || "无"}\n`;
}
