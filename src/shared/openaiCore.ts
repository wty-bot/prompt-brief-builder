import type {
  ApiCallContext,
  ApiConfig,
  ApiDiagnostics,
  ApiTransportState,
} from "../types/app.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionResponse = {
  choices?: Array<{
    text?: string;
    message?: {
      content?:
        | string
        | null
        | Array<
            | string
            | {
                type?: string;
                text?: string;
                content?: string;
              }
          >;
      text?: string;
      output_text?: string;
      reasoning?: string;
      reasoning_content?: string;
    };
  }>;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      content?: string;
    }>;
  }>;
  text?: string;
  error?: {
    message?: string;
  };
};

export type WireProtocol = "chat-completions" | "responses";

export function buildEndpoint(baseUrl: string, protocol: WireProtocol = "chat-completions") {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(trimmed) || /\/responses$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/${protocol === "responses" ? "responses" : "chat/completions"}`;
}

export function suggestVersionedBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (/\/v\d+$/i.test(trimmed) || /\/v\d+\//i.test(trimmed) || /\/chat\/completions$/i.test(trimmed)) {
    return null;
  }
  return `${trimmed}/v1`;
}

export function createProviderHint(baseUrl: string) {
  const value = baseUrl.toLowerCase();
  if (value.includes("openai.com")) return "OpenAI";
  if (value.includes("openrouter")) return "OpenRouter";
  if (value.includes("deepseek")) return "DeepSeek";
  if (value.includes("qwen") || value.includes("dashscope")) return "DashScope";
  if (value.includes("moonshot") || value.includes("kimi")) return "Moonshot";
  return "OpenAI-compatible";
}

export function createSuggestion(transport: ApiTransportState, status?: number) {
  switch (transport) {
    case "network":
      return "检查 Base URL 是否可达、网络代理是否正常，或服务商是否需要额外请求头。";
    case "timeout":
      return "请求超时，尝试更快的模型、更短的输入，或稍后重试。";
    case "cors":
      return "浏览器直连可能被 CORS 阻止；桌面端通常不会受此限制，请优先检查网络和 Base URL。";
    case "http":
      if (status === 401 || status === 403) {
        return "认证失败，检查 API Key、账号额度和模型权限。";
      }
      if (status === 404) {
        return "路径错误，确认 Base URL 是否应该带 /v1，或该服务是否使用 Responses API。";
      }
      if (status === 429) {
        return "触发限流，降低频率或切换可用额度更高的模型。";
      }
      if (status && status >= 500) {
        return "服务端异常，稍后重试或切换服务商。";
      }
      return "请求被服务端拒绝，请查看状态码和响应片段。";
    case "parse":
      return "模型返回了内容，但不是预期格式。可尝试更换模型或重新生成。";
    case "capability":
      return "该服务可能不支持 response_format，已自动用普通 JSON 提示重试。";
    default:
      return "请求成功。";
  }
}

export function createDiagnostics(params: {
  context: ApiCallContext;
  baseUrl: string;
  elapsedMs: number;
  transport: ApiTransportState;
  usedJsonMode: boolean;
  status?: number;
  statusText?: string;
  responsePreview?: string;
  protocol?: WireProtocol;
}): ApiDiagnostics {
  return {
    context: params.context,
    endpoint: buildEndpoint(params.baseUrl, params.protocol),
    elapsedMs: params.elapsedMs,
    transport: params.transport,
    usedJsonMode: params.usedJsonMode,
    status: params.status,
    statusText: params.statusText,
    responsePreview: params.responsePreview,
    providerHint: createProviderHint(params.baseUrl),
    suggestion: createSuggestion(params.transport, params.status),
  };
}

export function buildRequestBody(
  config: Pick<ApiConfig, "model" | "temperature">,
  messages: ChatMessage[],
  expectJson: boolean,
) {
  return {
    model: config.model,
    temperature: config.temperature,
    messages,
    ...(expectJson
      ? {
          response_format: {
            type: "json_object",
          },
        }
      : {}),
  };
}

export function buildResponsesRequestBody(
  config: Pick<ApiConfig, "model" | "temperature">,
  messages: ChatMessage[],
) {
  const systemPrompt = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
    .trim();
  const input = messages
    .filter((message) => message.role !== "system")
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n")
    .trim();

  return {
    model: config.model,
    temperature: config.temperature,
    ...(systemPrompt ? { instructions: systemPrompt } : {}),
    input,
  };
}

export function extractResponseContent(payload: ChatCompletionResponse | null) {
  const choice = payload?.choices?.[0];
  const message = choice?.message;
  const content = message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") return part;
        return part.text ?? part.content ?? "";
      })
      .join("")
      .trim();
    if (text) return text;
  }

  const fallbacks = [
    message?.output_text,
    message?.text,
    choice?.text,
    payload?.output_text,
    payload?.output
      ?.flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? part.content ?? "")
      .join("")
      .trim(),
    payload?.text,
    message?.reasoning_content,
    message?.reasoning,
  ];

  return fallbacks.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

export function isCapabilityIssue(status?: number, responsePreview?: string) {
  return (
    status === 400 ||
    status === 422 ||
    Boolean(responsePreview?.includes("response_format")) ||
    Boolean(responsePreview?.includes("json_object"))
  );
}
