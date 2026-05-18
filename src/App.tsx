import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyRound,
  MessageSquarePlus,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  WandSparkles,
} from "lucide-react";

import { BrainstormPanel } from "./components/BrainstormPanel";
import { ClarifyingQuestionsPanel } from "./components/ClarifyingQuestionsPanel";
import { ComparisonPanel } from "./components/ComparisonPanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DesktopShell, type DesktopStepId } from "./components/DesktopShell";
import { FormatOptimizationPanel } from "./components/FormatOptimizationPanel";
import { FormatOptimizationResultPanel } from "./components/FormatOptimizationResultPanel";
import {
  GenerationTaskPanel,
  type GenerationTaskView,
} from "./components/GenerationTaskPanel";
import { ModeSelectionPanel } from "./components/ModeSelectionPanel";
import { ResultPanel } from "./components/ResultPanel";
import { normalizeErrorMessage } from "./lib/errors";
import {
  cancelDesktopStream,
  deleteHistorySession,
  deleteSavedApiKey,
  exportHistoryMarkdown,
  hasSavedApiKey,
  isDesktopRuntime,
  listHistory,
  loadDesktopSettings,
  saveApiKey,
  saveDesktopSettings,
  saveHistorySession,
  startDesktopStream,
  testDesktopConnection,
  onDesktopStreamEvent,
} from "./lib/desktopClient";
import {
  brainstormFinalizeSystemPrompt,
  brainstormTurnSystemPrompt,
  buildBrainstormFinalizeUserPrompt,
  buildBrainstormTurnUserPrompt,
  buildClarifyingQuestionsUserPrompt,
  buildFormatOptimizationUserPrompt,
  buildFinalPromptUserPrompt,
  clarifyingQuestionsSystemPrompt,
  formatOptimizationSystemPrompt,
  finalPromptSystemPrompt,
} from "./lib/promptTemplates";
import {
  parseBrainstormTurnResult,
  parseClarifyingQuestions,
  parseFormatOptimizationResult,
  parseOptimizedPromptResult,
} from "./lib/responseParsers";
import { providerPresets } from "./shared/providerPresets";
import {
  getTemperatureValue,
  temperaturePresets,
  type TemperaturePreset,
} from "./shared/temperature";
import type {
  ApiDiagnostics,
  AppPhase,
  BrainstormMessage,
  ClarifyingAnswer,
  ClarifyingQuestion,
  OptimizedPromptResult,
  RequirementInput,
  WorkflowMode,
} from "./types/app";
import type {
  DesktopApiConfig,
  DesktopSettings,
  HistorySession,
  HistorySummary,
  LlmStreamEvent,
  LlmStreamRequest,
  ProviderPresetId,
} from "./types/desktop";

const defaultPreset = providerPresets[0];

const defaultApiConfig: DesktopApiConfig = {
  baseUrl: defaultPreset.baseUrl,
  apiKey: "",
  model: defaultPreset.model,
  temperature: 0.4,
  temperaturePreset: "medium",
  rememberConfig: false,
  providerPresetId: defaultPreset.id,
};

const defaultRequirementInput: RequirementInput = {
  rawRequirement: "",
  projectBackground: "",
  targetAudience: "",
  constraints: "",
  extraMaterials: "",
};

const defaultResult: OptimizedPromptResult = {
  finalPromptMarkdown: "",
  improvementNotesMarkdown: "",
};

type NoticeTone = "neutral" | "success" | "warning" | "error";

const providerAccentClasses: Record<
  ProviderPresetId,
  {
    dot: string;
    selected: string;
    idle: string;
    note: string;
  }
> = {
  openai: {
    dot: "bg-[#34c759]",
    selected: "border-[#34c759]/30 bg-[#34c759]/10 text-ink shadow-sm",
    idle: "border-black/8 bg-white text-ink/72 hover:border-[#34c759]/25 hover:bg-[#34c759]/10",
    note: "border-[#34c759]/18 bg-[#34c759]/8",
  },
  deepseek: {
    dot: "bg-[#007aff]",
    selected: "border-[#007aff]/30 bg-[#007aff]/10 text-ink shadow-sm",
    idle: "border-black/8 bg-white text-ink/72 hover:border-[#007aff]/25 hover:bg-[#007aff]/10",
    note: "border-[#007aff]/18 bg-[#007aff]/8",
  },
  openrouter: {
    dot: "bg-[#af52de]",
    selected: "border-[#af52de]/30 bg-[#af52de]/10 text-ink shadow-sm",
    idle: "border-black/8 bg-white text-ink/72 hover:border-[#af52de]/25 hover:bg-[#af52de]/10",
    note: "border-[#af52de]/18 bg-[#af52de]/8",
  },
  dashscope: {
    dot: "bg-[#ff9500]",
    selected: "border-[#ff9500]/30 bg-[#ff9500]/12 text-ink shadow-sm",
    idle: "border-black/8 bg-white text-ink/72 hover:border-[#ff9500]/25 hover:bg-[#ff9500]/8",
    note: "border-[#ff9500]/18 bg-[#ff9500]/8",
  },
  moonshot: {
    dot: "bg-[#5856d6]",
    selected: "border-[#5856d6]/30 bg-[#5856d6]/10 text-ink shadow-sm",
    idle: "border-black/8 bg-white text-ink/72 hover:border-[#5856d6]/25 hover:bg-[#5856d6]/10",
    note: "border-[#5856d6]/18 bg-[#5856d6]/8",
  },
  custom: {
    dot: "bg-[#8e8e93]",
    selected: "border-[#8e8e93]/30 bg-[#8e8e93]/12 text-ink shadow-sm",
    idle: "border-black/8 bg-white text-ink/72 hover:border-[#8e8e93]/25 hover:bg-[#8e8e93]/8",
    note: "border-[#8e8e93]/18 bg-[#8e8e93]/8",
  },
};

