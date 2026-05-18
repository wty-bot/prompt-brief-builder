import { describe, expect, it } from "vitest";

import {
  parseBrainstormTurnResult,
  parseClarifyingQuestions,
  parseFormatOptimizationResult,
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

  it("parses JSON from an OpenAI-compatible response envelope", () => {
    const parsed = parseClarifyingQuestions(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                '{"questions":[{"id":"q1","question":"交付物是什么？","why":"影响执行范围","placeholder":"例如 Windows 安装包","required":true}]}',
            },
          },
        ],
      }),
    );

    expect(parsed.questions[0]?.question).toContain("交付物");
  });

  it("normalizes a direct question array", () => {
    const parsed = parseClarifyingQuestions(`
以下是问题：
[
  {"question":"主要用户是谁？","reason":"影响信息架构","example":"技术小白","required":true}
]
`);

    expect(parsed.questions[0]).toMatchObject({
      id: "q1",
      question: "主要用户是谁？",
      why: "影响信息架构",
      placeholder: "技术小白",
      required: true,
    });
  });

  it("parses optimized result payload", () => {
    const parsed = parseOptimizedPromptResult(
      '{"finalPromptMarkdown":"# Agent 任务需求","improvementNotesMarkdown":"# 优化说明"}',
    );

    expect(parsed.finalPromptMarkdown).toContain("Agent");
    expect(parsed.improvementNotesMarkdown).toContain("优化说明");
  });

  it("parses format optimization result", () => {
    const parsed = parseFormatOptimizationResult(
      JSON.stringify({
        optimizedPromptMarkdown:
          "请定位并修复按钮点击无响应的问题，完成后说明根因和验证方式。",
        noteMarkdown: "基于 debug 场景补充了根因定位和验证说明。",
        detectedScenario: "debug",
      }),
    );

    expect(parsed.optimizedPromptMarkdown).toContain("按钮点击无响应");
    expect(parsed.noteMarkdown).toContain("debug");
    expect(parsed.detectedScenario).toBe("debug");
  });

  it("parses brainstorming turn result", () => {
    const parsed = parseBrainstormTurnResult(
      JSON.stringify({
        assistantMessage: "这个工具最主要想服务哪类用户？",
        confirmedRequirementMarkdown:
          "已确认：用户想做的是需求优化工具，而不是通用聊天工具。",
        summaryMarkdown: "当前已明确：用户想做一个需求优化工具。",
        confidence: 72,
        missingInformation: ["目标用户", "输出形态"],
        readyToFinalize: false,
      }),
    );

    expect(parsed.assistantMessage).toContain("哪类用户");
    expect(parsed.confirmedRequirementMarkdown).toContain("需求优化工具");
    expect(parsed.summaryMarkdown).toContain("需求优化工具");
    expect(parsed.confidence).toBe(72);
    expect(parsed.missingInformation).toContain("目标用户");
    expect(parsed.readyToFinalize).toBe(false);
  });

  it("unwraps optimized result when the model double-encodes JSON as a string", () => {
    const nested = JSON.stringify({
      finalPromptMarkdown: "# Agent 任务需求\n\n## 背景\n用户需要桌面端 UI 优化。",
      improvementNotesMarkdown: "# 优化说明\n\n已整理为可执行任务。",
    });

    const parsed = parseOptimizedPromptResult(JSON.stringify(nested));

    expect(parsed.finalPromptMarkdown).toContain("## 背景");
    expect(parsed.finalPromptMarkdown).not.toContain("finalPromptMarkdown");
    expect(parsed.improvementNotesMarkdown).toContain("优化说明");
  });

  it("unwraps optimized result when finalPromptMarkdown itself contains a JSON payload", () => {
    const parsed = parseOptimizedPromptResult(
      JSON.stringify({
        finalPromptMarkdown: JSON.stringify({
          finalPromptMarkdown: "# Agent 任务需求\n\n## 验收标准\n界面展示正常阅读文本。",
        }),
        improvementNotesMarkdown: "说明",
      }),
    );

    expect(parsed.finalPromptMarkdown).toContain("界面展示正常阅读文本");
    expect(parsed.finalPromptMarkdown).not.toContain("{");
  });

  it("extracts optimized result from a JSON-looking payload with raw newlines", () => {
    const parsed = parseOptimizedPromptResult(`{
  "finalPromptMarkdown": "# Agent 任务需求
## 背景
当前系统需要把 JSON 外壳剥掉。

## 目标
用户看到的是正常阅读文本。",
  "improvementNotesMarkdown": "# 优化说明

已做宽容提取。"
}`);

    expect(parsed.finalPromptMarkdown).toContain("## 背景");
    expect(parsed.finalPromptMarkdown).not.toContain("finalPromptMarkdown");
    expect(parsed.improvementNotesMarkdown).toContain("宽容提取");
  });

  it("accepts markdown when it is returned as a JSON string", () => {
    const parsed = parseOptimizedPromptResult(
      JSON.stringify("# Agent 任务需求\n\n## 目标\n不要展示 Markdown 源码。"),
    );

    expect(parsed.finalPromptMarkdown).toContain("## 目标");
  });

  it("parses optimized result aliases", () => {
    const parsed = parseOptimizedPromptResult(
      '{"prompt":"# Agent 任务需求\\n\\n## 背景","notes":"补充了验收标准"}',
    );

    expect(parsed.finalPromptMarkdown).toContain("Agent");
    expect(parsed.improvementNotesMarkdown).toContain("验收标准");
  });

  it("falls back to markdown optimized result", () => {
    const parsed = parseOptimizedPromptResult(`
# Agent 任务需求

## 背景
用户需要整理需求。

## 验收标准
输出可执行 Prompt。
`);

    expect(parsed.finalPromptMarkdown).toContain("# Agent 任务需求");
    expect(parsed.improvementNotesMarkdown).toContain("没有按约定提供独立的优化说明");
  });
});
