import type {
  BrainstormTurnResult,
  ClarifyingQuestion,
  ClarifyingQuestionsPayload,
  FormatOptimizationResult,
  OptimizedPromptResult,
  PromptOutputKind,
} from "../types/app";

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractModelContent(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as {
    choices?: Array<{
      message?: {
        content?: string | Array<string | { text?: string; content?: string }>;
      };
      text?: string;
    }>;
    output_text?: string;
    text?: string;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => (typeof part === "string" ? part : part.text ?? part.content ?? ""))
      .join("")
      .trim();
    if (joined) return joined;
  }

  const fallbacks = [
    payload.choices?.[0]?.text,
    payload.output_text,
    payload.text,
  ];
  return fallbacks.find((item) => typeof item === "string" && item.trim())?.trim() ?? null;
}

function extractFencedBlocks(text: string) {
  return [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
}

function extractBalancedJsonCandidates(text: string) {
  const candidates: string[] = [];
  const stack: string[] = [];
  let startIndex = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      if (!stack.length) {
        startIndex = index;
      }
      stack.push(char);
      continue;
    }

    if (char !== "}" && char !== "]") {
      continue;
    }

    const opener = stack[stack.length - 1];
    if ((char === "}" && opener !== "{") || (char === "]" && opener !== "[")) {
      stack.length = 0;
      startIndex = -1;
      continue;
    }

    stack.pop();
    if (!stack.length && startIndex >= 0) {
      candidates.push(text.slice(startIndex, index + 1));
      startIndex = -1;
    }
  }

  return candidates;
}

function tryParseJsonLike<T>(value: string, seen = new Set<string>()): T | null {
  const trimmed = value.trim();
  if (!trimmed || seen.has(trimmed)) return null;
  seen.add(trimmed);

  const parsed = tryParseJson<unknown>(trimmed);
  if (parsed) {
    if (typeof parsed === "string" && parsed.trim()) {
      return tryParseJsonLike<T>(parsed, seen) ?? (parsed as T);
    }

    const modelContent = extractModelContent(parsed);
    if (modelContent) {
      return tryParseJsonLike<T>(modelContent, seen) ?? (parsed as T);
    }
    return parsed as T;
  }

  for (const block of extractFencedBlocks(trimmed)) {
    const fromFence = tryParseJsonLike<T>(block, seen);
    if (fromFence) return fromFence;
  }

  for (const candidate of extractBalancedJsonCandidates(trimmed)) {
    const fromCandidate = tryParseJsonLike<T>(candidate, seen);
    if (fromCandidate) return fromCandidate;
  }

  return null;
}

function readLooseJsonStringField(text: string, fieldName: string) {
  const fieldPattern = new RegExp(`"${fieldName}"\\s*:\\s*"`, "m");
  const match = fieldPattern.exec(text);
  if (!match) return null;

  const start = match.index + match[0].length;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char !== "\"") {
      continue;
    }

    const rest = text.slice(index + 1);
    if (/^\s*,\s*"[A-Za-z0-9_]+\"\s*:/.test(rest) || /^\s*\}/.test(rest)) {
      return text
        .slice(start, index)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\"/g, "\"")
        .replace(/\\\\/g, "\\")
        .trim();
    }
  }

  return null;
}

function parseLooseOptimizedPromptPayload(content: string): OptimizedPromptResult | null {
  const finalPromptMarkdown =
    readLooseJsonStringField(content, "finalPromptMarkdown") ??
    readLooseJsonStringField(content, "finalPrompt") ??
    readLooseJsonStringField(content, "final_prompt_markdown") ??
    readLooseJsonStringField(content, "prompt");

  if (!finalPromptMarkdown) {
    return null;
  }

  const improvementNotesMarkdown =
    readLooseJsonStringField(content, "improvementNotesMarkdown") ??
    readLooseJsonStringField(content, "improvementNotes") ??
    readLooseJsonStringField(content, "improvement_notes_markdown") ??
    readLooseJsonStringField(content, "notes") ??
    "模型没有提供独立的优化说明。请以最终 Prompt 内容为准。";

  return {
    finalPromptMarkdown,
    improvementNotesMarkdown,
  };
}

export function parseJsonResponse<T>(content: string): T {
  const parsed = tryParseJsonLike<T>(content);
  if (parsed) {
    return parsed;
  }

  throw new Error("模型返回内容不是可解析的 JSON。");
}