function App() {
  const desktopMode = isDesktopRuntime();
  const [apiConfig, setApiConfig] = useState<DesktopApiConfig>(defaultApiConfig);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode | null>(null);
  const [requirementInput, setRequirementInput] =
    useState<RequirementInput>(defaultRequirementInput);
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [activeStep, setActiveStep] = useState<DesktopStepId>("connection");
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<ClarifyingAnswer[]>([]);
  const [brainstormMessages, setBrainstormMessages] = useState<BrainstormMessage[]>([]);
  const [brainstormSummaryMarkdown, setBrainstormSummaryMarkdown] = useState("");
  const [brainstormConfirmedRequirements, setBrainstormConfirmedRequirements] = useState<
    string[]
  >([]);
  const [brainstormConfidence, setBrainstormConfidence] = useState(0);
  const [brainstormMissingInformation, setBrainstormMissingInformation] = useState<string[]>([]);
  const [brainstormReadyToFinalize, setBrainstormReadyToFinalize] = useState(false);
  const [brainstormAnswer, setBrainstormAnswer] = useState("");
  const [brainstormContinueDirection, setBrainstormContinueDirection] = useState("");
  const [showBrainstormContinueInput, setShowBrainstormContinueInput] = useState(false);
  const [result, setResult] = useState<OptimizedPromptResult>(defaultResult);
  const [diagnostics, setDiagnostics] = useState<ApiDiagnostics | null>(null);
  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [historyDeleteTarget, setHistoryDeleteTarget] = useState<HistorySummary | null>(null);
  const [savedKeyAvailable, setSavedKeyAvailable] = useState(false);
  const [generationTask, setGenerationTask] = useState<GenerationTaskView | null>(null);
  const latestStreamRequestRef = useRef<LlmStreamRequest | null>(null);
  const sessionDraftRef = useRef({
    currentHistoryId,
    workflowMode,
    requirementInput,
    questions,
    answers,
    brainstormMessages,
    brainstormSummaryMarkdown,
    brainstormConfirmedRequirements,
    diagnostics,
  });
  const [globalMessage, setGlobalMessage] = useState<{
    tone: NoticeTone;
    title: string;
    description: string;
  } | null>({
    tone: "neutral",
    title: "桌面端已就绪",
    description:
      "模型请求会从 Electron 主进程发出，通常不会再被浏览器 CORS 限制拦住。",
  });

  useEffect(() => {
    sessionDraftRef.current = {
      currentHistoryId,
      workflowMode,
      requirementInput,
      questions,
      answers,
      brainstormMessages,
      brainstormSummaryMarkdown,
      brainstormConfirmedRequirements,
      diagnostics,
    };
  }, [
    answers,
      brainstormMessages,
      brainstormConfirmedRequirements,
      brainstormConfirmedRequirements.length,
      brainstormSummaryMarkdown,
    currentHistoryId,
    diagnostics,
    questions,
    requirementInput,
    workflowMode,
  ]);

  useEffect(() => {
    async function bootstrap() {
      if (!desktopMode) return;

      const [settings, keyState, historyItems] = await Promise.all([
        loadDesktopSettings(),
        hasSavedApiKey(),
        listHistory(),
      ]);

      if (settings) {
        setApiConfig((current) => ({
          ...current,
          ...settings,
          apiKey: "",
        }));
      }
      setSavedKeyAvailable(keyState);
      setHistory(historyItems);
    }

    void bootstrap();
  }, [desktopMode]);

  const hasConfig = Boolean(
    apiConfig.baseUrl.trim() &&
      apiConfig.model.trim() &&
      (apiConfig.apiKey.trim() || savedKeyAvailable),
  );
  const generationRunning = Boolean(
    generationTask &&
      ["starting", "connecting", "waiting", "streaming", "parsing"].includes(
        generationTask.status,
      ),
  );

  const steps = useMemo(
    () => [
      {
        id: "connection" as const,
        label: "连接模型",
        description: savedKeyAvailable ? "已保存密钥，可直接测试" : "选择服务商并填写 API Key",
        status:
          phase === "ready" ||
          phase === "formattingPrompt" ||
          phase === "generatingQuestions" ||
          phase === "answeringQuestions" ||
          phase === "brainstorming" ||
          phase === "finalizingBrainstorm" ||
          phase === "generatingPrompt" ||
          phase === "completed"
            ? ("done" as const)
            : activeStep === "connection"
              ? ("active" as const)
              : ("idle" as const),
      },
      {
        id: "mode" as const,
        label: "选择模式",
        description: workflowMode === "format-optimization"
          ? "轻量整理表达"
          : workflowMode === "brainstorming"
            ? "逐轮头脑风暴"
            : "先选择优化方式",
        status: workflowMode
          ? ("done" as const)
          : activeStep === "mode"
            ? ("active" as const)
            : ("idle" as const),
      },
      {
        id: "input" as const,
        label: workflowMode === "format-optimization" ? "输入原文" : "输入想法",
        description:
          workflowMode === "format-optimization"
            ? "写下要整理的原始表达"
            : "写下还没想清楚的初始需求",
        status: requirementInput.rawRequirement.trim()
          ? ("done" as const)
          : activeStep === "input"
            ? ("active" as const)
            : ("idle" as const),
      },
      {
        id: "clarify" as const,
        label: workflowMode === "brainstorming" ? "头脑风暴" : "处理需求",
        description:
          workflowMode === "brainstorming"
            ? brainstormSummaryMarkdown
              ? `清晰度 ${brainstormConfidence}%`
              : "逐轮发问并更新摘要"
            : questions.length
              ? "回答或跳过关键问题"
              : "等待 AI 处理",
        status:
          (workflowMode === "brainstorming" && brainstormMessages.length && phase === "completed") ||
          (workflowMode !== "brainstorming" &&
            questions.length &&
            (phase === "completed" || phase === "generatingPrompt"))
            ? ("done" as const)
            : activeStep === "clarify" || questions.length || brainstormMessages.length
              ? ("active" as const)
              : ("idle" as const),
      },
      {
        id: "brief" as const,
        label: "生成 Brief",
        description: "复制、导出和对比最终 Prompt",
        status: result.finalPromptMarkdown
          ? ("done" as const)
          : activeStep === "brief"
            ? ("active" as const)
            : ("idle" as const),
      },
      {
        id: "history" as const,
        label: "回看历史",
        description: "打开本地保存的会话",
        status: activeStep === "history" ? ("active" as const) : ("idle" as const),
      },
    ],
    [
      activeStep,
      brainstormConfidence,
      brainstormMessages.length,
      brainstormSummaryMarkdown,
      generationRunning,
      phase,
      questions.length,
      requirementInput.rawRequirement,
      result.finalPromptMarkdown,
      savedKeyAvailable,
      workflowMode,
    ],
  );

  async function refreshHistory() {
    if (!desktopMode) return;
    setHistory(await listHistory());
  }

  async function persistSettings(nextConfig = apiConfig) {
    if (!desktopMode) return;
    const settings: DesktopSettings = {
      baseUrl: nextConfig.baseUrl,
      model: nextConfig.model,
      temperature: nextConfig.temperature,
      temperaturePreset: nextConfig.temperaturePreset,
      rememberConfig: nextConfig.rememberConfig,
      providerPresetId: nextConfig.providerPresetId,
    };
    await saveDesktopSettings(settings);
  }

  function createTaskId(context: LlmStreamRequest["context"]) {
    const random =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    return `${context}-${Date.now()}-${random}`;
  }

  function createLocalId(prefix: string) {
    const random =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    return `${prefix}-${Date.now()}-${random}`;
  }

  function getGenerationFailureTitle(context: LlmStreamRequest["context"]) {
    switch (context) {
      case "format-optimization":
        return "优化表达失败";
      case "brainstorm-turn":
        return "头脑风暴失败";
      case "brainstorm-finalize":
        return "收束需求失败";
      case "clarify-questions":
        return "生成澄清问题失败";
      default:
        return "生成最终 Prompt 失败";
    }
  }

  async function saveSessionSnapshot(
    nextResult: OptimizedPromptResult,
    nextDiagnostics: ApiDiagnostics,
  ) {
    const snapshot = sessionDraftRef.current;
    return saveHistorySession({
      id: snapshot.currentHistoryId ?? undefined,
      title:
        snapshot.requirementInput.rawRequirement.trim().slice(0, 42) ||
        "未命名需求",
      requirementInput: snapshot.requirementInput,
      questions: snapshot.questions,
      answers: snapshot.answers,
      result: nextResult,
      diagnostics: nextDiagnostics,
      providerHint: nextDiagnostics.providerHint,
      mode: snapshot.workflowMode ?? nextResult.mode ?? undefined,
      brainstormMessages: snapshot.brainstormMessages,
      brainstormSummaryMarkdown: snapshot.brainstormSummaryMarkdown,
      brainstormConfirmedRequirements: snapshot.brainstormConfirmedRequirements,
    });
  }

  async function startGenerationStream(
    request: LlmStreamRequest,
    taskCopy: Pick<GenerationTaskView, "title" | "message">,
  ) {
    latestStreamRequestRef.current = request;
    setGenerationTask({
      taskId: request.taskId,
      context: request.context,
      status: "starting",
      title: taskCopy.title,
      message: taskCopy.message,
      elapsedMs: 0,
      partialContent: "",
      streamEnabled: true,
      usedJsonMode: false,
      diagnostics: null,
    });

    try {
      await persistSettings();
      await startDesktopStream(request);
    } catch (error) {
      const nextDiagnostics =
        error instanceof Error && "diagnostics" in error
          ? (error as { diagnostics: ApiDiagnostics }).diagnostics
          : null;
      if (nextDiagnostics) {
        setDiagnostics(nextDiagnostics);
      }
      setPhase("error");
      setGenerationTask((current) =>
        current?.taskId === request.taskId
          ? {
              ...current,
              status: "error",
              message: "请求还没有发出就失败了。",
              errorMessage: normalizeErrorMessage(error),
              diagnostics: nextDiagnostics,
            }
          : current,
      );
      setGlobalMessage({
        tone: "error",
        title: getGenerationFailureTitle(request.context),
        description: normalizeErrorMessage(error),
      });
    }
  }

  const handleStreamEvent = useCallback(
    async (event: LlmStreamEvent) => {
      const activeRequest = latestStreamRequestRef.current;
      if (!activeRequest || activeRequest.taskId !== event.taskId) {
        return;
      }

      if (event.type === "started") {
        setGenerationTask((current) =>
          current?.taskId === event.taskId
            ? {
                ...current,
                status: "connecting",
                streamEnabled: event.streamEnabled,
                usedJsonMode: event.usedJsonMode,
              }
            : current,
        );
        return;
      }

      if (event.type === "phase") {
        setGenerationTask((current) =>
          current?.taskId === event.taskId
            ? {
                ...current,
                status: event.phase,
                message: event.message,
                elapsedMs: event.elapsedMs,
              }
            : current,
        );
        return;
      }

      if (event.type === "chunk") {
        setGenerationTask((current) =>
          current?.taskId === event.taskId
            ? {
                ...current,
                status: "streaming",
                message: "正在接收模型内容，已返回的文本会实时显示在下方。",
                elapsedMs: event.elapsedMs,
                partialContent: event.content,
              }
            : current,
        );
        return;
      }

      if (event.type === "canceled") {
        setPhase(
          activeRequest.context === "brainstorm-turn"
            ? "brainstorming"
            : activeRequest.context === "brainstorm-finalize"
              ? "brainstorming"
              : activeRequest.context === "clarify-questions"
                ? "ready"
                : "ready",
        );
        setGenerationTask((current) =>
          current?.taskId === event.taskId
            ? {
                ...current,
                status: "canceled",
                message: "这次生成已取消，已收到的内容保留在下方。",
                elapsedMs: event.elapsedMs,
                partialContent: event.partialContent,
              }
            : current,
        );
        setGlobalMessage({
          tone: "neutral",
          title: "生成已取消",
          description: "可以调整输入后重新生成，也可以直接重试。",
        });
        return;
      }

      if (event.type === "error") {
        if (event.diagnostics) {
          setDiagnostics(event.diagnostics);
        }
        setPhase("error");
        setGenerationTask((current) =>
          current?.taskId === event.taskId
            ? {
                ...current,
                status: "error",
                message: "模型请求失败，保留已收到内容和诊断信息。",
                errorMessage: event.message,
                elapsedMs: event.elapsedMs,
                partialContent: event.partialContent,
                diagnostics: event.diagnostics ?? null,
              }
            : current,
        );
        setGlobalMessage({
          tone: "error",
          title: getGenerationFailureTitle(activeRequest.context),
          description: event.message,
        });
        return;
      }

      setGenerationTask((current) =>
        current?.taskId === event.taskId
          ? {
              ...current,
              status: "parsing",
              message: "内容接收完成，正在解析并写入当前工作流。",
              elapsedMs: event.elapsedMs,
              partialContent: event.content,
              diagnostics: event.diagnostics,
            }
          : current,
      );
      setDiagnostics(event.diagnostics);

      try {
        if (activeRequest.context === "format-optimization") {
          const parsed = parseFormatOptimizationResult(event.content);
          const nextResult: OptimizedPromptResult = {
            finalPromptMarkdown: parsed.optimizedPromptMarkdown,
            improvementNotesMarkdown: parsed.noteMarkdown,
            mode: "format-optimization",
            outputKind: "lightweight",
            originalText: sessionDraftRef.current.requirementInput.rawRequirement,
            detectedScenario: parsed.detectedScenario,
          };
          setResult(nextResult);
          setPhase("completed");
          const saved = await saveSessionSnapshot(nextResult, event.diagnostics);
          setCurrentHistoryId(saved.id);
          await refreshHistory();
          setActiveStep("brief");
          setGenerationTask((current) =>
            current?.taskId === event.taskId
              ? {
                  ...current,
                  status: "completed",
                  message: "轻量 Prompt 已整理，并已保存到本地历史。",
                  elapsedMs: event.elapsedMs,
                }
              : current,
          );
          setGlobalMessage({
            tone: "success",
            title: "表达已优化",
            description: "结果包含原文、优化后 Prompt 和备注，可以直接复制。",
          });
          return;
        }

        if (activeRequest.context === "brainstorm-turn") {
          const parsed = parseBrainstormTurnResult(event.content);
          const assistantMessage: BrainstormMessage = {
            id: createLocalId("assistant"),
            role: "assistant",
            content: parsed.assistantMessage,
            createdAt: new Date().toISOString(),
          };
          setBrainstormMessages((current) => [...current, assistantMessage]);
          if (parsed.confirmedRequirementMarkdown) {
            setBrainstormConfirmedRequirements((current) => {
              const normalized = parsed.confirmedRequirementMarkdown.trim();
              if (!normalized || current.includes(normalized)) return current;
              return [...current, normalized];
            });
          }
          setBrainstormSummaryMarkdown(parsed.summaryMarkdown);
          setBrainstormConfidence(parsed.confidence);
          setBrainstormMissingInformation(parsed.missingInformation);
          setBrainstormReadyToFinalize(parsed.readyToFinalize);
          setShowBrainstormContinueInput(false);
          setPhase("brainstorming");
          setActiveStep("clarify");
          setGenerationTask((current) =>
            current?.taskId === event.taskId
              ? {
                  ...current,
                  status: "completed",
                  message: parsed.readyToFinalize
                    ? "AI 认为需求已经接近清楚，可以考虑收束。"
                    : "已生成下一轮问题，并更新实时摘要。",
                  elapsedMs: event.elapsedMs,
                }
              : current,
          );
          setGlobalMessage({
            tone: parsed.readyToFinalize ? "success" : "neutral",
            title: parsed.readyToFinalize ? "可以收束需求" : "头脑风暴已更新",
            description: parsed.readyToFinalize
              ? "你可以现在收束，也可以继续指定想讨论的方向。"
              : "回答下一个问题，右侧摘要会继续更新。",
          });
          return;
        }

        if (activeRequest.context === "clarify-questions") {
          const payload = parseClarifyingQuestions(event.content);
          setQuestions(payload.questions);
          setAnswers(
            payload.questions.map((question) => ({
              questionId: question.id,
              answer: "",
              skipped: false,
            })),
          );
          setResult(defaultResult);
          setPhase("answeringQuestions");
          setActiveStep("clarify");
          setGenerationTask((current) =>
            current?.taskId === event.taskId
              ? {
                  ...current,
                  status: "completed",
                  message: "澄清问题已生成，可以开始回答或跳过。",
                  elapsedMs: event.elapsedMs,
                }
              : current,
          );
          setGlobalMessage({
            tone: "success",
            title: "问题已生成",
            description: "把能回答的先补上，不确定的问题可以跳过。",
          });
          return;
        }

        const parsed = parseOptimizedPromptResult(event.content);
        const nextResult: OptimizedPromptResult =
          activeRequest.context === "brainstorm-finalize"
            ? {
                ...parsed,
                mode: "brainstorming",
                outputKind: parsed.outputKind ?? "brief",
                originalText: sessionDraftRef.current.requirementInput.rawRequirement,
                sourceSummaryMarkdown: sessionDraftRef.current.brainstormSummaryMarkdown,
              }
            : parsed;
        setResult(nextResult);
        setPhase("completed");
        const saved = await saveSessionSnapshot(nextResult, event.diagnostics);
        setCurrentHistoryId(saved.id);
        await refreshHistory();
        setActiveStep("brief");
        setGenerationTask((current) =>
          current?.taskId === event.taskId
            ? {
                ...current,
                status: "completed",
                message:
                  activeRequest.context === "brainstorm-finalize"
                    ? "头脑风暴已收束成最终 Prompt，并已保存到本地历史。"
                    : "最终 Prompt 已生成，并已保存到本地历史。",
                elapsedMs: event.elapsedMs,
              }
            : current,
        );
        setGlobalMessage({
          tone: "success",
          title:
            activeRequest.context === "brainstorm-finalize"
              ? "需求已收束"
              : "最终 Prompt 已生成",
          description: "结果已保存到本地历史，可以复制或导出 Markdown。",
        });
      } catch (error) {
        setPhase("error");
        setGenerationTask((current) =>
          current?.taskId === event.taskId
            ? {
                ...current,
                status: "error",
                message: "模型有返回内容，但应用没能识别成当前步骤需要的数据。",
                errorMessage: normalizeErrorMessage(error),
                elapsedMs: event.elapsedMs,
                diagnostics: event.diagnostics,
              }
            : current,
        );
        setGlobalMessage({
          tone: "error",
          title: "解析模型返回失败",
          description: normalizeErrorMessage(error),
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (!desktopMode) return undefined;
    return onDesktopStreamEvent((event) => {
      void handleStreamEvent(event);
    });
  }, [desktopMode, handleStreamEvent]);

  async function handleSaveApiKey() {
    if (!apiConfig.apiKey.trim()) {
      setGlobalMessage({
        tone: "warning",
        title: "还没有 API Key",
        description: "请先输入 API Key，再保存到系统安全凭据。",
      });
      return;
    }

    try {
      await saveApiKey(apiConfig.apiKey.trim());
      setSavedKeyAvailable(true);
      setApiConfig((current) => ({ ...current, apiKey: "" }));
      setGlobalMessage({
        tone: "success",
        title: "API Key 已安全保存",
        description: "界面不会回显明文；后续请求会由主进程读取已保存密钥。",
      });
    } catch (error) {
      setGlobalMessage({
        tone: "error",
        title: "保存失败",
        description: normalizeErrorMessage(error),
      });
    }
  }

  async function handleDeleteApiKey() {
    await deleteSavedApiKey();
    setSavedKeyAvailable(false);
    setGlobalMessage({
      tone: "neutral",
      title: "已删除保存的 API Key",
      description: "下次请求前需要重新输入 API Key。",
    });
  }

  async function handleTestConnection() {
    if (!hasConfig) {
      setGlobalMessage({
        tone: "warning",
        title: "配置不完整",
        description: "请填写 Base URL、Model，并输入或保存 API Key。",
      });
      return;
    }

    try {
      setPhase("testingConnection");
      setGlobalMessage({
        tone: "neutral",
        title: "正在测试连接",
        description: "主进程正在向模型服务发起一次极短请求。",
      });
      await persistSettings();
      const response = await testDesktopConnection(apiConfig);
      setDiagnostics(response.diagnostics);
      setPhase("ready");
      setActiveStep("mode");
      setGlobalMessage({
        tone: "success",
        title: "连接成功",
        description: "当前模型配置可用，可以开始输入需求。",
      });
    } catch (error) {
      setPhase("error");
      if (error instanceof Error && "diagnostics" in error) {
        setDiagnostics((error as { diagnostics: ApiDiagnostics }).diagnostics);
      }
      setGlobalMessage({
        tone: "error",
        title: "连接测试失败",
        description: normalizeErrorMessage(error),
      });
    }
  }

  function handleSelectMode(mode: WorkflowMode) {
    setWorkflowMode(mode);
    setQuestions([]);
    setAnswers([]);
    setBrainstormMessages([]);
    setBrainstormSummaryMarkdown("");
    setBrainstormConfirmedRequirements([]);
    setBrainstormConfidence(0);
    setBrainstormMissingInformation([]);
    setBrainstormReadyToFinalize(false);
    setBrainstormAnswer("");
    setBrainstormContinueDirection("");
    setShowBrainstormContinueInput(false);
    setResult(defaultResult);
    setGenerationTask(null);
    setCurrentHistoryId(null);
    setPhase(hasConfig ? "ready" : "idle");
    setActiveStep("input");
    setGlobalMessage({
      tone: "neutral",
      title: mode === "format-optimization" ? "已选择格式优化" : "已选择头脑风暴",
      description:
        mode === "format-optimization"
          ? "输入一段原文，AI 会整理成轻量 Prompt。"
          : "输入初始想法，AI 会逐轮提问并更新摘要。",
    });
  }

  function updateRawRequirement(rawRequirement: string) {
    setRequirementInput((current) => ({
      ...current,
      rawRequirement,
    }));
  }

  async function handleOptimizeFormat() {
    if (!requirementInput.rawRequirement.trim()) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺原文",
        description: "请先输入需要优化的表达。",
      });
      return;
    }

    if (!hasConfig) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺模型配置",
        description: "请先完成模型连接设置。",
      });
      setActiveStep("connection");
      return;
    }

    setWorkflowMode("format-optimization");
    setPhase("formattingPrompt");
    setResult(defaultResult);
    setGlobalMessage({
      tone: "neutral",
      title: "正在优化表达",
      description: "AI 只会做轻量整理；如有专业场景补全，会写进备注。",
    });

    await startGenerationStream(
      {
        taskId: createTaskId("format-optimization"),
        config: apiConfig,
        context: "format-optimization",
        systemPrompt: formatOptimizationSystemPrompt(),
        userPrompt: buildFormatOptimizationUserPrompt(requirementInput.rawRequirement),
        timeoutMs: 120_000,
        idleTimeoutMs: 45_000,
      },
      {
        title: "正在优化表达",
        message: "正在把原始表达整理成轻量 Prompt。",
      },
    );
  }

  async function runBrainstormTurn(
    nextMessages: BrainstormMessage[],
    continueDirection = "",
  ) {
    if (!hasConfig) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺模型配置",
        description: "请先完成模型连接设置。",
      });
      setActiveStep("connection");
      return;
    }

    setWorkflowMode("brainstorming");
    setPhase("brainstorming");
    setActiveStep("clarify");
    setBrainstormReadyToFinalize(false);
    setShowBrainstormContinueInput(false);
    setGlobalMessage({
      tone: "neutral",
      title: "正在推进头脑风暴",
      description: "AI 会只问一个问题，并更新右侧实时摘要。",
    });

    await startGenerationStream(
      {
        taskId: createTaskId("brainstorm-turn"),
        config: apiConfig,
        context: "brainstorm-turn",
        systemPrompt: brainstormTurnSystemPrompt(),
        userPrompt: buildBrainstormTurnUserPrompt(
          requirementInput.rawRequirement,
          nextMessages,
          brainstormSummaryMarkdown,
          continueDirection,
          brainstormConfirmedRequirements,
        ),
        timeoutMs: 120_000,
        idleTimeoutMs: 45_000,
      },
      {
        title: "正在头脑风暴",
        message: "正在生成下一轮问题并更新实时摘要。",
      },
    );
  }

  async function handleStartBrainstorm() {
    if (!requirementInput.rawRequirement.trim()) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺初始想法",
        description: "请先输入一句你想讨论的方向。",
      });
      return;
    }

    const firstMessage: BrainstormMessage = {
      id: createLocalId("user"),
      role: "user",
      content: requirementInput.rawRequirement.trim(),
      createdAt: new Date().toISOString(),
    };
    setBrainstormMessages([firstMessage]);
    setBrainstormSummaryMarkdown("");
    setBrainstormConfirmedRequirements([]);
    setBrainstormConfidence(0);
    setBrainstormMissingInformation([]);
    setBrainstormReadyToFinalize(false);
    await runBrainstormTurn([firstMessage]);
  }

  async function handleSubmitBrainstormAnswer() {
    const value = brainstormAnswer.trim();
    if (!value) return;
    const nextMessage: BrainstormMessage = {
      id: createLocalId("user"),
      role: "user",
      content: value,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...brainstormMessages, nextMessage];
    setBrainstormMessages(nextMessages);
    setBrainstormAnswer("");
    await runBrainstormTurn(nextMessages);
  }

  async function handleSubmitBrainstormContinueDirection() {
    const value = brainstormContinueDirection.trim();
    if (!value) return;
    const nextMessage: BrainstormMessage = {
      id: createLocalId("user"),
      role: "user",
      content: `我暂时不想收束，还想继续讨论：${value}`,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...brainstormMessages, nextMessage];
    setBrainstormMessages(nextMessages);
    setBrainstormContinueDirection("");
    setShowBrainstormContinueInput(false);
    await runBrainstormTurn(nextMessages, value);
  }

  async function handleFinalizeBrainstorm() {
    if (!brainstormMessages.length) {
      setGlobalMessage({
        tone: "warning",
        title: "还没有头脑风暴内容",
        description: "请先开始一轮头脑风暴，再收束需求。",
      });
      return;
    }

    if (!hasConfig) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺模型配置",
        description: "请先完成模型连接设置。",
      });
      setActiveStep("connection");
      return;
    }

    setPhase("finalizingBrainstorm");
    setGlobalMessage({
      tone: "neutral",
      title: "正在收束需求",
      description: "AI 会根据复杂度自动选择轻量 Prompt 或完整任务书。",
    });

    await startGenerationStream(
      {
        taskId: createTaskId("brainstorm-finalize"),
        config: apiConfig,
        context: "brainstorm-finalize",
        systemPrompt: brainstormFinalizeSystemPrompt(),
        userPrompt: buildBrainstormFinalizeUserPrompt(
          requirementInput.rawRequirement,
          brainstormMessages,
          brainstormSummaryMarkdown,
          brainstormConfirmedRequirements,
        ),
        timeoutMs: 180_000,
        idleTimeoutMs: 60_000,
      },
      {
        title: "正在收束需求",
        message: "正在把头脑风暴摘要整理成最终 Prompt。",
      },
    );
  }

  async function handleGenerateQuestions() {
    if (!requirementInput.rawRequirement.trim()) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺原始需求",
        description: "至少先输入一句想法，AI 才能判断应该追问什么。",
      });
      return;
    }

    if (!hasConfig) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺模型配置",
        description: "请先完成模型连接设置。",
      });
      setActiveStep("connection");
      return;
    }

    setPhase("generatingQuestions");
    setActiveStep("clarify");
    setQuestions([]);
    setAnswers([]);
    setResult(defaultResult);
    setGlobalMessage({
      tone: "neutral",
      title: "正在生成澄清问题",
      description: "AI 正在找出最影响执行质量的信息缺口，返回内容会实时显示。",
    });

    await startGenerationStream(
      {
        taskId: createTaskId("clarify-questions"),
        config: apiConfig,
        context: "clarify-questions",
        systemPrompt: clarifyingQuestionsSystemPrompt(),
        userPrompt: buildClarifyingQuestionsUserPrompt(requirementInput),
        timeoutMs: 90_000,
        idleTimeoutMs: 45_000,
      },
      {
        title: "正在生成澄清问题",
        message: "正在把原始需求拆成几个最关键的追问。",
      },
    );
  }

  async function handleGeneratePrompt() {
    if (!questions.length) {
      setGlobalMessage({
        tone: "warning",
        title: "还没有澄清问题",
        description: "请先生成澄清问题，再继续生成最终 Prompt。",
      });
      return;
    }

    setPhase("generatingPrompt");
    setActiveStep("clarify");
    setGlobalMessage({
      tone: "neutral",
      title: "正在整理最终 Prompt",
      description: "AI 正在整合原始需求与补充回答，完成解析后才会进入结果页。",
    });

    await startGenerationStream(
      {
        taskId: createTaskId("compose-brief"),
        config: apiConfig,
        context: "compose-brief",
        systemPrompt: finalPromptSystemPrompt(),
        userPrompt: buildFinalPromptUserPrompt(requirementInput, answers, questions),
        timeoutMs: 180_000,
        idleTimeoutMs: 60_000,
      },
      {
        title: "正在生成最终 Prompt",
        message: "正在把需求、回答和约束整理成可交给 Agent 执行的任务书。",
      },
    );
  }

  async function saveCurrentSession(
    nextResult = result,
    nextDiagnostics = diagnostics,
  ): Promise<HistorySession> {
    const saved = await saveHistorySession({
      id: currentHistoryId ?? undefined,
      title: requirementInput.rawRequirement.trim().slice(0, 42) || "未命名需求",
      mode: workflowMode ?? undefined,
      requirementInput,
      questions,
      answers,
      brainstormMessages,
      brainstormSummaryMarkdown,
      brainstormConfirmedRequirements,
      result: nextResult,
      diagnostics: nextDiagnostics,
      providerHint: nextDiagnostics?.providerHint,
    });
    return saved;
  }

  async function copyText(text: string, successTitle: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      setGlobalMessage({
        tone: "success",
        title: successTitle,
        description: "内容已经复制到剪贴板。",
      });
      return true;
    } catch {
      setGlobalMessage({
        tone: "error",
        title: "复制失败",
        description: "系统未能写入剪贴板。你可以手动选中文本复制。",
      });
      return false;
    }
  }

  async function handleCancelGeneration() {
    if (!generationTask) return;
    try {
      await cancelDesktopStream(generationTask.taskId);
      setGenerationTask((current) =>
        current?.taskId === generationTask.taskId
          ? {
              ...current,
              message: "正在取消请求，已收到的内容会保留。",
            }
          : current,
      );
    } catch (error) {
      setGlobalMessage({
        tone: "error",
        title: "取消失败",
        description: normalizeErrorMessage(error),
      });
    }
  }

  async function handleRetryGeneration() {
    const lastRequest = latestStreamRequestRef.current;
    if (!lastRequest) return;
    switch (lastRequest.context) {
      case "format-optimization":
        await handleOptimizeFormat();
        return;
      case "brainstorm-turn":
        await startGenerationStream(lastRequest, {
          title: "正在头脑风暴",
          message: "正在重试上一轮问题生成。",
        });
        return;
      case "brainstorm-finalize":
        await handleFinalizeBrainstorm();
        return;
      case "clarify-questions":
        await handleGenerateQuestions();
        return;
      default:
        await handleGeneratePrompt();
    }
  }

  function handleCopyRawGeneration() {
    if (!generationTask?.partialContent) {
      setGlobalMessage({
        tone: "warning",
        title: "还没有可复制的原文",
        description: "模型返回内容为空，无法复制。",
      });
      return false;
    }
    return copyText(generationTask.partialContent, "模型原始返回已复制");
  }

  function handleCopyGenerationDiagnostics() {
    const taskDiagnostics = generationTask?.diagnostics ?? diagnostics;
    if (!taskDiagnostics) {
      setGlobalMessage({
        tone: "warning",
        title: "还没有诊断信息",
        description: "当前生成任务还没有产生可复制的诊断。",
      });
      return false;
    }
    return copyText(JSON.stringify(taskDiagnostics, null, 2), "生成诊断已复制");
  }

  async function handleOpenHistory(id: string) {
    const session = await window.desktopApi?.history.get(id);
    if (!session) return;
    setCurrentHistoryId(session.id);
    setWorkflowMode(session.mode ?? session.result.mode ?? null);
    setRequirementInput(session.requirementInput);
    setQuestions(session.questions);
    setAnswers(session.answers);
    setBrainstormMessages(session.brainstormMessages ?? []);
    setBrainstormSummaryMarkdown(session.brainstormSummaryMarkdown ?? "");
    setBrainstormConfirmedRequirements(session.brainstormConfirmedRequirements ?? []);
    setBrainstormConfidence(0);
    setBrainstormMissingInformation([]);
    setBrainstormReadyToFinalize(false);
    setBrainstormAnswer("");
    setBrainstormContinueDirection("");
    setShowBrainstormContinueInput(false);
    setResult(session.result);
    setDiagnostics(session.diagnostics);
    setPhase("completed");
    setActiveStep("brief");
    setGlobalMessage({
      tone: "success",
      title: "历史会话已打开",
      description: "可以复制结果，也可以修改回答后重新生成。",
    });
  }

  function handleRequestDeleteHistory(id: string) {
    const item = history.find((entry) => entry.id === id);
    if (item) {
      setHistoryDeleteTarget(item);
    }
  }

  async function handleConfirmDeleteHistory() {
    if (!historyDeleteTarget) return;
    const deletedId = historyDeleteTarget.id;
    await deleteHistorySession(deletedId);
    if (currentHistoryId === deletedId) {
      setCurrentHistoryId(null);
    }
    setHistoryDeleteTarget(null);
    await refreshHistory();
    setGlobalMessage({
      tone: "success",
      title: "历史会话已删除",
      description: "本地历史记录已更新。",
    });
  }

  async function handleExportCurrent() {
    if (!currentHistoryId) {
      const saved = await saveCurrentSession();
      setCurrentHistoryId(saved.id);
      await refreshHistory();
      return copyText(await exportHistoryMarkdown(saved.id), "Markdown 已复制");
    }
    return copyText(await exportHistoryMarkdown(currentHistoryId), "Markdown 已复制");
  }

  function clearSession() {
    setRequirementInput(defaultRequirementInput);
    setQuestions([]);
    setAnswers([]);
    setBrainstormMessages([]);
    setBrainstormSummaryMarkdown("");
    setBrainstormConfirmedRequirements([]);
    setBrainstormConfidence(0);
    setBrainstormMissingInformation([]);
    setBrainstormReadyToFinalize(false);
    setBrainstormAnswer("");
    setBrainstormContinueDirection("");
    setShowBrainstormContinueInput(false);
    setResult(defaultResult);
    setDiagnostics(null);
    setCurrentHistoryId(null);
    setWorkflowMode(null);
    setGenerationTask(null);
    latestStreamRequestRef.current = null;
    setPhase(hasConfig ? "ready" : "idle");
    setActiveStep("mode");
    setGlobalMessage({
      tone: "neutral",
      title: "会话已清空",
      description: "模型配置和保存的 API Key 不受影响。",
    });
  }

  function applyPreset(providerPresetId: ProviderPresetId) {
    const preset = providerPresets.find((item) => item.id === providerPresetId);
    if (!preset) return;
    setApiConfig((current) => ({
      ...current,
      providerPresetId,
      baseUrl: preset.baseUrl || current.baseUrl,
      model: preset.model || current.model,
    }));
  }

  const currentStepContent = (() => {
    if (!workflowMode && activeStep !== "connection" && activeStep !== "history") {
      return <ModeSelectionPanel value={workflowMode} onSelect={handleSelectMode} />;
    }

    switch (activeStep) {
      case "connection":
        return (
          <ConnectionStage
            value={apiConfig}
            savedKeyAvailable={savedKeyAvailable}
            disabled={phase === "testingConnection"}
            onChange={setApiConfig}
            onPresetChange={applyPreset}
            onTestConnection={handleTestConnection}
            onSaveApiKey={handleSaveApiKey}
            onDeleteApiKey={handleDeleteApiKey}
            onSaveSettings={() => persistSettings()}
          />
        );
      case "mode":
        return <ModeSelectionPanel value={workflowMode} onSelect={handleSelectMode} />;
      case "input":
        return workflowMode === "format-optimization" ? (
          <FormatOptimizationPanel
            value={requirementInput.rawRequirement}
            disabled={generationRunning}
            onChange={(value) => updateRawRequirement(value)}
            onOptimize={handleOptimizeFormat}
          />
        ) : (
          <BrainstormStartStage
            value={requirementInput.rawRequirement}
            disabled={generationRunning || phase === "finalizingBrainstorm"}
            onChange={(value) => updateRawRequirement(value)}
            onStart={handleStartBrainstorm}
          />
        );
      case "clarify":
        return workflowMode === "brainstorming" ? (
          <BrainstormPanel
            messages={brainstormMessages}
            summaryMarkdown={brainstormSummaryMarkdown}
            confirmedRequirements={brainstormConfirmedRequirements}
            confidence={brainstormConfidence}
            missingInformation={brainstormMissingInformation}
            answer={brainstormAnswer}
            continueDirection={brainstormContinueDirection}
            readyToFinalize={brainstormReadyToFinalize}
            showContinueInput={showBrainstormContinueInput}
            disabled={generationRunning || phase === "finalizingBrainstorm"}
            onAnswerChange={setBrainstormAnswer}
            onSubmitAnswer={handleSubmitBrainstormAnswer}
            onFinalize={handleFinalizeBrainstorm}
            onDeclineFinalize={() => setShowBrainstormContinueInput(true)}
            onContinueDirectionChange={setBrainstormContinueDirection}
            onSubmitContinueDirection={handleSubmitBrainstormContinueDirection}
          />
        ) : (
          <ClarifyingQuestionsPanel
            questions={questions}
            answers={answers}
            disabled={phase === "generatingPrompt"}
            generating={phase === "generatingPrompt"}
            onChange={setAnswers}
            onGeneratePrompt={handleGeneratePrompt}
          />
        );
      case "brief":
        return result.finalPromptMarkdown ? (
          result.mode === "format-optimization" ? (
            <FormatOptimizationResultPanel
              originalText={result.originalText || requirementInput.rawRequirement}
              optimizedPromptMarkdown={result.finalPromptMarkdown}
              noteMarkdown={result.improvementNotesMarkdown}
              detectedScenario={result.detectedScenario}
              onCopyPrompt={() => copyText(result.finalPromptMarkdown, "Prompt 已复制")}
              onCopyNotes={() =>
                copyText(result.improvementNotesMarkdown, "备注已复制")
              }
              onClear={clearSession}
            />
          ) : (
            <div className="grid gap-5">
              <ResultPanel
                finalPromptMarkdown={result.finalPromptMarkdown}
                improvementNotesMarkdown={result.improvementNotesMarkdown}
                sourceLabel={
                  result.mode === "brainstorming" ? "来自头脑风暴收束" : undefined
                }
                outputKind={
                  result.outputKind === "lightweight"
                    ? "轻量 Prompt"
                    : result.outputKind === "brief"
                      ? "完整任务书"
                      : undefined
                }
                onCopyPrompt={() => copyText(result.finalPromptMarkdown, "Prompt 已复制")}
                onCopyNotes={() =>
                  copyText(result.improvementNotesMarkdown, "优化说明已复制")
                }
                onClear={clearSession}
              />
              <ComparisonPanel
                rawRequirement={requirementInput.rawRequirement}
                finalPromptMarkdown={result.finalPromptMarkdown}
              />
            </div>
          )
        ) : (
          <EmptyBrief onGoClarify={() => setActiveStep("clarify")} />
        );
      case "history":
        return (
          <HistoryStage
            items={history}
            onOpen={handleOpenHistory}
            onDelete={handleRequestDeleteHistory}
          />
        );
      default:
        return null;
    }
  })();

  if (!desktopMode) {
    return (
      <div className="min-h-screen bg-paper p-6 text-ink">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amberline/25 bg-vellum p-6 shadow-sm">
          <p className="eyebrow">Desktop Required</p>
          <h1 className="mt-2 text-2xl font-semibold">请使用桌面端启动</h1>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            当前版本的模型请求、历史记录和密钥保存依赖 Electron 主进程。开发时请运行
            <code className="mx-1 rounded bg-ink/8 px-1.5 py-0.5">npm run dev:desktop</code>。
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DesktopShell
        steps={steps}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        headerAction={
          <button type="button" onClick={clearSession} className="ghost-button gap-2">
            <RotateCcw className="h-4 w-4" />
            新建会话
          </button>
        }
        status={globalMessage}
        topBanner={
          generationTask ? (
            <GenerationTaskPanel
              task={generationTask}
              onCancel={handleCancelGeneration}
              onRetry={handleRetryGeneration}
              onCopyRaw={handleCopyRawGeneration}
              onCopyDiagnostics={handleCopyGenerationDiagnostics}
            />
          ) : null
        }
        diagnostics={diagnostics}
        history={history}
        currentResult={result}
        onCopyDiagnostics={() =>
          diagnostics
            ? copyText(JSON.stringify(diagnostics, null, 2), "诊断信息已复制")
            : false
        }
        onOpenHistory={handleOpenHistory}
        onDeleteHistory={handleRequestDeleteHistory}
        onCopyPrompt={() => copyText(result.finalPromptMarkdown, "Prompt 已复制")}
        onExportCurrent={handleExportCurrent}
      >
        {currentStepContent}
      </DesktopShell>
      <ConfirmDialog
        open={Boolean(historyDeleteTarget)}
        title="删除历史会话？"
        description={
          historyDeleteTarget
            ? `将删除“${historyDeleteTarget.title}”。这个操作不会影响当前模型配置，但历史记录无法从应用内恢复。`
            : ""
        }
        onCancel={() => setHistoryDeleteTarget(null)}
        onConfirm={() => {
          void handleConfirmDeleteHistory();
        }}
      />
    </>
  );
}

