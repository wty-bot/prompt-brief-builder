import { describe, expect, it } from "vitest";

import {
  parseClarifyingQuestions,
  parseJsonResponse,
  parseOptimizedPromptResult,
} from "./responseParsers";

describe("responseParsers", () => {
  it("parses direct JSON", () => {
    const parsed = parseJsonResponse<{ status: string }>('{"status":"ok"}');
    expect(parsed.status).toBe("ok");
  });

  it("parses JSON inside fenced code block", () => {
    const parsed = parseClarifyingQuestions(`
\`\`\`json
{"questions":[{"id":"q1","question":"目标用户是谁？","why":"影响范围","placeholder":"例如开发者","required":true}]}
\`\`\`
`);

    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0]?.id).toBe("q1");
  });

  it("parses optimized result payload", () => {
    const parsed = parseOptimizedPromptResult(
      '{"finalPromptMarkdown":"# Agent 任务需求","improvementNotesMarkdown":"# 优化说明"}',
    );

    expect(parsed.finalPromptMarkdown).toContain("Agent");
    expect(parsed.improvementNotesMarkdown).toContain("优化说明");
  });
});