export function parseClarifyingQuestions(content: string) {
  const parsed = parseJsonResponse<unknown>(content);
  const rawQuestions = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "questions" in parsed
      ? (parsed as { questions?: unknown }).questions
      : parsed && typeof parsed === "object" && "data" in parsed
        ? (parsed as { data?: { questions?: unknown } }).data?.questions
        : null;

  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error("模型没有返回有效的澄清问题列表。");
  }

  const questions = rawQuestions
    .map((item, index): ClarifyingQuestion | null => {
      if (!item || typeof item !== "object") return null;
      const value = item as {
        id?: unknown;
        question?: unknown;
        title?: unknown;
        text?: unknown;
        why?: unknown;
        reason?: unknown;
        placeholder?: unknown;
        example?: unknown;
        required?: unknown;
      };
      const question = [value.question, value.title, value.text].find(
        (field) => typeof field === "string" && field.trim(),
      );
      if (typeof question !== "string") return null;

      return {
        id: typeof value.id === "string" && value.id.trim() ? value.id : `q${index + 1}`,
        question: question.trim(),
        why:
          typeof value.why === "string" && value.why.trim()
            ? value.why.trim()
            : typeof value.reason === "string" && value.reason.trim()
              ? value.reason.trim()
              : "这个信息会影响最终任务书的准确度。",
        placeholder:
          typeof value.placeholder === "string" && value.placeholder.trim()
            ? value.placeholder.trim()
            : typeof value.example === "string" && value.example.trim()
              ? value.example.trim()
              : "请补充你的答案；不确定也可以跳过。",
        required: typeof value.required === "boolean" ? value.required : index < 3,
      };
    })
    .filter((question): question is ClarifyingQuestion => Boolean(question));

  if (!questions.length) {
    throw new Error("模型没有返回有效的澄清问题列表。");
  }

  return { questions } satisfies ClarifyingQuestionsPayload;
}

export function parseOptimizedPromptResult(content: string) {
  try {
    const parsed = parseJsonResponse<unknown>(content);
    if (typeof parsed === "string") {
      const markdown = parseMarkdownOptimizedPrompt(parsed);
      if (markdown) return markdown;
      throw new Error("模型没有返回完整的 Prompt 或优化说明。");
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("模型没有返回完整的 Prompt 或优化说明。");
    }

    const payload = parsed as Partial<OptimizedPromptResult> & {
      finalPrompt?: string;
      final_prompt_markdown?: string;
      prompt?: string;
      improvementNotes?: string;
      improvement_notes_markdown?: string;
      notes?: string;
      outputKind?: unknown;
    };

    const finalPromptMarkdown = normalizePromptField(
      payload.finalPromptMarkdown ??
      payload.finalPrompt ??
      payload.final_prompt_markdown ??
      payload.prompt,
      "finalPromptMarkdown",
    );
    const improvementNotesMarkdown = normalizePromptField(
      payload.improvementNotesMarkdown ??
      payload.improvementNotes ??
      payload.improvement_notes_markdown ??
      payload.notes ??
      "模型没有提供独立的优化说明。请以最终 Prompt 内容为准。",
      "improvementNotesMarkdown",
    );

    if (!finalPromptMarkdown) {
      const loose = parseLooseOptimizedPromptPayload(content);
      if (loose) return loose;
      throw new Error("模型没有返回完整的 Prompt 或优化说明。");
    }

    return {
      finalPromptMarkdown,
      improvementNotesMarkdown,
      outputKind: normalizeOutputKind(payload.outputKind),
    };
  } catch {
    const loose = parseLooseOptimizedPromptPayload(content);
    if (loose) {
      return loose;
    }

    const fallback = parseMarkdownOptimizedPrompt(content);
    if (fallback) {
      return fallback;
    }

    throw new Error("模型没有返回可识别的最终 Prompt。");
  }
}

export function parseFormatOptimizationResult(content: string): FormatOptimizationResult {
  const parsed = parseJsonResponse<unknown>(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("模型没有返回有效的格式优化结果。");
  }

  const payload = parsed as {
    optimizedPromptMarkdown?: unknown;
    optimizedPrompt?: unknown;
    prompt?: unknown;
    noteMarkdown?: unknown;
    notes?: unknown;
    detectedScenario?: unknown;
  };

  const optimizedPromptMarkdown = normalizePromptField(
    payload.optimizedPromptMarkdown ?? payload.optimizedPrompt ?? payload.prompt,
    "finalPromptMarkdown",
  );
  if (!optimizedPromptMarkdown) {
    throw new Error("模型没有返回优化后的 Prompt。");
  }

  return {
    optimizedPromptMarkdown,
    noteMarkdown:
      normalizePromptField(payload.noteMarkdown ?? payload.notes, "improvementNotesMarkdown") ||
      "仅做表达整理，未补充新要求。",
    detectedScenario:
      typeof payload.detectedScenario === "string" && payload.detectedScenario.trim()
        ? payload.detectedScenario.trim()
        : "通用表达优化",
  };
}

