export type ApiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  rememberConfig: boolean;
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