function BrainstormStartStage({
  value,
  disabled,
  onChange,
  onStart,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onStart: () => void;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-ink/8 bg-vellum/90 p-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-vellum shadow-soft">
            <MessageSquarePlus className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Brainstorm Start</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
              输入初始想法
            </h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink/62">
          你只要写一个大概方向，AI 会先问一个最关键的问题，再逐轮帮你想清楚。
        </p>
      </div>

      <div className="grid gap-4 p-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">初始想法 *</span>
          <textarea
            rows={8}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="例如：我想让你帮我看一个组件为什么状态没更新。"
            className="field min-h-[220px] resize-y bg-white text-sm leading-7"
          />
        </label>
        <button
          type="button"
          onClick={onStart}
          disabled={disabled || !value.trim()}
          className="primary-button w-full gap-2"
        >
          <WandSparkles className="h-4 w-4" />
          开始头脑风暴
        </button>
      </div>
    </section>
  );
}

type ConnectionStageProps = {
  value: DesktopApiConfig;
  savedKeyAvailable: boolean;
  disabled: boolean;
  onChange: (value: DesktopApiConfig) => void;
  onPresetChange: (id: ProviderPresetId) => void;
  onTestConnection: () => void;
  onSaveApiKey: () => void;
  onDeleteApiKey: () => void;
  onSaveSettings: () => void;
};

