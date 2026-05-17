import type {
  ClarifyingQuestionsPayload,
  OptimizedPromptResult,
} from "../types/app";

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractJsonBlock(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const startIndex = text.indexOf("{");
  const endIndex = text.lastIndexOf("}");
  if (startIndex >= 0 && endIndex > startIndex) {
    return text.slice(startIndex, endIndex + 1);
  }

  return text.trim();
}

export function parseJsonResponse<T>(content: string): T {
  const direct = tryParseJson<T>(content);
  if (direct) {
    return direct;
  }

  const extracted = extractJsonBlock(content);
  const parsed = tryParseJson<T>(extracted);
  if (parsed) {
    return parsed;
  }

  throw new Error("模型返回内容不是可解析的 JSON。");
}

export function parseClarifyingQuestions(content: string) {
  const parsed = parseJsonResponse<ClarifyingQuestionsPayload>(content);

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("模型没有返回有效的澄清问题列表。");
  }

  return parsed;
}

export function parseOptimizedPromptResult(content: string) {
  const parsed = parseJsonResponse<OptimizedPromptResult>(content);

  if (!parsed.finalPromptMarkdown || !parsed.improvementNotesMarkdown) {
    throw new Error("模型没有返回完整的 Prompt 或优化说明。");
  }

  return parsed;
}
