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
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export function buildEndpoint(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
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
        return "路径错误，确认 Base URL 是否应该带 /v1，以及是否支持 /chat/completions。";
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
}): ApiDiagnostics {
  return {
    context: params.context,
    endpoint: buildEndpoint(params.baseUrl),
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

export function isCapabilityIssue(status?: number, responsePreview?: string) {
  return (
    status === 400 ||
    status === 422 ||
    Boolean(responsePreview?.includes("response_format")) ||
    Boolean(responsePreview?.includes("json_object"))
  );
}
