import type {
  ApiCallContext,
  ApiCallResult,
  ApiConfig,
  ApiDiagnostics,
  ClarifyingAnswer,
  ClarifyingQuestion,
  BrainstormMessage,
  OptimizedPromptResult,
  RequirementInput,
  WorkflowMode,
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

export type LlmStreamRequest = LlmGenerateRequest & {
  taskId: string;
  timeoutMs: number;
  idleTimeoutMs: number;
};

export type LlmStreamStartResult = {
  taskId: string;
};

export type LlmStreamEvent =
  | {
      taskId: string;
      type: "started";
      context: LlmGenerateRequest["context"];
      startedAt: string;
      streamEnabled: boolean;
      usedJsonMode: boolean;
    }
  | {
      taskId: string;
      type: "phase";
      phase: "connecting" | "waiting" | "streaming" | "parsing";
      message: string;
      elapsedMs: number;
    }
  | {
      taskId: string;
      type: "chunk";
      delta: string;
      content: string;
      elapsedMs: number;
    }
  | {
      taskId: string;
      type: "complete";
      content: string;
      diagnostics: ApiDiagnostics;
      elapsedMs: number;
    }
  | {
      taskId: string;
      type: "error";
      message: string;
      diagnostics?: ApiDiagnostics;
      partialContent: string;
      elapsedMs: number;
    }
  | {
      taskId: string;
      type: "canceled";
      partialContent: string;
      elapsedMs: number;
    };

export type HistorySummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  providerHint?: string;
};

export type HistorySession = HistorySummary & {
  mode?: WorkflowMode;
  requirementInput: RequirementInput;
  questions: ClarifyingQuestion[];
  answers: ClarifyingAnswer[];
  brainstormMessages?: BrainstormMessage[];
  brainstormSummaryMarkdown?: string;
  brainstormConfirmedRequirements?: string[];
  result: OptimizedPromptResult;
  diagnostics: ApiDiagnostics | null;
};

export type DesktopApi = {
  connection: {
    test: (config: DesktopApiConfig) => Promise<ApiCallResult>;
  };
  llm: {
    generate: (request: LlmGenerateRequest) => Promise<ApiCallResult>;
    startStream: (request: LlmStreamRequest) => Promise<LlmStreamStartResult>;
    cancelStream: (taskId: string) => Promise<void>;
    onStreamEvent: (listener: (event: LlmStreamEvent) => void) => () => void;
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
