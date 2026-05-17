import type {
  ApiCallContext,
  ApiCallResult,
  ApiConfig,
  ApiDiagnostics,
  ApiRequestError,
  ApiTransportState,
} from "../types/app";
import { ApiRequestError as ApiRequestErrorClass } from "../types/app";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type RequestOptions = {
  context: ApiCallContext;
  systemPrompt: string;
  userPrompt: string;
  expectJson?: boolean;
};

function buildEndpoint(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function createProviderHint(baseUrl: string) {
  const value = baseUrl.toLowerCase();
  if (value.includes("openai.com")) return "OpenAI";
  if (value.includes("openrouter")) return "OpenRouter";
  if (value.includes("deepseek")) return "DeepSeek";
  if (value.includes("qwen")) return "Qwen";
  if (value.includes("dashscope")) return "DashScope";
  if (value.includes("moonshot") || value.includes("kimi")) return "Moonshot";
  return "OpenAI-compatible";
}

function createSuggestion(transport: ApiTransportState, status?: number) {
  switch (transport) {
    case "network":
      return "检查 Base URL 是否可达、是否被 CORS 拦截，或是否需要代理层。";
    case "timeout":
      return "请求超时，尝试更快的模型或更短的输入。";
    case "cors":
      return "当前服务可能不允许浏览器直连，建议改用代理层或支持前端跨域的服务。";
    case "http":
      if (status === 401 || status === 403) {
        return "认证失败，检查 API Key 和权限范围。";
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
      return "模型返回了内容，但不是预期 JSON。可尝试关闭 JSON mode 或更换模型。";
    case "capability":
      return "该服务可能不支持 response_format 或某些 OpenAI 扩展参数。";
    default:
      return "请求成功。";
  }
}

function createDiagnostics(params: {
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

function createTransportError(message: string, diagnostics: ApiDiagnostics) {
  return new ApiRequestErrorClass(message, diagnostics);
}

function buildRequestBody(config: ApiConfig, messages: ChatMessage[], expectJson: boolean) {
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

async function requestOnce(
  config: ApiConfig,
  options: Omit<RequestOptions, "context"> & { context: ApiCallContext },
  expectJson: boolean,
): Promise<ApiCallResult> {
  const endpoint = buildEndpoint(config.baseUrl);
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(
        buildRequestBody(
          config,
          [
            {
              role: "system",
              content: options.systemPrompt,
            },
            {
              role: "user",
              content: options.userPrompt,
            },
          ],
          expectJson,
        ),
      ),
      signal: controller.signal,
    });

    const text = await response.text();
    const elapsedMs = Math.round(performance.now() - start);
    const preview = text.slice(0, 500);

    let payload: ChatCompletionResponse | null = null;
    try {
      payload = JSON.parse(text) as ChatCompletionResponse;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const diagnostics = createDiagnostics({
        context: options.context,
        baseUrl: config.baseUrl,
        elapsedMs,
        transport: response.status === 401 || response.status === 403 || response.status === 404 || response.status === 429 || response.status >= 500 ? "http" : "http",
        usedJsonMode: expectJson,
        status: response.status,
        statusText: response.statusText,
        responsePreview: preview,
      });
      const message =
        payload?.error?.message ??
        `${response.status} ${response.statusText || "请求失败"}`.trim();
      throw createTransportError(message, diagnostics);
    }

    const content = payload?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      const diagnostics = createDiagnostics({
        context: options.context,
        baseUrl: config.baseUrl,
        elapsedMs,
        transport: "parse",
        usedJsonMode: expectJson,
        status: response.status,
        statusText: response.statusText,
        responsePreview: preview,
      });
      throw createTransportError("模型返回了空内容。", diagnostics);
    }

    return {
      content,
      diagnostics: createDiagnostics({
        context: options.context,
        baseUrl: config.baseUrl,
        elapsedMs,
        transport: "ok",
        usedJsonMode: expectJson,
        status: response.status,
        statusText: response.statusText,
        responsePreview: preview,
      }),
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - start);

    if (error instanceof Error && error.name === "AbortError") {
      const diagnostics = createDiagnostics({
        context: options.context,
        baseUrl: config.baseUrl,
        elapsedMs,
        transport: "timeout",
        usedJsonMode: expectJson,
      });
      throw createTransportError("请求超时。", diagnostics);
    }

    if (error instanceof ApiRequestErrorClass) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "请求失败";
    const transport =
      /cors|failed to fetch|networkerror/i.test(message) ? "cors" : "network";
    const diagnostics = createDiagnostics({
      context: options.context,
      baseUrl: config.baseUrl,
      elapsedMs,
      transport,
      usedJsonMode: expectJson,
    });
    throw createTransportError(message, diagnostics);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function requestWithFallback(
  config: ApiConfig,
  options: RequestOptions,
): Promise<ApiCallResult> {
  try {
    return await requestOnce(config, options, true);
  } catch (error) {
    if (!(error instanceof ApiRequestErrorClass)) {
      throw error;
    }

    const maybeCapabilityIssue =
      error.diagnostics.transport === "http" &&
      (error.diagnostics.status === 400 ||
        error.diagnostics.status === 422 ||
        error.diagnostics.responsePreview?.includes("response_format") ||
        error.diagnostics.responsePreview?.includes("json_object"));

    if (!maybeCapabilityIssue) {
      throw error;
    }

    try {
      const fallback = await requestOnce(config, options, false);
      return {
        ...fallback,
        diagnostics: {
          ...fallback.diagnostics,
          transport: "capability",
          suggestion: createSuggestion("capability"),
        },
      };
    } catch (fallbackError) {
      throw fallbackError;
    }
  }
}

export async function testConnection(config: ApiConfig) {
  return requestWithFallback(config, {
    context: "connection-test",
    systemPrompt: "你是一个 API 连通性测试助手。只返回一个简短 JSON。",
    userPrompt: "请确认当前模型可以正常响应。",
  });
}

export async function generateChatCompletion(
  config: ApiConfig,
  context: Exclude<ApiCallContext, "connection-test">,
  systemPrompt: string,
  userPrompt: string,
) {
  return requestWithFallback(config, {
    context,
    systemPrompt,
    userPrompt,
  });
}