export function parseBrainstormTurnResult(content: string): BrainstormTurnResult {
  const parsed = parseJsonResponse<unknown>(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("模型没有返回有效的头脑风暴结果。");
  }

  const payload = parsed as {
    assistantMessage?: unknown;
    question?: unknown;
    confirmedRequirementMarkdown?: unknown;
    confirmedRequirement?: unknown;
    confirmedNeed?: unknown;
    summaryMarkdown?: unknown;
    summary?: unknown;
    confidence?: unknown;
    missingInformation?: unknown;
    missing?: unknown;
    readyToFinalize?: unknown;
  };

  const assistantMessage = [payload.assistantMessage, payload.question].find(
    (value) => typeof value === "string" && value.trim(),
  );
  if (typeof assistantMessage !== "string") {
    throw new Error("模型没有返回下一轮问题。");
  }

  const confidence =
    typeof payload.confidence === "number"
      ? payload.confidence
      : typeof payload.confidence === "string"
        ? Number.parseFloat(payload.confidence)
        : 0;

  const missingInformation = Array.isArray(payload.missingInformation)
    ? payload.missingInformation
    : Array.isArray(payload.missing)
      ? payload.missing
      : [];

  const confirmedRequirementMarkdown = normalizeConfirmedRequirement(
    typeof payload.confirmedRequirementMarkdown === "string" &&
      payload.confirmedRequirementMarkdown.trim()
      ? payload.confirmedRequirementMarkdown.trim()
      : typeof payload.confirmedRequirement === "string" && payload.confirmedRequirement.trim()
        ? payload.confirmedRequirement.trim()
        : typeof payload.confirmedNeed === "string" && payload.confirmedNeed.trim()
          ? payload.confirmedNeed.trim()
          : "",
  );

  return {
    assistantMessage: assistantMessage.trim(),
    confirmedRequirementMarkdown,
    summaryMarkdown:
      typeof payload.summaryMarkdown === "string" && payload.summaryMarkdown.trim()
        ? payload.summaryMarkdown.trim()
        : typeof payload.summary === "string" && payload.summary.trim()
          ? payload.summary.trim()
          : "当前还没有形成可用摘要。",
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : 0,
    missingInformation: missingInformation
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => value.trim()),
    readyToFinalize: Boolean(payload.readyToFinalize),
  };
}

const allowedBrainstormDimensions = [
  "任务目标",
  "对象范围",
  "输出形式",
  "执行约束",
  "判断标准",
  "背景信息",
  "交互体验",
] as const;

function normalizeConfirmedRequirement(value: string) {
  let normalized = value
    .trim()
    .replace(/^已确认[:：\s]*/u, "")
    .replace(/^用户(?:希望|想|需要|要|要求)/u, "")
    .trim();

  if (!normalized) return "";

  const dimensionMatch = normalized.match(/^【([^】]+)】\s*(.+)$/u);
  if (dimensionMatch?.[1] && dimensionMatch[2]?.trim()) {
    const rawDimension = dimensionMatch[1].trim();
    const dimension = allowedBrainstormDimensions.includes(
      rawDimension as (typeof allowedBrainstormDimensions)[number],
    )
      ? rawDimension
      : "任务目标";
    return `【${dimension}】${dimensionMatch[2].trim()}`;
  }

  return `【任务目标】${normalized}`;
}

function normalizeOutputKind(value: unknown): PromptOutputKind | undefined {
  return value === "lightweight" || value === "brief" ? value : undefined;
}

export function normalizePromptField(value: unknown, preferredKey: keyof OptimizedPromptResult) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const nested = tryParseJsonLike<Partial<OptimizedPromptResult> & { prompt?: string }>(
    trimmed,
  );
  if (nested && typeof nested === "object") {
    const preferred = nested[preferredKey];
    if (typeof preferred === "string" && preferred.trim()) {
      return preferred.trim();
    }
    if (preferredKey === "finalPromptMarkdown" && typeof nested.prompt === "string") {
      return nested.prompt.trim();
    }
  }

  const loose = parseLooseOptimizedPromptPayload(trimmed);
  if (loose) {
    const preferred = loose[preferredKey];
    return typeof preferred === "string" ? preferred.trim() : "";
  }

  return trimmed;
}

function parseMarkdownOptimizedPrompt(content: string): OptimizedPromptResult | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  const agentHeadingIndex = trimmed.search(/^#\s+Agent\s+任务需求/im);
  const looksLikePrompt =
    agentHeadingIndex >= 0 ||
    /^#\s+/m.test(trimmed) ||
    /##\s*(背景|目标|验收标准|交付物|功能需求)/.test(trimmed);

  if (!looksLikePrompt) {
    return null;
  }

  const finalPromptMarkdown =
    agentHeadingIndex > 0 ? trimmed.slice(agentHeadingIndex).trim() : trimmed;

  return {
    finalPromptMarkdown,
    improvementNotesMarkdown:
      "模型返回了可用的 Markdown，但没有按约定提供独立的优化说明。请以最终 Prompt 内容为准；如需更完整说明，可以重新生成。",
  };
}