function ConnectionStage({
  value,
  savedKeyAvailable,
  disabled,
  onChange,
  onPresetChange,
  onTestConnection,
  onSaveApiKey,
  onDeleteApiKey,
  onSaveSettings,
}: ConnectionStageProps) {
  const selectedPreset = providerPresets.find((preset) => preset.id === value.providerPresetId);

  return (
    <section className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Connection</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
            连接模型服务
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/62">
            桌面端会从主进程发起请求，绕开浏览器 CORS 限制；API Key 默认不保存。
          </p>
        </div>
        <SlidersHorizontal className="h-6 w-6 text-moss" />
      </div>

      <div className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">服务商预设</p>
            <p className="text-xs font-medium text-ink/48">选择后会自动填入默认地址和模型</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {providerPresets.map((preset) => {
              const accents = providerAccentClasses[preset.id];
              const selected = value.providerPresetId === preset.id;

              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => onPresetChange(preset.id)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center transition ${
                    selected ? accents.selected : accents.idle
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${accents.dot}`} />
                  <span className="truncate text-sm font-semibold">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedPreset ? (
          <div
            className={`rounded-xl border px-3 py-2.5 text-sm leading-6 text-ink/64 ${
              providerAccentClasses[selectedPreset.id].note
            }`}
          >
            <span className="font-semibold text-ink">{selectedPreset.name}</span>
            <span className="mx-1 text-ink/30">/</span>
            {selectedPreset.note}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Base URL</span>
            <input
              type="url"
              value={value.baseUrl}
              onChange={(event) => onChange({ ...value, baseUrl: event.target.value })}
              placeholder="https://api.openai.com/v1"
              className="field"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Model</span>
            <input
              type="text"
              value={value.model}
              onChange={(event) => onChange({ ...value, model: event.target.value })}
              className="field"
            />
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="flex items-center justify-between gap-3 text-sm font-semibold text-ink">
              <span>API Key</span>
              <span className="text-xs font-medium text-ink/48">
                {savedKeyAvailable ? "已保存，可留空继续使用" : "仅本次会话或安全保存"}
              </span>
            </span>
            <input
              type="password"
              value={value.apiKey}
              onChange={(event) => onChange({ ...value, apiKey: event.target.value })}
              placeholder={savedKeyAvailable ? "已保存，可留空继续使用" : "sk-..."}
              className="field"
            />
          </label>
        </div>

        <TemperaturePresetControl
          value={value.temperaturePreset}
          onChange={(preset) =>
            onChange({
              ...value,
              temperaturePreset: preset,
              temperature: getTemperatureValue(preset),
            })
          }
        />

        <label className="flex items-start gap-3 rounded-2xl border border-black/8 bg-[#f5f5f7] p-3">
          <input
            type="checkbox"
            checked={value.rememberConfig}
            onChange={(event) => onChange({ ...value, rememberConfig: event.target.checked })}
            className="mt-1 h-4 w-4 rounded border-black/20 text-[#0071e3] focus:ring-[#0071e3]"
          />
          <span className="text-sm leading-6 text-ink/68">
            记住非敏感配置。API Key 只会在点击“安全保存 Key”时单独保存。
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onTestConnection}
            disabled={disabled}
            className="primary-button gap-2"
          >
            <KeyRound className="h-4 w-4" />
            测试连接
          </button>
          <button type="button" onClick={onSaveApiKey} className="accent-button gap-2">
            <ShieldCheck className="h-4 w-4" />
            安全保存 Key
          </button>
          <button type="button" onClick={onSaveSettings} className="ghost-button gap-2">
            <Save className="h-4 w-4" />
            保存配置
          </button>
          {savedKeyAvailable ? (
            <button type="button" onClick={onDeleteApiKey} className="ghost-button">
              删除保存的 Key
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EmptyBrief({ onGoClarify }: { onGoClarify: () => void }) {
  return (
    <section className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-ink/16 bg-white/70 p-8 text-center">
      <div className="max-w-md">
        <p className="eyebrow">Ready Brief</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">还没有最终 Prompt</h2>
        <p className="mt-3 text-sm leading-6 text-ink/62">
          先完成需求输入和澄清问题，再生成可复制给 Agent 的任务书。
        </p>
        <button type="button" onClick={onGoClarify} className="primary-button mt-5">
          前往澄清问题
        </button>
      </div>
    </section>
  );
}

function HistoryStage({
  items,
  onOpen,
  onDelete,
}: {
  items: HistorySummary[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <p className="eyebrow">Local Sessions</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">本地历史会话</h2>
      <div className="mt-5 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-ink/8 bg-white/60 p-4"
            >
              <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-xs text-ink/50">
                  {new Date(item.updatedAt).toLocaleString()}
                  {item.providerHint ? ` / ${item.providerHint}` : ""}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="ghost-button h-11 min-w-[84px] shrink-0 whitespace-nowrap px-4"
              >
                删除
              </button>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-ink/16 bg-white/70 p-8 text-sm leading-6 text-ink/60">
            还没有历史记录。生成最终 Prompt 后，桌面端会自动保存一份本地会话。
          </div>
        )}
      </div>
    </section>
  );
}

function TemperaturePresetControl({
  value,
  onChange,
}: {
  value: TemperaturePreset;
  onChange: (value: TemperaturePreset) => void;
}) {
  const selected =
    temperaturePresets.find((preset) => preset.id === value) ?? temperaturePresets[1];

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">输出发散度</span>
        <span className="max-w-[8rem] truncate rounded-full border border-black/8 bg-white px-2.5 py-1 text-xs font-medium text-ink/58">
          {selected.label}
        </span>
      </div>
      <div className="rounded-2xl border border-black/8 bg-white p-1">
        <div className="grid grid-cols-4 gap-1">
          {temperaturePresets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              onClick={() => onChange(preset.id)}
              className={`min-h-10 rounded-xl px-2.5 py-2 text-[13px] font-medium transition ${
                value === preset.id
                  ? "bg-[#0071e3] text-white shadow-sm"
                  : "text-ink/72 hover:bg-[#f5f5f7] hover:text-ink"
              }`}
            >
              <span className="block truncate text-[12px] leading-4">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs leading-5 text-ink/52">
        {selected.hint}。当前映射为 temperature={selected.value}。
      </p>
    </div>
  );
}

export default App;
