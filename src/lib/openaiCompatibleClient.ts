import type {
  ApiCallContext,
  ApiCallResult,
  ApiConfig,
  ApiDiagnostics,
} from "../types/app";
import { ApiRequestError as ApiRequestErrorClass } from "../types/app";
import {
  buildEndpoint,
  buildRequestBody,
  createDiagnostics,
  createSuggestion,
  isCapabilityIssue,
  type ChatCompletionResponse,
  type ChatMessage,
} from "../shared/openaiCore";

type RequestOptions = {
  context: ApiCallContext;
  systemPrompt: string;
  userPrompt: string;
};

function createTransportError(message: string, diagnostics: ApiDiagnostics) {
  return new ApiRequestErrorClass(message, diagnostics);
}

async function requestOnce(
  config: ApiConfig,
  options: RequestOptions,
  expectJson: boolean,
): Promise<ApiCallResult> {
  const endpoint = buildEndpoint(config.baseUrl);
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 20000);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: options.systemPrompt,
    },
    {
      role: "user",
      content: options.userPrompt,
    },
  ];

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(buildRequestBody(config, messages, expectJson)),
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
        transport: "http",
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

    if (
      error.diagnostics.transport !== "http" ||
      !isCapabilityIssue(error.diagnostics.status, error.diagnostics.responsePreview)
    ) {
      throw error;
    }

    const fallback = await requestOnce(config, options, false);
    return {
      ...fallback,
      diagnostics: {
        ...fallback.diagnostics,
        transport: "capability",
        suggestion: createSuggestion("capability"),
      },
    };
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
