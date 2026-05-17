import type { ApiConfig } from "../types/app";

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

type ApiError = Error & {
  status?: number;
};

function buildEndpoint(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function createRequestBody(
  config: ApiConfig,
  messages: ChatMessage[],
  withJsonMode: boolean,
) {
  return {
    model: config.model,
    temperature: config.temperature,
    messages,
    ...(withJsonMode
      ? {
          response_format: {
            type: "json_object",
          },
        }
      : {}),
  };
}

function createApiError(status: number, message: string): ApiError {
  const error = new Error(`${status} ${message}`.trim()) as ApiError;
  error.status = status;
  return error;
}

async function requestChatCompletion(
  config: ApiConfig,
  messages: ChatMessage[],
  withJsonMode = true,
) {
  const response = await fetch(buildEndpoint(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(createRequestBody(config, messages, withJsonMode)),
  });

  const text = await response.text();
  let payload: ChatCompletionResponse | null = null;

  try {
    payload = JSON.parse(text) as ChatCompletionResponse;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiMessage = payload?.error?.message;
    throw createApiError(response.status, apiMessage ?? text ?? "请求失败");
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("模型返回了空内容。");
  }

  return content;
}

async function requestChatCompletionWithFallback(
  config: ApiConfig,
  messages: ChatMessage[],
) {
  try {
    return await requestChatCompletion(config, messages, true);
  } catch (error) {
    const apiError = error as ApiError;
    const message = apiError.message.toLowerCase();
    const mayNotSupportJsonMode =
      apiError.status === 400 &&
      (message.includes("response_format") ||
        message.includes("json_object") ||
        message.includes("unsupported"));

    if (!mayNotSupportJsonMode) {
      throw error;
    }

    return requestChatCompletion(config, messages, false);
  }
}

export async function testConnection(config: ApiConfig) {
  return requestChatCompletionWithFallback(config, [
    {
      role: "system",
      content: "你是一个 API 连通性测试助手。请只返回一个 JSON：{\"status\":\"ok\"}。",
    },
    {
      role: "user",
      content: "请确认当前模型可以正常响应。",
    },
  ]);
}

export async function generateChatCompletion(
  config: ApiConfig,
  systemPrompt: string,
  userPrompt: string,
) {
  return requestChatCompletionWithFallback(config, [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ]);
}
