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

function buildEndpoint(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

async function requestChatCompletion(config: ApiConfig, messages: ChatMessage[]) {
  const response = await fetch(buildEndpoint(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: config.temperature,
      messages,
      response_format: {
        type: "json_object",
      },
    }),
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
    throw new Error(`${response.status} ${apiMessage ?? text ?? "请求失败"}`.trim());
  }

  const content = payload?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("模型返回了空内容。");
  }

  return content;
}

export async function testConnection(config: ApiConfig) {
  return requestChatCompletion(config, [
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
  return requestChatCompletion(config, [
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
