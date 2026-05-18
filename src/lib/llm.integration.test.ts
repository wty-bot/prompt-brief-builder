import { describe, expect, it } from "vitest";

import {
  buildClarifyingQuestionsUserPrompt,
  buildFinalPromptUserPrompt,
  clarifyingQuestionsSystemPrompt,
  finalPromptSystemPrompt,
} from "./promptTemplates";
import {
  parseClarifyingQuestions,
  parseOptimizedPromptResult,
} from "./responseParsers";
import {
  buildEndpoint,
  extractResponseContent,
  suggestVersionedBaseUrl,
  type ChatCompletionResponse,
} from "../shared/openaiCore";
import type { RequirementInput } from "../types/app";

const runRealLlm = process.env.LLM_SMOKE === "1";

type ChatRequest = {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  stream: boolean;
  timeoutMs?: number;
};

function isHtml(text: string, contentType: string | null) {
  return (
    contentType?.toLowerCase().includes("text/html") ||
    /^\s*<!doctype html/i.test(text) ||
    /^\s*<html[\s>]/i.test(text)
  );
}

async function fetchChat(request: ChatRequest): Promise<string> {
  const timeoutMs = request.timeoutMs ?? 180_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(buildEndpoint(request.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      temperature: 0.4,
      stream: request.stream,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!request.stream) {
    const text = await response.text();
    if (!response.ok || isHtml(text, response.headers.get("content-type"))) {
      throw new Error(`bad-response:${response.status}:${text.slice(0, 80)}`);
    }
    return extractResponseContent(JSON.parse(text) as ChatCompletionResponse);
  }

  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`bad-stream-response:${response.status}:${text.slice(0, 80)}`);
  }
  if (contentType?.toLowerCase().includes("text/html")) {
    const text = await response.text();
    throw new Error(`html-stream-response:${text.slice(0, 80)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return response.text();
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!data || data === "[DONE]") continue;
      const payload = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      content += payload.choices?.[0]?.delta?.content ?? "";
    }
  }
  return content.trim();
}

async function fetchChatWithVersionFallback(request: ChatRequest) {
  try {
    return await fetchChat(request);
  } catch (error) {
    const versionedBaseUrl = suggestVersionedBaseUrl(request.baseUrl);
    if (!versionedBaseUrl) throw error;
    return fetchChat({ ...request, baseUrl: versionedBaseUrl });
  }
}

describe.runIf(runRealLlm)("real LLM workflow smoke", () => {
  it("generates parseable clarifying questions and final prompt over streaming", async () => {
    const apiKey = process.env.LLM_API_KEY;
    const baseUrl = process.env.LLM_BASE_URL ?? "https://ai.nexahub.one";
    const model = process.env.LLM_MODEL ?? "gpt-5.5";
    expect(apiKey, "LLM_API_KEY is required").toBeTruthy();

    const input: RequirementInput = {
      rawRequirement:
        "做一个 Windows 桌面端工具，帮助技术小白把模糊需求澄清成可交给 Coding Agent 执行的 Markdown Prompt。",
      projectBackground:
        "现有版本是 Electron + React，用户希望有阶段式工作台、本地历史、服务商预设和安全保存 API Key。",
      targetAudience: "不会写技术需求但需要让 AI Agent 帮忙做软件的普通用户。",
      constraints: "必须本地可用，模型接口是 OpenAI-compatible，失败时要能重试和看到诊断。",
      extraMaterials: "用户经常会跳过部分澄清问题。",
    };

    const questionContent = await fetchChatWithVersionFallback({
      baseUrl,
      apiKey: apiKey ?? "",
      model,
      stream: true,
      systemPrompt: clarifyingQuestionsSystemPrompt(),
      userPrompt: buildClarifyingQuestionsUserPrompt(input),
    });
    const questionPayload = parseClarifyingQuestions(questionContent);
    expect(questionPayload.questions.length).toBeGreaterThanOrEqual(3);

    const answers = questionPayload.questions.map((question, index) => ({
      questionId: question.id,
      answer:
        index < 2
          ? "优先做 MVP，目标是让用户能稳定完成：连接模型、输入需求、回答问题、生成最终 Prompt、保存历史。"
          : "",
      skipped: index >= 2,
    }));

    const promptContent = await fetchChatWithVersionFallback({
      baseUrl,
      apiKey: apiKey ?? "",
      model,
      stream: true,
      systemPrompt: finalPromptSystemPrompt(),
      userPrompt: buildFinalPromptUserPrompt(input, answers, questionPayload.questions),
      timeoutMs: 240_000,
    });
    const result = parseOptimizedPromptResult(promptContent);
    expect(result.finalPromptMarkdown).toContain("Agent");
    expect(result.finalPromptMarkdown).toContain("验收标准");
    expect(result.improvementNotesMarkdown.length).toBeGreaterThan(5);
  }, 300_000);
});
