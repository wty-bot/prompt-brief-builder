import type { ProviderPreset } from "../types/desktop.js";

export const providerPresets: ProviderPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    note: "官方 OpenAI Chat Completions 兼容入口。",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    note: "适合中文需求整理和通用文本任务。",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    note: "模型网关，可按账号权限切换多家模型。",
  },
  {
    id: "dashscope",
    name: "DashScope / 通义",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    note: "阿里云百炼 OpenAI-compatible 入口。",
  },
  {
    id: "moonshot",
    name: "Moonshot / Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    note: "月之暗面 OpenAI-compatible 入口。",
  },
  {
    id: "custom",
    name: "自定义",
    baseUrl: "",
    model: "",
    note: "用于第三方中转、本地代理或公司内部模型网关。",
  },
];
