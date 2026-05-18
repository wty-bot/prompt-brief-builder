import type {
  ApiCallContext,
  ApiCallResult,
  ApiConfig,
  ApiDiagnostics,
  ClarifyingAnswer,
  ClarifyingQuestion,
  OptimizedPromptResult,
  RequirementInput,
} from "./app.js";

export type ProviderPresetId =
  | "openai"
  | "deepseek"
  | "openrouter"
  | "dashscope"
  | "moonshot"
  | "custom";

export type ProviderPreset = {
  id: ProviderPresetId;
  name: string;
  baseUrl: string;
  model: string;
  note: string;
};

export type DesktopSettings = Pick<
  ApiConfig,
  "baseUrl" | "model" | "temperature" | "temperaturePreset" | "rememberConfig"
> & {
  providerPresetId: ProviderPresetId;
};

export type DesktopApiConfig = ApiConfig & {
  providerPresetId: ProviderPresetId;
};

export type LlmGenerateRequest = {
  context: Exclude<ApiCallContext, "connection-test">;
  config: DesktopApiConfig;
  systemPrompt: string;
  userPrompt: string;
};

export type HistorySummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  providerHint?: string;
};

export type HistorySession = HistorySummary & {
  requirementInput: RequirementInput;
  questions: ClarifyingQuestion[];
  answers: ClarifyingAnswer[];
  result: OptimizedPromptResult;
  diagnostics: ApiDiagnostics | null;
};

export type DesktopApi = {
  connection: {
    test: (config: DesktopApiConfig) => Promise<ApiCallResult>;
  };
  llm: {
    generate: (request: LlmGenerateRequest) => Promise<ApiCallResult>;
  };
  settings: {
    load: () => Promise<DesktopSettings | null>;
    save: (settings: DesktopSettings) => Promise<void>;
    clear: () => Promise<void>;
  };
  secrets: {
    saveApiKey: (apiKey: string) => Promise<void>;
    deleteApiKey: () => Promise<void>;
    hasSavedApiKey: () => Promise<boolean>;
  };
  history: {
    list: () => Promise<HistorySummary[]>;
    get: (id: string) => Promise<HistorySession | null>;
    save: (session: Omit<HistorySession, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Promise<HistorySession>;
    delete: (id: string) => Promise<void>;
    exportMarkdown: (id: string) => Promise<string>;
  };
};

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}
