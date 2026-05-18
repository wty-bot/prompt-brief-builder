import { describe, expect, it } from "vitest";

import {
  buildEndpoint,
  buildRequestBody,
  createProviderHint,
  createSuggestion,
  extractResponseContent,
  isCapabilityIssue,
  suggestVersionedBaseUrl,
} from "./openaiCore";

describe("openaiCore", () => {
  it("builds chat completions endpoint without duplicate slash", () => {
    expect(buildEndpoint("https://api.example.com/v1/")).toBe(
      "https://api.example.com/v1/chat/completions",
    );
  });

  it("detects known providers from base URL", () => {
    expect(createProviderHint("https://api.deepseek.com/v1")).toBe("DeepSeek");
    expect(createProviderHint("https://openrouter.ai/api/v1")).toBe("OpenRouter");
    expect(createProviderHint("https://dashscope.aliyuncs.com/compatible-mode/v1")).toBe(
      "DashScope",
    );
  });

  it("builds JSON mode request body", () => {
    const body = buildRequestBody(
      { model: "test-model", temperature: 0.4 },
      [{ role: "user", content: "hello" }],
      true,
    );

    expect(body).toMatchObject({
      model: "test-model",
      temperature: 0.4,
      response_format: { type: "json_object" },
    });
  });

  it("creates actionable HTTP suggestions", () => {
    expect(createSuggestion("http", 401)).toContain("认证失败");
    expect(createSuggestion("http", 404)).toContain("Base URL");
    expect(createSuggestion("timeout")).toContain("请求超时");
  });

  it("recognizes response_format compatibility failures", () => {
    expect(isCapabilityIssue(400, "unknown field response_format")).toBe(true);
    expect(isCapabilityIssue(401, "unauthorized")).toBe(false);
  });

  it("suggests /v1 fallback for root-compatible endpoints", () => {
    expect(suggestVersionedBaseUrl("https://ai.example.com")).toBe(
      "https://ai.example.com/v1",
    );
    expect(suggestVersionedBaseUrl("https://ai.example.com/v1")).toBeNull();
  });

  it("extracts content from text parts", () => {
    expect(
      extractResponseContent({
        choices: [
          {
            message: {
              content: [
                { type: "text", text: "hello" },
                { type: "text", text: " world" },
              ],
            },
          },
        ],
      }),
    ).toBe("hello world");
  });

  it("extracts fallback text fields", () => {
    expect(
      extractResponseContent({
        choices: [
          {
            message: {
              content: null,
              output_text: "fallback text",
            },
          },
        ],
      }),
    ).toBe("fallback text");
  });
});
