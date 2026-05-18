import { describe, expect, it } from "vitest";

import { createHistoryMarkdown } from "./historyExport";
import type { HistorySession } from "../types/desktop";

describe("historyExport", () => {
  it("exports a session as markdown", () => {
    const session: HistorySession = {
      id: "s1",
      title: "做一个桌面端工具",
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:00:00.000Z",
      requirementInput: {
        rawRequirement: "做一个桌面端工具",
        projectBackground: "",
        targetAudience: "",
        constraints: "",
        extraMaterials: "",
      },
      questions: [
        {
          id: "q1",
          question: "目标用户是谁？",
          why: "影响功能范围",
          placeholder: "例如普通用户",
          required: true,
        },
      ],
      answers: [{ questionId: "q1", answer: "技术小白", skipped: false }],
      result: {
        finalPromptMarkdown: "# Agent 任务需求",
        improvementNotesMarkdown: "# 优化说明",
      },
      diagnostics: null,
    };

    const markdown = createHistoryMarkdown(session);

    expect(markdown).toContain("# 做一个桌面端工具");
    expect(markdown).toContain("技术小白");
    expect(markdown).toContain("# Agent 任务需求");
  });
});
