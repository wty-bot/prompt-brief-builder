export type ApiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  rememberConfig: boolean;
};

export type ApiCallContext = "connection-test" | "clarify-questions" | "compose-brief";

export type ApiTransportState =
  | "ok"
  | "network"
  | "timeout"
  | "http"
  | "parse"
  | "cors"
  | "capability";

export type ApiDiagnostics = {
  context: ApiCallContext;
  endpoint: string;
  elapsedMs: number;
  transport: ApiTransportState;
  usedJsonMode: boolean;
  status?: number;
  statusText?: string;
  responsePreview?: string;
  providerHint: string;
  suggestion: string;
};

export type ApiCallResult = {
  content: string;
  diagnostics: ApiDiagnostics;
};

export type RequirementInput = {
  rawRequirement: string;
  projectBackground: string;
  targetAudience: string;
  constraints: string;
  extraMaterials: string;
};

export type ClarifyingQuestion = {
  id: string;
  question: string;
  why: string;
  placeholder: string;
  required: boolean;
};

export type ClarifyingAnswer = {
  questionId: string;
  answer: string;
  skipped: boolean;
};

export type OptimizedPromptResult = {
  finalPromptMarkdown: string;
  improvementNotesMarkdown: string;
};

export type AppPhase =
  | "idle"
  | "testingConnection"
  | "ready"
  | "generatingQuestions"
  | "answeringQuestions"
  | "generatingPrompt"
  | "completed"
  | "error";

export type ClarifyingQuestionsPayload = {
  questions: ClarifyingQuestion[];
};

export class ApiRequestError extends Error {
  diagnostics: ApiDiagnostics;

  constructor(message: string, diagnostics: ApiDiagnostics) {
    super(message);
    this.name = "ApiRequestError";
    this.diagnostics = diagnostics;
  }
}
